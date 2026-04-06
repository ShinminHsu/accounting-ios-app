# anonymous-auth Specification

## Purpose

TBD - created by archiving change 'anonymous-auth-and-invite-code'. Update Purpose after archive.

## Requirements

### Requirement: Automatic anonymous sign-in on first launch

The system SHALL call `supabase.auth.signInAnonymously()` automatically when no existing Supabase session is found on app start. The system SHALL NOT display any login, register, or password screen to the user. The resulting session SHALL be persisted via SecureStore so subsequent launches skip sign-in entirely.

#### Scenario: First launch, no existing session

- **WHEN** the app is opened for the first time (no SecureStore session)
- **THEN** the system SHALL call `signInAnonymously()`, receive a valid session with a `user_id`, and proceed directly to the main tab navigator without showing any auth screen

#### Scenario: Subsequent launch with persisted session

- **WHEN** the app is opened and a valid session exists in SecureStore
- **THEN** the system SHALL restore the session via `onAuthStateChange` and proceed directly to the main tab navigator

#### Scenario: Anonymous sign-in fails (network unavailable)

- **WHEN** `signInAnonymously()` fails due to no network connection
- **THEN** the system SHALL display a full-screen error state with a "重試" (retry) button; the main app SHALL NOT be accessible until a session is established


<!-- @trace
source: anonymous-auth-and-invite-code
updated: 2026-04-06
code:
  - src/screens/ledgers/LedgerMembersScreen.tsx
  - src/screens/ledgers/CreateLedgerModal.tsx
  - src/lib/ledgers.ts
  - src/navigation/AuthNavigator.tsx
  - src/lib/db.ts
  - src/navigation/MoreStackNavigator.tsx
  - src/types/database.ts
  - src/lib/auth.ts
  - src/screens/ledgers/LedgerDetailScreen.tsx
  - src/screens/auth/RegisterScreen.tsx
  - src/contexts/InviteCodeContext.tsx
  - src/screens/auth/LoginScreen.tsx
  - src/screens/friends/FriendsScreen.tsx
  - src/screens/MoreScreen.tsx
  - App.tsx
  - src/screens/ledgers/LedgersScreen.tsx
  - src/lib/friends.ts
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/lib/transactions.ts
  - src/screens/auth/ResetPasswordScreen.tsx
-->

---
### Requirement: User profile initialisation with invite code

After every successful sign-in (anonymous or linked), the system SHALL call `ensureUserProfile(userId)` which:
1. Checks whether a row exists in the public `users` table for this `user_id`
2. If absent: generates a 6-character uppercase alphanumeric invite code and inserts `{ id: userId, invite_code: code }`
3. If present but `invite_code` is null: updates the row to set a generated code
4. If present with a code: takes no action

On invite code collision (UNIQUE constraint violation), the system SHALL retry with a newly generated code up to 3 times before surfacing an error.

#### Scenario: New anonymous user profile created

- **WHEN** `ensureUserProfile` runs for a userId with no existing row
- **THEN** the system SHALL insert a users row with a 6-character [A-Z0-9] invite code

#### Scenario: Invite code collision on insert

- **WHEN** the generated invite code is already taken (UNIQUE violation)
- **THEN** the system SHALL generate a new code and retry; after 3 consecutive failures it SHALL log an error and surface an alert to the user


<!-- @trace
source: anonymous-auth-and-invite-code
updated: 2026-04-06
code:
  - src/screens/ledgers/LedgerMembersScreen.tsx
  - src/screens/ledgers/CreateLedgerModal.tsx
  - src/lib/ledgers.ts
  - src/navigation/AuthNavigator.tsx
  - src/lib/db.ts
  - src/navigation/MoreStackNavigator.tsx
  - src/types/database.ts
  - src/lib/auth.ts
  - src/screens/ledgers/LedgerDetailScreen.tsx
  - src/screens/auth/RegisterScreen.tsx
  - src/contexts/InviteCodeContext.tsx
  - src/screens/auth/LoginScreen.tsx
  - src/screens/friends/FriendsScreen.tsx
  - src/screens/MoreScreen.tsx
  - App.tsx
  - src/screens/ledgers/LedgersScreen.tsx
  - src/lib/friends.ts
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/lib/transactions.ts
  - src/screens/auth/ResetPasswordScreen.tsx
