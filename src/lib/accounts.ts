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

export type UpdateAccountFields = {
  name?: string;
  currency?: string;
  closing_day?: number;
  due_day?: number;
  auto_debit_account_id?: string | null;
};

export async function fetchCreditCardSettings(accountId: string): Promise<{
  statement_closing_day: number;
  payment_due_day: number;
  auto_debit_account_id: string | null;
} | null> {
  const db = await getDb();
  return db.getFirstAsync<{
    statement_closing_day: number;
    payment_due_day: number;
    auto_debit_account_id: string | null;
  }>(
    'SELECT statement_closing_day, payment_due_day, auto_debit_account_id FROM credit_cards WHERE account_id = ?',
    [accountId]
  );
}

export async function updateAccount(
  accountId: string,
  fields: UpdateAccountFields
): Promise<{ error: string | null }> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM accounts WHERE id = ?',
    [accountId]
  );
  if (!existing) return { error: '找不到此帳戶' };

  const now = new Date().toISOString();

  const accCols: string[] = [];
  const accVals: (string | number | null)[] = [];
  if (fields.name !== undefined) { accCols.push('name = ?'); accVals.push(fields.name); }
  if (fields.currency !== undefined) { accCols.push('currency = ?'); accVals.push(fields.currency); }
  accCols.push('updated_at = ?');
  accVals.push(now, accountId);
  await db.runAsync(`UPDATE accounts SET ${accCols.join(', ')} WHERE id = ?`, accVals);

  const hasCcFields = fields.closing_day !== undefined || fields.due_day !== undefined || fields.auto_debit_account_id !== undefined;
  if (hasCcFields) {
    const ccCols: string[] = [];
    const ccVals: (string | number | null)[] = [];
    if (fields.closing_day !== undefined) { ccCols.push('statement_closing_day = ?'); ccVals.push(fields.closing_day); }
    if (fields.due_day !== undefined) { ccCols.push('payment_due_day = ?'); ccVals.push(fields.due_day); }
    if (fields.auto_debit_account_id !== undefined) { ccCols.push('auto_debit_account_id = ?'); ccVals.push(fields.auto_debit_account_id); }
    ccCols.push('updated_at = ?');
    ccVals.push(now, accountId);
    await db.runAsync(`UPDATE credit_cards SET ${ccCols.join(', ')} WHERE account_id = ?`, ccVals);
  }

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
