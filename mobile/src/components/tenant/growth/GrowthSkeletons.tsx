import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox } from '../ui/SkeletonLoader';
import { theme } from '../../../theme/tenantTheme';

/** Growth Journey home (hero + continue card + goals card) */
export function GrowthHomeSkeleton() {
  return (
    <View style={styles.content}>
      <SkeletonBox height={190} borderRadius={theme.radius['2xl']} />
      <SkeletonBox height={92} borderRadius={theme.radius.xl} style={{ marginTop: theme.spacing.lg }} />
      <SkeletonBox height={110} borderRadius={theme.radius.xl} style={{ marginTop: theme.spacing.md }} />
    </View>
  );
}

/** Path list rows */
export function GrowthPathsSkeleton() {
  return (
    <View style={styles.content}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <SkeletonBox key={i} height={78} borderRadius={theme.radius.xl} style={{ marginBottom: theme.spacing.md }} />
      ))}
    </View>
  );
}

/** Zig-zag roadmap level nodes */
export function GrowthRoadmapSkeleton() {
  return (
    <View style={styles.content}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.nodeRow, { justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end' }]}>
          <SkeletonBox width={60} height={60} borderRadius={30} />
        </View>
      ))}
    </View>
  );
}

/** Story reader: illustration + title + paragraph lines */
export function GrowthStorySkeleton() {
  return (
    <View style={[styles.content, { alignItems: 'center' }]}>
      <SkeletonBox width={140} height={140} borderRadius={70} />
      <SkeletonBox width="70%" height={22} style={{ marginTop: theme.spacing.lg }} />
      <SkeletonBox width="40%" height={12} style={{ marginTop: 8 }} />
      <SkeletonBox height={48} borderRadius={theme.radius.pill} style={{ marginTop: theme.spacing.lg, width: '100%' }} />
      <View style={{ width: '100%', gap: 10, marginTop: theme.spacing.lg }}>
        <SkeletonBox width="95%" height={14} />
        <SkeletonBox width="88%" height={14} />
        <SkeletonBox width="92%" height={14} />
        <SkeletonBox width="60%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.lg },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
  },
  nodeRow: { flexDirection: 'row', marginVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl },
});
