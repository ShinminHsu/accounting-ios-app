## Why

Requiring email/password login before using the app creates unnecessary friction for a personal finance tool where all data is stored locally. Users should be able to open the app and start recording transactions immediately, with friend-sharing features available via an invite code rather than requiring a registered email.

## What Changes

- **BREAKING** Remove the login wall: `App.tsx` no longer shows `AuthNavigator` when there is no session; instead it calls `supabase.auth.signInAnonymously()` automatically on first launch
- Anonymous Supabase session is persisted via `SecureStore` (existing mechanism), so the user never sees any auth screen on subsequent launches
- Each user is assigned a 6-character alphanumeric invite code on account creation, stored in the `users` table (`invite_code` column); code is unique and uppercased (e.g. `A3K9MZ`)
- **BREAKING** Friend discovery changes from email search to invite code entry: `FriendsScreen` replaces the email search field with an invite code input
- `searchUserByEmail` in `src/lib/friends.ts` is replaced by `searchUserByInviteCode`
- New "帳號設定" section in `MoreScreen` (or a dedicated settings screen) shows the user's own invite code and a "綁定 Apple ID" button
- Binding Apple ID calls `supabase.auth.linkIdentity({ provider: 'apple' })` to upgrade the anonymous account to a recoverable one
- Existing `LoginScreen`, `RegisterScreen`, `ResetPasswordScreen` are removed from the navigation flow (files can be deleted)

## Capabilities

### New Capabilities

- `anonymous-auth`: Automatic anonymous sign-in on first launch; session persistence without user interaction; Apple ID account linking for data recovery
- `invite-code-friend-discovery`: 6-character invite code per user for friend discovery, replacing email-based search

### Modified Capabilities

- `friend-sync`: Friend relationship requirement changes from email-based discovery to invite-code-based discovery

## Impact

- Affected specs: `anonymous-auth` (new), `invite-code-friend-discovery` (new), `friend-sync` (modified)
- Affected code:
  - `App.tsx` — replace auth gate with anonymous sign-in bootstrap
  - `src/navigation/AuthNavigator.tsx` — remove from navigation tree (file deleted)
  - `src/screens/auth/LoginScreen.tsx` — deleted
  - `src/screens/auth/RegisterScreen.tsx` — deleted
  - `src/screens/auth/ResetPasswordScreen.tsx` — deleted
  - `src/lib/auth.ts` — keep `signOut`/`getSession`/`onAuthStateChange`; remove `signIn`/`signUp`/`resetPassword`; add `signInAnonymously`, `linkAppleIdentity`
  - `src/lib/friends.ts` — replace `searchUserByEmail` with `searchUserByInviteCode`
  - `src/screens/friends/FriendsScreen.tsx` — replace email input with invite code input
  - `src/screens/MoreScreen.tsx` — add account settings section (invite code display + Apple ID link button)
  - Supabase migration: add `invite_code TEXT UNIQUE` column to `users` table; add `generateInviteCode` trigger or handle in app on anonymous sign-in
