## ADDED Requirements

### Requirement: Two-column amount and name layout

The transaction entry form SHALL display the amount input (currency symbol + number field) in the left 55% of a flex row, and the name field + date pill stacked in the right 45% of the same row. The income/expense toggle SHALL remain above this two-column row.

#### Scenario: Amount and name on same visual row

- **WHEN** the user opens the transaction entry form
- **THEN** the amount input SHALL appear on the left half and the name/date fields SHALL appear on the right half of the same row, with both visible simultaneously without scrolling

#### Scenario: Name field still optional in new layout

- **WHEN** the user leaves the name field blank in the right column and saves
- **THEN** the transaction SHALL be saved with `name = null` and no validation error SHALL be shown

---

### Requirement: Compact payment-method segmented picker

The payer type selector SHALL be rendered as a compact segmented control (three equal-width pills in a single row, height ≤ 36 pt) showing Chinese labels only: 自己付 / 別人付 / 幫人付. Individual large button rows for each payer type SHALL NOT be used.

#### Scenario: Payer type displayed compactly

- **WHEN** the user views the transaction entry form
- **THEN** the three payer options SHALL appear as a single compact row of equal-width pills, not as three separate full-width buttons

#### Scenario: Select payer type from segmented control

- **WHEN** the user taps "別人付" in the segmented control
- **THEN** the payer type SHALL be set to `paid_by_other` and the "代付對象" field SHALL appear below

## MODIFIED Requirements

### Requirement: Optional contact for debt payer types

When `payer_type` is `paid_for_other` or `paid_by_other`, the contact field SHALL be labelled "代付對象（選填）" and SHALL NOT be required. The field SHALL use the payer contact picker (see payer-contact spec) supporting both saved contacts and free-text input. Saving with no selection SHALL succeed with `contact_id = null` and `payer_name = null`.

#### Scenario: Save paid-for-other without contact

- **WHEN** the user sets payer type to "幫人付" and leaves the "代付對象" field blank and taps Save
- **THEN** the transaction SHALL be saved with `contact_id = null` and `payer_name = null` and no error SHALL be shown

#### Scenario: Save paid-by-other without contact

- **WHEN** the user sets payer type to "別人付" and leaves the "代付對象" field blank and taps Save
- **THEN** the transaction SHALL be saved with `contact_id = null` and `payer_name = null` and no error SHALL be shown

#### Scenario: Save paid-by-other with free-text payer name

- **WHEN** the user sets payer type to "別人付" and types "室友小明" in the free-text name field and taps Save
- **THEN** the transaction SHALL be saved with `payer_name = "室友小明"` and `contact_id = null`
