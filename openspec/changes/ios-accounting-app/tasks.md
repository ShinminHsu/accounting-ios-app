## 1. Project Setup & Infrastructure

- [x] 1.1 Initialize React Native project with Expo managed workflow (React Native with Expo managed workflow per design.md, latest stable SDK); configure TypeScript, ESLint, and Prettier
- [x] 1.2 Set up Supabase as backend: create project, configure environment variables for Supabase URL and anon key in Expo
- [x] 1.3 Implement Supabase Auth (email/password); create login, registration, and password-reset screens
- [x] 1.4 Implement bottom tab navigation structure with 5 tabs: Home, Ledger, +, Projects, More (navigation structure per design.md)
- [x] 1.5 Define visual theme color tokens for Forest Green theme: primary `#4A7C59`, background `#FAF8F3`, accent sage green; apply globally via theme provider (visual theme per design.md)
- [x] 1.6 Configure Expo push notifications (Expo Notifications API); request permission on first launch

## 2. Database Schema

- [x] 2.1 Create Supabase tables: `users`, `accounts`, `categories`, `transactions`, `debt_records`, `projects`, `project_category_budgets`, `recurring_templates` with foreign keys and indexes
- [x] 2.2 Create Supabase tables: `credit_cards` (extends accounts), `credit_card_reward_rules`, `credit_card_bills`, `bill_line_items`, `pending_debits`
- [x] 2.3 Create Supabase tables: `friendships`, `shared_transactions`, `exchange_rates`
- [x] 2.4 Implement Row Level Security (RLS) policies: all personal tables restricted to `auth.uid() = user_id`; `shared_transactions` readable by both payer and payee (Supabase data isolation model per design.md)
- [x] 2.5 Enable Supabase Realtime on `shared_transactions` and `friendships` tables

## 3. Category Management

- [ ] 3.1 Seed default preset categories and subcategories (Food & Drink, Transportation, Shopping, Entertainment, Health, Housing, Travel, Education, Other) on first user login (default preset categories requirement)
- [ ] 3.2 Build category settings screen: display two-level category hierarchy as expandable list (two-level category hierarchy requirement)
- [ ] 3.3 Implement create custom category flow: name input, optional emoji picker, parent/subcategory toggle; enforce unique name validation within same level (create custom category requirement)
- [ ] 3.4 Implement edit and delete categories: rename in-place; block deletion if category has assigned transactions and display reassignment prompt (edit and delete categories requirement)

## 4. Account Management

- [ ] 4.1 Build accounts overview screen supporting all supported account types (Cash, Bank Account, E-Payment, Credit Card, Investment): Asset and Liability groups, per-account balance in original currency, net worth total converted to TWD
- [ ] 4.2 Implement create account flow: name, type selector (Cash/Bank/E-Payment/Credit Card/Investment), initial balance, currency selector (TWD/USD/JPY/EUR/HKD/CNY) (create an account requirement)
- [ ] 4.3 For credit card account creation: add second step for statement closing day, payment due day, and optional auto-debit bank account (create a credit card account scenario)
- [ ] 4.4 Implement manual exchange rate configuration screen: list of supported currencies, editable rate field per currency, warning indicator when rate is missing (manual exchange rate configuration requirement)
- [ ] 4.5 Implement account balance calculation: sum initial balance + all inflows − all outflows; exclude "paid-by-other" transactions from balance change (account balance reflects transactions requirement)
- [ ] 4.6 Implement edit and delete accounts: block deletion if account has transactions or non-zero balance; display explanation on block (edit and delete accounts requirement)

## 5. Transaction Core

- [ ] 5.1 Build transaction entry sheet (triggered by + tab): amount input, date picker (default today), category/subcategory selector, account selector, project selector, notes field, payer type selector (self / paid-by-other / paid-for-other) (record a transaction requirement)
- [ ] 5.2 Implement double-entry debt model on transaction save (double-entry debt model per design.md): liability record (others paid for me) — "paid-by-other" creates expense + liability, account balance unchanged; receivable record (I paid for others) — "paid-for-other" creates cash outflow + receivable, no budget impact
- [ ] 5.3 Implement transaction edit screen: all fields editable; block payer type change if linked debt record exists and display explanation (edit a transaction requirement)
- [ ] 5.4 Implement transaction deletion: cascade-delete linked debt record; reverse account balance and budget impact (delete a transaction requirement)
- [ ] 5.5 Build Ledger tab: monthly calendar view with per-day expense total; tap day to see transaction list ordered by time descending; empty state for days with no transactions (view transactions by date requirement)
- [ ] 5.6 Add list view toggle in Ledger tab: show all transactions for selected month in chronological order with search/filter by category

