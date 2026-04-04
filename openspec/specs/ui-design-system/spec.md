# ui-design-system Specification

## Purpose

TBD - created by archiving change 'ui-visual-polish'. Update Purpose after archive.

## Requirements

### Requirement: Icon system uses lucide-react-native exclusively

The app SHALL use `lucide-react-native` as the sole icon library. Emoji characters and Unicode text symbols SHALL NOT be used as UI icons.

#### Scenario: Pending item icons render as SVG

- **WHEN** the HomeScreen displays pending items (unreconciled bills, outstanding debts, overdue templates)
- **THEN** each row SHALL render a Lucide SVG icon (CreditCard, Handshake, RefreshCw respectively) instead of an emoji character

#### Scenario: Header action button renders as SVG icon

- **WHEN** a screen header contains a refresh or action button
- **THEN** it SHALL render a Lucide SVG icon instead of a Unicode text character (e.g., ↻)


<!-- @trace
source: ui-visual-polish
updated: 2026-04-04
code:
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/lib/db.ts
  - src/lib/recurring.ts
  - src/screens/LedgerScreen.tsx
  - src/lib/accounts.ts
  - src/screens/creditcards/ReconciliationScreen.tsx
  - App.tsx
  - src/lib/seedCategories.ts
  - src/screens/HomeScreen.tsx
  - src/screens/projects/CreateProjectModal.tsx
  - package.json
  - src/lib/contacts.ts
  - src/screens/accounts/AccountsScreen.tsx
  - src/lib/reconciliation.ts
  - src/lib/reports.ts
  - src/lib/transactions.ts
  - src/lib/debts.ts
  - src/theme/index.ts
  - src/screens/MoreScreen.tsx
  - src/lib/categories.ts
  - src/lib/rewards.ts
  - src/lib/projects.ts
-->

---
### Requirement: Tab bar displays icon above label

The bottom tab bar SHALL display a Lucide icon above the text label for each tab. The tab bar SHALL NOT display label-only tabs (text without an accompanying icon).

#### Scenario: Focused tab highlights both icon and label

- **WHEN** a tab is focused
- **THEN** both the icon and label SHALL use `colors.primary`

#### Scenario: Unfocused tab uses muted color

- **WHEN** a tab is not focused
- **THEN** both the icon and label SHALL use `colors.textSecondary`

#### Scenario: Center add button renders Plus icon

- **WHEN** the center FAB tab is displayed
- **THEN** it SHALL render a Lucide `Plus` icon inside the circular button


<!-- @trace
source: ui-visual-polish
updated: 2026-04-04
code:
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/lib/db.ts
  - src/lib/recurring.ts
  - src/screens/LedgerScreen.tsx
  - src/lib/accounts.ts
  - src/screens/creditcards/ReconciliationScreen.tsx
  - App.tsx
  - src/lib/seedCategories.ts
  - src/screens/HomeScreen.tsx
  - src/screens/projects/CreateProjectModal.tsx
  - package.json
  - src/lib/contacts.ts
  - src/screens/accounts/AccountsScreen.tsx
  - src/lib/reconciliation.ts
  - src/lib/reports.ts
  - src/lib/transactions.ts
  - src/lib/debts.ts
  - src/theme/index.ts
  - src/screens/MoreScreen.tsx
  - src/lib/categories.ts
  - src/lib/rewards.ts
  - src/lib/projects.ts
-->

---
### Requirement: Theme exposes shadow tokens

