## Context

The app currently targets Supabase for all data storage, but the Supabase tables were never created. The app owner is also the Supabase project admin, which means they can view other users' financial records in the Dashboard — a privacy violation for any multi-user scenario. The fix is to move all personal financial data to on-device SQLite and keep Supabase only for identity and friend-sync.

## Goals / Non-Goals

**Goals:**
- All personal financial data (accounts, transactions, categories, projects, debts, credit cards, etc.) stored in on-device SQLite
- Supabase used only for: Auth, `users` (push token + display name for friend notifications), `friendships`, `shared_transactions`
- No schema changes required in Supabase Dashboard — personal tables are never created there
- Function signatures in `src/lib/` remain the same so screens need no changes
- Default categories seeded on first app open (not dependent on any network call)

**Non-Goals:**
- Cloud backup of personal data
- Multi-device sync for personal data
- Offline-capable friend sync

## Decisions

### Use expo-sqlite v14+ (new API)

expo-sqlite ships with Expo SDK 51+ and uses a modern async API (`openDatabaseAsync`, `runAsync`, `getAllAsync`). It supports WAL mode and foreign keys out of the box. No extra package beyond what Expo already provides.

Alternative considered: `op-sqlite` (faster but requires bare workflow / native build config). Rejected because the project uses Expo managed workflow.

### Single database file, schema versioned by a `_migrations` table

All personal tables live in one SQLite file (`accounting.db`). A `_migrations` table tracks which SQL migration scripts have been applied. On every app start, `initDb()` runs pending migrations in order. This makes future schema changes safe without wiping data.

Alternative considered: Dropping and recreating tables on version bump. Rejected because it loses user data.

### UUIDs generated on client with `crypto.randomUUID()`

React Native 0.73+ exposes `crypto.randomUUID()` globally. All `id` fields in SQLite use TEXT PRIMARY KEY with client-generated UUIDs. This matches the existing TypeScript types (all ids are `string`).

Alternative considered: Auto-increment INTEGER PKs. Rejected because existing types and Supabase shared_transactions reference UUIDs.

### Keep existing TypeScript interfaces in `database.ts` unchanged

SQLite lib functions return plain objects that are cast to the existing interfaces. No type changes cascade to screens.

### Supabase tables to keep (create these in Dashboard)

Only three tables need to exist in Supabase:
1. `users` — `id` (uuid, FK to auth.users), `display_name` text, `push_token` text, `created_at`
2. `friendships` — same schema as current
3. `shared_transactions` — same schema as current

RLS policies: same as current design.

### Bill PDF/image storage

`CreditCardBill.storage_path` currently points to Supabase Storage. With local-first, uploaded files are stored in the app's local filesystem via `expo-file-system` (already in package.json). `storage_path` will store a local file URI instead of a Supabase Storage path. The Gemini OCR call (reconciliation) sends the file bytes directly; no Supabase Storage upload needed.

## Risks / Trade-offs

- [Data loss on app uninstall / phone wipe] → Acceptable for v1; user is aware. Future: iCloud/Google Drive backup.
- [SQLite query complexity vs Supabase PostgREST] → More verbose SQL but full control; no network latency for reads.
- [expo-sqlite not available in Expo Go web] → App targets iOS device only; not a concern.
- [`crypto.randomUUID()` availability] → Available in React Native 0.73+ (project uses 0.81.5); confirmed safe.

## Migration Plan

1. Add `expo-sqlite` to package.json (already bundled with Expo SDK 54, just needs explicit import)
2. Create `src/lib/db.ts` — opens DB, runs migrations, exports `getDb()`
3. Create migration `001_initial_schema.sql` (inline in db.ts) — all personal table DDL
4. Rewrite each lib module to use SQLite (`accounts.ts`, `categories.ts`, etc.)
5. Remove all Supabase personal-table queries; keep `supabase.ts` for auth + friends
6. In Supabase Dashboard: create only `users`, `friendships`, `shared_transactions` with RLS
7. Test: register → categories auto-seeded → add account → add transaction
