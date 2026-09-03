import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../services/api';
import { useAuth } from '../../../../contexts/AuthContext';
import { theme } from '../../../theme/tenantTheme';
import { GrowthHomeSkeleton } from '../../../components/tenant/growth/GrowthSkeletons';
import { notifyGrowthProgress } from '../../../hooks/useTenantNotifications';

const TAB_BAR_HEIGHT = 64;

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
  todaysChallenge: { title: string; levelId: number | null; category: string | null };
  recentlyAdded?: { levelId: number; title: string; category?: string; readingTime: number; status: string }[];
  quote: string;
}

interface PathCategory {
  path_id: number;
  path_key: string;
  name: string;
  emoji: string;
  description: string;
  color_hex: string;
  totalLevels: number;
}

const CATEGORY_STYLES: Record<string, { bg: string; darkBg: string; color: string; icon: string }> = {
  english_stories: {
    bg: '#F3E8FF',
    darkBg: '#2E1065',
    color: '#9333EA',
    icon: '📚',
  },
  daily_jokes: {
    bg: '#FEF3C7',
    darkBg: '#451A03',
    color: '#D97706',
    icon: '😄',
  },
  daily_conversations: {
    bg: '#E0F2FE',
    darkBg: '#082F49',
    color: '#0284C7',
    icon: '💬',
  },
  moral_stories: {
    bg: '#DCFCE7',
    darkBg: '#052E16',
    color: '#16A34A',
    icon: '💡',
  },
  love_stories: {
    bg: '#FFE4E6',
    darkBg: '#4C0519',
    color: '#E11D48',
    icon: '❤️',
  },
};

