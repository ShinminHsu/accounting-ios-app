# account-management Specification

## Purpose

TBD - created by archiving change 'ios-accounting-app'. Update Purpose after archive.

## Requirements

### Requirement: Supported account types

The system SHALL support the following account types: Cash, Bank Account, E-Payment (e.g., LINE Pay, 街口), Credit Card, and Investment (balance-only, no P&L tracking). Accounts SHALL be classified as either Asset (Cash, Bank Account, E-Payment, Investment) or Liability (Credit Card).

#### Scenario: View accounts overview

- **WHEN** user navigates to the Accounts screen
- **THEN** the system SHALL display all accounts grouped by Asset and Liability, each account's balance in its original currency, and a net worth total converted to TWD using configured exchange rates

---
### Requirement: Manual exchange rate configuration

The system SHALL provide a settings screen where the user can manually set the exchange rate for each supported foreign currency against TWD. Exchange rates SHALL be stored locally and applied at display time. The system SHALL NOT fetch live exchange rates automatically.

#### Scenario: Set exchange rate for USD

- **WHEN** user enters an exchange rate of 32.5 for USD in settings
- **THEN** the system SHALL use 1 USD = 32.5 TWD for all balance conversions until the rate is changed

#### Scenario: No exchange rate configured for a currency

- **WHEN** an account has a currency whose exchange rate has not been set
- **THEN** the system SHALL display the account balance in its original currency and exclude it from the TWD net worth total, with a visible warning indicator

---
### Requirement: Create an account

The system SHALL allow the user to create a new account with: name (required), type (required), initial balance (required, defaults to 0), and currency (required, defaults to TWD). Supported currencies SHALL include at minimum: TWD, USD, JPY, EUR, HKD, CNY.

#### Scenario: Create a bank account

- **WHEN** user submits a new bank account with name and initial balance
- **THEN** the system SHALL create the account and reflect its balance in the accounts overview immediately

#### Scenario: Create a credit card account

- **WHEN** user creates a credit card account
- **THEN** the system SHALL additionally prompt for: statement closing day (1–31), payment due day (1–31), and auto-debit bank account (optional); these settings SHALL be editable later in credit card settings

---
### Requirement: Account balance reflects transactions

The system SHALL maintain each account's balance as: initial balance plus all inflows minus all outflows recorded against that account. Credit card account balance SHALL represent the outstanding amount owed (positive = you owe money).

#### Scenario: Record expense from bank account

- **WHEN** a self-paid transaction is recorded against a bank account
- **THEN** the system SHALL reduce the bank account balance by the transaction amount

#### Scenario: Record expense paid by someone else

- **WHEN** a "paid-by-other" transaction is recorded
- **THEN** the system SHALL NOT change any account balance (expense is tracked in budget but cash has not moved)

---
### Requirement: Edit and delete accounts

The system SHALL allow renaming an account and updating its settings. The system SHALL allow deletion of an account only if it has zero transactions and zero balance.

#### Scenario: Delete account with transactions

- **WHEN** user attempts to delete an account that has one or more transactions
- **THEN** the system SHALL prevent deletion and display an explanation

#### Scenario: Delete empty account

- **WHEN** user deletes an account with no transactions and zero balance
- **THEN** the system SHALL remove the account from the list

---
### Requirement: Add account modal is keyboard-aware

The create-account modal (CreateAccountModal) SHALL wrap its content in a `KeyboardAvoidingView` with `behavior="padding"` on iOS and `behavior="height"` on Android, combined with a `ScrollView` with `keyboardShouldPersistTaps="handled"`. The keyboard SHALL NOT obscure any input field in the modal.

#### Scenario: Account name field visible when keyboard opens

- **WHEN** the user opens the create-account modal and taps the account name field
- **THEN** the keyboard SHALL appear and all form fields SHALL remain visible above the keyboard without being obscured

#### Scenario: Exchange rate input accessible with keyboard open

- **WHEN** the user opens the ExchangeRateModal and taps the exchange rate input field
- **THEN** the keyboard SHALL appear and the rate input field SHALL remain visible above the keyboard


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
### Requirement: Redesigned Assets screen layout

The Assets screen (資產) SHALL display:
1. A header card showing the net asset total in large font with a ±color indicator (green for positive, red for negative), with an eye icon that toggles whether the amount is visible.
2. A 2×2 summary grid card below the header showing: 可支配 (sum of non-credit-card accounts), 負債 (sum of credit card balances as negative), 借出 (total outstanding receivables), 借入 (total outstanding liabilities).
3. A "淨資產趨勢 >" tappable link that navigates to a net worth trend chart.
4. An account list grouped by type (現金帳戶 / 信用帳戶 / 無帳戶). Each group header shows the group name, group total balance, and a ChevronDown/ChevronRight icon to expand/collapse the group. Groups are expanded by default.
5. Each account item shows the account icon, account name, and balance. Credit card accounts additionally show remaining credit and next payment date/amount.

#### Scenario: Net asset total displayed with correct sign color

- **WHEN** the user's net worth is -$1,000
- **THEN** the Assets screen header SHALL display "-$1,000" in red

#### Scenario: Toggle balance visibility

- **WHEN** the user taps the eye icon in the Assets header
- **THEN** the net asset total, all group totals, and all account balances SHALL be replaced with "****" to hide values; tapping again SHALL restore the values

#### Scenario: Collapse account group

- **WHEN** the user taps the ChevronDown on the "現金帳戶" group header
- **THEN** the individual account rows under that group SHALL collapse and the chevron SHALL rotate to ChevronRight

#### Scenario: 2x2 grid shows borrowing figures

- **WHEN** the user has outstanding receivables totalling $500 (借出) and outstanding liabilities totalling $200 (借入)
- **THEN** the summary grid SHALL display $500 in the 借出 cell and $200 in the 借入 cell

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