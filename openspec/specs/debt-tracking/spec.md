# debt-tracking Specification

## Purpose

TBD - created by archiving change 'ios-accounting-app'. Update Purpose after archive.

## Requirements

### Requirement: Liability record (others paid for me)

When a transaction is recorded with payer type "paid-by-other", the system SHALL automatically create a liability record linking the transaction to the selected contact for the full transaction amount. The liability SHALL be in the same currency as the transaction.

#### Scenario: Create liability from transaction

- **WHEN** user records a 500 TWD expense with payer type "paid-by-other" and contact "boyfriend"
- **THEN** the system SHALL create one expense transaction (counts against budget) and one liability of 500 TWD owed to "boyfriend"; account balances SHALL NOT change

#### Scenario: View total owed to a contact

- **WHEN** user views the debt summary for "boyfriend"
- **THEN** the system SHALL display the sum of all outstanding liability amounts owed to that contact

---
### Requirement: Receivable record (I paid for others)

When a transaction is recorded with payer type "paid-for-other", the system SHALL automatically create a receivable record linking the cash outflow to the selected contact. No expense is recorded against any project or category budget.

#### Scenario: Create receivable from transaction

- **WHEN** user records a 300 TWD payment with payer type "paid-for-other" and contact "colleague"
- **THEN** the system SHALL create one cash outflow from the selected account and one receivable of 300 TWD owed by "colleague"; no budget category is affected

---
### Requirement: Record repayment

The system SHALL allow the user to record a repayment against an outstanding liability or receivable. A repayment SHALL specify: contact, amount, date, and source/destination account. Partial repayments SHALL be supported; a debt record is marked settled only when its total repaid amount equals its original amount.

#### Scenario: Full repayment of a liability

- **WHEN** user records a repayment of the full outstanding amount owed to a contact
- **THEN** the system SHALL create a cash outflow transaction from the specified account, reduce the liability balance to zero, and mark the liability as settled

#### Scenario: Partial repayment

- **WHEN** user records a repayment less than the outstanding liability amount
- **THEN** the system SHALL reduce the liability balance by the repaid amount and keep the record as outstanding

#### Scenario: Repayment amount exceeds outstanding balance

- **WHEN** user enters a repayment amount greater than the remaining outstanding balance
- **THEN** the system SHALL reject the submission and display a validation error

---
### Requirement: Debt tracking view

The system SHALL provide a 借還款追蹤 screen showing: per-contact/payer-name summary of net balance (positive = they owe me, negative = I owe them), list of all outstanding individual debt records per party, and history of settled debt records. Parties identified only by `payer_name` (no saved contact) SHALL be grouped by their free-text name.

#### Scenario: Net balance across multiple debts

- **WHEN** user has two liabilities of 200 TWD and 300 TWD owed to "boyfriend" and one receivable of 100 TWD from "boyfriend"
- **THEN** the system SHALL display net balance as -400 TWD (I owe boyfriend 400 TWD)

#### Scenario: Free-text party grouped separately

- **WHEN** the user has two paid-by-other records with `payer_name = "室友小明"` and no saved contact
- **THEN** the screen SHALL show a single group for "室友小明" with both records listed


<!-- @trace
source: ui-comprehensive-redesign
updated: 2026-04-05
code:
  - src/screens/transactions/TransactionSearchScreen.tsx
  - src/navigation/LedgerStackNavigator.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/screens/accounts/CreateAccountModal.tsx
  - .spectra.yaml
  - src/screens/HomeScreen.tsx
  - src/screens/creditcards/CreateRewardRuleModal.tsx
  - src/screens/debt/DebtTrackingScreen.tsx
  - src/screens/settings/CategorySettingsScreen.tsx
  - supabase/migrations/006_payer_name.sql
  - src/components/CategoryIconButton.tsx
  - src/screens/AssetsScreen.tsx
  - src/screens/settings/CreateRecurringModal.tsx
  - src/screens/settings/EditRecurringModal.tsx
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/screens/accounts/ExchangeRateModal.tsx
  - src/screens/transactions/EditTransactionSheet.tsx
  - src/lib/debts.ts
  - src/navigation/MoreStackNavigator.tsx
  - src/screens/LedgerScreen.tsx
  - src/components/PayerContactPicker.tsx
  - src/lib/transactions.ts
  - src/types/database.ts
  - src/screens/MoreScreen.tsx
-->

---
### Requirement: Disputed debt record

