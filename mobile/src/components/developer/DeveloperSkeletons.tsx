import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface ShimmerProps {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width = '100%',
  height,
  borderRadius = 10,
  style,
}) => {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity: anim,
        },
        style,
      ]}
    />
  );
};

// ─── Dashboard Skeleton ──────────────────────────────────────────────────────
export const DeveloperDashboardSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Top Banner Skeleton */}
      <View style={styles.topBanner}>
        <Shimmer width={140} height={18} borderRadius={6} style={{ marginBottom: 8 }} />
        <Shimmer width={220} height={26} borderRadius={8} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Shimmer width={80} height={28} borderRadius={14} />
          <Shimmer width={100} height={28} borderRadius={14} />
        </View>
      </View>

      {/* 4 Stats Grid */}
      <View style={styles.grid2x2}>
        {[1, 2, 3, 4].map((key) => (
          <View key={key} style={styles.statCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Shimmer width={36} height={36} borderRadius={10} />
              <Shimmer width={40} height={16} borderRadius={8} />
            </View>
            <Shimmer width={60} height={24} borderRadius={6} style={{ marginBottom: 6 }} />
            <Shimmer width={90} height={13} borderRadius={4} />
          </View>
        ))}
      </View>

      {/* Donut Chart Card Skeleton */}
      <View style={styles.chartCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <Shimmer width={120} height={18} borderRadius={6} />
          <Shimmer width={60} height={18} borderRadius={10} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Shimmer width={110} height={110} borderRadius={55} />
          <View style={{ flex: 1, gap: 10 }}>
            <Shimmer width="90%" height={16} borderRadius={6} />
            <Shimmer width="75%" height={16} borderRadius={6} />
            <Shimmer width="60%" height={16} borderRadius={6} />
          </View>
        </View>
      </View>

      {/* Quick Action Capsules */}
      <View style={styles.capsuleRow}>
        {[1, 2, 3].map((k) => (
          <Shimmer key={k} width={100} height={40} borderRadius={20} />
        ))}
      </View>
    </View>
  );
};

// ─── Roster List Skeleton (Students / Owners / Hostels) ────────────────────────
export const DeveloperListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <View style={styles.listContainer}>
      {/* Search & Filter bar skeleton */}
      <View style={styles.searchBarSkeleton}>
        <Shimmer width="100%" height={44} borderRadius={14} />
      </View>
      <View style={styles.filterChipsRow}>
        {[80, 95, 75, 90].map((w, i) => (
          <Shimmer key={i} width={w} height={32} borderRadius={16} />
        ))}
      </View>

      {/* Card Items */}
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.itemCard}>
          {/* Card Top */}
          <View style={styles.cardHeaderRow}>
            <Shimmer width={46} height={46} borderRadius={14} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Shimmer width="65%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
              <Shimmer width="40%" height={12} borderRadius={4} />
            </View>
            <Shimmer width={64} height={24} borderRadius={12} />
          </View>

          {/* Card Meta Row */}
          <View style={styles.metaRow}>
            <Shimmer width="30%" height={14} borderRadius={4} />
            <Shimmer width="30%" height={14} borderRadius={4} />
            <Shimmer width="25%" height={14} borderRadius={4} />
          </View>

          {/* Action Button Row */}
          <View style={styles.actionRow}>
            <Shimmer width="48%" height={34} borderRadius={10} />
            <Shimmer width="48%" height={34} borderRadius={10} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  capsuleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBarSkeleton: {
    marginBottom: 12,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F9FAFB',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
