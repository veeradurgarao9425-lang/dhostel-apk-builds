import React, { useCallback, useState } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView,
  RefreshControl, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  AlertCircle, CheckCircle2, Clock,
  Wallet, CreditCard, XCircle, RotateCcw,
  Bell, ArrowRight
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, font, shadow } from '../theme';
import { formatCurrency } from '../utils/format';
import api from '../services/api';

type TabKey = 'Dues' | 'Payment History';

type FeeRecord = {
  fee_id: number;
  fee_month: string;
  monthly_rent: number;
  total_due: number;
  paid_amount: number;
  balance: number;
  fee_status: 'Pending' | 'Partially Paid' | 'Fully Paid' | 'Overdue';
  due_date: string | null;
  payments: {
    payment_id: number;
    amount: number;
    payment_date: string;
    transaction_id?: string;
    receipt_number?: string;
    verification_status?: string;
    payment_mode?: string;
  }[];
};

function formatMonth(feeMonth: string): string {
  if (!feeMonth) return '';
  const [year, month] = feeMonth.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function formatDateStr(d: string | null): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  'Pending':       { color: colors.danger,  bg: colors.dangerSoft,  label: 'Pending' },
  'Partially Paid':{ color: colors.warning, bg: colors.warningSoft, label: 'Partial' },
  'Fully Paid':    { color: colors.success, bg: colors.successSoft, label: 'Paid' },
  'Overdue':       { color: colors.danger,  bg: colors.dangerSoft,  label: 'Overdue' },
};

