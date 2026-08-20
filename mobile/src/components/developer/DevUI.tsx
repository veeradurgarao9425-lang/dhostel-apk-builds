/**
 * DevUI — the small building blocks shared by every Developer screen.
 *
 * These exist so the dashboard, the money screen, the notification centre and
 * the assistant all render a stat, a badge or a section heading identically.
 * Nothing here fetches data; callers pass values in.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { devColors, devRadius, devCard, paymentStateStyle } from '../../theme/devTheme';

type IconName = keyof typeof Ionicons.glyphMap;

// ─── Section heading ─────────────────────────────────────────────────────────
export const DevSection: React.FC<{
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}> = ({ title, eyebrow, actionLabel, onAction, style }) => (
  <View style={[s.sectionRow, style]}>
    <View style={{ flex: 1 }}>
      {!!eyebrow && <Text style={s.sectionEyebrow}>{eyebrow}</Text>}
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
    {!!actionLabel && !!onAction && (
      <TouchableOpacity onPress={onAction} activeOpacity={0.7} style={s.sectionAction}>
        <Text style={s.sectionActionText}>{actionLabel}</Text>
        <Ionicons name="chevron-forward" size={13} color={devColors.brandDark} />
      </TouchableOpacity>
    )}
  </View>
);

// ─── Card shell ──────────────────────────────────────────────────────────────
export const DevCard: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[s.card, style]}>{children}</View>;

// ─── Status badge ────────────────────────────────────────────────────────────
export const DevBadge: React.FC<{
  label: string;
  color?: string;
  bg?: string;
  border?: string;
  icon?: IconName;
  style?: ViewStyle;
}> = ({ label, color = devColors.textSecondary, bg = devColors.neutralTint, border, icon, style }) => (
  <View
    style={[
      s.badge,
      { backgroundColor: bg, borderColor: border || bg },
      style,
    ]}
  >
    {!!icon && <Ionicons name={icon} size={10} color={color} />}
    <Text style={[s.badgeText, { color }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

/** Badge driven straight off a `payment_state` from the finance API. */
export const PaymentStateBadge: React.FC<{ state?: string | null; style?: ViewStyle }> = ({
  state,
  style,
}) => {
  const cfg = paymentStateStyle[state || 'NOT_SET'] || paymentStateStyle.NOT_SET;
  return (
    <DevBadge
      label={cfg.label}
      color={cfg.color}
      bg={cfg.bg}
      border={cfg.border}
      icon={cfg.icon as IconName}
      style={style}
    />
  );
};

// ─── Stat tile ───────────────────────────────────────────────────────────────
/**
 * The primary metric card. `tone` picks the accent; `size` picks the density:
 *  - 'hero'    the 1-2 headline numbers on a screen
 *  - 'default' the standard grid tile
 *  - 'compact' secondary metrics that must not shout
 */
