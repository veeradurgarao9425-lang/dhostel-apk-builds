import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, font, spacing, shadow } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  icon?: any;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon: Icon,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[styles.touchable, style]}
      >
        <LinearGradient
          colors={isDisabled
            ? ['#B8AAE8', '#C9BFEE']
            : [colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, styles.primaryGradient]}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <>
                {Icon && <Icon size={18} color="#fff" style={{ marginRight: 6 }} />}
                <Text style={styles.primaryText}>{title}</Text>
              </>
          }
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[styles.base, styles.dangerBtn, style]}
      >
        {loading ? <ActivityIndicator size="small" color={colors.danger} /> :
          <Text style={styles.dangerText}>{title}</Text>
        }
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
        style={[styles.base, styles.ghostBtn, style]}
      >
        {Icon && <Icon size={18} color={colors.primary} style={{ marginRight: 6 }} />}
        <Text style={styles.ghostText}>{title}</Text>
      </TouchableOpacity>
    );
  }

  // secondary
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[styles.base, styles.secondaryBtn, style]}
    >
      {Icon && <Icon size={18} color={colors.primary} style={{ marginRight: 6 }} />}
      <Text style={styles.secondaryText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: radius.lg,
    ...shadow.raised,
  },
  base: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing['2xl'],
  },
  primaryGradient: {
    borderRadius: radius.lg,
  },
  primaryText: {
    color: '#fff',
    fontSize: font.body,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
  },
  secondaryText: {
    color: colors.primary,
    fontSize: font.body,
    fontWeight: '600',
  },
  ghostBtn: {
    backgroundColor: colors.primarySoft,
  },
  ghostText: {
    color: colors.primary,
    fontSize: font.body,
    fontWeight: '600',
  },
  dangerBtn: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1.5,
    borderColor: colors.dangerBorder,
  },
  dangerText: {
    color: colors.danger,
    fontSize: font.body,
    fontWeight: '600',
  },
});
