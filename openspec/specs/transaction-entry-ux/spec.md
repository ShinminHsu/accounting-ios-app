# transaction-entry-ux Specification

## Purpose

TBD - created by archiving change 'ui-and-ux-fixes'. Update Purpose after archive.

## Requirements

### Requirement: Transaction name field

The transaction entry form SHALL include a `name` text input field (labelled "名稱（選填）") as the first field, above the amount. The field SHALL be optional (nullable). The value SHALL be saved to a `name` column on the `transactions` table and displayed in the transaction detail/edit screen.

#### Scenario: Name saved with transaction

- **WHEN** the user types "早餐" in the name field and saves the transaction
- **THEN** the created transaction record SHALL have `name = "早餐"`

#### Scenario: Name omitted

- **WHEN** the user leaves the name field blank and saves the transaction
- **THEN** the transaction SHALL be saved with `name = null` and no validation error SHALL be shown


<!-- @trace
source: ui-and-ux-fixes
updated: 2026-04-04
code:
  - src/lib/projects.ts
  - src/screens/accounts/AccountsScreen.tsx
  - App.tsx
  - src/screens/MoreScreen.tsx
  - src/screens/creditcards/ReconciliationScreen.tsx
  - src/theme/index.ts
  - src/components/CategoryIcon.tsx
  - src/screens/projects/CreateProjectModal.tsx
  - src/screens/ProjectsScreen.tsx
  - src/lib/db.ts
  - src/lib/reconciliation.ts
  - src/screens/LedgerScreen.tsx
  - src/lib/recurring.ts
  - src/lib/categoryIcons.ts
  - src/lib/reports.ts
  - src/lib/accounts.ts
  - src/lib/seedCategories.ts
  - src/lib/contacts.ts
  - src/types/database.ts
  - src/navigation/MainTabNavigator.tsx
  - src/lib/rewards.ts
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/lib/categories.ts
  - src/screens/HomeScreen.tsx
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/lib/transactions.ts
  - package.json
  - src/lib/debts.ts
-->

---
### Requirement: Working project selector

The project selector in the transaction entry sheet SHALL assign the tapped project to the transaction and close the picker. After a project is selected, the project row in the form SHALL display the selected project's name.

#### Scenario: Select project closes picker and reflects selection

- **WHEN** the user opens the project picker and taps a project row
- **THEN** the picker sheet SHALL close, and the project field in the form SHALL show the selected project's name

#### Scenario: Clear project selection

- **WHEN** the user taps "不指定" (no project) in the picker
- **THEN** `project_id` SHALL be set to `null` and the project field SHALL show a placeholder


<!-- @trace
source: ui-and-ux-fixes
updated: 2026-04-04
code:
  - src/lib/projects.ts
  - src/screens/accounts/AccountsScreen.tsx
  - App.tsx
  - src/screens/MoreScreen.tsx
  - src/screens/creditcards/ReconciliationScreen.tsx
  - src/theme/index.ts
  - src/components/CategoryIcon.tsx
  - src/screens/projects/CreateProjectModal.tsx
  - src/screens/ProjectsScreen.tsx
  - src/lib/db.ts
  - src/lib/reconciliation.ts
  - src/screens/LedgerScreen.tsx
  - src/lib/recurring.ts
  - src/lib/categoryIcons.ts
  - src/lib/reports.ts
  - src/lib/accounts.ts
  - src/lib/seedCategories.ts
  - src/lib/contacts.ts
  - src/types/database.ts
  - src/navigation/MainTabNavigator.tsx
  - src/lib/rewards.ts
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/lib/categories.ts
  - src/screens/HomeScreen.tsx
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/lib/transactions.ts
  - package.json
  - src/lib/debts.ts
-->

---
### Requirement: Optional contact for debt payer types

When `payer_type` is `paid_for_other` or `paid_by_other`, the contact field SHALL be labelled "代付對象（選填）" and SHALL NOT be required. The field SHALL use the payer contact picker (see payer-contact spec) supporting both saved contacts and free-text input. Saving with no selection SHALL succeed with `contact_id = null` and `payer_name = null`.

