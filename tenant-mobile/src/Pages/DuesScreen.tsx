import React, { useCallback, useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, RefreshControl, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { SlidersHorizontal, AlertCircle, CheckCircle2, Clock, Wallet } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, font, shadow } from '../theme';
import { formatCurrency } from '../utils/format';
import { samplePayments } from '../data/tenantContent';

type TabKey = 'Dues' | 'Payment History';

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 2;

export default function DuesScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('Dues');

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  const handleTabPress = (tab: TabKey) => {
    setActiveTab(tab);
  };

  const amount = Number(user?.outstanding_due || 6500);
  const totalPaid = samplePayments
    .filter((p) => p.status === 'Paid')
    .reduce((s, p) => s + p.amount, 0);

  const upcomingDues = samplePayments.filter((p) => p.status === 'Pending');
  const pastDues = samplePayments.filter((p) => p.status === 'Paid');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── White Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dues & Payments</Text>
        <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
          <SlidersHorizontal size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* ── Total Outstanding Hero Card (Medium) ───────────────────────── */}
        <View style={styles.bannerCardMedium}>
          <Text style={styles.bannerLabelMedium}>Total Outstanding</Text>
          <Text style={styles.bannerAmountMedium}>{formatCurrency(amount)}</Text>
          {amount > 0 && (
            <View style={styles.pendingPillMedium}>
              <AlertCircle size={12} color={colors.danger} />
              <Text style={styles.pendingPillTextMedium}>Action Required</Text>
            </View>
          )}
        </View>

        {/* ── Tab Toggle (Border Boxes) ─────────────────────────────── */}
        <View style={styles.tabRowFull}>
          {(['Dues', 'Payment History'] as TabKey[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabFull, activeTab === tab && styles.tabActiveFull]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabTextFull, activeTab === tab && styles.tabTextActiveFull]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab Content ────────────────────────────────────────────────────────── */}
        {activeTab === 'Dues' ? (
          <>
            <Text style={styles.groupLabel}>Upcoming Due</Text>
            {upcomingDues.map((due) => (
              <View key={due.id} style={styles.smallCard}>
                <View style={styles.smallCardTop}>
                  <View style={styles.smallCardInfo}>
                    <Text style={styles.smallCardMonth}>{due.month}</Text>
                    <Text style={styles.smallCardSub}>Due on {due.dueDate} · Rent</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.smallCardAmount}>{formatCurrency(due.amount)}</Text>
                    <TouchableOpacity
                      style={styles.payNowBtnTiny}
                      onPress={() => navigation.navigate('Payments')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.payNowTextTiny}>Pay Now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {pastDues.length > 0 && <Text style={styles.groupLabel}>Recently Paid</Text>}
            {pastDues.slice(0, 2).map((due) => (
              <View key={due.id} style={styles.smallCard}>
                <View style={styles.smallCardTop}>
                  <View style={styles.smallCardInfo}>
                    <Text style={styles.smallCardMonth}>{due.month}</Text>
                    <Text style={styles.smallCardSub}>Paid on {due.paidOn}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.smallCardAmount}>{formatCurrency(due.amount)}</Text>
                    <View style={styles.paidPillLiteSmall}>
                      <Text style={styles.paidPillTextSmall}>Paid</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.groupLabel}>All Payments</Text>
            {samplePayments.map((p) => (
              <View key={p.id} style={styles.smallCard}>
                <View style={styles.smallCardTop}>
                  <View style={styles.smallCardInfo}>
                    <Text style={styles.smallCardMonth}>{p.month}</Text>
                    <Text style={styles.smallCardSub}>
                      {p.status === 'Paid' ? `Paid on ${p.paidOn} · ${p.method}` : `Due on ${p.dueDate}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.smallCardAmount}>{formatCurrency(p.amount)}</Text>
                    <View style={p.status === 'Paid' ? styles.paidPillLiteSmall : styles.pendingPillOrangeSmall}>
                      <Text style={p.status === 'Paid' ? styles.paidPillTextSmall : styles.pendingPillOrangeTextSmall}>
                        {p.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 120 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['2xl'],
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 64,
  },
  headerTitle: { fontSize: font.h2, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Banner Card Medium ──────────────────────────────────────────────────────
  bannerCardMedium: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing['2xl'],
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  bannerLabelMedium: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  bannerAmountMedium: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 12 },
  pendingPillMedium: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pendingPillTextMedium: { color: colors.danger, fontSize: 12, fontWeight: '700' },

  // ── Tabs (Border Boxes) ─────────────────────────────────────────────────────
  tabRowFull: {
    flexDirection: 'row',
    marginHorizontal: spacing['2xl'],
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tabFull: { 
    flex: 1, 
    paddingVertical: spacing.md, 
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  tabActiveFull: { 
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  tabTextFull: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActiveFull: { color: colors.primary, fontWeight: '700' },

  // ── List ────────────────────────────────────────────────────────────────────
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSubtle,
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },

  // ── Cards ───────────────────────────────────────────────────────────────────
  smallCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing['2xl'],
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  smallCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  smallCardInfo: { flex: 1 },
  smallCardMonth: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  smallCardSub: { fontSize: 11, color: colors.textMuted },
  smallCardAmount: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: 4 },
  
  payNowBtnTiny: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    ...shadow.raised,
  },
  payNowTextTiny: { color: '#fff', fontWeight: '700', fontSize: 12 },

  paidPillLiteSmall: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-end',
  },
  paidPillTextSmall: { color: colors.success, fontSize: 10, fontWeight: '700' },

  pendingPillOrangeSmall: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-end',
  },
  pendingPillOrangeTextSmall: { color: colors.warning, fontSize: 10, fontWeight: '700' },
});
