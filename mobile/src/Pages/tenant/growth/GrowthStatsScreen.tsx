import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';
import { SkeletonStatCard } from '../../../components/tenant/ui/SkeletonLoader';

interface Stats {
  readingMinutes: number;
  storiesCompleted: number;
  wordsLearned: number;
  currentStreak: number;
  longestStreak: number;
  currentLevel: number;
  weeklyProgress: number;
  weeklyGoal: number;
  monthlyProgress: number;
  monthlyGoal: number;
  yearlyProgress: number;
}

import AppHeader from '../../../components/tenant/ui/AppHeader';

export function GrowthStatsScreen({ navigation }: any) {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      api
        .get('/growth/stats')
        .then((res) => res.data?.success && setData(res.data.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Standard Unified AppHeader */}
      <AppHeader
        title="Your Progress"
        subtitle={data ? `Level ${data.currentLevel || 1} · 🔥 ${data.currentStreak || 0}d streak` : 'Your reading achievements'}
        showBack={false}
        rightComponent={
          data?.currentLevel ? (
            <View style={styles.levelBadge}>
              <Ionicons name="trophy" size={13} color="#FEF08A" style={{ marginRight: 4 }} />
              <Text style={styles.levelBadgeText}>Lvl {data.currentLevel}</Text>
            </View>
          ) : null
        }
      />



      {loading || !data ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonStatCard key={i} style={{ width: '31%' }} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            <StatTile icon="book" value={data.storiesCompleted} label="Stories Completed" color={theme.colors.primary} />
            <StatTile icon="time" value={`${data.readingMinutes}m`} label="Reading Minutes" color={theme.colors.info} />
            <StatTile icon="text" value={data.wordsLearned} label="Words Learned" color={theme.colors.success} />
            <StatTile icon="flame" value={data.currentStreak} label="Current Streak" color={theme.colors.accent} />
            <StatTile icon="trophy" value={data.longestStreak} label="Longest Streak" color="#F59E0B" />
            <StatTile icon="trending-up" value={data.currentLevel} label="Current Level" color="#EC4899" />
          </View>

          <View style={styles.progressCard}>
            <ProgressRow label="This Week" current={data.weeklyProgress} target={data.weeklyGoal} color={theme.colors.primary} />
            <ProgressRow label="This Month" current={data.monthlyProgress} target={data.monthlyGoal} color={theme.colors.accent} />
            <View style={styles.yearlyRow}>
              <Text style={styles.yearlyLabel}>This Year</Text>
              <Text style={styles.yearlyValue}>{data.yearlyProgress} levels completed</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function StatTile({ icon, value, label, color }: { icon: any; value: string | number; label: string; color: string }) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function ProgressRow({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <View style={styles.progressHeaderRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressCount}>{current}/{target}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  gradientHeader: {
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: { padding: theme.spacing.lg, paddingBottom: 85 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  tile: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'flex-start',
    ...theme.shadow.subtle,
  },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileValue: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  tileLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
  progressCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    ...theme.shadow.card,
  },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { ...theme.text.body, fontWeight: '700' },
  progressCount: { ...theme.text.caption },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  yearlyRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  yearlyLabel: { ...theme.text.body, fontWeight: '700' },
  yearlyValue: { ...theme.text.caption },
});

export default GrowthStatsScreen;
