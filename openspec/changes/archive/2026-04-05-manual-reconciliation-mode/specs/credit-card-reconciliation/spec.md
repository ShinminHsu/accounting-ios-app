## MODIFIED Requirements

### Requirement: Bill upload and OCR parsing

The system SHALL allow the user to upload a credit card bill as a PDF file or image screenshot. The system SHALL send the file to Gemini API (gemini-2.0-flash) and receive a structured list of line items, each containing: date (YYYY-MM-DD), merchant name, and amount in the card's currency. The upload option SHALL be presented as one of two reconciliation entry points on the idle state (alongside "手動對帳").

#### Scenario: Successful bill parse

- **WHEN** user uploads a valid credit card bill PDF
- **THEN** the system SHALL display a list of parsed line items within 30 seconds, each showing date, merchant, and amount

#### Scenario: Parse fails or returns empty

- **WHEN** Gemini API returns an error or zero line items
- **THEN** the system SHALL display an error message and allow the user to retry or enter items manually