export const DevStat: React.FC<{
  label: string;
  value: string;
  sub?: string;
  icon?: IconName;
  tone?: 'brand' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  size?: 'hero' | 'default' | 'compact';
  onPress?: () => void;
  style?: ViewStyle;
}> = ({ label, value, sub, icon, tone = 'neutral', size = 'default', onPress, style }) => {
  const tones = {
    brand: { color: devColors.brand, bg: devColors.brandTint, border: devColors.brandBorder },
    success: { color: devColors.success, bg: devColors.successTint, border: devColors.successBorder },
    danger: { color: devColors.danger, bg: devColors.dangerTint, border: devColors.dangerBorder },
    warning: { color: devColors.warning, bg: devColors.warningTint, border: devColors.warningBorder },
    info: { color: devColors.info, bg: devColors.infoTint, border: devColors.infoBorder },
    neutral: { color: devColors.textSecondary, bg: devColors.neutralTint, border: devColors.neutralBorder },
  }[tone];

  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[s.card, size === 'compact' ? s.statCompact : s.stat, style]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={s.statTop}>
        {!!icon && (
          <View style={[s.statIcon, { backgroundColor: tones.bg, borderColor: tones.border }]}>
            <Ionicons name={icon} size={size === 'compact' ? 13 : 15} color={tones.color} />
          </View>
        )}
        {!!onPress && <Ionicons name="chevron-forward" size={13} color={devColors.textMuted} />}
      </View>
      <Text
        style={[
          s.statValue,
          size === 'hero' && s.statValueHero,
          size === 'compact' && s.statValueCompact,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
      <Text style={s.statLabel} numberOfLines={1}>
        {label}
      </Text>
      {!!sub && (
        <Text style={[s.statSub, { color: tones.color }]} numberOfLines={1}>
          {sub}
        </Text>
      )}
    </Wrapper>
  );
};

// ─── Key/value row ───────────────────────────────────────────────────────────
export const DevKeyValue: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
  icon?: IconName;
  last?: boolean;
}> = ({ label, value, valueColor, icon, last }) => (
  <View style={[s.kvRow, !last && s.kvRowBorder]}>
    <View style={s.kvLeft}>
      {!!icon && <Ionicons name={icon} size={13} color={devColors.textMuted} />}
      <Text style={s.kvLabel}>{label}</Text>
    </View>
    <Text style={[s.kvValue, !!valueColor && { color: valueColor }]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

// ─── Progress bar ────────────────────────────────────────────────────────────
export const DevProgress: React.FC<{
  /** 0-100. Clamped, so a bad ratio can never overflow the track. */
  percent: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
}> = ({ percent, color = devColors.brand, height = 7, style }) => {
  const pct = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return (
    <View style={[s.progressTrack, { height, borderRadius: height / 2 }, style]}>
      <View
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

// ─── Segmented control ───────────────────────────────────────────────────────
/**
 * Tabs for a single screen. Rendered inside a horizontal ScrollView so adding a
 * fifth segment never squashes the labels — but with `scrollEnabled` off when
 * everything fits, so it can't fight a parent vertical scroll for the gesture.
 */
export const DevSegments: React.FC<{
  segments: Array<{ key: string; label: string; icon?: IconName; count?: number }>;
  active: string;
  onChange: (key: string) => void;
  variant?: 'onHeader' | 'onSurface';
  style?: ViewStyle;
}> = ({ segments, active, onChange, variant = 'onHeader', style }) => {
  const onHeader = variant === 'onHeader';
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={segments.length > 4}
      contentContainerStyle={[s.segRow, style]}
      keyboardShouldPersistTaps="handled"
    >
      {segments.map((seg) => {
        const isActive = seg.key === active;
        return (
          <TouchableOpacity
            key={seg.key}
            onPress={() => onChange(seg.key)}
            activeOpacity={0.75}
            style={[
              s.segItem,
              onHeader ? s.segItemOnHeader : s.segItemOnSurface,
              isActive && (onHeader ? s.segItemOnHeaderActive : s.segItemOnSurfaceActive),
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            {!!seg.icon && (
              <Ionicons
                name={seg.icon}
                size={13}
                color={
                  isActive
                    ? onHeader
                      ? '#FFFFFF'
                      : devColors.brand
                    : onHeader
                    ? devColors.onHeaderMuted
                    : devColors.textSecondary
                }
              />
            )}
            <Text
              style={[
                s.segText,
                {
                  color: isActive
                    ? onHeader
                      ? '#FFFFFF'
                      : devColors.brand
                    : onHeader
                    ? devColors.onHeaderMuted
                    : devColors.textSecondary,
                },
              ]}
            >
              {seg.label}
            </Text>
            {typeof seg.count === 'number' && seg.count > 0 && (
              <View style={[s.segCount, isActive && s.segCountActive]}>
                <Text style={[s.segCountText, isActive && s.segCountTextActive]}>{seg.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

// ─── Quick action card ───────────────────────────────────────────────────────
/**
 * A command-centre tile: icon, short label, and a live supporting number.
 * `width` lets the caller lay these out in a wrapping grid or a horizontal rail
 * without the component guessing at the screen size.
 */
export const DevQuickAction: React.FC<{
  label: string;
  value?: string;
  hint?: string;
  icon: IconName;
  tone?: 'brand' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  onPress: () => void;
  width?: ViewStyle['width'];
  style?: ViewStyle;
}> = ({ label, value, hint, icon, tone = 'neutral', onPress, width, style }) => {
  const tones = {
    brand: { color: devColors.brand, bg: devColors.brandTint, border: devColors.brandBorder },
    success: { color: devColors.success, bg: devColors.successTint, border: devColors.successBorder },
    danger: { color: devColors.danger, bg: devColors.dangerTint, border: devColors.dangerBorder },
    warning: { color: devColors.warning, bg: devColors.warningTint, border: devColors.warningBorder },
    info: { color: devColors.info, bg: devColors.infoTint, border: devColors.infoBorder },
    neutral: { color: devColors.textSecondary, bg: devColors.neutralTint, border: devColors.neutralBorder },
  }[tone];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[s.card, s.quickAction, !!width && { width }, style]}
    >
      <View style={[s.quickIcon, { backgroundColor: tones.bg, borderColor: tones.border }]}>
        <Ionicons name={icon} size={16} color={tones.color} />
      </View>
      <Text style={s.quickLabel} numberOfLines={2}>
        {label}
      </Text>
      {!!value && (
        <Text style={[s.quickValue, { color: tones.color }]} numberOfLines={1}>
          {value}
        </Text>
      )}
      {!!hint && (
        <Text style={s.quickHint} numberOfLines={1}>
          {hint}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// ─── Empty / error states ────────────────────────────────────────────────────
export const DevEmpty: React.FC<{
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}> = ({ icon = 'file-tray-outline', title, message, actionLabel, onAction, style }) => (
  <View style={[s.card, s.empty, style]}>
    <View style={s.emptyIcon}>
      <Ionicons name={icon} size={22} color={devColors.textMuted} />
    </View>
    <Text style={s.emptyTitle}>{title}</Text>
    {!!message && <Text style={s.emptyMessage}>{message}</Text>}
    {!!actionLabel && !!onAction && (
      <TouchableOpacity onPress={onAction} style={s.emptyBtn} activeOpacity={0.8}>
        <Text style={s.emptyBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const DevError: React.FC<{ message: string; onRetry?: () => void; style?: ViewStyle }> = ({
  message,
  onRetry,
  style,
}) => (
  <View style={[s.card, s.errorCard, style]}>
    <Ionicons name="warning" size={22} color={devColors.danger} />
    <Text style={s.errorTitle}>Couldn't load this data</Text>
    <Text style={s.errorMessage}>{message}</Text>
    {!!onRetry && (
      <TouchableOpacity onPress={onRetry} style={s.retryBtn} activeOpacity={0.8}>
        <Ionicons name="refresh" size={13} color="#FFFFFF" />
        <Text style={s.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Primary / secondary buttons ─────────────────────────────────────────────
export const DevButton: React.FC<{
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}> = ({ label, onPress, icon, variant = 'primary', disabled, style, textStyle }) => {
  const palette = {
    primary: { bg: devColors.brand, fg: '#FFFFFF', border: devColors.brand },
    outline: { bg: devColors.surface, fg: devColors.brandDark, border: devColors.brandBorder },
    danger: { bg: devColors.dangerTint, fg: devColors.danger, border: devColors.dangerBorder },
    ghost: { bg: devColors.neutralTint, fg: devColors.textSecondary, border: devColors.neutralBorder },
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        s.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {!!icon && <Ionicons name={icon} size={15} color={palette.fg} />}
      <Text style={[s.buttonText, { color: palette.fg }, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  card: { ...devCard, padding: 14 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionEyebrow: {
    color: devColors.brand,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  sectionTitle: {
    color: devColors.text,
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingLeft: 8,
  },
  sectionActionText: {
    color: devColors.brandDark,
    fontSize: 12,
    fontWeight: '700',
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },

  stat: { padding: 12 },
  statCompact: { padding: 10 },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 26,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: devRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statValue: {
    color: devColors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  statValueHero: { fontSize: 22 },
  statValueCompact: { fontSize: 14.5 },
  statLabel: {
    color: devColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statSub: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 3,
  },

  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: 12,
  },
  kvRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: devColors.divider,
  },
  kvLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  kvLabel: {
    color: devColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  kvValue: {
    color: devColors.text,
    fontSize: 12.5,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },

  progressTrack: {
    width: '100%',
    backgroundColor: devColors.neutralTint,
    overflow: 'hidden',
  },

  segRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  segItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: devRadius.pill,
    borderWidth: 1,
  },
  segItemOnHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  segItemOnHeaderActive: {
    backgroundColor: devColors.brand,
    borderColor: devColors.brand,
  },
  segItemOnSurface: {
    backgroundColor: devColors.surface,
    borderColor: devColors.border,
  },
  segItemOnSurfaceActive: {
    backgroundColor: devColors.brandTint,
    borderColor: devColors.brandBorder,
  },
  segText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  segCount: {
    minWidth: 17,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
  },
  segCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  segCountText: {
    fontSize: 9,
    fontWeight: '900',
    color: devColors.onHeaderMuted,
  },
  segCountTextActive: {
    color: '#FFFFFF',
  },

  quickAction: {
    padding: 12,
    gap: 2,
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: devRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  quickLabel: {
    color: devColors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 15,
  },
  quickValue: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  quickHint: {
    color: devColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 26,
    gap: 4,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: devRadius.md,
    backgroundColor: devColors.neutralTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    color: devColors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyMessage: {
    color: devColors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 17,
  },
  emptyBtn: {
    marginTop: 10,
    backgroundColor: devColors.brand,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: devRadius.md,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },

  errorCard: {
    alignItems: 'center',
    paddingVertical: 22,
    gap: 4,
    borderColor: devColors.dangerBorder,
  },
  errorTitle: {
    color: devColors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },
  errorMessage: {
    color: devColors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 18,
    lineHeight: 17,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    backgroundColor: devColors.danger,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: devRadius.md,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: devRadius.md,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '800',
  },
});

export default DevCard;