## 6. Project & Budget

- [ ] 6.1 Build Projects tab: list of active projects with overall budget utilization bar and per-category budget within a project breakdown; tap project to see detail
- [ ] 6.2 Implement create project flow: name, type (Periodic/One-Time), interval (monthly/yearly for Periodic), start/end dates (for One-Time), per-category budget amounts (create and edit projects requirement)
- [ ] 6.3 Implement periodic project monthly reset: on app open, check if current period has changed; if so, reset spent amounts for all monthly/yearly projects while preserving history (project types requirement; monthly periodic project at month boundary scenario)
- [ ] 6.4 Implement one-time project completion: mark project as completed when today > end date; stop accepting new transaction assignments (one-time project with end date reached scenario)
- [ ] 6.5 Implement over-budget indicator: show visual alert on project overview and category row when spend exceeds budget (category budget exceeded scenario)
- [ ] 6.6 Implement assign transaction to project: transaction counted against project category budget; unassigned transactions counted only in overall monthly totals (assign transaction to project requirement)

## 7. Recurring Transactions

- [ ] 7.1 Build recurring templates list screen under More > Settings: active templates sorted by next due date; archived section for completed/cancelled (view recurring templates requirement)
- [ ] 7.2 Implement create recurring template form: amount, category, account, project, notes, frequency selector, start/end dates, subtype (expense/paid-for-other/investment-contribution) (recurring transaction template requirement)
- [ ] 7.3 Implement on-app-open due instance check: generate all overdue instances since last check; display notice listing auto-created records; handle "paid-for-other" subtype by creating receivable per instance (auto-generate transaction instances requirement)
- [ ] 7.4 Implement edit recurring template: apply changes to future instances only; cancel template stops generation without deleting past transactions (edit and cancel recurring templates requirement)

## 8. Credit Card Rewards

- [ ] 8.1 Build credit card reward rules screen: per-card list of rules; create/edit rule form with category/merchant, rate, reward type, monthly cap, minimum spend threshold (per-card reward rule configuration requirement)
- [ ] 8.2 Implement reward calculation engine: evaluate all rules for a given transaction; apply merchant-specific rule over category rule when both match; apply minimum spend threshold check; apply monthly cap logic (merchant-specific rule overrides category rule scenario; rule with minimum spend threshold not met scenario)
- [ ] 8.3 Display per-transaction reward preview in transaction entry sheet and transaction detail screen; show "cap reached" indicator when applicable (per-transaction reward preview requirement)
- [ ] 8.4 Implement all three reward types (reward types requirement): cashback-offset accumulated for bill deduction; points with user-configurable TWD-per-point conversion rate and TWD equivalent display; account-deposit with "mark as received" action that creates income transaction and resets pending balance
- [ ] 8.6 Build monthly reward summary screen per card: earned cashback, points, pending deposit broken down by rule; year-to-date totals; cap utilization per rule (monthly reward summary per card requirement)

## 9. Credit Card Reconciliation

- [ ] 9.1 Build reconciliation entry point: accessible from credit card detail screen; display bill status (pending/reconciling/reconciled) with unreconciled reminder badge (bill status and auto-debit record requirement)
- [ ] 9.2 Implement bill upload and OCR parsing: file picker for PDF or image; upload to Supabase Storage; send to Gemini API (gemini-2.0-flash) for bill OCR with prompt requesting structured JSON array of `{ date, merchant, amount }` (credit card reconciliation flow per design.md)
- [ ] 9.3 Implement fuzzy matching: for each parsed item, find existing transactions with identical amount and date within ±3 days; auto-check matched items; add "date offset" badge for non-exact date matches; mark unmatched items as "missing" (fuzzy matching against existing transactions requirement)
- [ ] 9.4 Handle duplicate match conflict: when two parsed items could match the same transaction, match only the closest-date item and leave the other unmatched (two parsed items with identical amount scenario)
- [ ] 9.5 Build reconciliation confirmation screen: checklist of all parsed items with check/uncheck; inline "Add" button for missing items opens pre-filled transaction form; warn on confirm if unchecked items remain (confirmation and manual entry requirement)
- [ ] 9.6 Implement reconciliation completion: deduct cashback-offset reward balance from bill total; create pending-debit record with net amount, due date from card settings, and source bank account (auto-debit record created on reconciliation scenario)
- [ ] 9.7 Implement pending-debit execution on app open: if due date ≤ today, create cash outflow transaction and mark pending-debit as executed (pending-debit executes on due date scenario)