export default function DuesScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('Dues');
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFees = async () => {
    try {
      setError(null);
      const res = await api.get('/fees/my-fees');
      if (res.data.success) {
        setFeeRecords(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch fees:', err);
      setError('Could not load fee history. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      fetchFees();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), fetchFees()]);
    setRefreshing(false);
  }, [refreshUser]);

  const outstandingDue = Number(user?.outstanding_due || 0);
  const isAllocated = !!user?.is_allocated;

  const pendingFees = feeRecords.filter(f => f.fee_status !== 'Fully Paid');
  const paidFees   = feeRecords.filter(f => f.fee_status === 'Fully Paid');
  const totalPaid  = paidFees.reduce((s, f) => s + f.paid_amount, 0);

  const firstName = (user?.name || "Tenant").split(" ")[0];
  const initials = (user?.name || "V")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── BLUE HEADER SECTION ── */}
      <View style={styles.headerSection}>
        <SafeAreaView
          edges={["top"]}
          style={{ backgroundColor: "transparent" }}
        >
          <View style={styles.headerTop}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.headerGreeting}>
                Hi, {firstName} <Text style={{ fontSize: 18 }}>👋</Text>
              </Text>
              <Text style={styles.headerSub}>Welcome Back!</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.hBtn}
                onPress={() => navigation.navigate("Notifications")}
              >
                <Bell size={24} color="#FFFFFF" strokeWidth={1.5} />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.hAvatar}
                onPress={() => navigation.navigate("Profile")}
              >
                <Text style={styles.hAvatarText}>{initials}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Total Due Overview Card ─────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.overviewCard}>
          <View style={styles.overviewLeft}>
            <Text style={styles.overviewLabel}>Total Due</Text>
            <Text style={styles.overviewAmount}>
              {formatCurrency(outstandingDue)}
            </Text>
            <Text style={styles.overviewDate}>
              Months Due: {pendingFees.length}
            </Text>

            <TouchableOpacity
              style={styles.overviewBtn}
              onPress={() => navigation.navigate("Payments")}
            >
              <Text style={styles.overviewBtnText}>Pay Now</Text>
              <ArrowRight size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.overviewRight}>
            <Image source={require('../../assets/wallet_3d.png')} style={styles.walletImg} resizeMode="contain" />
          </View>
        </View>
      </View>

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
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading your fee records…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorWrap}>
            <XCircle size={32} color={colors.danger} strokeWidth={1.5} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchFees}>
              <RotateCcw size={14} color={colors.primary} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !isAllocated ? (
          <View style={styles.emptyWrap}>
            <Clock size={36} color={colors.textSubtle} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Room Not Assigned Yet</Text>
            <Text style={styles.emptyBody}>
              Fee records will appear here once the owner activates your account and assigns a room.
            </Text>
          </View>
        ) : feeRecords.length === 0 ? (
          <View style={styles.emptyWrap}>
            <CheckCircle2 size={36} color={colors.success} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No Fee Records Yet</Text>
            <Text style={styles.emptyBody}>
              Your monthly rent records will appear here once generated by the owner.
            </Text>
          </View>
        ) : activeTab === 'Dues' ? (
          <>
            {pendingFees.length > 0 && (
              <>
                <Text style={styles.groupLabel}>Pending Dues</Text>
                <View style={styles.listCard}>
                  {pendingFees.map((fee, i) => {
                    const cfg = statusConfig[fee.fee_status] || statusConfig['Pending'];
                    return (
                      <View
                        key={fee.fee_id}
                        style={[styles.listRow, i < pendingFees.length - 1 && styles.listRowDivider]}
                      >
                        <View style={[styles.listIconWrap, { backgroundColor: cfg.bg }]}>
                          <AlertCircle size={16} color={cfg.color} strokeWidth={1.5} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.listTitle}>{formatMonth(fee.fee_month)}</Text>
                          <Text style={styles.listSub}>
                            {fee.due_date ? `Due: ${formatDateStr(fee.due_date)}` : 'Rent Due'}
                          </Text>
                          {fee.paid_amount > 0 && (
                            <Text style={[styles.listSub, { color: colors.success }]}>
                              Partial paid: {formatCurrency(fee.paid_amount)}
                            </Text>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <Text style={styles.listAmount}>{formatCurrency(fee.balance)}</Text>
                          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.payNowSmall}
                            onPress={() => navigation.navigate('Payments')}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.payNowSmallText}>Pay Now</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {paidFees.length > 0 && (
              <>
                <Text style={styles.groupLabel}>Recently Paid</Text>
                <View style={styles.listCard}>
                  {paidFees.slice(0, 3).map((fee, i) => (
                    <View
                      key={fee.fee_id}
                      style={[styles.listRow, i < Math.min(paidFees.length, 3) - 1 && styles.listRowDivider]}
                    >
                      <View style={[styles.listIconWrap, { backgroundColor: colors.successSoft }]}>
                        <CheckCircle2 size={16} color={colors.success} strokeWidth={1.5} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listTitle}>{formatMonth(fee.fee_month)}</Text>
                        {fee.payments[0] && (
                          <Text style={styles.listSub}>
                            Paid on {formatDateStr(fee.payments[0].payment_date)}
                            {fee.payments[0].payment_mode ? ` · ${fee.payments[0].payment_mode}` : ''}
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.listAmount}>{formatCurrency(fee.paid_amount)}</Text>
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
            <Text style={styles.groupLabel}>All Months</Text>
            <View style={styles.listCard}>
              {feeRecords.map((fee, i) => {
                const cfg = statusConfig[fee.fee_status] || statusConfig['Pending'];
                return (
                  <View
                    key={fee.fee_id}
                    style={[styles.listRow, i < feeRecords.length - 1 && styles.listRowDivider]}
                  >
                    <View style={[styles.listIconWrap, { backgroundColor: cfg.bg }]}>
                      <CreditCard size={16} color={cfg.color} strokeWidth={1.5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle}>{formatMonth(fee.fee_month)}</Text>
                      <Text style={styles.listSub}>
                        {fee.fee_status === 'Fully Paid' && fee.payments[0]
                          ? `Paid on ${formatDateStr(fee.payments[0].payment_date)}`
                          : fee.due_date
                            ? `Due: ${formatDateStr(fee.due_date)}`
                            : fee.fee_status}
                      </Text>
                      {fee.payments[0]?.verification_status === 'Pending' && (
                        <Text style={[styles.listSub, { color: colors.warning }]}>
                          ⏳ Proof submitted — awaiting verification
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.listAmount}>{formatCurrency(fee.total_due)}</Text>
                      <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Sticky Pay Now Button ────────────────────────────────────────── */}
      {outstandingDue > 0 && isAllocated && activeTab === 'Dues' && (
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
              <Text style={styles.stickyBtnText}>Pay Now — {formatCurrency(outstandingDue)}</Text>
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

  headerSection: { backgroundColor: '#2245D4', paddingBottom: 16 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  hAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  hAvatarText: { color: '#FFFFFF', fontWeight: "700", fontSize: 16 },
  headerGreeting: { fontSize: 18, fontWeight: "700", color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center" },
  hBtn: {
    padding: 8,
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: '#2245D4',
  },

  section: { paddingHorizontal: 20, marginTop: 16, marginBottom: 16 },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  overviewLeft: { flex: 1 },
  overviewLabel: {
    fontSize: 13,
    color: colors.textSubtle,
    fontWeight: "500",
    marginBottom: 8,
  },
  overviewAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#E11D48",
    marginBottom: 8,
  },
  overviewDate: { fontSize: 12, color: colors.textSubtle, marginBottom: 16 },
  overviewBtn: {
    backgroundColor: '#2245D4',
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  overviewBtnText: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  overviewRight: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  walletImg: {
    width: 110,
    height: 110,
    position: "absolute",
    right: -10,
    bottom: -10,
  },

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

  // ── States ─────────────────────────────────────────────────────────────────
  loadingWrap: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  loadingText: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
  errorWrap: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  errorText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: colors.primarySoft, borderRadius: radius.pill },
  retryText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: spacing.md, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

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
  listSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  listAmount: { fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: -0.3, marginBottom: 4 },

  payNowSmall: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  payNowSmallText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  paidPill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  paidPillText: { color: colors.success, fontSize: 10, fontWeight: '700' },

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
