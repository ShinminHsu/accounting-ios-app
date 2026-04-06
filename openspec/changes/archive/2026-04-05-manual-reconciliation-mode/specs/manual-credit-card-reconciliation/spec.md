## ADDED Requirements

### Requirement: Manual reconciliation entry point

The system SHALL display two reconciliation options on the idle state of the Reconciliation tab when the current bill is not yet reconciled: "上傳帳單" (upload flow) and "手動對帳" (manual flow). The manual option SHALL only be enabled after the current bill record has been loaded.

#### Scenario: User chooses manual reconciliation

- **WHEN** the current bill status is `pending` or `reconciling` and the user taps "手動對帳"
- **THEN** the system SHALL transition to the manual reconciliation view showing all transactions for the current billing period

#### Scenario: Bill already reconciled

- **WHEN** the current bill status is `reconciled`
- **THEN** the system SHALL NOT display either reconciliation entry point and SHALL show only the reconciled summary

---

### Requirement: Transaction list in manual reconciliation

The system SHALL fetch all expense transactions (`is_income = 0`) from the credit card's linked account where the transaction date falls within the current billing period (inclusive). The list SHALL be sorted by date descending.

#### Scenario: Transactions exist for the period

- **WHEN** the user enters manual reconciliation mode
- **THEN** the system SHALL display each transaction with: date, notes (merchant), amount, and an unchecked checkbox

#### Scenario: No transactions in the billing period

- **WHEN** there are zero expense transactions in the billing period for this account
- **THEN** the system SHALL display an empty state message "本期尚無消費記錄" and a disabled confirm button

---

### Requirement: Per-transaction confirmation toggle

The system SHALL allow the user to tap any transaction row to toggle its confirmed state. Confirmed rows SHALL display a filled checkbox. Unconfirmed rows SHALL display an empty checkbox.

#### Scenario: User taps an unchecked transaction

- **WHEN** user taps a transaction row that is not confirmed
- **THEN** the system SHALL mark it as confirmed and update the progress bar

#### Scenario: User taps a checked transaction

- **WHEN** user taps a transaction row that is confirmed
- **THEN** the system SHALL unmark it as confirmed and update the progress bar

---

### Requirement: Live progress bar

The system SHALL display a sticky bottom bar showing:
- Confirmed count in the format "已確認 X / N 筆" where X is confirmed count and N is total count
- Sum of confirmed transaction amounts in the format "NT$ [amount]"
- A "確認對帳完成" button

#### Scenario: Progress updates on toggle

- **WHEN** the user confirms or unconfirms a transaction
- **THEN** the confirmed count and amount sum SHALL update immediately without any loading state

---

### Requirement: Confirm manual reconciliation

The system SHALL allow the user to confirm reconciliation from the manual view. If not all transactions are confirmed, the system SHALL display a warning alert listing unconfirmed count and requiring explicit confirmation before proceeding. On confirmation, the system SHALL save bill line items and call the reconciliation completion path (same as upload flow), setting bill status to `reconciled` and creating a pending-debit record.

#### Scenario: All transactions confirmed

- **WHEN** user taps "確認對帳完成" and all transactions are checked
- **THEN** the system SHALL immediately save and complete reconciliation without showing a warning

#### Scenario: Some transactions unconfirmed

- **WHEN** user taps "確認對帳完成" and one or more transactions are unchecked
- **THEN** the system SHALL display an alert: "仍有 N 筆未確認，確定要完成對帳？" with "返回檢查" (cancel) and "確定完成" (proceed) options

#### Scenario: Reconciliation completes successfully

- **WHEN** user confirms completion (with or without warning)
- **THEN** the system SHALL transition to the `done` step and display the reconciliation summary

---

### Requirement: fetchTransactionsForCard data access

The system SHALL expose a `fetchTransactionsForCard(accountId, billingStart, billingEnd)` function in the reconciliation library. This function SHALL return all expense transactions with `account_id = accountId` and `date >= billingStart` and `date <= billingEnd`, ordered by date descending. The date range SHALL be exact (no ±3 day extension).

#### Scenario: Fetch returns transactions in period

- **WHEN** called with a valid accountId and date range containing 5 transactions
- **THEN** the function SHALL return all 5 transactions ordered by date descending

#### Scenario: Fetch returns empty for no transactions

- **WHEN** called with a date range containing no expense transactions
- **THEN** the function SHALL return an empty array
