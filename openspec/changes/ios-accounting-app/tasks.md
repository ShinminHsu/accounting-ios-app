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

- [x] 3.1 Seed default preset categories and subcategories (Food & Drink, Transportation, Shopping, Entertainment, Health, Housing, Travel, Education, Other) on first user login (default preset categories requirement)
- [x] 3.2 Build category settings screen: display two-level category hierarchy as expandable list (two-level category hierarchy requirement)
- [x] 3.3 Implement create custom category flow: name input, optional emoji picker, parent/subcategory toggle; enforce unique name validation within same level (create custom category requirement)
- [x] 3.4 Implement edit and delete categories: rename in-place; block deletion if category has assigned transactions and display reassignment prompt (edit and delete categories requirement)

## 4. Account Management

- [x] 4.1 Build accounts overview screen supporting all supported account types (Cash, Bank Account, E-Payment, Credit Card, Investment): Asset and Liability groups, per-account balance in original currency, net worth total converted to TWD
- [x] 4.2 Implement create account flow: name, type selector (Cash/Bank/E-Payment/Credit Card/Investment), initial balance, currency selector (TWD/USD/JPY/EUR/HKD/CNY) (create an account requirement)
- [x] 4.3 For credit card account creation: add second step for statement closing day, payment due day, and optional auto-debit bank account (create a credit card account scenario)
- [x] 4.4 Implement manual exchange rate configuration screen: list of supported currencies, editable rate field per currency, warning indicator when rate is missing (manual exchange rate configuration requirement)
- [x] 4.5 Implement account balance calculation: sum initial balance + all inflows − all outflows; exclude "paid-by-other" transactions from balance change (account balance reflects transactions requirement)
- [x] 4.6 Implement edit and delete accounts: block deletion if account has transactions or non-zero balance; display explanation on block (edit and delete accounts requirement)

## 5. Transaction Core

- [x] 5.1 Build transaction entry sheet (triggered by + tab): amount input, date picker (default today), category/subcategory selector, account selector, project selector, notes field, payer type selector (self / paid-by-other / paid-for-other) (record a transaction requirement)
- [x] 5.2 Implement double-entry debt model on transaction save (double-entry debt model per design.md): liability record (others paid for me) — "paid-by-other" creates expense + liability, account balance unchanged; receivable record (I paid for others) — "paid-for-other" creates cash outflow + receivable, no budget impact
- [x] 5.3 Implement transaction edit screen: all fields editable; block payer type change if linked debt record exists and display explanation (edit a transaction requirement)
- [x] 5.4 Implement transaction deletion: cascade-delete linked debt record; reverse account balance and budget impact (delete a transaction requirement)
- [x] 5.5 Build Ledger tab: monthly calendar view with per-day expense total; tap day to see transaction list ordered by time descending; empty state for days with no transactions (view transactions by date requirement)
- [x] 5.6 Add list view toggle in Ledger tab: show all transactions for selected month in chronological order with search/filter by category

## 6. Project & Budget

- [x] 6.1 Build Projects tab: list of active projects with overall budget utilization bar and per-category budget within a project breakdown; tap project to see detail
- [x] 6.2 Implement create project flow: name, type (Periodic/One-Time), interval (monthly/yearly for Periodic), start/end dates (for One-Time), per-category budget amounts (create and edit projects requirement)
- [x] 6.3 Implement periodic project monthly reset: on app open, check if current period has changed; if so, reset spent amounts for all monthly/yearly projects while preserving history (project types requirement; monthly periodic project at month boundary scenario)
- [x] 6.4 Implement one-time project completion: mark project as completed when today > end date; stop accepting new transaction assignments (one-time project with end date reached scenario)
- [x] 6.5 Implement over-budget indicator: show visual alert on project overview and category row when spend exceeds budget (category budget exceeded scenario)
- [x] 6.6 Implement assign transaction to project: transaction counted against project category budget; unassigned transactions counted only in overall monthly totals (assign transaction to project requirement)

## 7. Recurring Transactions

- [x] 7.1 Build recurring templates list screen under More > Settings: active templates sorted by next due date; archived section for completed/cancelled (view recurring templates requirement)
- [x] 7.2 Implement create recurring template form: amount, category, account, project, notes, frequency selector, start/end dates, subtype (expense/paid-for-other/investment-contribution) (recurring transaction template requirement)
- [x] 7.3 Implement on-app-open due instance check: generate all overdue instances since last check; display notice listing auto-created records; handle "paid-for-other" subtype by creating receivable per instance (auto-generate transaction instances requirement)
- [x] 7.4 Implement edit recurring template: apply changes to future instances only; cancel template stops generation without deleting past transactions (edit and cancel recurring templates requirement)