#### Scenario: Save paid-for-other without contact

- **WHEN** the user sets payer type to "幫人付" and leaves the "代付對象" field blank and taps Save
- **THEN** the transaction SHALL be saved with `contact_id = null` and `payer_name = null` and no error SHALL be shown

#### Scenario: Save paid-by-other without contact

- **WHEN** the user sets payer type to "別人付" and leaves the "代付對象" field blank and taps Save
- **THEN** the transaction SHALL be saved with `contact_id = null` and `payer_name = null` and no error SHALL be shown

#### Scenario: Save paid-by-other with free-text payer name

- **WHEN** the user sets payer type to "別人付" and types "室友小明" in the free-text name field and taps Save
- **THEN** the transaction SHALL be saved with `payer_name = "室友小明"` and `contact_id = null`


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
### Requirement: Category pre-selected in picker

When the category picker opens and a category is already selected, the selected category row SHALL be visually highlighted. Tapping Save in the picker without changing the selection SHALL confirm the existing selection without showing a "請選擇分類" error.

#### Scenario: Re-open picker with existing selection highlighted

- **WHEN** the user has already selected category "餐飲 > 早餐" and opens the category picker again
- **THEN** the "早餐" row SHALL be highlighted as selected when the picker opens

#### Scenario: Confirm existing selection without change

- **WHEN** the category picker opens with a pre-selected category and the user taps Save without changing anything
- **THEN** the original category SHALL remain selected and no error SHALL be shown

<!-- @trace
source: ui-and-ux-fixes
updated: 2026-04-04
code:
  - src/lib/projects.ts
  - src/screens/accounts/AccountsScreen.tsx
  - App.tsx
  - src/screens/MoreScreen.tsx
  - src/screens/creditcards/ReconciliationScreen.tsx
  - src/theme/index.ts
  - src/components/CategoryIcon.tsx
  - src/screens/projects/CreateProjectModal.tsx
  - src/screens/ProjectsScreen.tsx
  - src/lib/db.ts
  - src/lib/reconciliation.ts
  - src/screens/LedgerScreen.tsx
  - src/lib/recurring.ts
  - src/lib/categoryIcons.ts
  - src/lib/reports.ts
  - src/lib/accounts.ts
  - src/lib/seedCategories.ts
  - src/lib/contacts.ts
  - src/types/database.ts
  - src/navigation/MainTabNavigator.tsx
  - src/lib/rewards.ts
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/lib/categories.ts
  - src/screens/HomeScreen.tsx
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/lib/transactions.ts
  - package.json
  - src/lib/debts.ts
-->

---
### Requirement: Two-column amount and name layout

The transaction entry form SHALL display the amount input (currency symbol + number field) in the left 55% of a flex row, and the name field + date pill stacked in the right 45% of the same row. The income/expense toggle SHALL remain above this two-column row.

#### Scenario: Amount and name on same visual row

- **WHEN** the user opens the transaction entry form
- **THEN** the amount input SHALL appear on the left half and the name/date fields SHALL appear on the right half of the same row, with both visible simultaneously without scrolling

#### Scenario: Name field still optional in new layout

- **WHEN** the user leaves the name field blank in the right column and saves
- **THEN** the transaction SHALL be saved with `name = null` and no validation error SHALL be shown


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
### Requirement: Compact payment-method segmented picker

The payer type selector SHALL be rendered as a compact segmented control (three equal-width pills in a single row, height ≤ 36 pt) showing Chinese labels only: 自己付 / 別人付 / 幫人付. Individual large button rows for each payer type SHALL NOT be used.

#### Scenario: Payer type displayed compactly

- **WHEN** the user views the transaction entry form
- **THEN** the three payer options SHALL appear as a single compact row of equal-width pills, not as three separate full-width buttons

#### Scenario: Select payer type from segmented control

- **WHEN** the user taps "別人付" in the segmented control
- **THEN** the payer type SHALL be set to `paid_by_other` and the "代付對象" field SHALL appear below

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