import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';
import { SkeletonListRow } from '../../../components/tenant/ui/SkeletonLoader';

interface StoryItem {
  level_id: number;
  title: string;
  readingTime: number;
  status: string;
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

      if (ids.length === 0) {
        setStories([]);
        return;
      }

      const res = await api.get(`/growth/levels/batch?ids=${ids.join(',')}`);
      if (res.data?.success) {
        setStories(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load saved stories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(activeTab);
    }, [activeTab, loadData])
  );

  const toggleItem = async (levelId: number) => {
    const prefix = activeTab === 'saved' ? 'growth_bookmark_' : 'growth_wishlist_';
    const key = `${prefix}${levelId}`;
    await AsyncStorage.setItem(key, '0');
    // animate removal by updating local state
    setStories((prev) => prev.filter((s) => s.level_id !== levelId));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Library</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'saved' && styles.tabButtonActive]}
          onPress={() => setActiveTab('saved')}
        >
          <Ionicons
            name={activeTab === 'saved' ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={activeTab === 'saved' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>Saved</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'liked' && styles.tabButtonActive]}
          onPress={() => setActiveTab('liked')}
        >
          <Ionicons
            name={activeTab === 'liked' ? 'heart' : 'heart-outline'}
            size={18}
            color={activeTab === 'liked' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'liked' && styles.tabTextActive]}>Liked</Text>
        </TouchableOpacity>
      </View>

      {/* List content */}
      {loading ? (
        <View style={{ padding: theme.spacing.lg }}>
          {[0, 1, 2].map((i) => (
            <SkeletonListRow key={i} last={i === 2} />
          ))}
        </View>
      ) : stories.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name={activeTab === 'saved' ? 'bookmark-outline' : 'heart-outline'}
            size={48}
            color="#CBD5E1"
          />
          <Text style={styles.emptyText}>
            {activeTab === 'saved'
              ? 'No saved stories yet. Tap the bookmark icon inside any story to save it.'
              : 'No liked stories yet. Tap the heart icon inside any story to like it.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(item) => String(item.level_id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('GrowthStory', { levelId: item.level_id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>⏱️ {item.readingTime} min read  ·  {item.status}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleItem(item.level_id)} hitSlop={12} style={{ padding: 4 }}>
                <Ionicons
                  name={activeTab === 'saved' ? 'bookmark' : 'heart'}
                  size={20}
                  color={activeTab === 'saved' ? '#0EA5E9' : '#EF4444'}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
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
    paddingVertical: theme.spacing.md,
  },
  headerTitle: { ...theme.text.sectionTitle },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    padding: 4,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: '#5B39E0',
    ...theme.shadow.subtle,
  },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  list: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadow.subtle,
  },
  title: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  meta: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 4 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['3xl'],
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default GrowthSavedStoriesScreen;
