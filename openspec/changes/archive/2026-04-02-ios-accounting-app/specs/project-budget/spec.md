## ADDED Requirements

### Requirement: Project types

The system SHALL support two project types: Periodic and One-Time. A Periodic project resets its budget tracking on a defined interval (monthly or yearly). A One-Time project has a start date, an optional end date, and a single total budget that does not reset.

#### Scenario: Monthly periodic project at month boundary

- **WHEN** a new calendar month begins
- **THEN** the system SHALL reset the spent amount for all monthly periodic projects to zero while preserving transaction history

#### Scenario: One-time project with end date reached

- **WHEN** today's date is past a one-time project's end date
- **THEN** the system SHALL mark the project as completed and stop accepting new transactions assigned to it

### Requirement: Per-category budget within a project

The system SHALL allow the user to set a budget amount for each category (or subcategory) within a project. A category budget is optional; a project MAY have some categories with budgets and others without.

#### Scenario: View project budget overview

- **WHEN** user opens a project
- **THEN** the system SHALL display each category with a budget as a progress bar showing spent vs. budget amount, and categories without a budget as a simple total spent

#### Scenario: Category budget exceeded

- **WHEN** a transaction causes total spending in a category to exceed that category's budget within a project
- **THEN** the system SHALL display a visual over-budget indicator on the project overview and the specific category row

### Requirement: Assign transaction to project

The system SHALL allow a transaction to be assigned to at most one project. If a transaction is assigned to a project, its amount SHALL count toward both the project's category budget and any top-level monthly spending summary.

#### Scenario: Transaction assigned to project counts against budget

- **WHEN** user records a transaction assigned to project "Japan Trip" in category "Food & Drink"
- **THEN** the system SHALL deduct the amount from the "Food & Drink" budget within "Japan Trip"

#### Scenario: Transaction not assigned to any project

- **WHEN** user records a transaction with no project selected
- **THEN** the system SHALL record the transaction and count it only toward overall monthly category totals, not any project budget

### Requirement: Create and edit projects

The system SHALL allow the user to create a project with: name (required), type (Periodic or One-Time, required), budget interval (monthly or yearly, required for Periodic), start date (required for One-Time), end date (optional for One-Time), and per-category budget amounts (optional).

#### Scenario: Create a periodic project

- **WHEN** user creates a project of type Periodic with interval Monthly
- **THEN** the system SHALL activate the project immediately and begin tracking spending for the current month

#### Scenario: Edit a project budget mid-period

- **WHEN** user changes a category budget amount on an active periodic project
- **THEN** the system SHALL apply the new budget to the current period immediately; past period history remains unchanged
