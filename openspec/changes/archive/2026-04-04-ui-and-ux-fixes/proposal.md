## Why

Initial testing revealed several usability gaps: redundant page headers waste screen space, the project selector and category pre-selection are broken (preventing transaction saves), and the transaction entry form lacks a name field and enforces an unnecessary contact requirement for debt tracking entries.

## What Changes

- Remove the top page header bar from Home, Projects, and More screens (bottom tab bar is sufficient for context)
- Add a `name` (title) field to transaction entry (e.g., "早餐", "計程車") displayed above the amount
- Fix the project selector in AddTransactionSheet — tapping a project should assign it and close the picker
- Make contact selection optional for "paid-for-other" and "paid-by-other" payer types; contact defaults to blank
- Fix categories not being pre-selected when the category list opens, causing a "請選擇分類" error if the user taps Save without touching the selector
- Fix Supabase schema cache error ("Could not find the table 'public.projects'") when creating a project by reloading the schema cache or using `.rpc()` workaround

## Capabilities

### New Capabilities

- `transaction-entry-ux`: Transaction entry form improvements — name field, optional contact, pre-selected category, working project selector
- `screen-navigation-ux`: Navigation chrome improvements — remove redundant top headers from tab screens

### Modified Capabilities

(none)

## Impact

- Affected specs: `transaction-entry-ux`, `screen-navigation-ux`
- Affected code:
  - `src/screens/transactions/AddTransactionSheet.tsx` — name field, project selector fix, optional contact, category pre-selection
  - `src/screens/HomeScreen.tsx` — remove header bar
  - `src/screens/projects/ProjectsScreen.tsx` — remove header bar
  - `src/screens/MoreScreen.tsx` — remove header bar
  - `src/lib/projects.ts` — schema cache fix for project creation
