# transaction-core Specification

## Purpose

TBD - created by archiving change 'ios-accounting-app'. Update Purpose after archive.

## Requirements

### Requirement: Record a transaction

The system SHALL allow the user to create a transaction with the following fields: amount (required), date (required, defaults to today), category (required), subcategory (optional), account (required), project (optional), notes (optional), and payer type (self / paid-by-other / paid-for-other).

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
- **THEN** the system SHALL reject the submission and display a validation error

---
### Requirement: Edit a transaction

The system SHALL allow the user to edit any field of an existing transaction except payer type after a debt record has been linked.

#### Scenario: Edit amount of a normal transaction

- **WHEN** user changes the amount of an existing self-paid transaction
- **THEN** the system SHALL update the account balance delta and budget impact to reflect the new amount

#### Scenario: Attempt to change payer type after debt is linked

- **WHEN** user attempts to change payer type on a transaction that has a linked liability or receivable record
- **THEN** the system SHALL prevent the change and display an explanation that the debt record must be removed first

---
### Requirement: Delete a transaction

The system SHALL allow the user to delete a transaction. If the transaction has a linked debt record (liability or receivable), both records SHALL be deleted together.

#### Scenario: Delete a transaction with linked debt

- **WHEN** user deletes a transaction that has a linked liability record
- **THEN** the system SHALL delete both the transaction and its linked liability record, and reverse the budget impact

#### Scenario: Delete a normal transaction

- **WHEN** user deletes a self-paid transaction
- **THEN** the system SHALL remove the transaction and reverse the account balance and budget impact

---
### Requirement: View transactions by date

The system SHALL display transactions in a calendar view where each day shows the total spent and a list of individual transactions when tapped.

#### Scenario: Tap a day with transactions

- **WHEN** user taps a day on the calendar that has at least one transaction
- **THEN** the system SHALL display all transactions for that day ordered by time descending

#### Scenario: Tap a day with no transactions

- **WHEN** user taps a day on the calendar with no transactions
- **THEN** the system SHALL display an empty state message
