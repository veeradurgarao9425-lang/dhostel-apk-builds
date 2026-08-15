import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, shadow } from '../../../theme/tenantTheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  noPadding?: boolean;
  padded?: boolean;
}

export default function Card({ children, style, noPadding, padded }: CardProps) {
  const hasPadding = padded !== undefined ? padded : !noPadding;
  return (
    <View style={[styles.card, hasPadding && styles.padding, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  padding: {
    padding: 20,
  },
});
