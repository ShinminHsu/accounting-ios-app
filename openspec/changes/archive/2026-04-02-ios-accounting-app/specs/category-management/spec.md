## ADDED Requirements

### Requirement: Two-level category hierarchy

The system SHALL support categories with exactly two levels: parent category and subcategory. A transaction SHALL be assignable to a parent category directly or to a specific subcategory under a parent.

#### Scenario: Assign transaction to parent category only

- **WHEN** user selects a parent category and no subcategory when recording a transaction
- **THEN** the system SHALL save the transaction under the parent category with no subcategory

#### Scenario: Assign transaction to subcategory

- **WHEN** user selects a parent category and then a subcategory
- **THEN** the system SHALL save the transaction linked to both the parent and subcategory

### Requirement: Default preset categories

The system SHALL provide a set of default parent categories and subcategories on first launch. Default categories SHALL include at minimum: Food & Drink (breakfast, lunch, dinner, cafe, drinks), Transportation (public transit, taxi/rideshare, fuel, parking), Shopping (clothing, electronics, groceries), Entertainment (movies, games, subscriptions), Health (pharmacy, clinic, gym), Housing (rent, utilities, maintenance), Travel, Education, and Other.

#### Scenario: First app launch

- **WHEN** user opens the app for the first time
- **THEN** the system SHALL populate the category list with all default categories and subcategories

### Requirement: Create custom category

The system SHALL allow the user to create a new parent category or add a subcategory under any existing parent. Each category SHALL have a name (required) and an icon/emoji (optional).

#### Scenario: Create a new parent category

- **WHEN** user submits a new parent category with a unique name
- **THEN** the system SHALL create the category and make it available in the transaction form

#### Scenario: Create a duplicate category name

- **WHEN** user submits a new category whose name already exists at the same level under the same parent
- **THEN** the system SHALL reject the submission and display a validation error

### Requirement: Edit and delete categories

The system SHALL allow the user to rename any category. The system SHALL allow deletion of a category only if no transactions are assigned to it.

#### Scenario: Delete a category with no transactions

- **WHEN** user deletes a category that has zero assigned transactions
- **THEN** the system SHALL remove the category

#### Scenario: Delete a category with existing transactions

- **WHEN** user attempts to delete a category that has one or more assigned transactions
- **THEN** the system SHALL prevent deletion and prompt the user to reassign transactions first
