# account-management Specification (Delta)

## MODIFIED Requirements

### Requirement: Edit and delete accounts

The system SHALL allow editing an account's name, currency, and type-specific settings via an edit modal accessible from the Assets screen account list. The system SHALL allow deletion of an account only if it has zero transactions and zero balance.

Editable fields by account type:
- **All types**: name (required), currency
- **Credit card only**: closing day (1–31), due day (1–31), auto-debit bank account (optional)

The account type SHALL NOT be changeable after creation.

#### Scenario: Open edit modal from account row

- **WHEN** the user taps an account row in the Assets screen
- **THEN** the system SHALL open an edit modal pre-filled with the account's current settings

#### Scenario: Save edited account name

- **WHEN** the user updates the account name in the edit modal and taps Save
- **THEN** the system SHALL persist the change and reflect it immediately in the Assets screen

#### Scenario: Delete account with transactions

- **WHEN** user attempts to delete an account that has one or more transactions
- **THEN** the system SHALL prevent deletion and display an explanation

#### Scenario: Delete empty account

- **WHEN** user deletes an account with no transactions and zero balance
- **THEN** the system SHALL remove the account from the list
