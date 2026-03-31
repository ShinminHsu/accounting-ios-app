-- Migration 003: Friend sync tables
-- Run this in Supabase SQL Editor (after 002)

-- ─────────────────────────────────────────
-- Friendships (bilateral)
-- ─────────────────────────────────────────
create type if not exists public.friendship_status as enum ('pending', 'active', 'removed');

create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  user_a        uuid not null references auth.users(id) on delete cascade,
  user_b        uuid not null references auth.users(id) on delete cascade,
  requester_id  uuid not null references auth.users(id) on delete cascade,
  status        public.friendship_status not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- prevent duplicate pairs in either order
  unique(user_a, user_b),
  check (user_a <> user_b)
);

create index if not exists friendships_user_a_idx on public.friendships(user_a);
create index if not exists friendships_user_b_idx on public.friendships(user_b);

-- Helper function: check if two users are active friends
create or replace function public.are_friends(uid_a uuid, uid_b uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.friendships
    where status = 'active'
      and ((user_a = uid_a and user_b = uid_b)
        or (user_a = uid_b and user_b = uid_a))
  );
$$;

-- ─────────────────────────────────────────
-- Shared transactions (payment-on-behalf events)
-- ─────────────────────────────────────────
create table if not exists public.shared_transactions (
  id                    uuid primary key default gen_random_uuid(),
  payer_id              uuid not null references auth.users(id) on delete cascade,
  payee_id              uuid not null references auth.users(id) on delete cascade,
  amount                numeric(15,2) not null check (amount > 0),
  currency              text not null default 'TWD',
  date                  date not null,
  category_name         text,    -- snapshot of payer's category name
  notes                 text,
  source_transaction_id uuid not null references public.transactions(id) on delete cascade,
  created_at            timestamptz not null default now()
);

create index if not exists shared_tx_payer_idx on public.shared_transactions(payer_id);
create index if not exists shared_tx_payee_idx on public.shared_transactions(payee_id);
