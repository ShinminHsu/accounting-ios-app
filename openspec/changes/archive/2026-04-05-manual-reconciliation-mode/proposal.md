## Why

The existing reconciliation flow requires uploading a PDF/image and relies on Gemini OCR. Users also need a way to manually review all transactions already recorded in the app for a given billing period — checking them off one by one without any file upload, for cases where OCR is unavailable or the user prefers direct confirmation.

## What Changes

- Add a "手動對帳" (Manual Reconciliation) entry point in the Reconciliation tab, alongside the existing upload flow
- New screen lists all transactions linked to the credit card's account within the current billing period
- User can tap each transaction row to toggle a checkmark
- Bottom bar shows live progress: confirmed count / total count, and total confirmed amount
- On completion, calls the existing `confirmReconciliation` path to mark the bill as reconciled and create a pending debit

## Non-Goals

- Gemini 429 rate-limit handling — not in scope for this change
- 發票載具 (e-invoice carrier) integration — deferred to a future change
- Editing transaction details from within the manual reconciliation view
- Multi-period or historical bill browsing

## Capabilities

### New Capabilities

- `manual-credit-card-reconciliation`: Manually review and confirm credit card transactions within a billing period, without uploading a bill image

### Modified Capabilities

- `credit-card-reconciliation`: Add `fetchTransactionsForCard` to the reconciliation lib; extend `ReconciliationScreen` idle state to offer two paths (upload vs. manual)

## Impact

- Affected specs: `manual-credit-card-reconciliation` (new), `credit-card-reconciliation` (modified)
- Affected code:
  - `src/lib/reconciliation.ts` — add `fetchTransactionsForCard`
  - `src/screens/creditcards/ReconciliationScreen.tsx` — add manual mode entry and new `ManualReconciliationView` component
