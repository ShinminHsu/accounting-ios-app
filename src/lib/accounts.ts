import { supabase } from './supabase';
import { Account, AccountType, CreditCard, ExchangeRate } from '../types/database';

// ─── Balance calculation ───────────────────────────────────────────────────
// Balance = initial_balance + inflows - outflows
// "paid_by_other" transactions do NOT affect account balance (cash hasn't moved)
export async function fetchAccountBalance(accountId: string): Promise<number> {
  const { data: account } = await supabase
    .from('accounts')
    .select('initial_balance')
    .eq('id', accountId)
    .single();

  if (!account) return 0;

  // Sum all transactions that actually move cash for this account
  const { data: txns } = await supabase
    .from('transactions')
    .select('amount, is_income, payer_type')
    .eq('account_id', accountId)
    .neq('payer_type', 'paid_by_other'); // exclude — cash hasn't moved

  if (!txns) return account.initial_balance;

  const delta = txns.reduce((sum, t) => {
    if (t.is_income) return sum + t.amount;
    if (t.payer_type === 'paid_for_other') return sum - t.amount; // cash out
    return sum - t.amount; // self expense
  }, 0);

  return account.initial_balance + delta;
}

// ─── Fetch all accounts with balances ─────────────────────────────────────
export type AccountWithBalance = Account & { balance: number };

export async function fetchAccounts(userId: string): Promise<AccountWithBalance[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  const withBalances = await Promise.all(
    data.map(async (acc) => ({
      ...acc,
      balance: await fetchAccountBalance(acc.id),
    }))
  );
  return withBalances;
}

// ─── Exchange rates ────────────────────────────────────────────────────────
export async function fetchExchangeRates(userId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('currency, rate_to_twd')
    .eq('user_id', userId);

  if (!data) return {};
  return Object.fromEntries(data.map((r) => [r.currency, r.rate_to_twd]));
}

export async function upsertExchangeRate(
  userId: string,
  currency: string,
  rateTotwd: number
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('exchange_rates').upsert(
    { user_id: userId, currency, rate_to_twd: rateTotwd, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,currency' }
  );
  return { error: error?.message ?? null };
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
  const { data, error } = await supabase
    .from('accounts')
    .insert({ user_id: userId, name, type, currency, initial_balance: initialBalance })
    .select()
    .single();
  return { data: data ?? null, error: error?.message ?? null };
}

export async function createCreditCardSettings(
  accountId: string,
  userId: string,
  statementClosingDay: number,
  paymentDueDay: number,
  autoDebitAccountId: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('credit_cards').insert({
    account_id: accountId,
    user_id: userId,
    statement_closing_day: statementClosingDay,
    payment_due_day: paymentDueDay,
    auto_debit_account_id: autoDebitAccountId,
  });
  return { error: error?.message ?? null };
}

export async function updateAccount(
  id: string,
  name: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('accounts')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteAccount(id: string): Promise<{ error: string | null }> {
  // Block if account has transactions
  const { count: txCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', id);

  if (txCount && txCount > 0) {
    return { error: `此帳戶有 ${txCount} 筆交易記錄，無法刪除` };
  }

  const balance = await fetchAccountBalance(id);
  if (balance !== 0) {
    return { error: '帳戶餘額不為零，請先調整後再刪除' };
  }

  const { error } = await supabase.from('accounts').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export const SUPPORTED_CURRENCIES = ['TWD', 'USD', 'JPY', 'EUR', 'HKD', 'CNY'] as const;

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: '現金',
  bank: '銀行帳戶',
  e_payment: '電子支付',
  credit_card: '信用卡',
  investment: '投資帳戶',
};
