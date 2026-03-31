-- Migration 004: Row Level Security policies
-- Run this in Supabase SQL Editor (after 003)

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.contacts enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.projects enable row level security;
alter table public.project_category_budgets enable row level security;
alter table public.transactions enable row level security;
alter table public.debt_records enable row level security;
alter table public.recurring_templates enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.credit_cards enable row level security;
alter table public.credit_card_reward_rules enable row level security;
alter table public.reward_accumulations enable row level security;
alter table public.pending_reward_deposits enable row level security;
alter table public.credit_card_bills enable row level security;
alter table public.bill_line_items enable row level security;
alter table public.pending_debits enable row level security;
alter table public.friendships enable row level security;
alter table public.shared_transactions enable row level security;

-- ─────────────────────────────────────────
-- Private tables: owner-only access
-- ─────────────────────────────────────────
-- users
create policy "users: own row only" on public.users
  for all using (auth.uid() = id);

-- contacts
create policy "contacts: own only" on public.contacts
  for all using (auth.uid() = user_id);

-- accounts
create policy "accounts: own only" on public.accounts
  for all using (auth.uid() = user_id);

-- categories
create policy "categories: own only" on public.categories
  for all using (auth.uid() = user_id);

-- projects
create policy "projects: own only" on public.projects
  for all using (auth.uid() = user_id);

-- project_category_budgets: accessible via project ownership
create policy "project_budgets: own only" on public.project_category_budgets
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

-- transactions
create policy "transactions: own only" on public.transactions
  for all using (auth.uid() = user_id);

-- debt_records
create policy "debt_records: own only" on public.debt_records
  for all using (auth.uid() = user_id);

-- recurring_templates
create policy "recurring_templates: own only" on public.recurring_templates
  for all using (auth.uid() = user_id);

-- exchange_rates
create policy "exchange_rates: own only" on public.exchange_rates
  for all using (auth.uid() = user_id);

-- credit_cards
create policy "credit_cards: own only" on public.credit_cards
  for all using (auth.uid() = user_id);

-- credit_card_reward_rules
create policy "reward_rules: own only" on public.credit_card_reward_rules
  for all using (auth.uid() = user_id);

-- reward_accumulations
create policy "reward_accumulations: own only" on public.reward_accumulations
  for all using (auth.uid() = user_id);

-- pending_reward_deposits
create policy "pending_reward_deposits: own only" on public.pending_reward_deposits
  for all using (auth.uid() = user_id);

-- credit_card_bills
create policy "bills: own only" on public.credit_card_bills
  for all using (auth.uid() = user_id);

-- bill_line_items
create policy "line_items: own only" on public.bill_line_items
  for all using (auth.uid() = user_id);

-- pending_debits
create policy "pending_debits: own only" on public.pending_debits
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- Friendships: each user sees rows they are part of
-- ─────────────────────────────────────────
create policy "friendships: participant access" on public.friendships
  for all using (auth.uid() = user_a or auth.uid() = user_b);

-- ─────────────────────────────────────────
-- Shared transactions: payer and payee only
-- ─────────────────────────────────────────
create policy "shared_transactions: participant read" on public.shared_transactions
  for select using (auth.uid() = payer_id or auth.uid() = payee_id);

create policy "shared_transactions: payer insert" on public.shared_transactions
  for insert with check (
    auth.uid() = payer_id
    and public.are_friends(payer_id, payee_id)
  );

-- Payer can delete their own shared transactions (e.g. on friend removal)
create policy "shared_transactions: payer delete" on public.shared_transactions
  for delete using (auth.uid() = payer_id);
