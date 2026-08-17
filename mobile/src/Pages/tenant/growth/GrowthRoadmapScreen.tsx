import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../services/api';
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

// ── Pulse Ring around the current active level ────────────────────────────────
function GlowPulse({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.4,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.glowPulse,
        {
          borderColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    />
  );
}

// ── Star Rating display for completed levels ─────────────────────────────────
function StarsRow({ stars }: { stars: number }) {
  const count = stars > 0 ? stars : 3;
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3].map((i) => (
        <Ionicons
          key={i}
          name={i <= count ? 'star' : 'star-outline'}
          size={10}
          color={i <= count ? '#F59E0B' : '#CBD5E1'}
        />
      ))}
    </View>
  );
}

// ── Connecting Stepping Dots between Road Nodes ──────────────────────────────
function RoadConnector({ isCompleted, isNightMode }: { isCompleted: boolean; isNightMode: boolean }) {
  const dotColor = isCompleted ? '#10B981' : isNightMode ? '#334155' : '#CBD5E1';
  return (
    <View style={styles.connectorWrap}>
      <View style={[styles.connectorDot, { backgroundColor: dotColor }]} />
      <View style={[styles.connectorDot, { backgroundColor: dotColor, transform: [{ scale: 0.85 }] }]} />
      <View style={[styles.connectorDot, { backgroundColor: dotColor, transform: [{ scale: 0.7 }] }]} />
    </View>
  );
}

