## 1. Database migration

- [x] 1.1 Add `payer_name TEXT` column to `transactions` table via Supabase migration SQL; update `src/types/database.ts` TypeScript type to include `payer_name: string | null`
- [x] 1.2 Update `createTransaction` in `src/lib/transactions.ts` to accept and persist `payerName` parameter alongside `contactId`

## 2. Payer contact model (unified 代付對象)

- [x] 2.1 Implement payer contact: unified "代付對象" with free-text fallback — create `src/components/PayerContactPicker.tsx` combining saved-contact list with a "或直接輸入名字" free-text field; selecting a contact clears free text, typing free text clears contact selection (payer contact picker UI)
- [x] 2.2 Replace all "好友" / "聯絡人" labels in `AddTransactionSheet.tsx` and `EditTransactionSheet.tsx` with "代付對象" (unified payer contact model)
- [x] 2.3 Wire `PayerContactPicker` into `AddTransactionSheet.tsx` and `EditTransactionSheet.tsx`: replace old contact dropdown with the new picker; propagate both `contactId` and `payerName` through form state and `handleSave`; handle optional contact for debt payer types — save succeeds with null contact or free-text name (free-text payer name without saved contact)

## 3. Transaction entry form layout

- [x] 3.1 Transaction form: two-column amount row — refactor the amount + name section in `AddTransactionSheet.tsx` into a flex row: left 55% holds the currency symbol and amount `TextInput`, right 45% holds the name `TextInput` and date pill stacked vertically (two-column amount and name layout)
- [x] 3.2 Apply the same two-column amount row layout to `EditTransactionSheet.tsx`
- [x] 3.3 Payment method: compact segmented picker — replace the three large payer-type `TouchableOpacity` buttons in both sheets with a compact segmented control (row height ≤ 36pt, three equal-width pills labelled 自己付 / 別人付 / 幫人付); `PayerContactPicker` appears below only when payer type is not `self` (compact payment-method segmented picker)

## 4. Keyboard-aware modals

- [x] 4.1 Keyboard-aware modals — wrap `CreateAccountModal.tsx` content in `KeyboardAvoidingView` + `ScrollView keyboardShouldPersistTaps="handled"` so keyboard never obscures inputs (add account modal is keyboard-aware)
- [x] 4.2 Apply the keyboard-aware modal pattern to `ExchangeRateModal.tsx` (add account modal is keyboard-aware)
- [x] 4.3 Apply the keyboard-aware modal pattern to `CreateRewardRuleModal.tsx`
- [x] 4.4 Apply the keyboard-aware modal pattern to `CreateRecurringModal.tsx` and `EditRecurringModal.tsx`

## 5. Category management fixes

- [x] 5.1 Category icon grid: uniform size — create `src/components/CategoryIconButton.tsx` wrapper (52×52 touchable / 40×40 container / 24pt icon) and apply to all icon buttons in `CategorySettingsScreen.tsx` grid and picker modal (uniform category icon button size)
- [x] 5.2 Category management: icon picker renders actual icons not strings — fix the icon picker modal in `CategorySettingsScreen.tsx` to render each option using `CategoryIcon` component instead of displaying icon name strings (icon picker renders actual icons not strings)
- [x] 5.3 Category management: expand/collapse chevron + icon picker — replace the expand/collapse indicator in parent-category rows of `CategorySettingsScreen.tsx` with `ChevronRight` / `ChevronDown` from lucide-react-native at size 20 (enlarged expand/collapse chevron)

## 6. Credit card reward rule editor localization

- [x] 6.1 Credit card reward condition editor: full Chinese — replace all English labels and placeholders in `CreateRewardRuleModal.tsx` with Traditional Chinese: 回饋分類或商家 / 備註關鍵字 / 最低消費門檻 / 回饋比例 / 回饋類型 / 每月上限 (reward rule editor fully in Traditional Chinese)
- [x] 6.2 Refactor `CreateRewardRuleModal.tsx` layout to labeled-section rows (left label, right input/picker); reward type options as 現金回饋抵扣 / 點數累積 / 存入指定帳戶 (reward rule editor uses labeled section layout)

## 7. More tab: full-screen Stack navigation

