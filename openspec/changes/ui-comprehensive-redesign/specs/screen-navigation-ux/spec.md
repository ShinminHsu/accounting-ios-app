## ADDED Requirements

### Requirement: More tab uses Stack full-screen navigation

All screens accessible from the More tab (帳戶管理, 分類管理, 信用卡, 借還款追蹤, 定期帳單, 設定 etc.) SHALL be presented as full-screen Stack push screens, not as bottom-sheet modals or pageSheet modals. Each child screen SHALL have a standard back button and support the iOS swipe-back gesture.

#### Scenario: Accounts screen opens full-screen

- **WHEN** the user taps "帳戶管理" in the More screen
- **THEN** AccountsScreen SHALL slide in from the right as a full-screen push, occupying the entire screen with a back button in the top-left

#### Scenario: Swipe-back from child screen

- **WHEN** a More child screen is open and the user swipes from the left edge
- **THEN** the system SHALL navigate back to the More screen using the standard iOS swipe-back gesture

---

### Requirement: Ledger screen with collapsible calendar

The Ledger tab screen SHALL display the transaction list by default. A toggle button SHALL be available (labelled "顯示月曆" when collapsed, "隱藏月曆" when expanded) that reveals or hides a monthly calendar above the transaction list. The calendar SHALL be collapsed by default on app launch.

#### Scenario: Calendar hidden by default

- **WHEN** the user navigates to the Ledger tab
- **THEN** no calendar SHALL be visible and the transaction list SHALL fill the screen below the header

#### Scenario: Expand calendar

- **WHEN** the user taps "顯示月曆"
- **THEN** a monthly calendar SHALL animate into view above the transaction list

#### Scenario: Collapse calendar

- **WHEN** the calendar is expanded and the user taps "隱藏月曆"
- **THEN** the calendar SHALL animate out and the transaction list SHALL expand to fill the space

---

### Requirement: Ledger search via top-right icon

The Ledger screen header SHALL include a magnifying glass (`Search`) icon in the top-right corner. Tapping it SHALL navigate to a full-text search screen that searches across all transactions (name, notes, category name, amount).

#### Scenario: Search icon visible in Ledger header

- **WHEN** the user is on the Ledger tab
- **THEN** a Search icon SHALL be visible in the top-right area of the screen header

#### Scenario: Search returns matching transactions

- **WHEN** the user types "早餐" in the search input
- **THEN** the results list SHALL show all transactions whose name, notes, or category name contains "早餐"

---

### Requirement: Home and Ledger tabs merged

The Home tab SHALL be removed. Its summary content (current month spend, net worth, pending item counts) SHALL be surfaced as a collapsible summary card at the top of the Ledger screen. The bottom tab bar SHALL replace the Home slot with an Assets tab.

#### Scenario: No separate Home tab

- **WHEN** the user launches the app
- **THEN** the bottom tab bar SHALL show: 帳本 / 專案 / ＋ / 資產 / 更多 (five tabs, no 首頁 tab)

#### Scenario: Summary card on Ledger screen

- **WHEN** the user opens the Ledger tab
- **THEN** a summary card showing current month spend and net worth SHALL appear at the top of the screen above the transaction list

## MODIFIED Requirements

### Requirement: No redundant header bar on tab screens

The Ledger, Projects, and More tab screens SHALL NOT render a top header bar with a title separate from the screen's own header row. The SafeAreaView top edge SHALL still be respected.

#### Scenario: Ledger screen has no redundant title bar

- **WHEN** the user navigates to the Ledger tab
- **THEN** no duplicate title bar SHALL appear; the screen's own month/search header row SHALL be the only top element

#### Scenario: Projects screen has no header

- **WHEN** the user navigates to the Projects tab
- **THEN** no title bar or header View SHALL be visible at the top of the screen

#### Scenario: More screen has no header

- **WHEN** the user navigates to the More tab
- **THEN** no title bar or header View SHALL be visible at the top of the screen
