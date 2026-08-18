/**
 * PaymentSuccessSheet.tsx
 *
 * Celebratory confirmation sheet shown after a payment is recorded.
 * Inspired by Google Pay / PhonePe with spring animations, pulsing ripple glow,
 * colorful confetti burst, and actionable next steps.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, Animated, Easing, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  /** e.g. "Cash", "PhonePe", "GPay". */
  paymentMode?: string;
  /** Receipt number, when one was generated. */
  receiptNo?: string;
  /** Banking or hostel receiver name */
  bankingName?: string;
  /** Transaction / Reference ID */
  transactionId?: string;
  /** Balance still outstanding after this payment. 0 renders the cleared chip. */
  remainingBalance?: number;
  /** Omit to hide the receipt action. */
  onViewReceipt?: () => void;
  onGoToPassbook?: () => void;
  isDark?: boolean;
}

const INR = (n: number | string) => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (!isFinite(v as number)) return '₹0';
  return `₹${Number(v).toLocaleString('en-IN')}`;
};

// 12 Confetti particles with diverse colors and initial trajectories
const CONFETTI_PARTICLES = [
  { id: 1, color: '#10B981', size: 9, dx: -90, dy: -120, rot: '45deg' },
  { id: 2, color: '#3B82F6', size: 7, dx: 95, dy: -130, rot: '120deg' },
  { id: 3, color: '#F59E0B', size: 10, dx: -130, dy: -60, rot: '200deg' },
  { id: 4, color: '#EC4899', size: 8, dx: 125, dy: -70, rot: '80deg' },
  { id: 5, color: '#8B5CF6', size: 9, dx: -60, dy: -150, rot: '160deg' },
  { id: 6, color: '#06B6D4', size: 7, dx: 70, dy: -140, rot: '30deg' },
  { id: 7, color: '#10B981', size: 8, dx: -140, dy: 10, rot: '95deg' },
  { id: 8, color: '#F43F5E', size: 10, dx: 140, dy: 15, rot: '260deg' },
  { id: 9, color: '#6366F1', size: 6, dx: -110, dy: 60, rot: '40deg' },
  { id: 10, color: '#F59E0B', size: 8, dx: 110, dy: 65, rot: '175deg' },
  { id: 11, color: '#14B8A6', size: 9, dx: -35, dy: -160, rot: '290deg' },
  { id: 12, color: '#A855F7', size: 7, dx: 40, dy: -155, rot: '110deg' },
];

