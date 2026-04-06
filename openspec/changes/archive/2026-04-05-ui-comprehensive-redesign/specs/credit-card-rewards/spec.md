## ADDED Requirements

### Requirement: Reward rule editor fully in Traditional Chinese

The CreateRewardRuleModal and reward rule editor screens SHALL use Traditional Chinese for all labels, placeholders, and section headings. No English-language labels SHALL appear in the reward rule UI.

The field labels SHALL be:
- 回饋分類或商家：（分類名稱或關鍵字）
- 備註關鍵字：（選填）
- 最低消費門檻：（選填，數字）
- 回饋比例：（百分比，例如 3）
- 回饋類型：（現金回饋 / 點數 / 存入帳戶）
- 每月上限：（選填，回饋單位數量）

#### Scenario: No English text in reward rule editor

- **WHEN** the user opens the reward rule creation modal on a credit card
- **THEN** all visible labels, placeholders, and buttons SHALL be in Traditional Chinese with no English text

#### Scenario: Reward type shown in Chinese

- **WHEN** the user taps the reward type selector
- **THEN** the options SHALL display as "現金回饋抵扣" / "點數累積" / "存入指定帳戶" with no English option names

---

### Requirement: Reward rule editor uses labeled section layout

The reward rule editor SHALL use a labeled-section layout consistent with the rest of the settings screens: each field is a row with a left-side label and a right-side input or picker, separated by a light divider. The layout SHALL NOT use raw TextInput with English placeholder-as-label.

#### Scenario: Category keyword field uses label + input row

- **WHEN** the user views the reward rule editor
- **THEN** the category keyword field SHALL appear as a row: label "回饋分類或商家" on the left, text input on the right

#### Scenario: Minimum spend threshold accepts numeric input

- **WHEN** the user taps the "最低消費門檻" row
- **THEN** a numeric keyboard SHALL appear and the entered value SHALL be used as the minimum single-transaction amount
