# friend-sync Specification

## Purpose

TBD - created by archiving change 'ios-accounting-app'. Update Purpose after archive.

## Requirements

### Requirement: Friend relationship

The system SHALL allow the user to add another app user as a friend by searching their registered email. A friendship SHALL be bilateral: both parties must accept before shared transactions can flow between them. The system SHALL support multiple independent friend relationships simultaneously.

#### Scenario: Send friend request

- **WHEN** user searches an email and sends a friend request
- **THEN** the system SHALL create a pending friendship record; the recipient SHALL receive a push notification

#### Scenario: Accept friend request

- **WHEN** recipient accepts the friend request
- **THEN** the system SHALL mark the friendship as active and enable shared transaction sync between both users

#### Scenario: Search email not found

- **WHEN** user searches an email that has no registered account
- **THEN** the system SHALL display "No account found with that email"

---
### Requirement: Shared transaction sync

When either user in an active friendship records a "paid-for-other" transaction naming the other friend as the contact, the system SHALL automatically write a shared transaction event to Supabase. The receiving user's app SHALL create a corresponding liability record automatically without requiring manual confirmation.

#### Scenario: Friend records payment on my behalf

- **WHEN** friend records a "paid-for-other" transaction of 500 TWD naming me as the contact
- **THEN** my app SHALL automatically create a liability record of 500 TWD owed to that friend, count the 500 TWD as an expense against my budget in the specified category, and display a push notification

#### Scenario: I record payment on friend's behalf

- **WHEN** I record a "paid-for-other" transaction of 300 TWD naming a friend as the contact
- **THEN** my app SHALL create a receivable of 300 TWD and a cash outflow; the friend's app SHALL automatically create a liability of 300 TWD owed to me

---
### Requirement: Data privacy

The system SHALL ensure that private data (personal transactions, account balances, budgets, categories, credit card details) is never accessible to friends. Only shared transaction events (payer, payee, amount, date, category, notes) SHALL be visible across friend relationships.

#### Scenario: Friend cannot read my transactions

- **WHEN** a friend's app queries Supabase
- **THEN** Supabase Row Level Security SHALL return only shared transaction events where that friend is a participant; all personal transaction records SHALL be inaccessible

---
### Requirement: Dispute a shared transaction

The system SHALL allow the receiving user to flag a shared transaction as disputed. A disputed shared transaction SHALL retain its liability record but SHALL be visually marked. The disputing user MAY add a note explaining the dispute.

#### Scenario: Dispute an automatically created liability

- **WHEN** user flags a received shared transaction as disputed
- **THEN** the system SHALL mark the liability as disputed, preserve the balance impact, and display the dispute indicator in the debt tracking view

---
### Requirement: Remove a friend

The system SHALL allow the user to remove a friend. Removing a friend SHALL stop future shared transaction sync. Existing debt records created from past shared transactions SHALL remain and continue to be tracked.

#### Scenario: Remove friend stops new sync

- **WHEN** user removes a friend
- **THEN** the system SHALL deactivate the friendship; any subsequent "paid-for-other" transactions by either party naming the other SHALL NOT create shared events
