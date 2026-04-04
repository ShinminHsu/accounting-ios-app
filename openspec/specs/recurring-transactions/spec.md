# recurring-transactions Specification

## Purpose

TBD - created by archiving change 'ios-accounting-app'. Update Purpose after archive.

## Requirements

### Requirement: Recurring transaction template

The system SHALL allow the user to create a recurring transaction template with: amount (required), category (required), account (required), project (optional), notes (optional), frequency (daily / weekly / monthly / yearly, required), start date (required), end date (optional), and transaction subtype (expense / paid-for-other / investment-contribution).

#### Scenario: Create a monthly recurring expense

- **WHEN** user creates a recurring template for "Rent, 15,000 TWD, monthly, starting 2026-04-01"
- **THEN** the system SHALL schedule the first instance for 2026-04-01 and each subsequent instance on the 1st of every month

#### Scenario: Create a recurring proxy payment

- **WHEN** user creates a recurring template with subtype "paid-for-other" specifying a contact
- **THEN** each generated instance SHALL create a receivable record for that contact in addition to the cash outflow

---
### Requirement: Auto-generate transaction instances

The system SHALL check for due recurring instances on each app open. If one or more instances are due (start date ≤ today and not yet generated), the system SHALL automatically create the transaction records and update account balances and budgets accordingly.

#### Scenario: App opened after missing two monthly instances

- **WHEN** user opens the app and two monthly instances of a recurring template are overdue
- **THEN** the system SHALL generate both transactions immediately and display a notice listing the auto-created records

#### Scenario: Recurring template with end date reached

- **WHEN** app open check finds that today is past the template's end date and all instances have been generated
- **THEN** the system SHALL mark the template as completed and stop generating new instances

---
### Requirement: Edit and cancel recurring templates

The system SHALL allow the user to edit a recurring template's amount, category, account, or notes. Changes SHALL apply to future instances only; already-generated transactions SHALL NOT be modified. The user SHALL be able to cancel a template, which stops all future generation but preserves past transactions.

#### Scenario: Edit amount on active template

- **WHEN** user changes the amount on an active recurring template
- **THEN** the system SHALL apply the new amount to all instances generated after the edit date; previously generated instances remain unchanged

#### Scenario: Cancel a recurring template

- **WHEN** user cancels a recurring template
- **THEN** the system SHALL set the template status to cancelled; no further instances SHALL be generated; all past transactions remain in the ledger

---
### Requirement: View recurring templates

The system SHALL provide a list view of all active recurring templates showing: name/notes, frequency, next due date, amount, and account. Completed and cancelled templates SHALL be accessible in a separate archived section.

#### Scenario: View active recurring list

- **WHEN** user navigates to recurring transactions settings
- **THEN** the system SHALL display all active templates sorted by next due date ascending
