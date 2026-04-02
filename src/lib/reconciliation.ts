import { supabase } from './supabase';
import { BillStatus, CreditCardBill, PendingDebit } from '../types/database';
import { createTransaction } from './transactions';

// ── Types ────────────────────────────────────────────────────────────────────

export type ParsedLineItem = {
  date: string;     // YYYY-MM-DD
  merchant: string;
  amount: number;
};

export type MatchedLineItem = {
  lineItem: ParsedLineItem;
  matchedTransactionId: string | null;
  matchedTransactionNotes: string | null;
  isChecked: boolean;
  dateOffsetDays: number; // 0 = exact, 1–3 = offset
  isMissing: boolean;
};

// ── Bill CRUD ────────────────────────────────────────────────────────────────

export async function fetchBillsForCard(
  creditCardId: string
): Promise<CreditCardBill[]> {
  const { data } = await supabase
    .from('credit_card_bills')
    .select('*')
    .eq('credit_card_id', creditCardId)
    .order('billing_period_start', { ascending: false });
  return data ?? [];
}

export async function fetchOrCreateCurrentBill(
  userId: string,
  creditCardId: string,
  statementClosingDay: number
): Promise<CreditCardBill | null> {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // Billing period: from closing day of prev month to closing day of this month
  const endDate = new Date(year, month - 1, statementClosingDay);
  if (today < endDate) {
    endDate.setMonth(endDate.getMonth() - 1);
  }
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 1);
  startDate.setDate(startDate.getDate() + 1);

  const start = startDate.toISOString().slice(0, 10);
  const end = endDate.toISOString().slice(0, 10);

  // Check if bill already exists
  const { data: existing } = await supabase
    .from('credit_card_bills')
    .select('*')
    .eq('credit_card_id', creditCardId)
    .eq('billing_period_start', start)
    .single();

  if (existing) return existing as CreditCardBill;

  // Create new bill
  const { data, error } = await supabase
    .from('credit_card_bills')
    .insert({
      credit_card_id: creditCardId,
      user_id: userId,
      billing_period_start: start,
      billing_period_end: end,
      status: 'pending',
      cashback_offset: 0,
    })
    .select()
    .single();

  return error ? null : (data as CreditCardBill);
}

export async function updateBillStatus(
  billId: string,
  status: BillStatus
): Promise<void> {
  await supabase
    .from('credit_card_bills')
    .update({ status, ...(status === 'reconciled' ? { reconciled_at: new Date().toISOString() } : {}) })
    .eq('id', billId);
}

// ── Gemini OCR ───────────────────────────────────────────────────────────────
// Requires EXPO_PUBLIC_GEMINI_API_KEY env var

export async function parseBillWithGemini(
  fileBase64: string,
  mimeType: string
): Promise<{ items: ParsedLineItem[]; error: string | null }> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return { items: [], error: 'GEMINI API 金鑰未設定，請在 .env 設定 EXPO_PUBLIC_GEMINI_API_KEY' };
  }

  const prompt = `這是一張信用卡帳單。請解析所有消費明細，回傳 JSON 陣列，每個項目包含：
- date: 消費日期（YYYY-MM-DD 格式）
- merchant: 商家名稱（字串）
- amount: 消費金額（數字，台幣，不含符號）

只回傳 JSON 陣列，不要包含其他說明。`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: fileBase64 } },
            ],
          }],
          generationConfig: { response_mime_type: 'application/json' },
        }),
      }
    );

    if (!response.ok) {
      return { items: [], error: `Gemini API 錯誤：${response.status}` };
    }

    const result = await response.json();
    const text: string = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

    let items: ParsedLineItem[] = [];
    try {
      items = JSON.parse(text);
    } catch {
      return { items: [], error: '解析結果格式錯誤，請重試或手動輸入' };
    }

    if (!Array.isArray(items) || items.length === 0) {
      return { items: [], error: '未找到消費明細，請檢查帳單圖片或手動輸入' };
    }

    return { items, error: null };
  } catch (err) {
    return { items: [], error: `網路錯誤：${String(err)}` };
  }
}

// ── Fuzzy matching (tasks 9.3, 9.4) ─────────────────────────────────────────

type SimpleTxn = { id: string; amount: number; date: string; notes: string | null };

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(Math.round((a - b) / (1000 * 60 * 60 * 24)));
}

