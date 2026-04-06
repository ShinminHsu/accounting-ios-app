## MODIFIED Requirements

### Requirement: Friend relationship

The system SHALL allow the user to add another app user as a friend by entering their 6-character invite code. A friendship SHALL be bilateral: both parties must accept before shared transactions can flow between them. The system SHALL support multiple independent friend relationships simultaneously.

#### Scenario: Send friend request by invite code

- **WHEN** user enters a valid 6-character invite code and taps "送出邀請"
- **THEN** the system SHALL create a pending friendship record; the recipient SHALL receive a push notification
