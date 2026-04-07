# account-edit Specification

## Purpose

Define the requirements for editing an existing account's settings after creation, including both general fields (name, currency) and type-specific fields (credit card billing settings).

## ADDED Requirements

### Requirement: Edit entry point on account row

The system SHALL provide an edit action accessible from each account row in the Assets screen. Tapping an account row SHALL open an edit sheet pre-filled with the account's current values.

#### Scenario: Tap account row to edit

- **WHEN** the user taps any account row in the Assets screen
- **THEN** the system SHALL open an EditAccountModal pre-filled with the account's current name, currency, and type-specific fields

#### Scenario: Edit sheet shows correct type-specific fields

- **WHEN** the edit sheet opens for a credit card account
- **THEN** the system SHALL display fields for closing day, due day, and auto-debit account in addition to name and currency

#### Scenario: Edit sheet for non-credit-card account

- **WHEN** the edit sheet opens for a cash, bank, e-payment, or investment account
- **THEN** the system SHALL display fields for name and currency only (no billing fields)

---

### Requirement: Edit general account fields

The system SHALL allow the user to edit the name and currency of any account regardless of type. Name SHALL be required and non-empty. Currency SHALL be selected from the supported currency list (TWD, USD, JPY, EUR, HKD, CNY).

#### Scenario: Save updated account name

- **WHEN** the user changes the account name and taps Save
- **THEN** the system SHALL persist the new name and immediately reflect it in the Assets screen account list

#### Scenario: Attempt to save with empty name

- **WHEN** the user clears the account name field and taps Save
- **THEN** the system SHALL prevent saving and display a validation error "請輸入帳戶名稱"

#### Scenario: Change account currency

- **WHEN** the user selects a different currency and taps Save
- **THEN** the system SHALL update the account's currency and recalculate the TWD net worth display using the configured exchange rate

---

### Requirement: Edit credit card billing settings

The system SHALL allow the user to edit the closing day (1–31), due day (1–31), and auto-debit bank account for credit card accounts. These fields SHALL be validated using the same rules as the creation flow.

#### Scenario: Update closing day

- **WHEN** the user changes the closing day to a valid number (1–31) and saves
- **THEN** the system SHALL update the credit card settings and use the new closing day for the next billing cycle calculation

#### Scenario: Invalid closing day rejected

- **WHEN** the user enters a closing day outside the range 1–31 and taps Save
- **THEN** the system SHALL prevent saving and display a validation error "請輸入有效日期（1–31）"

#### Scenario: Update auto-debit account

- **WHEN** the user selects a different bank account as the auto-debit source and saves
- **THEN** the system SHALL update the credit card record so future pending-debit records reference the new bank account

#### Scenario: Clear auto-debit account

- **WHEN** the user deselects the auto-debit account (sets to none) and saves
- **THEN** the system SHALL store null for auto_debit_account_id on the credit card

---

### Requirement: updateAccount data function

The system SHALL expose an `updateAccount(accountId, fields)` function in `src/lib/accounts.ts` that accepts a partial set of editable fields and persists them to the `accounts` table. For credit card accounts, it SHALL also update the corresponding `credit_cards` table row.

#### Scenario: Update non-credit-card account

- **WHEN** `updateAccount` is called with a new name and currency for a bank account
- **THEN** the system SHALL update the `accounts` row and return `{ error: null }`

#### Scenario: Update credit card account settings

- **WHEN** `updateAccount` is called with closing_day, due_day, and auto_debit_account_id for a credit card account
- **THEN** the system SHALL update both the `accounts` row (name, currency) and the `credit_cards` row (closing_day, due_day, auto_debit_account_id)

#### Scenario: Account not found

- **WHEN** `updateAccount` is called with an accountId that does not exist
- **THEN** the system SHALL return `{ error: '找不到此帳戶' }`

---

### Requirement: EditAccountModal is keyboard-aware

The EditAccountModal SHALL wrap its content in a `KeyboardAvoidingView` with `behavior="padding"` on iOS and `behavior="height"` on Android, combined with a `ScrollView` with `keyboardShouldPersistTaps="handled"`. The keyboard SHALL NOT obscure any input field in the modal.

#### Scenario: Name field visible when keyboard opens

- **WHEN** the user opens the edit modal and taps the account name field
- **THEN** the keyboard SHALL appear and all form fields SHALL remain visible above the keyboard without being obscured
