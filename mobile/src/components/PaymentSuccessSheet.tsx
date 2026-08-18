/**
 * PaymentSuccessSheet
 *
 * Confirmation shown after a payment is recorded. Replaces the one-line toast,
 * which vanished before the owner could read what was actually saved and gave
 * them nowhere to go next.
 *
 * Design notes — this is Hostix's own language, not a copy of the reference:
 *   • The amount is the hero. Everything else is supporting detail.
 *   • A single spring-animated tick, drawn as a ring rather than a filled
 *     circle, so it reads as premium instead of a stock alert dialog.
 *   • Purple gradient (the app's identity) for the ring and primary action —
 *     green is used only as a small "PAID" chip, so the screen doesn't turn
 *     into a generic success page.
 *   • The two things an owner wants next are one tap away: the receipt, or
 *     back to the list. No dead ends.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, Animated, Easing, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface PaymentSuccessSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Amount collected, in rupees. */
  amount: number | string;
  /** Who paid — student or staff name. */
  payerName?: string;
  /** e.g. "Room 12" */
  roomLabel?: string;
  /** e.g. "Aug 2026" — the period the money is applied to. */
  periodLabel?: string;
  /** e.g. "Cash", "PhonePe". */
  paymentMode?: string;
  /** Receipt number, when one was generated. */
  receiptNo?: string;
  /** Balance still outstanding after this payment. 0 renders the cleared chip. */
  remainingBalance?: number;
  /** Omit to hide the receipt action. */
  onViewReceipt?: () => void;
  isDark?: boolean;
}

const INR = (n: number | string) => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (!isFinite(v as number)) return '₹0';
  return `₹${Number(v).toLocaleString('en-IN')}`;
};

export const PaymentSuccessSheet: React.FC<PaymentSuccessSheetProps> = ({
  visible, onClose, amount, payerName, roomLabel, periodLabel,
  paymentMode, receiptNo, remainingBalance, onViewReceipt, isDark = false,
}) => {
  const insets = useSafeAreaInsets();
  const tick = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      tick.setValue(0);
      slide.setValue(0);
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.spring(tick, {
          toValue: 1, friction: 5, tension: 90, delay: 120, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, tick, slide]);

  const cleared = typeof remainingBalance === 'number' && remainingBalance <= 0;
  const sheetBg = isDark ? '#0F172A' : '#FFFFFF';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textMuted = isDark ? '#94A3B8' : '#64748B';
  const divider = isDark ? '#1E293B' : '#F1F5F9';

  const detailRows = [
    payerName ? { icon: 'person-outline', label: 'Paid by', value: roomLabel ? `${payerName} · ${roomLabel}` : payerName } : null,
    periodLabel ? { icon: 'calendar-outline', label: 'For', value: periodLabel } : null,
    paymentMode ? { icon: 'card-outline', label: 'Mode', value: paymentMode } : null,
    receiptNo ? { icon: 'receipt-outline', label: 'Receipt', value: receiptNo } : null,
  ].filter(Boolean) as Array<{ icon: string; label: string; value: string }>;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            s.sheet,
            {
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, 12) + 12,
              transform: [{
                translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }),
              }],
            },
          ]}
          // Swallow taps so pressing the sheet doesn't dismiss it.
          onStartShouldSetResponder={() => true}
        >
          <View style={[s.grabber, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

          {/* Tick — gradient ring, spring in */}
          <Animated.View style={{ transform: [{ scale: tick }] }}>
            <LinearGradient
              colors={['#7C3AED', '#6D28D9']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.ring}
            >
              <View style={[s.ringInner, { backgroundColor: sheetBg }]}>
                <Ionicons name="checkmark-sharp" size={34} color="#7C3AED" />
              </View>
            </LinearGradient>
          </Animated.View>

          <Text style={[s.title, { color: textPrimary }]}>Payment recorded</Text>

          {/* The hero figure */}
          <Text style={[s.amount, { color: textPrimary }]}>{INR(amount)}</Text>

          {cleared ? (
            <View style={s.clearedChip}>
              <Ionicons name="shield-checkmark" size={13} color="#047857" />
              <Text style={s.clearedChipText}>Dues fully cleared</Text>
            </View>
          ) : typeof remainingBalance === 'number' ? (
            <View style={s.pendingChip}>
              <Ionicons name="time-outline" size={13} color="#B45309" />
              <Text style={s.pendingChipText}>{INR(remainingBalance)} still pending</Text>
            </View>
          ) : null}

          {detailRows.length > 0 && (
            <View style={[s.details, { borderColor: divider }]}>
              {detailRows.map((row, i) => (
                <View key={row.label} style={[s.detailRow, i > 0 && { borderTopWidth: 1, borderTopColor: divider }]}>
                  <View style={s.detailLeft}>
                    <Ionicons name={row.icon as any} size={15} color={textMuted} />
                    <Text style={[s.detailLabel, { color: textMuted }]}>{row.label}</Text>
                  </View>
                  <Text style={[s.detailValue, { color: textPrimary }]} numberOfLines={1}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.actions}>
            {onViewReceipt && (
              <Pressable style={s.primaryBtn} onPress={onViewReceipt} accessibilityRole="button">
                <LinearGradient
                  colors={['#7C3AED', '#6D28D9']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.primaryBtnGrad}
                >
                  <Ionicons name="document-text-outline" size={17} color="#FFF" />
                  <Text style={s.primaryBtnText}>View receipt</Text>
                </LinearGradient>
              </Pressable>
            )}
            <Pressable
              style={[s.secondaryBtn, { borderColor: divider }]}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={[s.secondaryBtnText, { color: textMuted }]}>Done</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    alignItems: 'center',
    ...Platform.select({
      android: { elevation: 24 },
      ios: {
        shadowColor: '#000', shadowOpacity: 0.2,
        shadowRadius: 20, shadowOffset: { width: 0, height: -6 },
      },
    }),
  },
  grabber: { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  ring: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  ringInner: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 15, fontWeight: '600', marginTop: 16,
    letterSpacing: 0.2,
  },
  amount: {
    fontSize: 38, fontWeight: '800', marginTop: 4,
    letterSpacing: -0.8,
  },
  clearedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#D1FAE5', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: 10,
  },
  clearedChipText: { color: '#047857', fontSize: 12, fontWeight: '700' },
  pendingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEF3C7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: 10,
  },
  pendingChipText: { color: '#B45309', fontSize: 12, fontWeight: '700' },
  details: {
    width: '100%', borderWidth: 1, borderRadius: 16,
    marginTop: 20, overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11, gap: 12,
  },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailLabel: { fontSize: 12.5, fontWeight: '500' },
  detailValue: { fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  actions: { width: '100%', marginTop: 20, gap: 10 },
  primaryBtn: { borderRadius: 14, overflow: 'hidden' },
  primaryBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 14.5, fontWeight: '600' },
});

export default PaymentSuccessSheet;
