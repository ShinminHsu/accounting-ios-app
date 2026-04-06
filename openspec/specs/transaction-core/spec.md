# transaction-core Specification

## Purpose

TBD - created by archiving change 'ios-accounting-app'. Update Purpose after archive.

## Requirements

### Requirement: Record a transaction

The system SHALL allow the user to create a transaction with the following fields: amount (required), date (required, defaults to today), category (required), subcategory (optional), account (required unless payer type is paid-by-other), ledger (optional, defaults to personal ledger represented as NULL), project (optional), notes (optional), name (optional), and payer type (self / paid-by-other / paid-for-other).

#### Scenario: Record a normal expense

- **WHEN** user submits a transaction with payer type "self"
- **THEN** the system SHALL create one transaction record, deduct the amount from the selected account balance, and count the amount against the selected project/category budget

#### Scenario: Record an expense paid by someone else

- **WHEN** user submits a transaction with payer type "paid-by-other" and selects a contact
- **THEN** the system SHALL create one expense record (counts against budget, does not reduce account balance) and one liability record linked to the contact for the same amount

#### Scenario: Record a payment made for someone else

- **WHEN** user submits a transaction with payer type "paid-for-other" and selects a contact
- **THEN** the system SHALL create one cash outflow record (reduces account balance) and one receivable record linked to the contact; no expense is counted against any budget

#### Scenario: Amount is zero or negative

- **WHEN** user submits a transaction with amount ≤ 0
- **THEN** the system SHALL reject the transaction with error "請輸入有效金額"

#### Scenario: Transaction recorded in shared ledger

- **WHEN** user selects a shared ledger and submits the transaction
- **THEN** the transaction is stored with `ledger_id` set to the shared ledger ID; it appears in the shared ledger view but not in the personal ledger view


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
### Requirement: Edit a transaction

The system SHALL allow the user to edit any field of an existing transaction except payer type after a debt record has been linked.

#### Scenario: Edit amount of a normal transaction

- **WHEN** user changes the amount of an existing self-paid transaction
- **THEN** the system SHALL update the account balance delta and budget impact to reflect the new amount

#### Scenario: Attempt to change payer type after debt is linked

- **WHEN** user attempts to change payer type on a transaction that has a linked liability or receivable record
- **THEN** the system SHALL prevent the change and display an explanation that the debt record must be removed first

---
### Requirement: Delete a transaction

The system SHALL allow the user to delete a transaction. If the transaction has a linked debt record (liability or receivable), both records SHALL be deleted together.

#### Scenario: Delete a transaction with linked debt

- **WHEN** user deletes a transaction that has a linked liability record
- **THEN** the system SHALL delete both the transaction and its linked liability record, and reverse the budget impact

#### Scenario: Delete a normal transaction

- **WHEN** user deletes a self-paid transaction
- **THEN** the system SHALL remove the transaction and reverse the account balance and budget impact

---
### Requirement: View transactions by date

The system SHALL display transactions in a calendar view where each day shows the total spent and a list of individual transactions when tapped.

#### Scenario: Tap a day with transactions

- **WHEN** user taps a day on the calendar that has at least one transaction
- **THEN** the system SHALL display all transactions for that day ordered by time descending

#### Scenario: Tap a day with no transactions

- **WHEN** user taps a day on the calendar with no transactions
- **THEN** the system SHALL display an empty state message