import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';
import { GrowthIllustration } from '../../../components/tenant/growth/GrowthIllustration';
import { VocabularyModal, VocabWord } from '../../../components/tenant/growth/VocabularyModal';
import { GrowthStorySkeleton } from '../../../components/tenant/growth/GrowthSkeletons';
import { GrowthCelebrationModal } from '../../../components/tenant/growth/GrowthCelebrationModal';

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

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
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

export function GrowthStoryScreen({ navigation, route }: any) {
  const { levelId } = route.params as { levelId: number };

  const [data, setData] = useState<LevelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSentence, setActiveSentence] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null);

  const [textSize, setTextSize] = useState(16);
  const [isNightMode, setIsNightMode] = useState(false);

  const [showCelebration, setShowCelebration] = useState(false);
  const [completeResult, setCompleteResult] = useState<any>(null);
  const [completing, setCompleting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vocabByWord = useRef<Map<string, VocabWord>>(new Map());

  useEffect(() => {
    api
      .get(`/growth/levels/${levelId}`)
      .then((res) => {
        if (res.data?.success) {
          setData(res.data.data);
          setTimeLeft(res.data.data.story.readingTimeMinutes * 60);
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

    timerRef.current = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      Speech.stop();
    };
  }, [levelId]);

  const toggleWishlist = async () => {
    const next = !wishlisted;
    setWishlisted(next);
    await AsyncStorage.setItem(`growth_wishlist_${levelId}`, next ? '1' : '0');
  };

  const cycleTextSize = () => {
    setTextSize((size) => {
      if (size === 14) return 16;
      if (size === 16) return 18;
      if (size === 18) return 20;
      return 14;
    });
  };

  const toggleNightMode = () => {
    setIsNightMode((n) => !n);
  };

  const sentences = data?.story.sentences || [];
  const isDialogue = React.useMemo(() => {
    if (!data) return false;
    const cat = data.story.category?.toLowerCase() || '';
    if (cat.includes('dialogue') || cat.includes('conversation')) return true;
    return sentences.some(s => SPEAKER_LINE.test(s.text));
  }, [data, sentences]);

  const speakerColors = React.useMemo(() => {
    const map = new Map<string, { bg: string; text: string; speaker: string; isRight: boolean }>();
    if (!isDialogue) return map;
    const colors = [
      { bg: '#F1F5F9', text: '#0F172A', speaker: '#475569', isRight: false },
      { bg: '#EEF2FF', text: '#0F172A', speaker: '#4F46E5', isRight: true },
      { bg: '#E0F2FE', text: '#0F172A', speaker: '#0369A1', isRight: false },
      { bg: '#ECFDF5', text: '#0F172A', speaker: '#047857', isRight: true },
    ];
    let colorIndex = 0;
    for (const s of sentences) {
      const { speaker } = parseSpeakerLine(s.text);
      if (speaker && !map.has(speaker)) {
        map.set(speaker, {
          ...colors[colorIndex % colors.length],
          isRight: colorIndex % 2 === 1,
        });
        colorIndex++;
      }
    }
    return map;
  }, [sentences, isDialogue]);

  const renderTokens = (text: string, keyPrefix: string, onDark = false) =>
    text.split(/(\s+)/).map((token, ti) => {
      const clean = token.replace(/[^a-zA-Z']/g, '').toLowerCase();
      const vocab = clean ? vocabByWord.current.get(clean) : undefined;
      if (vocab) {
        return (
          <Text
            key={`${keyPrefix}-${ti}`}
            style={onDark ? styles.tapWordOnDark : styles.tapWord}
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
      Speech.speak(sentences[i].text, {
        language: 'en-US',
        rate: 0.92,
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

  const stub = (feature: string) => Alert.alert('Coming soon', `${feature} is on its way in a future update!`);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <GrowthStorySkeleton />
      </SafeAreaView>
    );
  }

  const pct = sentences.length > 0 ? Math.round(((activeSentence + 1) / sentences.length) * 100) : 0;

  return (
    <SafeAreaView style={[styles.screen, isNightMode && { backgroundColor: '#121212' }]} edges={['top', 'bottom']}>
      {/* Header Bar */}
      <View style={[styles.header, isNightMode && { backgroundColor: '#121212', borderBottomColor: '#2D3748' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={isNightMode ? '#E2E8F0' : '#1E293B'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isNightMode && { color: '#E2E8F0' }]}>Chapter {data.story.storyId ?? levelId}</Text>
        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={toggleBookmark} hitSlop={12}>
            <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={isNightMode ? '#E2E8F0' : '#1E293B'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: isNightMode ? '#121212' : '#FAF9F6' }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Story Title & Tags */}
        <View style={styles.detailsHeader}>
          <Text style={[styles.title, isNightMode && { color: '#F1F5F9' }]}>{data.story.title}</Text>
          <View style={[styles.tagPill, isNightMode && { backgroundColor: '#3F1F2F' }]}>
            <Text style={[styles.tagText, isNightMode && { color: '#FDA4AF' }]}>{data.story.category || 'Daily Story'}</Text>
          </View>
          <Text style={[styles.meta, isNightMode && { color: '#94A3B8' }]}>
            ⏱️ {formatTime(timeLeft)} remaining  |  📊 Beginner  |  📖 {data.vocabulary?.length ?? 5} new words
          </Text>
        </View>

        {/* Large Cover Illustration (Only if not dialogue/conversation AND specific cooking/bus keywords match) */}
        {!isDialogue &&
          (data.story.title.toLowerCase().includes('cook') ||
            data.story.title.toLowerCase().includes('disaster') ||
            data.story.title.toLowerCase().includes('bus') ||
            data.story.title.toLowerCase().includes('missed')) && (
            <View style={styles.coverIllustrationWrap}>
              <GrowthIllustration
                illustrationKey={data.story.title}
                size={180}
                style={styles.coverIllustration}
              />
            </View>
          )}

        {/* Story Text / Dialogue bubbles */}
        {isDialogue ? (
          <View style={styles.dialogueWrap}>
            {sentences.map((sentence, i) => {
              const { speaker, line } = parseSpeakerLine(sentence.text);
              const colorConfig = (speaker && speakerColors.get(speaker)) || {
                bg: '#F1F5F9',
                text: '#0F172A',
                speaker: '#475569',
                isRight: false,
              };
              const isRight = colorConfig.isRight;
              return (
                <View
                  key={sentence.order}
                  style={[styles.bubbleRow, isRight && styles.bubbleRowRight]}
                >
                  <View
                    style={[
                      styles.bubble,
                      { backgroundColor: isNightMode ? (isRight ? '#1E293B' : '#2D3748') : colorConfig.bg },
                      isRight ? styles.bubbleRight : styles.bubbleLeft,
                      playing && i === activeSentence && styles.bubbleActive,
                      playing && i === activeSentence && isNightMode && { borderColor: '#A78BFA' },
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
                        { fontSize: textSize - 1, lineHeight: textSize + 6 },
                        { color: isNightMode ? '#E2E8F0' : colorConfig.text },
                      ]}
                    >
                      {renderTokens(line, String(sentence.order))}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.storyCard, isNightMode && { backgroundColor: '#1E1E1E', borderColor: '#2D3748' }]}>
            {sentences.map((sentence, i) => (
              <Text
                key={sentence.order}
                style={[
                  styles.sentence,
                  { fontSize: textSize, lineHeight: textSize + 10 },
                  isNightMode ? { color: '#E2E8F0' } : { color: '#334155' },
                  playing && i === activeSentence && styles.sentenceActive,
                  playing && i === activeSentence && isNightMode && { backgroundColor: '#2E1A47' },
                  i === activeSentence && styles.sentenceFocused,
                  i === activeSentence && isNightMode && { color: '#FFFFFF' },
                ]}
              >
                {renderTokens(sentence.text, String(sentence.order))}
                {' '}
              </Text>
            ))}
          </View>
        )}

        {/* Complete Button inside ScrollView at the bottom of text */}
        <TouchableOpacity
          style={[styles.quizButton, completing && { opacity: 0.7 }]}
          onPress={completeLesson}
          activeOpacity={0.9}
          disabled={completing}
        >
          {completing ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
          ) : (
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.quizButtonText}>
            {completing ? 'Completing...' : 'Complete & Claim Reward'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Settings & Audio Toolbar fixed at the bottom */}
      <View style={[styles.floatingToolbar, isNightMode && { backgroundColor: '#1E1E1E', borderColor: '#2D3748' }]}>
        <TouchableOpacity style={styles.toolbarItem} onPress={togglePlay} activeOpacity={0.7}>
          <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={24} color={isNightMode ? '#A78BFA' : '#5B39E0'} />
          <Text style={[styles.toolbarText, isNightMode && { color: '#94A3B8' }]}>{playing ? 'Pause' : 'Listen'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarItem} onPress={toggleBookmark} activeOpacity={0.7}>
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={isNightMode ? '#E2E8F0' : '#1E293B'} />
          <Text style={[styles.toolbarText, isNightMode && { color: '#94A3B8' }]}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarItem} onPress={toggleWishlist} activeOpacity={0.7}>
          <Ionicons name={wishlisted ? 'heart' : 'heart-outline'} size={20} color={wishlisted ? '#EF4444' : (isNightMode ? '#E2E8F0' : '#1E293B')} />
          <Text style={[styles.toolbarText, isNightMode && { color: '#94A3B8' }]}>Like</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarItem} onPress={cycleTextSize} activeOpacity={0.7}>
          <Ionicons name="text-outline" size={20} color={isNightMode ? '#E2E8F0' : '#1E293B'} />
          <Text style={[styles.toolbarText, isNightMode && { color: '#94A3B8' }]}>Text ({textSize})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarItem} onPress={toggleNightMode} activeOpacity={0.7}>
          <Ionicons name={isNightMode ? 'sunny-outline' : 'moon-outline'} size={20} color={isNightMode ? '#E2E8F0' : '#1E293B'} />
          <Text style={[styles.toolbarText, isNightMode && { color: '#94A3B8' }]}>{isNightMode ? 'Light' : 'Night'}</Text>
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
  screen: { flex: 1, backgroundColor: '#FAF9F6' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    backgroundColor: '#FAF9F6',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  headerRightActions: { flexDirection: 'row', alignItems: 'center' },
  progressionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  progressionText: { fontSize: 11, fontWeight: '700', color: '#64748B', width: 80 },
  progressionBarBg: { flex: 1, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  progressionBarFill: { height: '100%', backgroundColor: '#1E293B', borderRadius: 3 },
  progressionPercent: { fontSize: 11, fontWeight: '700', color: '#64748B', width: 32, textAlign: 'right' },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing['4xl'], alignItems: 'center' },
  detailsHeader: { width: '100%', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: '#1E293B', fontFamily: 'serif', lineHeight: 36, marginBottom: 8 },
  tagPill: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  tagText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },
  meta: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'capitalize' },
  coverIllustrationWrap: {
    width: '100%',
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  coverIllustration: {
    width: '100%',
    height: '100%',
  },
  storyCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadow.subtle,
  },
  sentence: { fontSize: 16, lineHeight: 28, color: '#334155', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 4 },
  sentenceActive: { backgroundColor: '#F5F3FF' },
  sentenceFocused: { color: '#1E293B', fontWeight: '500' },
  tapWord: {
    color: '#5B39E0',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    fontWeight: '700',
    overflow: 'hidden',
  },
  tapWordOnDark: {
    color: '#5B39E0',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    fontWeight: '700',
    overflow: 'hidden',
  },
  dialogueWrap: { width: '100%', gap: theme.spacing.md },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    ...theme.shadow.subtle,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleLeft: {
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    borderBottomRightRadius: 4,
  },
  bubbleActive: { borderWidth: 2, borderColor: '#5B39E0' },
  bubbleSpeaker: { fontSize: 11, fontWeight: '800', marginBottom: 4, letterSpacing: 0.3 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  floatingToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 6,
    width: '92%',
    alignSelf: 'center',
    marginVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadow.subtle,
  },
  toolbarItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarText: { fontSize: 10, fontWeight: '700', color: '#64748B', marginTop: 4 },
  quizButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.success,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    marginTop: theme.spacing.xl,
    width: '100%',
    ...theme.shadow.card,
  },
  quizButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

export default GrowthStoryScreen;
