import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';

export interface VocabWord {
  vocab_id: number;
  word: string;
  meaning: string;
  pronunciation?: string;
  synonyms?: string;
  example_sentence?: string;
}

const TELUGU_DICT: Record<string, string> = {
  panicked: 'కంగారుపడ్డారు (Felt sudden fear or worry)',
  rushed: 'త్వరపడ్డారు (Moved very quickly)',
  disappointed: 'నిరాశపడ్డారు (Feeling sad because hopes failed)',
  recipe: 'వంట విధానం (Instructions for preparing a dish)',
  distracted: 'దృష్టి మరలింది (Unable to focus)',
  bland: 'చప్పగా ఉంది (Having little or no flavor)',
  honestly: 'నిజాయితీగా (In a truthful way)',
  embarrassed: 'అసౌకర్యంగా ఫీలయ్యాడు (Feeling awkward or ashamed)',
  groaned: 'మూలిగాడు (Low sound of pain or annoyance)',
  immediately: 'వెంటనే (At once, without delay)',
  dim: 'మసకగా (Not bright, low light)',
  gathered: 'సమీకరించబడ్డారు (Assembled in one place)',
  cherished: 'ఎంతో ఇష్టపడే (Treasured and loved)',
  refreshing: 'సేదతీర్చే (Pleasantly energizing)',
  stall: 'చిన్న కొట్టు (A small shop or stand)',
  sipped: 'చిన్నగా తాగాడు (Drank slowly in small amounts)',
  strangers: 'అపరిచితులు (People you do not know)',
  grateful: 'కృతజ్ఞత కలిగి ఉండటం (Feeling thankful)',
  borrowed: 'అప్పుగా తీసుకున్నారు (Took to use and return)',
  vanished: 'మాయమయ్యాడు (Disappeared suddenly)',
  fine: 'జరిమానా (Money paid as penalty)',
  apologized: 'క్షమాపణలు కోరాడు (Said sorry for a mistake)',
  relieved: 'ఉపశమనం పొందాడు (No longer worried)',
  mysterious: 'రహస్యమైన (Difficult to explain)',
  ingredients: 'పదార్ధాలు (Items used to prepare food)',
  revealed: 'బయటపెట్టారు (Made something known)',
  surprised: 'ఆశ్చర్యపోయారు (Feeling shock or wonder)',
  proud: 'గర్వంగా ఉంది (Feeling pleased about achievement)',
  nervous: 'ఆందోళనగా (Anxious or uneasy)',
  arrange: 'అమర్చడం (Put in organized order)',
  homesick: 'ఇంటి బెంగ (Longing for home)',
  inseparable: 'విడదీయరాని (Devoted, tight-knit)',
  thankful: 'కృతజ్ఞతతో (Feeling grateful)',
  stressed: 'ఒత్తిడికి గురయ్యాడు (Feeling strain)',
  whispered: 'గుసగుసలాడాడు (Spoke very softly)',
  delicious: 'రుచికరమైన (Very pleasant to taste)',
  burst: 'బద్దలైంది (Suddenly started with force)',
  risky: 'ప్రమాదకరమైన (Dangerous, uncertain)',
  gasped: 'ఉచ్ఛ్వాసపడ్డాడు (Caught breath in shock)',
  giggling: 'నవ్వుకోవడం (Laughing sillily)',
  spare: 'అదనపు (Extra backup)',
  wobbling: 'ఊగడం (Moving unsteadily)',
  teases: 'ఎగతాళి చేయడం (Makes fun playfully)',
  secretly: 'రహస్యంగా (In a hidden way)',
  handmade: 'చేతితో చేసినది (Crafted by hand)',
  heartfelt: 'హృదయపూర్వక (Deeply sincere)',
  empty: 'ఖాళీగా ఉంది (Containing nothing)',
  keepsake: 'జ్ఞాపిక (Memento, keepsake)',
};

interface Props {
  word: VocabWord | null;
  onClose: () => void;
  initiallySaved?: boolean;
}

