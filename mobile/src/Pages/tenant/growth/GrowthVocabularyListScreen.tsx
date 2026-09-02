import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';
import { VocabularyModal, VocabWord } from '../../../components/tenant/growth/VocabularyModal';
import { SkeletonListRow } from '../../../components/tenant/ui/SkeletonLoader';

export function GrowthVocabularyListScreen({ navigation }: any) {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VocabWord | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .get('/growth/vocabulary/saved')
        .then((res) => res.data?.success && setWords(res.data.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Vocabulary</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={{ paddingTop: theme.spacing.sm }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonListRow key={i} last={i === 4} />
          ))}
        </View>
      ) : words.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={40} color={theme.colors.textSubtle} />
          <Text style={styles.emptyText}>No saved words yet. Tap any highlighted word in a story to save it here.</Text>
        </View>
      ) : (
        <FlatList
          data={words}
          keyExtractor={(w) => String(w.vocab_id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={styles.word}>{item.word}</Text>
                <Text style={styles.meaning} numberOfLines={1}>{item.meaning}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}

      <VocabularyModal word={selected} onClose={() => setSelected(null)} initiallySaved />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing['3xl'], gap: theme.spacing.md },
  emptyText: { ...theme.text.body, color: theme.colors.textMuted, textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  headerTitle: { ...theme.text.sectionTitle },
  list: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadow.subtle,
  },
  word: { fontSize: 16, fontWeight: '800', color: theme.colors.text, textTransform: 'capitalize' },
  meaning: { ...theme.text.caption, marginTop: 2 },
});

export default GrowthVocabularyListScreen;
