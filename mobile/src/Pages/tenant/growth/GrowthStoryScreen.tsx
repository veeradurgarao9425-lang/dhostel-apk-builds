import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';
import { GrowthIllustration } from '../../../components/tenant/growth/GrowthIllustration';
import { VocabularyModal, VocabWord } from '../../../components/tenant/growth/VocabularyModal';
import { GrowthStorySkeleton } from '../../../components/tenant/growth/GrowthSkeletons';

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

const SPEAKER_LINE = /^([A-Za-z][A-Za-z\s]{0,24}):\s*(.*)$/;

function parseSpeakerLine(text: string): { speaker: string | null; line: string } {
  const m = text.match(SPEAKER_LINE);
  if (m) return { speaker: m[1].trim(), line: m[2] };
  return { speaker: null, line: text };
}

export function GrowthStoryScreen({ navigation, route }: any) {
  const { levelId } = route.params as { levelId: number };

  const [data, setData] = useState<LevelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSentence, setActiveSentence] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vocabByWord = useRef<Map<string, VocabWord>>(new Map());

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

    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      Speech.stop();
    };
  }, [levelId]);

  const sentences = data?.story.sentences || [];
  const isDialogue = data?.story.category === 'dialogue';

  const speakerSides = React.useMemo(() => {
    const map = new Map<string, 'left' | 'right'>();
    if (!isDialogue) return map;
    for (const s of sentences) {
      const { speaker } = parseSpeakerLine(s.text);
      if (speaker && !map.has(speaker)) {
        map.set(speaker, map.size === 0 ? 'left' : 'right');
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

  const startQuiz = () => {
    Speech.stop();
    navigation.navigate('GrowthQuiz', { levelId, questions: data?.questions || [] });
  };

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <GrowthStorySkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.illustrationWrap}>
          <GrowthIllustration illustrationKey={data.story.illustrationKey} size={140} />
        </View>

        <Text style={styles.title}>{data.story.title}</Text>
        <Text style={styles.meta}>{data.story.readingTimeMinutes} min read · {data.story.category}</Text>

        <View style={styles.playRow}>
          <TouchableOpacity style={styles.playButton} onPress={togglePlay} activeOpacity={0.85}>
            <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#FFFFFF" />
            <Text style={styles.playButtonText}>{playing ? 'Pause narration' : 'Listen to story'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconAction} onPress={toggleBookmark}>
            <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconAction} onPress={() => stub('Like')}>
            <Ionicons name="heart-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconAction} onPress={() => stub('Share')}>
            <Ionicons name="share-social-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {isDialogue ? (
          <View style={styles.dialogueWrap}>
            {sentences.map((sentence, i) => {
              const { speaker, line } = parseSpeakerLine(sentence.text);
              const side = (speaker && speakerSides.get(speaker)) || 'left';
              const isRight = side === 'right';
              return (
                <View
                  key={sentence.order}
                  style={[styles.bubbleRow, isRight && styles.bubbleRowRight]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isRight ? styles.bubbleRight : styles.bubbleLeft,
                      playing && i === activeSentence && styles.bubbleActive,
                    ]}
                  >
                    {speaker && (
                      <Text style={[styles.bubbleSpeaker, isRight && styles.bubbleSpeakerRight]}>{speaker}</Text>
                    )}
                    <Text style={[styles.bubbleText, isRight && styles.bubbleTextRight]}>
                      {renderTokens(line, String(sentence.order), isRight)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.storyCard}>
            {sentences.map((sentence, i) => (
              <Text
                key={sentence.order}
                style={[styles.sentence, playing && i === activeSentence && styles.sentenceActive]}
              >
                {renderTokens(sentence.text, String(sentence.order))}
                {' '}
              </Text>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.quizButton} onPress={startQuiz} activeOpacity={0.9}>
          <Ionicons name="help-circle" size={18} color="#FFFFFF" />
          <Text style={styles.quizButtonText}>Take the Quiz ({data.questions.length} questions)</Text>
        </TouchableOpacity>
      </ScrollView>

      <VocabularyModal word={selectedWord} onClose={() => setSelectedWord(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  timerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  timerText: { ...theme.text.caption, fontWeight: '700' },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing['4xl'], alignItems: 'center' },
  illustrationWrap: { marginBottom: theme.spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.text, textAlign: 'center' },
  meta: { ...theme.text.caption, marginTop: 4, textTransform: 'capitalize' },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.lg, width: '100%' },
  playButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 12,
  },
  playButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  iconAction: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  storyCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    ...theme.shadow.card,
  },
  sentence: { fontSize: 16, lineHeight: 26, color: theme.colors.text, borderRadius: 6 },
  sentenceActive: { backgroundColor: theme.colors.primarySoft },
  tapWord: { color: theme.colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  tapWordOnDark: { color: '#FFFFFF', fontWeight: '700', textDecorationLine: 'underline' },
  dialogueWrap: { width: '100%', marginTop: theme.spacing.lg, gap: theme.spacing.sm },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    ...theme.shadow.subtle,
  },
  bubbleLeft: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleActive: { borderWidth: 2, borderColor: theme.colors.accent },
  bubbleSpeaker: { ...theme.text.label, color: theme.colors.primary, marginBottom: 3 },
  bubbleSpeakerRight: { color: 'rgba(255,255,255,0.85)' },
  bubbleText: { fontSize: 15, lineHeight: 22, color: theme.colors.text },
  bubbleTextRight: { color: '#FFFFFF' },
  quizButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    marginTop: theme.spacing.xl,
    width: '100%',
    ...theme.shadow.card,
  },
  quizButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

export default GrowthStoryScreen;