`src/theme/index.ts` SHALL export a `shadows` object with three levels: `sm`, `md`, and `lg`. Each level SHALL include both iOS shadow props (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`) and the Android `elevation` prop.

#### Scenario: Card uses shadow instead of border

- **WHEN** a card component applies `shadows.sm`
- **THEN** the card SHALL appear elevated with a subtle drop shadow and SHALL NOT use `borderWidth: 1` for depth indication

#### Scenario: FAB uses large shadow level

- **WHEN** the center add FAB is rendered
- **THEN** it SHALL apply `shadows.lg` for maximum elevation prominence


<!-- @trace
source: ui-visual-polish
updated: 2026-04-04
code:
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/lib/db.ts
  - src/lib/recurring.ts
  - src/screens/LedgerScreen.tsx
  - src/lib/accounts.ts
  - src/screens/creditcards/ReconciliationScreen.tsx
  - App.tsx
  - src/lib/seedCategories.ts
  - src/screens/HomeScreen.tsx
  - src/screens/projects/CreateProjectModal.tsx
  - package.json
  - src/lib/contacts.ts
  - src/screens/accounts/AccountsScreen.tsx
  - src/lib/reconciliation.ts
  - src/lib/reports.ts
  - src/lib/transactions.ts
  - src/lib/debts.ts
  - src/theme/index.ts
  - src/screens/MoreScreen.tsx
  - src/lib/categories.ts
  - src/lib/rewards.ts
  - src/lib/projects.ts
-->

---
### Requirement: Net Worth Card uses gradient background

The Net Worth Card on HomeScreen SHALL use a linear gradient background from `colors.primary` to `colors.primaryDark` instead of a flat solid color.

#### Scenario: Gradient renders on iOS and Android

- **WHEN** HomeScreen loads and net worth data is available
- **THEN** the Net Worth Card SHALL display a gradient background using `expo-linear-gradient` with `start={{ x: 0, y: 0 }}` and `end={{ x: 1, y: 1 }}`


<!-- @trace
source: ui-visual-polish
updated: 2026-04-04
code:
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/lib/db.ts
  - src/lib/recurring.ts
  - src/screens/LedgerScreen.tsx
  - src/lib/accounts.ts
  - src/screens/creditcards/ReconciliationScreen.tsx
  - App.tsx
  - src/lib/seedCategories.ts
  - src/screens/HomeScreen.tsx
  - src/screens/projects/CreateProjectModal.tsx
  - package.json
  - src/lib/contacts.ts
  - src/screens/accounts/AccountsScreen.tsx
  - src/lib/reconciliation.ts
  - src/lib/reports.ts
  - src/lib/transactions.ts
  - src/lib/debts.ts
  - src/theme/index.ts
  - src/screens/MoreScreen.tsx
  - src/lib/categories.ts
  - src/lib/rewards.ts
  - src/lib/projects.ts
-->

---
### Requirement: Monthly spend amount uses neutral text color

The monthly spend amount on HomeScreen SHALL use `colors.text` (neutral dark). Only the spend difference indicator (↑/↓ percentage) SHALL use `colors.income` or `colors.expense` to show directional change.

#### Scenario: Spend amount is neutral regardless of value

- **WHEN** HomeScreen displays the current month's spending total
- **THEN** the amount text SHALL render in `colors.text`, not `colors.expense`

#### Scenario: Diff indicator uses directional color

- **WHEN** month-over-month spend comparison is available
- **THEN** the percentage diff text SHALL render in `colors.expense` if spending increased, `colors.income` if decreased


<!-- @trace
source: ui-visual-polish
updated: 2026-04-04
code:
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/lib/db.ts
  - src/lib/recurring.ts
  - src/screens/LedgerScreen.tsx
  - src/lib/accounts.ts
  - src/screens/creditcards/ReconciliationScreen.tsx
  - App.tsx
  - src/lib/seedCategories.ts
  - src/screens/HomeScreen.tsx
  - src/screens/projects/CreateProjectModal.tsx
  - package.json
  - src/lib/contacts.ts
  - src/screens/accounts/AccountsScreen.tsx
  - src/lib/reconciliation.ts
  - src/lib/reports.ts
  - src/lib/transactions.ts
  - src/lib/debts.ts
  - src/theme/index.ts
  - src/screens/MoreScreen.tsx
  - src/lib/categories.ts
  - src/lib/rewards.ts
  - src/lib/projects.ts
-->

---
### Requirement: Small icon buttons meet minimum touch target

All `TouchableOpacity` components wrapping an icon with a visible size below 44×44 logical pixels SHALL include a `hitSlop` prop that expands the touch area to at least 44×44px.

#### Scenario: Refresh button is tappable beyond visible bounds

- **WHEN** the user taps near (but not directly on) the refresh icon in the HomeScreen header
- **THEN** the tap SHALL register as a press on the button

<!-- @trace
source: ui-visual-polish
updated: 2026-04-04
code:
  - src/screens/settings/CategorySettingsScreen.tsx
  - src/navigation/MainTabNavigator.tsx
  - src/lib/db.ts
  - src/lib/recurring.ts
  - src/screens/LedgerScreen.tsx
  - src/lib/accounts.ts
  - src/screens/creditcards/ReconciliationScreen.tsx
  - App.tsx
  - src/lib/seedCategories.ts
  - src/screens/HomeScreen.tsx
  - src/screens/projects/CreateProjectModal.tsx
  - package.json
  - src/lib/contacts.ts
  - src/screens/accounts/AccountsScreen.tsx
  - src/lib/reconciliation.ts
  - src/lib/reports.ts
  - src/lib/transactions.ts
  - src/lib/debts.ts
  - src/theme/index.ts
  - src/screens/MoreScreen.tsx
  - src/lib/categories.ts
  - src/lib/rewards.ts
  - src/lib/projects.ts
-->