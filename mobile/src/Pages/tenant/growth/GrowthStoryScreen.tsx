import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import api from '../../../services/api';
import { VocabularyModal, VocabWord } from '../../../components/tenant/growth/VocabularyModal';
import { GrowthStorySkeleton } from '../../../components/tenant/growth/GrowthSkeletons';
import { GrowthCelebrationModal } from '../../../components/tenant/growth/GrowthCelebrationModal';
import { notifyGrowthMilestoneCompleted } from '../../../hooks/useTenantNotifications';

interface Sentence {
  order: number;
  text: string;
}

interface LevelDetail {
  levelId: number;
  title: string;
  xpReward: number;
  story: {
    storyId: number;
    title: string;
    category: string;
    readingTimeMinutes: number;
    sentences: Sentence[];
    illustrationKey: string;
  };
  vocabulary: VocabWord[];
  questions: any[];
}

const SPEAKER_LINE = /^([^:]+):\s*(.*)$/;

function parseSpeakerLine(text: string): { speaker: string | null; line: string } {
  const m = text.match(SPEAKER_LINE);
  if (m) {
    const name = m[1].trim();
    const formatted = name.charAt(0).toUpperCase() + name.slice(1);
    return { speaker: formatted, line: m[2].trim() };
  }
  return { speaker: null, line: text };
}

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

