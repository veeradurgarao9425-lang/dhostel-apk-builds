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

// ─── Developer Dashboard Skeleton ─────────────────────────────────────────────
export const DeveloperDashboardSkeleton: React.FC = () => (
  <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
    {/* Top Banner */}
    <View style={styles.devTopBanner}>
      <Shimmer width={140} height={16} borderRadius={6} style={{ marginBottom: 8 }} />
      <Shimmer width={220} height={24} borderRadius={8} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Shimmer width={80} height={26} borderRadius={13} />
        <Shimmer width={100} height={26} borderRadius={13} />
      </View>
    </View>

    {/* 4 Stats Grid */}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
      {[1, 2, 3, 4].map((k) => (
        <View key={k} style={styles.devStatCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Shimmer width={32} height={32} borderRadius={8} />
            <Shimmer width={36} height={14} borderRadius={6} />
          </View>
          <Shimmer width={55} height={20} borderRadius={6} style={{ marginBottom: 6 }} />
          <Shimmer width={80} height={12} borderRadius={4} />
        </View>
      ))}
    </View>

    {/* Donut Chart Skeleton */}
    <View style={styles.devChartCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
        <Shimmer width={120} height={16} borderRadius={6} />
        <Shimmer width={60} height={16} borderRadius={8} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Shimmer width={100} height={100} borderRadius={50} />
        <View style={{ flex: 1, gap: 8 }}>
          <Shimmer width="90%" height={14} borderRadius={4} />
          <Shimmer width="75%" height={14} borderRadius={4} />
          <Shimmer width="60%" height={14} borderRadius={4} />
        </View>
      </View>
    </View>
  </View>
);

// ─── Developer Roster List Skeleton ───────────────────────────────────────────
export const DeveloperListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
    <View style={{ marginBottom: 12 }}>
      <Shimmer width="100%" height={42} borderRadius={12} />
    </View>
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
      {[80, 95, 75, 90].map((w, i) => (
        <Shimmer key={i} width={w} height={30} borderRadius={15} />
      ))}
    </View>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.devItemCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Shimmer width={44} height={44} borderRadius={12} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Shimmer width="65%" height={15} borderRadius={6} style={{ marginBottom: 6 }} />
            <Shimmer width="40%" height={12} borderRadius={4} />
          </View>
          <Shimmer width={60} height={22} borderRadius={11} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F9FAFB', marginBottom: 10 }}>
          <Shimmer width="28%" height={12} borderRadius={4} />
          <Shimmer width="28%" height={12} borderRadius={4} />
          <Shimmer width="28%" height={12} borderRadius={4} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Shimmer width="48%" height={32} borderRadius={8} />
          <Shimmer width="48%" height={32} borderRadius={8} />
        </View>
      </View>
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
  devTopBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  devStatCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  devChartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  devItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
});

export default SkeletonList;