## 10. Debt Tracking

- [ ] 10.1 Build debt tracking screen under More: per-contact net balance summary (positive = they owe me, negative = I owe them); tap contact to see individual outstanding and settled debt records (debt tracking view requirement)
- [ ] 10.2 Implement net balance calculation across mixed liabilities and receivables for the same contact (net balance across multiple debts scenario)
- [ ] 10.3 Build record repayment flow: contact selector, amount (validated ≤ outstanding balance), date, account; support partial repayment; mark settled when fully repaid (record repayment requirement)
- [ ] 10.4 Implement disputed debt flag: tap to mark/unmark dispute; add optional note; display dispute indicator in debt tracking view; retain balance impact (disputed debt record requirement)

## 11. Friend Sync

- [ ] 11.1 Build friends management screen under More: list of active friends; pending incoming/outgoing requests; add friend by email search (friend relationship requirement)
- [ ] 11.2 Implement friend request flow: search email, send request, write pending friendship to Supabase, trigger push notification to recipient; accept/decline on recipient side activates bilateral friendship (send friend request and accept friend request scenarios)
- [ ] 11.3 Implement shared transaction write: when "paid-for-other" transaction is saved and the contact is an active friend, write a shared_transaction event to Supabase (shared transaction sync requirement)
- [ ] 11.4 Implement Supabase Realtime listener for incoming shared transactions: auto-create liability record and budget expense entry; send local push notification (friend records payment on my behalf scenario)
- [ ] 11.5 Verify RLS policies prevent friends from reading personal transaction tables; shared_transactions accessible only to participant pair (data privacy requirement)
- [ ] 11.6 Implement remove friend: deactivate friendship; stop future sync; preserve existing debt records (remove a friend requirement)
- [ ] 11.7 Implement dispute shared transaction: flag auto-created liability as disputed from notification or debt tracking view (dispute a shared transaction requirement)

## 12. Reports

- [ ] 12.1 Build Reports screen with period selector: preset buttons (This Week, This Month, This Quarter, This Year, Last Month, Last Year) and custom date range picker; all report views update on period change (report period selection requirement)
- [ ] 12.2 Implement spending summary: total expenses for period, category breakdown with amount and percentage bar, comparison with preceding period of equal length (spending summary by period requirement)
- [ ] 12.3 Implement category drill-down: tap category to see subcategory totals and transaction list for selected period (category drill-down requirement)
- [ ] 12.4 Implement project budget vs. actual report: overall utilization percentage, remaining budget, per-category breakdown with over-budget highlighting (project budget vs. actual report requirement)
- [ ] 12.5 Implement trend chart: bar chart with weekly bars for periods ≤ 3 months, monthly bars for longer periods; top 5 categories; net cash flow (trend chart requirement)
- [ ] 12.6 Implement account balance history chart: line chart per account for selectable time ranges (1M/3M/6M/1Y); convert foreign currency balances to TWD using configured exchange rates (account balance history requirement)

## 13. Home Screen & Notifications

- [ ] 13.1 Build Home screen: total net worth (all accounts in TWD), current month spending vs. last month, pending items section (unreconciled bills count, outstanding debt count, overdue recurring transactions)
- [ ] 13.2 Wire unreconciled bill badge: display notification badge on credit card in Accounts screen when statement closing date has passed and bill is not reconciled (bill has unreconciled status at month end scenario)

## 14. TestFlight Distribution

- [ ] 14.1 Configure `app.json` with bundle identifier, version, and Apple Developer team ID; set up EAS Build for iOS production profile
- [ ] 14.2 Run EAS Build to generate IPA; submit to TestFlight via EAS Submit; add self as internal tester
