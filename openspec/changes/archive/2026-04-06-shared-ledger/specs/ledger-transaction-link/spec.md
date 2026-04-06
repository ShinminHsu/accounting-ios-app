## ADDED Requirements

### Requirement: Transaction ledger association

The `transactions` table SHALL have a nullable `ledger_id TEXT REFERENCES ledgers(id) ON DELETE SET NULL` column added via migration `004_ledgers`. A `NULL` value for `ledger_id` MUST be treated as belonging to the user's personal ledger in all query and display logic.

#### Scenario: New column added without breaking existing rows

- **WHEN** migration `004_ledgers` runs on a database with existing transactions
- **THEN** all existing transactions have `ledger_id = NULL` and the app treats them as personal ledger transactions

### Requirement: Default ledger on create

When `createTransaction` is called without a `ledgerId`, the system SHALL default to `NULL` (personal ledger). When called with a `ledgerId`, the system SHALL store that value in `transactions.ledger_id`.

#### Scenario: Transaction created without ledger selection

- **WHEN** user saves a transaction without choosing a ledger
- **THEN** the transaction is stored with `ledger_id = NULL`

#### Scenario: Transaction created with shared ledger selected

- **WHEN** user saves a transaction with a shared ledger selected
- **THEN** the transaction is stored with `ledger_id` set to the selected ledger's ID

### Requirement: Fetch transactions by ledger

`fetchTransactionsForMonth(userId, year, month, ledgerId?)` SHALL accept an optional `ledgerId`. When `ledgerId` is `null` or omitted, the query SHALL return only transactions where `ledger_id IS NULL` (personal ledger). When `ledgerId` is a specific ledger ID, the query SHALL return all transactions with that `ledger_id`.

#### Scenario: Personal ledger view shows personal transactions

- **WHEN** `fetchTransactionsForMonth(userId, year, month)` is called without ledgerId
- **THEN** only transactions with `ledger_id IS NULL` are returned

#### Scenario: Shared ledger view shows shared transactions

- **WHEN** `fetchTransactionsForMonth(userId, year, month, sharedLedgerId)` is called
- **THEN** only transactions with `ledger_id = sharedLedgerId` are returned

### Requirement: Project + ledger co-selection

A transaction SHALL be permitted to have both a `ledger_id` (shared ledger) and a `project_id` (personal budget) set simultaneously. The two fields are independent.

#### Scenario: Transaction linked to both shared ledger and personal project

- **WHEN** user selects both a shared ledger and a personal project while recording a transaction
- **THEN** the transaction is stored with both `ledger_id` and `project_id` set
