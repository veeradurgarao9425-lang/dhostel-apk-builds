import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SHADOW } from '../../theme/index';

// ─── Props ────────────────────────────────────────────────────────────────────
interface FABProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  color?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const FAB: React.FC<FABProps> = ({
  onPress,
  icon = 'add',
  style,
  color = COLORS.primary,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Animate in when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 14,
        stiffness: 180,
        useNativeDriver: true,
      }).start();
    }, [])
  );

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: color }]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add"
      >
        <Ionicons name={icon} size={28} color={COLORS.white} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 88,
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.strong,
  },
});

export default FAB;
