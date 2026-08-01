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
      // silent — user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!word} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.word}>{word.word}</Text>
              {word.pronunciation ? <Text style={styles.pronunciation}>/{word.pronunciation}/</Text> : null}
            </View>
            <TouchableOpacity style={styles.speakButton} onPress={speak}>
              <Ionicons name="volume-high" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Meaning</Text>
          <Text style={styles.bodyText}>{word.meaning}</Text>

          {word.synonyms ? (
            <>
              <Text style={styles.sectionLabel}>Synonyms</Text>
              <Text style={styles.bodyText}>{word.synonyms}</Text>
            </>
          ) : null}

          {word.example_sentence ? (
            <>
              <Text style={styles.sectionLabel}>Example</Text>
              <Text style={styles.exampleText}>"{word.example_sentence}"</Text>
            </>
          ) : null}

          <TouchableOpacity
            style={[styles.saveButton, saved && styles.saveButtonSaved]}
            onPress={save}
            activeOpacity={0.85}
          >
            <Ionicons name={saved ? 'checkmark-circle' : 'bookmark'} size={18} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>{saved ? 'Saved to My Vocabulary' : 'Save to My Vocabulary'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius['2xl'],
    borderTopRightRadius: theme.radius['2xl'],
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing['3xl'],
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center', marginBottom: theme.spacing.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  word: { fontSize: 24, fontWeight: '800', color: theme.colors.text, textTransform: 'capitalize' },
  pronunciation: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  speakButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionLabel: { ...theme.text.label, marginTop: theme.spacing.md, marginBottom: 4 },
  bodyText: { ...theme.text.body },
  exampleText: { ...theme.text.body, fontStyle: 'italic', color: theme.colors.textMuted },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    marginTop: theme.spacing.xl,
  },
  saveButtonSaved: { backgroundColor: theme.colors.success },
  saveButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

export default VocabularyModal;
