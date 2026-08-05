import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme/tenantTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  xpEarned: number;
  stars: number;
  leveledUp: boolean;
  streak: number;
  vocabList?: { word: string }[];
  onContinue: () => void;
  onBackToHome?: () => void;
}

export function GrowthCelebrationModal({
  visible,
  xpEarned,
  stars,
  leveledUp,
  streak,
  vocabList,
  onContinue,
  onBackToHome,
}: Props) {
  const scaleAnim = useRef(new RNAnimated.Value(0.6)).current;

  useEffect(() => {
    if (!visible) return;
    scaleAnim.setValue(0.6);
    RNAnimated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <RNAnimated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.trophyWrap}>
            <Ionicons name="trophy" size={38} color="#F59E0B" />
          </View>
          <Text style={styles.title}>Great Job!</Text>
          <Text style={styles.subtitle}>You've completed this story</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3].map((i) => (
              <Ionicons
                key={i}
                name={i <= stars ? 'star' : 'star-outline'}
                size={22}
                color={i <= stars ? '#F59E0B' : '#E2E8F0'}
              />
            ))}
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#F5F3FF' }]}>
              <Text style={[styles.statNum, { color: '#6D4AFF' }]}>+{xpEarned}</Text>
              <Text style={styles.statLabel}>XP Earned</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#EEF2FF' }]}>
              <Text style={[styles.statNum, { color: '#4F46E5' }]}>+{vocabList?.length ?? 0}</Text>
              <Text style={styles.statLabel}>New Words</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FFF7ED' }]}>
              <Text style={[styles.statNum, { color: '#F97316' }]}>{streak} 🔥</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>

          {vocabList && vocabList.length > 0 && (
            <View style={styles.wordsSection}>
              <View style={styles.wordsHeader}>
                <Text style={styles.wordsTitle}>New Words Learned</Text>
                <Text style={styles.viewAllText}>View all</Text>
              </View>
              <View style={styles.wordsWrap}>
                {vocabList.slice(0, 5).map((v, i) => (
                  <View key={i} style={styles.wordChip}>
                    <Text style={styles.wordChipText}>{v.word}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {leveledUp && (
            <View style={styles.levelUpBanner}>
              <Ionicons name="rocket" size={14} color="#FFFFFF" />
              <Text style={styles.levelUpText}>Level Up!</Text>
            </View>
          )}

          <TouchableOpacity style={styles.continueButton} onPress={onContinue} activeOpacity={0.85}>
            <Text style={styles.continueButtonText}>Continue Reading</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={onBackToHome || onContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.backHomeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(32,33,36,0.75)', alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', top: 0 },
  card: {
    width: '86%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadow.raised,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trophyWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  starsRow: { flexDirection: 'row', gap: 4, marginTop: theme.spacing.md },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: theme.spacing.xl, width: '100%' },
  statBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statNum: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#64748B', marginTop: 3 },
  wordsSection: {
    width: '100%',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  wordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordsTitle: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  viewAllText: { fontSize: 11, fontWeight: '700', color: '#5B39E0' },
  wordsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wordChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  wordChipText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  levelUpBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: theme.radius.pill,
    marginTop: theme.spacing.md,
  },
  levelUpText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5B39E0',
    borderRadius: 24,
    paddingVertical: 14,
    width: '100%',
    marginTop: theme.spacing.xl,
  },
  continueButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  backHomeButton: {
    paddingVertical: 12,
    marginTop: 4,
  },
  backHomeButtonText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
});

export default GrowthCelebrationModal;
