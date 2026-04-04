// Forest Green theme — primary color tokens
// Swap these values to switch to Warm Coral theme without touching any component code

export const colors = {
  // Brand
  primary: '#4A7C59',
  primaryLight: '#6EA882',
  primaryDark: '#2F5239',

  // Backgrounds
  background: '#FAF8F3',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EDE6',

  // Text
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textDisabled: '#ABABAB',

  // Borders
  border: '#D9D4C8',
  borderLight: '#EDE9E1',

  // Semantic
  income: '#2E7D32',
  expense: '#C62828',
  warning: '#E65100',
  info: '#1565C0',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
