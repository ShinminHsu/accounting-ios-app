## Context

The `ReconciliationScreen` currently supports one path: upload PDF/image → Gemini OCR → fuzzy match → confirm. The idle state shows a single "上傳帳單" button. We need to add a second path that skips OCR entirely and works from transactions already in the app.

`fetchTransactionsForBillingPeriod` exists in `src/lib/reconciliation.ts` but is scoped to a single account, which is exactly what we need. The new flow reuses this function and the existing `confirmReconciliation` path.

## Goals / Non-Goals

**Goals:**
- Add a manual reconciliation path alongside the upload path
- Let the user tap transactions in the billing period to confirm them
- Show live progress (X/N confirmed, total NT$)
- Reuse `confirmReconciliation` at the end

**Non-Goals:**
- Editing transactions from within this view
- Browsing or re-opening historical/past bills
- Gemini 429 retry handling
- 發票載具 integration

## Decisions

### Two-path idle state in ReconciliationScreen

The idle screen (status: pending or reconciling) will show two options side by side:
- "📄 上傳帳單" — existing upload flow, unchanged
- "✍️ 手動對帳" — new manual flow

When bill status is `reconciled`, only the summary view is shown (unchanged behaviour).

Alternative considered: a separate screen/tab. Rejected — the reconciliation tab already scopes to one bill period; two buttons in idle is simpler and requires no navigation changes.

### ManualReconciliationView as an inline component

Rather than a new screen file, the manual flow is rendered as a sub-component `ManualReconciliationView` inside `ReconciliationScreen.tsx`. State is: `step` transitions from `idle` → `manual` → `done` (reusing the existing `step` state machine, adding `'manual'`).

Alternative: separate `ManualReconciliationScreen.tsx`. Rejected — the existing `ReconciliationScreen` already owns bill state (`bill`, `userId`), so sharing it is straightforward.

### fetchTransactionsForCard in reconciliation lib

Add `fetchTransactionsForCard(accountId, billingStart, billingEnd): Promise<SimpleTxn[]>` to `src/lib/reconciliation.ts`. This is semantically different from `fetchTransactionsForBillingPeriod` (which extends dates by ±3 days for fuzzy matching). The new function uses exact date range — the user is reviewing their own app transactions, no fuzz needed.

### Bottom progress bar

A sticky `View` fixed to the bottom of the scroll view shows:
- Left: "已確認 X / N 筆"
- Right: "NT$ [sum of checked amounts]"
- Full-width "確認對帳完成" button (enabled always, warns if not all checked)

This mirrors the UX pattern in the reference screenshot.

### Confirm path

On confirm, build a synthetic `MatchedLineItem[]` from the checked transactions (amount, date, merchant from `notes`, pre-checked = true, isMissing = false) and call the existing `saveBillLineItems` + `confirmReconciliation`. This keeps the bill_line_items table consistent regardless of path.

## Risks / Trade-offs

- [Risk] Transactions for the period may include transfers or non-credit-card items → Mitigation: filter to `is_income = 0` and `account_id = creditCard account` (same as existing `fetchTransactionsForBillingPeriod`)
- [Risk] Bill may not exist yet when user enters manual mode → Mitigation: `fetchOrCreateCurrentBill` is already called on mount; manual mode button is only shown after `bill` state is populated
