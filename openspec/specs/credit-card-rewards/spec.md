# credit-card-rewards Specification

## Purpose

TBD - created by archiving change 'ios-accounting-app'. Update Purpose after archive.

## Requirements

### Requirement: Per-card reward rule configuration

The system SHALL allow the user to configure reward rules for each credit card account. Each rule SHALL specify: category or specific merchant (required), reward rate as a percentage (required), reward type (cashback-offset / points / account-deposit, required), monthly earning cap in reward units (optional), and minimum single-transaction spend threshold (optional).

#### Scenario: Category-based reward rule

- **WHEN** user sets a rule "Food & Drink → 3% cashback-offset, cap 200 TWD/month"
- **THEN** the system SHALL apply this rule to all transactions in Food & Drink charged to that card

#### Scenario: Merchant-specific rule overrides category rule

- **WHEN** a transaction matches both a merchant-specific rule and a category rule on the same card
- **THEN** the system SHALL apply only the merchant-specific rule (higher specificity wins)

#### Scenario: Rule with minimum spend threshold not met

- **WHEN** a transaction amount is below the rule's minimum single-transaction threshold
- **THEN** the system SHALL award zero reward for that transaction and display a note that the threshold was not met

---
### Requirement: Per-transaction reward preview

The system SHALL calculate and display the estimated reward for each transaction charged to a credit card at the time of entry and on the transaction detail screen.

#### Scenario: Transaction reward calculation within cap

- **WHEN** user records a 500 TWD restaurant transaction on a card with a 3% Food & Drink rule and the monthly cap has not been reached
- **THEN** the system SHALL display estimated reward as 15 TWD cashback

#### Scenario: Transaction reward calculation when monthly cap is reached

- **WHEN** the monthly accumulated reward for a category has already reached the cap
- **THEN** the system SHALL display estimated reward as 0 for new transactions in that category and show a "cap reached" indicator

---
### Requirement: Reward types

The system SHALL handle three reward types differently:

- **Cashback-offset**: Accumulated TWD value; applied as a deduction to the credit card bill during reconciliation
- **Points**: Accumulated integer points; user configures a TWD-per-point conversion rate for display purposes only (no automatic redemption)
- **Account-deposit**: Accumulated TWD value; when the user records the actual deposit received, the system SHALL create an income transaction to the designated account

#### Scenario: Points with conversion rate

- **WHEN** user sets 1 point = 0.5 TWD on a card
- **THEN** the system SHALL display point balances alongside their TWD equivalent in the rewards summary

#### Scenario: Record account-deposit reward received

- **WHEN** user marks an account-deposit reward as received for amount X TWD
- **THEN** the system SHALL create an income transaction of X TWD to the designated account and reset the pending deposit balance to zero

---
### Requirement: Monthly reward summary per card

The system SHALL display a per-card monthly reward summary showing: total estimated reward by type, accumulated vs. cap for each capped rule, and year-to-date totals.

#### Scenario: View monthly reward summary

- **WHEN** user opens the reward summary for a credit card
- **THEN** the system SHALL display the current month's earned cashback, points, and pending account-deposit amounts, each broken down by rule

---
### Requirement: Reward rule editor fully in Traditional Chinese

The CreateRewardRuleModal and reward rule editor screens SHALL use Traditional Chinese for all labels, placeholders, and section headings. No English-language labels SHALL appear in the reward rule UI.

The field labels SHALL be:
- 回饋分類或商家：（分類名稱或關鍵字）
- 備註關鍵字：（選填）
- 最低消費門檻：（選填，數字）
- 回饋比例：（百分比，例如 3）
- 回饋類型：（現金回饋 / 點數 / 存入帳戶）
- 每月上限：（選填，回饋單位數量）

#### Scenario: No English text in reward rule editor

- **WHEN** the user opens the reward rule creation modal on a credit card
- **THEN** all visible labels, placeholders, and buttons SHALL be in Traditional Chinese with no English text

#### Scenario: Reward type shown in Chinese

- **WHEN** the user taps the reward type selector
- **THEN** the options SHALL display as "現金回饋抵扣" / "點數累積" / "存入指定帳戶" with no English option names


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
### Requirement: Reward rule editor uses labeled section layout

The reward rule editor SHALL use a labeled-section layout consistent with the rest of the settings screens: each field is a row with a left-side label and a right-side input or picker, separated by a light divider. The layout SHALL NOT use raw TextInput with English placeholder-as-label.

#### Scenario: Category keyword field uses label + input row

- **WHEN** the user views the reward rule editor
- **THEN** the category keyword field SHALL appear as a row: label "回饋分類或商家" on the left, text input on the right

#### Scenario: Minimum spend threshold accepts numeric input

- **WHEN** the user taps the "最低消費門檻" row
- **THEN** a numeric keyboard SHALL appear and the entered value SHALL be used as the minimum single-transaction amount

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