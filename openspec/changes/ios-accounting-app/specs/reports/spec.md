## ADDED Requirements

### Requirement: Report period selection

The system SHALL allow the user to select a reporting period using preset options or a custom date range. Preset options SHALL include: This Week, This Month, This Quarter, This Year, Last Month, Last Year. The custom option SHALL allow the user to pick any start and end date. All report views SHALL respect the selected period.

#### Scenario: Select a preset period

- **WHEN** user selects "This Quarter" from the period picker
- **THEN** the system SHALL recalculate all report data for the first day of the current quarter through today

#### Scenario: Select a custom date range

- **WHEN** user sets a custom range of 2026-03-15 to 2026-04-20
- **THEN** the system SHALL display report data for exactly that date range across all report views

### Requirement: Spending summary by period

The system SHALL provide a spending report for the selected period showing: total expenses, breakdown by parent category (amount + percentage of total), and comparison with the immediately preceding period of equal length.

#### Scenario: View current month report

- **WHEN** user opens the Reports screen with "This Month" selected
- **THEN** the system SHALL display total expenses and a ranked list of categories by spend amount, each with its percentage share and a bar representing proportion

#### Scenario: Period with no transactions

- **WHEN** user selects a period with zero transactions
- **THEN** the system SHALL display zero total and an empty state message

### Requirement: Category drill-down

The system SHALL allow the user to tap any category in the monthly report to see a breakdown by subcategory and a list of individual transactions within that category for the selected month.

#### Scenario: Drill into category

- **WHEN** user taps "Food & Drink" in the monthly report
- **THEN** the system SHALL display subcategory totals (breakfast, lunch, etc.) and a chronological list of all Food & Drink transactions for that month

### Requirement: Project budget vs. actual report

The system SHALL display each active project's total spent vs. total budget for the current period, and per-category spent vs. budget within the project.

#### Scenario: View project report

- **WHEN** user opens a project from the Projects tab
- **THEN** the system SHALL display overall budget utilization percentage, remaining budget amount, and a per-category breakdown with over-budget categories highlighted

### Requirement: Trend chart

The system SHALL display a bar chart of spending totals subdivided by the natural sub-unit of the selected period: weekly bars for periods ≤ 3 months, monthly bars for periods > 3 months. The chart SHALL also show top 5 categories by spend and net cash flow (income minus expenses) for the period.

#### Scenario: View trend chart for This Year

- **WHEN** user selects "This Year"
- **THEN** the system SHALL display a 12-bar chart of monthly totals, top 5 spending categories, and net cash flow for the year

#### Scenario: View trend chart for a custom 6-week range

- **WHEN** user selects a custom range spanning 6 weeks
- **THEN** the system SHALL display a bar chart with one bar per week

### Requirement: Account balance history

The system SHALL display a line chart of each account's balance over time, selectable by account and time range (1 month, 3 months, 6 months, 1 year).

#### Scenario: View bank account balance history

- **WHEN** user selects a bank account and 3-month range
- **THEN** the system SHALL display a line chart with one data point per day showing the account balance, using TWD conversion for foreign currency accounts
