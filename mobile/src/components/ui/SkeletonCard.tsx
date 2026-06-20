import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../theme/index';

// ─── Shimmer Block ────────────────────────────────────────────────────────────
interface ShimmerProps {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const Shimmer: React.FC<ShimmerProps> = ({
  width = '100%',
  height,
  borderRadius = RADIUS.sm,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: COLORS.primaryLight, opacity },
        style,
      ]}
    />
  );
};

// ─── List Item Skeleton ───────────────────────────────────────────────────────
export const SkeletonListItem: React.FC = () => (
  <View style={styles.listItem}>
    <Shimmer width={48} height={48} borderRadius={RADIUS.md} />
    <View style={styles.listItemBody}>
      <Shimmer height={14} width="60%" style={{ marginBottom: SPACING.sm }} />
      <Shimmer height={11} width="40%" />
    </View>
    <Shimmer width={56} height={28} borderRadius={RADIUS.full} />
  </View>
);

// ─── Card Skeleton ────────────────────────────────────────────────────────────
export const SkeletonCard: React.FC = () => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Shimmer width={36} height={36} borderRadius={RADIUS.sm} />
      <View style={{ flex: 1, marginLeft: SPACING.md }}>
        <Shimmer height={14} width="70%" style={{ marginBottom: SPACING.sm }} />
        <Shimmer height={11} width="50%" />
      </View>
    </View>
    <Shimmer height={1} style={{ marginVertical: SPACING.md }} />
    <Shimmer height={11} width="85%" style={{ marginBottom: SPACING.sm }} />
    <Shimmer height={11} width="65%" />
  </View>
);

// ─── Full Page Skeleton (shows 3 list items) ──────────────────────────────────
export const SkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View style={styles.skeletonList}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonListItem key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  listItemBody: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonList: {
    padding: SPACING.lg,
  },
});

export default SkeletonList;
