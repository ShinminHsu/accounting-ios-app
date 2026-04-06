# ledger-sharing Specification

## Purpose

TBD - created by archiving change 'shared-ledger'. Update Purpose after archive.

## Requirements

### Requirement: Invite friend to shared ledger

The system SHALL allow the owner of a shared ledger to invite a user who has an active friendship (`friendship.status = 'active'`) with the owner. Inviting creates a `ledger_members` row with `status = 'invited'`. A user who is already a member (any status) SHALL NOT be re-invited; the system SHALL return `{ error: '該使用者已在帳本中' }`.

#### Scenario: Valid friend invited

- **WHEN** `inviteToLedger(ledgerId, ownerUserId, friendUserId)` is called and an active friendship exists
- **THEN** a `ledger_members` row with `status = 'invited'` is created for `friendUserId`

#### Scenario: Non-friend cannot be invited

- **WHEN** `inviteToLedger(ledgerId, ownerUserId, targetUserId)` is called and no active friendship exists
- **THEN** returns `{ error: '只能邀請好友加入帳本' }`

#### Scenario: Already-member cannot be re-invited

- **WHEN** `inviteToLedger` is called for a user already in `ledger_members`
- **THEN** returns `{ error: '該使用者已在帳本中' }`


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
### Requirement: Accept ledger invitation

The system SHALL allow an invited user to accept a ledger invitation by calling `acceptLedgerInvite(ledgerId, userId)`, which sets their `ledger_members.status` to `'active'` and `joined_at` to the current timestamp.

#### Scenario: Invited user accepts

- **WHEN** `acceptLedgerInvite(ledgerId, userId)` is called by a user with `status = 'invited'`
- **THEN** their `ledger_members` row is updated to `status = 'active'`, `joined_at = now()`

#### Scenario: Non-invited user cannot accept

- **WHEN** `acceptLedgerInvite(ledgerId, userId)` is called by a user with no `ledger_members` row
- **THEN** returns `{ error: '找不到邀請記錄' }`


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
### Requirement: Leave shared ledger

The system SHALL allow a non-owner member to leave a shared ledger by calling `leaveLedger(ledgerId, userId)`, which deletes their `ledger_members` row. The owner SHALL NOT be able to leave; they must delete the ledger instead.

#### Scenario: Member leaves ledger

- **WHEN** `leaveLedger(ledgerId, userId)` is called by a non-owner active member
- **THEN** their `ledger_members` row is deleted; returns `{ error: null }`

#### Scenario: Owner cannot leave

- **WHEN** `leaveLedger(ledgerId, userId)` is called by the owner
- **THEN** returns `{ error: '帳本建立者無法退出，請刪除帳本' }`


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
### Requirement: Pending invitations display

`fetchLedgers(userId)` SHALL also return ledgers where the user has `status = 'invited'`, separately from active ledgers, so the UI can display a pending invitation list.

#### Scenario: Pending invitations are returned separately

- **WHEN** `fetchLedgers(userId)` is called and the user has invited ledgers
- **THEN** the result includes both `active` ledgers and `invited` ledgers as separate arrays

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