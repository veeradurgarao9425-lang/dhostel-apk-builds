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
  telugu_meaning?: string;
  simple_meaning?: string;
  pronunciation?: string;
  synonyms?: string;
  example_sentence?: string;
}

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

  const teluguMeaning = word.telugu_meaning;
  const simpleMeaning = word.simple_meaning;

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
            {simpleMeaning ? (
              <Text style={styles.bodyText}>{simpleMeaning}</Text>
            ) : (
              <Text style={styles.bodyText}>{word.meaning}</Text>
            )}
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
