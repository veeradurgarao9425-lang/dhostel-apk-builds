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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'react-native';
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

// Stage milestones shown every N levels
const STAGE_MILESTONES = [
  { afterLevel: 0, label: 'DISCOVER', icon: '🌱', color: '#22C55E', desc: 'Begin your journey' },
  { afterLevel: 5, label: 'GROWTH', icon: '📚', color: '#3B82F6', desc: 'Building momentum' },
  { afterLevel: 10, label: 'CHALLENGE', icon: '⚡', color: '#F59E0B', desc: 'Push your limits' },
  { afterLevel: 15, label: 'MASTERY', icon: '🏆', color: '#8B5CF6', desc: 'Advanced skills' },
  { afterLevel: 20, label: 'LEGEND', icon: '✨', color: '#EF4444', desc: 'The final frontier' },
];

function getStageMilestone(levelNumber: number) {
  for (let i = STAGE_MILESTONES.length - 1; i >= 0; i--) {
    if (levelNumber > STAGE_MILESTONES[i].afterLevel) return null;
    if (levelNumber === STAGE_MILESTONES[i].afterLevel + 1) return STAGE_MILESTONES[i];
  }
  return null;
}

function StarRow({ stars, max = 3 }: { stars: number; max?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < stars ? 'star' : 'star-outline'}
          size={10}
          color={i < stars ? '#F59E0B' : '#CBD5E1'}
        />
      ))}
    </View>
  );
}

function PulseRing({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.5, duration: 1000, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { borderColor: color, transform: [{ scale }], opacity },
      ]}
    />
  );
}

function StageBanner({ stage }: { stage: typeof STAGE_MILESTONES[0] }) {
  return (
    <View style={styles.stageBannerWrap}>
      <View style={styles.stageLineTop} />
      <View style={[styles.stageBadge, { backgroundColor: stage.color + '18' }]}>
        <Text style={styles.stageEmoji}>{stage.icon}</Text>
        <Text style={[styles.stageLabel, { color: stage.color }]}>{stage.label}</Text>
        <Text style={styles.stageDesc}>{stage.desc}</Text>
      </View>
      <View style={styles.stageLineBottom} />
    </View>
  );
}

