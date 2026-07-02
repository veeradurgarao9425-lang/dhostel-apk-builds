import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';

// ── SkeletonBox — core primitive ───────────────────────────────────────────────
// Uses native-driver opacity pulse (no shimmer lib required).
interface SkeletonBoxProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({
  width  = '100%',
  height = 14,
  borderRadius = radius.sm,
  style,
}: SkeletonBoxProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    return () => pulse.stopAnimation();
  }, [pulse]);

  return (
    <View style={[{ width: width as any, height, borderRadius, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primarySoft, opacity: pulse }]} />
    </View>
  );
}

// ── Tenant-specific skeleton presets ──────────────────────────────────────────

/** Expense list row: category icon + title/date + amount */
export function SkeletonExpenseCard() {
  return (
    <View style={sk.card}>
      <SkeletonBox width={48} height={48} borderRadius={radius.lg} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="58%" height={13} />
        <SkeletonBox width="36%" height={10} borderRadius={radius.sm} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <SkeletonBox width={64} height={16} borderRadius={radius.md} />
        <SkeletonBox width={44} height={10} borderRadius={radius.sm} />
      </View>
    </View>
  );
}

/** Stats / summary card: icon + label + big number */
export function SkeletonStatCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[sk.statCard, style]}>
      <SkeletonBox width={36} height={36} borderRadius={radius.md} />
      <SkeletonBox width="60%" height={11} style={{ marginTop: 14 }} />
      <SkeletonBox width="80%" height={26} style={{ marginTop: 6 }} borderRadius={radius.md} />
    </View>
  );
}

/** Generic list row: icon + 2 text lines */
export function SkeletonListRow({ last = false }: { last?: boolean }) {
  return (
    <View style={[sk.listRow, last && { borderBottomWidth: 0 }]}>
      <SkeletonBox width={40} height={40} borderRadius={radius.md} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="54%" height={13} />
        <SkeletonBox width="34%" height={10} borderRadius={radius.sm} />
      </View>
    </View>
  );
}

/** Home screen mess menu card */
export function SkeletonMessCard() {
  return (
    <View style={sk.messCard}>
      <View style={sk.messHeader}>
        <SkeletonBox width={34} height={34} borderRadius={radius.md} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBox width="38%" height={12} />
          <SkeletonBox width="55%" height={10} borderRadius={radius.sm} />
        </View>
      </View>
      <View style={{ gap: 9, marginTop: 14 }}>
        <SkeletonBox width="88%" height={11} />
        <SkeletonBox width="72%" height={11} />
        <SkeletonBox width="52%" height={11} />
      </View>
    </View>
  );
}

/** Tenant profile / header section */
export function SkeletonProfileCard() {
  return (
    <View style={sk.profileCard}>
      <SkeletonBox width={72} height={72} borderRadius={radius.pill} />
      <View style={{ gap: 10, alignItems: 'center', width: '100%' }}>
        <SkeletonBox width="55%" height={18} borderRadius={radius.md} style={{ alignSelf: 'center' }} />
        <SkeletonBox width="38%" height={12} borderRadius={radius.sm} style={{ alignSelf: 'center' }} />
        <SkeletonBox width={90}  height={28} borderRadius={radius.pill} style={{ alignSelf: 'center', marginTop: 4 }} />
      </View>
    </View>
  );
}

/** Notification / activity row */
export function SkeletonNotificationRow({ last = false }: { last?: boolean }) {
  return (
    <View style={[sk.listRow, last && { borderBottomWidth: 0 }]}>
      <SkeletonBox width={44} height={44} borderRadius={radius.pill} />
      <View style={{ flex: 1, gap: 7 }}>
        <SkeletonBox width="70%" height={13} />
        <SkeletonBox width="45%" height={10} borderRadius={radius.sm} />
      </View>
      <SkeletonBox width={32} height={10} borderRadius={radius.sm} />
    </View>
  );
}

const sk = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 10,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  messCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 10,
  },
  messHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileCard: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.border,
  },
});
