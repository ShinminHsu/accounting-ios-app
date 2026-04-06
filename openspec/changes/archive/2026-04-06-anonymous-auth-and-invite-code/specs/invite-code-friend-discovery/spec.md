## ADDED Requirements

### Requirement: Friend discovery by invite code

The system SHALL allow users to add friends by entering a 6-character invite code. The system SHALL expose a `searchUserByInviteCode(code: string)` function in `src/lib/friends.ts` that queries the public `users` table for a row where `invite_code = code.toUpperCase().trim()` and returns `{ id, invite_code, display_name } | null`.

#### Scenario: Valid invite code entered

- **WHEN** user enters a valid 6-character invite code that matches another user
- **THEN** the system SHALL return that user's record and allow sending a friend request

#### Scenario: Invite code not found

- **WHEN** user enters a code that does not match any user in the `users` table
- **THEN** `searchUserByInviteCode` SHALL return null and the system SHALL display "找不到此邀請碼對應的用戶"

#### Scenario: User enters own invite code

- **WHEN** user enters their own invite code
- **THEN** the system SHALL display "不能加自己為好友" and SHALL NOT submit a friend request

---

### Requirement: Invite code input UI in FriendsScreen

The system SHALL replace the email search input in `FriendsScreen` with an invite code input field. The field SHALL: accept exactly 6 characters, auto-convert to uppercase, use a monospace font for display, and show a "送出邀請" button that is disabled until exactly 6 characters are entered.

#### Scenario: Input fewer than 6 characters

- **WHEN** user types fewer than 6 characters in the invite code field
- **THEN** the "送出邀請" button SHALL be disabled

#### Scenario: Input exactly 6 characters

- **WHEN** user types the 6th character
- **THEN** the "送出邀請" button SHALL become enabled and the input SHALL display the code in uppercase
