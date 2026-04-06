## 1. Supabase Schema Migration

- [x] 1.1 Supabase schema created manually (implements **supabase schema migration** design decision): tables `users`, `friendships`, `shared_transactions`, `contacts` created with RLS policies and Realtime enabled for `shared_transactions`. Verified in Table Editor.

## 2. Auth Library

- [x] [P] 2.1 In `src/lib/auth.ts`: remove `signIn`, `signUp`, `resetPassword` exports. Add `signInAnonymously()` that calls `supabase.auth.signInAnonymously()` and returns `{ data, error }`. Add `linkAppleIdentity()` that calls `supabase.auth.linkIdentity({ provider: 'apple' })` and returns `{ data, error }`. Keep `signOut`, `getSession`, `onAuthStateChange` unchanged. This implements the **Apple ID linking** design decision.

- [x] [P] 2.2 In `src/lib/auth.ts`: add `ensureUserProfile(userId: string): Promise<{ inviteCode: string | null; error: string | null }>` (implements **invite code generation and storage** design decision). Logic: (1) SELECT from `users` where `id = userId`. (2) If no row: generate a random 6-char `[A-Z0-9]` code, INSERT `{ id: userId, invite_code: code }` — on UNIQUE violation retry up to 3 times with a new code; return `{ inviteCode: code, error: null }` on success or `{ inviteCode: null, error: 'invite code collision' }` after 3 failures. (3) If row exists with code: return `{ inviteCode: row.invite_code, error: null }`. (4) If row exists without code: generate, UPDATE, return as in (2). Satisfies the **user profile initialisation with invite code** requirement.

## 3. App Bootstrap

- [x] 3.1 In `App.tsx`: implement **automatic anonymous sign-in on first launch** (implements **anonymous sign-in bootstrap in App.tsx** design decision). Update `onAuthStateChange` so that when `newSession` is null after DB is ready, the app calls `signInAnonymously()` instead of rendering `AuthNavigator`. Show a loading indicator while anonymous sign-in is in flight. If `signInAnonymously()` returns an error, render a full-screen retry view with a "重試" button. Remove the `if (!session) { return <AuthNavigator /> }` branch entirely.

- [x] 3.2 In `App.tsx`: in the `if (newSession)` block, call `ensureUserProfile(newSession.user.id)` and store the returned `inviteCode` in a React context (`InviteCodeContext`) accessible app-wide. The call is fire-and-don't-block — other initialisation (`seedDefaultCategories`, etc.) continues in parallel. Create `src/contexts/InviteCodeContext.tsx` with `InviteCodeContext = createContext<string | null>(null)` and a `useInviteCode()` hook.

## 4. Remove Auth Screens

- [x] [P] 4.1 Delete `src/navigation/AuthNavigator.tsx`, `src/screens/auth/LoginScreen.tsx`, `src/screens/auth/RegisterScreen.tsx`, `src/screens/auth/ResetPasswordScreen.tsx` (implements **removal of auth screens** design decision). Verify no remaining imports: run `grep -r "AuthNavigator\|LoginScreen\|RegisterScreen\|ResetPasswordScreen" src/` and confirm zero matches.

## 5. Friend Discovery — Library

- [x] [P] 5.1 In `src/lib/friends.ts`: add `searchUserByInviteCode(code: string): Promise<{ id: string; invite_code: string; display_name: string | null } | null>`. Query: `supabase.from('users').select('id, invite_code, display_name').eq('invite_code', code.toUpperCase().trim()).single()`. Return `data ?? null`. Remove `searchUserByEmail` export. This implements the **friend discovery via invite code** design decision and satisfies the **friend discovery by invite code** requirement and the modified **friend relationship** requirement.

## 6. Friend Discovery — UI

- [x] 6.1 In `src/screens/friends/FriendsScreen.tsx`: replace email `TextInput` with invite code input (maxLength=6, autoCapitalize='characters', monospace font). Replace search handler to call `searchUserByInviteCode`. Disable "送出邀請" when `input.length < 6`. On null result show Alert "找不到此邀請碼對應的用戶". If found user id equals current userId show Alert "不能加自己為好友". Otherwise call `sendFriendRequest` as before. Update imports. Satisfies the **invite code input UI in FriendsScreen** requirement.

## 7. Account Settings in MoreScreen

- [x] 7.1 In `src/screens/MoreScreen.tsx`: add "帳號" section (implements **Apple ID linking** and **invite code display in account settings** requirements). Read invite code via `useInviteCode()`. Section contains: (a) invite code row — label "我的邀請碼", monospace value, tap copies via `Clipboard.setStringAsync` from `expo-clipboard`, shows Alert "邀請碼已複製" — satisfies **invite code display in account settings**; (b) status row — "訪客帳號" if `session.user.is_anonymous`, else "已綁定 Apple ID"; (c) "綁定 Apple ID" button — only when `is_anonymous`, calls `linkAppleIdentity()`; on success re-fetch session; on error containing "already" show Alert "此 Apple ID 已綁定其他帳號，無法連結" — satisfies **Apple ID account linking** and **anonymous account status display** requirements.
