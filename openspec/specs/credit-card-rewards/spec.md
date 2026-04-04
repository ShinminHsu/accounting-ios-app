# credit-card-rewards Specification

## Purpose

TBD - created by archiving change 'ios-accounting-app'. Update Purpose after archive.

## Requirements

### Requirement: Per-card reward rule configuration

The system SHALL allow the user to configure reward rules for each credit card account. Each rule SHALL specify: category or specific merchant (required), reward rate as a percentage (required), reward type (cashback-offset / points / account-deposit, required), monthly earning cap in reward units (optional), and minimum single-transaction spend threshold (optional).

#### Scenario: Category-based reward rule

- **WHEN** user sets a rule "Food & Drink → 3% cashback-offset, cap 200 TWD/month"
- **THEN** the system SHALL apply this rule to all transactions in Food & Drink charged to that card

#### Scenario: Merchant-specific rule overrides category rule

- **WHEN** a transaction matches both a merchant-specific rule and a category rule on the same card
- **THEN** the system SHALL apply only the merchant-specific rule (higher specificity wins)

#### Scenario: Rule with minimum spend threshold not met

- **WHEN** a transaction amount is below the rule's minimum single-transaction threshold
- **THEN** the system SHALL award zero reward for that transaction and display a note that the threshold was not met

---
### Requirement: Per-transaction reward preview

The system SHALL calculate and display the estimated reward for each transaction charged to a credit card at the time of entry and on the transaction detail screen.

#### Scenario: Transaction reward calculation within cap

- **WHEN** user records a 500 TWD restaurant transaction on a card with a 3% Food & Drink rule and the monthly cap has not been reached
- **THEN** the system SHALL display estimated reward as 15 TWD cashback

#### Scenario: Transaction reward calculation when monthly cap is reached

- **WHEN** the monthly accumulated reward for a category has already reached the cap
- **THEN** the system SHALL display estimated reward as 0 for new transactions in that category and show a "cap reached" indicator

---
### Requirement: Reward types

The system SHALL handle three reward types differently:

- **Cashback-offset**: Accumulated TWD value; applied as a deduction to the credit card bill during reconciliation
- **Points**: Accumulated integer points; user configures a TWD-per-point conversion rate for display purposes only (no automatic redemption)
- **Account-deposit**: Accumulated TWD value; when the user records the actual deposit received, the system SHALL create an income transaction to the designated account

#### Scenario: Points with conversion rate

- **WHEN** user sets 1 point = 0.5 TWD on a card
- **THEN** the system SHALL display point balances alongside their TWD equivalent in the rewards summary

#### Scenario: Record account-deposit reward received

- **WHEN** user marks an account-deposit reward as received for amount X TWD
- **THEN** the system SHALL create an income transaction of X TWD to the designated account and reset the pending deposit balance to zero

---
### Requirement: Monthly reward summary per card

The system SHALL display a per-card monthly reward summary showing: total estimated reward by type, accumulated vs. cap for each capped rule, and year-to-date totals.

#### Scenario: View monthly reward summary

- **WHEN** user opens the reward summary for a credit card
- **THEN** the system SHALL display the current month's earned cashback, points, and pending account-deposit amounts, each broken down by rule
