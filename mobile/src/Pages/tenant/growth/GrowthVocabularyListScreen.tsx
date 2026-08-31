import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';
import { VocabularyModal, VocabWord } from '../../../components/tenant/growth/VocabularyModal';
import { SkeletonListRow } from '../../../components/tenant/ui/SkeletonLoader';

import AppHeader from '../../../components/tenant/ui/AppHeader';

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
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Standard Unified AppHeader */}
      <AppHeader
        title="My Vocabulary"
        subtitle={words.length > 0 ? `${words.length} saved words to master` : 'Your personal word bank'}
        showBack={false}
        rightComponent={
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{words.length}</Text>
          </View>
        }
      />



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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  gradientHeader: {
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing['3xl'], gap: theme.spacing.md },
  emptyText: { ...theme.text.body, color: theme.colors.textMuted, textAlign: 'center' },
  list: { padding: theme.spacing.lg, paddingBottom: 85, gap: theme.spacing.sm },
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

