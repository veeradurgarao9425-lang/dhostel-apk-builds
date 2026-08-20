/**
 * devTheme — design tokens for the Developer / Master Admin surface.
 *
 * Why this file exists: every developer screen used to inline the same
 * `['#18181B', '#27272A', '#1C1917']` near-black gradient plus a 12px-radius
 * drop shadow and two translucent "orb" overlays. Those three things together
 * were the dark smear that appeared to overlap the content under the header.
 * The header is now a single deep-navy surface with a hairline edge and a thin
 * brand rule — no shadow spill, no orbs — and it is defined once, here.
 *
 * Palette: deep navy chrome + the app's existing rust-orange brand accent.
 * Status colours are shared with the owner app so a green pill means the same
 * thing everywhere.
 */

export const devColors = {
  // ── Header / chrome ──
  headerTop: '#1F2A44',
  headerBottom: '#28364F',
  headerBorder: '#111C30',
  onHeader: '#FFFFFF',
  onHeaderMuted: '#A9B4C7',
  onHeaderSubtle: 'rgba(255, 255, 255, 0.10)',
  onHeaderSubtleBorder: 'rgba(255, 255, 255, 0.16)',

  // ── Brand accent ──
  brand: '#EA580C',
  brandDark: '#C2410C',
  brandLight: '#FB923C',
  brandTint: '#FFF7ED',
  brandBorder: '#FED7AA',

  // ── Surfaces ──
  screen: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  border: '#E6EAF0',
  borderStrong: '#D5DBE5',
  divider: '#F0F3F7',

  // ── Text ──
  text: '#0F172A',
  textSecondary: '#5A6577',
  textMuted: '#8B95A5',

  // ── Status ──
  success: '#059669',
  successTint: '#ECFDF5',
  successBorder: '#A7F3D0',
  danger: '#DC2626',
  dangerTint: '#FEF2F2',
  dangerBorder: '#FECACA',
  warning: '#D97706',
  warningTint: '#FFFBEB',
  warningBorder: '#FDE68A',
  info: '#2563EB',
  infoTint: '#EFF6FF',
  infoBorder: '#BFDBFE',
  neutralTint: '#F1F5F9',
  neutralBorder: '#E2E8F0',
} as const;

export const devRadius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

export const devSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/** One card elevation for the whole surface — subtle, never a dark halo. */
export const devShadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 2,
} as const;

export const devCard = {
  backgroundColor: devColors.surface,
  borderRadius: devRadius.lg,
  borderWidth: 1,
  borderColor: devColors.border,
  ...devShadow,
} as const;

/** Money in Indian format, with a ₹ prefix. `0` renders as `₹0`, never blank. */
export const inr = (value: any): string => `₹${Number(value || 0).toLocaleString('en-IN')}`;

/** Compact money for chart labels and tight badges: ₹1.2L, ₹45.0k, ₹800. */
export const inrCompact = (value: any): string => {
  const n = Math.abs(Number(value || 0));
  const sign = Number(value || 0) < 0 ? '-' : '';
  if (n >= 10000000) return `${sign}₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${sign}₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${sign}₹${(n / 1000).toFixed(1)}k`;
  return `${sign}₹${Math.round(n)}`;
};

/** `2026-08-28` / Date → `28 Aug`. Returns '—' for anything unparseable. */
export const shortDate = (value: any): string => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

/** Same as shortDate but with the year — for payment history rows. */
export const mediumDate = (value: any): string => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Visual treatment for a hostel's billing state. The keys match the
 * `payment_state` values produced by developerFinanceController.paymentState —
 * keep the two in sync.
 */
export const paymentStateStyle: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  PAID: {
    label: 'Paid',
    color: devColors.success,
    bg: devColors.successTint,
    border: devColors.successBorder,
    icon: 'checkmark-circle',
  },
  DUE_SOON: {
    label: 'Due Soon',
    color: devColors.warning,
    bg: devColors.warningTint,
    border: devColors.warningBorder,
    icon: 'time',
  },
  DUE_TODAY: {
    label: 'Due Today',
    color: devColors.brand,
    bg: devColors.brandTint,
    border: devColors.brandBorder,
    icon: 'alert-circle',
  },
  OVERDUE: {
    label: 'Overdue',
    color: devColors.danger,
    bg: devColors.dangerTint,
    border: devColors.dangerBorder,
    icon: 'warning',
  },
  PAUSED: {
    label: 'Paused',
    color: devColors.textSecondary,
    bg: devColors.neutralTint,
    border: devColors.neutralBorder,
    icon: 'pause-circle',
  },
  NOT_SET: {
    label: 'Not Set',
    color: devColors.textMuted,
    bg: devColors.neutralTint,
    border: devColors.neutralBorder,
    icon: 'help-circle',
  },
};

export const billingFrequencyLabel: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half-yearly',
  YEARLY: 'Yearly',
};

export default devColors;
