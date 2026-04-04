## Context

The app currently uses:
- Emoji characters (💳 🤝 🔁) as icons in `HomeScreen` pending items
- Text characters (↻ ＋) as action buttons
- Tab bar with Chinese text labels only (首頁 / 帳本 / 專案 / 更多), no icon above label
- Flat card style: `borderWidth: 1, borderColor: colors.borderLight` — no elevation/shadow
- Solid flat color `#4A7C59` for the Net Worth hero card
- `colors.expense` (red) applied unconditionally to the monthly spend amount

All changes are purely in the presentation layer. No data models, navigation structure, auth flow, or business logic changes.

## Goals / Non-Goals

**Goals:**

- Introduce `lucide-react-native` as the single icon library for the app
- Introduce `expo-linear-gradient` for gradient backgrounds
- Add `shadows` token to `src/theme/index.ts` for consistent elevation
- Upgrade tab bar to icon + label layout (iOS convention)
- Make Net Worth Card visually prominent via gradient
- Fix spend amount color: neutral by default, colored only for the diff indicator
- Ensure all small interactive icons meet 44×44px touch target via `hitSlop`

**Non-Goals:**

- Dark mode — requires a separate theming system change
- Custom font family — system font is sufficient; font switching is a separate concern
- Animation or gesture changes — out of scope
- Any screen that is not in the affected file list unless an emoji/text icon is found during scan

## Decisions

### Use lucide-react-native as the icon library

`lucide-react-native` provides a large, consistent icon set with proper SVG rendering on both iOS and Android. It has first-class React Native support and is actively maintained.

**Alternative considered**: `@expo/vector-icons` (included in Expo). Rejected because it bundles multiple icon families (FontAwesome, Ionicons, etc.) which increases bundle size and makes consistency harder to enforce. Lucide gives one cohesive style.

**Installation**: `npx expo install lucide-react-native react-native-svg`

### Use expo-linear-gradient for Net Worth Card

`expo-linear-gradient` is the standard Expo-compatible gradient component. It wraps the native gradient APIs on both platforms with zero bridge overhead.

**Colors**: Gradient from `colors.primary` (`#4A7C59`) to `colors.primaryDark` (`#2F5239`), direction top-left to bottom-right (`start={x:0, y:0} end={x:1, y:1}`).

**Installation**: `npx expo install expo-linear-gradient`

### Shadow tokens added to theme/index.ts

Three levels defined using React Native shadow props (iOS) + `elevation` (Android):

```ts
export const shadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
};
```

Cards that currently use `borderWidth: 1` will switch to `...shadows.sm`. The center FAB already uses inline shadows — migrate to `...shadows.lg`.

### Tab bar: icon above label

Current `TabIcon` component renders only a `<Text>`. New design renders a `<View>` with:
1. Lucide icon component (size 22, color based on `focused`)
2. `<Text>` label below (same font size, same focused color logic)

Icon mapping:
- 首頁 → `Home`
- 帳本 → `BookOpen`
- 更多 → `MoreHorizontal`
- 專案 → `FolderOpen`
- Center add → `Plus` (inside the existing circular FAB)

### Monthly spend amount color fix

Current: `spendAmount` style applies `color: colors.expense` unconditionally.
Fix: change `spendAmount` color to `colors.text`. The `spendDiff` text (which shows ↑/↓ percentage) retains income/expense coloring. This correctly separates "the amount I spent" from "directional change".

### hitSlop for small touch targets

Any `TouchableOpacity` wrapping an icon with visible size under 44×44px receives:
```tsx
hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
```
This applies to: refresh button in HomeScreen header, any close/back icon buttons in modal headers.

## Risks / Trade-offs

- [Risk] `react-native-svg` peer dependency required by `lucide-react-native` — may need version alignment with Expo SDK. → Mitigation: use `npx expo install` (not `npm install`) to get the Expo-compatible version.
- [Risk] Shadow rendering differs between iOS (shadow\* props) and Android (elevation). → Mitigation: The shadow token includes both; test on both platforms.
- [Risk] Gradient on the Net Worth Card may reduce text contrast if colors are too similar. → Mitigation: Both gradient stops use the existing dark-range primary colors; white text on `#4A7C59`→`#2F5239` maintains adequate contrast.
