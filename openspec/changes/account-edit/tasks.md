## 1. Data Layer

- [ ] 1.1 Add `updateAccount(accountId, fields)` function to `src/lib/accounts.ts` — updates `accounts` table (name, currency); for credit card accounts also updates `credit_cards` table (closing_day, due_day, auto_debit_account_id); returns `{ error: null }` on success or `{ error: '找不到此帳戶' }` if not found (updateAccount data function)

## 2. Edit Modal

- [ ] 2.1 [P] Create `src/screens/accounts/EditAccountModal.tsx` — bottom-sheet modal with `KeyboardAvoidingView` + `ScrollView`; pre-fills name, currency, and type-specific fields from the account prop; includes Save / Cancel buttons (EditAccountModal is keyboard-aware, edit general account fields)
- [ ] 2.2 [P] Implement credit card section in EditAccountModal — show closing day, due day (numeric inputs, 1–31 validated), and auto-debit bank account picker (list of bank accounts, supports deselect); only rendered when `account.type === 'credit_card'` (edit credit card billing settings)
- [ ] 2.3 [P] Implement validation in EditAccountModal — block save if name is empty (show "請輸入帳戶名稱"), block save if closing_day or due_day is outside 1–31 (show "請輸入有效日期（1–31）"); call `updateAccount` on valid submit and call `onSaved` callback on success (attempt to save with empty name, invalid closing day rejected)

## 3. Assets Screen Integration

- [ ] 3.1 Add edit entry point on account row in `src/screens/AssetsScreen.tsx` — tapping an account row opens `EditAccountModal` with the tapped account; on `onSaved`, refresh the account list; EditAccountModal is imported and rendered conditionally (edit entry point on account row, edit and delete accounts)
