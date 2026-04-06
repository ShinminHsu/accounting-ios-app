## MODIFIED Requirements

### Requirement: Record a transaction

The system SHALL allow the user to create a transaction with the following fields: amount (required), date (required, defaults to today), category (required), subcategory (optional), account (required unless payer type is paid-by-other), ledger (optional, defaults to personal ledger represented as NULL), project (optional), notes (optional), name (optional), and payer type (self / paid-by-other / paid-for-other).

#### Scenario: Record a normal expense

- **WHEN** user submits a transaction with payer type "self"
- **THEN** the system SHALL create one transaction record, deduct the amount from the selected account balance, and count the amount against the selected project/category budget

#### Scenario: Record an expense paid by someone else

- **WHEN** user submits a transaction with payer type "paid-by-other" and selects a contact
- **THEN** the system SHALL create one expense record (counts against budget, does not reduce account balance) and one liability record linked to the contact for the same amount

#### Scenario: Record a payment made for someone else

- **WHEN** user submits a transaction with payer type "paid-for-other" and selects a contact
- **THEN** the system SHALL create one cash outflow record (reduces account balance) and one receivable record linked to the contact; no expense is counted against any budget

#### Scenario: Amount is zero or negative

- **WHEN** user submits a transaction with amount ≤ 0
- **THEN** the system SHALL reject the transaction with error "請輸入有效金額"

#### Scenario: Transaction recorded in shared ledger

- **WHEN** user selects a shared ledger and submits the transaction
- **THEN** the transaction is stored with `ledger_id` set to the shared ledger ID; it appears in the shared ledger view but not in the personal ledger view
