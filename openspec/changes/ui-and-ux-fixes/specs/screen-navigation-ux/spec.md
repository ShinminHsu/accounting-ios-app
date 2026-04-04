## ADDED Requirements

### Requirement: No redundant header bar on tab screens

The Home, Projects, and More tab screens SHALL NOT render a top header bar with a title. The bottom tab bar provides sufficient navigation context. The SafeAreaView top edge SHALL still be respected to avoid content overlapping the status bar.

#### Scenario: Home screen has no header

- **WHEN** the user navigates to the Home tab
- **THEN** no title bar or header View SHALL be visible at the top of the screen

#### Scenario: Projects screen has no header

- **WHEN** the user navigates to the Projects tab
- **THEN** no title bar or header View SHALL be visible at the top of the screen

#### Scenario: More screen has no header

- **WHEN** the user navigates to the More tab
- **THEN** no title bar or header View SHALL be visible at the top of the screen
