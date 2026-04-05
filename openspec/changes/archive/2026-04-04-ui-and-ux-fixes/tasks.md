## 1. Remove Redundant Header Bars

- [x] 1.1 Remove header bars — delete the header View, not just hide it — from `HomeScreen.tsx`: delete the header `<View>` block and its `styles.header` / `styles.headerTitle` stylesheet entries; verify SafeAreaView `edges` still includes `'top'` so status bar is respected (no redundant header bar on tab screens)
- [x] 1.2 Remove header bar from `ProjectsScreen.tsx`: same as 1.1 (no redundant header bar on tab screens)
- [x] 1.3 Remove header bar from `MoreScreen.tsx`: same as 1.1 (no redundant header bar on tab screens)

## 2. Transaction Name Field

- [x] 2.1 Transaction name field — stored in `transactions` table: add `name: string | null` to the `Transaction` interface in `src/types/database.ts`; add `name TEXT` column to the transactions DDL in `local-first-sqlite` task 1.3 (or, if applying before local-first-sqlite, add it to the Supabase `transactions` table via Dashboard)
- [x] 2.2 In `AddTransactionSheet.tsx`: add `name` state variable (default `''`); render a `TextInput` labelled "名稱（選填）" as the first field above the amount input; pass `name: name.trim() || null` to `createTransaction` / `updateTransaction` (transaction name field)
- [x] 2.3 In the transaction detail/edit screen: display the `name` field value when present

## 3. Fix Project Selector

- [x] 3.1 Fix project picker — state update on row press: in `AddTransactionSheet.tsx`, find the project picker row `onPress` handler; ensure it calls `setSelectedProjectId(project.id)` followed by `setShowProjectPicker(false)` in the same synchronous handler; add a "不指定" row at the top that sets `selectedProjectId` to `null` (working project selector)

## 4. Optional Contact for Debt Payer Types

- [x] 4.1 Optional contact — remove required validation: in `AddTransactionSheet.tsx`, remove the validation that blocks saving when `payerType` is `paid_for_other` or `paid_by_other` and `contactId` is null; update the contact field label to "聯絡人（選填）" when these payer types are selected (optional contact for debt payer types)

## 5. Fix Category Pre-selection

- [x] 5.1 Category pre-selection — initialize picker state from current selection: in `AddTransactionSheet.tsx`, find where the category picker sheet initializes its internal selection state; change initialization from `null` to the current `categoryId` value so the existing selection is highlighted when the picker opens; this ensures confirming without a change does not trigger a "請選擇分類" error (category pre-selected in picker)