// ── Candy Crush Style Winding Stepping Stone Node ────────────────────────────
function CandyCrushNode({
  level,
  index,
  colorHex,
  isNightMode,
  onPress,
}: {
  level: Level;
  index: number;
  colorHex: string;
  isNightMode: boolean;
  onPress: () => void;
}) {
  const isLocked = level.status === 'locked';
  const isCompleted = level.status === 'completed';
  const isUnlocked = level.status === 'unlocked';

  // Serpentine / Winding alignment: Center -> Left -> Center -> Right -> Center
  const posPattern = index % 4;
  let alignStyle: any = { alignSelf: 'center' };
  if (posPattern === 1) {
    alignStyle = { alignSelf: 'flex-start', marginLeft: 36 };
  } else if (posPattern === 3) {
    alignStyle = { alignSelf: 'flex-end', marginRight: 36 };
  }

  const primaryColor = colorHex || '#6D4AFF';
  const nodeBg = isCompleted ? '#10B981' : isUnlocked ? primaryColor : isNightMode ? '#1E293B' : '#E2E8F0';
  const rimColor = isCompleted ? '#059669' : isUnlocked ? '#4F46E5' : isNightMode ? '#334155' : '#CBD5E1';

  return (
    <View style={[styles.nodeContainer, alignStyle]}>
      <TouchableOpacity
        activeOpacity={isLocked ? 0.9 : 0.75}
        onPress={onPress}
        style={styles.nodeTouchable}
      >
        {/* Glow ring on current active level */}
        {isUnlocked && <GlowPulse color={primaryColor} />}

        {/* 3D Stepping Stone Circle */}
        <View
          style={[
            styles.nodeCircle,
            {
              backgroundColor: nodeBg,
              borderBottomColor: rimColor,
            },
          ]}
        >
          {isLocked ? (
            <Ionicons name="lock-closed" size={18} color={isNightMode ? '#64748B' : '#94A3B8'} />
          ) : isCompleted ? (
            <Ionicons name="checkmark" size={22} color="#FFFFFF" />
          ) : (
            <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
          )}

          {/* Level number badge top-right */}
          <View
            style={[
              styles.levelBadgePill,
              {
                backgroundColor: isCompleted
                  ? '#059669'
                  : isUnlocked
                  ? '#3730A3'
                  : isNightMode
                  ? '#475569'
                  : '#94A3B8',
              },
            ]}
          >
            <Text style={styles.levelBadgeText}>{level.levelNumber}</Text>
          </View>
        </View>

        {/* Star Rating for completed nodes */}
        {isCompleted && <StarsRow stars={level.stars} />}

        {/* Play tag for active level */}
        {isUnlocked && (
          <View style={[styles.playTag, { backgroundColor: primaryColor }]}>
            <Text style={styles.playTagText}>START</Text>
          </View>
        )}

        {/* Title and XP */}
        <Text
          style={[
            styles.levelTitle,
            { color: isNightMode ? '#F8FAFC' : '#1E293B' },
            isLocked && { color: isNightMode ? '#64748B' : '#94A3B8' },
          ]}
          numberOfLines={2}
        >
          {level.title}
        </Text>

        {!isLocked && (
          <View style={styles.xpRow}>
            <Text style={[styles.xpText, { color: isCompleted ? '#10B981' : primaryColor }]}>
              +{level.xpReward || 15} XP
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function GrowthRoadmapScreen({ navigation, route }: any) {
  const pathKey = route?.params?.pathKey || 'english_stories';
  const pathName = route?.params?.pathName || 'Roadmap';
  const activeColor = route?.params?.colorHex || '#6D4AFF';

  const [levels, setLevels] = useState<Level[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const fetchPage = useCallback(
    async (pageNum: number, replace = false) => {
      try {
        const res = await api.get(`/growth/paths/${pathKey}/levels`, { params: { page: pageNum } });
        if (res.data?.success) {
          setLevels((prev) => (replace ? res.data.data : [...prev, ...res.data.data]));
          setHasMore(!!res.data.pagination?.hasMore);
        }
      } catch {
        // silent
      }
    },
    [pathKey]
  );

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('growth_night_mode').then((val) => {
        if (val !== null) setIsNightMode(val === '1');
      });
      setLoading(true);
      fetchPage(1, true).finally(() => setLoading(false));
      setPage(1);
    }, [fetchPage])
  );

  const toggleNight = async () => {
    const next = !isNightMode;
    setIsNightMode(next);
    await AsyncStorage.setItem('growth_night_mode', next ? '1' : '0');
  };

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
    if (level.status === 'locked') {
      Alert.alert(
        '🔒 Level Locked',
        `Complete Level ${Math.max(1, level.levelNumber - 1)} to unlock this story and earn rewards!`
      );
      return;
    }
    navigation.navigate('GrowthStory', { levelId: level.levelId });
  };

  const completedCount = levels.filter((l) => l.status === 'completed').length;
  const progressPct = levels.length > 0 ? Math.round((completedCount / levels.length) * 100) : 0;

  let lastSection = '';

  const c = {
    bg: isNightMode ? '#0F172A' : '#FAFAFC',
    card: isNightMode ? '#1E293B' : '#FFFFFF',
    border: isNightMode ? '#334155' : '#ECECF2',
    text: isNightMode ? '#F8FAFC' : '#1E293B',
    textSub: isNightMode ? '#94A3B8' : '#64748B',
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.bg }]} edges={['top']}>
      <StatusBar barStyle={isNightMode ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />

      {/* Clean Top Navigation Bar with '<' */}
      <View style={[styles.header, { backgroundColor: c.bg, borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
            {pathName}
          </Text>
          <Text style={[styles.headerSubtitle, { color: c.textSub }]}>
            {completedCount}/{levels.length} Stories Completed
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border, marginRight: 8 }]}
          onPress={toggleNight}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isNightMode ? 'sunny' : 'moon-outline'}
            size={18}
            color={isNightMode ? '#FBBF24' : '#6D4AFF'}
          />
        </TouchableOpacity>

        <View style={[styles.progressChip, { backgroundColor: activeColor + '22' }]}>
          <Text style={[styles.progressChipText, { color: activeColor }]}>
            {progressPct}%
          </Text>
        </View>
      </View>

      {loading ? (
        <GrowthRoadmapSkeleton />
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const nearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
            if (nearEnd) loadMore();
          }}
          scrollEventThrottle={16}
        >
          {levels.map((item, index) => {
            const showChapter = item.sectionTitle && item.sectionTitle !== lastSection;
            if (showChapter) {
              lastSection = item.sectionTitle;
            }

            return (
              <View key={item.levelId || index}>
                {/* Chapter Milestone Banner */}
                {showChapter && (
                  <View style={styles.chapterBannerWrap}>
                    <View style={[styles.chapterLine, { backgroundColor: c.border }]} />
                    <View style={[styles.chapterBadge, { backgroundColor: activeColor }]}>
                      <Ionicons name="trophy-outline" size={12} color="#FFFFFF" style={{ marginRight: 5 }} />
                      <Text style={styles.chapterBadgeText}>{item.sectionTitle}</Text>
                    </View>
                    <View style={[styles.chapterLine, { backgroundColor: c.border }]} />
                  </View>
                )}

                {/* Connector Trail dots above node (except first item in a chapter) */}
                {index > 0 && !showChapter && (
                  <RoadConnector
                    isCompleted={levels[index - 1]?.status === 'completed'}
                    isNightMode={isNightMode}
                  />
                )}

                {/* Stepping Stone Level Node */}
                <CandyCrushNode
                  level={item}
                  index={index}
                  colorHex={activeColor}
                  isNightMode={isNightMode}
                  onPress={() => onPressLevel(item)}
                />
              </View>
            );
          })}

          {loadingMore && (
            <ActivityIndicator style={{ marginVertical: 16 }} color={activeColor} />
          )}

          {!hasMore && levels.length > 0 && (
            <View style={[styles.endBanner, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={{ fontSize: 20 }}>🏆</Text>
              <Text style={[styles.endBannerTitle, { color: c.text }]}>Journey Milestone Reached!</Text>
              <Text style={[styles.endBannerSub, { color: c.textSub }]}>
                New stories and levels are unlocked regularly. Keep your streak alive!
              </Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
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
  progressChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  progressChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  // Chapter Milestone Banner
  chapterBannerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  chapterLine: {
    flex: 1,
    height: 1,
  },
  chapterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  chapterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Stepping Connector Trail
  connectorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginVertical: 3,
  },
  connectorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // Stepping Stone Node
  nodeContainer: {
    marginVertical: 2,
  },
  nodeTouchable: {
    alignItems: 'center',
    width: 90,
  },
  glowPulse: {
    position: 'absolute',
    top: -5,
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
  },
  nodeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3.5,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    position: 'relative',
  },
  levelBadgePill: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  levelBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
    marginTop: 4,
  },
  playTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginTop: 4,
  },
  playTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  levelTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
    maxWidth: 85,
  },
  xpRow: {
    marginTop: 1,
  },
  xpText: {
    fontSize: 9.5,
    fontWeight: '700',
  },

  // End Banner
  endBanner: {
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    elevation: 1,
  },
  endBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  endBannerSub: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 16,
  },
});

export default GrowthRoadmapScreen;
