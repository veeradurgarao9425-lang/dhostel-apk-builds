// ─── Design Tokens ───────────────────────────────────────────────────────────
// Single source of truth for the entire app. Import from this file everywhere.
// No hardcoded hex values in components.

export const COLORS = {
  primary: '#5F2EEA',       // Purple (PhonePe-style)
  primaryLight: '#EDE9FF',
  primaryDark: '#3B0FAB',
  surface: '#FFFFFF',
  background: '#F5F5F8',
  border: '#E8E8F0',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B6B8A',
  textMuted: '#ABABC4',
  success: '#00B074',
  successLight: '#E6F9F3',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  error: '#E53935',
  errorLight: '#FFEBEE',
  info: '#2196F3',
  infoLight: '#E3F2FD',
  white: '#FFFFFF',
  black: '#000000',
  // Gradient pair
  gradientStart: '#7B4FEA',
  gradientEnd: '#5F2EEA',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 999,
};

export const FONT = {
  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
  black: '900' as const,
  // Sizes
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const SHADOW = {
  card: {
    shadowColor: '#5F2EEA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  strong: {
    shadowColor: '#5F2EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
};
