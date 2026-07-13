import React, { useCallback, useState, useEffect } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView,
  RefreshControl, ActivityIndicator, StatusBar, LayoutAnimation, Platform, UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  AlertCircle, CheckCircle2, Clock, Check,
  CreditCard, ArrowRight,
  Bell, TrendingUp, ShieldCheck, Calendar,
  Banknote, Receipt, ArrowUpRight, ArrowDownLeft,
} from 'lucide-react-native';

import { Phase3EmptyState, Phase3ErrorState } from '../components/UIComponents';
import { CustomMonthYearPicker } from '../components/pickers/CustomMonthYearPicker';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, shadow } from '../theme';
import { formatCurrency } from '../utils/format';
import api from '../services/api';
import AppHeader from '../components/ui/AppHeader';
import { QuickTips } from '../components/dashboard/QuickTips';

const BLUE      = colors.primary;       // #6D4AFF — brand purple
const BLUE_DARK = colors.primaryDark;   // #5B39E0
const BLUE_SOFT = colors.primarySoft;   // #F4F1FF
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID  = '#666666';
const TEXT_LIGHT = '#9CA3AF';
const BORDER    = '#F1F5F9';
const BG        = '#FFFFFF';

type TabKey = 'This Month' | 'Payment History';

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

/** Returns a short day-month label like "05 Jul" */
function formatShortDate(d: string | null): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch { return d || ''; }
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  'Pending':        { color: colors.danger,  bg: colors.dangerSoft,  label: 'Pending' },
  'Partially Paid': { color: colors.warning, bg: colors.warningSoft, label: 'Partial' },
  'Fully Paid':     { color: colors.success, bg: colors.successSoft, label: 'Paid' },
  'Overdue':        { color: colors.danger,  bg: colors.dangerSoft,  label: 'Overdue' },
};

// Payment mode icon/color mapping (GPay / PhonePe / Paytm style)
const modeStyle: Record<string, { color: string; bg: string; label: string }> = {
  'upi':         { color: '#5F35B8', bg: '#EDE9FE', label: 'UPI' },
  'gpay':        { color: '#34A853', bg: '#E8F5E9', label: 'Google Pay' },
  'phonepay':    { color: '#5F35B8', bg: '#EDE9FE', label: 'PhonePe' },
  'paytm':       { color: '#00BAF2', bg: '#E0F7FA', label: 'Paytm' },
  'cash':        { color: '#F59E0B', bg: '#FEF3C7', label: 'Cash' },
  'bank':        { color: '#3B82F6', bg: '#DBEAFE', label: 'Bank Transfer' },
  'online':      { color: '#2245D4', bg: '#EEF2FF', label: 'Online' },
  'default':     { color: '#6B7280', bg: '#F3F4F6', label: 'Payment' },
};

function getModeStyle(mode?: string) {
  if (!mode) return modeStyle['default'];
  const key = mode.toLowerCase().replace(/\s/g, '');
  return modeStyle[key] || modeStyle['default'];
}