export function GrowthStoryScreen({ navigation, route }: any) {
  const levelId = route?.params?.levelId;
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<LevelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSentence, setActiveSentence] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null);
  const [textSize, setTextSize] = useState(17);
  const [isNightMode, setIsNightMode] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completeResult, setCompleteResult] = useState<any>(null);
  const [completing, setCompleting] = useState(false);
  const [readProgress, setReadProgress] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const vocabByWord = useRef<Map<string, VocabWord>>(new Map());

  useEffect(() => {
    if (!levelId) return;

    api
      .get(`/growth/levels/${levelId}`)
      .then((res) => {
        if (res.data?.success) {
          setData(res.data.data);
          const map = new Map<string, VocabWord>();
          for (const v of res.data.data.vocabulary as VocabWord[]) {
            map.set(v.word.toLowerCase(), v);
          }
          vocabByWord.current = map;
        }
      })
      .finally(() => setLoading(false));

    AsyncStorage.getItem(`growth_bookmark_${levelId}`).then((v) => setBookmarked(v === '1'));
    AsyncStorage.getItem(`growth_wishlist_${levelId}`).then((v) => setWishlisted(v === '1'));
    AsyncStorage.getItem('growth_night_mode').then((v) => {
      if (v !== null) setIsNightMode(v === '1');
    });

    return () => {
      Speech.stop();
    };
  }, [levelId]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const diff = contentSize.height - layoutMeasurement.height;
    const pct = diff > 0 ? Math.min(100, Math.round((contentOffset.y / diff) * 100)) : 100;
    if (!isNaN(pct) && pct >= 0) setReadProgress(pct);
  };

  const sentences = data?.story?.sentences || [];
  const isDialogue = React.useMemo(() => {
    if (!data) return false;
    const cat = data.story.category?.toLowerCase() || '';
    if (cat.includes('dialogue') || cat.includes('conversation')) return true;
    return sentences.some((s) => {
      const txt = typeof s === 'string' ? s : s?.text || '';
      return SPEAKER_LINE.test(txt);
    });
  }, [data, sentences]);

  const isLoveStory = (data?.story?.category || '').toLowerCase().includes('love');

  // Assign distinct colors per speaker
  const speakerColors = React.useMemo(() => {
    const map = new Map<string, { bg: string; text: string; speaker: string; isRight: boolean }>();
    if (!isDialogue) return map;
    const palette = [
      { bg: '#EEF2FF', text: '#1E1B4B', speaker: '#4F46E5', isRight: false },
      { bg: '#F0FDF4', text: '#052E16', speaker: '#16A34A', isRight: true },
      { bg: '#FEF3C7', text: '#451A03', speaker: '#D97706', isRight: false },
      { bg: '#FCE7F3', text: '#500724', speaker: '#DB2777', isRight: true },
    ];
    let idx = 0;
    for (const s of sentences) {
      const txt = typeof s === 'string' ? s : s?.text || '';
      const { speaker } = parseSpeakerLine(txt);
      if (speaker && !map.has(speaker)) {
        map.set(speaker, palette[idx % palette.length]);
        idx++;
      }
    }
    return map;
  }, [sentences, isDialogue]);

  const renderTokens = (text: string, keyPrefix: string, onDark = false) =>
    (text || '').split(/(\s+)/).map((token, ti) => {
      const clean = token.replace(/[^a-zA-Z']/g, '').toLowerCase();
      const vocab = clean ? vocabByWord.current.get(clean) : undefined;
      if (vocab) {
        return (
          <Text
            key={`${keyPrefix}-${ti}`}
            style={onDark ? styles.tapWordDark : styles.tapWord}
            onPress={() => setSelectedWord(vocab)}
          >
            {token}
          </Text>
        );
      }
      return <Text key={`${keyPrefix}-${ti}`}>{token}</Text>;
    });

  const speakFrom = useCallback(
    (i: number) => {
      if (i >= sentences.length) {
        setPlaying(false);
        return;
      }
      setActiveSentence(i);
      const s = sentences[i];
      const txt = typeof s === 'string' ? s : s?.text || '';
      Speech.speak(txt, {
        language: 'en-US',
        rate: 0.9,
        onDone: () => speakFrom(i + 1),
        onStopped: () => {},
        onError: () => setPlaying(false),
      });
    },
    [sentences]
  );

  const togglePlay = () => {
    if (playing) {
      Speech.stop();
      setPlaying(false);
    } else {
      setPlaying(true);
      speakFrom(activeSentence);
    }
  };

  const toggleBookmark = async () => {
    const next = !bookmarked;
    setBookmarked(next);
    await AsyncStorage.setItem(`growth_bookmark_${levelId}`, next ? '1' : '0');
  };

  const toggleWishlist = async () => {
    const next = !wishlisted;
    setWishlisted(next);
    await AsyncStorage.setItem(`growth_wishlist_${levelId}`, next ? '1' : '0');
  };

  const cycleTextSize = () => {
    setTextSize((sz) => (sz === 15 ? 17 : sz === 17 ? 19 : sz === 19 ? 22 : 15));
  };

  const toggleNightMode = async () => {
    const next = !isNightMode;
    setIsNightMode(next);
    await AsyncStorage.setItem('growth_night_mode', next ? '1' : '0');
  };

  const completeLesson = async () => {
    if (completing || showCelebration) return;
    Speech.stop();
    setCompleting(true);
    try {
      const res = await api.post(`/growth/levels/${levelId}/complete`, { direct: true });
      if (res.data?.success) {
        setCompleteResult(res.data.data);
        setShowCelebration(true);
        // Fire Growth Journey milestone notification with real XP + title data
        const xpEarned = res.data.data?.xpEarned ?? data?.xpReward;
        notifyGrowthMilestoneCompleted(xpEarned, data?.story?.title ?? data?.title);
      } else {
        Alert.alert('Error', 'Failed to complete the lesson. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to connect to the server.');
    } finally {
      setCompleting(false);
    }
  };

  const c = {
    bg: isNightMode ? '#0F172A' : '#FAFAFC',
    card: isNightMode ? '#1E293B' : '#FFFFFF',
    border: isNightMode ? '#334155' : '#ECECF2',
    text: isNightMode ? '#F8FAFC' : '#1E293B',
    textSub: isNightMode ? '#94A3B8' : '#64748B',
    divider: isNightMode ? '#334155' : '#F1F5F9',
    bottomNavBg: isNightMode ? '#1E293B' : '#FFFFFF',
    primary: '#6D4AFF',
  };

  if (loading || !data) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: c.bg }]} edges={['top']}>
        <GrowthStorySkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.bg }]} edges={['top']}>
      <StatusBar barStyle={isNightMode ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />

      {/* Top Header with '<' back, story name, and night toggle */}
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
            {data.story.title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: c.textSub }]}>
            {data.story.category || 'Story'} · {data.story.readingTimeMinutes} min read
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={toggleNightMode}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isNightMode ? 'sunny' : 'moon-outline'}
            size={18}
            color={isNightMode ? '#FBBF24' : '#6D4AFF'}
          />
        </TouchableOpacity>
      </View>

      {/* Sticky reading progress bar */}
      <View style={[styles.progressBarSticky, { backgroundColor: isNightMode ? '#334155' : '#E2E8F0' }]}>
        <Animated.View
          style={[styles.progressBarFill, { width: `${readProgress}%`, backgroundColor: '#6D4AFF' }]}
        />
      </View>

      {/* Main reading scroll */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + Math.max(insets.bottom, 12) }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Story content */}
        {isDialogue ? (
          /* ── DIALOGUE / CONVERSATION MODE ── */
          <View style={styles.dialogueWrap}>
            {sentences.map((sentence: any, i: number) => {
              const sentenceText = typeof sentence === 'string' ? sentence : sentence?.text || String(sentence || '');
              const key = sentence?.order ?? i;
              const { speaker, line } = parseSpeakerLine(sentenceText);
              const colorConfig = speakerColors.get(speaker || '') || {
                bg: '#F8FAFC',
                text: '#0F172A',
                speaker: '#475569',
                isRight: false,
              };
              const isRight = colorConfig.isRight;
              const isActive = playing && i === activeSentence;

              return (
                <View key={key} style={[styles.bubbleRow, isRight && styles.bubbleRowRight]}>
                  {!isRight && (
                    <View style={[styles.avatar, { backgroundColor: colorConfig.bg }]}>
                      <Text style={styles.avatarText}>{speaker?.charAt(0) || '?'}</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isRight ? styles.bubbleRight : styles.bubbleLeft,
                      { backgroundColor: isNightMode ? (isRight ? '#1E3A5F' : '#1E293B') : colorConfig.bg },
                      isActive && styles.bubbleActive,
                    ]}
                  >
                    {speaker && (
                      <Text style={[styles.bubbleSpeaker, { color: isNightMode ? '#A78BFA' : colorConfig.speaker }]}>
                        {speaker}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.bubbleText,
                        { fontSize: textSize - 1, lineHeight: textSize + 8 },
                        { color: isNightMode ? '#E2E8F0' : colorConfig.text },
                      ]}
                    >
                      {renderTokens(line || sentenceText, String(key), isNightMode)}
                    </Text>
                  </View>
                  {isRight && (
                    <View style={[styles.avatar, { backgroundColor: colorConfig.bg }]}>
                      <Text style={styles.avatarText}>{speaker?.charAt(0) || '?'}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          /* ── STORY / LOVE STORY READING MODE ── */
          <View style={[styles.storyCard, { backgroundColor: c.card, borderColor: c.border }]}>
            {/* Love Story drop-cap first letter */}
            {isLoveStory && sentences.length > 0 && (
              <View style={styles.loveStoryOrnament}>
                <Text style={styles.loveStoryHeart}>❤</Text>
              </View>
            )}

            {sentences.map((sentence: any, i: number) => {
              const sentenceText =
                typeof sentence === 'string' ? sentence : sentence?.text || String(sentence || '');
              const key = sentence?.order ?? i;
              const isActive = playing && i === activeSentence;
              const isFirst = i === 0 && isLoveStory;

              return (
                <View
                  key={key}
                  style={[
                    styles.paragraphWrap,
                    isActive && { backgroundColor: isNightMode ? '#1E1B4B40' : '#EEF2FF70' },
                  ]}
                >
                  {isFirst ? (
                    <Text
                      style={[
                        styles.paragraph,
                        { fontSize: textSize, lineHeight: textSize * 1.85, color: c.text, fontFamily: SERIF },
                      ]}
                    >
                      <Text style={[styles.dropCap, { color: '#F43F5E', fontFamily: SERIF }]}>
                        {sentenceText.charAt(0)}
                      </Text>
                      {renderTokens(sentenceText.slice(1), String(key), isNightMode)}
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.paragraph,
                        { fontSize: textSize, lineHeight: textSize * 1.85, color: c.text, fontFamily: SERIF },
                      ]}
                    >
                      {renderTokens(sentenceText, String(key), isNightMode)}
                    </Text>
                  )}

                  {/* Divider ornament every 4 paragraphs */}
                  {(i + 1) % 4 === 0 && i < sentences.length - 1 && (
                    <Text style={[styles.ornament, { color: c.textSub }]}>
                      {isLoveStory ? '❤ ∙ ❤ ∙ ❤' : '∙ ∙ ∙'}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Progress indicator */}
        <View style={styles.progressFooter}>
          <View style={[styles.progressFooterBg, { backgroundColor: isNightMode ? '#334155' : '#E2E8F0' }]}>
            <View style={[styles.progressFooterFill, { width: `${readProgress}%` }]} />
          </View>
          <Text style={[styles.progressFooterText, { color: c.textSub }]}>{readProgress}% read</Text>
        </View>

        {/* Complete button */}
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={completing}
          onPress={completeLesson}
          style={[styles.completeBtn, completing && { opacity: 0.7 }]}
        >
          <LinearGradient
            colors={['#6D4AFF', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.completeBtnGrad}
          >
            {completing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.completeBtnText}>
              {completing ? 'Completing...' : 'Complete & Claim Reward'}
            </Text>
            {!completing && <Text style={styles.completeBtnXP}>+{data.xpReward} XP</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating reading toolbar */}
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: c.bottomNavBg,
            borderTopColor: c.border,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <TouchableOpacity style={styles.toolbarItem} onPress={togglePlay} activeOpacity={0.7}>
          <View style={[styles.toolbarIconWrap, playing && { backgroundColor: '#EDE9FE' }]}>
            <Ionicons
              name={playing ? 'pause-circle' : 'play-circle'}
              size={22}
              color={playing ? '#6D4AFF' : (isNightMode ? '#E2E8F0' : '#1E293B')}
            />
          </View>
          <Text style={[styles.toolbarLabel, { color: playing ? '#6D4AFF' : c.textSub }]}>
            {playing ? 'Pause' : 'Listen'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolbarItem} onPress={cycleTextSize} activeOpacity={0.7}>
          <View style={styles.toolbarIconWrap}>
            <Ionicons name="text-outline" size={20} color={isNightMode ? '#E2E8F0' : '#1E293B'} />
          </View>
          <Text style={[styles.toolbarLabel, { color: c.textSub }]}>Aa {textSize}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolbarItem} onPress={toggleBookmark} activeOpacity={0.7}>
          <View style={[styles.toolbarIconWrap, bookmarked && { backgroundColor: '#FEF3C7' }]}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={bookmarked ? '#F59E0B' : (isNightMode ? '#E2E8F0' : '#1E293B')}
            />
          </View>
          <Text style={[styles.toolbarLabel, { color: bookmarked ? '#F59E0B' : c.textSub }]}>
            {bookmarked ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolbarItem} onPress={toggleWishlist} activeOpacity={0.7}>
          <View style={[styles.toolbarIconWrap, wishlisted && { backgroundColor: '#FFE4E6' }]}>
            <Ionicons
              name={wishlisted ? 'heart' : 'heart-outline'}
              size={20}
              color={wishlisted ? '#F43F5E' : (isNightMode ? '#E2E8F0' : '#1E293B')}
            />
          </View>
          <Text style={[styles.toolbarLabel, { color: wishlisted ? '#F43F5E' : c.textSub }]}>
            {wishlisted ? 'Liked' : 'Like'}
          </Text>
        </TouchableOpacity>
      </View>

      <VocabularyModal word={selectedWord} onClose={() => setSelectedWord(null)} />

      <GrowthCelebrationModal
        visible={showCelebration}
        xpEarned={completeResult?.xpEarned ?? 0}
        stars={completeResult?.stars ?? 3}
        leveledUp={completeResult?.leveledUp ?? false}
        streak={completeResult?.streak ?? 0}
        vocabList={data?.vocabulary}
        onContinue={() => {
          setShowCelebration(false);
          navigation.goBack();
        }}
        onBackToHome={() => {
          setShowCelebration(false);
          navigation.navigate('GrowthHome');
        }}
      />
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
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },

  progressBarSticky: {
    height: 2.5,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Dialogue Mode
  dialogueWrap: {
    gap: 12,
    marginBottom: 20,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleRowRight: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleLeft: {
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    borderBottomRightRadius: 4,
  },
  bubbleActive: {
    borderWidth: 1.5,
    borderColor: '#6D4AFF',
  },
  bubbleSpeaker: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
  },
  bubbleText: {
    fontWeight: '400',
  },

  // Story card (non-dialogue)
  storyCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  loveStoryOrnament: {
    alignItems: 'center',
    marginBottom: 10,
  },
  loveStoryHeart: {
    fontSize: 18,
    color: '#F43F5E',
  },
  paragraphWrap: {
    marginBottom: 14,
    borderRadius: 8,
    padding: 2,
  },
  paragraph: {
    letterSpacing: 0.2,
  },
  dropCap: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
  },
  ornament: {
    textAlign: 'center',
    marginVertical: 8,
    fontSize: 12,
  },

  tapWord: {
    color: '#6D4AFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  tapWordDark: {
    color: '#A78BFA',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Progress footer
  progressFooter: {
    alignItems: 'center',
    marginVertical: 14,
  },
  progressFooterBg: {
    width: 140,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFooterFill: {
    height: '100%',
    backgroundColor: '#6D4AFF',
    borderRadius: 2,
  },
  progressFooterText: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },

  // Complete button
  completeBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#6D4AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  completeBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  completeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  completeBtnXP: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  toolbarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 12,
  },
  toolbarIconWrap: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default GrowthStoryScreen;
