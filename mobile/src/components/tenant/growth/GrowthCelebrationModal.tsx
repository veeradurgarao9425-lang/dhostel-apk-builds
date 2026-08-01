import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { theme } from '../../../theme/tenantTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONFETTI_COLORS = ['#6D4AFF', '#F97316', '#16A34A', '#F59E0B', '#EC4899', '#3B82F6'];

function ConfettiPiece({ index }: { index: number }) {
  const translateY = useSharedValue(-40);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  const left = useRef(Math.random() * SCREEN_WIDTH).current;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const delay = Math.round(Math.random() * 250);
  const duration = 1400 + Math.round(Math.random() * 700);
  const drift = (Math.random() - 0.5) * 120;
  const size = 6 + Math.round(Math.random() * 6);

  useEffect(() => {
    translateY.value = withDelay(delay, withTiming(640, { duration, easing: Easing.in(Easing.quad) }));
    translateX.value = withDelay(delay, withTiming(drift, { duration, easing: Easing.out(Easing.quad) }));
    rotate.value = withDelay(delay, withTiming(360 + Math.random() * 360, { duration }));
    opacity.value = withDelay(delay + duration - 300, withTiming(0, { duration: 300 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        { left, width: size, height: size * 1.6, backgroundColor: color, borderRadius: size * 0.2 },
        style,
      ]}
    />
  );
}

interface Props {
  visible: boolean;
  xpEarned: number;
  stars: number;
  leveledUp: boolean;
  streak: number;
  onContinue: () => void;
}

export function GrowthCelebrationModal({ visible, xpEarned, stars, leveledUp, streak, onContinue }: Props) {
  const [displayXp, setDisplayXp] = useState(0);
  const xpAnim = useRef(new RNAnimated.Value(0)).current;
  const scaleAnim = useRef(new RNAnimated.Value(0.6)).current;

  useEffect(() => {
    if (!visible) return;
    setDisplayXp(0);
    xpAnim.setValue(0);
    scaleAnim.setValue(0.6);

    const listenerId = xpAnim.addListener(({ value }) => setDisplayXp(Math.round(value)));
    RNAnimated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    RNAnimated.timing(xpAnim, { toValue: xpEarned, duration: 900, useNativeDriver: false }).start();

    return () => xpAnim.removeListener(listenerId);
  }, [visible, xpEarned]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        {Array.from({ length: 26 }).map((_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}

        <RNAnimated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.trophyWrap}>
            <Ionicons name="trophy" size={40} color="#F59E0B" />
          </View>
          <Text style={styles.title}>Congratulations!</Text>
          <Text style={styles.subtitle}>You improved today.</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3].map((i) => (
              <Ionicons
                key={i}
                name={i <= stars ? 'star' : 'star-outline'}
                size={28}
                color={i <= stars ? '#F59E0B' : theme.colors.border}
              />
            ))}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Ionicons name="flash" size={16} color={theme.colors.primary} />
              <Text style={styles.statPillText}>+{displayXp} XP</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="flame" size={16} color="#F97316" />
              <Text style={styles.statPillText}>{streak} day streak</Text>
            </View>
          </View>

          {leveledUp && (
            <View style={styles.levelUpBanner}>
              <Ionicons name="rocket" size={16} color="#FFFFFF" />
              <Text style={styles.levelUpText}>Level Up!</Text>
            </View>
          )}

          <Text style={styles.microcopy}>Every small improvement matters.</Text>

          <TouchableOpacity style={styles.continueButton} onPress={onContinue} activeOpacity={0.85}>
            <Text style={styles.continueButtonText}>Continue</Text>
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
    width: '84%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadow.raised,
  },
  trophyWrap: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: theme.colors.warningSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  starsRow: { flexDirection: 'row', gap: 6, marginTop: theme.spacing.lg },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: theme.radius.pill,
  },
  statPillText: { fontWeight: '800', fontSize: 13, color: theme.colors.text },
  levelUpBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: theme.radius.pill,
    marginTop: theme.spacing.md,
  },
  levelUpText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  microcopy: { fontSize: 12, color: theme.colors.textSubtle, marginTop: theme.spacing.lg, fontStyle: 'italic' },
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14, paddingHorizontal: theme.spacing['3xl'],
    marginTop: theme.spacing.lg,
  },
  continueButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});

export default GrowthCelebrationModal;
