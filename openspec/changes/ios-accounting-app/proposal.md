## Why

Existing accounting apps (e.g., Moze) lack the ability to track expenses paid by others against personal budgets, have no credit card rewards calculation, and offer no integrated bill reconciliation via OCR. This app addresses all three gaps in a single personal finance tool.

## What Changes

- New iOS app built with React Native (Expo) + Supabase + Claude API
- Core accounting: transactions, categories (with subcategories), accounts, projects with budgets
- Credit card rewards tracking: per-card rules for category rates, merchant bonuses, caps, reward types (cashback/points/account deposit), bill-offset calculation
- Debt tracking using double-entry model: expenses decouple from cash flow — "paid by others" creates a liability + expense entry; "paid for others" creates a receivable + cash outflow entry
- Credit card reconciliation: upload PDF/screenshot → Claude API parses → fuzzy match (amount + date ±3 days) against existing records → confirm unchecked items → generate auto-debit entry on due date
- Multi-user friend sync via Supabase: bilateral friend relationships; shared transactions (payment-on-behalf events) sync automatically with notification; personal data remains private
- Periodic/recurring transactions: fixed-interval support for recurring expenses, investments (定期定額), and proxy payments

## Non-Goals

- Investment portfolio tracking (P&L, unrealized gains, stock prices) — investment accounts are tracked as balance only in this phase; full investment module is deferred
- Android support — React Native enables it in future, but not in scope now
- Public App Store launch — TestFlight distribution only in initial phase; monetization and multi-tenant infrastructure deferred

## Capabilities

### New Capabilities

- `transaction-core`: Basic transaction recording — amount, date, category, account, notes, project assignment
- `category-management`: Two-level category hierarchy (parent + subcategory), default presets + user custom categories
- `account-management`: Account types (cash, bank, e-payment, credit card, investment balance); asset vs liability distinction
- `project-budget`: Projects with per-category budgets; periodic (monthly/annual reset) and one-time project types
- `credit-card-rewards`: Per-card reward rule configuration (category rates, merchant bonuses, monthly caps, minimum spend thresholds); reward types: cashback offset, points balance, account deposit; per-transaction reward preview; monthly reward summary
- `debt-tracking`: Double-entry debt model — liability (others paid for me) and receivable (I paid for others) records; repayment recording; balance view per contact; recurring proxy payment support
- `credit-card-reconciliation`: Upload bill PDF/screenshot; Claude API structured extraction; fuzzy match against existing transactions; checkbox confirmation flow; auto-debit entry generation on due date with bill-offset deduction
- `friend-sync`: Bilateral friend relationships via Supabase; shared transaction events (payment-on-behalf); auto-sync with push notification; private data isolation
- `recurring-transactions`: Periodic transaction templates (daily/weekly/monthly/yearly); auto-create on schedule; supports expenses, investments, and proxy payments
- `reports`: Monthly/annual spending summaries by category and project; budget vs actual; account balance history

### Modified Capabilities

(none)

## Impact

- Affected specs: all capabilities listed above are new
- Affected code: new React Native (Expo) project — no existing source files
- External dependencies: Supabase (auth, PostgreSQL, realtime), Claude API (OCR), Expo (build/distribution), Apple Developer account (TestFlight)
