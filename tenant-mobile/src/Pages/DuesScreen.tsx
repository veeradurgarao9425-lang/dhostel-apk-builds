import React, { useCallback, useState } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView,
  RefreshControl, ActivityIndicator, Image, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  AlertCircle, CheckCircle2, Clock,
  Wallet, CreditCard, XCircle, RotateCcw,
  Bell, ArrowRight, Plus,
} from 'lucide-react-native';

import { Phase3EmptyState, Phase3ErrorState } from '../components/UIComponents';
import { CustomMonthYearPicker } from '../components/pickers/CustomMonthYearPicker';
import { Calendar as CalendarIcon } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, shadow } from '../theme';
import { formatCurrency } from '../utils/format';
import api from '../services/api';

const BLUE      = '#2245D4';
const BLUE_DARK = '#1E3A8A';
const BLUE_SOFT = '#EEF2FF';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID  = '#666666';
const BORDER    = '#F1F5F9';
const BG        = '#FAFAFC';

type TabKey = 'This Month Details' | 'Payment History';

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
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function formatDateStr(d: string | null): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  'Pending':        { color: colors.danger,  bg: colors.dangerSoft,  label: 'Pending' },
  'Partially Paid': { color: colors.warning, bg: colors.warningSoft, label: 'Partial' },
  'Fully Paid':     { color: colors.success, bg: colors.successSoft, label: 'Paid' },
  'Overdue':        { color: colors.danger,  bg: colors.dangerSoft,  label: 'Overdue' },
};

