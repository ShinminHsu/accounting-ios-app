## Context

Six issues found during first device test. Most are small UI/logic fixes in `AddTransactionSheet.tsx` and three tab screens. Item 4 (Supabase schema cache for projects) will be fully superseded once `local-first-sqlite` is applied (projects move to SQLite), so it is treated as a no-op here — no dedicated fix needed.

## Goals / Non-Goals

**Goals:**
- Remove redundant header bars from Home, Projects, More tab screens
- Add `name` field to transaction entry form (stored in `transactions.name` column — note: this column needs to be added to the local SQLite schema; coordinate with `local-first-sqlite` task 1.3)
- Fix project picker so selecting a project actually sets `selectedProjectId` state
- Make `contact_id` optional for `paid_for_other` / `paid_by_other` payer types
- Fix category picker so the currently-selected category is highlighted when the sheet opens

**Non-Goals:**
- Redesigning the full AddTransactionSheet layout
- Adding new payer types
- Fixing the Supabase projects schema cache error (superseded by local-first-sqlite)

## Decisions

### Remove header bars — delete the header View, not just hide it

Tab screens (Home, Projects, More) each render a `<View style={styles.header}>` block with a title Text. Delete the entire block and its stylesheet entry. The SafeAreaView top edge already provides correct spacing.

### Transaction name field — stored in `transactions` table

Add a `name TEXT` column to `transactions` (nullable, for compatibility with existing rows). Display it as the first field in AddTransactionSheet, labelled "名稱（選填）". Map to a `name` state variable; pass to `createTransaction` / `updateTransaction`.

This column must also be added to the SQLite schema in `local-first-sqlite` task 1.3. If `local-first-sqlite` is applied first, add `name TEXT` there. If `ui-and-ux-fixes` is applied first (Supabase era), add an `ALTER TABLE` migration.

### Fix project picker — state update on row press

The picker renders a list of project rows. Each row's `onPress` must call `setSelectedProjectId(project.id)` and then close the picker modal. Current bug: the setter is either not called or the modal closes before state updates. Fix by calling setter then `setShowProjectPicker(false)` in the same handler.

### Optional contact — remove required validation

Current code: if `payerType === 'paid_for_other' || payerType === 'paid_by_other'`, saving without a `contactId` shows an error. Change: remove that validation. `contact_id` remains nullable in the schema. The contact selector becomes a "選填" field when these payer types are selected.

### Category pre-selection — initialize picker state from current selection

The category picker opens with no row highlighted when `categoryId` is already set. Fix: when the picker sheet opens, initialize its internal `tempCategoryId` state to the current `categoryId` value (not `null`). This ensures the already-selected row is highlighted and tapping Save without changing selection doesn't trigger a "請選擇分類" error.

## Risks / Trade-offs

- [name field added to transactions type] → Update `Transaction` interface in `database.ts` to add `name: string | null`. Screens that read transactions may need to handle the new field, but since it's nullable no crashes expected.
- [local-first-sqlite dependency] → If both changes are applied, apply `local-first-sqlite` first to avoid double migration work for the `name` column.
