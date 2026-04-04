import { getDb } from './db';
import { BillStatus, CreditCardBill, PendingDebit } from '../types/database';
import { createTransaction } from './transactions';
import * as FileSystem from 'expo-file-system';

export type ParsedLineItem = {
  date: string;
  merchant: string;
  amount: number;
};

export type MatchedLineItem = {
  lineItem: ParsedLineItem;
  matchedTransactionId: string | null;
  matchedTransactionNotes: string | null;
  isChecked: boolean;
  dateOffsetDays: number;
  isMissing: boolean;
};

function rowToBill(row: any): CreditCardBill {
  return {
    id: row.id,
    credit_card_id: row.credit_card_id,
    user_id: row.user_id,
    billing_period_start: row.billing_period_start,
    billing_period_end: row.billing_period_end,
    total_amount: row.total_amount ?? null,
    cashback_offset: row.cashback_offset,
    status: row.status as BillStatus,
    storage_path: row.storage_path ?? null,
    created_at: row.created_at,
    reconciled_at: row.reconciled_at ?? null,
  };
}

export async function fetchBillsForCard(creditCardId: string): Promise<CreditCardBill[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM credit_card_bills WHERE credit_card_id = ? ORDER BY billing_period_start DESC',
    [creditCardId]
  );
  return rows.map(rowToBill);
}

export async function fetchOrCreateCurrentBill(
  userId: string,
  creditCardId: string,
  statementClosingDay: number
): Promise<CreditCardBill | null> {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const endDate = new Date(year, month - 1, statementClosingDay);
  if (today < endDate) endDate.setMonth(endDate.getMonth() - 1);
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 1);
  startDate.setDate(startDate.getDate() + 1);

  const start = startDate.toISOString().slice(0, 10);
  const end = endDate.toISOString().slice(0, 10);

  const db = await getDb();
  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM credit_card_bills WHERE credit_card_id = ? AND billing_period_start = ?',
    [creditCardId, start]
  );
  if (existing) return rowToBill(existing);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO credit_card_bills
     (id, credit_card_id, user_id, billing_period_start, billing_period_end, cashback_offset, status, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 'pending', ?)`,
    [id, creditCardId, userId, start, end, now]
  );
  const row = await db.getFirstAsync<any>('SELECT * FROM credit_card_bills WHERE id = ?', [id]);
  return row ? rowToBill(row) : null;
}

export async function updateBillStatus(billId: string, status: BillStatus): Promise<void> {
  const db = await getDb();
  const extra = status === 'reconciled' ? `, reconciled_at = '${new Date().toISOString()}'` : '';
  await db.runAsync(`UPDATE credit_card_bills SET status = ?${extra} WHERE id = ?`, [status, billId]);
}

// ── Gemini OCR (unchanged — direct HTTP call, no Supabase Storage) ────────────

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
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: fileBase64 } }] }],
          generationConfig: { response_mime_type: 'application/json' },
        }),
      }
    );
    if (!response.ok) return { items: [], error: `Gemini API 錯誤：${response.status}` };
    const result = await response.json();
    const text: string = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    let items: ParsedLineItem[] = [];
    try { items = JSON.parse(text); } catch { return { items: [], error: '解析結果格式錯誤，請重試或手動輸入' }; }
    if (!Array.isArray(items) || items.length === 0) return { items: [], error: '未找到消費明細，請檢查帳單圖片或手動輸入' };
    return { items, error: null };
  } catch (err) {
    return { items: [], error: `網路錯誤：${String(err)}` };
  }
}

// ── Bill PDF/image storage — local file copy (no Supabase Storage) ────────────

export async function saveBillFile(sourceUri: string, billId: string): Promise<string | null> {
  const ext = sourceUri.split('.').pop() ?? 'pdf';
  const dest = `${FileSystem.documentDirectory}bills/${billId}.${ext}`;
  try {
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}bills/`, { intermediates: true });
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  } catch {
    return null;
  }
}

// ── Fuzzy matching ────────────────────────────────────────────────────────────

type SimpleTxn = { id: string; amount: number; date: string; notes: string | null };

function daysBetween(dateA: string, dateB: string): number {
  return Math.abs(Math.round((new Date(dateA).getTime() - new Date(dateB).getTime()) / 86400000));
}