- [x] 7.1 Sub-screen navigation: full-screen Stack push — create `src/navigation/MoreStackNavigator.tsx` as a Stack navigator with MoreScreen as root and child screens (AccountsScreen, CategorySettingsScreen, DebtTrackingScreen, CreditCardDetailScreen, ReconciliationScreen, RecurringTemplatesScreen) all using `presentation: 'card'` (full-screen push navigation pattern for settings-style screens)
- [x] 7.2 Replace the More tab's `component={MoreScreen}` in `MainTabNavigator.tsx` with `component={MoreStackNavigator}`; remove Modal wrappers in MoreScreen that previously presented child screens (More tab uses Stack full-screen navigation)
- [x] 7.3 Update `MoreScreen.tsx` to call `navigation.navigate()` for each menu item; remove modal `visible` state for each child screen; ensure no redundant header bar on tab screens — MoreScreen SHALL NOT render a duplicate title bar (no redundant header bar on tab screens)
- [x] 7.4 Verify swipe-back gesture works on each child screen (swipe-back from child screen)

## 8. Home + Ledger merge; Assets tab

- [x] 8.1 Home + Ledger merge; Assets in tab bar — add an Assets tab to `MainTabNavigator.tsx` replacing the Home tab slot; tab order: 帳本 / 專案 / ＋ / 資產 / 更多; use a wallet/coin icon for 資產 (home and Ledger tabs merged)
- [x] 8.2 Add a collapsible summary card at the top of `LedgerScreen.tsx` showing: current month spend, net worth, and pending item counts; data fetched from same queries as old HomeScreen (summary card on Ledger screen)
- [x] 8.3 Delete or repurpose `HomeScreen.tsx`; remove the Home import from `MainTabNavigator.tsx` (no separate Home tab)

## 9. Ledger screen: collapsible calendar + search

- [x] 9.1 Add calendar toggle button to `LedgerScreen.tsx` header row (left side, labelled "顯示月曆" / "隱藏月曆"); animate calendar in/out using `Animated.Value` height interpolation; calendar collapsed by default; reposition "今天" button to right side of month header row (Ledger screen with collapsible calendar)
- [x] 9.2 Add `Search` icon to top-right of `LedgerScreen.tsx` header; tapping navigates to `TransactionSearchScreen.tsx` (Ledger search via top-right icon)
- [x] 9.3 Create `src/screens/transactions/TransactionSearchScreen.tsx` with text input and results list; implement `searchTransactions(userId, query)` in `src/lib/transactions.ts` using Supabase ilike on name and notes columns, joining categories for name match (search returns matching transactions)

## 10. Asset page redesign

- [x] 10.1 Asset page redesign — redesign `AssetsScreen.tsx` header: large net-asset total with ±color and eye icon toggle; implement toggle balance visibility feature hiding all monetary values when activated (redesigned Assets screen layout; net asset total displayed with correct sign color; toggle balance visibility)
- [x] 10.2 Add 2×2 summary grid card: 可支配 / 負債 / 借出 / 借入; query `debt_records` for 借出/借入 values (2x2 grid shows borrowing figures)
- [x] 10.3 Add "淨資產趨勢 >" tappable row navigating to net-worth trend chart screen
- [x] 10.4 Implement grouped account list with expand/collapse per group; each group header shows name, total balance, ChevronDown/Right; groups expanded by default (collapse account group)
- [x] 10.5 For credit card account rows, show remaining credit and next payment date/amount

## 11. Debt tracking: rename + data surfacing

- [x] 11.1 Debt tracking rename + data surfacing — rename all UI labels from "負債追蹤" to "借還款追蹤" in `DebtTrackingScreen.tsx` and `MoreScreen.tsx` (screen renamed to 借還款追蹤; More screen menu label updated)
- [x] 11.2 Audit `createTransaction` in `src/lib/transactions.ts`: verify it creates `debt_records` for `paid_by_other` and `paid_for_other`; add creation logic if missing, using `payer_name` / `contact_id` (paid-by-other and paid-for-other transactions visible in tracker)
- [x] 11.3 Audit `DebtTrackingScreen.tsx` query: ensure debt records from `paid_by_other` and `paid_for_other` are fetched and rendered in the debt tracking view (debt tracking view; paid-by-other transaction appears in tracker)
- [x] 11.4 Update `DebtTrackingScreen.tsx` to display `payer_name` when `contact_id` is null; group free-text-name records by `payer_name` (free-text payer name shown in tracker; free-text party grouped separately)
