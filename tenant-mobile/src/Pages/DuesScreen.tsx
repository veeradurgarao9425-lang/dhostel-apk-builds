import React, { useCallback, useState } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView,
  RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  SlidersHorizontal, AlertCircle, CheckCircle2, Clock,
  Wallet, CreditCard, ArrowLeft,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, font, shadow } from '../theme';
import { formatCurrency } from '../utils/format';
import { samplePayments } from '../data/tenantContent';

type TabKey = 'Dues' | 'Payment History';

const { width } = Dimensions.get('window');

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

  const amount = Number(user?.outstanding_due || 6500);
  const totalPaid = samplePayments
    .filter((p) => p.status === 'Paid')
    .reduce((s, p) => s + p.amount, 0);
  const monthsDue = samplePayments.filter((p) => p.status === 'Pending').length;

  const upcomingDues = samplePayments.filter((p) => p.status === 'Pending');
  const pastDues = samplePayments.filter((p) => p.status === 'Paid');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Premium Gradient Header ─────────────────────────────────────── */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Abstract circles */}
        <View style={styles.hCircle1} />
        <View style={styles.hCircle2} />

        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>Dues & Payments</Text>
            <Text style={styles.headerTitle}>Your Balance</Text>
          </View>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.75}>
            <SlidersHorizontal size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 3-metric summary */}
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{formatCurrency(amount)}</Text>
            <Text style={styles.metricLabel}>Current Due</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{monthsDue}</Text>
            <Text style={styles.metricLabel}>Months Due</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{formatCurrency(totalPaid)}</Text>
            <Text style={styles.metricLabel}>Total Paid</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Tab Toggle ──────────────────────────────────────────────────── */}
      <View style={styles.tabContainer}>
        <View style={styles.tabRow}>
          {(['Dues', 'Payment History'] as TabKey[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {activeTab === 'Dues' ? (
          <>
            {upcomingDues.length > 0 && (
              <>
                <Text style={styles.groupLabel}>Upcoming Dues</Text>
                <View style={styles.listCard}>
                  {upcomingDues.map((due, i) => (
                    <View
                      key={due.id}
                      style={[styles.listRow, i < upcomingDues.length - 1 && styles.listRowDivider]}
                    >
                      <View style={styles.listIconWrap}>
                        <AlertCircle size={16} color={colors.danger} strokeWidth={1.5} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>{due.month}</Text>
                        <Text style={styles.listSub}>Due on {due.dueDate} · Rent</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <Text style={styles.listAmount}>{formatCurrency(due.amount)}</Text>
                        <TouchableOpacity
                          style={styles.payNowSmall}
                          onPress={() => navigation.navigate('Payments')}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.payNowSmallText}>Pay Now</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {pastDues.length > 0 && (
              <>
                <Text style={styles.groupLabel}>Recently Paid</Text>
                <View style={styles.listCard}>
                  {pastDues.slice(0, 3).map((due, i) => (
                    <View
                      key={due.id}
                      style={[styles.listRow, i < Math.min(pastDues.length, 3) - 1 && styles.listRowDivider]}
                    >
                      <View style={[styles.listIconWrap, { backgroundColor: colors.successSoft }]}>
                        <CheckCircle2 size={16} color={colors.success} strokeWidth={1.5} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>{due.month}</Text>
                        <Text style={styles.listSub}>Paid on {due.paidOn}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.listAmount}>{formatCurrency(due.amount)}</Text>
                        <View style={styles.paidPill}>
                          <Text style={styles.paidPillText}>Paid</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        ) : (
          <>
            <Text style={styles.groupLabel}>All Payments</Text>
            <View style={styles.listCard}>
              {samplePayments.map((p, i) => (
                <View
                  key={p.id}
                  style={[styles.listRow, i < samplePayments.length - 1 && styles.listRowDivider]}
                >
                  <View style={[
                    styles.listIconWrap,
                    p.status === 'Paid' ? { backgroundColor: colors.successSoft } : { backgroundColor: colors.dangerSoft },
                  ]}>
                    <CreditCard
                      size={16}
                      color={p.status === 'Paid' ? colors.success : colors.danger}
                      strokeWidth={1.5}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{p.month}</Text>
                    <Text style={styles.listSub}>
                      {p.status === 'Paid' ? `Paid on ${p.paidOn} · ${p.method}` : `Due on ${p.dueDate}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.listAmount}>{formatCurrency(p.amount)}</Text>
                    <View style={p.status === 'Paid' ? styles.paidPill : styles.pendingPill}>
                      <Text style={p.status === 'Paid' ? styles.paidPillText : styles.pendingPillText}>
                        {p.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Sticky Pay Now Button ────────────────────────────────────────── */}
      {amount > 0 && activeTab === 'Dues' && (
        <View style={styles.stickyFooter}>
          <TouchableOpacity
            style={styles.stickyBtn}
            onPress={() => navigation.navigate('Payments')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.stickyBtnGrad}
            >
              <Wallet size={20} color="#fff" />
              <Text style={styles.stickyBtnText}>Pay Now — {formatCurrency(amount)}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 140, paddingTop: 4 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  hCircle1: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -40, right: -20,
  },
  hCircle2: {
    position: 'absolute', width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 20, right: 60,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerEyebrow: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Metric row
  metricRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius['2xl'],
    padding: 16,
    gap: 0,
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  metricLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3, fontWeight: '500' },
  metricDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  tabActive: {
    backgroundColor: colors.surface,
    ...StyleSheet.flatten({
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    }),
  },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },

  // ── List Card ─────────────────────────────────────────────────────────────
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSubtle,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    marginHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 16,
  },
  listRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  listIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  listSub: { fontSize: 11, color: colors.textMuted },
  listAmount: { fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: -0.3, marginBottom: 4 },

  payNowSmall: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  payNowSmallText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  paidPill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  paidPillText: { color: colors.success, fontSize: 10, fontWeight: '700' },
  pendingPill: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  pendingPillText: { color: colors.warning, fontSize: 10, fontWeight: '700' },

  // ── Sticky footer ─────────────────────────────────────────────────────────
  stickyFooter: {
    position: 'absolute',
    bottom: 80,
    left: spacing.xl,
    right: spacing.xl,
    ...shadow.raised,
    borderRadius: radius.lg,
  },
  stickyBtn: { borderRadius: radius.lg, overflow: 'hidden' },
  stickyBtnGrad: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  stickyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
