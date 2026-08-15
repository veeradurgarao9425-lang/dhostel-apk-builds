import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';
import { GrowthRoadmapSkeleton } from '../../../components/tenant/growth/GrowthSkeletons';

interface Level {
  levelId: number;
  sectionTitle: string;
  levelNumber: number;
  title: string;
  xpReward: number;
  status: 'locked' | 'unlocked' | 'completed';
  stars: number;
}

const ALIGN = ['flex-start', 'center', 'flex-end', 'center'] as const;

function LevelNode({ level, index, colorHex, onPress }: { level: Level; index: number; colorHex: string; onPress: () => void }) {
  const isLocked = level.status === 'locked';
  const isCompleted = level.status === 'completed';
  const isUnlocked = level.status === 'unlocked';
  
  const activeColor = colorHex || theme.colors.primary;
  const align = ALIGN[index % ALIGN.length];

  return (
    <View style={[styles.nodeRow, { justifyContent: align }]}>
      <TouchableOpacity
        activeOpacity={isLocked ? 1 : 0.85}
        onPress={onPress}
        style={styles.nodeTouchable}
      >
        <View style={styles.nodeInner}>
          {isUnlocked && (
            <View style={[styles.activeGlowRing, { borderColor: activeColor }]} />
          )}
          <View
            style={[
              styles.nodeCircle,
              isLocked && styles.nodeLocked,
              isCompleted && styles.nodeCompleted,
              isUnlocked && { backgroundColor: activeColor },
            ]}
          >
            {isLocked ? (
              <Ionicons name="lock-closed" size={20} color={theme.colors.textSubtle} />
            ) : isCompleted ? (
              <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            ) : (
              <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
            )}
          </View>

          {isCompleted && (
            <View style={styles.starsRow}>
              {[1, 2, 3].map((i) => (
                <Ionicons
                  key={i}
                  name={i <= level.stars ? 'star' : 'star-outline'}
                  size={11}
                  color={i <= level.stars ? '#F59E0B' : '#CBD5E1'}
                />
              ))}
            </View>
          )}

          <Text style={[styles.nodeTitle, isLocked && styles.nodeTitleLocked]} numberOfLines={2}>
            {level.title}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function GrowthRoadmapScreen({ navigation, route }: any) {
  const { pathKey, pathName, colorHex } = route.params;
  const activeColor = colorHex || theme.colors.primary;

  const [levels, setLevels] = useState<Level[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const isFirstLoad = useRef(true);

  const fetchPage = useCallback(
    async (pageNum: number, replace = false) => {
      const res = await api.get(`/growth/paths/${pathKey}/levels`, { params: { page: pageNum } });
      if (res.data?.success) {
        setLevels((prev) => (replace ? res.data.data : [...prev, ...res.data.data]));
        setHasMore(!!res.data.pagination?.hasMore);
      }
    },
    [pathKey]
  );

  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) {
        setLoading(true);
        isFirstLoad.current = false;
      }
      fetchPage(1, true).finally(() => setLoading(false));
      setPage(1);
    }, [fetchPage])
  );

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    fetchPage(next).finally(() => {
      setPage(next);
      setLoadingMore(false);
    });
  };

  const onPressLevel = (level: Level) => {
    if (level.status === 'locked') return;
    navigation.navigate('GrowthStory', { levelId: level.levelId });
  };

  let lastSection = '';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{pathName || 'Roadmap'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <GrowthRoadmapSkeleton />
      ) : (
        <FlatList
          data={levels}
          keyExtractor={(l) => String(l.levelId)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: theme.spacing.lg }} color={activeColor} />
            ) : !hasMore ? (
              <View style={styles.endCard}>
                <Ionicons name="sparkles" size={20} color={activeColor} />
                <Text style={styles.endCardText}>More levels coming soon! Your journey never really ends.</Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const showSection = item.sectionTitle !== lastSection;
            lastSection = item.sectionTitle;
            return (
              <View>
                {showSection && (
                  <View style={[styles.sectionHeader, { backgroundColor: activeColor + '15' }]}>
                    <Text style={[styles.sectionHeaderText, { color: activeColor }]}>{item.sectionTitle}</Text>
                  </View>
                )}
                <LevelNode
                  level={item}
                  index={index}
                  colorHex={activeColor}
                  onPress={() => onPressLevel(item)}
                />
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { ...theme.text.sectionTitle, fontWeight: '800', flex: 1, textAlign: 'center' },
  list: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing['4xl'] },
  sectionHeader: {
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    marginVertical: theme.spacing.md,
  },
  sectionHeaderText: { fontWeight: '800', fontSize: 11 },
  nodeRow: {
    flexDirection: 'row',
    width: '100%',
    marginVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  nodeTouchable: {
    width: 120,
    alignItems: 'center',
  },
  nodeInner: {
    alignItems: 'center',
    width: 120,
  },
  activeGlowRing: {
    position: 'absolute',
    top: -6,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    opacity: 0.6,
  },
  nodeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...theme.shadow.card,
    zIndex: 2,
  },
  nodeNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  nodeLocked: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },
  nodeCompleted: {
    backgroundColor: theme.colors.success,
  },
  nodeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 6,
    width: 120,
  },
  nodeTitleLocked: {
    color: theme.colors.textSubtle,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  endCard: {
    alignItems: 'center', gap: 6,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  endCardText: { ...theme.text.caption, textAlign: 'center', maxWidth: 240 },
});

export default GrowthRoadmapScreen;
