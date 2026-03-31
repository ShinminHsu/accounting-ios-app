-- Migration 002: Credit card tables
-- Run this in Supabase SQL Editor (after 001)

-- ─────────────────────────────────────────
-- Credit card settings (extends accounts)
-- ─────────────────────────────────────────
create table if not exists public.credit_cards (
  id                    uuid primary key default gen_random_uuid(),
  account_id            uuid not null unique references public.accounts(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  statement_closing_day int not null check (statement_closing_day between 1 and 31),
  payment_due_day       int not null check (payment_due_day between 1 and 31),
  auto_debit_account_id uuid references public.accounts(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists credit_cards_user_id_idx on public.credit_cards(user_id);

-- ─────────────────────────────────────────
-- Reward rules per credit card
-- ─────────────────────────────────────────
create type if not exists public.reward_rule_type as enum ('category', 'merchant');
create type if not exists public.reward_type as enum ('cashback_offset', 'points', 'account_deposit');

create table if not exists public.credit_card_reward_rules (
  id                      uuid primary key default gen_random_uuid(),
  credit_card_id          uuid not null references public.credit_cards(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  rule_type               public.reward_rule_type not null,
  category_id             uuid references public.categories(id) on delete set null,
  merchant_name           text,
  reward_rate             numeric(6,4) not null check (reward_rate > 0),  -- e.g. 0.03 = 3%
  reward_type             public.reward_type not null,
  monthly_cap             numeric(15,2),                                  -- max reward units per month
  min_spend_threshold     numeric(15,2),                                  -- min single-transaction amount
  deposit_account_id      uuid references public.accounts(id) on delete set null,
  points_conversion_rate  numeric(10,4),                                  -- TWD per 1 point
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- either category_id or merchant_name must be set
  check (
    (rule_type = 'category' and category_id is not null) or
    (rule_type = 'merchant' and merchant_name is not null)
  )
);

create index if not exists reward_rules_credit_card_id_idx on public.credit_card_reward_rules(credit_card_id);

-- ─────────────────────────────────────────
-- Monthly reward accumulation per card per rule
-- ─────────────────────────────────────────
create table if not exists public.reward_accumulations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  rule_id         uuid not null references public.credit_card_reward_rules(id) on delete cascade,
  year_month      text not null,   -- format: 'YYYY-MM'
  earned_amount   numeric(15,4) not null default 0,
  updated_at      timestamptz not null default now(),
  unique(rule_id, year_month)
);

-- Pending account-deposit rewards (not yet deposited)
create table if not exists public.pending_reward_deposits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  credit_card_id  uuid not null references public.credit_cards(id) on delete cascade,
  amount          numeric(15,2) not null default 0,
  updated_at      timestamptz not null default now(),
  unique(credit_card_id)
);

-- ─────────────────────────────────────────
-- Credit card bills
-- ─────────────────────────────────────────
create type if not exists public.bill_status as enum ('pending', 'reconciling', 'reconciled');

create table if not exists public.credit_card_bills (
  id                    uuid primary key default gen_random_uuid(),
  credit_card_id        uuid not null references public.credit_cards(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  billing_period_start  date not null,
  billing_period_end    date not null,
  total_amount          numeric(15,2),
  cashback_offset       numeric(15,2) not null default 0,
  status                public.bill_status not null default 'pending',
  storage_path          text,    -- Supabase Storage path for uploaded file
  created_at            timestamptz not null default now(),
  reconciled_at         timestamptz
);

create index if not exists bills_credit_card_id_idx on public.credit_card_bills(credit_card_id);

-- ─────────────────────────────────────────
-- Parsed bill line items
-- ─────────────────────────────────────────
create table if not exists public.bill_line_items (
  id                      uuid primary key default gen_random_uuid(),
  bill_id                 uuid not null references public.credit_card_bills(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  date                    date not null,
  merchant                text not null,
  amount                  numeric(15,2) not null,
  matched_transaction_id  uuid references public.transactions(id) on delete set null,
  is_checked              boolean not null default false,
  date_offset_days        int not null default 0,
  is_manually_added       boolean not null default false,
  created_at              timestamptz not null default now()
);

create index if not exists line_items_bill_id_idx on public.bill_line_items(bill_id);

-- ─────────────────────────────────────────
-- Pending auto-debits (after reconciliation)
-- ─────────────────────────────────────────
create type if not exists public.debit_status as enum ('pending', 'executed');

create table if not exists public.pending_debits (
  id                uuid primary key default gen_random_uuid(),
  credit_card_id    uuid not null references public.credit_cards(id) on delete cascade,
  bill_id           uuid not null references public.credit_card_bills(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  amount            numeric(15,2) not null,
  due_date          date not null,
  source_account_id uuid not null references public.accounts(id) on delete restrict,
  status            public.debit_status not null default 'pending',
  executed_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists pending_debits_user_id_idx on public.pending_debits(user_id);
create index if not exists pending_debits_due_date_idx on public.pending_debits(due_date);
