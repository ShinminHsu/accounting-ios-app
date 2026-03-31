// Auto-generated TypeScript types for Supabase schema

export type AccountType = 'cash' | 'bank' | 'e_payment' | 'credit_card' | 'investment';
export type PayerType = 'self' | 'paid_by_other' | 'paid_for_other';
export type DebtType = 'liability' | 'receivable';
export type DebtStatus = 'outstanding' | 'settled' | 'disputed';
export type ProjectType = 'periodic' | 'one_time';
export type ProjectInterval = 'monthly' | 'yearly';
export type ProjectStatus = 'active' | 'completed' | 'archived';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurrenceSubtype = 'expense' | 'paid_for_other' | 'investment_contribution';
export type RecurrenceStatus = 'active' | 'cancelled' | 'completed';
export type RewardRuleType = 'category' | 'merchant';
export type RewardType = 'cashback_offset' | 'points' | 'account_deposit';
export type BillStatus = 'pending' | 'reconciling' | 'reconciled';
export type DebitStatus = 'pending' | 'executed';
export type FriendshipStatus = 'pending' | 'active' | 'removed';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  push_token: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  linked_user_id: string | null;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  initial_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  parent_id: string | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  type: ProjectType;
  interval: ProjectInterval | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectCategoryBudget {
  id: string;
  project_id: string;
  category_id: string;
  budget_amount: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  category_id: string | null;
  account_id: string | null;
  project_id: string | null;
  notes: string | null;
  payer_type: PayerType;
  contact_id: string | null;
  is_income: boolean;
  created_at: string;
  updated_at: string;
}

export interface DebtRecord {
  id: string;
  user_id: string;
  transaction_id: string | null;
  contact_id: string | null;
  type: DebtType;
  original_amount: number;
  repaid_amount: number;
  currency: string;
  status: DebtStatus;
  dispute_note: string | null;
  created_at: string;
  settled_at: string | null;
}

export interface RecurringTemplate {
  id: string;
  user_id: string;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  project_id: string | null;
  notes: string | null;
  frequency: RecurrenceFrequency;
  subtype: RecurrenceSubtype;
  contact_id: string | null;
  start_date: string;
  end_date: string | null;
  last_generated_date: string | null;
  status: RecurrenceStatus;
  created_at: string;
  updated_at: string;
}

export interface ExchangeRate {
  id: string;
  user_id: string;
  currency: string;
  rate_to_twd: number;
  updated_at: string;
}

export interface CreditCard {
  id: string;
  account_id: string;
  user_id: string;
  statement_closing_day: number;
  payment_due_day: number;
  auto_debit_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCardRewardRule {
  id: string;
  credit_card_id: string;
  user_id: string;
  rule_type: RewardRuleType;
  category_id: string | null;
  merchant_name: string | null;
  reward_rate: number;
  reward_type: RewardType;
  monthly_cap: number | null;
  min_spend_threshold: number | null;
  deposit_account_id: string | null;
  points_conversion_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface RewardAccumulation {
  id: string;
  user_id: string;
  rule_id: string;
  year_month: string;
  earned_amount: number;
  updated_at: string;
}

export interface PendingRewardDeposit {
  id: string;
  user_id: string;
  credit_card_id: string;
  amount: number;
  updated_at: string;
}

export interface CreditCardBill {
  id: string;
  credit_card_id: string;
  user_id: string;
  billing_period_start: string;
  billing_period_end: string;
  total_amount: number | null;
  cashback_offset: number;
  status: BillStatus;
  storage_path: string | null;
  created_at: string;
  reconciled_at: string | null;
}

export interface BillLineItem {
  id: string;
  bill_id: string;
  user_id: string;
  date: string;
  merchant: string;
  amount: number;
  matched_transaction_id: string | null;
  is_checked: boolean;
  date_offset_days: number;
  is_manually_added: boolean;
  created_at: string;
}

export interface PendingDebit {
  id: string;
  credit_card_id: string;
  bill_id: string;
  user_id: string;
  amount: number;
  due_date: string;
  source_account_id: string;
  status: DebitStatus;
  executed_at: string | null;
  created_at: string;
}

export interface Friendship {
  id: string;
  user_a: string;
  user_b: string;
  requester_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface SharedTransaction {
  id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  currency: string;
  date: string;
  category_name: string | null;
  notes: string | null;
  source_transaction_id: string;
  created_at: string;
}
