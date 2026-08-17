import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';
import { SkeletonListRow } from '../../../components/tenant/ui/SkeletonLoader';

interface StoryItem {
  level_id: number;
  title: string;
  category?: string;
  readingTime: number;
  status: string;
}

function getCategoryConfig(category?: string) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('love')) return { emoji: '💕', bg: '#FFF1F2', accent: '#F43F5E', label: 'Love Story' };
  if (cat.includes('conversation') || cat.includes('dialogue')) return { emoji: '💬', bg: '#EEF2FF', accent: '#4F46E5', label: 'Conversation' };
  if (cat.includes('moral')) return { emoji: '⭐', bg: '#FFFBEB', accent: '#F59E0B', label: 'Moral Story' };
  return { emoji: '📖', bg: '#F0FDF4', accent: '#22C55E', label: 'Story' };
}

export function GrowthSavedStoriesScreen({ navigation, route }: any) {
  const [activeTab, setActiveTab] = useState<'saved' | 'liked'>(route.params?.tab || 'saved');
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (tab: 'saved' | 'liked') => {
    setLoading(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const prefix = tab === 'saved' ? 'growth_bookmark_' : 'growth_wishlist_';
      const matchedKeys = keys.filter((k) => k.startsWith(prefix));

      const ids: number[] = [];
      for (const k of matchedKeys) {
        const val = await AsyncStorage.getItem(k);
        if (val === '1') {
          const id = Number(k.replace(prefix, ''));
          if (id) ids.push(id);
        }
      }

      if (ids.length === 0) { setStories([]); return; }

      const res = await api.get(`/growth/levels/batch?ids=${ids.join(',')}`);
      if (res.data?.success) setStories(res.data.data);
    } catch (error) {
      console.error('Failed to load saved stories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { loadData(activeTab); }, [activeTab, loadData])
  );

  const toggleItem = async (levelId: number) => {
    const prefix = activeTab === 'saved' ? 'growth_bookmark_' : 'growth_wishlist_';
    await AsyncStorage.setItem(`${prefix}${levelId}`, '0');
    setStories((prev) => prev.filter((s) => s.level_id !== levelId));
  };

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
              <Text style={styles.headerTitle}>My Library</Text>
              <Text style={styles.headerSub}>
                {stories.length > 0 ? `${stories.length} ${activeTab === 'saved' ? 'saved' : 'liked'} stories` : 'Your personal reading collection'}
              </Text>
            </View>
            <View style={[styles.countBadge]}>
              <Text style={styles.countBadgeText}>{stories.length}</Text>
            </View>
          </View>

          {/* Tab switcher inside header */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
              onPress={() => setActiveTab('saved')}
            >
              <Ionicons
                name={activeTab === 'saved' ? 'bookmark' : 'bookmark-outline'}
                size={15}
                color={activeTab === 'saved' ? '#4F46E5' : 'rgba(255,255,255,0.7)'}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
                Saved
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'liked' && styles.tabActive]}
              onPress={() => setActiveTab('liked')}
            >
              <Ionicons
                name={activeTab === 'liked' ? 'heart' : 'heart-outline'}
                size={15}
                color={activeTab === 'liked' ? '#F43F5E' : 'rgba(255,255,255,0.7)'}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, activeTab === 'liked' && styles.tabTextActive]}>
                Liked
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={{ padding: 20 }}>
          {[0, 1, 2].map((i) => <SkeletonListRow key={i} last={i === 2} />)}
        </View>
      ) : stories.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyEmoji}>{activeTab === 'saved' ? '🔖' : '💕'}</Text>
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'saved' ? 'No saved stories yet' : 'No liked stories yet'}
          </Text>
          <Text style={styles.emptyDesc}>
            {activeTab === 'saved'
              ? 'Tap the bookmark icon while reading any story to save it here for later.'
              : 'Tap the heart icon while reading to like a story and find it here.'}
          </Text>
          <TouchableOpacity
            style={styles.emptyAction}
            onPress={() => navigation.navigate('GrowthHome')}
          >
            <Text style={styles.emptyActionText}>Explore Stories</Text>
            <Ionicons name="arrow-forward" size={14} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(item) => String(item.level_id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item, index }) => {
            const cfg = getCategoryConfig(item.category);
            const isFeatured = index === 0;
            return (
              <TouchableOpacity
                style={[styles.card, isFeatured && styles.cardFeatured]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('GrowthStory', { levelId: item.level_id })}
              >
                {/* Thumb */}
                <View style={[styles.cardThumb, { backgroundColor: cfg.bg }]}>
                  <Text style={styles.cardThumbEmoji}>{cfg.emoji}</Text>
                </View>

                {/* Content */}
                <View style={styles.cardBody}>
                  <View style={[styles.cardCatPill, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.cardCatText, { color: cfg.accent }]}>{cfg.label}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.cardMeta}>
                    <Ionicons name="time-outline" size={12} color="#94A3B8" />
                    <Text style={styles.cardMetaText}>{item.readingTime} min</Text>
                    <View style={styles.cardMetaDot} />
                    <Text style={[
                      styles.cardMetaText,
                      { color: item.status === 'completed' ? '#22C55E' : '#94A3B8' }
                    ]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => toggleItem(item.level_id)}
                    hitSlop={12}
                    style={styles.cardActionBtn}
                  >
                    <Ionicons
                      name={activeTab === 'saved' ? 'bookmark' : 'heart'}
                      size={18}
                      color={activeTab === 'saved' ? '#4F46E5' : '#F43F5E'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('GrowthStory', { levelId: item.level_id })}
                    style={[styles.readBtn, { backgroundColor: cfg.accent }]}
                  >
                    <Ionicons name="play" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  gradientHeader: {
    paddingBottom: 16,
    elevation: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1, fontWeight: '600' },
  countBadge: {
    minWidth: 32,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countBadgeText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  tabTextActive: { color: '#4F46E5' },

  // List
  list: { padding: 16, paddingBottom: 40 },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardFeatured: {
    borderColor: '#C7D2FE',
    borderWidth: 1.5,
    elevation: 4,
  },
  cardThumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardThumbEmoji: { fontSize: 26 },
  cardBody: { flex: 1, marginRight: 10 },
  cardCatPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  cardCatText: { fontSize: 10, fontWeight: '800' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', lineHeight: 19, marginBottom: 5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  cardMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#E2E8F0' },
  cardActions: { alignItems: 'center', gap: 8 },
  cardActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  emptyDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
    marginBottom: 24,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyActionText: { fontSize: 14, fontWeight: '700', color: '#4F46E5' },
});

export default GrowthSavedStoriesScreen;