export const PaymentSuccessSheet: React.FC<PaymentSuccessSheetProps> = ({
  visible, onClose, amount, payerName, roomLabel, periodLabel,
  paymentMode, receiptNo, bankingName, transactionId, remainingBalance,
  onViewReceipt, onGoToPassbook, isDark = false,
}) => {
  const insets = useSafeAreaInsets();
  const tickScale = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0.8)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      tickScale.setValue(0);
      slideAnim.setValue(0);
      confettiAnim.setValue(0);
      rippleScale.setValue(0.8);
      rippleOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.spring(tickScale, {
          toValue: 1, friction: 4, tension: 110, delay: 100, useNativeDriver: true,
        }),
        Animated.timing(confettiAnim, {
          toValue: 1, duration: 800, delay: 150, easing: Easing.out(Easing.quad), useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(100),
          Animated.parallel([
            Animated.timing(rippleScale, {
              toValue: 1.6, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true,
            }),
            Animated.timing(rippleOpacity, {
              toValue: 0.5, duration: 200, useNativeDriver: true,
            }),
          ]),
          Animated.timing(rippleOpacity, {
            toValue: 0, duration: 500, useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [visible, tickScale, slideAnim, confettiAnim, rippleScale, rippleOpacity]);

  const cleared = typeof remainingBalance === 'number' && remainingBalance <= 0;
  const sheetBg = isDark ? '#0F172A' : '#FFFFFF';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textMuted = isDark ? '#94A3B8' : '#64748B';
  const divider = isDark ? '#1E293B' : '#F1F5F9';
  const cardBg = isDark ? '#1E293B' : '#F8FAFC';

  const detailRows = [
    payerName ? { icon: 'person-outline', label: 'Paid by', value: roomLabel ? `${payerName} (${roomLabel})` : payerName } : null,
    periodLabel ? { icon: 'calendar-outline', label: 'Period', value: periodLabel } : null,
    paymentMode ? { icon: 'wallet-outline', label: 'Mode', value: paymentMode } : null,
    receiptNo ? { icon: 'receipt-outline', label: 'Receipt No', value: receiptNo } : null,
    transactionId ? { icon: 'barcode-outline', label: 'Ref ID', value: transactionId } : null,
  ].filter(Boolean) as Array<{ icon: string; label: string; value: string }>;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            s.sheet,
            {
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, 14) + 12,
              transform: [{
                translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [450, 0] }),
              }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Grab handle */}
          <View style={[s.grabber, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

          {/* Close button top right */}
          <Pressable style={s.closeBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={20} color={textMuted} />
          </Pressable>

          {/* Center Checkmark Hero with Pulse & Confetti */}
          <View style={s.iconWrapper}>
            {/* Pulsing Ripple Wave */}
            <Animated.View
              style={[
                s.ripple,
                {
                  transform: [{ scale: rippleScale }],
                  opacity: rippleOpacity,
                },
              ]}
            />

            {/* Confetti Particles Bursting Out */}
            {CONFETTI_PARTICLES.map(p => {
              const translateX = confettiAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, p.dx],
              });
              const translateY = confettiAnim.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [0, p.dy, p.dy + 25],
              });
              const opacity = confettiAnim.interpolate({
                inputRange: [0, 0.1, 0.8, 1],
                outputRange: [0, 1, 1, 0],
              });
              const scale = confettiAnim.interpolate({
                inputRange: [0, 0.4, 1],
                outputRange: [0.3, 1.2, 0.6],
              });

              return (
                <Animated.View
                  key={p.id}
                  style={[
                    s.confettiParticle,
                    {
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                      borderRadius: p.size > 8 ? 2 : p.size / 2,
                      transform: [{ translateX }, { translateY }, { scale }, { rotate: p.rot }],
                      opacity,
                    },
                  ]}
                />
              );
            })}

            {/* Main Animated Checkmark Circle */}
            <Animated.View style={{ transform: [{ scale: tickScale }] }}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.badge}
              >
                <Ionicons name="checkmark-sharp" size={42} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Title & Amount */}
          <Text style={[s.title, { color: textPrimary }]}>Payment Recorded!</Text>
          <Text style={[s.amount, { color: textPrimary }]}>{INR(amount)}</Text>

          {/* Banking / Paid To Subtitle */}
          {payerName && (
            <View style={s.paidToRow}>
              <Ionicons name="checkmark-circle" size={15} color="#10B981" />
              <Text style={[s.paidToText, { color: textMuted }]}>
                {bankingName ? `Banking name: ${bankingName}` : `Received from ${payerName}`}
              </Text>
            </View>
          )}

          {/* Status Chip */}
          {cleared ? (
            <View style={s.clearedChip}>
              <Ionicons name="shield-checkmark" size={14} color="#047857" />
              <Text style={s.clearedChipText}>Dues Fully Cleared</Text>
            </View>
          ) : typeof remainingBalance === 'number' && remainingBalance > 0 ? (
            <View style={s.pendingChip}>
              <Ionicons name="time-outline" size={14} color="#B45309" />
              <Text style={s.pendingChipText}>{INR(remainingBalance)} still pending</Text>
            </View>
          ) : null}

          {/* Details Card */}
          {detailRows.length > 0 && (
            <View style={[s.detailsCard, { backgroundColor: cardBg, borderColor: divider }]}>
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

          {/* Action Buttons */}
          <View style={s.actions}>
            {onViewReceipt ? (
              <Pressable style={s.primaryBtn} onPress={onViewReceipt} accessibilityRole="button">
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.primaryBtnGrad}
                >
                  <Ionicons name="document-text-outline" size={18} color="#FFF" />
                  <Text style={s.primaryBtnText}>View Receipt</Text>
                </LinearGradient>
              </Pressable>
            ) : onGoToPassbook ? (
              <Pressable style={s.primaryBtn} onPress={onGoToPassbook} accessibilityRole="button">
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.primaryBtnGrad}
                >
                  <Ionicons name="wallet-outline" size={18} color="#FFF" />
                  <Text style={s.primaryBtnText}>Go to Passbook</Text>
                </LinearGradient>
              </Pressable>
            ) : null}

            <Pressable
              style={[s.secondaryBtn, { borderColor: divider, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={[s.secondaryBtnText, { color: textPrimary }]}>Done</Text>
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
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    ...Platform.select({
      android: { elevation: 28 },
      ios: {
        shadowColor: '#000', shadowOpacity: 0.25,
        shadowRadius: 24, shadowOffset: { width: 0, height: -8 },
      },
    }),
  },
  grabber: { width: 44, height: 4, borderRadius: 2, marginBottom: 14 },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  ripple: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
  },
  confettiParticle: {
    position: 'absolute',
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 10,
    letterSpacing: -0.3,
  },
  amount: {
    fontSize: 36,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.6,
  },
  paidToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  paidToText: {
    fontSize: 13,
    fontWeight: '600',
  },
  clearedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 12,
  },
  clearedChipText: { color: '#047857', fontSize: 12.5, fontWeight: '700' },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 12,
  },
  pendingChipText: { color: '#B45309', fontSize: 12.5, fontWeight: '700' },
  detailsCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    marginTop: 18,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 13.5, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  actions: { width: '100%', marginTop: 20, gap: 10 },
  primaryBtn: { borderRadius: 16, overflow: 'hidden' },
  primaryBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15.5, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 14.5, fontWeight: '700' },
});

export default PaymentSuccessSheet;

