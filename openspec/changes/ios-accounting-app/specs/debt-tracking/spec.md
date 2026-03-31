## ADDED Requirements

### Requirement: Liability record (others paid for me)

When a transaction is recorded with payer type "paid-by-other", the system SHALL automatically create a liability record linking the transaction to the selected contact for the full transaction amount. The liability SHALL be in the same currency as the transaction.

#### Scenario: Create liability from transaction

- **WHEN** user records a 500 TWD expense with payer type "paid-by-other" and contact "boyfriend"
- **THEN** the system SHALL create one expense transaction (counts against budget) and one liability of 500 TWD owed to "boyfriend"; account balances SHALL NOT change

#### Scenario: View total owed to a contact

- **WHEN** user views the debt summary for "boyfriend"
- **THEN** the system SHALL display the sum of all outstanding liability amounts owed to that contact

### Requirement: Receivable record (I paid for others)

When a transaction is recorded with payer type "paid-for-other", the system SHALL automatically create a receivable record linking the cash outflow to the selected contact. No expense is recorded against any project or category budget.

#### Scenario: Create receivable from transaction

- **WHEN** user records a 300 TWD payment with payer type "paid-for-other" and contact "colleague"
- **THEN** the system SHALL create one cash outflow from the selected account and one receivable of 300 TWD owed by "colleague"; no budget category is affected

### Requirement: Record repayment

The system SHALL allow the user to record a repayment against an outstanding liability or receivable. A repayment SHALL specify: contact, amount, date, and source/destination account. Partial repayments SHALL be supported; a debt record is marked settled only when its total repaid amount equals its original amount.

#### Scenario: Full repayment of a liability

- **WHEN** user records a repayment of the full outstanding amount owed to a contact
- **THEN** the system SHALL create a cash outflow transaction from the specified account, reduce the liability balance to zero, and mark the liability as settled

#### Scenario: Partial repayment

- **WHEN** user records a repayment less than the outstanding liability amount
- **THEN** the system SHALL reduce the liability balance by the repaid amount and keep the record as outstanding

#### Scenario: Repayment amount exceeds outstanding balance

- **WHEN** user enters a repayment amount greater than the remaining outstanding balance
- **THEN** the system SHALL reject the submission and display a validation error

### Requirement: Debt tracking view

The system SHALL provide a debt tracking screen showing: per-contact summary of net balance (positive = they owe me, negative = I owe them), list of all outstanding individual debt records per contact, and history of settled debt records.

#### Scenario: Net balance across multiple debts

- **WHEN** user has two liabilities of 200 TWD and 300 TWD owed to "boyfriend" and one receivable of 100 TWD from "boyfriend"
- **THEN** the system SHALL display net balance as -400 TWD (I owe boyfriend 400 TWD)

### Requirement: Disputed debt record

The system SHALL allow the user to flag any debt record as disputed. Disputed records SHALL remain in the outstanding list but SHALL be visually distinguished. A disputed flag SHALL not affect balance calculations.

#### Scenario: Flag a debt as disputed

- **WHEN** user marks a liability as disputed
- **THEN** the system SHALL display a dispute indicator on the record and retain it in the outstanding balance calculation
