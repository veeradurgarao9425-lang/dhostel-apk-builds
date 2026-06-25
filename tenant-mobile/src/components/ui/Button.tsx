import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors, radius, font, shadow } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success';

const bg: Record<Variant, string> = {
  primary: colors.primary,
  success: colors.success,
  secondary: colors.surface,
  ghost: 'transparent',
};
const fg: Record<Variant, string> = {
  primary: colors.textOnPrimary,
  success: colors.textOnPrimary,
  secondary: colors.text,
  ghost: colors.primary,
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon: Icon,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        { backgroundColor: bg[variant] },
        variant === 'secondary' && styles.bordered,
        (variant === 'primary' || variant === 'success') && shadow.raised,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <>
          {Icon && <Icon size={18} color={fg[variant]} />}
          <Text style={[styles.text, { color: fg[variant] }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  bordered: { borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.5 },
  text: { fontSize: font.body, fontWeight: '700' },
});
