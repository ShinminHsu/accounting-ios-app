## 1. Dependencies

- [x] 1.1 Use lucide-react-native as the icon library: `npx expo install lucide-react-native react-native-svg`
- [x] 1.2 Use expo-linear-gradient for Net Worth Card: `npx expo install expo-linear-gradient`

## 2. Theme — shadow tokens

- [x] 2.1 Shadow tokens added to theme/index.ts: add `shadows` export with `sm`, `md`, `lg` levels, each containing iOS shadow props (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`) and Android `elevation` per design.md values (theme exposes shadow tokens)

## 3. Tab bar — icon above label

- [x] 3.1 Tab bar: icon above label — update `TabIcon` in `src/navigation/MainTabNavigator.tsx` to render a `<View>` with a Lucide icon above the text label using `Home`, `BookOpen`, `FolderOpen`, `MoreHorizontal` (tab bar displays icon above label)
- [x] 3.2 Replace the center add button text character `＋` with a Lucide `Plus` icon (center add button renders Plus icon)
- [x] 3.3 Migrate center FAB shadow from inline styles to `...shadows.lg` from the new theme token (FAB uses large shadow level)

## 4. HomeScreen — icon system and color fix

- [x] 4.1 Replace emoji icons (💳 🤝 🔁) in pending item rows with Lucide icons `CreditCard`, `Handshake`, `RefreshCw` (pending item icons render as SVG; icon system uses lucide-react-native exclusively)
- [x] 4.2 HitSlop for small touch targets: replace the `↻` text refresh button with a Lucide `RefreshCw` icon and add `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` (header action button renders as SVG icon; small icon buttons meet minimum touch target; refresh button is tappable beyond visible bounds)
- [x] 4.3 Monthly spend amount uses neutral text color: change `spendAmount` style color from `colors.expense` to `colors.text`; confirm `spendDiff` text still uses income/expense color (spend amount is neutral regardless of value; diff indicator uses directional color; monthly spend amount color fix)
- [x] 4.4 Net Worth Card uses gradient background: wrap existing card content with `LinearGradient` from `expo-linear-gradient` using `start={{ x: 0, y: 0 }}` `end={{ x: 1, y: 1 }}` and colors `[colors.primary, colors.primaryDark]` (gradient renders on iOS and Android)
- [x] 4.5 Migrate `sectionCard` and `allClearCard` from `borderWidth: 1` to `...shadows.sm` from theme (card uses shadow instead of border)

## 5. Other screens — icon scan and replacement

- [x] 5.1 Scan `src/screens/LedgerScreen.tsx` for emoji and text-symbol icons; replace with Lucide equivalents and add `hitSlop` to any small icon buttons
- [x] 5.2 Scan `src/screens/MoreScreen.tsx` for emoji and text-symbol icons; replace with Lucide equivalents and add `hitSlop` to any small icon buttons
- [x] 5.3 Scan `src/screens/accounts/AccountsScreen.tsx`, `src/screens/reports/ReportsScreen.tsx`, and all remaining screens in `src/screens/` for emoji and text-symbol icons; replace with Lucide equivalents
