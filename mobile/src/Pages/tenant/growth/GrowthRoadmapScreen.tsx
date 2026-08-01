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

const ALIGN = ['flex-start', 'center', 'flex-end'] as const;

function GlowPulse() {
  const pulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={[styles.glow, { opacity: pulse, transform: [{ scale: pulse }] }]}
      pointerEvents="none"
    />
  );
}

function LevelNode({ level, align, onPress }: { level: Level; align: (typeof ALIGN)[number]; onPress: () => void }) {
  const isLocked = level.status === 'locked';
  const isCompleted = level.status === 'completed';

  return (
    <View style={[styles.nodeRow, { justifyContent: align }]}>
      <TouchableOpacity activeOpacity={isLocked ? 1 : 0.8} onPress={onPress} style={styles.nodeTouchable}>
        {level.status === 'unlocked' && <GlowPulse />}
        <View
          style={[
            styles.node,
            isLocked && styles.nodeLocked,
            isCompleted && styles.nodeCompleted,
            level.status === 'unlocked' && styles.nodeUnlocked,
          ]}
        >
          {isLocked ? (
            <Ionicons name="lock-closed" size={20} color={theme.colors.textSubtle} />
          ) : isCompleted ? (
            <Ionicons name="checkmark" size={26} color="#FFFFFF" />
          ) : (
            <Ionicons name="play" size={22} color="#FFFFFF" />
          )}
        </View>
        <Text style={[styles.nodeTitle, isLocked && styles.nodeTitleLocked]} numberOfLines={2}>
          {level.title}
        </Text>
        {isCompleted && (
          <View style={styles.starsRow}>
            {[1, 2, 3].map((i) => (
              <Ionicons
                key={i}
                name={i <= level.stars ? 'star' : 'star-outline'}
                size={12}
                color={i <= level.stars ? '#F59E0B' : theme.colors.textSubtle}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function GrowthRoadmapScreen({ navigation, route }: any) {
  const { pathKey, pathName } = route.params;
  const [levels, setLevels] = useState<Level[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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
      setLoading(true);
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
              <ActivityIndicator style={{ marginVertical: theme.spacing.lg }} color={theme.colors.primary} />
            ) : !hasMore ? (
              <View style={styles.endCard}>
                <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
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
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{item.sectionTitle}</Text>
                  </View>
                )}
                <LevelNode level={item} align={ALIGN[index % 3]} onPress={() => onPressLevel(item)} />
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  headerTitle: { ...theme.text.sectionTitle, flex: 1, textAlign: 'center' },
  list: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing['4xl'] },
  sectionHeader: {
    alignSelf: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    marginVertical: theme.spacing.lg,
  },
  sectionHeaderText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  nodeRow: { flexDirection: 'row', marginVertical: theme.spacing.sm },
  nodeTouchable: { alignItems: 'center', width: 100 },
  glow: {
    position: 'absolute',
    top: 0,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.primarySoft,
  },
  node: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    ...theme.shadow.card,
  },
  nodeLocked: { backgroundColor: theme.colors.surfaceAlt },
  nodeUnlocked: { backgroundColor: theme.colors.primary },
  nodeCompleted: { backgroundColor: theme.colors.success },
  nodeTitle: { fontSize: 11, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginTop: 6 },
  nodeTitleLocked: { color: theme.colors.textSubtle },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
  endCard: {
    alignItems: 'center', gap: 6,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  endCardText: { ...theme.text.caption, textAlign: 'center', maxWidth: 240 },
});

export default GrowthRoadmapScreen;
