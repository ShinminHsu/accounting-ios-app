import { getDb, generateUUID } from './db';
import { Account, AccountType } from '../types/database';

// ─── Balance calculation ───────────────────────────────────────────────────
export async function fetchAccountBalance(accountId: string): Promise<number> {
  const db = await getDb();
  const account = await db.getFirstAsync<{ initial_balance: number }>(
    'SELECT initial_balance FROM accounts WHERE id = ?',
    [accountId]
  );
  if (!account) return 0;

  const result = await db.getFirstAsync<{ delta: number }>(
    `SELECT COALESCE(SUM(
       CASE
         WHEN is_income = 1 THEN amount
         WHEN payer_type = 'paid_for_other' THEN -amount
         ELSE -amount
       END
     ), 0) as delta
     FROM transactions
     WHERE account_id = ? AND payer_type != 'paid_by_other'`,
    [accountId]
  );

  return account.initial_balance + (result?.delta ?? 0);
}

export type AccountWithBalance = Account & { balance: number };

export async function fetchAccounts(userId: string): Promise<AccountWithBalance[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC',
    [userId]
  );
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      type: row.type as AccountType,
      currency: row.currency,
      initial_balance: row.initial_balance,
      created_at: row.created_at,
      updated_at: row.updated_at,
      balance: await fetchAccountBalance(row.id),
    }))
  );
}

// ─── Exchange rates ────────────────────────────────────────────────────────
export async function fetchExchangeRates(userId: string): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ currency: string; rate_to_twd: number }>(
    'SELECT currency, rate_to_twd FROM exchange_rates WHERE user_id = ?',
    [userId]
  );
  return Object.fromEntries(rows.map((r) => [r.currency, r.rate_to_twd]));
}

export async function upsertExchangeRate(
  userId: string,
  currency: string,
  rateTotwd: number
): Promise<{ error: string | null }> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO exchange_rates (id, user_id, currency, rate_to_twd, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, currency) DO UPDATE SET rate_to_twd = excluded.rate_to_twd, updated_at = excluded.updated_at`,
    [generateUUID(), userId, currency, rateTotwd, now]
  );
  return { error: null };
}

export function convertToTWD(amount: number, currency: string, rates: Record<string, number>): number | null {
  if (currency === 'TWD') return amount;
  const rate = rates[currency];
  if (!rate) return null;
  return amount * rate;
}

// ─── CRUD ──────────────────────────────────────────────────────────────────
export async function createAccount(
  userId: string,
  name: string,
  type: AccountType,
  currency: string,
  initialBalance: number
): Promise<{ data: Account | null; error: string | null }> {
  const db = await getDb();
  const id = generateUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO accounts (id, user_id, name, type, currency, initial_balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, name, type, currency, initialBalance, now, now]
  );
  const row = await db.getFirstAsync<any>('SELECT * FROM accounts WHERE id = ?', [id]);
  if (!row) return { data: null, error: '建立帳戶失敗' };
  return {
    data: {
      id: row.id, user_id: row.user_id, name: row.name, type: row.type,
      currency: row.currency, initial_balance: row.initial_balance,
      created_at: row.created_at, updated_at: row.updated_at,
    },
    error: null,
  };
}

export async function createCreditCardSettings(
  accountId: string,
  userId: string,
  statementClosingDay: number,
  paymentDueDay: number,
  autoDebitAccountId: string | null
): Promise<{ error: string | null }> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO credit_cards (id, account_id, user_id, statement_closing_day, payment_due_day, auto_debit_account_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [generateUUID(), accountId, userId, statementClosingDay, paymentDueDay, autoDebitAccountId ?? null, now, now]
  );
  return { error: null };
}

export async function updateAccount(id: string, name: string): Promise<{ error: string | null }> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE accounts SET name = ?, updated_at = ? WHERE id = ?',
    [name, new Date().toISOString(), id]
  );
  return { error: null };
}

export async function deleteAccount(id: string): Promise<{ error: string | null }> {
  const db = await getDb();
  const txResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE account_id = ?',
    [id]
  );
  if (txResult && txResult.count > 0) {
    return { error: `此帳戶有 ${txResult.count} 筆交易記錄，無法刪除` };
  }
  const balance = await fetchAccountBalance(id);
  if (balance !== 0) {
    return { error: '帳戶餘額不為零，請先調整後再刪除' };
  }
  await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
  return { error: null };
}

export const SUPPORTED_CURRENCIES = ['TWD', 'USD', 'JPY', 'EUR', 'HKD', 'CNY'] as const;

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: '現金',
  bank: '銀行帳戶',
  e_payment: '電子支付',
  credit_card: '信用卡',
  investment: '投資帳戶',
};
