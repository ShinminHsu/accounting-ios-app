## ADDED Requirements

### Requirement: Add account modal is keyboard-aware

The create-account modal (CreateAccountModal) SHALL wrap its content in a `KeyboardAvoidingView` with `behavior="padding"` on iOS and `behavior="height"` on Android, combined with a `ScrollView` with `keyboardShouldPersistTaps="handled"`. The keyboard SHALL NOT obscure any input field in the modal.

#### Scenario: Account name field visible when keyboard opens

- **WHEN** the user opens the create-account modal and taps the account name field
- **THEN** the keyboard SHALL appear and all form fields SHALL remain visible above the keyboard without being obscured

#### Scenario: Exchange rate input accessible with keyboard open

- **WHEN** the user opens the ExchangeRateModal and taps the exchange rate input field
- **THEN** the keyboard SHALL appear and the rate input field SHALL remain visible above the keyboard

---

### Requirement: Redesigned Assets screen layout

The Assets screen (資產) SHALL display:
1. A header card showing the net asset total in large font with a ±color indicator (green for positive, red for negative), with an eye icon that toggles whether the amount is visible.
2. A 2×2 summary grid card below the header showing: 可支配 (sum of non-credit-card accounts), 負債 (sum of credit card balances as negative), 借出 (total outstanding receivables), 借入 (total outstanding liabilities).
3. A "淨資產趨勢 >" tappable link that navigates to a net worth trend chart.
4. An account list grouped by type (現金帳戶 / 信用帳戶 / 無帳戶). Each group header shows the group name, group total balance, and a ChevronDown/ChevronRight icon to expand/collapse the group. Groups are expanded by default.
5. Each account item shows the account icon, account name, and balance. Credit card accounts additionally show remaining credit and next payment date/amount.

#### Scenario: Net asset total displayed with correct sign color

- **WHEN** the user's net worth is -$1,000
- **THEN** the Assets screen header SHALL display "-$1,000" in red

#### Scenario: Toggle balance visibility

- **WHEN** the user taps the eye icon in the Assets header
- **THEN** the net asset total, all group totals, and all account balances SHALL be replaced with "****" to hide values; tapping again SHALL restore the values

#### Scenario: Collapse account group

- **WHEN** the user taps the ChevronDown on the "現金帳戶" group header
- **THEN** the individual account rows under that group SHALL collapse and the chevron SHALL rotate to ChevronRight

#### Scenario: 2x2 grid shows borrowing figures

- **WHEN** the user has outstanding receivables totalling $500 (借出) and outstanding liabilities totalling $200 (借入)
- **THEN** the summary grid SHALL display $500 in the 借出 cell and $200 in the 借入 cell
