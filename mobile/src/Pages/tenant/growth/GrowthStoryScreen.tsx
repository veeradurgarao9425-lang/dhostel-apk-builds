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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';
import { GrowthIllustration } from '../../../components/tenant/growth/GrowthIllustration';
import { VocabularyModal, VocabWord } from '../../../components/tenant/growth/VocabularyModal';
import { GrowthStorySkeleton } from '../../../components/tenant/growth/GrowthSkeletons';
import { GrowthCelebrationModal } from '../../../components/tenant/growth/GrowthCelebrationModal';

const { width: SCREEN_W } = Dimensions.get('window');

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
  const { levelId } = route.params as { levelId: number };

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
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

    return () => {
      Speech.stop();
    };
  }, [levelId]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const pct = Math.min(100, Math.round((contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100));
    if (!isNaN(pct) && pct >= 0) setReadProgress(pct);
  };

  const sentences = data?.story.sentences || [];
  const isDialogue = React.useMemo(() => {
    if (!data) return false;
    const cat = data.story.category?.toLowerCase() || '';
    if (cat.includes('dialogue') || cat.includes('conversation')) return true;
    return sentences.some(s => {
      const txt = typeof s === 'string' ? s : (s?.text || '');
      return SPEAKER_LINE.test(txt);
    });
  }, [data, sentences]);

  const isLoveStory = React.useMemo(() => {
    if (!data) return false;
    const cat = data.story.category?.toLowerCase() || '';
    return cat.includes('love');
  }, [data]);

  const speakerColors = React.useMemo(() => {
    const map = new Map<string, { bg: string; text: string; speaker: string; isRight: boolean }>();
    if (!isDialogue) return map;
    const colors = [
      { bg: '#F8FAFC', text: '#0F172A', speaker: '#475569', isRight: false },
      { bg: '#EEF2FF', text: '#0F172A', speaker: '#4F46E5', isRight: true },
      { bg: '#F0FDF4', text: '#0F172A', speaker: '#047857', isRight: false },
      { bg: '#FFF7ED', text: '#0F172A', speaker: '#B45309', isRight: true },
    ];
    let colorIndex = 0;
    for (const s of sentences) {
      const txt = typeof s === 'string' ? s : (s?.text || '');
      const { speaker } = parseSpeakerLine(txt);
      if (speaker && !map.has(speaker)) {
        map.set(speaker, { ...colors[colorIndex % colors.length], isRight: colorIndex % 2 === 1 });
        colorIndex++;
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
      if (i >= sentences.length) { setPlaying(false); return; }
      setActiveSentence(i);
      const s = sentences[i];
      const txt = typeof s === 'string' ? s : (s?.text || '');
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
    if (playing) { Speech.stop(); setPlaying(false); }
    else { setPlaying(true); speakFrom(activeSentence); }
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
    setTextSize((sz) => (sz === 14 ? 16 : sz === 16 ? 18 : sz === 18 ? 20 : 14));
  };

  const toggleNightMode = () => setIsNightMode((n) => !n);

  const completeLesson = async () => {
    if (completing || showCelebration) return;
    Speech.stop();
    setCompleting(true);
    try {
      const res = await api.post(`/growth/levels/${levelId}/complete`, { direct: true });
      if (res.data?.success) {
        setCompleteResult(res.data.data);
        setShowCelebration(true);
      } else {
        Alert.alert('Error', 'Failed to complete the lesson. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to connect to the server.');
    } finally {
      setCompleting(false);
    }
  };

  const bg = isNightMode ? '#0F172A' : '#FAFAF8';
  const cardBg = isNightMode ? '#1E293B' : '#FFFFFF';
  const textColor = isNightMode ? '#E2E8F0' : '#1E293B';
  const subtleColor = isNightMode ? '#64748B' : '#94A3B8';

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <GrowthStorySkeleton />
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      {/* Sticky reading progress bar */}
      <View style={styles.progressBarSticky}>
        <Animated.View
          style={[styles.progressBarFill, { width: `${readProgress}%` }]}
        />
      </View>

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: bg }}>
        <View style={[styles.header, { backgroundColor: bg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={[styles.categoryPill, { backgroundColor: isLoveStory ? '#FFF1F2' : '#EEF2FF' }]}>
              <Text style={[styles.categoryPillText, { color: isLoveStory ? '#F43F5E' : '#4F46E5' }]}>
                {isLoveStory ? '💕 ' : isDialogue ? '💬 ' : '📖 '}
                {data.story.category || 'Story'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleWishlist} style={styles.headerActionBtn} hitSlop={12}>
              <Ionicons
                name={wishlisted ? 'heart' : 'heart-outline'}
                size={20}
                color={wishlisted ? '#F43F5E' : textColor}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleBookmark} style={styles.headerActionBtn} hitSlop={12}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={bookmarked ? '#4F46E5' : textColor}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Main reading scroll */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: bg }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Story title & meta */}
        <View style={styles.titleBlock}>
          <Text style={[styles.storyTitle, { color: textColor, fontFamily: SERIF }]}>
            {data.story.title}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={subtleColor} />
            <Text style={[styles.metaText, { color: subtleColor }]}>{data.story.readingTimeMinutes} min read</Text>
            <View style={styles.metaDot} />
            <Text style={[styles.metaText, { color: subtleColor }]}>+{data.xpReward} XP</Text>
            <View style={styles.metaDot} />
            <Text style={[styles.metaText, { color: subtleColor }]}>Beginner</Text>
          </View>
          <View style={styles.dividerLine} />
        </View>

        {/* Story content */}
        {isDialogue ? (
          /* ── DIALOGUE / CONVERSATION MODE ── */
          <View style={styles.dialogueWrap}>
            {sentences.map((sentence: any, i: number) => {
              const sentenceText = typeof sentence === 'string' ? sentence : (sentence?.text || String(sentence || ''));
              const key = sentence?.order ?? i;
              const { speaker, line } = parseSpeakerLine(sentenceText);
              const colorConfig = speakerColors.get(speaker || '') || {
                bg: '#F8FAFC', text: '#0F172A', speaker: '#475569', isRight: false,
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
                    <Text style={[
                      styles.bubbleText,
                      { fontSize: textSize - 1, lineHeight: textSize + 8 },
                      { color: isNightMode ? '#E2E8F0' : colorConfig.text },
                    ]}>
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
          <View style={[styles.storyCard, { backgroundColor: cardBg }]}>
            {/* Love Story drop-cap first letter */}
            {isLoveStory && sentences.length > 0 && (
              <View style={styles.loveStoryOrnament}>
                <Text style={styles.loveStoryHeart}>❤</Text>
              </View>
            )}

            {sentences.map((sentence: any, i: number) => {
              const sentenceText = typeof sentence === 'string'
                ? sentence
                : (sentence?.text || String(sentence || ''));
              const key = sentence?.order ?? i;
              const isActive = playing && i === activeSentence;

              // First sentence gets drop-cap if love story
              const isFirst = i === 0 && isLoveStory;

              return (
                <View key={key} style={[styles.paragraphWrap, isActive && { backgroundColor: isNightMode ? '#1E1B4B30' : '#EEF2FF50' }]}>
                  {isFirst ? (
                    <Text style={[
                      styles.paragraph,
                      { fontSize: textSize, lineHeight: textSize * 1.9, color: isNightMode ? '#E2E8F0' : '#1E293B', fontFamily: SERIF },
                    ]}>
                      <Text style={[styles.dropCap, { color: '#F43F5E', fontFamily: SERIF }]}>
                        {sentenceText.charAt(0)}
                      </Text>
                      {renderTokens(sentenceText.slice(1), String(key), isNightMode)}
                    </Text>
                  ) : (
                    <Text style={[
                      styles.paragraph,
                      { fontSize: textSize, lineHeight: textSize * 1.9, color: isNightMode ? '#E2E8F0' : '#1E293B', fontFamily: SERIF },
                    ]}>
                      {renderTokens(sentenceText, String(key), isNightMode)}
                    </Text>
                  )}

                  {/* Divider ornament every 4 paragraphs */}
                  {(i + 1) % 4 === 0 && i < sentences.length - 1 && (
                    <Text style={[styles.ornament, { color: subtleColor }]}>
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
          <View style={styles.progressFooterBg}>
            <View style={[styles.progressFooterFill, { width: `${readProgress}%` }]} />
          </View>
          <Text style={[styles.progressFooterText, { color: subtleColor }]}>{readProgress}% read</Text>
        </View>

        {/* Complete button */}
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={completing}
          onPress={completeLesson}
          style={[styles.completeBtn, completing && { opacity: 0.7 }]}
        >
          <LinearGradient
            colors={['#4F46E5', '#7C3AED']}
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
      <View style={[styles.toolbar, { backgroundColor: isNightMode ? '#1E293B' : '#FFFFFF', borderColor: isNightMode ? '#2D3748' : '#F1F5F9' }]}>
        <TouchableOpacity style={styles.toolbarItem} onPress={togglePlay}>
          <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={26} color={playing ? '#4F46E5' : (isNightMode ? '#E2E8F0' : '#1E293B')} />
          <Text style={[styles.toolbarLabel, { color: isNightMode ? '#64748B' : '#94A3B8' }]}>{playing ? 'Pause' : 'Listen'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarItem} onPress={cycleTextSize}>
          <Ionicons name="text-outline" size={20} color={isNightMode ? '#E2E8F0' : '#1E293B'} />
          <Text style={[styles.toolbarLabel, { color: isNightMode ? '#64748B' : '#94A3B8' }]}>Aa {textSize}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarItem} onPress={toggleNightMode}>
          <Ionicons name={isNightMode ? 'sunny-outline' : 'moon-outline'} size={20} color={isNightMode ? '#FBBF24' : '#1E293B'} />
          <Text style={[styles.toolbarLabel, { color: isNightMode ? '#64748B' : '#94A3B8' }]}>{isNightMode ? 'Light' : 'Night'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarItem} onPress={toggleBookmark}>
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={bookmarked ? '#4F46E5' : (isNightMode ? '#E2E8F0' : '#1E293B')} />
          <Text style={[styles.toolbarLabel, { color: isNightMode ? '#64748B' : '#94A3B8' }]}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarItem} onPress={toggleWishlist}>
          <Ionicons name={wishlisted ? 'heart' : 'heart-outline'} size={20} color={wishlisted ? '#F43F5E' : (isNightMode ? '#E2E8F0' : '#1E293B')} />
          <Text style={[styles.toolbarLabel, { color: isNightMode ? '#64748B' : '#94A3B8' }]}>Like</Text>
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
        onContinue={() => { setShowCelebration(false); navigation.goBack(); }}
        onBackToHome={() => { setShowCelebration(false); navigation.navigate('GrowthHome'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Sticky progress bar
  progressBarSticky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#E2E8F0',
    zIndex: 100,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F920',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Title block
  titleBlock: { marginBottom: 24 },
  storyTitle: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaText: { fontSize: 12, fontWeight: '600' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' },
  dividerLine: { marginTop: 16, height: 1, backgroundColor: '#F1F5F9' },

  // Story card (non-dialogue)
  storyCard: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    marginBottom: 20,
  },
  loveStoryOrnament: {
    alignItems: 'center',
    marginBottom: 16,
  },
  loveStoryHeart: { fontSize: 20, color: '#F43F5E' },
  paragraphWrap: {
    borderRadius: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  paragraph: {
    lineHeight: 32,
  },
  dropCap: {
    fontSize: 48,
    lineHeight: 50,
    fontWeight: '800',
  },
  ornament: {
    textAlign: 'center',
    fontSize: 14,
    marginVertical: 16,
    letterSpacing: 8,
  },

  // Dialogue
  dialogueWrap: { gap: 12, marginBottom: 20 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowRight: { flexDirection: 'row-reverse' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#4F46E5' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  bubbleLeft: { borderBottomLeftRadius: 4 },
  bubbleRight: { borderBottomRightRadius: 4 },
  bubbleActive: { borderWidth: 2, borderColor: '#4F46E5' },
  bubbleSpeaker: { fontSize: 10, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
  bubbleText: { lineHeight: 22 },

  // Tap words
  tapWord: {
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    borderRadius: 4,
    fontWeight: '700',
    overflow: 'hidden',
  },
  tapWordDark: {
    color: '#A78BFA',
    backgroundColor: '#2E1A47',
    borderRadius: 4,
    fontWeight: '700',
    overflow: 'hidden',
  },

  // Progress footer
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  progressFooterBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFooterFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 2,
  },
  progressFooterText: { fontSize: 11, fontWeight: '700', width: 50 },

  // Complete button
  completeBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginBottom: 12,
  },
  completeBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  completeBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', flex: 1 },
  completeBtnXP: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  toolbarItem: { alignItems: 'center', justifyContent: 'center' },
  toolbarLabel: { fontSize: 10, fontWeight: '700', marginTop: 3 },
});

export default GrowthStoryScreen;