## 8. Credit Card Rewards

- [x] 8.1 Build credit card reward rules screen: per-card list of rules; create/edit rule form with category/merchant, rate, reward type, monthly cap, minimum spend threshold (per-card reward rule configuration requirement)
- [x] 8.2 Implement reward calculation engine: evaluate all rules for a given transaction; apply merchant-specific rule over category rule when both match; apply minimum spend threshold check; apply monthly cap logic (merchant-specific rule overrides category rule scenario; rule with minimum spend threshold not met scenario)
- [x] 8.3 Display per-transaction reward preview in transaction entry sheet and transaction detail screen; show "cap reached" indicator when applicable (per-transaction reward preview requirement)
- [x] 8.4 Implement all three reward types (reward types requirement): cashback-offset accumulated for bill deduction; points with user-configurable TWD-per-point conversion rate and TWD equivalent display; account-deposit with "mark as received" action that creates income transaction and resets pending balance
- [x] 8.6 Build monthly reward summary screen per card: earned cashback, points, pending deposit broken down by rule; year-to-date totals; cap utilization per rule (monthly reward summary per card requirement)

## 9. Credit Card Reconciliation

- [x] 9.1 Build reconciliation entry point: accessible from credit card detail screen; display bill status (pending/reconciling/reconciled) with unreconciled reminder badge (bill status and auto-debit record requirement)
- [x] 9.2 Implement bill upload and OCR parsing: file picker for PDF or image; upload to Supabase Storage; send to Gemini API (gemini-2.0-flash) for bill OCR with prompt requesting structured JSON array of `{ date, merchant, amount }` (credit card reconciliation flow per design.md)
- [x] 9.3 Implement fuzzy matching: for each parsed item, find existing transactions with identical amount and date within ±3 days; auto-check matched items; add "date offset" badge for non-exact date matches; mark unmatched items as "missing" (fuzzy matching against existing transactions requirement)
- [x] 9.4 Handle duplicate match conflict: when two parsed items could match the same transaction, match only the closest-date item and leave the other unmatched (two parsed items with identical amount scenario)
- [x] 9.5 Build reconciliation confirmation screen: checklist of all parsed items with check/uncheck; inline "Add" button for missing items opens pre-filled transaction form; warn on confirm if unchecked items remain (confirmation and manual entry requirement)
- [x] 9.6 Implement reconciliation completion: deduct cashback-offset reward balance from bill total; create pending-debit record with net amount, due date from card settings, and source bank account (auto-debit record created on reconciliation scenario)
- [x] 9.7 Implement pending-debit execution on app open: if due date ≤ today, create cash outflow transaction and mark pending-debit as executed (pending-debit executes on due date scenario)

## 10. Debt Tracking

- [x] 10.1 Build debt tracking screen under More: per-contact net balance summary (positive = they owe me, negative = I owe them); tap contact to see individual outstanding and settled debt records (debt tracking view requirement)
- [x] 10.2 Implement net balance calculation across mixed liabilities and receivables for the same contact (net balance across multiple debts scenario)
- [x] 10.3 Build record repayment flow: contact selector, amount (validated ≤ outstanding balance), date, account; support partial repayment; mark settled when fully repaid (record repayment requirement)
- [x] 10.4 Implement disputed debt flag: tap to mark/unmark dispute; add optional note; display dispute indicator in debt tracking view; retain balance impact (disputed debt record requirement)

## 11. Friend Sync

- [x] 11.1 Build friends management screen under More: list of active friends; pending incoming/outgoing requests; add friend by email search (friend relationship requirement)
- [x] 11.2 Implement friend request flow: search email, send request, write pending friendship to Supabase, trigger push notification to recipient; accept/decline on recipient side activates bilateral friendship (send friend request and accept friend request scenarios)
- [x] 11.3 Implement shared transaction write: when "paid-for-other" transaction is saved and the contact is an active friend, write a shared_transaction event to Supabase (shared transaction sync requirement)
- [x] 11.4 Implement Supabase Realtime listener for incoming shared transactions: auto-create liability record and budget expense entry; send local push notification (friend records payment on my behalf scenario)
- [x] 11.5 Verify RLS policies prevent friends from reading personal transaction tables; shared_transactions accessible only to participant pair (data privacy requirement)
- [x] 11.6 Implement remove friend: deactivate friendship; stop future sync; preserve existing debt records (remove a friend requirement)
- [x] 11.7 Implement dispute shared transaction: flag auto-created liability as disputed from notification or debt tracking view (dispute a shared transaction requirement)