export default function DuesScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing]   = useState(false);
  const [activeTab, setActiveTab]     = useState<TabKey>('This Month Details');
  const [feeRecords, setFeeRecords]   = useState<FeeRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showPicker, setShowPicker]   = useState(false);
  const [filterMonthYear, setFilterMonthYear] = useState<Date | null>(null);

  const fetchFees = async () => {
    try {
      setError(null);
      const res = await api.get('/fees/my-fees');
      if (res.data.success) setFeeRecords(res.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch fees:', err);
      setError('Could not load fee history. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => { refreshUser(); fetchFees(); }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), fetchFees()]);
    setRefreshing(false);
  }, [refreshUser]);

  const outstandingDue = Number(user?.outstanding_due || 0);
  const isAllocated    = !!user?.is_allocated;
  const pendingFees    = feeRecords.filter(f => f.fee_status !== 'Fully Paid');
  const paidFees       = feeRecords.filter(f => f.fee_status === 'Fully Paid');
  
  const currentDate = new Date();
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthFee = feeRecords.find(f => f.fee_month === currentMonthStr);
  const thisMonthDue = thisMonthFee ? thisMonthFee.balance : 0;
  const thisMonthAmountDisplay = thisMonthDue > 0 ? thisMonthDue : (thisMonthFee?.total_due || user?.monthly_rent || 0);
  
  const totalPaidAmount = feeRecords.reduce((sum, f) => sum + (Number(f.paid_amount) || 0), 0);
  
  const filteredHistory = filterMonthYear
    ? feeRecords.filter(f => {
        const [y, m] = f.fee_month.split('-');
        return parseInt(y) === filterMonthYear.getFullYear() && parseInt(m) === filterMonthYear.getMonth() + 1;
      })
    : feeRecords;

  const firstName = (user?.name || 'Tenant').split(' ')[0];
  const initials  = (user?.name || 'V')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      {/* ── BLUE HEADER ── */}
      <View style={styles.headerSection}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.headerGreeting}>My Dues</Text>
              <Text style={styles.headerSub}>Manage your monthly rent and fees</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.hBtn} onPress={() => navigation.navigate('Notifications')}>
                <Bell size={24} color={WHITE} strokeWidth={1.5} />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.hAvatar} onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.hAvatarText}>{initials}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Mini Cards ── */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={[styles.overviewCard, { flex: 1, padding: 16, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={[styles.overviewLabel, { color: TEXT_MID }]}>This Month</Text>
            <Text style={[styles.overviewAmount, { color: !thisMonthFee ? TEXT_MID : (thisMonthDue > 0 ? colors.danger : colors.success), fontSize: 24, marginVertical: 4 }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(thisMonthAmountDisplay)}</Text>
            {!thisMonthFee ? (
              <Text style={{ color: TEXT_MID, fontSize: 12, fontWeight: '600' }}>No dues yet</Text>
            ) : thisMonthDue > 0 ? (
              <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>Unpaid</Text>
            ) : (
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>Paid</Text>
            )}
          </View>
          <View style={[styles.overviewCard, { flex: 1, padding: 16, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={[styles.overviewLabel, { color: TEXT_MID }]}>{outstandingDue > 0 ? 'Total Pending' : 'Total Paid'}</Text>
            <Text style={[styles.overviewAmount, { color: outstandingDue > 0 ? colors.danger : colors.success, fontSize: 24, marginVertical: 4 }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(outstandingDue > 0 ? outstandingDue : totalPaidAmount)}</Text>
            {outstandingDue > 0 ? (
              <TouchableOpacity onPress={() => navigation.navigate('Payments')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>Pay Now &rarr;</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>Up to date</Text>
            )}
          </View>
        </View>
      </View>

      {/* ── Tab Toggle ── */}
      <View style={styles.tabContainer}>
        <View style={styles.tabRow}>
          {(['This Month Details', 'Payment History'] as TabKey[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} colors={[BLUE]} />}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={BLUE} size="large" />
            <Text style={styles.loadingText}>Loading your fee records…</Text>
          </View>
        ) : error ? (
          <View style={{ marginTop: 60 }}>
            <Phase3ErrorState variant="server" onAction={fetchFees} />
          </View>
        ) : !isAllocated ? (
          <View style={styles.emptyWrap}>
            <Clock size={36} color={colors.textSubtle} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Room Not Assigned Yet</Text>
            <Text style={styles.emptyBody}>Fee records will appear here once the owner activates your account and assigns a room.</Text>
          </View>
        ) : feeRecords.length === 0 ? (
          <View style={{ marginTop: 60 }}>
            <Phase3EmptyState variant="dues" onAction={() => setActiveTab('Payment History')} />
          </View>
        ) : activeTab === 'This Month Details' ? (
          <View style={{ paddingBottom: 20 }}>
            {thisMonthFee && thisMonthFee.balance <= 0 && thisMonthFee.paid_amount > 0 && (
              <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
                <View style={[styles.listCard, { marginTop: 0 }]}>
                  <Text style={[styles.groupLabel, { paddingHorizontal: 0 }]}>This Month's Payment</Text>
                  <View style={[styles.listRow, { borderBottomWidth: 0, paddingHorizontal: 0 }]}>
                    <View style={[styles.listIconWrap, { backgroundColor: colors.successSoft }]}>
                      <CheckCircle2 size={16} color={colors.success} strokeWidth={1.5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle}>Rent Paid for {formatMonth(thisMonthFee.fee_month)}</Text>
                      <Text style={styles.listSub}>{thisMonthFee.payments && thisMonthFee.payments[0] ? `Paid on ${formatDateStr(thisMonthFee.payments[0].payment_date)}` : 'Paid successfully'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={[styles.listAmount, { color: colors.success }]}>{formatCurrency(thisMonthFee.paid_amount || thisMonthFee.total_due)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {pendingFees.length > 0 ? (
              <>
                <Text style={styles.groupLabel}>Pending Dues</Text>
                <View style={styles.listCard}>
                  {pendingFees.map((fee, i) => {
                    const cfg = statusConfig[fee.fee_status] || statusConfig['Pending'];
                    return (
                      <View key={fee.fee_id} style={[styles.listRow, i < pendingFees.length - 1 && styles.listRowDivider]}>
                        <View style={[styles.listIconWrap, { backgroundColor: cfg.bg }]}>
                          <AlertCircle size={16} color={cfg.color} strokeWidth={1.5} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.listTitle}>{formatMonth(fee.fee_month)}</Text>
                          <Text style={styles.listSub}>{fee.due_date ? `Due: ${formatDateStr(fee.due_date)}` : 'Rent Due'}</Text>
                          {fee.paid_amount > 0 && (
                            <Text style={[styles.listSub, { color: colors.success }]}>
                              Partial paid: {formatCurrency(fee.paid_amount)}
                              {fee.payments && fee.payments[0] ? ` on ${formatDateStr(fee.payments[0].payment_date)}` : ''}
                            </Text>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <Text style={styles.listAmount}>{formatCurrency(fee.balance)}</Text>
                          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                          <TouchableOpacity style={styles.payNowSmall} onPress={() => navigation.navigate('Payments')} activeOpacity={0.85}>
                            <Text style={styles.payNowSmallText}>Pay Now</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (!thisMonthFee || thisMonthFee.balance > 0) ? (
              <View style={{ marginTop: 20, marginBottom: 20, paddingHorizontal: 20 }}>
                <Phase3EmptyState variant="dues" onAction={() => setActiveTab('Payment History')} />
              </View>
            ) : null}
            {paidFees.length > 0 && (
              <>
                <Text style={styles.groupLabel}>Recently Paid</Text>
                <View style={styles.listCard}>
                  {paidFees.slice(0, 3).map((fee, i) => (
                    <View key={fee.fee_id} style={[styles.listRow, i < Math.min(paidFees.length, 3) - 1 && styles.listRowDivider]}>
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
                        <View style={styles.paidPill}><Text style={styles.paidPillText}>Paid</Text></View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={{ paddingBottom: 20 }}>
            {/* Summary chips */}
            <View style={styles.tlSummaryRow}>
              <View style={styles.tlSummaryChip}>
                <Text style={styles.tlSummaryChipLabel}>Total Records</Text>
                <Text style={styles.tlSummaryChipValue}>{feeRecords.length}</Text>
              </View>
              <View style={[styles.tlSummaryChip, { borderColor: colors.success }]}>
                <Text style={[styles.tlSummaryChipLabel, { color: colors.success }]}>Total Paid</Text>
                <Text style={[styles.tlSummaryChipValue, { color: colors.success }]}>{formatCurrency(totalPaidAmount)}</Text>
              </View>
            </View>

            {/* Filter */}
            <View style={[styles.tlFilterRow, { paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK }}>Payment History</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {filterMonthYear && (
                  <TouchableOpacity onPress={() => setFilterMonthYear(null)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FEE2E2', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Clear</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowPicker(true)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: BLUE_SOFT, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CalendarIcon size={14} color={BLUE} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: BLUE }}>
                    {filterMonthYear ? `${filterMonthYear.toLocaleString('default', { month: 'short' })} ${filterMonthYear.getFullYear()}` : 'Filter by Month'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Timeline */}
            {filteredHistory.length > 0 ? (
              <View style={styles.tlContainer}>
                {filteredHistory.map((fee, i) => {
                  const cfg = statusConfig[fee.fee_status] || statusConfig['Pending'];
                  const isFirst = i === 0;
                  const isLast  = i === filteredHistory.length - 1;
                  const isPaid  = fee.fee_status === 'Fully Paid';
                  const dateLabel = isPaid && fee.payments[0]
                    ? `Paid on ${formatDateStr(fee.payments[0].payment_date)}`
                    : fee.due_date
                    ? `Due: ${formatDateStr(fee.due_date)}`
                    : fee.fee_status;
                  const awaitingVerification = fee.payments[0]?.verification_status === 'Pending';

                  return (
                    <View key={fee.fee_id} style={styles.tlRow}>
                      {/* Left: line + dot */}
                      <View style={styles.tlLineCol}>
                        {/* Top segment of line (hidden for first item) */}
                        <View style={[styles.tlLineSegment, isFirst && { backgroundColor: 'transparent' }]} />
                        {/* Dot */}
                        <View style={[styles.tlDot, { backgroundColor: cfg.color, borderColor: cfg.bg }]} />
                        {/* Bottom segment of line (hidden for last item) */}
                        <View style={[styles.tlLineSegment, isLast && { backgroundColor: 'transparent' }]} />
                      </View>

                      {/* Right: card */}
                      <View style={styles.tlCard}>
                        {/* Top row: month + status badge */}
                        <View style={styles.tlCardTopRow}>
                          <Text style={styles.tlCardMonth}>{formatMonth(fee.fee_month)}</Text>
                          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                        </View>

                        {/* Middle row: amount */}
                        <Text style={[styles.tlCardAmount, { color: isPaid ? colors.success : cfg.color }]}>
                          {formatCurrency(isPaid ? fee.paid_amount : fee.balance > 0 ? fee.balance : fee.total_due)}
                        </Text>

                        {/* Bottom row: date */}
                        <Text style={styles.tlCardDate}>{dateLabel}</Text>

                        {/* Verification pending note */}
                        {awaitingVerification && (
                          <Text style={[styles.tlCardDate, { color: colors.warning, marginTop: 4 }]}>
                            Proof submitted — awaiting verification
                          </Text>
                        )}

                        {/* Pay Now link for non-paid */}
                        {!isPaid && (
                          <TouchableOpacity
                            onPress={() => navigation.navigate('Payments')}
                            activeOpacity={0.7}
                            style={styles.tlPayNow}
                          >
                            <Text style={styles.tlPayNowText}>Pay Now  →</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: TEXT_MID, fontSize: 14 }}>No records found for this year.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky Pay Now ── */}
      {outstandingDue > 0 && isAllocated && activeTab === 'This Month Details' && (
        <View style={styles.stickyFooter}>
          <TouchableOpacity style={styles.stickyBtn} onPress={() => navigation.navigate('Payments')} activeOpacity={0.88}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.stickyBtnGrad}
            >
              <Wallet size={20} color={WHITE} />
              <Text style={styles.stickyBtnText}>Pay Now — {formatCurrency(outstandingDue)}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <CustomMonthYearPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onConfirm={(d) => setFilterMonthYear(d)}
        initialDate={filterMonthYear || new Date()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: BG },
  headerSection: { backgroundColor: BLUE, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  hAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  hAvatarText:    { color: WHITE, fontWeight: '700', fontSize: 16 },
  headerGreeting: { fontSize: 18, fontWeight: '700', color: WHITE },
  headerSub:      { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerRight:    { flexDirection: 'row', alignItems: 'center' },
  hBtn:           { padding: 8, position: 'relative' },
  notificationDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: BLUE },

  section:       { paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },
  overviewCard: { backgroundColor: WHITE, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  overviewLeft:   { flex: 1 },
  overviewLabel:  { fontSize: 13, color: TEXT_MID, fontWeight: '500', marginBottom: 8 },
  overviewAmount: { fontSize: 28, fontWeight: '800', color: '#E11D48', marginBottom: 8 },
  overviewDate:   { fontSize: 12, color: TEXT_MID, marginBottom: 16 },
  overviewBtn:    { backgroundColor: BLUE, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  overviewBtnText:{ color: WHITE, fontSize: 13, fontWeight: '600' },
  overviewRight:  { width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  walletImg:      { width: 110, height: 110, position: 'absolute', right: -10, bottom: -10 },

  tabContainer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: BG },
  tabRow:       { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: 4 },
  tab:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md },
  tabActive:    { backgroundColor: WHITE, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  tabText:      { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive:{ color: BLUE, fontWeight: '700' },

  scrollContent: { paddingBottom: 180 },
  loadingWrap:   { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  loadingText:   { fontSize: 14, color: TEXT_MID, marginTop: 8 },
  errorWrap:     { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  errorText:     { fontSize: 14, color: TEXT_MID, textAlign: 'center', paddingHorizontal: 40 },
  retryBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: BLUE_SOFT, borderRadius: radius.pill },
  retryText:     { color: BLUE, fontWeight: '700', fontSize: 13 },
  emptyWrap:     { alignItems: 'center', paddingTop: 80, gap: spacing.md, paddingHorizontal: 40 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: TEXT_DARK, textAlign: 'center' },
  emptyBody:     { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 20 },

  groupLabel: { fontSize: 11, fontWeight: '700', color: colors.textSubtle, paddingHorizontal: spacing.xl, marginBottom: spacing.md, marginTop: spacing.lg, letterSpacing: 0.8, textTransform: 'uppercase' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: BG, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: BLUE, borderColor: BLUE },
  filterChipText: { fontSize: 12, fontWeight: '600', color: TEXT_MID },
  filterChipTextActive: { color: WHITE },
  listCard:   { backgroundColor: WHITE, borderRadius: radius['2xl'], marginHorizontal: spacing.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card },
  listRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: 16 },
  listRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  listIconWrap:   { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listTitle:  { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  listSub:    { fontSize: 11, color: TEXT_MID, marginTop: 2 },
  listAmount: { fontSize: 15, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.3, marginBottom: 4 },

  payNowSmall:     { backgroundColor: BLUE, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 6 },
  payNowSmallText: { color: WHITE, fontWeight: '700', fontSize: 12 },
  statusPill:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  statusPillText:  { fontSize: 10, fontWeight: '700' },
  paidPill:        { backgroundColor: colors.successSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  paidPillText:    { color: colors.success, fontSize: 10, fontWeight: '700' },

  stickyFooter: { position: 'absolute', bottom: 90, left: spacing.xl, right: spacing.xl, ...shadow.raised, borderRadius: radius.lg },
  stickyBtn:    { borderRadius: radius.lg, overflow: 'hidden' },
  stickyBtnGrad:{ height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.lg },
  stickyBtnText:{ color: WHITE, fontWeight: '700', fontSize: 16 },

  fab: { position: 'absolute', bottom: 160, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', shadowColor: BLUE_DARK, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },

  // ── Timeline styles ──
  tlSummaryRow:       { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.xl, marginTop: spacing.lg, marginBottom: spacing.sm },
  tlSummaryChip:      { flex: 1, backgroundColor: WHITE, borderRadius: radius.lg, borderWidth: 1.5, borderColor: BLUE, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  tlSummaryChipLabel: { fontSize: 11, fontWeight: '600', color: BLUE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  tlSummaryChipValue: { fontSize: 18, fontWeight: '800', color: BLUE },

  tlFilterRow:  { paddingVertical: spacing.sm, marginBottom: spacing.sm },

  tlContainer:  { paddingHorizontal: spacing.xl, paddingTop: 4 },
  tlRow:        { flexDirection: 'row', alignItems: 'stretch', marginBottom: 4 },

  tlLineCol:    { width: 28, alignItems: 'center', flexShrink: 0 },
  tlLineSegment:{ flex: 1, width: 2, backgroundColor: BLUE, opacity: 0.25 },
  tlDot:        { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, marginVertical: 2, flexShrink: 0 },

  tlCard:       { flex: 1, backgroundColor: WHITE, borderRadius: radius.xl, borderWidth: 1, borderColor: BORDER, marginLeft: 12, marginBottom: 12, padding: 14, ...shadow.card },
  tlCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  tlCardMonth:  { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  tlCardAmount: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  tlCardDate:   { fontSize: 11, color: TEXT_MID, fontWeight: '500' },

  tlPayNow:     { alignSelf: 'flex-start', marginTop: 10 },
  tlPayNowText: { fontSize: 12, fontWeight: '700', color: BLUE },
});
