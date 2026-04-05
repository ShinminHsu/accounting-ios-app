## Context

The app currently uses a bottom-tab navigator (首頁 / 帳本 / + / 專案 / 更多). The AddTransactionSheet is a `presentationStyle="pageSheet"` Modal — not a full-screen push. Sub-screens launched from MoreScreen use the same pageSheet pattern. Category management icons are rendered via `CategoryIcon` component. The payer concept uses `PayerType` (self / paid_by_other / paid_for_other) plus a `contactId` linked to saved contacts. Ledger has a separate calendar view and a list view as two tabs. HomeScreen shows net worth, monthly spend summary, and pending item badges.

## Goals / Non-Goals

**Goals:**

1. Redesign AddTransactionSheet form so amount is on the left and name+date are on the right
2. Replace the full-row payment-method buttons with a compact inline picker
3. Standardize all category icon buttons to uniform size (48×48 touchable, 32×32 icon container)
4. Make all text-input modals (add account, reward settings, etc.) properly keyboard-aware
5. Fully localize the credit-card reward condition editor to Traditional Chinese
6. Push all MoreScreen child screens as full-screen navigation (replace pageSheet modals with Stack.Screen pushes)
7. Enlarge the expand/collapse chevron in CategoryManagementScreen; fix icon picker to render icons not strings
8. Replace "好友/聯絡人" with "代付對象"; support free-text name when no saved contact is selected
9. Merge LedgerScreen calendar + list; add collapsible calendar (default collapsed) and top-right search icon
10. Rename DebtTrackingScreen to "借還款追蹤"; surface `paid_by_other` / `paid_for_other` transactions
11. Merge Home tab into Ledger tab; replace Home tab slot with Assets quick-access in bottom tab bar
12. Redesign AssetsScreen: net-asset total at top, 2×2 summary grid, grouped account list with expand/collapse

**Non-Goals:**

- No new backend tables or Supabase schema changes for items 1–12 (payer free-text stored in `notes` or a new `payer_name` column TBD — see Open Questions)
- No changes to the project budget or reports screens
- No multi-currency conversion logic changes
- No changes to Supabase auth flow

## Decisions

### Transaction form: two-column amount row

**Current**: Amount takes a full-width large `amountRow`. Name is a separate `nameInput` below it.

**Decision**: Place amount (currency symbol + input) in the left 55% of a flex row, and name + date stacked in the right 45%. The income/expense toggle stays above this row. This makes better use of horizontal space and reduces scrolling.

**Alternative considered**: Keep amount full-width and add name inline after. Rejected because name would be too narrow on small screens.

### Payment method: compact segmented picker

**Current**: Three large `TouchableOpacity` buttons for 自己付 / 別人付 / 幫人付 each spanning roughly 1/3 of the screen width with icon + label.

**Decision**: Replace with a compact `SegmentedControl`-style row (3 pills in a single row, height ~32px, label only, no icon). The contact/payer selector appears below only when payer type is not `self`.

### Payer contact: unified "代付對象" with free-text fallback

**Current**: `selectedContactId` must be a saved contact from `contacts` table.

**Decision**: Introduce a `payerName` free-text field alongside `contactId`. When the user picks a saved contact, `contactId` is set; when they type a name without picking, `payerName` is set and `contactId` remains null.

**DB impact**: Add a `payer_name TEXT` column to `transactions`. The `DebtTrackingScreen` displays `payer_name` when `contact_id` is null.

**Terminology**: Replace all "好友" and "聯絡人" labels with "代付對象" throughout the UI.

### Category icon grid: uniform size

**Current**: Icon grid items have varying padding/size. `CategoryIcon` containerSize differs by call site.

**Decision**: Standardize all icon grid buttons in CategoryManagementScreen and the icon picker modal to `touchableSize=52`, `containerSize=40`, `iconSize=24`. Apply via a `CategoryIconButton` wrapper component.

### Keyboard-aware modals

**Current**: CreateAccountModal, CreateRewardRuleModal, CreateRecurringModal, and ExchangeRateModal do not use KeyboardAvoidingView consistently, causing keyboard to overlap inputs.

**Decision**: Wrap every modal's content root with:
```
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
  <ScrollView keyboardShouldPersistTaps="handled">
```
This is already done in AddTransactionSheet and should be replicated to all modals.

### Credit card reward condition editor: full Chinese

**Current**: `CreateRewardRuleModal` has English placeholder text and labels (e.g., "Category keyword", "Notes keyword", "Min amount", "Reward type").

**Decision**: Replace all English strings with Traditional Chinese equivalents. Restructure the form into labeled sections using the same `InfoRow` style used elsewhere.

