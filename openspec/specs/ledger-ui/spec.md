# ledger-ui Specification

## Purpose

TBD - created by archiving change 'shared-ledger'. Update Purpose after archive.

## Requirements

### Requirement: Ledger selector in AddTransactionSheet

`AddTransactionSheet` SHALL display a ledger selector field when the user has more than one active ledger. The selector SHALL default to the personal ledger. When a shared ledger is selected, a visual indicator (e.g., people icon) SHALL be shown next to the field.

#### Scenario: Single ledger user sees no selector

- **WHEN** the user has only their personal ledger
- **THEN** no ledger selector field is shown in AddTransactionSheet

#### Scenario: Multi-ledger user sees selector

- **WHEN** the user has at least one active shared ledger
- **THEN** a ledger selector field is shown, defaulting to personal ledger

#### Scenario: Shared ledger selected

- **WHEN** user selects a shared ledger in AddTransactionSheet
- **THEN** the field shows the ledger name with a people icon indicator


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
### Requirement: Ledger list screen

The system SHALL provide a `LedgersScreen` accessible from the main navigation that lists all the user's active ledgers (personal first, then shared). Each row SHALL show the ledger name, member count (for shared), and a chevron to enter the ledger view. A "建立帳本" button SHALL be present to create a new shared ledger.

#### Scenario: Ledger list shows all active ledgers

- **WHEN** user opens LedgersScreen
- **THEN** personal ledger appears first, followed by active shared ledgers with member count

#### Scenario: Create button opens creation form

- **WHEN** user taps "建立帳本"
- **THEN** a form appears for entering ledger name, optional start/end dates, then submits to create the ledger


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
### Requirement: Ledger detail screen

The system SHALL provide a `LedgerDetailScreen` that shows transactions within a specific ledger for the selected month, with the same calendar/list toggle as the main ledger screen. For shared ledgers, a "成員" tab SHALL show a per-member spending summary.

#### Scenario: Personal ledger detail shows personal transactions

- **WHEN** user opens LedgerDetailScreen for their personal ledger
- **THEN** only transactions with `ledger_id IS NULL` are shown

#### Scenario: Shared ledger detail shows member spending

- **WHEN** user opens the "成員" tab in a shared ledger
- **THEN** total spending per member is shown (sum of their transactions in this ledger)


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
### Requirement: Paid-for-other prompt

When a user opens a shared ledger detail, the system SHALL check for transactions in that ledger where `payer_type = 'paid_for_other'` and `contact_id` corresponds to the current user's linked friend. For each such transaction not yet mirrored in the user's personal records, the system SHALL display a prompt card: "XXX 幫你支付了 NT$YYY，要加入個人帳本嗎？" with an "加入" button that creates a `paid_by_other` transaction in the personal ledger.

#### Scenario: Prompt appears for unmirrored paid-for-other transaction

- **WHEN** user opens a shared ledger and a friend has a `paid_for_other` transaction linking to this user
- **THEN** a prompt card is shown with the friend's name, amount, and an "加入" button

#### Scenario: User taps 加入

- **WHEN** user taps "加入" on the prompt card
- **THEN** a new transaction is created in the personal ledger with `payer_type = 'paid_by_other'`, same amount, category, and date; the prompt card is dismissed

#### Scenario: No prompt when already mirrored

- **WHEN** the user has already added the transaction to their personal ledger
- **THEN** no prompt card is shown for that transaction

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