function LevelCard({
  level,
  colorHex,
  isLast,
  onPress,
}: {
  level: Level;
  colorHex: string;
  isLast: boolean;
  onPress: () => void;
}) {
  const isLocked = level.status === 'locked';
  const isCompleted = level.status === 'completed';
  const isUnlocked = level.status === 'unlocked';

  const nodeColor = isLocked ? '#CBD5E1' : isCompleted ? '#22C55E' : colorHex;
  const cardBg = isLocked ? '#F8FAFC' : isCompleted ? '#F0FDF4' : '#FFFFFF';
  const borderColor = isLocked ? '#E2E8F0' : isCompleted ? '#BBF7D0' : colorHex + '40';

  const anim = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;

  return (
    <View style={styles.levelRow}>
      {/* Timeline spine */}
      <View style={styles.spineCol}>
        <View style={[styles.nodeCircle, { backgroundColor: nodeColor }]}>
          {isLocked ? (
            <Ionicons name="lock-closed" size={14} color="#94A3B8" />
          ) : isCompleted ? (
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          ) : (
            <>
              <PulseRing color={colorHex} />
              <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </>
          )}
        </View>
        {!isLast && (
          <View style={[styles.spineLine, { borderColor: isCompleted ? '#22C55E40' : '#E2E8F030', borderStyle: isLocked ? 'dashed' : 'solid' }]} />
        )}
      </View>

      {/* Level card */}
      <TouchableOpacity
        style={[styles.levelCard, { backgroundColor: cardBg, borderColor }]}
        activeOpacity={isLocked ? 1 : 0.85}
        onPress={onPress}
      >
        <View style={styles.levelCardHeader}>
          <View style={[styles.levelNumBadge, { backgroundColor: nodeColor + '18' }]}>
            <Text style={[styles.levelNumText, { color: nodeColor }]}>
              {String(level.levelNumber).padStart(2, '0')}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text
              style={[styles.levelTitle, isLocked && { color: '#94A3B8' }]}
              numberOfLines={2}
            >
              {level.title}
            </Text>
            {isCompleted && <StarRow stars={level.stars} />}
          </View>
          {!isLocked && (
            <View style={[styles.xpBadge, { backgroundColor: isCompleted ? '#F0FDF4' : colorHex + '15' }]}>
              <Text style={[styles.xpText, { color: isCompleted ? '#16A34A' : colorHex }]}>
                +{level.xpReward} XP
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.levelCardFooter}>
          {isLocked ? (
            <Text style={styles.lockedHint}>Complete previous levels to unlock</Text>
          ) : isCompleted ? (
            <View style={styles.completedTag}>
              <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
              <Text style={styles.completedTagText}>Completed</Text>
            </View>
          ) : (
            <View style={[styles.readNowBtn, { backgroundColor: colorHex }]}>
              <Text style={styles.readNowText}>Start Reading</Text>
              <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
            </View>
          )}
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
  const scrollRef = useRef<ScrollView>(null);

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

  const completedCount = levels.filter((l) => l.status === 'completed').length;
  const progressPct = levels.length > 0 ? Math.round((completedCount / levels.length) * 100) : 0;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={activeColor} />

      {/* Gradient Header */}
      <LinearGradient
        colors={[activeColor, activeColor + 'BB']}
        style={styles.gradientHeader}
      >
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerInner}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{pathName || 'Journey'}</Text>
              <Text style={styles.headerSub}>Your Learning Roadmap</Text>
            </View>
            <View style={styles.progressChip}>
              <Text style={styles.progressChipText}>{completedCount}/{levels.length} done</Text>
            </View>
          </View>

          {/* Progress bar */}
          {levels.length > 0 && (
            <View style={styles.headerProgressWrap}>
              <View style={styles.headerProgressBg}>
                <View style={[styles.headerProgressFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.headerProgressLabel}>{progressPct}%</Text>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

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
          scrollEventThrottle={400}
        >
          {/* Journey intro */}
          <View style={styles.journeyIntro}>
            <Text style={styles.journeyIntroLabel}>YOUR JOURNEY</Text>
            <Text style={styles.journeyIntroTitle}>
              {completedCount === 0
                ? 'Every great story starts with a first step.'
                : `${completedCount} chapter${completedCount > 1 ? 's' : ''} complete. Keep going!`}
            </Text>
          </View>

          {/* Timeline */}
          {levels.map((level, index) => {
            const milestone = getStageMilestone(level.levelNumber);
            return (
              <View key={level.levelId}>
                {milestone && <StageBanner stage={milestone} />}
                <LevelCard
                  level={level}
                  colorHex={activeColor}
                  isLast={index === levels.length - 1}
                  onPress={() => onPressLevel(level)}
                />
              </View>
            );
          })}

          {/* Footer */}
          {loadingMore && (
            <ActivityIndicator style={{ marginVertical: 20 }} color={activeColor} />
          )}
          {!hasMore && levels.length > 0 && (
            <View style={styles.endCard}>
              <Text style={styles.endEmoji}>✨</Text>
              <Text style={styles.endTitle}>End of the Road — For Now</Text>
              <Text style={styles.endDesc}>
                More levels are coming soon. Your journey never really ends.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF9F6' },

  // Header
  gradientHeader: {
    paddingBottom: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  progressChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  progressChipText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  headerProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  headerProgressBg: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  headerProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  headerProgressLabel: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', width: 32 },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
  },

  // Journey intro
  journeyIntro: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  journeyIntroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  journeyIntroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Stage banner
  stageBannerWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  stageLineTop: {
    width: 2,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginBottom: 4,
  },
  stageBadge: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stageEmoji: { fontSize: 20, marginBottom: 2 },
  stageLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  stageDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },
  stageLineBottom: {
    width: 2,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },

  // Level row
  levelRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },

  // Spine
  spineCol: {
    width: 36,
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 12,
  },
  nodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  pulseRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
  },
  spineLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    minHeight: 40,
    borderLeftWidth: 2,
  },

  // Level card
  levelCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  levelCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  levelNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumText: { fontSize: 12, fontWeight: '800' },
  levelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 6,
  },
  xpText: { fontSize: 10, fontWeight: '800' },
  levelCardFooter: {
    marginTop: 10,
    flexDirection: 'row',
  },
  lockedHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedTagText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  readNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  readNowText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },

  // End card
  endCard: {
    alignItems: 'center',
    padding: 32,
    marginTop: 20,
  },
  endEmoji: { fontSize: 36, marginBottom: 8 },
  endTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  endDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 240,
  },
});

export default GrowthRoadmapScreen;
