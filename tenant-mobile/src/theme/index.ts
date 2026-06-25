/**
 * Stayvix Tenant App — Unified Design System
 *
 * ONE source of truth for color, spacing, radius, typography and shadow.
 * Every screen must use ONLY these tokens — never hardcode values.
 *
 * Design Style: Modern · Premium · Minimal · Material 3 · Flat · CRED-feel
 */
import { Platform, TextStyle, ViewStyle } from 'react-native';

// ── Color Palette ─────────────────────────────────────────────────────────────
export const colors = {
  // Brand
  primary: '#5B4CF0',          // Brand purple
  primaryDark: '#4A3DD6',      // Pressed / dark variant
  primaryLight: '#7C6BFF',     // Secondary / lighter
  primarySoft: '#EEF2FF',      // Tinted surface (indigo-50)
  primaryBorder: '#C7D2FE',    // Indigo-200 border

  // Surfaces
  bg: '#F8F9FC',               // App background — very soft blue-grey
  surface: '#FFFFFF',          // Cards and sheets
  surfaceAlt: '#F3F4F6',       // Subtle alt surface

  // Text
  text: '#111827',             // Primary text — almost black
  textMuted: '#6B7280',        // Secondary text
  textSubtle: '#9CA3AF',       // Placeholder / tertiary
  textOnPrimary: '#FFFFFF',    // Text on purple backgrounds

  // Borders
  border: '#E5E7EB',           // Default border
  borderSoft: '#F3F4F6',       // Hairline divider

  // Semantic
  success: '#22C55E',
  successSoft: '#DCFCE7',
  successBorder: '#BBF7D0',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  warningBorder: '#FDE68A',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  dangerBorder: '#FECACA',
  info: '#3B82F6',
  infoSoft: '#EFF6FF',
  infoBorder: '#BFDBFE',
} as const;

// ── Spacing (Apple-level) ─────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,   // Screen horizontal padding
  '3xl': 32,
  '4xl': 40,
} as const;

// ── Border Radius ─────────────────────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,      // Default card radius
  '2xl': 24,
  '3xl': 28,
  pill: 999,
} as const;

// ── Typography Scale ──────────────────────────────────────────────────────────
export const font = {
  // Sizes
  pageTitle: 32,   // Page title — Bold
  sectionTitle: 22, // Section title — SemiBold
  cardTitle: 16,   // Card title — SemiBold
  body: 14,        // Body — Regular
  caption: 12,     // Caption — Medium
  large: 40,       // Large numbers — Bold

  // Aliases for backward compatibility
  h1: 28,
  h2: 22,
  h3: 18,
  small: 13,
  tiny: 11,
} as const;

// ── Shadows ───────────────────────────────────────────────────────────────────
export const shadow = {
  // Standard card shadow — soft, barely noticeable
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#111827',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 2 },
    default: {},
  })!,
  // Elevated card — buttons, floating elements
  raised: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#5B4CF0',
      shadowOpacity: 0.20,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 6 },
    default: {},
  })!,
  // Header shadow
  header: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#111827',
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    android: { elevation: 1 },
    default: {},
  })!,
} as const;

// ── Text Style Presets ────────────────────────────────────────────────────────
export const text: Record<string, TextStyle> = {
  pageTitle: { fontSize: font.pageTitle, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  sectionTitle: { fontSize: font.sectionTitle, fontWeight: '600', color: colors.text, letterSpacing: -0.3 },
  cardTitle: { fontSize: font.cardTitle, fontWeight: '600', color: colors.text },
  body: { fontSize: font.body, color: colors.text },
  bodyMuted: { fontSize: font.body, color: colors.textMuted },
  caption: { fontSize: font.caption, fontWeight: '500', color: colors.textMuted },
  large: { fontSize: font.large, fontWeight: '700', color: colors.text, letterSpacing: -1 },

  // Backward compat
  h1: { fontSize: font.h1, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: font.h2, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  h3: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  muted: { fontSize: font.body, color: colors.textMuted },
  small: { fontSize: font.small, color: colors.textMuted },
  label: { fontSize: font.small, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 },
};

export const theme = { colors, spacing, radius, font, shadow, text };
export default theme;
