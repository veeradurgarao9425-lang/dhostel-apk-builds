/**
 * Stayvix Tenant App — Unified Design System
 *
 * ONE source of truth for color, spacing, radius, typography and shadow.
 * Every screen must use ONLY these tokens — never hardcode values.
 *
 * Design Style: Minimal · Premium · Luxury · Modern · Calm · Fast · Elegant
 * Inspired by: Apple + Linear + Airbnb + Notion + CRED
 */
import { Platform, TextStyle, ViewStyle } from 'react-native';

// ── Color Palette ─────────────────────────────────────────────────────────────
export const colors = {
  // Brand — ONE purple, used consistently everywhere
  primary: '#673DE6',          // Brand purple
  primaryDark: '#5B2FD1',      // Gradient start / pressed state
  primaryLight: '#7A49F2',     // Gradient end / lighter variant
  primarySoft: '#EFE8FF',      // Tinted surface — icon backgrounds, chips
  primaryBorder: '#D4C5FA',    // Soft purple border
  accent: '#8B5CF6',           // Secondary accent

  // Gradient — used on headers and primary buttons
  gradientStart: '#5B2FD1',
  gradientEnd: '#7A49F2',

  // Surfaces
  bg: '#FAFAFC',               // App background — near-white
  surface: '#FFFFFF',          // Cards and sheets
  surfaceAlt: '#F5F4F8',       // Subtle alt surface for inputs / pressed
  surfaceElevated: '#FFFFFF',  // Elevated cards

  // Text
  text: '#202124',             // Primary text — near-black
  textMuted: '#6B7280',        // Secondary text
  textSubtle: '#9CA3AF',       // Placeholder / tertiary
  textOnPrimary: '#FFFFFF',    // Text on purple backgrounds

  // Borders / Dividers
  border: '#ECECF2',           // Default divider
  borderSoft: '#F3F2F8',       // Hairline divider

  // Semantic
  success: '#16A34A',
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

// ── Spacing ───────────────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,    // Standard outer padding
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

// ── Border Radius ─────────────────────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,     // Button radius
  xl: 18,     // Icon container radius
  '2xl': 22,  // Card radius
  '3xl': 28,
  pill: 999,
} as const;

// ── Typography Scale ──────────────────────────────────────────────────────────
export const font = {
  // Sizes
  pageTitle: 28,    // Heading — Bold
  sectionTitle: 18, // Section title — Semibold
  cardTitle: 16,    // Card title — Semibold
  body: 14,         // Body — Medium
  caption: 12,      // Caption

  // Aliases for backward compatibility
  h1: 28,
  h2: 20,
  h3: 18,
  small: 13,
  tiny: 11,
  large: 38,
} as const;

// ── Shadows — Very soft, blur 20, opacity 8% ──────────────────────────────────
export const shadow = {
  // Standard card shadow
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#673DE6',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 2 },
    default: {},
  })!,
  // Elevated — buttons, FAB, floating elements
  raised: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#5B2FD1',
      shadowOpacity: 0.22,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 8 },
    default: {},
  })!,
  // Header / nav bar shadow
  header: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#202124',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 3 },
    default: {},
  })!,
  // Subtle for inner cards
  subtle: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#202124',
      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
    },
    android: { elevation: 1 },
    default: {},
  })!,
} as const;

// ── Text Style Presets ────────────────────────────────────────────────────────
export const text: Record<string, TextStyle> = {
  pageTitle: { fontSize: font.pageTitle, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  sectionTitle: { fontSize: font.sectionTitle, fontWeight: '600', color: colors.text, letterSpacing: -0.2 },
  cardTitle: { fontSize: font.cardTitle, fontWeight: '600', color: colors.text },
  body: { fontSize: font.body, fontWeight: '500', color: colors.text },
  bodyMuted: { fontSize: font.body, fontWeight: '400', color: colors.textMuted },
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
