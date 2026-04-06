## ADDED Requirements

### Requirement: Ledger data model

The system SHALL store ledgers in a `ledgers` table with columns: `id TEXT PRIMARY KEY`, `owner_user_id TEXT NOT NULL`, `name TEXT NOT NULL`, `is_personal INTEGER NOT NULL DEFAULT 0`, `start_date TEXT`, `end_date TEXT`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`. The system SHALL store ledger members in a `ledger_members` table with columns: `id TEXT PRIMARY KEY`, `ledger_id TEXT NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE`, `user_id TEXT NOT NULL`, `status TEXT NOT NULL DEFAULT 'active'` (values: 'invited', 'active'), `joined_at TEXT`, `created_at TEXT NOT NULL`.

#### Scenario: Schema created on migration

- **WHEN** `initDb()` runs migration `004_ledgers`
- **THEN** `ledgers` and `ledger_members` tables exist with the above columns

### Requirement: Personal ledger initialization

The system SHALL create exactly one personal ledger per user (`is_personal = 1`) during app startup via `seedPersonalLedger(userId)`. If a personal ledger already exists for the user, the function SHALL return without creating a duplicate.

#### Scenario: First-time user gets personal ledger

- **WHEN** `seedPersonalLedger(userId)` is called and no personal ledger exists for the user
- **THEN** a new ledger record is created with `is_personal = 1`, `name = '個人'`, `owner_user_id = userId`

#### Scenario: Existing personal ledger is not duplicated

- **WHEN** `seedPersonalLedger(userId)` is called and a personal ledger already exists
- **THEN** no new ledger record is created

### Requirement: Create shared ledger

The system SHALL allow a user to create a new shared ledger (`is_personal = 0`) with a required name and optional start/end dates. The owner MUST be automatically added to `ledger_members` with `status = 'active'`.

#### Scenario: Shared ledger created

- **WHEN** user calls `createLedger(userId, name, startDate, endDate)`
- **THEN** a new ledger row is inserted with `is_personal = 0` and an `ledger_members` row for `userId` with `status = 'active'`

### Requirement: Fetch user's ledgers

The system SHALL provide `fetchLedgers(userId)` that returns all ledgers where the user is a member with `status = 'active'`, ordered by `is_personal DESC, created_at ASC` (personal ledger first).

#### Scenario: Returns personal and shared ledgers

- **WHEN** `fetchLedgers(userId)` is called
- **THEN** the result includes the personal ledger first, then all shared ledgers the user has joined

### Requirement: Delete shared ledger

The system SHALL allow only the owner of a shared ledger to delete it. Deleting a ledger SHALL cascade-delete all `ledger_members` rows. The personal ledger (`is_personal = 1`) SHALL NOT be deletable.

#### Scenario: Owner deletes shared ledger

- **WHEN** `deleteLedger(ledgerId, userId)` is called by the owner
- **THEN** the ledger and its members are deleted; returns `{ error: null }`

#### Scenario: Non-owner cannot delete

- **WHEN** `deleteLedger(ledgerId, userId)` is called by a non-owner
- **THEN** returns `{ error: '只有帳本建立者可以刪除帳本' }`

#### Scenario: Personal ledger cannot be deleted

- **WHEN** `deleteLedger(ledgerId, userId)` is called on a personal ledger
- **THEN** returns `{ error: '個人帳本無法刪除' }`
