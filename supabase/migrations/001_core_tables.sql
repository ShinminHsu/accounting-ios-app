-- Migration 001: Core tables
-- Run this in Supabase SQL Editor

-- ─────────────────────────────────────────
-- User profiles (extends auth.users)
-- ─────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  display_name text,
  push_token  text,
  created_at  timestamptz not null default now()
);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────
-- Contacts (people you lend/borrow with)
-- ─────────────────────────────────────────
create table if not exists public.contacts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  linked_user_id  uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- Accounts
-- ─────────────────────────────────────────
create type if not exists public.account_type as enum (
  'cash', 'bank', 'e_payment', 'credit_card', 'investment'
);

create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  type            public.account_type not null,
  currency        text not null default 'TWD',
  initial_balance numeric(15,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts(user_id);

-- ─────────────────────────────────────────
-- Categories (two-level hierarchy)
-- ─────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  emoji       text,
  parent_id   uuid references public.categories(id) on delete cascade,
  is_default  boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists categories_parent_id_idx on public.categories(parent_id);

-- ─────────────────────────────────────────
-- Projects
-- ─────────────────────────────────────────
create type if not exists public.project_type as enum ('periodic', 'one_time');
create type if not exists public.project_interval as enum ('monthly', 'yearly');
create type if not exists public.project_status as enum ('active', 'completed', 'archived');

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  type         public.project_type not null,
  interval     public.project_interval,        -- for periodic only
  start_date   date,                           -- for one_time only
  end_date     date,                           -- for one_time only
  status       public.project_status not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);

-- Per-category budget within a project
create table if not exists public.project_category_budgets (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  budget_amount numeric(15,2) not null,
  created_at    timestamptz not null default now(),
  unique(project_id, category_id)
);

-- ─────────────────────────────────────────
-- Transactions
-- ─────────────────────────────────────────
create type if not exists public.payer_type as enum ('self', 'paid_by_other', 'paid_for_other');

create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  amount        numeric(15,2) not null check (amount > 0),
  date          date not null,
  category_id   uuid references public.categories(id) on delete set null,
  account_id    uuid references public.accounts(id) on delete set null,
  project_id    uuid references public.projects(id) on delete set null,
  notes         text,
  payer_type    public.payer_type not null default 'self',
  contact_id    uuid references public.contacts(id) on delete set null,
  is_income     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_date_idx on public.transactions(date desc);
create index if not exists transactions_account_id_idx on public.transactions(account_id);
create index if not exists transactions_project_id_idx on public.transactions(project_id);

-- ─────────────────────────────────────────
-- Debt records (liabilities & receivables)
-- ─────────────────────────────────────────
create type if not exists public.debt_type as enum ('liability', 'receivable');
create type if not exists public.debt_status as enum ('outstanding', 'settled', 'disputed');

create table if not exists public.debt_records (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  transaction_id    uuid references public.transactions(id) on delete cascade,
  contact_id        uuid references public.contacts(id) on delete set null,
  type              public.debt_type not null,
  original_amount   numeric(15,2) not null,
  repaid_amount     numeric(15,2) not null default 0,
  currency          text not null default 'TWD',
  status            public.debt_status not null default 'outstanding',
  dispute_note      text,
  created_at        timestamptz not null default now(),
  settled_at        timestamptz
);

create index if not exists debt_records_user_id_idx on public.debt_records(user_id);
create index if not exists debt_records_contact_id_idx on public.debt_records(contact_id);

-- ─────────────────────────────────────────
-- Recurring transaction templates
-- ─────────────────────────────────────────
create type if not exists public.recurrence_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');
create type if not exists public.recurrence_subtype as enum ('expense', 'paid_for_other', 'investment_contribution');
create type if not exists public.recurrence_status as enum ('active', 'cancelled', 'completed');

create table if not exists public.recurring_templates (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  amount               numeric(15,2) not null check (amount > 0),
  category_id          uuid references public.categories(id) on delete set null,
  account_id           uuid references public.accounts(id) on delete set null,
  project_id           uuid references public.projects(id) on delete set null,
  notes                text,
  frequency            public.recurrence_frequency not null,
  subtype              public.recurrence_subtype not null default 'expense',
  contact_id           uuid references public.contacts(id) on delete set null,
  start_date           date not null,
  end_date             date,
  last_generated_date  date,
  status               public.recurrence_status not null default 'active',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists recurring_templates_user_id_idx on public.recurring_templates(user_id);

-- ─────────────────────────────────────────
-- Exchange rates (manual, per user)
-- ─────────────────────────────────────────
create table if not exists public.exchange_rates (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  currency     text not null,
  rate_to_twd  numeric(15,6) not null check (rate_to_twd > 0),
  updated_at   timestamptz not null default now(),
  unique(user_id, currency)
);
