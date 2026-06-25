import React from 'react';
import { StyleSheet, View, ViewStyle, TouchableOpacity } from 'react-native';
import { colors, radius, spacing, shadow } from '../../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  padded?: boolean;
};

/** Base white rounded card with soft shadow. Tappable when onPress is given. */
export default function Card({ children, style, onPress, padded = true }: Props) {
  const body = <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {body}
      </TouchableOpacity>
    );
  }
  return body;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.card,
  },
  padded: { padding: spacing.lg },
});
