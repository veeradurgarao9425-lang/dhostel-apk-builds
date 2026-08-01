import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';

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
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Progress</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading || !data ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
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
    </SafeAreaView>
  );
}

function StatTile({ icon, value, label, color }: { icon: any; value: string | number; label: string; color: string }) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  headerTitle: { ...theme.text.sectionTitle },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing['4xl'] },
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
