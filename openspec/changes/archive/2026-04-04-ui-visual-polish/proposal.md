## Why

The app's current UI relies on emoji and text characters as icons, lacks proper touch targets, and uses a flat card style without depth. Upgrading the visual layer improves perceived quality and follows standard iOS UX conventions without changing any business logic.

## What Changes

- Install `lucide-react-native` for consistent SVG icon system
- Install `expo-linear-gradient` for gradient backgrounds
- Replace all emoji icons (💳 🤝 🔁) and text symbols (↻ ＋) with Lucide icons
- Upgrade tab bar to standard iOS format: icon above label (currently label-only)
- Add `shadows` token to `src/theme/index.ts` (sm / md / lg levels)
- Replace `borderWidth: 1` cards with shadow-based elevation
- Upgrade Net Worth Card background from flat `#4A7C59` to linear gradient
- Fix monthly spend amount color: always rendered red (`colors.expense`); change to `colors.text` — only the diff indicator uses income/expense color
- Add `hitSlop` to all small icon buttons (refresh, modal close, etc.) to meet 44×44px minimum touch target

## Non-Goals

- No dark mode support in this change
- No font family changes (system font stays)
- No changes to navigation structure or screen flow
- No data layer changes

## Capabilities

### New Capabilities

- `ui-design-system`: Shadow tokens, icon system, and visual design conventions for the app

### Modified Capabilities

(none — all existing specs describe functional behavior, not visual presentation)

## Impact

- Affected code:
  - `src/theme/index.ts` — add `shadows` export
  - `src/navigation/MainTabNavigator.tsx` — tab icon + label layout
  - `src/screens/HomeScreen.tsx` — net worth gradient, spend color fix, icon replacements, hitSlop
  - `src/screens/LedgerScreen.tsx` — scan for emoji/text icons
  - `src/screens/MoreScreen.tsx` — scan for emoji/text icons
  - `src/screens/accounts/AccountsScreen.tsx` — scan for emoji/text icons
  - `src/screens/reports/ReportsScreen.tsx` — scan for emoji/text icons
  - Other screens in `src/screens/` — scan and replace as needed
- New dependencies: `lucide-react-native`, `expo-linear-gradient`
