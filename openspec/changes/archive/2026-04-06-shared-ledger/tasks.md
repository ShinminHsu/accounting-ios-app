## 1. Database & Data Model (架構：共享帳本資料存在 Supabase，個人帳本存本地；一個交易只屬於一個帳本)

- [x] 1.1 Ledger data model — add migration `004_ledgers` to `src/lib/db.ts`: create `ledgers` table (`id`, `owner_user_id`, `name`, `is_personal INTEGER DEFAULT 0`, `start_date`, `end_date`, `created_at`, `updated_at`) and `ledger_members` table (`id`, `ledger_id REFERENCES ledgers(id) ON DELETE CASCADE`, `user_id`, `status TEXT DEFAULT 'invited'`, `joined_at`, `created_at`); also add `ledger_id TEXT REFERENCES ledgers(id) ON DELETE SET NULL` column to `transactions` table (nullable, transaction ledger association)
- [x] 1.2 Add `Ledger` and `LedgerMember` types to `src/types/database.ts`

## 2. Core Ledger Logic

- [x] 2.1 Create `src/lib/ledgers.ts`: implement `seedPersonalLedger(userId)` — query for existing personal ledger; if none found, insert with `is_personal = 1`, `name = '個人'` (personal ledger initialization)
- [x] 2.2 In `src/lib/ledgers.ts`: implement `fetchLedgers(userId)` — return `{ active: Ledger[], invited: Ledger[] }` where active = ledger_members rows with status 'active', invited = rows with status 'invited', personal ledger first in active (fetch user's ledgers)
- [x] 2.3 In `src/lib/ledgers.ts`: implement `createLedger(userId, name, startDate?, endDate?)` — insert into ledgers + insert owner into ledger_members with status 'active' (create shared ledger)
- [x] 2.4 In `src/lib/ledgers.ts`: implement `deleteLedger(ledgerId, userId)` — check is_personal (return error if personal ledger), check owner_user_id matches userId (return error if not owner), then delete (delete shared ledger)

## 3. Sharing Logic

- [x] 3.1 In `src/lib/ledgers.ts`: implement `inviteToLedger(ledgerId, ownerUserId, friendUserId)` — verify active friendship via `getActiveFriendship` (共享帳本邀請基於現有好友關係); verify friendUserId not already in ledger_members; insert ledger_members row with status 'invited' (invite friend to shared ledger)
- [x] 3.2 In `src/lib/ledgers.ts`: implement `acceptLedgerInvite(ledgerId, userId)` — find ledger_members row with status 'invited'; update to status 'active', joined_at = now() (accept ledger invitation)
- [x] 3.3 In `src/lib/ledgers.ts`: implement `leaveLedger(ledgerId, userId)` — check user is not owner (return error if owner); delete ledger_members row (leave shared ledger)
- [x] 3.4 In `src/lib/ledgers.ts`: implement `fetchLedgerMembers(ledgerId)` — return all ledger_members rows with status 'active' for a ledger (member list for display)

## 4. Transaction Integration

- [x] 4.1 Update `TransactionInput` type in `src/lib/transactions.ts` to add optional `ledgerId: string | null` field to support record a transaction in any ledger (default ledger on create: when null, stored as NULL = personal ledger; otherwise stores the shared ledger ID — one transaction belongs to exactly one ledger — transaction ledger association); update `createTransaction` INSERT to include `ledger_id` column; update `rowToTransaction` to map `ledger_id`
- [x] 4.2 Update `fetchTransactionsForMonth` in `src/lib/transactions.ts` to accept optional `ledgerId?: string | null` parameter: when undefined/null, add `AND t.ledger_id IS NULL` to WHERE clause; when a specific ID is given, add `AND t.ledger_id = ?` (fetch transactions by ledger)
- [x] 4.3 Call `seedPersonalLedger(userId)` in `App.tsx` auth callback after `seedDefaultCategories`, before `setLoading(false)` (personal ledger initialization on app startup — 個人帳本在 App 初始化時建立)

## 5. AddTransactionSheet Ledger Selector

- [x] 5.1 In `AddTransactionSheet.tsx`: add `ledgerId` state (default `null`); load ledgers via `fetchLedgers` in the existing data-load `useEffect`; add to `reset()` (ledger selector in AddTransactionSheet)
- [x] 5.2 In `AddTransactionSheet.tsx`: render a ledger selector field in the quick-pills row only when `ledgers.active.length > 1`; show ledger name; selecting opens a simple picker (list of active ledgers); pass `ledgerId` to `createTransaction` (ledger selector in AddTransactionSheet — project + ledger co-selection: both project and ledger fields remain independent and can be set simultaneously)

## 6. Ledger Navigation & Screens

- [x] 6.1 Create `src/screens/ledgers/LedgersScreen.tsx`: list active ledgers (personal first, then shared with member count); show pending invitations section; "建立帳本" FAB; tapping a row navigates to LedgerDetailScreen (ledger list screen)
- [x] 6.2 Create `src/screens/ledgers/CreateLedgerModal.tsx`: form with name TextInput, optional start/end date fields; calls `createLedger`; on success calls `onCreated` callback (create shared ledger UI)
- [x] 6.3 Create `src/screens/ledgers/LedgerDetailScreen.tsx`: receives `ledger` prop; shows month nav + calendar/list toggle same as LedgerScreen but calls `fetchTransactionsForMonth(userId, year, month, ledger.id)`; for shared ledgers shows "成員" tab with per-member spending totals (ledger detail screen)
- [x] 6.4 In `LedgerDetailScreen.tsx`: implement 代付提示機制 — for shared ledgers, query transactions with `payer_type = 'paid_for_other'` and `contact_id` matching current user's linked friend; check if a mirroring `paid_by_other` transaction already exists in personal ledger; render prompt card "XXX 幫你支付了 NT$YYY，要加入個人帳本嗎？" with "加入" button that calls `createTransaction` with `payer_type = 'paid_by_other'`, `ledger_id = null` (personal), and dismisses card (paid-for-other prompt)
- [x] 6.5 Add LedgersScreen entry point to `MoreScreen.tsx`: add "帳本" MenuItem with `BookMarked` Lucide icon that opens a `ScreenModal` containing `LedgersScreen` (ledger list screen accessible from nav)

## 7. Ledger Sharing UI

- [x] 7.1 Create `src/screens/ledgers/LedgerMembersScreen.tsx`: show active members list; "邀請好友" button opens friend picker (filtered to friends not yet in ledger); calls `inviteToLedger`; non-owner members see a "退出帳本" button that calls `leaveLedger`; owner sees "刪除帳本" (invite friend to shared ledger UI, leave shared ledger UI)
- [x] 7.2 In `LedgersScreen.tsx`: for each invited ledger in `ledgers.invited`, show an invitation card with "接受" button that calls `acceptLedgerInvite` and refreshes the list (accept ledger invitation UI, pending invitations display)
