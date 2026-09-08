import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  DeviceEventEmitter,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';
import { SkeletonStatCard } from '../../../components/tenant/ui/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;

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
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* ── Branded Premium Gradient Header ───────────────────────────── */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <View style={styles.headerAccentCircle} />
        <View style={styles.headerAccentCircle2} />

        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Home');
                  DeviceEventEmitter.emit('SWITCH_TENANT_PAGE', 1);
                }
              }}
              style={styles.backBtn}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTextWrap}>
              <Text
                style={styles.headerTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Your Progress
              </Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {data ? `Level ${data.currentLevel || 1} · ${data.storiesCompleted || 0} stories completed` : 'Reading stats, streaks & milestones'}
              </Text>
            </View>

            {data && data.currentStreak > 0 ? (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color="#F59E0B" />
                <Text style={styles.streakBadgeText}>{data.currentStreak}d</Text>
              </View>
            ) : (
              <View style={styles.levelBadge}>
                <Ionicons name="trophy-outline" size={13} color="#FFFFFF" />
                <Text style={styles.levelBadgeText}>Lvl {data?.currentLevel || 1}</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {loading || !data ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonStatCard key={i} style={styles.skeletonTile} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            <StatTile icon="book" value={data.storiesCompleted} label="Stories" color={theme.colors.primary} />
            <StatTile icon="time" value={`${data.readingMinutes}m`} label="Read Time" color={theme.colors.info} />
            <StatTile icon="text" value={data.wordsLearned} label="Vocab" color={theme.colors.success} />
            <StatTile icon="flame" value={data.currentStreak} label="Streak" color={theme.colors.accent} />
            <StatTile icon="trophy" value={data.longestStreak} label="Best Run" color="#F59E0B" />
            <StatTile icon="trending-up" value={data.currentLevel} label="Level" color="#EC4899" />
          </View>

          <View style={styles.progressCard}>
            <Text style={styles.progressCardTitle}>Reading Milestones</Text>
            <ProgressRow label="This Week" current={data.weeklyProgress} target={data.weeklyGoal} color={theme.colors.primary} />
            <ProgressRow label="This Month" current={data.monthlyProgress} target={data.monthlyGoal} color={theme.colors.accent} />
            <View style={styles.yearlyRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="ribbon-outline" size={16} color="#7C3AED" />
                <Text style={styles.yearlyLabel}>Yearly Milestone</Text>
              </View>
              <Text style={styles.yearlyValue}>{data.yearlyProgress} levels mastered</Text>
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
      <View style={[styles.tileIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={isSmallScreen ? 18 : 20} color={color} />
      </View>
      <Text
        style={styles.tileValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {value}
      </Text>
      <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
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
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  gradientHeader: {
    paddingBottom: 16,
    overflow: 'hidden',
  },
  headerAccentCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -40,
    right: -20,
  },
  headerAccentCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: 5,
    left: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerTextWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: isSmallScreen ? 12 : 16,
    paddingBottom: 110,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isSmallScreen ? 8 : 10,
    justifyContent: 'space-between',
  },
  tile: {
    width: isSmallScreen ? '31.5%' : '31.3%',
    minWidth: 92,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallScreen ? 10 : 14,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  skeletonTile: {
    width: isSmallScreen ? '31.5%' : '31.3%',
    minWidth: 92,
    height: 88,
    borderRadius: 16,
  },
  tileIcon: {
    width: isSmallScreen ? 32 : 36,
    height: isSmallScreen ? 32 : 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileValue: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  tileLabel: {
    fontSize: isSmallScreen ? 10 : 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: isSmallScreen ? 14 : 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  progressCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 14,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  progressCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  yearlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  yearlyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  yearlyValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default GrowthStatsScreen;
