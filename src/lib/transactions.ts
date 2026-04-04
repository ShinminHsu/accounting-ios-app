import { getDb, generateUUID } from './db';
import { Transaction, DebtType, PayerType } from '../types/database';

export type TransactionInput = {
  amount: number;
  date: string; // YYYY-MM-DD
  name: string | null;
  categoryId: string | null;
  accountId: string | null;
  projectId: string | null;
  notes: string;
  payerType: PayerType;
  contactId: string | null;
  isIncome: boolean;
};

function rowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    user_id: row.user_id,
    amount: row.amount,
    date: row.date,
    name: row.name ?? null,
    category_id: row.category_id ?? null,
    account_id: row.account_id ?? null,
    project_id: row.project_id ?? null,
    notes: row.notes ?? null,
    payer_type: row.payer_type as PayerType,
    contact_id: row.contact_id ?? null,
    is_income: row.is_income === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ─── Create transaction with double-entry debt model ──────────────────────
export async function createTransaction(
  userId: string,
  input: TransactionInput
): Promise<{ data: Transaction | null; error: string | null }> {
  const db = await getDb();
  const id = generateUUID();
  const now = new Date().toISOString();
  const accountId = input.payerType === 'paid_by_other' ? null : input.accountId;

  await db.runAsync(
    `INSERT INTO transactions
     (id, user_id, amount, date, name, category_id, account_id, project_id, notes, payer_type, contact_id, is_income, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, input.amount, input.date,
      input.name ?? null,
      input.categoryId ?? null, accountId ?? null, input.projectId ?? null,
      input.notes || null, input.payerType, input.contactId ?? null,
      input.isIncome ? 1 : 0, now, now,
    ]
  );

  // Double-entry: create debt record when payer type is not self and contact provided
  if (input.payerType !== 'self' && input.contactId) {
    const debtType: DebtType =
      input.payerType === 'paid_by_other' ? 'liability' : 'receivable';
    await db.runAsync(
      `INSERT INTO debt_records
       (id, user_id, transaction_id, contact_id, type, original_amount, repaid_amount, currency, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'TWD', 'outstanding', ?)`,
      [generateUUID(), userId, id, input.contactId, debtType, input.amount, now]
    );
  }

  const row = await db.getFirstAsync<any>('SELECT * FROM transactions WHERE id = ?', [id]);
  return { data: row ? rowToTransaction(row) : null, error: null };
}

// ─── Update transaction ────────────────────────────────────────────────────
export async function updateTransaction(
  id: string,
  input: Partial<Omit<TransactionInput, 'payerType'>>
): Promise<{ error: string | null }> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE transactions SET
       amount = COALESCE(?, amount),
       date = COALESCE(?, date),
       category_id = ?,
       account_id = ?,
       project_id = ?,
       notes = ?,
       is_income = COALESCE(?, is_income),
       updated_at = ?
     WHERE id = ?`,
    [
      input.amount ?? null, input.date ?? null,
      input.categoryId ?? null, input.accountId ?? null,
      input.projectId ?? null, input.notes ?? null,
      input.isIncome !== undefined ? (input.isIncome ? 1 : 0) : null,
      new Date().toISOString(), id,
    ]
  );
  return { error: null };
}

// ─── Delete transaction (cascade-deletes linked debt_record via FK) ────────
export async function deleteTransaction(id: string): Promise<{ error: string | null }> {
  const db = await getDb();
  // Manually delete debt records (FK ON DELETE SET NULL won't cascade delete them)
  await db.runAsync('DELETE FROM debt_records WHERE transaction_id = ?', [id]);
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  return { error: null };
}

// ─── Check if transaction has linked debt record ───────────────────────────
export async function hasLinkedDebt(transactionId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM debt_records WHERE transaction_id = ?',
    [transactionId]
  );
  return (result?.count ?? 0) > 0;
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
  const db = await getDb();
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10);

  const rows = await db.getAllAsync<any>(
    `SELECT t.*,
            c.name as category_name, c.emoji as category_emoji,
            a.name as account_name,
            co.name as contact_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts a ON t.account_id = a.id
     LEFT JOIN contacts co ON t.contact_id = co.id
     WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?
     ORDER BY t.date DESC, t.created_at DESC`,
    [userId, start, end]
  );

  return rows.map((row) => ({
    ...rowToTransaction(row),
    category_name: row.category_name ?? null,
    category_emoji: row.category_emoji ?? null,
    account_name: row.account_name ?? null,
    contact_name: row.contact_name ?? null,
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
