## Why

All personal data currently targets Supabase, which means the app owner (Supabase project admin) can view every user's financial records in the Dashboard. Additionally, the Supabase tables were never created, so the app is entirely non-functional. Switching to local-first SQLite makes personal data private by design: it never leaves the device, so no admin can see it.

## What Changes

- Replace Supabase as the personal data store with `expo-sqlite` (on-device SQLite database)
- Create a local DB initialization module that defines all personal table schemas and runs migrations on app start
- Rewrite all personal-data lib modules to use SQLite instead of Supabase queries:
  - `accounts.ts`, `categories.ts`, `transactions.ts`, `projects.ts`, `debts.ts`, `contacts.ts`, `recurring.ts`, `rewards.ts`, `reconciliation.ts`, `reports.ts`, `seedCategories.ts`
- Keep Supabase for: Auth (email/password login), `friendships` table, `shared_transactions` table, push notification tokens
- Remove all Supabase personal table definitions (no tables to create in Supabase Dashboard for personal data)
- `exchange_rates` table moves to SQLite
- `credit_cards`, `credit_card_reward_rules`, `credit_card_bills`, `bill_line_items`, `pending_debits` move to SQLite

## Non-Goals

- Multi-device sync for personal data (data lives on one device only; switching phones loses data)
- Cloud backup of personal data
- Offline mode for friend sync (shared_transactions still requires connectivity)

## Capabilities

### New Capabilities

- `local-database`: On-device SQLite schema, initialization, and migration runner for all personal tables

### Modified Capabilities

- `data-access`: All personal-data read/write operations now target SQLite instead of Supabase; function signatures remain unchanged so screens need no edits

## Impact

- Affected specs: `local-database`, `data-access`
- Affected code:
  - `src/lib/db.ts` (new) — SQLite initialization, schema creation, migration runner
  - `src/lib/accounts.ts` — rewrite to SQLite
  - `src/lib/categories.ts` — rewrite to SQLite
  - `src/lib/seedCategories.ts` — rewrite to SQLite
  - `src/lib/transactions.ts` — rewrite to SQLite
  - `src/lib/projects.ts` — rewrite to SQLite
  - `src/lib/debts.ts` — rewrite to SQLite
  - `src/lib/contacts.ts` — rewrite to SQLite
  - `src/lib/recurring.ts` — rewrite to SQLite
  - `src/lib/rewards.ts` — rewrite to SQLite
  - `src/lib/reconciliation.ts` — rewrite to SQLite
  - `src/lib/reports.ts` — rewrite to SQLite
  - `src/lib/friends.ts` — keep Supabase (friendships table)
  - `src/lib/auth.ts` — keep Supabase (auth only)
  - `src/lib/supabase.ts` — keep (used by auth + friends + shared_transactions)
  - `package.json` — add `expo-sqlite`