export function fuzzyMatchLineItems(lineItems: ParsedLineItem[], transactions: SimpleTxn[]): MatchedLineItem[] {
  const claimedTxnIds = new Set<string>();
  const candidates: { itemIdx: number; txnId: string; txnNotes: string | null; dateDiff: number }[] = [];

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    for (const txn of transactions) {
      if (txn.amount !== item.amount) continue;
      const diff = daysBetween(item.date, txn.date);
      if (diff <= 3) candidates.push({ itemIdx: i, txnId: txn.id, txnNotes: txn.notes, dateDiff: diff });
    }
  }

  candidates.sort((a, b) => a.dateDiff - b.dateDiff);
  const assignments: Array<{ txnId: string; txnNotes: string | null; dateDiff: number } | null> = lineItems.map(() => null);

  for (const c of candidates) {
    if (assignments[c.itemIdx] !== null || claimedTxnIds.has(c.txnId)) continue;
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

export async function fetchTransactionsForBillingPeriod(
  accountId: string,
  start: string,
  end: string
): Promise<SimpleTxn[]> {
  const db = await getDb();
  const extStart = new Date(start);
  extStart.setDate(extStart.getDate() - 3);
  const extEnd = new Date(end);
  extEnd.setDate(extEnd.getDate() + 3);

  return db.getAllAsync<SimpleTxn>(
    `SELECT id, amount, date, notes FROM transactions
     WHERE account_id = ? AND date >= ? AND date <= ? AND is_income = 0`,
    [accountId, extStart.toISOString().slice(0, 10), extEnd.toISOString().slice(0, 10)]
  );
}

export async function saveBillLineItems(
  userId: string,
  billId: string,
  matchedItems: MatchedLineItem[]
): Promise<{ error: string | null }> {
  const db = await getDb();
  const now = new Date().toISOString();
  for (const m of matchedItems) {
    await db.runAsync(
      `INSERT INTO bill_line_items
       (id, bill_id, user_id, date, merchant, amount, matched_transaction_id, is_checked, date_offset_days, is_manually_added, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        crypto.randomUUID(), billId, userId, m.lineItem.date, m.lineItem.merchant,
        m.lineItem.amount, m.matchedTransactionId ?? null,
        m.isChecked ? 1 : 0, m.dateOffsetDays, now,
      ]
    );
  }
  return { error: null };
}

export async function confirmReconciliation(
  userId: string,
  billId: string,
  creditCardId: string,
  totalAmount: number,
  cashbackOffset: number,
  paymentDueDay: number,
  sourceAccountId: string | null
): Promise<{ error: string | null }> {
  const db = await getDb();
  const netAmount = Math.max(0, totalAmount - cashbackOffset);
  const today = new Date();
  let dueDate = new Date(today.getFullYear(), today.getMonth(), paymentDueDay);
  if (dueDate <= today) dueDate.setMonth(dueDate.getMonth() + 1);
  const dueDateStr = dueDate.toISOString().slice(0, 10);
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE credit_card_bills SET status='reconciled', total_amount=?, cashback_offset=?, reconciled_at=? WHERE id=?`,
    [totalAmount, cashbackOffset, now, billId]
  );

  if (sourceAccountId && netAmount > 0) {
    await db.runAsync(
      `INSERT INTO pending_debits (id, credit_card_id, bill_id, user_id, amount, due_date, source_account_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [crypto.randomUUID(), creditCardId, billId, userId, netAmount, dueDateStr, sourceAccountId, now]
    );
  }
  return { error: null };
}

export async function executePendingDebits(userId: string): Promise<void> {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const debits = await db.getAllAsync<any>(
    `SELECT * FROM pending_debits WHERE user_id = ? AND status = 'pending' AND due_date <= ?`,
    [userId, today]
  );

  for (const debit of debits) {
    await createTransaction(userId, {
      amount: debit.amount, date: today,
      categoryId: null, accountId: debit.source_account_id,
      projectId: null, notes: '信用卡帳款自動扣繳',
      payerType: 'self', contactId: null, isIncome: false,
    });
    await db.runAsync(
      `UPDATE pending_debits SET status='executed', executed_at=? WHERE id=?`,
      [new Date().toISOString(), debit.id]
    );
  }
}
