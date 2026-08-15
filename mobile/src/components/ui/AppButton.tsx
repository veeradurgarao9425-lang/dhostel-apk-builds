import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, FONT, RADIUS, SPACING } from '../../theme/index';

// ─── Types ────────────────────────────────────────────────────────────────────
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

// ─── Variant styles ───────────────────────────────────────────────────────────
const VARIANT_STYLES: Record<Variant, { btn: ViewStyle; text: TextStyle }> = {
  primary: {
    btn: { backgroundColor: COLORS.primary, borderWidth: 0 },
    text: { color: COLORS.white },
  },
  secondary: {
    btn: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: COLORS.primary,
    },
    text: { color: COLORS.primary },
  },
  ghost: {
    btn: { backgroundColor: 'transparent', borderWidth: 0 },
    text: { color: COLORS.primary },
  },
  danger: {
    btn: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: COLORS.error,
    },
    text: { color: COLORS.error },
  },
};

// ─── Size styles ──────────────────────────────────────────────────────────────
const SIZE_STYLES: Record<Size, { btn: ViewStyle; text: TextStyle }> = {
  sm: {
    btn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg, minHeight: 36 },
    text: { fontSize: FONT.sm },
  },
  md: {
    btn: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, minHeight: 48 },
    text: { fontSize: FONT.base },
  },
  lg: {
    btn: { paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xxl, minHeight: 54 },
    text: { fontSize: FONT.md },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  style,
  textStyle,
}) => {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        sizeStyle.btn,
        variantStyle.btn,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? COLORS.white : COLORS.primary}
        />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.text,
              sizeStyle.text,
              variantStyle.text,
              isDisabled && styles.disabledText,
              textStyle,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: FONT.semiBold,
    letterSpacing: 0.2,
  },
  disabledText: {
    opacity: 0.7,
  },
});

export default AppButton;
