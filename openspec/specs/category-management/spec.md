# category-management Specification

## Purpose

TBD - created by archiving change 'ios-accounting-app'. Update Purpose after archive.

## Requirements

### Requirement: Two-level category hierarchy

The system SHALL support categories with exactly two levels: parent category and subcategory. A transaction SHALL be assignable to a parent category directly or to a specific subcategory under a parent.

#### Scenario: Assign transaction to parent category only

- **WHEN** user selects a parent category and no subcategory when recording a transaction
- **THEN** the system SHALL save the transaction under the parent category with no subcategory

#### Scenario: Assign transaction to subcategory

- **WHEN** user selects a parent category and then a subcategory
- **THEN** the system SHALL save the transaction linked to both the parent and subcategory

---
### Requirement: Default preset categories

The system SHALL provide a set of default parent categories and subcategories on first launch. Default categories SHALL include at minimum: Food & Drink (breakfast, lunch, dinner, cafe, drinks), Transportation (public transit, taxi/rideshare, fuel, parking), Shopping (clothing, electronics, groceries), Entertainment (movies, games, subscriptions), Health (pharmacy, clinic, gym), Housing (rent, utilities, maintenance), Travel, Education, and Other.

#### Scenario: First app launch

- **WHEN** user opens the app for the first time
- **THEN** the system SHALL populate the category list with all default categories and subcategories

---
### Requirement: Create custom category

The system SHALL allow the user to create a new parent category or add a subcategory under any existing parent. Each category SHALL have a name (required) and an icon/emoji (optional).

#### Scenario: Create a new parent category

- **WHEN** user submits a new parent category with a unique name
- **THEN** the system SHALL create the category and make it available in the transaction form

#### Scenario: Create a duplicate category name

- **WHEN** user submits a new category whose name already exists at the same level under the same parent
- **THEN** the system SHALL reject the submission and display a validation error

---
### Requirement: Edit and delete categories

The system SHALL allow the user to rename any category. The system SHALL allow deletion of a category only if no transactions are assigned to it.

#### Scenario: Delete a category with no transactions

- **WHEN** user deletes a category that has zero assigned transactions
- **THEN** the system SHALL remove the category

#### Scenario: Delete a category with existing transactions

- **WHEN** user attempts to delete a category that has one or more assigned transactions
- **THEN** the system SHALL prevent deletion and prompt the user to reassign transactions first

---
### Requirement: Uniform category icon button size

All category icon buttons in the CategoryManagementScreen icon grid and in the icon picker modal SHALL use a uniform touchable area of 52×52 pt and an icon container of 40×40 pt. No icon button SHALL deviate from these dimensions regardless of the icon content.

#### Scenario: All icon buttons equal size in grid

- **WHEN** the user views the category icon grid in CategoryManagementScreen
- **THEN** every icon button SHALL have identical width and height, with no visible size differences between buttons

#### Scenario: Icon picker modal uses same size

- **WHEN** the user opens the icon picker modal to choose a category icon
- **THEN** all icon options SHALL be rendered at the same 52×52 touchable / 40×40 container dimensions


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
### Requirement: Icon picker renders actual icons not strings

The icon picker modal SHALL render each icon option as an actual rendered icon using the `CategoryIcon` component. Icon name strings (e.g., "ShoppingCart", "Bus") SHALL NOT be displayed as text in the picker.

#### Scenario: Icon picker shows visual icons

- **WHEN** the user opens the icon picker to change a category's icon
- **THEN** each option SHALL appear as a rendered icon graphic, not as a text string of the icon name


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
### Requirement: Enlarged expand/collapse chevron

The expand/collapse control for parent categories in CategoryManagementScreen SHALL use `ChevronDown` / `ChevronRight` icons from lucide-react-native at size 20 pt. No arrow emoji or icon smaller than 20 pt SHALL be used.

#### Scenario: Chevron visible and tappable

- **WHEN** the user views the category list with a collapsed parent category
- **THEN** a ChevronRight icon at size 20 SHALL be visible at the left of the parent row, and tapping it SHALL expand the subcategory list

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