import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../services/api';
import { useAuth } from '../../../../contexts/AuthContext';
import { theme } from '../../../theme/tenantTheme';
import { AnimatedProgressCircle } from '../../../components/tenant/growth/AnimatedProgressCircle';
import { GrowthHomeSkeleton } from '../../../components/tenant/growth/GrowthSkeletons';

interface DashboardData {
  level: number;
  xp: number;
  xpForNextLevel: number;
  coins: number;
  currentStreak: number;
  longestStreak: number;
  readingMinutes: number;
  weeklyGoal: number;
  weeklyProgress: number;
  monthlyGoal: number;
  monthlyProgress: number;
  todaysChallenge: { title: string; levelId: number | null };
  quote: string;
}

export function GrowthHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const firstName = (user?.name || 'there').split(' ')[0];

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/growth/dashboard');
      if (res.data?.success) setData(res.data.data);
    } catch {
      // silent — dashboard just shows loading/empty state
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <GrowthHomeSkeleton />
      </SafeAreaView>
    );
  }

  const levelProgressPct = data
    ? Math.min(100, Math.round(((data.xp - (data.level - 1) * 500) / 500) * 100))
    : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[theme.colors.gradientStart, theme.colors.gradientEnd]} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroGreeting}>Welcome back, {firstName} 👋</Text>
              <Text style={styles.heroSubtitle}>Today is another chance to improve yourself.</Text>
            </View>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={16} color="#FDBA74" />
              <Text style={styles.streakBadgeText}>{data?.currentStreak ?? 0}</Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroCircleWrap}>
              <AnimatedProgressCircle
                progress={levelProgressPct}
                size={100}
                strokeWidth={9}
                color="#FFFFFF"
                trackColor="rgba(255,255,255,0.25)"
                label={`Lv ${data?.level ?? 1}`}
                sublabel={`${data?.xp ?? 0} XP`}
              />
            </View>
            <View style={styles.heroStatsCol}>
              <HeroStat icon="flash" value={String(data?.xp ?? 0)} label="Total XP" />
              <HeroStat icon="logo-bitcoin" value={String(data?.coins ?? 0)} label="Coins" />
              <HeroStat icon="book" value={`${data?.readingMinutes ?? 0}m`} label="Reading time" />
            </View>
          </View>

          {data?.quote ? <Text style={styles.quote}>"{data.quote}"</Text> : null}
        </LinearGradient>

        {/* Continue: today's challenge + explore all paths */}
        <View style={styles.continueCard}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.challengeRow}
            onPress={() =>
              data?.todaysChallenge.levelId
                ? navigation.navigate('GrowthStory', { levelId: data.todaysChallenge.levelId })
                : navigation.navigate('GrowthPaths')
            }
          >
            <View style={styles.challengeIconWrap}>
              <Ionicons name="rocket" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeLabel}>Today's Challenge</Text>
              <Text style={styles.challengeTitle}>{data?.todaysChallenge.title || 'Start learning'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.cardDivider} />

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.exploreRow}
            onPress={() => navigation.navigate('GrowthPaths')}
          >
            <Ionicons name="compass-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.exploreRowText}>Explore all paths</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Weekly / Monthly goals + tools */}
        <View style={styles.goalsCard}>
          <GoalBar
            label="Weekly Goal"
            current={data?.weeklyProgress ?? 0}
            target={data?.weeklyGoal ?? 5}
            color={theme.colors.primary}
          />
          <View style={{ height: 14 }} />
          <GoalBar
            label="Monthly Goal"
            current={data?.monthlyProgress ?? 0}
            target={data?.monthlyGoal ?? 20}
            color={theme.colors.accent}
          />

          <View style={styles.cardDivider} />

          <View style={styles.toolsRow}>
            <SecondaryLink icon="bar-chart" label="Stats" onPress={() => navigation.navigate('GrowthStats')} />
            <SecondaryLink icon="bookmark" label="My Vocabulary" onPress={() => navigation.navigate('GrowthVocabularyList')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <View style={styles.heroStatRow}>
      <Ionicons name={icon} size={16} color="#FDE68A" />
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function GoalBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <View>
      <View style={styles.goalHeaderRow}>
        <Text style={styles.goalLabel}>{label}</Text>
        <Text style={styles.goalCount}>{current}/{target}</Text>
      </View>
      <View style={styles.goalTrack}>
        <View style={[styles.goalFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function SecondaryLink({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.secondaryLink} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={18} color={theme.colors.primary} />
      <Text style={styles.secondaryLinkText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing['4xl'] },
  hero: {
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.xl,
    ...theme.shadow.raised,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroGreeting: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4, maxWidth: 220 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  streakBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xl, gap: theme.spacing.lg },
  heroCircleWrap: { alignItems: 'center', justifyContent: 'center' },
  heroStatsCol: { flex: 1, gap: 10 },
  heroStatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStatValue: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  heroStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  quote: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontStyle: 'italic', marginTop: theme.spacing.lg },

  continueCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    ...theme.shadow.card,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  challengeIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  challengeLabel: { ...theme.text.label },
  challengeTitle: { ...theme.text.cardTitle, marginTop: 2 },

  cardDivider: { height: 1, backgroundColor: theme.colors.borderSoft, marginVertical: theme.spacing.md },
  exploreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exploreRowText: { flex: 1, ...theme.text.body, fontWeight: '700', color: theme.colors.primary },

  goalsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    ...theme.shadow.card,
  },
  goalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalLabel: { ...theme.text.body, fontWeight: '700' },
  goalCount: { ...theme.text.caption },
  goalTrack: { height: 8, borderRadius: 4, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: 4 },

  toolsRow: { flexDirection: 'row', gap: theme.spacing.md },
  secondaryLink: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    paddingVertical: 12,
  },
  secondaryLinkText: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },
});

export default GrowthHomeScreen;
