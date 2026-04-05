## ADDED Requirements

### Requirement: Screen renamed to 借還款追蹤

The debt tracking screen title and all navigation labels referring to this screen SHALL use "借還款追蹤". The term "負債追蹤" SHALL NOT appear in any visible UI label.

#### Scenario: Screen title is 借還款追蹤

- **WHEN** the user navigates to the debt tracking screen
- **THEN** the screen title SHALL display "借還款追蹤"

#### Scenario: More screen menu label updated

- **WHEN** the user views the More tab menu
- **THEN** the menu item for debt tracking SHALL be labelled "借還款追蹤" not "負債追蹤"

---

### Requirement: Paid-by-other and paid-for-other transactions visible in tracker

Transactions recorded with `payer_type = paid_by_other` or `payer_type = paid_for_other` SHALL appear in the 借還款追蹤 screen. Each such transaction SHALL generate a debt record that is displayed in the tracker with the payer/payee name (from `contact_id` or `payer_name`), amount, and date.

#### Scenario: Paid-by-other transaction appears in tracker

- **WHEN** a user records a transaction with payer type "別人付" (paid_by_other) with payer name "室友"
- **THEN** the 借還款追蹤 screen SHALL show a liability entry for "室友" with the transaction amount

#### Scenario: Paid-for-other transaction appears in tracker

- **WHEN** a user records a transaction with payer type "幫人付" (paid_for_other) with contact "同事"
- **THEN** the 借還款追蹤 screen SHALL show a receivable entry for "同事" with the transaction amount

#### Scenario: Free-text payer name shown in tracker

- **WHEN** a debt record was created from a transaction with `payer_name = "室友小明"` and `contact_id = null`
- **THEN** the 借還款追蹤 screen SHALL display "室友小明" as the party name for that record

## MODIFIED Requirements

### Requirement: Debt tracking view

The system SHALL provide a 借還款追蹤 screen showing: per-contact/payer-name summary of net balance (positive = they owe me, negative = I owe them), list of all outstanding individual debt records per party, and history of settled debt records. Parties identified only by `payer_name` (no saved contact) SHALL be grouped by their free-text name.

#### Scenario: Net balance across multiple debts

- **WHEN** user has two liabilities of 200 TWD and 300 TWD owed to "boyfriend" and one receivable of 100 TWD from "boyfriend"
- **THEN** the system SHALL display net balance as -400 TWD (I owe boyfriend 400 TWD)

#### Scenario: Free-text party grouped separately

- **WHEN** the user has two paid-by-other records with `payer_name = "室友小明"` and no saved contact
- **THEN** the screen SHALL show a single group for "室友小明" with both records listed
