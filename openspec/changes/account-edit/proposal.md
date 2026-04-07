## Why

Users currently cannot edit account details after creation — credit card billing settings (closing day, due day, auto-debit account) are locked, and other account types (cash, bank, e-payment, investment) have no edit entry point at all. This makes it impossible to correct mistakes or update settings without deleting and recreating accounts.

## What Changes

- Add an edit entry point on each account row in the Assets screen (tap row → edit sheet opens)
- For **all account types**: allow editing account name and currency
- For **non-credit-card accounts**: additionally allow editing initial balance (applied as a balance adjustment)
- For **credit card accounts**: allow editing closing day, due day, and auto-debit bank account; name and currency also editable
- Validation mirrors the create flow (required fields, numeric ranges 1–31 for days)
- Save updates the account record and re-derives any balance display immediately

## Non-Goals

- Changing account **type** after creation (e.g., cash → credit card) is not supported
- Deleting accounts is already handled separately and not changed here
- No bulk-edit or account merge

## Capabilities

### New Capabilities

- `account-edit`: UI and data layer for editing an existing account's settings after creation

### Modified Capabilities

- `account-management`: Add requirement that accounts are editable post-creation via the Assets screen

## Impact

- Affected specs: `account-edit` (new), `account-management` (delta)
- Affected code:
  - `src/screens/AssetsScreen.tsx` (add tap-to-edit entry point per account row)
  - `src/screens/accounts/EditAccountModal.tsx` (new modal, mirrors CreateAccountModal structure)
  - `src/lib/accounts.ts` (new `updateAccount` function)
  - `src/types/database.ts` (ensure Account type has all editable fields)