export function VocabularyModal({ word, onClose, initiallySaved }: Props) {
  const [saved, setSaved] = useState(!!initiallySaved);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSaved(!!initiallySaved);
  }, [word?.vocab_id, initiallySaved]);

  if (!word) return null;

  const speak = () => {
    Speech.stop();
    Speech.speak(word.word, { language: 'en-US', rate: 0.85 });
  };

  const save = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      await api.post(`/growth/vocabulary/${word.vocab_id}/save`);
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const isVerb = word.meaning.trim().toLowerCase().startsWith('to ');
  const partOfSpeech = isVerb ? 'Verb' : 'Noun';

  const synonymList = word.synonyms
    ? word.synonyms.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const renderExample = (sentence: string, target: string) => {
    const regex = new RegExp(`(${target})`, 'gi');
    const parts = sentence.split(regex);
    return parts.map((part, index) => {
      if (part.toLowerCase() === target.toLowerCase()) {
        return (
          <Text key={index} style={{ color: '#5B39E0', fontWeight: '700' }}>
            {part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const teluguMeaning = TELUGU_DICT[word.word.toLowerCase()];

  return (
    <Modal visible={!!word} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.speakButton} onPress={speak} activeOpacity={0.8}>
              <Ionicons name="volume-high" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.wordCol}>
              <View style={styles.wordRow}>
                <Text style={styles.word}>{word.word}</Text>
                <View style={styles.posBadge}>
                  <Text style={styles.posText}>{partOfSpeech}</Text>
                </View>
              </View>
              {word.pronunciation ? (
                <Text style={styles.pronunciation}>/{word.pronunciation}/</Text>
              ) : null}
            </View>

            <TouchableOpacity onPress={save} hitSlop={12}>
              <Ionicons
                name={saved ? 'star' : 'star-outline'}
                size={26}
                color={saved ? '#F59E0B' : theme.colors.textSubtle}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionLabel}>Meaning</Text>
            <Text style={styles.bodyText}>{word.meaning}</Text>
          </View>

          {teluguMeaning ? (
            <View style={[styles.infoCard, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
              <Text style={[styles.sectionLabel, { color: '#D97706' }]}>Telugu Meaning</Text>
              <Text style={[styles.bodyText, { color: '#B45309', fontSize: 15 }]}>{teluguMeaning}</Text>
            </View>
          ) : null}

          {word.example_sentence ? (
            <View style={styles.infoCard}>
              <Text style={styles.sectionLabel}>Example</Text>
              <Text style={styles.exampleText}>
                {renderExample(word.example_sentence, word.word)}
              </Text>
            </View>
          ) : null}

          {synonymList.length > 0 ? (
            <View style={styles.infoCard}>
              <Text style={styles.sectionLabel}>Synonyms</Text>
              <View style={styles.synonymsWrap}>
                {synonymList.map((syn, idx) => (
                  <View key={idx} style={styles.synonymChip}>
                    <Text style={styles.synonymChipText}>{syn}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.saveButton, saved && styles.saveButtonSaved]}
            onPress={save}
            activeOpacity={0.85}
          >
            <Text style={styles.saveButtonText}>
              {saved ? 'Added to My Words' : '+ Add to My Words'}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FAF9F6', // Cozy paper color matching the story background
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing['3xl'],
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginBottom: theme.spacing.xl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xl },
  speakButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#5B39E0',
    alignItems: 'center', justifyContent: 'center',
  },
  wordCol: { flex: 1, marginLeft: theme.spacing.md },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontSize: 22, fontWeight: '800', color: '#5B39E0', textTransform: 'lowercase' },
  posBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  posText: { fontSize: 10, fontWeight: '700', color: '#4F46E5' },
  pronunciation: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  bodyText: { fontSize: 14, fontWeight: '600', color: '#1E293B', lineHeight: 20 },
  exampleText: { fontSize: 14, fontWeight: '500', color: '#334155', lineHeight: 20 },
  synonymsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  synonymChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  synonymChipText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#5B39E0',
    borderRadius: 24,
    paddingVertical: 14,
    marginTop: theme.spacing.lg,
  },
  saveButtonSaved: { backgroundColor: '#475569' },
  saveButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

export default VocabularyModal;