The system SHALL allow the user to flag any debt record as disputed. Disputed records SHALL remain in the outstanding list but SHALL be visually distinguished. A disputed flag SHALL not affect balance calculations.

#### Scenario: Flag a debt as disputed

- **WHEN** user marks a liability as disputed
- **THEN** the system SHALL display a dispute indicator on the record and retain it in the outstanding balance calculation

---
### Requirement: Screen renamed to 借還款追蹤

The debt tracking screen title and all navigation labels referring to this screen SHALL use "借還款追蹤". The term "負債追蹤" SHALL NOT appear in any visible UI label.

#### Scenario: Screen title is 借還款追蹤

- **WHEN** the user navigates to the debt tracking screen
- **THEN** the screen title SHALL display "借還款追蹤"

#### Scenario: More screen menu label updated

- **WHEN** the user views the More tab menu
- **THEN** the menu item for debt tracking SHALL be labelled "借還款追蹤" not "負債追蹤"


<!-- @trace
source: ui-comprehensive-redesign
updated: 2026-04-05
code:
  - src/screens/transactions/TransactionSearchScreen.tsx
  - src/navigation/LedgerStackNavigator.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/screens/accounts/CreateAccountModal.tsx
  - .spectra.yaml
  - src/screens/HomeScreen.tsx
  - src/screens/creditcards/CreateRewardRuleModal.tsx
  - src/screens/debt/DebtTrackingScreen.tsx
  - src/screens/settings/CategorySettingsScreen.tsx
  - supabase/migrations/006_payer_name.sql
  - src/components/CategoryIconButton.tsx
  - src/screens/AssetsScreen.tsx
  - src/screens/settings/CreateRecurringModal.tsx
  - src/screens/settings/EditRecurringModal.tsx
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/screens/accounts/ExchangeRateModal.tsx
  - src/screens/transactions/EditTransactionSheet.tsx
  - src/lib/debts.ts
  - src/navigation/MoreStackNavigator.tsx
  - src/screens/LedgerScreen.tsx
  - src/components/PayerContactPicker.tsx
  - src/lib/transactions.ts
  - src/types/database.ts
  - src/screens/MoreScreen.tsx
-->

---
### Requirement: Paid-by-other and paid-for-other transactions visible in tracker

Transactions recorded with `payer_type = paid_by_other` or `payer_type = paid_for_other` SHALL appear in the 借還款追蹤 screen. Each such transaction SHALL generate a debt record that is displayed in the tracker with the payer/payee name (from `contact_id` or `payer_name`), amount, and date.

#### Scenario: Paid-by-other transaction appears in tracker

- **WHEN** a user records a transaction with payer type "別人付" (paid_by_other) with payer name "室友"
- **THEN** the 借還款追蹤 screen SHALL show a liability entry for "室友" with the transaction amount

#### Scenario: Paid-for-other transaction appears in tracker

- **WHEN** a user records a transaction with payer type "幫人付" (paid_for_other) with contact "同事"
- **THEN** the 借還款追蹤 screen SHALL show a receivable entry for "同事" with the transaction amount

#### Scenario: Free-text payer name shown in tracker

- **WHEN** a debt record was created from a transaction with `payer_name = "室友小明"` and `contact_id = null`
- **THEN** the 借還款追蹤 screen SHALL display "室友小明" as the party name for that record

<!-- @trace
source: ui-comprehensive-redesign
updated: 2026-04-05
code:
  - src/screens/transactions/TransactionSearchScreen.tsx
  - src/navigation/LedgerStackNavigator.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/screens/accounts/CreateAccountModal.tsx
  - .spectra.yaml
  - src/screens/HomeScreen.tsx
  - src/screens/creditcards/CreateRewardRuleModal.tsx
  - src/screens/debt/DebtTrackingScreen.tsx
  - src/screens/settings/CategorySettingsScreen.tsx
  - supabase/migrations/006_payer_name.sql
  - src/components/CategoryIconButton.tsx
  - src/screens/AssetsScreen.tsx
  - src/screens/settings/CreateRecurringModal.tsx
  - src/screens/settings/EditRecurringModal.tsx
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/screens/accounts/ExchangeRateModal.tsx
  - src/screens/transactions/EditTransactionSheet.tsx
  - src/lib/debts.ts
  - src/navigation/MoreStackNavigator.tsx
  - src/screens/LedgerScreen.tsx
  - src/components/PayerContactPicker.tsx
  - src/lib/transactions.ts
  - src/types/database.ts
  - src/screens/MoreScreen.tsx
-->