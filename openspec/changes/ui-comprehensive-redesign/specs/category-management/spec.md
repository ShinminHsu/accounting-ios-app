## ADDED Requirements

### Requirement: Uniform category icon button size

All category icon buttons in the CategoryManagementScreen icon grid and in the icon picker modal SHALL use a uniform touchable area of 52×52 pt and an icon container of 40×40 pt. No icon button SHALL deviate from these dimensions regardless of the icon content.

#### Scenario: All icon buttons equal size in grid

- **WHEN** the user views the category icon grid in CategoryManagementScreen
- **THEN** every icon button SHALL have identical width and height, with no visible size differences between buttons

#### Scenario: Icon picker modal uses same size

- **WHEN** the user opens the icon picker modal to choose a category icon
- **THEN** all icon options SHALL be rendered at the same 52×52 touchable / 40×40 container dimensions

---

### Requirement: Icon picker renders actual icons not strings

The icon picker modal SHALL render each icon option as an actual rendered icon using the `CategoryIcon` component. Icon name strings (e.g., "ShoppingCart", "Bus") SHALL NOT be displayed as text in the picker.

#### Scenario: Icon picker shows visual icons

- **WHEN** the user opens the icon picker to change a category's icon
- **THEN** each option SHALL appear as a rendered icon graphic, not as a text string of the icon name

---

### Requirement: Enlarged expand/collapse chevron

The expand/collapse control for parent categories in CategoryManagementScreen SHALL use `ChevronDown` / `ChevronRight` icons from lucide-react-native at size 20 pt. No arrow emoji or icon smaller than 20 pt SHALL be used.

#### Scenario: Chevron visible and tappable

- **WHEN** the user views the category list with a collapsed parent category
- **THEN** a ChevronRight icon at size 20 SHALL be visible at the left of the parent row, and tapping it SHALL expand the subcategory list
