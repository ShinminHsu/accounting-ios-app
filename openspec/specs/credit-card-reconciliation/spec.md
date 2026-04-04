# credit-card-reconciliation Specification

## Purpose

TBD - created by archiving change 'ios-accounting-app'. Update Purpose after archive.

## Requirements

### Requirement: Bill upload and OCR parsing

The system SHALL allow the user to upload a credit card bill as a PDF file or image screenshot. The system SHALL send the file to Gemini API (gemini-2.0-flash) and receive a structured list of line items, each containing: date (YYYY-MM-DD), merchant name, and amount in the card's currency.

#### Scenario: Successful bill parse

- **WHEN** user uploads a valid credit card bill PDF
- **THEN** the system SHALL display a list of parsed line items within 30 seconds, each showing date, merchant, and amount

#### Scenario: Parse fails or returns empty

- **WHEN** Claude API returns an error or zero line items
- **THEN** the system SHALL display an error message and allow the user to retry or enter items manually

---
### Requirement: Fuzzy matching against existing transactions

The system SHALL attempt to match each parsed line item against existing transactions on the same credit card account. A match SHALL be determined by: identical amount AND date within ±3 days. Matched items SHALL be pre-checked. Unmatched items SHALL be unchecked and flagged as "missing".

#### Scenario: Exact match found

- **WHEN** a parsed item has the same amount and same date as an existing transaction
- **THEN** the system SHALL pre-check that item and display it alongside the matched transaction record

#### Scenario: Date offset match (within ±3 days)

- **WHEN** a parsed item has the same amount but a date 1–3 days different from an existing transaction
- **THEN** the system SHALL pre-check the item but display a "date offset" badge showing the day difference

#### Scenario: No match found

- **WHEN** no existing transaction matches a parsed item's amount and date range
- **THEN** the system SHALL display the item as unchecked with a "missing" indicator

#### Scenario: Two parsed items with identical amount on nearby dates

- **WHEN** two parsed items could match the same existing transaction
- **THEN** the system SHALL match only the closest-date item and leave the other as unmatched

---
### Requirement: Confirmation and manual entry

The system SHALL allow the user to: check or uncheck any item, create a new transaction for any "missing" item inline, and edit the date or category of a newly created transaction before confirming.

#### Scenario: Create transaction for missing item

- **WHEN** user taps "Add" on an unmatched missing item
- **THEN** the system SHALL open a pre-filled transaction form with the parsed date, merchant as notes, and amount; user can adjust category before saving

#### Scenario: Confirm reconciliation with unchecked items remaining

- **WHEN** user attempts to confirm reconciliation while one or more items are unchecked
- **THEN** the system SHALL display a warning listing unchecked items and require explicit confirmation to proceed with unresolved items

---
### Requirement: Bill status and auto-debit record

The system SHALL track each bill's status: pending (not yet started), reconciling (in progress), reconciled (confirmed). Upon confirmation of reconciliation, the system SHALL:
1. Deduct any cashback-offset rewards earned this billing period from the total bill amount
2. Create a pending-debit record with: net amount (after reward offset), due date (from card settings), and source bank account (from card settings)

#### Scenario: Auto-debit record created on reconciliation

- **WHEN** user confirms reconciliation of a bill with total 5,000 TWD and 200 TWD cashback offset
- **THEN** the system SHALL create a pending-debit record for 4,800 TWD on the card's configured due date from the configured bank account

#### Scenario: Pending-debit executes on due date

- **WHEN** the app is opened on or after the pending-debit's due date
- **THEN** the system SHALL create a cash outflow transaction of the pending-debit amount from the designated bank account, and mark the pending-debit as executed

#### Scenario: Bill has unreconciled status at month end

- **WHEN** the card's statement closing date passes and the bill has not been reconciled
- **THEN** the system SHALL display a reminder notification and a badge on the credit card in the Accounts screen