export function fuzzyMatchLineItems(
  lineItems: ParsedLineItem[],
  transactions: SimpleTxn[]
): MatchedLineItem[] {
  // Track which transaction IDs have already been claimed
  const claimedTxnIds = new Set<string>();

  // For each line item, find all candidate transactions sorted by date distance
  const candidates: Array<{
    itemIdx: number;
    txnId: string;
    txnNotes: string | null;
    dateDiff: number;
  }> = [];

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    for (const txn of transactions) {
      if (txn.amount !== item.amount) continue;
      const diff = daysBetween(item.date, txn.date);
      if (diff <= 3) {
        candidates.push({ itemIdx: i, txnId: txn.id, txnNotes: txn.notes, dateDiff: diff });
      }
    }
  }

  // Sort candidates: exact matches first, then by date diff ascending
  candidates.sort((a, b) => a.dateDiff - b.dateDiff);

  // Greedy assignment: closest-date match wins; each transaction used at most once
  const assignments: Array<{ txnId: string; txnNotes: string | null; dateDiff: number } | null> =
    lineItems.map(() => null);

  for (const c of candidates) {
    if (assignments[c.itemIdx] !== null) continue; // item already matched
    if (claimedTxnIds.has(c.txnId)) continue;      // transaction already claimed
    assignments[c.itemIdx] = { txnId: c.txnId, txnNotes: c.txnNotes, dateDiff: c.dateDiff };
    claimedTxnIds.add(c.txnId);
  }

  return lineItems.map((item, i) => {
    const match = assignments[i];
    return {
      lineItem: item,
      matchedTransactionId: match?.txnId ?? null,
      matchedTransactionNotes: match?.txnNotes ?? null,
      isChecked: match !== null,
      dateOffsetDays: match?.dateDiff ?? 0,
      isMissing: match === null,
    };
  });
}

// ── Fetch transactions for a billing period ───────────────────────────────────

export async function fetchTransactionsForBillingPeriod(
  accountId: string,
  start: string,
  end: string
): Promise<SimpleTxn[]> {
  // Extend range by 3 days for fuzzy match
  const extStart = new Date(start);
  extStart.setDate(extStart.getDate() - 3);
  const extEnd = new Date(end);
  extEnd.setDate(extEnd.getDate() + 3);

  const { data } = await supabase
    .from('transactions')
    .select('id, amount, date, notes')
    .eq('account_id', accountId)
    .gte('date', extStart.toISOString().slice(0, 10))
    .lte('date', extEnd.toISOString().slice(0, 10))
    .eq('is_income', false);

  return data ?? [];
}

// ── Save line items to Supabase ───────────────────────────────────────────────

export async function saveBillLineItems(
  userId: string,
  billId: string,
  matchedItems: MatchedLineItem[]
): Promise<{ error: string | null }> {
  const rows = matchedItems.map((m) => ({
    bill_id: billId,
    user_id: userId,
    date: m.lineItem.date,
    merchant: m.lineItem.merchant,
    amount: m.lineItem.amount,
    matched_transaction_id: m.matchedTransactionId,
    is_checked: m.isChecked,
    date_offset_days: m.dateOffsetDays,
    is_manually_added: false,
  }));

  const { error } = await supabase.from('bill_line_items').insert(rows);
  return { error: error?.message ?? null };
}

// ── Confirm reconciliation (task 9.6) ────────────────────────────────────────

export async function confirmReconciliation(
  userId: string,
  billId: string,
  creditCardId: string,
  totalAmount: number,
  cashbackOffset: number,
  paymentDueDay: number,
  sourceAccountId: string | null
): Promise<{ error: string | null }> {
  const netAmount = Math.max(0, totalAmount - cashbackOffset);

  // Compute due date
  const today = new Date();
  let dueDate = new Date(today.getFullYear(), today.getMonth(), paymentDueDay);
  if (dueDate <= today) dueDate.setMonth(dueDate.getMonth() + 1);
  const dueDateStr = dueDate.toISOString().slice(0, 10);

  // Update bill status + amounts
  await supabase
    .from('credit_card_bills')
    .update({
      status: 'reconciled',
      total_amount: totalAmount,
      cashback_offset: cashbackOffset,
      reconciled_at: new Date().toISOString(),
    })
    .eq('id', billId);

  // Create pending-debit record (only if source account is set)
  if (sourceAccountId && netAmount > 0) {
    await supabase.from('pending_debits').insert({
      credit_card_id: creditCardId,
      bill_id: billId,
      user_id: userId,
      amount: netAmount,
      due_date: dueDateStr,
      source_account_id: sourceAccountId,
      status: 'pending',
    });
  }

  return { error: null };
}

// ── Execute pending debits on app open (task 9.7) ────────────────────────────

export async function executePendingDebits(userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: debits } = await supabase
    .from('pending_debits')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lte('due_date', today);

  if (!debits || debits.length === 0) return;

  for (const debit of debits as PendingDebit[]) {
    await createTransaction(userId, {
      amount: debit.amount,
      date: today,
      categoryId: null,
      accountId: debit.source_account_id,
      projectId: null,
      notes: '信用卡帳款自動扣繳',
      payerType: 'self',
      contactId: null,
      isIncome: false,
    });

    await supabase
      .from('pending_debits')
      .update({ status: 'executed', executed_at: new Date().toISOString() })
      .eq('id', debit.id);
  }
}
