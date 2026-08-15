import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, FONT, RADIUS, SPACING } from '../../theme/index';

// ─── Types ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

interface AppBadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  small?: boolean;
}

// ─── Variant colors ───────────────────────────────────────────────────────────
const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: COLORS.successLight, text: COLORS.success },
  warning: { bg: COLORS.warningLight, text: COLORS.warning },
  error:   { bg: COLORS.errorLight,   text: COLORS.error },
  info:    { bg: COLORS.infoLight,    text: COLORS.info },
  neutral: { bg: COLORS.border,       text: COLORS.textSecondary },
  primary: { bg: COLORS.primaryLight, text: COLORS.primary },
};

// ─── Component ────────────────────────────────────────────────────────────────
export const AppBadge: React.FC<AppBadgeProps> = ({
  label,
  variant = 'neutral',
  style,
  small = false,
}) => {
  const colors = BADGE_COLORS[variant];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        small && styles.badgeSmall,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: colors.text },
          small && styles.textSmall,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  badgeSmall: {
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
  },
  text: {
    fontSize: FONT.sm,
    fontWeight: FONT.semiBold,
    letterSpacing: 0.2,
  },
  textSmall: {
    fontSize: FONT.xs,
  },
});

export default AppBadge;
