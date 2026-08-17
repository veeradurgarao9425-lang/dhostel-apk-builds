import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../services/api';
import { useAuth } from '../../../../contexts/AuthContext';
import { theme } from '../../../theme/tenantTheme';
import { GrowthIllustration } from '../../../components/tenant/growth/GrowthIllustration';
import { GrowthHomeSkeleton } from '../../../components/tenant/growth/GrowthSkeletons';

const { width: SCREEN_W } = Dimensions.get('window');

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

const PATH_CONFIG: Record<string, { gradient: [string, string]; icon: string; label: string }> = {
  english_stories: {
    gradient: ['#6D4AFF', '#4F46E5'],
    icon: '📚',
    label: 'English Stories',
  },
  daily_jokes: {
    gradient: ['#F59E0B', '#D97706'],
    icon: '😄',
    label: 'Daily Jokes',
  },
  daily_conversations: {
    gradient: ['#0EA5E9', '#0284C7'],
    icon: '💬',
    label: 'Conversations',
  },
  moral_stories: {
    gradient: ['#EC4899', '#DB2777'],
    icon: '❤️',
    label: 'Moral Stories',
  },
  love_stories: {
    gradient: ['#F43F5E', '#E11D48'],
    icon: '💕',
    label: 'Love Stories',
  },
};

