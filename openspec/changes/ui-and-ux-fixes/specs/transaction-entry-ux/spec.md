## ADDED Requirements

### Requirement: Transaction name field

The transaction entry form SHALL include a `name` text input field (labelled "名稱（選填）") as the first field, above the amount. The field SHALL be optional (nullable). The value SHALL be saved to a `name` column on the `transactions` table and displayed in the transaction detail/edit screen.

#### Scenario: Name saved with transaction

- **WHEN** the user types "早餐" in the name field and saves the transaction
- **THEN** the created transaction record SHALL have `name = "早餐"`

#### Scenario: Name omitted

- **WHEN** the user leaves the name field blank and saves the transaction
- **THEN** the transaction SHALL be saved with `name = null` and no validation error SHALL be shown

### Requirement: Working project selector

The project selector in the transaction entry sheet SHALL assign the tapped project to the transaction and close the picker. After a project is selected, the project row in the form SHALL display the selected project's name.

#### Scenario: Select project closes picker and reflects selection

- **WHEN** the user opens the project picker and taps a project row
- **THEN** the picker sheet SHALL close, and the project field in the form SHALL show the selected project's name

#### Scenario: Clear project selection

- **WHEN** the user taps "不指定" (no project) in the picker
- **THEN** `project_id` SHALL be set to `null` and the project field SHALL show a placeholder

### Requirement: Optional contact for debt payer types

When `payer_type` is `paid_for_other` or `paid_by_other`, the contact selector SHALL be labelled "聯絡人（選填）" and SHALL NOT be required. Saving a transaction with these payer types and no contact SHALL succeed.

#### Scenario: Save paid-for-other without contact

- **WHEN** the user sets payer type to "幫別人付" and leaves the contact field blank and taps Save
- **THEN** the transaction SHALL be saved with `contact_id = null` and no error SHALL be shown

#### Scenario: Save paid-by-other without contact

- **WHEN** the user sets payer type to "別人幫我付" and leaves the contact field blank and taps Save
- **THEN** the transaction SHALL be saved with `contact_id = null` and no error SHALL be shown

### Requirement: Category pre-selected in picker

When the category picker opens and a category is already selected, the selected category row SHALL be visually highlighted. Tapping Save in the picker without changing the selection SHALL confirm the existing selection without showing a "請選擇分類" error.

#### Scenario: Re-open picker with existing selection highlighted

- **WHEN** the user has already selected category "餐飲 > 早餐" and opens the category picker again
- **THEN** the "早餐" row SHALL be highlighted as selected when the picker opens

#### Scenario: Confirm existing selection without change

- **WHEN** the category picker opens with a pre-selected category and the user taps Save without changing anything
- **THEN** the original category SHALL remain selected and no error SHALL be shown