-->

---
### Requirement: Apple ID account linking

The system SHALL provide a "綁定 Apple ID" option in the account settings section of `MoreScreen`. Tapping it SHALL call `supabase.auth.linkIdentity({ provider: 'apple' })`. After successful linking, the button SHALL be replaced with a "已綁定 Apple ID" status label. The `user_id` SHALL remain unchanged after linking.

#### Scenario: User links Apple ID successfully

- **WHEN** user taps "綁定 Apple ID" and completes Apple authentication
- **THEN** the system SHALL link the Apple identity to the existing anonymous account, update the UI to show "已綁定 Apple ID", and the `user_id` SHALL be unchanged

#### Scenario: Apple ID already linked to another account

- **WHEN** `linkIdentity` returns an error indicating the Apple ID is already used
- **THEN** the system SHALL display an alert: "此 Apple ID 已綁定其他帳號，無法連結"

#### Scenario: Anonymous account status display

- **WHEN** user opens MoreScreen and `session.user.is_anonymous` is true
- **THEN** the system SHALL display the account status as "訪客帳號" and show the "綁定 Apple ID" button

#### Scenario: Linked account status display

- **WHEN** user opens MoreScreen and `session.user.is_anonymous` is false
- **THEN** the system SHALL display the account status as "已綁定 Apple ID" and SHALL NOT show the link button


<!-- @trace
source: anonymous-auth-and-invite-code
updated: 2026-04-06
code:
  - src/screens/ledgers/LedgerMembersScreen.tsx
  - src/screens/ledgers/CreateLedgerModal.tsx
  - src/lib/ledgers.ts
  - src/navigation/AuthNavigator.tsx
  - src/lib/db.ts
  - src/navigation/MoreStackNavigator.tsx
  - src/types/database.ts
  - src/lib/auth.ts
  - src/screens/ledgers/LedgerDetailScreen.tsx
  - src/screens/auth/RegisterScreen.tsx
  - src/contexts/InviteCodeContext.tsx
  - src/screens/auth/LoginScreen.tsx
  - src/screens/friends/FriendsScreen.tsx
  - src/screens/MoreScreen.tsx
  - App.tsx
  - src/screens/ledgers/LedgersScreen.tsx
  - src/lib/friends.ts
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/lib/transactions.ts
  - src/screens/auth/ResetPasswordScreen.tsx
-->

---
### Requirement: Invite code display in account settings

The system SHALL display the user's own 6-character invite code in the account settings section of `MoreScreen`. Tapping the code SHALL copy it to the clipboard and show a brief confirmation toast or alert.

#### Scenario: User copies invite code

- **WHEN** user taps their invite code in MoreScreen
- **THEN** the system SHALL copy the code to the system clipboard and display an alert "邀請碼已複製"

<!-- @trace
source: anonymous-auth-and-invite-code
updated: 2026-04-06
code:
  - src/screens/ledgers/LedgerMembersScreen.tsx
  - src/screens/ledgers/CreateLedgerModal.tsx
  - src/lib/ledgers.ts
  - src/navigation/AuthNavigator.tsx
  - src/lib/db.ts
  - src/navigation/MoreStackNavigator.tsx
  - src/types/database.ts
  - src/lib/auth.ts
  - src/screens/ledgers/LedgerDetailScreen.tsx
  - src/screens/auth/RegisterScreen.tsx
  - src/contexts/InviteCodeContext.tsx
  - src/screens/auth/LoginScreen.tsx
  - src/screens/friends/FriendsScreen.tsx
  - src/screens/MoreScreen.tsx
  - App.tsx
  - src/screens/ledgers/LedgersScreen.tsx
  - src/lib/friends.ts
  - src/screens/transactions/AddTransactionSheet.tsx
  - src/lib/transactions.ts
  - src/screens/auth/ResetPasswordScreen.tsx
-->