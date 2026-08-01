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
  todaysChallenge: { title: string; levelId: number | null };
  recentlyAdded?: { levelId: number; title: string; readingTime: number; status: string }[];
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
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerGreetingLabel}>Good Morning ☀️</Text>
          <Text style={styles.headerName}>{user?.name || 'Veera Durgarao'}</Text>
        </View>
        <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
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
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{firstName.substring(0, 2).toUpperCase()}</Text>
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
            <Ionicons name="book-outline" size={16} color="#5B39E0" />
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

        {/* Continue Reading Section */}
        <Text style={styles.sectionTitle}>Continue Reading</Text>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.continueCard}
          onPress={() => {
            if (data?.todaysChallenge.levelId) {
              navigation.navigate('GrowthStory', { levelId: data.todaysChallenge.levelId });
            } else if (paths.length > 0) {
              navigation.navigate('GrowthRoadmap', {
                pathKey: paths[0].path_key,
                pathName: paths[0].name,
                colorHex: paths[0].color_hex,
              });
            }
          }}
        >
          <View style={styles.continueIllustrationWrap}>
            <GrowthIllustration illustrationKey={data?.todaysChallenge.title || ''} size={92} />
          </View>
          <View style={styles.continueCardDetails}>
            <Text style={styles.continueTitle}>
              {data?.todaysChallenge.title.replace('Finish: ', '') || 'My First Cooking Disaster'}
            </Text>
            <View style={styles.progressRow}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '60%' }]} />
              </View>
              <Text style={styles.progressPercent}>60%</Text>
            </View>
            <View style={styles.continueMeta}>
              <Ionicons name="time-outline" size={13} color="#64748B" />
              <Text style={styles.continueMetaText}>3 min read</Text>
            </View>
          </View>
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

        {/* Recently Added Section */}
        <Text style={styles.sectionTitle}>Recently Added</Text>
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
                  <GrowthIllustration illustrationKey={story.title} size={48} style={styles.recentThumb} />
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
    </SafeAreaView>
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
  headerGreetingLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  headerName: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginTop: 2 },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadow.subtle,
  },
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
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  continueCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadow.subtle,
  },
  continueIllustrationWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueCardDetails: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'center',
  },
  continueTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', lineHeight: 20 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  progressBarBg: { flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#5B39E0', borderRadius: 3 },
  progressPercent: { fontSize: 11, fontWeight: '700', color: '#5B39E0', marginLeft: 8 },
  continueMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  continueMetaText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
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
});

export default GrowthHomeScreen;
