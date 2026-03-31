## Context

A personal iOS accounting app for a single primary user (with optional friend sync) to replace existing apps that lack: (1) budget-aware tracking of expenses paid by others, (2) credit card rewards calculation, and (3) integrated bill reconciliation. The app is distributed via TestFlight initially; public App Store launch is deferred.

Tech stack chosen during requirements discussion:
- **Frontend**: React Native with Expo (user has React familiarity; enables future Android port)
- **Backend**: Supabase (PostgreSQL + Realtime + Auth + Storage)
- **OCR**: Claude API (semantic parsing of credit card bill PDFs/screenshots)
- **Distribution**: TestFlight (Apple Developer account available)

No existing codebase — greenfield project.

## Goals / Non-Goals

**Goals:**
- Deliver all 10 capabilities defined in proposal as a working TestFlight build
- Implement double-entry debt model correctly so budget tracking works for proxy payments
- Design Supabase schema with private/shared data isolation from day one

**Non-Goals:**
- Investment P&L, stock prices, or portfolio analytics
- Android build
- Public App Store submission or in-app purchases
- Multi-tenant infrastructure or usage billing

## Decisions

### React Native with Expo managed workflow

Use Expo managed workflow (not bare) to avoid native Xcode configuration.

Alternatives considered:
- **Swift/SwiftUI**: Best native integration but requires learning Swift; high barrier given user's Python/React background
- **Expo bare workflow**: More native control, but managed is sufficient for all required features; Vision framework not needed since OCR is delegated to Claude API

### Supabase as backend

Use Supabase for auth, database, realtime subscriptions, and file storage.

Alternatives considered:
- **Firebase**: Good realtime, but vendor lock-in and Firestore document model is harder to query for financial reporting
- **Notion API**: Considered during discussion; rejected — not designed for structured financial data, API rate limits, no realtime
- **CloudKit**: Free and Apple-native, but iOS-only and no web dashboard for debugging schema

### Gemini API for bill OCR

Use Google Gemini 2.0 Flash (vision) to parse credit card bill PDFs and screenshots into structured JSON (date, merchant, amount). Gemini Flash is ~10–20x cheaper than Claude for this task (~$0.001–0.003 per bill scan) while providing sufficient accuracy for structured extraction.

Alternatives considered:
- **Claude API**: Higher quality but ~10–20x more expensive per scan; overkill for structured OCR
- **Apple Vision framework**: On-device, free, but outputs raw text — requires custom parsing logic per bank's bill format; fragile and high maintenance
- **GPT-4V**: Comparable to Claude in cost; Gemini Flash preferred for cost efficiency

Cost: ~$0.001–0.003 per bill scan; negligible for personal use.

### Double-entry debt model

Decouple expense recording from cash flow. When someone pays for the user:
- Record: `Expense` (hits project budget) + `Liability` (owes contact X)
- Cash/assets unchanged until repayment

When user pays for someone else:
- Record: `Cash outflow` + `Receivable` (contact X owes user)
- No expense recorded (not the user's consumption)

Alternatives considered:
- **Single-entry with debt flag**: Simpler, but cannot correctly attribute expenses to budget categories while deferring cash impact — the core pain point this app solves

### Supabase data isolation model

Private tables (transactions, accounts, budgets, categories) are owned by `user_id` with Row Level Security (RLS) policies — no other user can read them.

Shared data lives in a `shared_transactions` table: payment-on-behalf events written by the payer, readable by the payee. Friend relationships stored in a `friendships` table (bilateral: user_a, user_b, status).

The payee receives a Supabase Realtime notification; a local notification is shown. The payee's debt record is created automatically upon receipt (no manual confirmation required), but can be flagged as disputed.

### Navigation structure

Bottom tab bar with 5 tabs:
1. **Home** — monthly overview, account balances, pending items (unreconciled bills, outstanding debts)
2. **Ledger** — calendar view + daily transaction list; toggle to list view
3. **+** (center, always visible) — new transaction sheet; supports normal expense, debt (paid-by-others / paid-for-others), and recurring
4. **Projects** — project list with budget progress bars per category
5. **More** — Reports, Accounts (asset + liability unified), Credit Cards (reconciliation entry point), Debt Tracking, Friends, Settings

### Visual theme

Primary theme: Forest green (`#4A7C59`) + warm white (`#FAF8F3`) with sage green accents. Color tokens defined at design-system level; a second warm theme (coral + cream) can be added by swapping token values only.

### Credit card reconciliation flow

1. User uploads PDF or screenshot to Supabase Storage
2. App calls Claude API with file; receives structured array of `{ date, merchant, amount }`
3. App fuzzy-matches each item against existing transactions: same amount + date within ±3 days → auto-checked, flagged "date offset" if gap > 0
4. User reviews: unmatched items shown as "missing" for manual entry
5. On confirmation: bill-offset rewards deducted from total; `pending_debit` record created for due date + designated bank account
6. Bill status transitions: `pending` → `reconciling` → `reconciled`

### Recurring transactions

A `recurring_templates` table stores: frequency (daily/weekly/monthly/yearly), start date, end date (optional), and a transaction prototype. A background job (Supabase Edge Function on cron) or on-app-open check creates due instances. Supports: regular expenses, investment contributions (定期定額), recurring proxy payments.

## Risks / Trade-offs

- **Claude API availability/cost at scale**: If app goes public, OCR costs multiply by user count. Mitigation: defer public launch; if launched, gate OCR behind user-supplied API key or subscription.
- **Supabase free tier limits (500 MB DB)**: Sufficient for personal use (~years of transactions). Mitigation: monitor via Supabase dashboard; upgrade to Pro ($25/mo) if needed.
- **Expo managed workflow restrictions**: Some native APIs inaccessible without ejecting. Mitigation: all required features (notifications, file picker, camera) are available via Expo SDK; reassess only if a new feature requires bare workflow.
- **Fuzzy date matching false positives**: Two transactions with same amount on nearby dates could be incorrectly matched. Mitigation: always require user confirmation; auto-check is a suggestion, not a commit.
- **Friend sync trust model**: Auto-accepting shared transactions means a friend could create debt records on the user's behalf. Mitigation: disputed flag allows user to reject; future enhancement can add explicit accept step.

## Git Workflow

- Branch strategy: `main` (production) ← `dev` (integration) ← `feature/*` (per task)
- Each task in tasks.md SHALL be implemented on its own feature branch cut from `dev`
- Merge to `dev` only after the task is verified working; never commit directly to `dev` or `main`
- Commit messages MUST follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`

## Open Questions

- Which Expo SDK version to target at project init? (Use latest stable at time of implementation)
- Should the `pending_debit` auto-debit on due date be triggered by Edge Function cron or on-app-open check? (Edge Function preferred for reliability, but requires Supabase Pro for cron; on-app-open is free tier compatible — decide at implementation)
