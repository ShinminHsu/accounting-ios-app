# data-access Specification

## Purpose

TBD - created by archiving change 'local-first-sqlite'. Update Purpose after archive.

## Requirements

### Requirement: All personal data read/write targets SQLite

All functions in `src/lib/accounts.ts`, `categories.ts`, `transactions.ts`, `projects.ts`, `debts.ts`, `contacts.ts`, `recurring.ts`, `rewards.ts`, `reconciliation.ts`, `reports.ts`, and `seedCategories.ts` SHALL use `getDb()` (expo-sqlite) instead of the Supabase client for personal data operations. No personal data SHALL be sent to Supabase.

#### Scenario: Fetch accounts returns local data

- **WHEN** `fetchAccounts(userId)` is called
- **THEN** it SHALL query the local SQLite `accounts` table and return results without any network request

#### Scenario: Create transaction persists locally

- **WHEN** `createTransaction(...)` is called with valid parameters
- **THEN** the transaction SHALL be inserted into the local SQLite `transactions` table and the returned record SHALL include the generated UUID


<!-- @trace
source: local-first-sqlite
updated: 2026-04-04
code:
  - src/lib/categories.ts
  - src/theme/index.ts
  - src/screens/projects/CreateProjectModal.tsx
  - src/lib/accounts.ts
  - src/lib/projects.ts
  - src/navigation/MainTabNavigator.tsx
  - App.tsx
  - src/lib/debts.ts
  - src/lib/reconciliation.ts
  - src/screens/accounts/AccountsScreen.tsx
  - src/lib/db.ts
  - src/lib/recurring.ts
  - src/lib/seedCategories.ts
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/screens/LedgerScreen.tsx
  - src/lib/rewards.ts
  - src/screens/MoreScreen.tsx
  - src/lib/contacts.ts
  - src/lib/transactions.ts
  - src/lib/reports.ts
  - src/screens/HomeScreen.tsx
  - package.json
  - src/screens/creditcards/ReconciliationScreen.tsx
-->

---
### Requirement: Function signatures unchanged

All exported function signatures in the lib modules SHALL remain identical after the SQLite migration. Parameters and return types SHALL match the existing TypeScript interfaces in `src/types/database.ts`. Screen components SHALL require no changes.

#### Scenario: No screen import changes required

- **WHEN** the SQLite rewrite is complete
- **THEN** all existing `import` statements in `src/screens/` that reference lib modules SHALL continue to compile without modification


<!-- @trace
source: local-first-sqlite
updated: 2026-04-04
code:
  - src/lib/categories.ts
  - src/theme/index.ts
  - src/screens/projects/CreateProjectModal.tsx
  - src/lib/accounts.ts
  - src/lib/projects.ts
  - src/navigation/MainTabNavigator.tsx
  - App.tsx
  - src/lib/debts.ts
  - src/lib/reconciliation.ts
  - src/screens/accounts/AccountsScreen.tsx
  - src/lib/db.ts
  - src/lib/recurring.ts
  - src/lib/seedCategories.ts
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/screens/LedgerScreen.tsx
  - src/lib/rewards.ts
  - src/screens/MoreScreen.tsx
  - src/lib/contacts.ts
  - src/lib/transactions.ts
  - src/lib/reports.ts
  - src/screens/HomeScreen.tsx
  - package.json
  - src/screens/creditcards/ReconciliationScreen.tsx
-->

---
### Requirement: Default categories seeded without network

`seedDefaultCategories(userId)` SHALL insert the preset category tree into the local SQLite `categories` table. The function SHALL be idempotent: if rows with `is_default = 1` already exist for the user, it SHALL return immediately without inserting duplicates.

#### Scenario: First login seeds categories

- **WHEN** a user logs in for the first time and `seedDefaultCategories` is called
- **THEN** the local `categories` table SHALL contain 9 parent categories and their children

#### Scenario: Re-seeding is a no-op

- **WHEN** `seedDefaultCategories` is called a second time for the same user
- **THEN** no new rows SHALL be inserted


