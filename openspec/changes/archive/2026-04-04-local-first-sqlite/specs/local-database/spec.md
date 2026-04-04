## ADDED Requirements

### Requirement: Database initialization on app start

The system SHALL open (or create) a SQLite database file named `accounting.db` on every app start before any UI is rendered. The system SHALL apply all pending migrations in ascending order. The system SHALL export a `getDb()` function that returns the open database instance.

#### Scenario: First launch creates schema

- **WHEN** the app is launched for the first time (no `accounting.db` exists)
- **THEN** the system SHALL create the database file and run migration `001_initial_schema`, creating all personal tables

#### Scenario: Subsequent launch skips applied migrations

- **WHEN** the app is launched and `accounting.db` already exists with all migrations applied
- **THEN** the system SHALL open the database and skip all migrations (no DDL executed)

#### Scenario: Future migration added

- **WHEN** a new migration (e.g., `002_add_column`) is added to the migration list and the app launches
- **THEN** the system SHALL apply only the new migration and record it in `_migrations`

### Requirement: Personal table schema

The SQLite database SHALL contain the following tables with the column definitions below. All `id` columns are `TEXT PRIMARY KEY` (client-generated UUID). All `created_at` / `updated_at` columns are `TEXT` (ISO-8601 string).

Tables: `contacts`, `accounts`, `categories`, `projects`, `project_category_budgets`, `transactions`, `debt_records`, `recurring_templates`, `exchange_rates`, `credit_cards`, `credit_card_reward_rules`, `reward_accumulations`, `pending_reward_deposits`, `credit_card_bills`, `bill_line_items`, `pending_debits`.

Foreign key constraints SHALL be enabled via `PRAGMA foreign_keys = ON` on every connection open.

#### Scenario: Schema integrity enforced

- **WHEN** code attempts to insert a `transaction` row with a `category_id` that does not exist in `categories`
- **THEN** SQLite SHALL reject the insert with a foreign key constraint error

### Requirement: Migration table tracks applied migrations

The system SHALL maintain a `_migrations` table with columns `name TEXT PRIMARY KEY` and `applied_at TEXT`. Each migration is recorded by name after successful execution.

#### Scenario: Migration recorded after execution

- **WHEN** migration `001_initial_schema` runs successfully
- **THEN** a row `{ name: '001_initial_schema', applied_at: <ISO timestamp> }` SHALL exist in `_migrations`

### Requirement: WAL mode enabled

The system SHALL enable WAL (Write-Ahead Logging) mode via `PRAGMA journal_mode = WAL` after opening the database. This allows concurrent reads during writes.

#### Scenario: WAL mode active after init

- **WHEN** `initDb()` completes
- **THEN** `PRAGMA journal_mode` SHALL return `wal`
