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
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.card, style]}>
    <View style={styles.cardHeader}>
      <Shimmer width={56} height={56} borderRadius={RADIUS.md} />
      <View style={{ flex: 1, marginLeft: SPACING.md }}>
        <Shimmer height={18} width="80%" style={{ marginBottom: SPACING.sm }} />
        <Shimmer height={14} width="50%" style={{ marginBottom: SPACING.sm }} />
      </View>
    </View>
    <Shimmer height={1} style={{ marginVertical: SPACING.lg }} />
    <Shimmer height={14} width="95%" style={{ marginBottom: SPACING.sm }} />
    <Shimmer height={14} width="75%" style={{ marginBottom: SPACING.md }} />
    
    <View style={{ flexDirection: 'row', gap: 12, marginTop: SPACING.sm }}>
      <Shimmer height={36} style={{ flex: 1 }} borderRadius={RADIUS.md} />
      <Shimmer height={36} style={{ flex: 1 }} borderRadius={RADIUS.md} />
    </View>
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

// ─── Full Page Skeleton for Large Cards ───────────────────────────────────────
export const SkeletonCardList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={styles.skeletonList}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
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
