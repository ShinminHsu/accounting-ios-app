import { supabase } from './supabase';
import { Transaction, DebtType, PayerType } from '../types/database';

export type TransactionInput = {
  amount: number;
  date: string; // YYYY-MM-DD
  categoryId: string | null;
  accountId: string | null;
  projectId: string | null;
  notes: string;
  payerType: PayerType;
  contactId: string | null;
  isIncome: boolean;
};

// ─── Create transaction with double-entry debt model ──────────────────────
export async function createTransaction(
  userId: string,
  input: TransactionInput
): Promise<{ data: Transaction | null; error: string | null }> {
  const { data: txn, error: txnErr } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      amount: input.amount,
      date: input.date,
      category_id: input.categoryId,
      account_id: input.payerType === 'paid_by_other' ? null : input.accountId,
      project_id: input.projectId,
      notes: input.notes || null,
      payer_type: input.payerType,
      contact_id: input.contactId,
      is_income: input.isIncome,
    })
    .select()
    .single();

  if (txnErr || !txn) return { data: null, error: txnErr?.message ?? '建立失敗' };

  // Double-entry: create debt record when payer type is not self
  if (input.payerType !== 'self' && input.contactId) {
    const debtType: DebtType =
      input.payerType === 'paid_by_other' ? 'liability' : 'receivable';

    await supabase.from('debt_records').insert({
      user_id: userId,
      transaction_id: txn.id,
      contact_id: input.contactId,
      type: debtType,
      original_amount: input.amount,
      repaid_amount: 0,
      currency: 'TWD', // TODO: derive from account currency
      status: 'outstanding',
    });
  }

  return { data: txn, error: null };
}

// ─── Update transaction ────────────────────────────────────────────────────
export async function updateTransaction(
  id: string,
  input: Partial<Omit<TransactionInput, 'payerType'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('transactions')
    .update({
      amount: input.amount,
      date: input.date,
      category_id: input.categoryId,
      account_id: input.accountId,
      project_id: input.projectId,
      notes: input.notes || null,
      is_income: input.isIncome,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  return { error: error?.message ?? null };
}

// ─── Delete transaction (cascade-deletes linked debt_record via FK) ────────
export async function deleteTransaction(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ─── Check if transaction has linked debt record ───────────────────────────
export async function hasLinkedDebt(transactionId: string): Promise<boolean> {
  const { count } = await supabase
    .from('debt_records')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_id', transactionId);
  return (count ?? 0) > 0;
}

// ─── Fetch transactions for a month ───────────────────────────────────────
export type TransactionWithRefs = Transaction & {
  category_name: string | null;
  category_emoji: string | null;
  account_name: string | null;
  contact_name: string | null;
};

export async function fetchTransactionsForMonth(
  userId: string,
  year: number,
  month: number
): Promise<TransactionWithRefs[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10); // last day

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      categories(name, emoji),
      accounts(name),
      contacts(name)
    `)
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((t: any) => ({
    ...t,
    category_name: t.categories?.name ?? null,
    category_emoji: t.categories?.emoji ?? null,
    account_name: t.accounts?.name ?? null,
    contact_name: t.contacts?.name ?? null,
  }));
}

// ─── Daily totals for calendar view ───────────────────────────────────────
export function groupByDate(
  transactions: TransactionWithRefs[]
): Record<string, { total: number; items: TransactionWithRefs[] }> {
  const result: Record<string, { total: number; items: TransactionWithRefs[] }> = {};
  for (const t of transactions) {
    if (!result[t.date]) result[t.date] = { total: 0, items: [] };
    if (!t.is_income && t.payer_type !== 'paid_for_other') {
      result[t.date].total += t.amount;
    }
    result[t.date].items.push(t);
  }
  return result;
}