## 12. Reports

- [x] 12.1 Build Reports screen with period selector: preset buttons (This Week, This Month, This Quarter, This Year, Last Month, Last Year) and custom date range picker; all report views update on period change (report period selection requirement)
- [x] 12.2 Implement spending summary: total expenses for period, category breakdown with amount and percentage bar, comparison with preceding period of equal length (spending summary by period requirement)
- [x] 12.3 Implement category drill-down: tap category to see subcategory totals and transaction list for selected period (category drill-down requirement)
- [x] 12.4 Implement project budget vs. actual report: overall utilization percentage, remaining budget, per-category breakdown with over-budget highlighting (project budget vs. actual report requirement)
- [x] 12.5 Implement trend chart: bar chart with weekly bars for periods ≤ 3 months, monthly bars for longer periods; top 5 categories; net cash flow (trend chart requirement)
- [x] 12.6 Implement account balance history chart: line chart per account for selectable time ranges (1M/3M/6M/1Y); convert foreign currency balances to TWD using configured exchange rates (account balance history requirement)

## 13. Home Screen & Notifications

- [x] 13.1 Build Home screen: total net worth (all accounts in TWD), current month spending vs. last month, pending items section (unreconciled bills count, outstanding debt count, overdue recurring transactions)
- [x] 13.2 Wire unreconciled bill badge: display notification badge on credit card in Accounts screen when statement closing date has passed and bill is not reconciled (bill has unreconciled status at month end scenario)

## 14. TestFlight Distribution

- [x] 14.1 Configure `app.json` with bundle identifier, version, and Apple Developer team ID; set up EAS Build for iOS production profile
- [ ] 14.2 **[手動 — 需切換至另一台電腦]** 此電腦太舊無法執行 `npx expo run:ios`，需先將程式碼推上 GitHub，再於另一台 Mac 上進行以下步驟
- [ ] 14.2a **[手動]** 將程式碼推上 GitHub，於另一台 Mac clone/pull 最新版本
- [ ] 14.2b **[手動]** 在另一台 Mac 執行 `npx expo run:ios --device --configuration Release`，安裝至實體裝置並拔線測試
- [ ] 14.2c **[手動]** 確認功能無誤後，在 `eas.json` 填入 `appleId`、`ascAppId`、`appleTeamId`（需先至 App Store Connect 建立 App 取得 ascAppId）
- [ ] 14.2d **[手動]** 安裝並登入 EAS CLI：`npm install -g eas-cli` → `eas login`
- [ ] 14.2e **[手動]** 建置 IPA：`eas build --platform ios --profile production`
- [ ] 14.2f **[手動]** 上傳至 TestFlight：`eas submit --platform ios --latest`
- [ ] 14.2g **[手動]** 至 App Store Connect → TestFlight → 內部測試人員，將自己加入

## 15. Commit Missing Work & Bug Fixes

> Sections 7–14 的程式碼都已在磁碟上（untracked new files），但 git stash 在 filter-branch 過程中遺失，需補回修改過的舊檔案並一次 commit。

- [x] 15.1 Mark sections 7–14 tasks as complete in this tasks file
- [x] 15.2 Restore App.tsx: add hooks for `generateDueInstances`, `executePendingDebits`, `subscribeToSharedTransactions` / `handleIncomingSharedTransaction`
- [x] 15.3 Restore MoreScreen.tsx: full menu with all sections 7–12 screens (recurring, debt, friends, reports, credit card reconciliation)
- [x] 15.4 Restore HomeScreen.tsx: net worth, current month vs last month spending, pending items section (section 13.1)
- [x] 15.5 Restore AccountsScreen.tsx: credit card tap → CreditCardDetailScreen modal (section 8); unreconciled bill badge (section 13.2)
- [x] 15.6 Restore AddTransactionSheet.tsx: reward preview banner (section 8.3); shared transaction write for paid-for-other (section 11.3)
- [x] 15.7 Restore app.json: bundle identifier `com.smhsu.accountingapp` (section 14.1)
- [x] 15.8 Restore CLAUDE.md: add dev environment constraint note (this machine cannot run `npx expo run:ios`)
- [ ] 15.9 **[手動]** Fix Supabase email confirmation: Supabase Dashboard → Authentication → Providers → Email → 關閉「Confirm email」；並更新 RegisterScreen 成功訊息（移除「確認信已寄出」，改為直接導向登入）
- [ ] 15.10 Commit all files (new untracked + restored tracked) and push to GitHub
