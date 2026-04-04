import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) throw new Error('Database not initialized. Call initDb() first.');
  return _db;
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: '001_initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        linked_user_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'TWD',
        initial_balance REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        emoji TEXT,
        parent_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
        is_default INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        interval TEXT,
        start_date TEXT,
        end_date TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_category_budgets (
        id TEXT PRIMARY KEY NOT NULL,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        budget_amount REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        notes TEXT,
        payer_type TEXT NOT NULL DEFAULT 'self',
        contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
        is_income INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS debt_records (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
        contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        original_amount REAL NOT NULL,
        repaid_amount REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'TWD',
        status TEXT NOT NULL DEFAULT 'outstanding',
        dispute_note TEXT,
        created_at TEXT NOT NULL,
        settled_at TEXT
      );

      CREATE TABLE IF NOT EXISTS recurring_templates (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        notes TEXT,
        frequency TEXT NOT NULL,
        subtype TEXT NOT NULL DEFAULT 'expense',
        contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        last_generated_date TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS exchange_rates (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        currency TEXT NOT NULL,
        rate_to_twd REAL NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, currency)
      );

      CREATE TABLE IF NOT EXISTS credit_cards (
        id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        statement_closing_day INTEGER NOT NULL,
        payment_due_day INTEGER NOT NULL,
        auto_debit_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS credit_card_reward_rules (
        id TEXT PRIMARY KEY NOT NULL,
        credit_card_id TEXT NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        merchant_name TEXT,
        reward_rate REAL NOT NULL,
        reward_type TEXT NOT NULL,
        monthly_cap REAL,
        min_spend_threshold REAL,
        deposit_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
        points_conversion_rate REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reward_accumulations (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        rule_id TEXT NOT NULL REFERENCES credit_card_reward_rules(id) ON DELETE CASCADE,
        year_month TEXT NOT NULL,
        earned_amount REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        UNIQUE(rule_id, year_month)
      );

      CREATE TABLE IF NOT EXISTS pending_reward_deposits (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        credit_card_id TEXT NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
        amount REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, credit_card_id)
      );

      CREATE TABLE IF NOT EXISTS credit_card_bills (
        id TEXT PRIMARY KEY NOT NULL,
        credit_card_id TEXT NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        billing_period_start TEXT NOT NULL,
        billing_period_end TEXT NOT NULL,
        total_amount REAL,
        cashback_offset REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        storage_path TEXT,
        created_at TEXT NOT NULL,
        reconciled_at TEXT
      );

      CREATE TABLE IF NOT EXISTS bill_line_items (
        id TEXT PRIMARY KEY NOT NULL,
        bill_id TEXT NOT NULL REFERENCES credit_card_bills(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        merchant TEXT NOT NULL,
        amount REAL NOT NULL,
        matched_transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
        is_checked INTEGER NOT NULL DEFAULT 0,
        date_offset_days INTEGER NOT NULL DEFAULT 0,
        is_manually_added INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pending_debits (
        id TEXT PRIMARY KEY NOT NULL,
        credit_card_id TEXT NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
        bill_id TEXT NOT NULL REFERENCES credit_card_bills(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        due_date TEXT NOT NULL,
        source_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        executed_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id, parent_id);
      CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_debt_records_contact ON debt_records(user_id, contact_id);
    `,
  },
];

// ---------------------------------------------------------------------------
// initDb
// ---------------------------------------------------------------------------

export async function initDb(): Promise<void> {
  const db = await SQLite.openDatabaseAsync('accounting.db');

  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create migrations tracking table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Apply pending migrations
  for (const migration of MIGRATIONS) {
    const row = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM _migrations WHERE name = ?',
      [migration.name]
    );
    if (!row) {
      await db.execAsync(migration.sql);
      await db.runAsync(
        'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)',
        [migration.name, new Date().toISOString()]
      );
    }
  }

  _db = db;
}
