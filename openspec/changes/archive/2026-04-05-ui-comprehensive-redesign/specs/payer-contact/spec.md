## ADDED Requirements

### Requirement: Unified payer contact model

The system SHALL use a single "代付對象" concept for all non-self payer types, replacing the previous "好友/聯絡人" dual-label pattern. All UI labels referring to a payer party SHALL use "代付對象".

#### Scenario: Label shown in transaction form

- **WHEN** the user selects payer type "別人付" or "幫人付" in the transaction entry form
- **THEN** the contact selector field SHALL be labelled "代付對象（選填）" with no mention of "好友" or "聯絡人"

---

### Requirement: Free-text payer name without saved contact

The system SHALL allow the user to type a free-text name for the payer/payee when no saved contact is selected. The free-text name SHALL be stored in a `payer_name` column on the `transactions` table. When a saved contact is selected, `contact_id` is set and `payer_name` SHALL be null.

#### Scenario: Free-text payer name saved

- **WHEN** the user types "室友小明" in the "代付對象" field without picking a saved contact and saves the transaction
- **THEN** the transaction SHALL be saved with `payer_name = "室友小明"` and `contact_id = null`

#### Scenario: Saved contact takes precedence

- **WHEN** the user selects a saved contact "男友" from the picker and saves
- **THEN** the transaction SHALL be saved with `contact_id` set and `payer_name = null`

#### Scenario: Payer name displayed in debt tracking

- **WHEN** a debt record is created from a transaction whose `payer_name` is "室友小明" and `contact_id` is null
- **THEN** the debt tracking screen SHALL display "室友小明" as the contact name for that record

---

### Requirement: Payer contact picker UI

The system SHALL present a combined picker that shows: a searchable list of saved contacts at the top, and a free-text input field at the bottom labelled "或直接輸入名字". Selecting a saved contact clears the free-text field; typing in the free-text field clears any selected contact.

#### Scenario: Pick saved contact clears free text

- **WHEN** the user types "小" in the free-text field and then taps a saved contact in the list
- **THEN** the free-text field SHALL be cleared and only the saved contact SHALL be set

#### Scenario: Free text clears saved contact selection

- **WHEN** the user has selected saved contact "同事" and then types in the free-text field
- **THEN** the saved contact selection SHALL be cleared and the typed name SHALL be used