export function GrowthHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const firstName = (user?.name || 'Reader').split(' ')[0];

  const [data, setData] = useState<DashboardData | null>(null);
  const [paths, setPaths] = useState<PathCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dashRes, pathsRes] = await Promise.all([
        api.get('/growth/dashboard'),
        api.get('/growth/paths'),
      ]);
      if (dashRes.data?.success) setData(dashRes.data.data);
      if (pathsRes.data?.success) setPaths(pathsRes.data.data);
    } catch {
      // silent
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

  const xpPct = data?.xpForNextLevel
    ? Math.min(100, Math.round((data.xp / data.xpForNextLevel) * 100))
    : 0;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Gradient Header */}
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.gradientHeader}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.greetingText}>Welcome back,</Text>
              <Text style={styles.greetingName}>{firstName} 👋</Text>
            </View>
            <TouchableOpacity
              style={styles.headerLibraryBtn}
              onPress={() => navigation.navigate('GrowthSavedStories', { tab: 'saved' })}
            >
              <Ionicons name="library-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Stats row inside header */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{data?.currentStreak ?? 0}</Text>
              <Text style={styles.statLbl}>🔥 Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{data?.xp ?? 0}</Text>
              <Text style={styles.statLbl}>⭐ XP</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>Lv {data?.level ?? 1}</Text>
              <Text style={styles.statLbl}>📊 Level</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{data?.readingMinutes ?? 0}m</Text>
              <Text style={styles.statLbl}>📖 Read</Text>
            </View>
          </View>

          {/* XP progress bar */}
          <View style={styles.xpBarWrap}>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${xpPct}%` }]} />
            </View>
            <Text style={styles.xpBarLabel}>{xpPct}% to Lv {(data?.level ?? 1) + 1}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily Quote */}
        {data?.quote ? (
          <View style={styles.quoteBlock}>
            <Text style={styles.quoteIcon}>"</Text>
            <Text style={styles.quoteText}>{data.quote}</Text>
            <View style={styles.quoteDivider} />
          </View>
        ) : null}

        {/* Continue Learning */}
        <Text style={styles.sectionLabel}>CONTINUE LEARNING</Text>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            const matchedPath = paths.find((p) => p.path_key === data?.todaysChallenge.category) || paths[0];
            if (matchedPath) {
              navigation.navigate('GrowthRoadmap', {
                pathKey: matchedPath.path_key,
                pathName: matchedPath.name,
                colorHex: matchedPath.color_hex,
              });
            }
          }}
        >
          <LinearGradient
            colors={['#4F46E5', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueCard}
          >
            <View style={styles.continueContent}>
              <View style={styles.resumePill}>
                <Ionicons name="play-circle" size={12} color="#4F46E5" />
                <Text style={styles.resumePillText}>RESUME</Text>
              </View>
              <Text style={styles.continueTitle} numberOfLines={2}>
                {data?.todaysChallenge.title?.replace('Finish: ', '') || 'Begin your first story'}
              </Text>
              <View style={styles.continueProgressRow}>
                <View style={styles.continueProgressBg}>
                  <View style={[styles.continueProgressFill, { width: '45%' }]} />
                </View>
                <Text style={styles.continueProgressPct}>45%</Text>
              </View>
            </View>
            <View style={styles.continueArrow}>
              <Ionicons name="arrow-forward" size={20} color="#4F46E5" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('GrowthVocabularyList')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="book-outline" size={18} color="#4F46E5" />
            </View>
            <Text style={styles.quickActionLabel}>Vocabulary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('GrowthSavedStories', { tab: 'saved' })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="bookmark-outline" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionLabel}>Saved</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('GrowthSavedStories', { tab: 'liked' })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF1F2' }]}>
              <Ionicons name="heart-outline" size={18} color="#F43F5E" />
            </View>
            <Text style={styles.quickActionLabel}>Liked</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('GrowthStats')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="stats-chart-outline" size={18} color="#22C55E" />
            </View>
            <Text style={styles.quickActionLabel}>Progress</Text>
          </TouchableOpacity>
        </View>

        {/* Explore Categories */}
        <Text style={styles.sectionLabel}>EXPLORE CATEGORIES</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {paths.map((p) => {
            const cfg = PATH_CONFIG[p.path_key] || {
              gradient: ['#64748B', '#475569'] as [string, string],
              icon: '📚',
              label: p.name,
            };
            return (
              <TouchableOpacity
                key={p.path_id}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('GrowthRoadmap', {
                    pathKey: p.path_key,
                    pathName: p.name,
                    colorHex: p.color_hex,
                  })
                }
              >
                <LinearGradient
                  colors={cfg.gradient}
                  style={styles.categoryCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.categoryCardEmoji}>{cfg.icon}</Text>
                  <Text style={styles.categoryCardName}>{p.name}</Text>
                  <Text style={styles.categoryCardCount}>{p.totalLevels} stories</Text>
                  <View style={styles.categoryCardArrow}>
                    <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.8)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Recently Added / Opened */}
        {data?.recentlyAdded && data.recentlyAdded.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RECENTLY OPENED</Text>
            <View style={styles.recentList}>
              {data.recentlyAdded.slice(0, 5).map((story, idx) => {
                const isLocked = story.status === 'locked';
                const isFirst = idx === 0;
                return (
                  <TouchableOpacity
                    key={story.levelId}
                    style={[styles.recentCard, isFirst && styles.recentCardFeatured, isLocked && { opacity: 0.6 }]}
                    activeOpacity={isLocked ? 1 : 0.85}
                    onPress={() => {
                      if (isLocked) {
                        Alert.alert('Locked', 'Complete previous levels to unlock this story.');
                        return;
                      }
                      navigation.navigate('GrowthStory', { levelId: story.levelId });
                    }}
                  >
                    <View style={[
                      styles.recentThumb,
                      { backgroundColor: story.category === 'Love Story' ? '#FFF1F2' : story.category === 'Conversation' ? '#EEF2FF' : '#F0FDF4' }
                    ]}>
                      <Text style={styles.recentThumbEmoji}>
                        {story.category === 'Love Story' ? '💕' : story.category === 'Conversation' ? '💬' : '📖'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.recentStoryTitle} numberOfLines={2}>{story.title}</Text>
                      <View style={styles.recentMeta}>
                        <Text style={styles.recentMetaText}>{story.readingTime} min</Text>
                        <View style={styles.recentMetaDot} />
                        <Text style={[
                          styles.recentMetaText,
                          { color: story.status === 'completed' ? '#22C55E' : story.status === 'locked' ? '#94A3B8' : '#4F46E5' }
                        ]}>
                          {story.status}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isLocked ? 'lock-closed-outline' : 'chevron-forward'}
                      size={16}
                      color="#CBD5E1"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Browse All */}
        {paths.length > 0 && (
          <TouchableOpacity
            style={styles.browseAllBtn}
            onPress={() => {
              const first = paths[0];
              navigation.navigate('GrowthRoadmap', {
                pathKey: first.path_key,
                pathName: first.name,
                colorHex: first.color_hex,
              });
            }}
          >
            <Text style={styles.browseAllText}>Browse All Stories</Text>
            <Ionicons name="arrow-forward" size={16} color="#4F46E5" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  gradientHeader: {
    paddingBottom: 20,
    elevation: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  greetingName: { fontSize: 18, color: '#FFFFFF', fontWeight: '800' },
  headerLibraryBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  xpBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  xpBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  xpBarLabel: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '700', width: 80, textAlign: 'right' },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Quote
  quoteBlock: {
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  quoteIcon: {
    fontSize: 40,
    lineHeight: 36,
    color: '#4F46E5',
    fontFamily: 'serif',
    marginBottom: -8,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#1E293B',
    lineHeight: 22,
    fontFamily: 'serif',
  },
  quoteDivider: { marginTop: 12, height: 1, backgroundColor: '#F1F5F9' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },

  // Continue card
  continueCard: {
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  continueContent: { flex: 1, marginRight: 12 },
  resumePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  resumePillText: { fontSize: 10, fontWeight: '800', color: '#4F46E5', letterSpacing: 0.5 },
  continueTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 21,
    marginBottom: 10,
  },
  continueProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueProgressBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  continueProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  continueProgressPct: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  continueArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAction: { alignItems: 'center', flex: 1 },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  quickActionLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },

  // Categories
  categoriesScroll: {
    paddingBottom: 8,
    gap: 10,
    marginBottom: 24,
  },
  categoryCard: {
    width: 140,
    height: 130,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  categoryCardEmoji: { fontSize: 28 },
  categoryCardName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 17,
  },
  categoryCardCount: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  categoryCardArrow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },

  // Recent list
  recentList: {
    gap: 8,
    marginBottom: 24,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  recentCardFeatured: {
    borderColor: '#C7D2FE',
    borderWidth: 1.5,
    elevation: 3,
  },
  recentThumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentThumbEmoji: { fontSize: 22 },
  recentStoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 4,
  },
  recentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentMetaText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  recentMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },

  // Browse all
  browseAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
  },
  browseAllText: { fontSize: 14, fontWeight: '700', color: '#4F46E5' },
});

export default GrowthHomeScreen;