### Sub-screen navigation: full-screen Stack push

**Current**: MoreScreen child screens (AccountsScreen, CategorySettingsScreen, DebtTrackingScreen, CreditCardDetailScreen, etc.) are presented as pageSheet modals or bottom sheets.

**Decision**: Wrap MoreScreen children in a Stack navigator nested inside the More tab. Each child screen is a `Stack.Screen` with `presentation: 'card'` (full-screen push). This gives standard iOS navigation with back gesture and a back button.

**Implementation**: Create `MoreStackNavigator.tsx` that wraps MoreScreen + its children in a Stack. Replace direct Modal presentations with `navigation.navigate()` calls.

### Category management: expand/collapse chevron + icon picker

**Current**: The expand/collapse triangle uses a small emoji or tiny icon. The icon picker modal shows icon name strings (e.g., "ShoppingCart") instead of rendered icons.

**Decision**:
- Replace the triangle with `ChevronDown` / `ChevronRight` from lucide-react-native at size 20 (was ≈12).
- In the icon picker modal, render each option as a `CategoryIcon` component (not text), ensuring the picker shows actual icons.

### Ledger screen: collapsible calendar + search

**Current**: LedgerScreen has two tabs (月曆 / 清單) as sibling views.

**Decision**: Remove the tab switcher. Default view is the transaction list. A "顯示月曆" toggle button at the top-left collapses/expands a `CalendarStrip` or monthly grid above the list. A magnifying glass icon (`Search` from lucide) in the top-right navigates to a full-text search screen. The "今天" button moves to be inline with the month header row (right side).

### Home + Ledger merge; Assets in tab bar

**Current**: Home tab shows net worth card, spend summary, and pending items. Ledger tab shows transactions.

**Decision**: 
- Remove the Home tab entirely. Merge its content into the Ledger screen as a collapsible summary card at the top (above the transaction list).
- Replace the Home tab slot in the bottom tab bar with an Assets tab (coin/wallet icon).
- The summary card shows: current month spend vs budget, net worth. It collapses when the user scrolls down (standard scroll-to-hide header behavior).
- "專案" tab remains.

**Tab order**: 帳本 | 專案 | ＋ | 資產 | 更多

### Asset page redesign

**Current**: AssetsScreen shows a flat list of accounts with net worth at top.

**Decision**: 
- Header: net-asset total (large font, ±color), with an eye icon to toggle visibility.
- Below header: 2×2 grid card — 可支配 (positive accounts sum) / 負債 (credit card sum) / 借出 (lent) / 借入 (borrowed).
- "淨資產趨勢 >" link to trend chart.
- Account list: grouped by type (現金帳戶 / 信用帳戶 / 無帳戶). Each group header shows group total and a ChevronDown to expand/collapse. Each account item shows icon, name, balance, and for credit cards: remaining credit, next payment date.

### Debt tracking rename + data surfacing

**Current**: DebtTrackingScreen shows records from `debt_records` table but `paid_by_other` and `paid_for_other` transactions create `debt_records` entries via `createTransaction`. The screen title is "負債追蹤".

**Decision**: 
- Rename screen title and all references to "借還款追蹤".
- Verify that `createTransaction` correctly creates `debt_records` for `paid_by_other` and `paid_for_other`. If the records exist but the screen filters them out, fix the query filter. If `createTransaction` doesn't create them, add the creation logic.
- Display `payer_name` (free-text) when `contact_id` is null.

## Risks / Trade-offs

- [Risk] Adding `payer_name` column requires a Supabase migration → Mitigation: write migration SQL and add to the migration notes; this is a simple nullable column addition.
- [Risk] Merging Home into Ledger removes the "pending items" badges that currently live on HomeScreen → Mitigation: surface pending item counts as a compact row inside the Ledger summary card.
- [Risk] Replacing pageSheet modals with Stack push for MoreScreen children changes back-navigation behavior → Mitigation: test swipe-back gesture; for modals that were OK with swipe-down, the Stack back-swipe is equivalent.
- [Risk] Collapsible calendar in Ledger may conflict with the existing calendar library's scroll behavior → Mitigation: use `Animated.Value` for height interpolation rather than conditional render to avoid layout jumps.

## Open Questions

- Should `payer_name` be stored on `transactions` (new column) or inferred from a free-text `contact_name` field on `debt_records`? **Decision deferred**: add `payer_name TEXT` to `transactions` for now; revisit if debt_records needs it too.
- For the Assets tab "borrowing/lending" figures (借出/借入), should these come from `debt_records` filtered by direction, or from a separate aggregation? Use `debt_records.direction` field if it exists, else derive from `transactions.payer_type`.
