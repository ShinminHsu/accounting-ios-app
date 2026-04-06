## Context

Currently `App.tsx` gates the entire app behind Supabase email/password auth. All app data lives in local SQLite; Supabase auth is only used to produce a stable `user_id` and to power real-time friend sync. The session is already persisted via `expo-secure-store`, but users still see a login screen on first install.

Supabase supports anonymous sign-in (`supabase.auth.signInAnonymously()`) since late 2023. Anonymous users get a real JWT and `user_id`, making RLS policies and Realtime subscriptions work identically to named accounts. An anonymous account can later be "upgraded" by linking a provider (Apple, Google, email) — Supabase merges the identity without changing `user_id`.

## Goals / Non-Goals

**Goals:**
- Zero-friction first launch: no auth screen, no password
- Full feature parity including friend sync for anonymous users
- Invite-code-based friend discovery that works without email
- Optional Apple ID linking for cross-device data recovery
- Clean removal of login/register/reset screens

**Non-Goals:**
- Google Sign-In (Apple only, as this is an iOS app)
- Email/password account creation (removed entirely)
- Cloud backup of SQLite data (still local-only; Apple ID only recovers the Supabase identity/friendships, not SQLite rows)
- Migrating existing email-based users' friend relationships (out of scope)

## Decisions

### Anonymous sign-in bootstrap in App.tsx

On cold start, `App.tsx` calls `supabase.auth.getSession()`. If no session exists, it calls `supabase.auth.signInAnonymously()` instead of rendering `AuthNavigator`. The existing `onAuthStateChange` listener then fires with the new session and proceeds normally — no change to downstream code.

Alternative considered: keep login screen but add "Continue as Guest". Rejected — adds friction without benefit since the anonymous session is functionally identical to a named one.

### Invite code generation and storage

On first anonymous sign-in, the app generates a 6-character uppercase alphanumeric code (`[A-Z0-9]{6}`, ~2.2 billion combinations) and upserts it into the `users` Supabase table as `invite_code`. Generation and upsert happen in `src/lib/auth.ts` in a new `ensureUserProfile(userId)` function called after every successful sign-in (anonymous or linked).

`ensureUserProfile` logic:
1. Check if `users` row exists for this `user_id`
2. If not: generate code, INSERT `{ id: userId, invite_code: code }`
3. If yes but `invite_code` is null: UPDATE to set a code
4. If yes with code: no-op

The `invite_code` column has a UNIQUE constraint. On collision (extremely unlikely), retry with a new code up to 3 times.

Alternative considered: Postgres trigger on `users` INSERT. Rejected — the app doesn't insert directly into `users` on sign-up; Supabase Auth creates the auth user, and we upsert the public `users` row from the client. Client-side generation keeps logic auditable.

### Friend discovery via invite code

`searchUserByEmail` in `src/lib/friends.ts` is replaced by `searchUserByInviteCode(code: string)`, which queries `users` table by `invite_code = code.toUpperCase().trim()`. `FriendsScreen` replaces the email `TextInput` with an invite code input (6-char, auto-uppercase, monospace display). The rest of the friend request flow (`sendFriendRequest`, `acceptFriendRequest`) is unchanged.

### Apple ID linking

A new "帳號設定" section in `MoreScreen` shows:
- The user's own invite code (copy-to-clipboard)
- Account status: "訪客帳號" or "已綁定 Apple ID"
- "綁定 Apple ID" button (hidden if already linked)

Tapping it calls `supabase.auth.linkIdentity({ provider: 'apple' })`. If the Apple ID is already associated with a different Supabase account, Supabase returns an error — the app shows an alert explaining the conflict.

The `isAnonymous` flag comes from `session.user.is_anonymous` (Supabase SDK field).

### Supabase schema migration

Add `invite_code TEXT UNIQUE` column to the public `users` table. Existing rows get codes assigned lazily via `ensureUserProfile` on next app open.

```sql
ALTER TABLE public.users ADD COLUMN invite_code TEXT UNIQUE;
```

No backfill needed — existing users get their code on next launch.

### Removal of auth screens

`AuthNavigator.tsx`, `LoginScreen.tsx`, `RegisterScreen.tsx`, `ResetPasswordScreen.tsx` are deleted. `src/lib/auth.ts` removes `signIn`, `signUp`, `resetPassword` exports; adds `signInAnonymously` and `linkAppleIdentity`.

## Risks / Trade-offs

- [Risk] Anonymous account lost if user deletes app without linking Apple ID → Mitigation: show a persistent banner/prompt in MoreScreen encouraging Apple ID linking; make the consequence clear in UI copy
- [Risk] invite_code collision on retry exhaustion → Mitigation: 3 retries cover all realistic cases; on final failure, show an alert and allow manual retry
- [Risk] `supabase.auth.linkIdentity` for Apple requires correct Supabase Apple OAuth config → Mitigation: this is a config task, not code; document in migration plan
- [Risk] Existing users with email accounts can no longer sign in → Mitigation: this app is personal/single-user; no existing named-account users in production

## Migration Plan

1. Add `invite_code` column to Supabase `users` table (SQL migration)
2. Configure Apple OAuth provider in Supabase dashboard (if not already done)
3. Deploy app update — existing sessions are preserved via SecureStore; `ensureUserProfile` assigns invite codes on next launch
4. No rollback path needed (anonymous auth is additive; removing login screen is one-way for this app)
