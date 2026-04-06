# ledger-transaction-link Specification

## Purpose

TBD - created by archiving change 'shared-ledger'. Update Purpose after archive.

## Requirements

### Requirement: Transaction ledger association

The `transactions` table SHALL have a nullable `ledger_id TEXT REFERENCES ledgers(id) ON DELETE SET NULL` column added via migration `004_ledgers`. A `NULL` value for `ledger_id` MUST be treated as belonging to the user's personal ledger in all query and display logic.

#### Scenario: New column added without breaking existing rows

- **WHEN** migration `004_ledgers` runs on a database with existing transactions
- **THEN** all existing transactions have `ledger_id = NULL` and the app treats them as personal ledger transactions


<!-- @trace
source: shared-ledger
updated: 2026-04-06
code:
  - src/screens/ledgers/LedgersScreen.tsx
  - src/lib/db.ts
  - src/screens/accounts/CreateAccountModal.tsx
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/screens/settings/CategorySettingsScreen.tsx
  - App.tsx
  - src/screens/creditcards/CreateRewardRuleModal.tsx
  - src/screens/ledgers/LedgerDetailScreen.tsx
  - src/screens/settings/EditRecurringModal.tsx
  - src/screens/HomeScreen.tsx
  - src/lib/debts.ts
  - src/screens/ledgers/LedgerMembersScreen.tsx
  - src/navigation/LedgerStackNavigator.tsx
  - .spectra.yaml
  - src/screens/settings/CreateRecurringModal.tsx
  - src/screens/LedgerScreen.tsx
  - src/screens/ledgers/CreateLedgerModal.tsx
  - src/navigation/MoreStackNavigator.tsx
  - src/screens/transactions/EditTransactionSheet.tsx
  - src/screens/accounts/ExchangeRateModal.tsx
  - src/screens/MoreScreen.tsx
  - src/lib/transactions.ts
  - src/screens/AssetsScreen.tsx
  - src/types/database.ts
  - src/components/CategoryIconButton.tsx
  - src/screens/transactions/TransactionSearchScreen.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/screens/debt/DebtTrackingScreen.tsx
  - supabase/migrations/006_payer_name.sql
  - src/lib/reconciliation.ts
  - src/lib/ledgers.ts
  - src/components/PayerContactPicker.tsx
  - src/screens/creditcards/ReconciliationScreen.tsx
-->

---
### Requirement: Default ledger on create

When `createTransaction` is called without a `ledgerId`, the system SHALL default to `NULL` (personal ledger). When called with a `ledgerId`, the system SHALL store that value in `transactions.ledger_id`.

#### Scenario: Transaction created without ledger selection

- **WHEN** user saves a transaction without choosing a ledger
- **THEN** the transaction is stored with `ledger_id = NULL`

#### Scenario: Transaction created with shared ledger selected

- **WHEN** user saves a transaction with a shared ledger selected
- **THEN** the transaction is stored with `ledger_id` set to the selected ledger's ID


<!-- @trace
source: shared-ledger
updated: 2026-04-06
code:
  - src/screens/ledgers/LedgersScreen.tsx
  - src/lib/db.ts
  - src/screens/accounts/CreateAccountModal.tsx
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/screens/settings/CategorySettingsScreen.tsx
  - App.tsx
  - src/screens/creditcards/CreateRewardRuleModal.tsx
  - src/screens/ledgers/LedgerDetailScreen.tsx
  - src/screens/settings/EditRecurringModal.tsx
  - src/screens/HomeScreen.tsx
  - src/lib/debts.ts
  - src/screens/ledgers/LedgerMembersScreen.tsx
  - src/navigation/LedgerStackNavigator.tsx
  - .spectra.yaml
  - src/screens/settings/CreateRecurringModal.tsx
  - src/screens/LedgerScreen.tsx
  - src/screens/ledgers/CreateLedgerModal.tsx
  - src/navigation/MoreStackNavigator.tsx
  - src/screens/transactions/EditTransactionSheet.tsx
  - src/screens/accounts/ExchangeRateModal.tsx
  - src/screens/MoreScreen.tsx
  - src/lib/transactions.ts
  - src/screens/AssetsScreen.tsx
  - src/types/database.ts
  - src/components/CategoryIconButton.tsx
  - src/screens/transactions/TransactionSearchScreen.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/screens/debt/DebtTrackingScreen.tsx
  - supabase/migrations/006_payer_name.sql
  - src/lib/reconciliation.ts
  - src/lib/ledgers.ts
  - src/components/PayerContactPicker.tsx
  - src/screens/creditcards/ReconciliationScreen.tsx
