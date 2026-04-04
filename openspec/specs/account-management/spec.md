# account-management Specification

## Purpose

TBD - created by archiving change 'ios-accounting-app'. Update Purpose after archive.

## Requirements

### Requirement: Supported account types

The system SHALL support the following account types: Cash, Bank Account, E-Payment (e.g., LINE Pay, 街口), Credit Card, and Investment (balance-only, no P&L tracking). Accounts SHALL be classified as either Asset (Cash, Bank Account, E-Payment, Investment) or Liability (Credit Card).

#### Scenario: View accounts overview

- **WHEN** user navigates to the Accounts screen
- **THEN** the system SHALL display all accounts grouped by Asset and Liability, each account's balance in its original currency, and a net worth total converted to TWD using configured exchange rates

---
### Requirement: Manual exchange rate configuration

The system SHALL provide a settings screen where the user can manually set the exchange rate for each supported foreign currency against TWD. Exchange rates SHALL be stored locally and applied at display time. The system SHALL NOT fetch live exchange rates automatically.

#### Scenario: Set exchange rate for USD

- **WHEN** user enters an exchange rate of 32.5 for USD in settings
- **THEN** the system SHALL use 1 USD = 32.5 TWD for all balance conversions until the rate is changed

#### Scenario: No exchange rate configured for a currency

- **WHEN** an account has a currency whose exchange rate has not been set
- **THEN** the system SHALL display the account balance in its original currency and exclude it from the TWD net worth total, with a visible warning indicator

---
### Requirement: Create an account

The system SHALL allow the user to create a new account with: name (required), type (required), initial balance (required, defaults to 0), and currency (required, defaults to TWD). Supported currencies SHALL include at minimum: TWD, USD, JPY, EUR, HKD, CNY.

#### Scenario: Create a bank account

- **WHEN** user submits a new bank account with name and initial balance
- **THEN** the system SHALL create the account and reflect its balance in the accounts overview immediately

#### Scenario: Create a credit card account

- **WHEN** user creates a credit card account
- **THEN** the system SHALL additionally prompt for: statement closing day (1–31), payment due day (1–31), and auto-debit bank account (optional); these settings SHALL be editable later in credit card settings

---
### Requirement: Account balance reflects transactions

The system SHALL maintain each account's balance as: initial balance plus all inflows minus all outflows recorded against that account. Credit card account balance SHALL represent the outstanding amount owed (positive = you owe money).

#### Scenario: Record expense from bank account

- **WHEN** a self-paid transaction is recorded against a bank account
- **THEN** the system SHALL reduce the bank account balance by the transaction amount

#### Scenario: Record expense paid by someone else

- **WHEN** a "paid-by-other" transaction is recorded
- **THEN** the system SHALL NOT change any account balance (expense is tracked in budget but cash has not moved)

---
### Requirement: Edit and delete accounts

The system SHALL allow renaming an account and updating its settings. The system SHALL allow deletion of an account only if it has zero transactions and zero balance.

#### Scenario: Delete account with transactions

- **WHEN** user attempts to delete an account that has one or more transactions
- **THEN** the system SHALL prevent deletion and display an explanation

#### Scenario: Delete empty account

- **WHEN** user deletes an account with no transactions and zero balance
- **THEN** the system SHALL remove the account from the list
