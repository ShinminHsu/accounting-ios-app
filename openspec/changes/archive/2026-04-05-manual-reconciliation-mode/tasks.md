## 1. Data Layer

- [x] 1.1 Add `fetchTransactionsForCard(accountId, billingStart, billingEnd)` to `src/lib/reconciliation.ts` — query `transactions` where `account_id = accountId`, `date >= billingStart`, `date <= billingEnd`, `is_income = 0`, ordered by date DESC; return `SimpleTxn[]` with exact date range (no ±3 day extension). Implements the **fetchTransactionsForCard in reconciliation lib** design decision and satisfies the **fetchTransactionsForCard data access** requirement.

## 2. Reconciliation Screen — Entry Point

- [x] 2.1 In `src/screens/creditcards/ReconciliationScreen.tsx`, add `'manual'` to the `Step` type. In the idle state render, replace the single upload button with two side-by-side buttons: "📄 上傳帳單" (existing `handleUpload`) and "✍️ 手動對帳" (new `handleEnterManual`). Both buttons are disabled when `bill` is null. Implements the **two-path idle state in ReconciliationScreen** and the **bill upload and OCR parsing** entry point (unchanged upload path now co-exists with manual path). Satisfies the **manual reconciliation entry point** requirement.

## 3. Manual Reconciliation View — Transaction List

- [x] 3.1 Add `handleEnterManual` to `ReconciliationScreen`: call `fetchTransactionsForCard(accountId, bill.billing_period_start, bill.billing_period_end)`, store result in a `manualTxns` state, initialise `manualCheckedSet` as empty `Set<string>` of transaction IDs, then set `step` to `'manual'`. Update bill status to `'reconciling'` via supabase (same as upload path).

- [x] 3.2 Add `ManualReconciliationView` component inside `ReconciliationScreen.tsx` (implements **ManualReconciliationView as an inline component** design decision). Renders a `ScrollView` of `ManualTxnRow` items. Each row shows: date, notes (as merchant), amount, and checkbox (filled if ID is in `manualCheckedSet`). Tapping a row calls `toggleManualCheck(id)` to toggle the ID in the set. Shows empty state text "本期尚無消費記錄" and a disabled confirm button when `manualTxns` is empty. Satisfies the **transaction list in manual reconciliation** and **per-transaction confirmation toggle** requirements.

- [x] 3.3 Add sticky **bottom progress bar** to `ManualReconciliationView`: displays "已確認 X / N 筆" and "NT$ [sum of checked amounts]" as live values derived from `manualCheckedSet` and `manualTxns`. Include "確認對帳完成" button (always enabled). Satisfies the **live progress bar** requirement.

## 4. Confirm Flow

- [x] 4.1 Add `handleManualConfirm` to `ReconciliationScreen`: if unchecked count > 0, show Alert "仍有 N 筆未確認，確定要完成對帳？" with "返回檢查" (cancel) and "確定完成" (proceed) options. If all confirmed, proceed directly. This satisfies the warning alert branch of the **confirm manual reconciliation** requirement.

- [x] 4.2 Add `doManualConfirm` to `ReconciliationScreen` (implements **confirm path** design decision): build `MatchedLineItem[]` from `manualTxns` — for each txn, set `lineItem = { date, merchant: txn.notes ?? '', amount }`, `matchedTransactionId = txn.id`, `matchedTransactionNotes = txn.notes`, `isChecked = manualCheckedSet.has(txn.id)`, `isMissing = false`, `dateOffsetDays = 0`. Compute `totalAmount` as sum of all txn amounts. Call `saveBillLineItems(userId, bill.id, finalItems)` then `confirmReconciliation(userId, bill.id, creditCard.id, totalAmount, cashbackOffset, creditCard.payment_due_day, creditCard.auto_debit_account_id)`. On success, set `step = 'done'` and call `load()`. Completes the **confirm manual reconciliation** requirement.
