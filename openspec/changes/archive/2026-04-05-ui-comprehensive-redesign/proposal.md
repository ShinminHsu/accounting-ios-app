## Why

The app has accumulated multiple UI pain points across the transaction entry form, category management, navigation patterns, and screen layout that collectively degrade the user experience. A comprehensive pass is needed to bring the interface to a polished, consistent standard.

## What Changes

- **Transaction entry form**: Amount moves to left half; name and date move to right half; payment method becomes a compact picker/dropdown instead of a full row
- **Category icon grid**: All icon buttons standardized to uniform size
- **Keyboard-aware modals**: All text-input modals (add account, credit-card reward settings, etc.) use KeyboardAvoidingView so the keyboard never obscures content
- **Credit card rewards UI**: Reward condition editor fully localized to Traditional Chinese, layout redesigned for clarity
- **Sub-screen navigation**: All sub-screens pushed from "更多" (and elsewhere) use full-screen push navigation instead of partial bottom sheet
- **Category management**: Expand/collapse chevron enlarged; edit-category icon picker shows actual icons instead of icon name strings
- **Payer field rename**: "好友" / "聯絡人" unified into a single "代付對象" concept; free-text name entry allowed without requiring a saved contact
- **Ledger screen**: Calendar and transaction list merged into one screen; calendar collapsible (tap to expand/collapse); search icon added to top-right; "今天" button repositioned
- **Borrowing/repayment tracking**: Renamed from "負債追蹤" to "借還款追蹤"; paid-by-other and paid-for-other transactions now appear in the tracker
- **Home + Ledger merge**: Home tab and Ledger tab consolidated into a single screen with project-switcher preview at top and quick-access asset shortcut in bottom tab bar
- **Asset page redesign**: Net asset total displayed prominently at top with show/hide toggle; 可支配 / 負債 / 借出 / 借入 summary grid; account list grouped with expand/collapse per group

## Capabilities

### New Capabilities

- `payer-contact`: Unified "代付對象" model replacing the friend/contact duality — supports saved contacts and free-text names interchangeably

### Modified Capabilities

- `transaction-entry-ux`: Entry form layout (amount left, name+date right), payment method picker, keyboard-aware modal behavior
- `category-management`: Uniform icon button size, icon picker shows rendered icons not strings, larger expand/collapse chevron
- `screen-navigation-ux`: Sub-screens use full-screen push; home and ledger tabs merged; ledger calendar collapsible with search
- `debt-tracking`: Renamed to 借還款追蹤; paid-by-other and paid-for-other transactions reflected in tracker
- `account-management`: Add-account modal uses KeyboardAvoidingView
- `credit-card-rewards`: Reward condition editor fully in Traditional Chinese with redesigned layout
- `ui-design-system`: Keyboard-aware modal pattern standardized; sub-screen navigation pattern standardized to full-screen push

## Impact

- Affected specs: `transaction-entry-ux`, `category-management`, `screen-navigation-ux`, `debt-tracking`, `account-management`, `credit-card-rewards`, `ui-design-system` (all modified); `payer-contact` (new)
- Affected code:
  - `src/screens/AddTransactionScreen.tsx` — form layout refactor
  - `src/screens/LedgerScreen.tsx` — calendar collapse + search + merge with home
  - `src/screens/HomeScreen.tsx` — merge into ledger or redirect
  - `src/screens/AssetsScreen.tsx` — net asset header, grouped account list
  - `src/screens/MoreScreen.tsx` and all child screens — full-screen push navigation
  - `src/screens/CategoryManagementScreen.tsx` — icon grid uniformity, chevron size, icon picker
  - `src/screens/CreditCardRewardsScreen.tsx` — full Chinese UI
  - `src/components/modals/AddAccountModal.tsx` — KeyboardAvoidingView
  - `src/components/PaymentMethodPicker.tsx` — new compact picker component
  - `src/components/PayerContactPicker.tsx` — new unified payer contact picker
  - `src/navigation/` — tab structure update
  - `src/store/debtStore.ts` (or equivalent) — surface paid-by/paid-for transactions
