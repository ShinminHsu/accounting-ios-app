-- Migration 005: Enable Realtime
-- Run this in Supabase SQL Editor (after 004)

-- Enable Realtime publication for shared tables
-- (Supabase Realtime requires tables to be added to the supabase_realtime publication)

alter publication supabase_realtime add table public.shared_transactions;
alter publication supabase_realtime add table public.friendships;