-->

---
### Requirement: Fetch transactions by ledger

`fetchTransactionsForMonth(userId, year, month, ledgerId?)` SHALL accept an optional `ledgerId`. When `ledgerId` is `null` or omitted, the query SHALL return only transactions where `ledger_id IS NULL` (personal ledger). When `ledgerId` is a specific ledger ID, the query SHALL return all transactions with that `ledger_id`.

#### Scenario: Personal ledger view shows personal transactions

- **WHEN** `fetchTransactionsForMonth(userId, year, month)` is called without ledgerId
- **THEN** only transactions with `ledger_id IS NULL` are returned

#### Scenario: Shared ledger view shows shared transactions

- **WHEN** `fetchTransactionsForMonth(userId, year, month, sharedLedgerId)` is called
- **THEN** only transactions with `ledger_id = sharedLedgerId` are returned


<!-- @trace
source: shared-ledger
updated: 2026-04-06
code:
  - src/screens/ledgers/LedgersScreen.tsx
  - src/lib/db.ts
  - src/screens/accounts/CreateAccountModal.tsx
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/screens/settings/CategorySettingsScreen.tsx
  - App.tsx
  - src/screens/creditcards/CreateRewardRuleModal.tsx
  - src/screens/ledgers/LedgerDetailScreen.tsx
  - src/screens/settings/EditRecurringModal.tsx
  - src/screens/HomeScreen.tsx
  - src/lib/debts.ts
  - src/screens/ledgers/LedgerMembersScreen.tsx
  - src/navigation/LedgerStackNavigator.tsx
  - .spectra.yaml
  - src/screens/settings/CreateRecurringModal.tsx
  - src/screens/LedgerScreen.tsx
  - src/screens/ledgers/CreateLedgerModal.tsx
  - src/navigation/MoreStackNavigator.tsx
  - src/screens/transactions/EditTransactionSheet.tsx
  - src/screens/accounts/ExchangeRateModal.tsx
  - src/screens/MoreScreen.tsx
  - src/lib/transactions.ts
  - src/screens/AssetsScreen.tsx
  - src/types/database.ts
  - src/components/CategoryIconButton.tsx
  - src/screens/transactions/TransactionSearchScreen.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/screens/debt/DebtTrackingScreen.tsx
  - supabase/migrations/006_payer_name.sql
  - src/lib/reconciliation.ts
  - src/lib/ledgers.ts
  - src/components/PayerContactPicker.tsx
  - src/screens/creditcards/ReconciliationScreen.tsx
-->

---
### Requirement: Project + ledger co-selection

A transaction SHALL be permitted to have both a `ledger_id` (shared ledger) and a `project_id` (personal budget) set simultaneously. The two fields are independent.

#### Scenario: Transaction linked to both shared ledger and personal project

- **WHEN** user selects both a shared ledger and a personal project while recording a transaction
- **THEN** the transaction is stored with both `ledger_id` and `project_id` set

<!-- @trace
source: shared-ledger
updated: 2026-04-06
code:
  - src/screens/ledgers/LedgersScreen.tsx
  - src/lib/db.ts
  - src/screens/accounts/CreateAccountModal.tsx
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/screens/settings/CategorySettingsScreen.tsx
  - App.tsx
  - src/screens/creditcards/CreateRewardRuleModal.tsx
  - src/screens/ledgers/LedgerDetailScreen.tsx
  - src/screens/settings/EditRecurringModal.tsx
  - src/screens/HomeScreen.tsx
  - src/lib/debts.ts
  - src/screens/ledgers/LedgerMembersScreen.tsx
  - src/navigation/LedgerStackNavigator.tsx
  - .spectra.yaml
  - src/screens/settings/CreateRecurringModal.tsx
  - src/screens/LedgerScreen.tsx
  - src/screens/ledgers/CreateLedgerModal.tsx
  - src/navigation/MoreStackNavigator.tsx
  - src/screens/transactions/EditTransactionSheet.tsx
  - src/screens/accounts/ExchangeRateModal.tsx
  - src/screens/MoreScreen.tsx
  - src/lib/transactions.ts
  - src/screens/AssetsScreen.tsx
  - src/types/database.ts
  - src/components/CategoryIconButton.tsx
  - src/screens/transactions/TransactionSearchScreen.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/screens/debt/DebtTrackingScreen.tsx
  - supabase/migrations/006_payer_name.sql
  - src/lib/reconciliation.ts
  - src/lib/ledgers.ts
  - src/components/PayerContactPicker.tsx
  - src/screens/creditcards/ReconciliationScreen.tsx
-->