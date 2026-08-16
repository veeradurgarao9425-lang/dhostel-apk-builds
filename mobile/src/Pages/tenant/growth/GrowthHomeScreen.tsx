import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../services/api';
import { useAuth } from '../../../../contexts/AuthContext';
import { theme } from '../../../theme/tenantTheme';
import { GrowthIllustration } from '../../../components/tenant/growth/GrowthIllustration';
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

const PATH_THEMES: Record<string, { bg: string; text: string; emoji: string }> = {
  english_stories: { bg: '#F5F3FF', text: '#6D4AFF', emoji: '📚' },
  daily_jokes: { bg: '#FEF3C7', text: '#D97706', emoji: '😄' },
  daily_conversations: { bg: '#E0F2FE', text: '#0284C7', emoji: '💬' },
  moral_stories: { bg: '#FCE7F3', text: '#DB2777', emoji: '❤️' },
  love_stories: { bg: '#FFE4E6', text: '#E11D48', emoji: '💕' },
};

import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'react-native';

export function GrowthHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const firstName = (user?.name || 'there').split(' ')[0];

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

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Header bar with Indigo Gradient */}
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.gradientHeader}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerInner}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitleLight}>Growth Journey</Text>
              <Text style={styles.headerSubLight}>Daily English & Mindset Practice</Text>
            </View>
            <TouchableOpacity 
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('GrowthVocabularyList')}
            >
              <Ionicons name="book-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile / Streaks Row */}
        <View style={styles.streakRow}>
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.streakVal}>{data?.currentStreak ?? 0}</Text>
              <Text style={styles.streakLbl}>Day Streak</Text>
            </View>
          </View>
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>⭐</Text>
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.streakVal}>{data?.xp ?? 0}</Text>
              <Text style={styles.streakLbl}>Total XP</Text>
            </View>
          </View>
        </View>

        {/* Quick Links Row */}
        <View style={styles.quickLinksRow}>
          <TouchableOpacity
            style={styles.quickLinkItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('GrowthVocabularyList')}
          >
            <Ionicons name="book-outline" size={16} color="#4F46E5" />
            <Text style={styles.quickLinkText}>Vocabulary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLinkItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('GrowthSavedStories', { tab: 'saved' })}
          >
            <Ionicons name="bookmark-outline" size={16} color="#0EA5E9" />
            <Text style={styles.quickLinkText}>Saved</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLinkItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('GrowthSavedStories', { tab: 'liked' })}
          >
            <Ionicons name="heart-outline" size={16} color="#EF4444" />
            <Text style={styles.quickLinkText}>Liked</Text>
          </TouchableOpacity>
        </View>

        {/* Continue Reading Section (Sleek Resume Card) */}
        <Text style={styles.sectionTitle}>Continue Learning</Text>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.continueCardSleek}
          onPress={() => {
            const activeCategory = data?.todaysChallenge.category;
            const matchedPath = paths.find((p) => p.path_key === activeCategory) || paths[0];
            if (matchedPath) {
              navigation.navigate('GrowthRoadmap', {
                pathKey: matchedPath.path_key,
                pathName: matchedPath.name,
                colorHex: matchedPath.color_hex,
              });
            }
          }}
        >
          <LinearGradient colors={['#EEF2FF', '#E0E7FF']} style={styles.continueCardGrad}>
            <View style={styles.continueLeft}>
              <View style={styles.resumeBadge}>
                <Ionicons name="play-circle" size={14} color="#4F46E5" />
                <Text style={styles.resumeBadgeTxt}>RESUME</Text>
              </View>
              <Text style={styles.continueTitleSleek} numberOfLines={2}>
                {data?.todaysChallenge.title.replace('Finish: ', '') || 'The New Hostel Beginning'}
              </Text>
              <View style={styles.progressRowSleek}>
                <View style={styles.progressBarBgSleek}>
                  <View style={[styles.progressBarFillSleek, { width: '50%' }]} />
                </View>
                <Text style={styles.progressPercentSleek}>50%</Text>
              </View>
            </View>
            <View style={styles.continueRightBtn}>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Categories Section */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoriesGrid}>
          {paths.map((p) => {
            const pathTheme = PATH_THEMES[p.path_key] || { bg: '#F1F5F9', text: '#475569', emoji: '📚' };
            return (
              <TouchableOpacity
                key={p.path_id}
                activeOpacity={0.8}
                style={[styles.categoryCard, { backgroundColor: pathTheme.bg }]}
                onPress={() =>
                  navigation.navigate('GrowthRoadmap', {
                    pathKey: p.path_key,
                    pathName: p.name,
                    colorHex: p.color_hex,
                  })
                }
              >
                <View style={styles.categoryCardInner}>
                  <Text style={styles.categoryEmoji}>{pathTheme.emoji}</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.categoryName, { color: pathTheme.text }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.categoryCount}>{p.totalLevels} stories</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recently Opened Section */}
        <Text style={styles.sectionTitle}>Recently Opened</Text>
        <View style={styles.recentList}>
          {data?.recentlyAdded && data.recentlyAdded.length > 0 ? (
            data.recentlyAdded.map((story) => {
              const isLocked = story.status === 'locked';
              return (
                <TouchableOpacity
                  key={story.levelId}
                  style={[styles.recentItem, isLocked && { opacity: 0.65 }]}
                  activeOpacity={isLocked ? 1 : 0.8}
                  onPress={() => {
                    if (isLocked) {
                      Alert.alert('Locked', 'This story is locked. Please complete previous levels first.');
                      return;
                    }
                    navigation.navigate('GrowthStory', { levelId: story.levelId });
                  }}
                >
                  {story.category === 'conversation' ? (
                    <View style={[styles.recentThumb, styles.convoIconWrap]}>
                      <Ionicons name="chatbubbles" size={20} color="#5B39E0" />
                    </View>
                  ) : (
                    <GrowthIllustration illustrationKey={story.title} size={48} style={styles.recentThumb} />
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.recentTitle}>{story.title}</Text>
                    <Text style={styles.recentMeta}>{story.readingTime} min read · {story.status}</Text>
                  </View>
                  <Ionicons
                    name={isLocked ? 'lock-closed-outline' : 'chevron-forward'}
                    size={16}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={{ textAlign: 'center', color: '#64748B', marginVertical: 12, fontSize: 13 }}>
              No recent stories found
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: '#FAF9F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing['4xl'] },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadow.subtle,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  streakEmoji: { fontSize: 20 },
  streakVal: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  streakLbl: { fontSize: 10, fontWeight: '700', color: '#64748B', marginTop: 1 },
  avatarWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#5B39E0',
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#5B39E0' },
  gradientHeader: {
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  backBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerTitleLight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubLight: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  headerIconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  continueCardSleek: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  continueCardGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  continueLeft: {
    flex: 1,
    marginRight: 12,
  },
  resumeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  resumeBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  continueTitleSleek: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B4B',
    lineHeight: 20,
    marginBottom: 8,
  },
  progressRowSleek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBgSleek: {
    flex: 1,
    height: 6,
    backgroundColor: '#C7D2FE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFillSleek: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  progressPercentSleek: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  continueRightBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '48%',
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadow.subtle,
  },
  categoryCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: { fontSize: 24 },
  categoryName: { fontSize: 13, fontWeight: '800' },
  categoryCount: { fontSize: 10, fontWeight: '600', color: '#64748B', marginTop: 2 },
  recentList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: theme.spacing.md,
    ...theme.shadow.subtle,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recentThumb: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  recentTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  recentMeta: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  quickLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    gap: 8,
  },
  quickLinkItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadow.subtle,
  },
  quickLinkText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  convoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GrowthHomeScreen;
