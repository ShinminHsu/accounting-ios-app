## 1. Setup & Database Initialization

- [x] 1.1 Add `expo-sqlite` import to `package.json` (verify it ships with Expo SDK 54; if not, run `npx expo install expo-sqlite`)
- [x] 1.2 Create `src/lib/db.ts` — use expo-sqlite v14+ (new api) with `openDatabaseAsync`; implement `initDb()` that opens single database file `accounting.db`; enable WAL mode enabled (`PRAGMA journal_mode = WAL`) and foreign keys (`PRAGMA foreign_keys = ON`); create `_migrations` table (migration table tracks applied migrations: `name TEXT PRIMARY KEY`, `applied_at TEXT`) and export `getDb()`; all `id` columns use UUIDs generated on client with `crypto.randomUUID()`; keep existing TypeScript interfaces in `database.ts` unchanged; Supabase tables to keep (create these in dashboard): `users`, `friendships`, `shared_transactions` only
- [x] 1.3 Write migration `001_initial_schema` inside `db.ts` (single database file, schema versioned by a `_migrations` table): DDL for personal table schema covering all personal tables — `contacts`, `accounts`, `categories`, `projects`, `project_category_budgets`, `transactions`, `debt_records`, `recurring_templates`, `exchange_rates`, `credit_cards`, `credit_card_reward_rules`, `reward_accumulations`, `pending_reward_deposits`, `credit_card_bills`, `bill_line_items`, `pending_debits` — with correct column types, NOT NULL constraints, and FOREIGN KEY references; record migration name in `_migrations` after successful execution
- [x] 1.4 Call `await initDb()` in `App.tsx` before rendering any navigation (database initialization on app start); show a loading spinner while init is running

## 2. Supabase Cleanup

- [x] 2.1 In Supabase Dashboard: create only 3 tables — `users` (`id uuid PK references auth.users`, `display_name text`, `push_token text`, `created_at timestamptz`), `friendships` (existing schema), `shared_transactions` (existing schema) — with RLS policies identical to current design; Supabase tables for personal data do not need to exist
- [x] 2.2 Remove all `supabase.from(...)` calls targeting personal tables from `accounts.ts`, `categories.ts`, `transactions.ts`, `projects.ts`, `debts.ts`, `contacts.ts`, `recurring.ts`, `rewards.ts`, `reconciliation.ts`, `reports.ts` — Supabase client used only for auth and friend sync going forward

## 3. Rewrite `categories.ts` and `seedCategories.ts`

- [x] 3.1 Rewrite `fetchCategories(userId)` to `SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order ASC` using SQLite; build parent/children tree in JS (function signatures unchanged)
- [x] 3.2 Rewrite `createCategory`, `updateCategory`, `deleteCategory` to use SQLite INSERT/UPDATE/DELETE; preserve unique-name validation and transaction-reference block using SQLite COUNT queries
- [x] 3.3 Rewrite `seedDefaultCategories(userId)` to insert default category tree into local SQLite `categories` table; check `SELECT COUNT(*) FROM categories WHERE user_id = ? AND is_default = 1` for idempotency; default categories seeded without network

## 4. Rewrite `accounts.ts`

- [x] 4.1 Rewrite `fetchAccounts(userId)` to query SQLite `accounts` JOIN `credit_cards` (LEFT JOIN) for balance calculation; `fetchExchangeRates(userId)` and `upsertExchangeRate` to query/upsert SQLite `exchange_rates` table (exchange_rates stored locally)
- [x] 4.2 Rewrite `createAccount`, `createCreditCard`, `updateAccount`, `deleteAccount` to use SQLite; preserve deletion-block logic using SQLite COUNT on transactions

## 5. Rewrite `transactions.ts`

- [x] 5.1 Rewrite `fetchTransactionsByMonth`, `fetchTransactionsByDay`, `searchTransactions` to query SQLite `transactions` table with appropriate WHERE clauses; all personal data read/write targets SQLite
- [x] 5.2 Rewrite `createTransaction`, `updateTransaction`, `deleteTransaction` to INSERT/UPDATE/DELETE in SQLite; preserve cascade-delete of linked `debt_records`

## 6. Rewrite `projects.ts`

- [x] 6.1 Rewrite `fetchProjects`, `fetchProjectById` to query SQLite `projects` JOIN `project_category_budgets`; rewrite `createProject`, `updateProject`, `deleteProject` using SQLite
- [x] 6.2 Rewrite `resetPeriodicProjects`, `completeOneTimeProjects`, `getProjectSpend` to use SQLite queries

## 7. Rewrite `debts.ts` and `contacts.ts`

- [x] 7.1 Rewrite `contacts.ts`: `fetchContacts`, `createContact`, `updateContact` using SQLite `contacts` table
- [x] 7.2 Rewrite `debts.ts`: `fetchDebtsByContact`, `createDebtRecord`, `updateDebtRecord`, `recordRepayment`, `flagDispute` using SQLite `debt_records` table

## 8. Rewrite `recurring.ts`

- [x] 8.1 Rewrite `fetchRecurringTemplates`, `createTemplate`, `updateTemplate`, `cancelTemplate` using SQLite `recurring_templates`
- [x] 8.2 Rewrite `generateDueInstances` to query SQLite for due templates and insert generated transactions into SQLite

## 9. Rewrite `rewards.ts` and `reconciliation.ts`

- [x] 9.1 Rewrite `rewards.ts`: `fetchRewardRules`, `createRewardRule`, `updateRewardRule`, `deleteRewardRule`, `accumulateTransactionReward`, `fetchMonthlyRewardSummary`, `fetchPendingDeposits` using SQLite tables `credit_card_reward_rules`, `reward_accumulations`, `pending_reward_deposits`
- [x] 9.2 Rewrite `reconciliation.ts` bill/line-item operations to use SQLite (`credit_card_bills`, `bill_line_items`, `pending_debits`); keep Gemini OCR HTTP call unchanged; handle bill PDF/image storage: replace Supabase Storage upload with `expo-file-system` local copy so `storage_path` stores a local file URI instead of a Supabase Storage path

## 10. Rewrite `reports.ts`

- [x] 10.1 Rewrite all report queries (`fetchSpendingSummary`, `fetchCategoryBreakdown`, `fetchProjectBudgetReport`, `fetchTrendData`, `fetchAccountBalanceHistory`) to use SQLite aggregate queries (SUM, GROUP BY, date filtering via `WHERE date BETWEEN ? AND ?`)

## 11. Verify `friends.ts` and `auth.ts` unchanged

- [x] 11.1 Confirm `friends.ts` still uses Supabase for `friendships` and `shared_transactions` only; confirm `auth.ts` still uses Supabase Auth; no SQLite usage in these files (Supabase client used only for auth and friend sync)

## 12. End-to-End Smoke Test

- [ ] 12.1 **[手動 — 另一台 Mac]** Push to GitHub, pull on test device Mac, run `npx expo run:ios --device`; verify: register → categories auto-seeded (default categories seeded without network) → add account → add transaction → view in Ledger → create project → assign transaction to project Push to GitHub, pull on test device Mac, run `npx expo run:ios --device`; verify: register → categories auto-seeded (default categories seeded without network) → add account → add transaction → view in Ledger → create project → assign transaction to project
- [ ] 12.2 **[手動]** Verify Supabase Dashboard shows no personal data (only `users`/`friendships`/`shared_transactions` tables exist); confirm no network requests for personal data operations in Xcode console
