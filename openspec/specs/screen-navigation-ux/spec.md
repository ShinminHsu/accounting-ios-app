# screen-navigation-ux Specification

## Purpose

TBD - created by archiving change 'ui-and-ux-fixes'. Update Purpose after archive.

## Requirements

### Requirement: No redundant header bar on tab screens

The Home, Projects, and More tab screens SHALL NOT render a top header bar with a title. The bottom tab bar provides sufficient navigation context. The SafeAreaView top edge SHALL still be respected to avoid content overlapping the status bar.

#### Scenario: Home screen has no header

- **WHEN** the user navigates to the Home tab
- **THEN** no title bar or header View SHALL be visible at the top of the screen

#### Scenario: Projects screen has no header

- **WHEN** the user navigates to the Projects tab
- **THEN** no title bar or header View SHALL be visible at the top of the screen

#### Scenario: More screen has no header

- **WHEN** the user navigates to the More tab
- **THEN** no title bar or header View SHALL be visible at the top of the screen

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