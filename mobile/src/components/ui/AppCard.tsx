import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOW } from '../../theme/index';

// ─── Props ────────────────────────────────────────────────────────────────────
interface AppCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const AppCard: React.FC<AppCardProps> = ({
  children,
  onPress,
  style,
  padding = SPACING.lg,
}) => {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, { padding }, style]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    ...SHADOW.card,
  },
});

export default AppCard;