const PAYMENT_TIPS = [
  { id: '1', icon: 'calendar', title: 'Avoid Late Fees', desc: 'Pay before the due date to avoid late fees.', colors: ['#F8FAFC', '#EEF2FF'], iconColor: '#2952F3' },
  { id: '2', icon: 'receipt',  title: 'Keep Records', desc: 'Always save your transactions for your personal records.', colors: ['#F8FAFC', '#EEF2FF'], iconColor: '#2952F3' },
  { id: '3', icon: 'shield-checkmark', title: 'Instant Confirm', desc: 'Use UPI or net banking for instant payment confirmation.', colors: ['#F8FAFC', '#EEF2FF'], iconColor: '#2952F3' },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function DuesScreen({ route, navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing]   = useState(false);
  const [activeTab, setActiveTab]     = useState<TabKey>(route?.params?.initialTab || 'This Month');
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

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

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

  const totalPaidAmount = feeRecords.reduce((sum, f) => sum + (Number(f.paid_amount) || 0), 0);

  // Hero card logic: single pending → merged; multiple → split
  const singlePendingMode = pendingFees.length === 1;
  const allPaid           = pendingFees.length === 0 && paidFees.length > 0;

  // Payment History: all individual payment transactions from all fee records
  const allPayments = feeRecords
    .flatMap(fee =>
      (fee.payments || []).map(p => ({
        ...p,
        fee_month: fee.fee_month,
        fee_status: fee.fee_status,
        total_due: fee.total_due,
      }))
    )
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  const filteredHistory = filterMonthYear
    ? feeRecords.filter(f => {
        const [y, m] = f.fee_month.split('-');
        return parseInt(y) === filterMonthYear.getFullYear() && parseInt(m) === filterMonthYear.getMonth() + 1;
      })
    : feeRecords;

  // For GPay-style tab: group by month label
  const filteredPayments = filterMonthYear
    ? allPayments.filter(p => {
        const d = new Date(p.payment_date);
        return d.getFullYear() === filterMonthYear.getFullYear() && d.getMonth() === filterMonthYear.getMonth();
      })
    : allPayments;

  const initials  = (user?.name || 'V')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // ── Hero Card ────────────────────────────────────────────────────────────
  const renderHeroSection = () => {
    if (feeRecords.length === 0) {
      return (
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={{ borderRadius: 24, marginHorizontal: 20, marginTop: 16, marginBottom: 4, padding: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#2952F3', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4, flexDirection: 'row', alignItems: 'center' }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={28} color="#2952F3" strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 }}>No Dues Yet</Text>
            <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>Your rent and fees will appear here.</Text>
          </View>
        </LinearGradient>
      );
    }

    if (allPaid) {
      return (
        <LinearGradient
          colors={['#F0FDF4', '#DCFCE7']}
          style={{ borderRadius: 24, marginHorizontal: 20, marginTop: 16, marginBottom: 4, padding: 24, borderWidth: 1, borderColor: '#BBF7D0', shadowColor: '#16A34A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4, flexDirection: 'row', alignItems: 'center' }}
        >
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#BBF7D0', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={30} color="#15803D" strokeWidth={3} />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#14532D', letterSpacing: -0.5, marginBottom: 4 }}>All Dues Cleared! 🎉</Text>
            <Text style={{ fontSize: 13, color: '#166534', fontWeight: '600' }}>You're completely up to date.</Text>
          </View>
        </LinearGradient>
      );
    }

    if (singlePendingMode && pendingFees[0]) {
      const fee = pendingFees[0];
      const cfg = statusConfig[fee.fee_status] || statusConfig['Pending'];
      const isCurrentMonth = fee.fee_month === currentMonthStr;
      return (
        <View style={styles.heroSingle}>
          <View style={styles.heroSingleTop}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.heroSingleLabel}>
                {isCurrentMonth ? "This Month's Due" : `Due \u2014 ${formatMonth(fee.fee_month)}`}
              </Text>
              {fee.due_date ? (
                <Text style={styles.heroSingleDate}>📅 Due by {formatDateStr(fee.due_date)}</Text>
              ) : null}
            </View>
            <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <View>
              <Text style={styles.heroSingleAmount}>{formatCurrency(fee.balance > 0 ? fee.balance : fee.total_due)}</Text>
              {fee.paid_amount > 0 && (
                <Text style={styles.heroSinglePartial}>
                  {formatCurrency(fee.paid_amount)} already paid
                </Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={{ backgroundColor: colors.danger, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }} 
              onPress={() => navigation.navigate('Payments')} 
              activeOpacity={0.85}
            >
              <Text style={{ color: WHITE, fontWeight: '800', fontSize: 13 }}>Pay Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Multiple pending months → split two cards
    return (
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 16, marginBottom: 4 }}>
        <View style={[styles.splitCard, { flex: 1 }]}>
          <Text style={styles.splitLabel}>This Month</Text>
          <Text style={[styles.splitAmount, {
            color: !thisMonthFee ? TEXT_MID : (thisMonthDue > 0 ? colors.danger : colors.success),
          }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(thisMonthDue > 0 ? thisMonthDue : (thisMonthFee?.total_due || user?.monthly_rent || 0))}
          </Text>
          <Text style={[styles.splitStatus, {
            color: !thisMonthFee ? TEXT_MID : thisMonthDue > 0 ? colors.danger : colors.success
          }]}>
            {!thisMonthFee ? 'No dues yet' : thisMonthDue > 0 ? 'Unpaid' : 'Paid'}
          </Text>
        </View>
        <View style={[styles.splitCard, { flex: 1 }]}>
          <Text style={styles.splitLabel}>Total Pending</Text>
          <Text style={[styles.splitAmount, { color: outstandingDue > 0 ? colors.danger : colors.success }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(outstandingDue > 0 ? outstandingDue : totalPaidAmount)}
          </Text>
          {outstandingDue > 0 ? (
            <TouchableOpacity
              style={[styles.payNowBtn, { marginTop: 4 }]}
              onPress={() => navigation.navigate('Payments')}
            >
              <Text style={styles.payNowBtnText}>Pay Now</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600', marginTop: 4 }}>Up to date</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── BLUE HEADER ── */}
      <AppHeader
        title="My Dues"
        subtitle="Manage your monthly rent and fees"
        showBack={false}
        rightComponent={
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity style={styles.hBtn} onPress={() => navigation.navigate('Notifications')}>
              <Bell size={22} color={WHITE} strokeWidth={1.5} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.hAvatar} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.hAvatarText}>{initials}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ── Hero (outside scroll) ── */}
      {loading ? (
        <View style={{ height: 160, backgroundColor: '#F1F5F9', borderRadius: 20, marginHorizontal: 20, marginTop: 16, marginBottom: 4, opacity: 0.6 }} />
      ) : (!error && isAllocated && renderHeroSection())}

      {/* ── Tab Toggle Outside Header ── */}
      {loading ? (
        <View style={[styles.tabContainer, { backgroundColor: 'transparent', marginTop: 16 }]}>
          <View style={{ height: 46, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 14, marginHorizontal: 20 }} />
        </View>
      ) : (
        <View style={[styles.tabContainer, { backgroundColor: 'transparent', marginTop: 16 }]}>
          <View style={[styles.tabRow, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
            {(['This Month', 'Payment History'] as TabKey[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setActiveTab(tab);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, { color: 'rgba(0,0,0,0.6)' }, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}


      {/* ── Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} colors={[BLUE]} />}
      >
        {loading ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            {/* List Item Skeletons */}
            <View style={{ height: 75, backgroundColor: '#E2E8F0', borderRadius: 16, marginBottom: 12, opacity: 0.6 }} />
            <View style={{ height: 75, backgroundColor: '#E2E8F0', borderRadius: 16, marginBottom: 12, opacity: 0.6 }} />
            <View style={{ height: 75, backgroundColor: '#E2E8F0', borderRadius: 16, opacity: 0.6 }} />
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
        ) : activeTab === 'This Month' ? (
          // ══════════════════════════════════════════════════════════════════
          // THIS MONTH TAB
          // ══════════════════════════════════════════════════════════════════
          <View style={{ paddingBottom: 24 }}>

            {/* Pending dues list — Shown only if multiple pending dues exist (otherwise Hero covers it) */}
            {pendingFees.length > 1 ? (
              <>
                <Text style={styles.groupLabel}>Pending Dues</Text>
                <View style={styles.listCard}>
                  {pendingFees.map((fee, i) => {
                    const cfg = statusConfig[fee.fee_status] || statusConfig['Pending'];
                    const isCurrentMonthFee = fee.fee_month === currentMonthStr;
                    // Show Pay Now for all items in split mode
                    const showItemPayBtn = true;
                    return (
                      <View
                        key={fee.fee_id}
                        style={[
                          styles.listRow,
                          i < pendingFees.length - 1 && styles.listRowDivider,
                          { alignItems: 'flex-start' },  // prevent overflow when sub text wraps
                        ]}
                      >
                        <View style={[styles.listIconWrap, { backgroundColor: cfg.bg, marginTop: 2 }]}>
                          <AlertCircle size={16} color={cfg.color} strokeWidth={1.5} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <Text style={styles.listTitle}>{formatMonth(fee.fee_month)}</Text>
                          <Text style={styles.listSub}>
                            {isCurrentMonthFee ? 'Monthly Rent' : 'Carry-forward Due'}
                            {fee.due_date ? `  ·  Due ${formatDateStr(fee.due_date)}` : ''}
                          </Text>
                          {fee.paid_amount > 0 && (
                            <Text style={[styles.listSub, { color: colors.success, marginTop: 2 }]}>
                              {'Partial: ' + formatCurrency(fee.paid_amount)}
                              {fee.payments && fee.payments[0] ? ` on ${formatDateStr(fee.payments[0].payment_date)}` : ''}
                            </Text>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                          <Text style={styles.listAmount}>{formatCurrency(fee.balance)}</Text>
                          <View style={[styles.statusPill, { backgroundColor: cfg.bg, marginBottom: showItemPayBtn ? 6 : 0 }]}>
                            <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                          {showItemPayBtn && (
                            <TouchableOpacity
                              style={styles.payNowBtn}
                              onPress={() => navigation.navigate('Payments')}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.payNowBtnText}>Pay Now</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (!thisMonthFee || thisMonthFee.balance <= 0) ? (
              <View style={{ marginTop: 20, marginBottom: 20, paddingHorizontal: 20 }}>
                <Phase3EmptyState variant="dues" onAction={() => setActiveTab('Payment History')} />
              </View>
            ) : null}

            {/* Recently paid (preview, max 5) */}
            {allPayments.length > 0 && (
              <>
                <Text style={styles.groupLabel}>Recently Paid</Text>
                <View style={styles.listCard}>
                  {allPayments.slice(0, 5).map((p: any, i: number) => (
                    <TouchableOpacity
                      key={p.payment_id}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('PaymentReceipt', { fee: { ...p, payments: [p] }, isPaid: true })}
                      style={[
                        styles.listRow,
                        i < Math.min(allPayments.length, 5) - 1 && styles.listRowDivider,
                        { alignItems: 'flex-start' },
                      ]}
                    >
                      <View style={[styles.listIconWrap, { backgroundColor: colors.successSoft, marginTop: 2 }]}>
                        <CheckCircle2 size={16} color={colors.success} strokeWidth={1.5} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <Text style={styles.listTitle}>{formatMonth(p.fee_month)}</Text>
                        <Text style={styles.listSub}>
                          {'Paid on ' + formatDateStr(p.payment_date)}
                          {p.payment_mode ? ` · ${p.payment_mode}` : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                        <Text style={[styles.listAmount, { color: colors.success }]}>{formatCurrency(p.amount)}</Text>
                        <View style={styles.paidPill}><Text style={styles.paidPillText}>Paid</Text></View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Payment Tips */}
            <View style={{ marginTop: 20, marginBottom: 10 }}>
              <QuickTips tips={PAYMENT_TIPS} />
            </View>
          </View>

        ) : (
          // ══════════════════════════════════════════════════════════════════
          // PAYMENT HISTORY TAB — GPay / PhonePe style
          // ══════════════════════════════════════════════════════════════════
          <View style={{ paddingBottom: 24 }}>

            {/* Summary row */}
            <View style={styles.tlSummaryRow}>
              <View style={styles.tlSummaryCard}>
                <View style={[styles.tlSummaryIcon, { backgroundColor: BLUE_SOFT }]}>
                  <TrendingUp size={16} color={BLUE} strokeWidth={2} />
                </View>
                <View>
                  <Text style={styles.tlSummaryLabel}>Records</Text>
                  <Text style={[styles.tlSummaryValue, { color: BLUE }]}>{feeRecords.length}</Text>
                </View>
              </View>
              <View style={styles.tlSummaryCard}>
                <View style={[styles.tlSummaryIcon, { backgroundColor: colors.successSoft }]}>
                  <Banknote size={16} color={colors.success} strokeWidth={2} />
                </View>
                <View>
                  <Text style={styles.tlSummaryLabel}>Total Paid</Text>
                  <Text style={[styles.tlSummaryValue, { color: colors.success }]}>{formatCurrency(totalPaidAmount)}</Text>
                </View>
              </View>
            </View>

            {/* Filter row */}
            <View style={styles.filterRow}>
              <Text style={styles.filterTitle}>All Transactions</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {filterMonthYear && (
                  <TouchableOpacity
                    onPress={() => setFilterMonthYear(null)}
                    style={styles.filterClearChip}
                  >
                    <Text style={styles.filterClearText}>Clear</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowPicker(true)}
                  style={styles.filterChip}
                >
                  <CalendarIcon size={13} color={BLUE} />
                  <Text style={styles.filterChipText}>
                    {filterMonthYear
                      ? `${filterMonthYear.toLocaleString('default', { month: 'short' })} ${filterMonthYear.getFullYear()}`
                      : 'Filter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* GPay-style transaction list */}
            {filteredPayments.length > 0 ? (
              <View style={styles.txContainer}>
                {filteredPayments.map((p) => {
                  const cfg = statusConfig[p.verification_status || 'Verified'] || statusConfig['Pending'];
                  const isPaid = true;
                  const awaitingVerification = p.verification_status === 'Pending';
                  const modeS = getModeStyle(p.payment_mode);

                  return (
                    <TouchableOpacity 
                      key={p.payment_id} 
                      style={styles.txCard}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('PaymentReceipt', { fee: { ...p, payments: [p] }, isPaid: true })}
                    >
                      {/* Left icon circle */}
                      <View style={[styles.txIconCircle, { backgroundColor: awaitingVerification ? cfg.bg : colors.successSoft }]}>
                        <ArrowDownLeft size={20} color={awaitingVerification ? cfg.color : colors.success} strokeWidth={2} />
                      </View>

                      {/* Center: details */}
                      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 12 }}>
                        <Text style={styles.txTitle} numberOfLines={1}>
                          Rent Paid — {formatMonth(p.fee_month)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          {p.payment_mode ? (
                            <View style={[styles.modeBadge, { backgroundColor: modeS.bg }]}>
                              <Text style={[styles.modeBadgeText, { color: modeS.color }]}>{modeS.label}</Text>
                            </View>
                          ) : null}
                          <Text style={styles.txDate}>
                            {formatShortDate(p.payment_date)}
                          </Text>
                        </View>
                        {awaitingVerification && (
                          <Text style={styles.txVerify}>⏳ Awaiting verification</Text>
                        )}
                        {p.transaction_id ? (
                          <Text style={styles.txId} numberOfLines={1}>
                            {'Txn: ' + p.transaction_id}
                          </Text>
                        ) : null}
                      </View>

                      {/* Right: amount + status */}
                      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                        <Text style={[styles.txAmount, { color: awaitingVerification ? cfg.color : colors.success }]}>
                          {formatCurrency(p.amount)}
                        </Text>
                        <View style={styles.paidPill}>
                          <Text style={styles.paidPillText}>Paid</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: TEXT_MID, fontSize: 14 }}>No records found for this period.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

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
  hAvatar:        { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  hAvatarText:    { color: WHITE, fontSize: 15, fontWeight: '700' },
  headerGreeting: { fontSize: 18, fontWeight: '700', color: WHITE },
  headerSub:      { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hBtn:           { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  notificationDot: { position: 'absolute', top: 8, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: BLUE },

  // ── Hero: single merged card ────────────────────────────────────────────────────────
  heroSingle: {
    backgroundColor: WHITE,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
    overflow: 'hidden',
  },
  heroSingleTop:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  heroSingleLabel:  { fontSize: 13, fontWeight: '600', color: TEXT_MID, marginBottom: 3 },
  heroSingleDate:   { fontSize: 11, color: TEXT_MID },
  heroSingleAmount: { fontSize: 28, fontWeight: '900', color: colors.danger, letterSpacing: -1, marginBottom: 4 },
  heroSinglePartial:{ fontSize: 12, color: colors.primary, fontWeight: '600', marginBottom: 12 },
  heroIconBadge:    { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroPayBtn:       { borderRadius: 14, overflow: 'hidden', marginTop: 16 },
  heroPayBtnText:   { color: WHITE, fontWeight: '700', fontSize: 14 },

  heroClear: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  heroClearIconBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  heroClearTitle: { fontSize: 16, fontWeight: '700', color: '#166534', marginBottom: 2 },
  heroClearSub:   { fontSize: 13, color: '#475569' },

  splitCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  splitLabel:  { fontSize: 12, color: TEXT_MID, fontWeight: '600', marginBottom: 4 },
  splitAmount: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  splitStatus: { fontSize: 12, fontWeight: '600' },

  // ── Pay Now button ─────────────────────────────────────────────────────────
  heroPayBtn:     { backgroundColor: BLUE, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  heroPayBtnText: { color: WHITE, fontWeight: '700', fontSize: 14 },
  payNowBtn:      { backgroundColor: BLUE, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  payNowBtnText:  { color: WHITE, fontWeight: '700', fontSize: 11 },

  // ── Tab ───────────────────────────────────────────────────────────────────
  tabContainer: { paddingHorizontal: spacing.xl, paddingTop: 12, paddingBottom: 16, backgroundColor: BG },
  tabRow:       { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: 4 },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: radius.md, position: 'relative' },
  tabActive:    { backgroundColor: WHITE, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  tabText:      { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  tabTextActive:{ color: BLUE, fontWeight: '800' },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollContent: { paddingBottom: 100 },
  loadingWrap:   { alignItems: 'center', paddingTop: 80, gap: spacing.md },
  loadingText:   { fontSize: 14, color: TEXT_MID, marginTop: 8 },
  emptyWrap:     { alignItems: 'center', paddingTop: 80, gap: spacing.md, paddingHorizontal: 40 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: TEXT_DARK, textAlign: 'center' },
  emptyBody:     { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 20 },

  // ── List cards (This Month tab) ───────────────────────────────────────────
  groupLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textSubtle,
    paddingHorizontal: spacing.xl, marginBottom: spacing.md,
    marginTop: spacing.lg, letterSpacing: 0.8, textTransform: 'uppercase',
  },
  listCard:       { backgroundColor: WHITE, borderRadius: radius['2xl'], marginHorizontal: spacing.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card },
  listRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, padding: 16 },
  listRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  listIconWrap:   { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listTitle:      { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2, flexShrink: 1 },
  listSub:        { fontSize: 11, color: TEXT_MID, marginTop: 1, lineHeight: 16, flexShrink: 1 },
  listAmount:     { fontSize: 15, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.3, marginBottom: 4 },

  statusPill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  paidPill:       { backgroundColor: colors.successSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  paidPillText:   { color: colors.success, fontSize: 10, fontWeight: '700' },

  tipRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  tipText: { flex: 1, fontSize: 13, color: TEXT_MID, fontWeight: '500', lineHeight: 18 },

  // ── Payment History summary ───────────────────────────────────────────────
  tlSummaryRow:  { flexDirection: 'row', gap: 12, paddingHorizontal: spacing.xl, marginTop: spacing.lg, marginBottom: spacing.sm },
  tlSummaryCard: {
    flex: 1, backgroundColor: WHITE, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tlSummaryIcon:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tlSummaryLabel: { fontSize: 11, fontWeight: '600', color: TEXT_MID, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  tlSummaryValue: { fontSize: 18, fontWeight: '800' },

  // Filter row
  filterRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: 10, marginBottom: 4 },
  filterTitle:     { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  filterChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: BLUE_SOFT },
  filterChipText:  { fontSize: 12, fontWeight: '700', color: BLUE },
  filterClearChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#FEE2E2' },
  filterClearText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  // ── GPay-style transaction cards ──────────────────────────────────────────
  txContainer: { paddingHorizontal: spacing.xl, gap: 10 },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  txIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txTitle:      { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  txDate:       { fontSize: 11, color: TEXT_MID, fontWeight: '500' },
  txId:         { fontSize: 10, color: TEXT_LIGHT, marginTop: 3 },
  txVerify:     { fontSize: 11, color: colors.warning, fontWeight: '600', marginTop: 3 },
  txAmount:     { fontSize: 16, fontWeight: '800', letterSpacing: -0.3, marginBottom: 6 },
  modeBadge:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  modeBadgeText:{ fontSize: 10, fontWeight: '700' },
});
