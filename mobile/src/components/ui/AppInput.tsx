import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, RADIUS, SPACING } from '../../theme/index';

// ─── Props ────────────────────────────────────────────────────────────────────
interface AppInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureText?: boolean;
  containerStyle?: ViewStyle;
  onRightIconPress?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  secureText,
  containerStyle,
  onRightIconPress,
  value,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Floating label animation
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isFocused || value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [14, -8] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [FONT.base, FONT.xs] });
  const labelColor = error
    ? COLORS.error
    : isFocused
    ? COLORS.primary
    : COLORS.textSecondary;

  const borderColor = error
    ? COLORS.error
    : isFocused
    ? COLORS.primary
    : COLORS.border;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const isSecure = secureText && !showPassword;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={[styles.inputContainer, { borderColor }]}>
        {/* Floating Label */}
        <Animated.Text
          style={[
            styles.floatingLabel,
            {
              top: labelTop,
              fontSize: labelSize,
              color: labelColor,
              left: leftIcon ? 44 : SPACING.md,
              backgroundColor: COLORS.surface,
              paddingHorizontal: 3,
            },
          ]}
          pointerEvents="none"
        >
          {label}
        </Animated.Text>

        {/* Left Icon */}
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        {/* Text Input */}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithLeft : null]}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isSecure}
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          {...rest}
        />

        {/* Right Icon — or password toggle */}
        {secureText ? (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {rightIcon}
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Error message */}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    minHeight: 54,
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    zIndex: 1,
  },
  leftIcon: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    fontSize: FONT.base,
    color: COLORS.textPrimary,
    fontWeight: FONT.medium,
  },
  inputWithLeft: {
    paddingLeft: 0,
  },
  rightIcon: {
    paddingRight: SPACING.md,
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginLeft: 2,
  },
  errorText: {
    fontSize: FONT.xs,
    color: COLORS.error,
    fontWeight: FONT.medium,
  },
});

export default AppInput;