export function GrowthHomeScreen({
  navigation,
  embedded = false,
  onSwipeToDashboard,
}: {
  navigation: any;
  embedded?: boolean;
  onSwipeToDashboard?: () => void;
}) {
  const { user } = useAuth();
  const firstName = (user?.name || 'Reader').split(' ')[0];
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<DashboardData | null>(null);
  const [paths, setPaths] = useState<PathCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dashRes, pathsRes] = await Promise.all([
        api.get('/growth/dashboard'),
        api.get('/growth/paths'),
      ]);
      if (dashRes.data?.success) {
        setData(dashRes.data.data);
        // Fire streak milestone notification from real API data
        const streak = dashRes.data.data?.currentStreak ?? 0;
        if (streak > 0) notifyGrowthProgress(streak);
      }
      if (pathsRes.data?.success) setPaths(pathsRes.data.data);
    } catch {
      // silent
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('growth_night_mode').then((val) => {
        if (val !== null) setIsNightMode(val === '1');
      });
      load().finally(() => setLoading(false));
    }, [load])
  );

  const toggleNight = async () => {
    const next = !isNightMode;
    setIsNightMode(next);
    await AsyncStorage.setItem('growth_night_mode', next ? '1' : '0');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Dynamic colors for light/dark mode
  const c = {
    bg: isNightMode ? '#0F172A' : '#FAFAFC',
    card: isNightMode ? '#1E293B' : '#FFFFFF',
    border: isNightMode ? '#334155' : '#ECECF2',
    text: isNightMode ? '#F8FAFC' : '#1E293B',
    textSub: isNightMode ? '#94A3B8' : '#64748B',
    divider: isNightMode ? '#334155' : '#F1F5F9',
    bottomNavBg: isNightMode ? '#1E293B' : '#FFFFFF',
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: c.bg, borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: c.text }]}>Growth Journey</Text>
          </View>
        </View>
        <GrowthHomeSkeleton />
      </SafeAreaView>
    );
  }

  // Find target path for daily challenge
  const matchedPath = paths.find((p) => p.path_key === data?.todaysChallenge?.category) || paths[0];

  const handleStartToday = () => {
    if (data?.todaysChallenge?.levelId) {
      navigation.navigate('GrowthStory', { levelId: data.todaysChallenge.levelId });
    } else if (matchedPath) {
      navigation.navigate('GrowthRoadmap', {
        pathKey: matchedPath.path_key,
        pathName: matchedPath.name,
        colorHex: matchedPath.color_hex,
      });
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.bg }]} edges={['top']}>
      <StatusBar barStyle={isNightMode ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />

      {/* Top Navigation Bar */}
      <View style={[styles.header, { backgroundColor: c.bg, borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={() => (embedded && onSwipeToDashboard ? onSwipeToDashboard() : navigation.goBack())}
          style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: c.text }]}>Growth Journey</Text>
          <Text style={[styles.headerSubtitle, { color: c.textSub }]}>Hi {firstName}, ready to learn?</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Dashboard Switch Button Added Before Day and Night Icon */}
          {embedded && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={onSwipeToDashboard}
              activeOpacity={0.7}
            >
              <Ionicons name="grid-outline" size={18} color={isNightMode ? '#F8FAFC' : '#6D4AFF'} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={toggleNight}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isNightMode ? 'sunny' : 'moon-outline'}
              size={20}
              color={isNightMode ? '#FBBF24' : '#6D4AFF'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6D4AFF" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Simple 3-Item Stats Bar */}
        <View style={[styles.statsCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: isNightMode ? '#3B240B' : '#FFF7ED' }]}>
              <Text style={{ fontSize: 16 }}>🔥</Text>
            </View>
            <View>
              <Text style={[styles.statValue, { color: c.text }]}>{data?.currentStreak ?? 0} Days</Text>
              <Text style={[styles.statLabel, { color: c.textSub }]}>Streak</Text>
            </View>
          </View>

          <View style={[styles.statDivider, { backgroundColor: c.border }]} />

          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: isNightMode ? '#362B0D' : '#FEF9C3' }]}>
              <Text style={{ fontSize: 16 }}>⭐</Text>
            </View>
            <View>
              <Text style={[styles.statValue, { color: c.text }]}>{data?.xp ?? 0} XP</Text>
              <Text style={[styles.statLabel, { color: c.textSub }]}>Points</Text>
            </View>
          </View>

          <View style={[styles.statDivider, { backgroundColor: c.border }]} />

          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: isNightMode ? '#102A43' : '#EFF6FF' }]}>
              <Text style={{ fontSize: 16 }}>⏱️</Text>
            </View>
            <View>
              <Text style={[styles.statValue, { color: c.text }]}>{data?.readingMinutes ?? 0}m</Text>
              <Text style={[styles.statLabel, { color: c.textSub }]}>Read Time</Text>
            </View>
          </View>
        </View>

        {/* Daily Pick / Today's Story */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Today's Story</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.dailyCard, { backgroundColor: c.card, borderColor: isNightMode ? '#4338CA' : '#E2D9FF' }]}
          onPress={handleStartToday}
        >
          <View style={styles.dailyCardTop}>
            <View style={[styles.dailyBadge, { backgroundColor: isNightMode ? '#312E81' : '#F4F1FF' }]}>
              <Ionicons name="sparkles" size={12} color="#818CF8" />
              <Text style={[styles.dailyBadgeText, { color: isNightMode ? '#A5B4FC' : '#6D4AFF' }]}>DAILY PICK</Text>
            </View>
            <Text style={[styles.dailyTimeTag, { color: c.textSub }]}>3 min read</Text>
          </View>

          <Text style={[styles.dailyTitle, { color: c.text }]} numberOfLines={2}>
            {data?.todaysChallenge?.title?.replace('Finish: ', '') || 'Explore today’s featured English story'}
          </Text>

          <Text style={[styles.dailySubtitle, { color: c.textSub }]} numberOfLines={1}>
            Practice reading, build vocabulary, and answer quick quiz questions.
          </Text>

          <View style={[styles.dailyFooter, { borderTopColor: c.divider }]}>
            <View style={styles.dailyActionBtn}>
              <Ionicons name="play" size={14} color="#FFFFFF" />
              <Text style={styles.dailyActionText}>Start Reading</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6D4AFF" />
          </View>
        </TouchableOpacity>

        {/* Explore Categories */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Topics</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('GrowthPaths')}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionLink}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoryGrid}>
          {paths.map((p) => {
            const styleCfg = CATEGORY_STYLES[p.path_key] || {
              bg: '#F1F5F9',
              darkBg: '#1E293B',
              color: '#475569',
              icon: p.emoji || '📖',
            };
            return (
              <TouchableOpacity
                key={p.path_id}
                activeOpacity={0.8}
                style={[styles.categoryCard, { backgroundColor: c.card, borderColor: c.border }]}
                onPress={() =>
                  navigation.navigate('GrowthRoadmap', {
                    pathKey: p.path_key,
                    pathName: p.name,
                    colorHex: p.color_hex,
                  })
                }
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: isNightMode ? styleCfg.darkBg : styleCfg.bg }]}>
                  <Text style={styles.categoryIconEmoji}>{styleCfg.icon}</Text>
                </View>
                <Text style={[styles.categoryName, { color: c.text }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.categoryCount, { color: c.textSub }]}>
                  {p.totalLevels || 0} stories
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recently Added Stories */}
        {data?.recentlyAdded && data.recentlyAdded.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Recent Stories</Text>
            </View>

            <View style={[styles.recentContainer, { backgroundColor: c.card, borderColor: c.border }]}>
              {data.recentlyAdded.slice(0, 5).map((story, idx) => {
                const isLocked = story.status === 'locked';
                const isCompleted = story.status === 'completed';

                return (
                  <TouchableOpacity
                    key={story.levelId || idx}
                    style={[styles.recentItem, { borderBottomColor: c.divider }]}
                    activeOpacity={isLocked ? 1 : 0.75}
                    onPress={() => {
                      if (isLocked) {
                        Alert.alert('Story Locked', 'Complete previous stories to unlock this one.');
                        return;
                      }
                      navigation.navigate('GrowthStory', { levelId: story.levelId });
                    }}
                  >
                    <View
                      style={[
                        styles.recentIconBox,
                        {
                          backgroundColor: isNightMode
                            ? '#334155'
                            : story.category === 'Love Story'
                            ? '#FFE4E6'
                            : story.category === 'Conversation'
                            ? '#E0F2FE'
                            : '#F3E8FF',
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 16 }}>
                        {story.category === 'Love Story' ? '❤️' : story.category === 'Conversation' ? '💬' : '📖'}
                      </Text>
                    </View>

                    <View style={styles.recentInfo}>
                      <Text style={[styles.recentTitle, { color: c.text }]} numberOfLines={1}>
                        {story.title}
                      </Text>
                      <Text style={[styles.recentMeta, { color: c.textSub }]}>
                        {story.readingTime || 2}m read · {story.category || 'Story'}
                      </Text>
                    </View>

                    <View style={styles.recentRight}>
                      {isCompleted ? (
                        <View style={[styles.statusCompleted, isNightMode && { backgroundColor: '#064E3B' }]}>
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                          <Text style={[styles.statusCompletedText, isNightMode && { color: '#6EE7B7' }]}>Done</Text>
                        </View>
                      ) : isLocked ? (
                        <Ionicons name="lock-closed-outline" size={16} color="#94A3B8" />
                      ) : (
                        <View style={styles.statusRead}>
                          <Text style={styles.statusReadText}>Read</Text>
                          <Ionicons name="chevron-forward" size={14} color="#6D4AFF" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Daily Motivation Quote */}
        {data?.quote ? (
          <View style={[styles.quoteCard, { backgroundColor: isNightMode ? '#1E1B4B' : '#F8F7FF', borderColor: isNightMode ? '#3730A3' : '#E2D9FF' }]}>
            <View style={styles.quoteTopRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#818CF8" />
              <Text style={[styles.quoteTag, { color: isNightMode ? '#A5B4FC' : '#6D4AFF' }]}>QUOTE OF THE DAY</Text>
            </View>
            <Text style={[styles.quoteText, { color: isNightMode ? '#CBD5E1' : '#475569' }]}>"{data.quote}"</Text>
          </View>
        ) : null}

        {/* Bottom padding so content is not obscured by the tab bar */}
        <View style={{ height: TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 16 }} />
      </ScrollView>

      {/* Exactly Styled Bottom Tab Navigation Bar Matching Dashboard */}
      <View
        style={[
          styles.bottomTabBar,
          {
            backgroundColor: c.bottomNavBg,
            borderTopColor: c.border,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.tabItem}
          onPress={toggleNight}
          activeOpacity={0.7}
        >
          <View style={[styles.tabIconWrap, isNightMode && { backgroundColor: '#334155' }]}>
            <Ionicons
              name={isNightMode ? 'sunny' : 'moon-outline'}
              size={22}
              color={isNightMode ? '#FBBF24' : c.textSub}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: isNightMode ? '#FBBF24' : c.textSub },
              isNightMode && styles.tabLabelActive,
            ]}
            numberOfLines={1}
          >
            {isNightMode ? 'Day' : 'Night'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('GrowthSavedStories', { tab: 'saved' })}
          activeOpacity={0.7}
        >
          <View style={styles.tabIconWrap}>
            <Ionicons name="bookmark-outline" size={22} color="#F59E0B" />
          </View>
          <Text style={[styles.tabLabel, { color: c.textSub }]} numberOfLines={1}>
            Saved
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('GrowthVocabularyList')}
          activeOpacity={0.7}
        >
          <View style={styles.tabIconWrap}>
            <Ionicons name="book-outline" size={22} color="#6D4AFF" />
          </View>
          <Text style={[styles.tabLabel, { color: c.textSub }]} numberOfLines={1}>
            Vocab
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('GrowthStats')}
          activeOpacity={0.7}
        >
          <View style={styles.tabIconWrap}>
            <Ionicons name="stats-chart-outline" size={22} color="#10B981" />
          </View>
          <Text style={[styles.tabLabel, { color: c.textSub }]} numberOfLines={1}>
            Progress
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D4AFF',
  },

  // Daily Story Card
  dailyCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 22,
    elevation: 2,
    shadowColor: '#6D4AFF',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  dailyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dailyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dailyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dailyTimeTag: {
    fontSize: 11,
    fontWeight: '600',
  },
  dailyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 22,
  },
  dailySubtitle: {
    fontSize: 12,
    marginBottom: 14,
  },
  dailyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  dailyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6D4AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dailyActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Categories Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  categoryCard: {
    width: '48.3%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  categoryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryIconEmoji: {
    fontSize: 18,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 11,
  },

  // Recent Stories List
  recentContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 22,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  recentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  recentMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  recentRight: {
    marginLeft: 8,
  },
  statusCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusCompletedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  statusRead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statusReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D4AFF',
  },

  // Quote Card
  quoteCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  quoteTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  quoteTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  quoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Bottom Navigation Bar matching Home Dashboard exactly
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    minHeight: TAB_BAR_HEIGHT,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    minHeight: TAB_BAR_HEIGHT - 8,
  },
  tabIconWrap: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '800',
  },
});

export default GrowthHomeScreen;