<!-- @trace
source: local-first-sqlite
updated: 2026-04-04
code:
  - src/lib/categories.ts
  - src/theme/index.ts
  - src/screens/projects/CreateProjectModal.tsx
  - src/lib/accounts.ts
  - src/lib/projects.ts
  - src/navigation/MainTabNavigator.tsx
  - App.tsx
  - src/lib/debts.ts
  - src/lib/reconciliation.ts
  - src/screens/accounts/AccountsScreen.tsx
  - src/lib/db.ts
  - src/lib/recurring.ts
  - src/lib/seedCategories.ts
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/screens/LedgerScreen.tsx
  - src/lib/rewards.ts
  - src/screens/MoreScreen.tsx
  - src/lib/contacts.ts
  - src/lib/transactions.ts
  - src/lib/reports.ts
  - src/screens/HomeScreen.tsx
  - package.json
  - src/screens/creditcards/ReconciliationScreen.tsx
-->

---
### Requirement: Supabase client used only for auth and friend sync

The `supabase` client from `src/lib/supabase.ts` SHALL only be used in: `auth.ts`, `friends.ts`, and `reconciliation.ts` (for Gemini OCR call only — no Supabase Storage upload). Any usage of `supabase.from(...)` for personal tables SHALL be removed.

#### Scenario: Supabase tables for personal data do not need to exist

- **WHEN** the app runs without any personal tables in Supabase (no `accounts`, `transactions`, etc.)
- **THEN** the app SHALL function normally for all personal data operations


<!-- @trace
source: local-first-sqlite
updated: 2026-04-04
code:
  - src/lib/categories.ts
  - src/theme/index.ts
  - src/screens/projects/CreateProjectModal.tsx
  - src/lib/accounts.ts
  - src/lib/projects.ts
  - src/navigation/MainTabNavigator.tsx
  - App.tsx
  - src/lib/debts.ts
  - src/lib/reconciliation.ts
  - src/screens/accounts/AccountsScreen.tsx
  - src/lib/db.ts
  - src/lib/recurring.ts
  - src/lib/seedCategories.ts
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/screens/LedgerScreen.tsx
  - src/lib/rewards.ts
  - src/screens/MoreScreen.tsx
  - src/lib/contacts.ts
  - src/lib/transactions.ts
  - src/lib/reports.ts
  - src/screens/HomeScreen.tsx
  - package.json
  - src/screens/creditcards/ReconciliationScreen.tsx
-->

---
### Requirement: exchange_rates stored locally

Exchange rates SHALL be stored in the local SQLite `exchange_rates` table. `fetchExchangeRates(userId)` SHALL query SQLite. `upsertExchangeRate(userId, currency, rate)` SHALL insert or replace in SQLite.

#### Scenario: Save and retrieve exchange rate

- **WHEN** `upsertExchangeRate(userId, 'USD', 32.5)` is called and then `fetchExchangeRates(userId)` is called
- **THEN** the returned rates record SHALL include `{ USD: 32.5 }`

<!-- @trace
source: local-first-sqlite
updated: 2026-04-04
code:
  - src/lib/categories.ts
  - src/theme/index.ts
  - src/screens/projects/CreateProjectModal.tsx
  - src/lib/accounts.ts
  - src/lib/projects.ts
  - src/navigation/MainTabNavigator.tsx
  - App.tsx
  - src/lib/debts.ts
  - src/lib/reconciliation.ts
  - src/screens/accounts/AccountsScreen.tsx
  - src/lib/db.ts
  - src/lib/recurring.ts
  - src/lib/seedCategories.ts
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/screens/LedgerScreen.tsx
  - src/lib/rewards.ts
  - src/screens/MoreScreen.tsx
  - src/lib/contacts.ts
  - src/lib/transactions.ts
  - src/lib/reports.ts
  - src/screens/HomeScreen.tsx
  - package.json
  - src/screens/creditcards/ReconciliationScreen.tsx
-->