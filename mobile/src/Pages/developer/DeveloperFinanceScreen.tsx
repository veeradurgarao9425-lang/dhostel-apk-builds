import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  developerService,
  HostelBillingRow,
  FinanceSummary,
  BillingFrequency,
  BillingStatus,
} from '../../services/developerService';

const FREQUENCIES: BillingFrequency[] = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];
const EXPENSE_CATS = ['Server', 'Database', 'Storage', 'Email', 'Domain', 'Hosting', 'Marketing', 'Other'];

export default function DeveloperFinanceScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'billing' | 'dues' | 'expenses'>('billing');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [billingList, setBillingList] = useState<HostelBillingRow[]>([]);
  const [duesList, setDuesList] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [editBillingModal, setEditBillingModal] = useState<HostelBillingRow | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editFrequency, setEditFrequency] = useState<BillingFrequency>('MONTHLY');
  const [editStatus, setEditStatus] = useState<BillingStatus>('ACTIVE');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingBilling, setIsSavingBilling] = useState(false);

  const [paymentModal, setPaymentModal] = useState<HostelBillingRow | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Animated Payment Celebration Receipt
  const [successReceipt, setSuccessReceipt] = useState<{
    hostelName: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
    ownerName?: string;
  } | null>(null);

  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.7)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (successReceipt) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      successScale.setValue(0);
      successOpacity.setValue(0);
      ringScale.setValue(0.7);
      ringOpacity.setValue(0.8);

      Animated.parallel([
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(successScale, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(ringScale, {
                toValue: 1.35,
                duration: 1400,
                useNativeDriver: true,
              }),
              Animated.timing(ringOpacity, {
                toValue: 0,
                duration: 1400,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(ringScale, {
                toValue: 0.7,
                duration: 0,
                useNativeDriver: true,
              }),
              Animated.timing(ringOpacity, {
                toValue: 0.8,
                duration: 0,
                useNativeDriver: true,
              }),
            ]),
          ])
        ),
      ]).start();
    }
  }, [successReceipt]);

  const [expenseModal, setExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState('Server');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [ovRes, billRes, expRes] = await Promise.allSettled([
        developerService.getFinanceOverview(),
        developerService.getBilling({ search: searchQuery, payment_status: statusFilter === 'ALL' ? undefined : statusFilter }),
        developerService.getPlatformExpenses({ limit: 50 }),
      ]);

      if (ovRes.status === 'fulfilled' && ovRes.value?.success && ovRes.value.data) {
        setSummary(ovRes.value.data.summary);
        setDuesList(ovRes.value.data.dues || []);
      }

      if (billRes.status === 'fulfilled' && billRes.value?.success) {
        setBillingList(billRes.value.data || []);
      }

      if (expRes.status === 'fulfilled' && expRes.value?.success) {
        setExpenses(expRes.value.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ── Save Billing Agreement ───────────────────────────────────────────────
  const handleOpenEditBilling = (item: HostelBillingRow) => {
    setEditBillingModal(item);
    setEditAmount(item.agreed_amount ? String(item.agreed_amount) : '');
    setEditFrequency(item.billing_frequency || 'MONTHLY');
    setEditStatus(item.billing_status || 'ACTIVE');
    setEditNotes(item.notes || '');
  };

  const handleSaveBilling = async () => {
    if (!editBillingModal) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid agreed billing amount.');
      return;
    }

    try {
      setIsSavingBilling(true);
      const res = await developerService.saveBilling(editBillingModal.hostel_id, {
        agreed_amount: amt,
        billing_frequency: editFrequency,
        status: editStatus,
        notes: editNotes,
      });

      if (res?.success) {
        Alert.alert('Saved', `Billing updated for ${editBillingModal.hostel_name}`);
        setEditBillingModal(null);
        loadData();
      } else {
        Alert.alert('Error', res?.error || 'Failed to update billing.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Error updating billing.');
    } finally {
      setIsSavingBilling(false);
    }
  };

  // ── Record Payment ───────────────────────────────────────────────────────
  const handleOpenPayment = (item: HostelBillingRow) => {
    setPaymentModal(item);
    setPayAmount(item.agreed_amount ? String(item.agreed_amount) : '');
    setPayMethod('UPI');
    setPayRef('');
    setPayNotes('');
  };

  const handleRecordPayment = async () => {
    if (!paymentModal) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid received payment amount.');
      return;
    }

    try {
      setIsSavingPayment(true);
      const res = await developerService.recordBillingPayment(paymentModal.hostel_id, {
        amount: amt,
        payment_method: payMethod,
        reference: payRef,
        notes: payNotes,
      });

      if (res?.success) {
        const recHostelName = paymentModal.hostel_name;
        const recOwnerName = paymentModal.owner_name || undefined;
        setPaymentModal(null);
        setSuccessReceipt({
          hostelName: recHostelName,
          amount: amt,
          paymentMethod: payMethod,
          reference: payRef,
          ownerName: recOwnerName,
        });
        loadData();
      } else {
        Alert.alert('Error', res?.error || 'Failed to record payment.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Error recording payment.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  // ── Create Platform Expense ──────────────────────────────────────────────
  const handleCreateExpense = async () => {
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
      return;
    }

    try {
      setIsSavingExpense(true);
      const res = await developerService.createPlatformExpense({
        category: expCategory,
        description: expDesc,
        amount: amt,
        notes: expNotes,
      });

      if (res?.success) {
        Alert.alert('Saved', 'Platform expense recorded.');
        setExpenseModal(false);
        setExpAmount('');
        setExpDesc('');
        setExpNotes('');
        loadData();
      } else {
        Alert.alert('Error', res?.error || 'Failed to record expense.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Error recording expense.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = (id: number) => {
    Alert.alert('Delete Expense', 'Are you sure you want to remove this recorded expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await developerService.deletePlatformExpense(id);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not delete expense.');
          }
        },
      },
    ]);
  };

  // Helper Badge Color
  const getBadgeStyle = (state: string) => {
    switch (state) {
      case 'PAID':
        return { bg: '#ECFDF5', text: '#059669', label: 'PAID' };
      case 'DUE_SOON':
        return { bg: '#FEF3C7', text: '#D97706', label: 'DUE SOON' };
      case 'DUE_TODAY':
        return { bg: '#FEF2F2', text: '#DC2626', label: 'DUE TODAY' };
      case 'OVERDUE':
        return { bg: '#FEE2E2', text: '#B91C1C', label: 'OVERDUE' };
      case 'PAUSED':
        return { bg: '#F3F4F6', text: '#6B7280', label: 'PAUSED' };
      default:
        return { bg: '#F3F4F6', text: '#9CA3AF', label: 'NOT SET' };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─────────────────── CLEAN SIMPLE LIGHT HEADER ─────────────────── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'android' ? 10 : 6) },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={18} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={styles.masterBadge}>
              <Text style={styles.masterBadgeText}>PLATFORM P&L</Text>
            </View>
            <Text style={styles.headerTitle}>Money Management</Text>
          </View>

          <TouchableOpacity
            onPress={() => setExpenseModal(true)}
            style={styles.addExpenseBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.addExpenseBtnText}>Add Cost</Text>
          </TouchableOpacity>
        </View>

        {/* Financial KPI Strip */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>EXPECTED</Text>
            <Text style={styles.kpiVal}>₹{Number(summary?.total_expected || 0).toLocaleString('en-IN')}</Text>
            <Text style={styles.kpiSub}>{summary?.billable_hostels || 0} Hostels</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>RECEIVED</Text>
            <Text style={[styles.kpiVal, { color: '#059669' }]}>
              ₹{Number(summary?.total_received || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.kpiSub}>{summary?.collection_rate || 0}% rate</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>PENDING</Text>
            <Text style={[styles.kpiVal, { color: '#DC2626' }]}>
              ₹{Number(summary?.total_pending || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.kpiSub}>{summary?.pending_hostels || 0} Pending</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: (summary?.net_balance || 0) < 0 ? '#DC2626' : '#64748B' }]}>
              {(summary?.net_balance || 0) < 0 ? 'NET LOSS' : 'NET PROFIT'}
            </Text>
            <Text style={[styles.kpiVal, { color: (summary?.net_balance || 0) > 0 ? '#059669' : (summary?.net_balance || 0) < 0 ? '#DC2626' : '#64748B' }]}>
              {(summary?.net_balance || 0) < 0 ? `-₹${Math.abs(summary?.net_balance || 0).toLocaleString('en-IN')}` : (summary?.net_balance || 0) > 0 ? `+₹${Number(summary?.net_balance || 0).toLocaleString('en-IN')}` : '₹0'}
            </Text>
            <Text style={styles.kpiSub}>Costs: ₹{Number(summary?.total_expenses || 0).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Tab Segment Switcher */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'billing' && styles.tabBtnActive]}
            onPress={() => setActiveTab('billing')}
            activeOpacity={0.8}
          >
            <Ionicons name="business" size={14} color={activeTab === 'billing' ? '#EA580C' : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'billing' && styles.tabTextActive]}>Hostels ({billingList.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'dues' && styles.tabBtnActive]}
            onPress={() => setActiveTab('dues')}
            activeOpacity={0.8}
          >
            <Ionicons name="time" size={14} color={activeTab === 'dues' ? '#EA580C' : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'dues' && styles.tabTextActive]}>Dues ({duesList.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'expenses' && styles.tabBtnActive]}
            onPress={() => setActiveTab('expenses')}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt" size={14} color={activeTab === 'expenses' ? '#EA580C' : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>Expenses ({expenses.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading platform financial ledger...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
          showsVerticalScrollIndicator={false}
        >
          {/* TAB 1: HOSTEL BILLING ROSTER */}
          {activeTab === 'billing' && (
            <View>
              {/* Search & Filter Bar */}
              <View style={styles.searchFilterBox}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search hostel or owner..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
                  {['ALL', 'PAID', 'PENDING', 'OVERDUE', 'PAUSED'].map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.filterPill, statusFilter === f && styles.filterPillActive]}
                      onPress={() => setStatusFilter(f)}
                    >
                      <Text style={[styles.filterPillText, statusFilter === f && styles.filterPillTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Roster Cards */}
              {billingList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="business-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No Hostels Found</Text>
                  <Text style={styles.emptySub}>No hostel matches the selected search/filter.</Text>
                </View>
              ) : (
                billingList.map((item) => {
                  const badge = getBadgeStyle(item.payment_state);
                  return (
                    <View key={item.hostel_id} style={styles.hostelCard}>
                      <View style={styles.hostelCardTop}>
                        <View style={styles.hostelIcon}>
                          <Ionicons name="business" size={18} color="#EA580C" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.hostelName}>{item.hostel_name}</Text>
                          <Text style={styles.ownerText}>
                            Owner: <Text style={{ fontWeight: '700', color: '#374151' }}>{item.owner_name || 'N/A'}</Text>
                          </Text>
                        </View>
                        <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      {/* Billing Stats Row */}
                      <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>AGREED</Text>
                          <Text style={styles.statVal}>₹{Number(item.agreed_amount || 0).toLocaleString('en-IN')}</Text>
                          <Text style={styles.statFreq}>{item.billing_frequency}</Text>
                        </View>

                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>RECEIVED</Text>
                          <Text style={[styles.statVal, { color: '#059669' }]}>
                            ₹{Number(item.total_received || 0).toLocaleString('en-IN')}
                          </Text>
                          <Text style={styles.statFreq}>
                            {item.last_payment_date ? `Last: ${item.last_payment_date}` : 'No payments yet'}
                          </Text>
                        </View>

                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>NEXT DUE</Text>
                          <Text style={[styles.statVal, { color: item.days_remaining !== null && item.days_remaining <= 0 ? '#DC2626' : '#1F2937' }]}>
                            {item.next_due_date || 'Not set'}
                          </Text>
                          <Text style={styles.statFreq}>
                            {item.days_remaining !== null
                              ? item.days_remaining < 0
                                ? `${Math.abs(item.days_remaining)}d overdue`
                                : item.days_remaining === 0
                                ? 'Due today'
                                : `in ${item.days_remaining}d`
                              : 'Set schedule'}
                          </Text>
                        </View>
                      </View>

                      {/* Card Action Buttons */}
                      <View style={styles.actionBtnRow}>
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => handleOpenEditBilling(item)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="create-outline" size={15} color="#4B5563" />
                          <Text style={styles.editBtnText}>Edit Agreement</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.payBtn}
                          onPress={() => handleOpenPayment(item)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark-circle" size={15} color="#FFF" />
                          <Text style={styles.payBtnText}>Record Payment</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 2: UPCOMING DUES */}
          {activeTab === 'dues' && (
            <View>
              <Text style={styles.tabSectionTitle}>Upcoming & Overdue Receivables</Text>
              {duesList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="checkmark-done-circle-outline" size={40} color="#10B981" />
                  <Text style={styles.emptyTitle}>All Settled!</Text>
                  <Text style={styles.emptySub}>No upcoming or overdue payments currently pending.</Text>
                </View>
              ) : (
                duesList.map((item, idx) => {
                  const isOverdue = item.days_remaining !== null && item.days_remaining < 0;
                  const isToday = item.days_remaining === 0;
                  return (
                    <View key={idx} style={[styles.dueCard, isOverdue && { borderColor: '#FECACA' }]}>
                      <View style={styles.dueCardLeft}>
                        <View style={[styles.dueDot, { backgroundColor: isOverdue ? '#EF4444' : isToday ? '#F59E0B' : '#3B82F6' }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dueHostelName}>{item.hostel_name}</Text>
                          <Text style={styles.dueOwnerName}>Owner: {item.owner_name || 'N/A'}</Text>
                          <Text style={styles.dueDateText}>
                            Due: <Text style={{ fontWeight: '700' }}>{item.next_due_date || 'Immediate'}</Text> ({isOverdue ? `${Math.abs(item.days_remaining)} days overdue` : isToday ? 'Due today' : `in ${item.days_remaining} days`})
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dueCardRight}>
                        <Text style={[styles.dueAmount, isOverdue && { color: '#DC2626' }]}>
                          ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 3: PLATFORM EXPENSES */}
          {activeTab === 'expenses' && (
            <View>
              <View style={styles.expenseHeaderRow}>
                <Text style={styles.tabSectionTitle}>Recorded Infrastructure Costs</Text>
                <TouchableOpacity
                  style={styles.addSmallBtn}
                  onPress={() => setExpenseModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={14} color="#FFF" />
                  <Text style={styles.addSmallBtnText}>Add Expense</Text>
                </TouchableOpacity>
              </View>

              {expenses.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No Expenses Recorded</Text>
                  <Text style={styles.emptySub}>Record server, database, domain or hosting costs to track platform profit accurately.</Text>
                </View>
              ) : (
                expenses.map((exp) => (
                  <View key={exp.expense_id} style={styles.expenseCard}>
                    <View style={styles.expenseIconBox}>
                      <Ionicons
                        name={
                          exp.category === 'Server'
                            ? 'server'
                            : exp.category === 'Database'
                            ? 'cube'
                            : exp.category === 'Email'
                            ? 'mail'
                            : 'hardware-chip'
                        }
                        size={18}
                        color="#EA580C"
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.expenseCategory}>{exp.category}</Text>
                      <Text style={styles.expenseDesc} numberOfLines={1}>{exp.description || 'Infrastructure cost'}</Text>
                      <Text style={styles.expenseDate}>{exp.expense_date || 'Recent'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.expenseAmount}>-₹{Number(exp.amount || 0).toLocaleString('en-IN')}</Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteExpense(exp.expense_id)}
                        style={styles.deleteExpenseBtn}
                      >
                        <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── MODAL: EDIT BILLING AGREEMENT ── */}
      <Modal visible={!!editBillingModal} transparent animationType="fade" onRequestClose={() => setEditBillingModal(null)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', maxHeight: '90%' }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Hostel Billing Agreement</Text>
                <TouchableOpacity onPress={() => setEditBillingModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalSub}>{editBillingModal?.hostel_name}</Text>

                <Text style={styles.inputLabel}>Agreed Amount (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="e.g. 3000"
                  value={editAmount}
                  onChangeText={setEditAmount}
                />

                <Text style={styles.inputLabel}>Billing Frequency</Text>
                <View style={styles.frequencyRow}>
                  {FREQUENCIES.map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[styles.freqChip, editFrequency === freq && styles.freqChipActive]}
                      onPress={() => setEditFrequency(freq)}
                    >
                      <Text style={[styles.freqChipText, editFrequency === freq && styles.freqChipTextActive]}>
                        {freq.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.frequencyRow}>
                  {(['ACTIVE', 'PAUSED', 'CANCELLED'] as BillingStatus[]).map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.freqChip, editStatus === st && styles.freqChipActive]}
                      onPress={() => setEditStatus(st)}
                    >
                      <Text style={[styles.freqChipText, editStatus === st && styles.freqChipTextActive]}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Internal Notes</Text>
                <TextInput
                  style={[styles.modalInput, { height: 60 }]}
                  placeholder="Optional notes or agreed terms"
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { marginTop: 14 }]}
                  onPress={handleSaveBilling}
                  disabled={isSavingBilling}
                  activeOpacity={0.8}
                >
                  {isSavingBilling ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Save Agreement</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── MODAL: RECORD PAYMENT ── */}
      <Modal visible={!!paymentModal} transparent animationType="fade" onRequestClose={() => setPaymentModal(null)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', maxHeight: '90%' }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Record Received Payment</Text>
                <TouchableOpacity onPress={() => setPaymentModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalSub}>{paymentModal?.hostel_name}</Text>

                <Text style={styles.inputLabel}>Amount Received (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="e.g. 3000"
                  value={payAmount}
                  onChangeText={setPayAmount}
                />

                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.frequencyRow}>
                  {['UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE'].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.freqChip, payMethod === m && styles.freqChipActive]}
                      onPress={() => setPayMethod(m)}
                    >
                      <Text style={[styles.freqChipText, payMethod === m && styles.freqChipTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Reference / Transaction ID</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. UPI Ref / UTR / Receipt #"
                  value={payRef}
                  onChangeText={setPayRef}
                />

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: '#059669', marginTop: 14 }]}
                  onPress={handleRecordPayment}
                  disabled={isSavingPayment}
                  activeOpacity={0.8}
                >
                  {isSavingPayment ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Confirm & Mark Received</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── MODAL: ADD EXPENSE ── */}
      <Modal visible={expenseModal} transparent animationType="fade" onRequestClose={() => setExpenseModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', maxHeight: '90%' }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="card" size={17} color="#EA580C" />
                  </View>
                  <Text style={styles.modalTitle}>Record Platform Expense</Text>
                </View>
                <TouchableOpacity onPress={() => setExpenseModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.inputLabel}>Expense Category</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {[
                    { name: 'Server', icon: 'server-outline' as const, color: '#2563EB', bg: '#EFF6FF' },
                    { name: 'Database', icon: 'layers-outline' as const, color: '#0D9488', bg: '#CCFBF1' },
                    { name: 'Storage', icon: 'cloud-outline' as const, color: '#7C3AED', bg: '#F3E8FF' },
                    { name: 'Email', icon: 'mail-outline' as const, color: '#EA580C', bg: '#FFF7ED' },
                    { name: 'Domain', icon: 'globe-outline' as const, color: '#059669', bg: '#ECFDF5' },
                    { name: 'Hosting', icon: 'hardware-chip-outline' as const, color: '#4F46E5', bg: '#EEF2FF' },
                    { name: 'Marketing', icon: 'megaphone-outline' as const, color: '#DB2777', bg: '#FCE7F3' },
                    { name: 'Other', icon: 'receipt-outline' as const, color: '#64748B', bg: '#F1F5F9' },
                  ].map((cat) => {
                    const isSel = expCategory === cat.name;
                    return (
                      <TouchableOpacity
                        key={cat.name}
                        style={[
                          styles.freqChip,
                          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
                          isSel && { backgroundColor: cat.bg, borderColor: cat.color },
                        ]}
                        onPress={() => setExpCategory(cat.name)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name={cat.icon} size={13} color={isSel ? cat.color : '#6B7280'} />
                        <Text style={[styles.freqChipText, isSel && { color: cat.color, fontWeight: '800' }]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.inputLabel}>Expense Amount (₹)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#F8FAFC', paddingHorizontal: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#EA580C', marginRight: 6 }}>₹</Text>
                  <TextInput
                    style={{ flex: 1, fontSize: 16, fontWeight: '800', color: '#0F172A', paddingVertical: 10 }}
                    keyboardType="numeric"
                    placeholder="e.g. 1500"
                    placeholderTextColor="#94A3B8"
                    value={expAmount}
                    onChangeText={setExpAmount}
                  />
                </View>

                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  {['UPI', 'BANK_TRANSFER', 'CARD', 'CASH'].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.freqChip,
                        { flex: 1, alignItems: 'center', paddingVertical: 8 },
                        expCategory === m && styles.freqChipActive,
                      ]}
                      onPress={() => {}}
                    >
                      <Text style={styles.freqChipText}>{m.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Description / Notes</Text>
                <TextInput
                  style={[styles.modalInput, { height: 65, textAlignVertical: 'top' }]}
                  placeholder="e.g. Render server hosting / Postmark email / Supabase DB"
                  placeholderTextColor="#94A3B8"
                  value={expDesc}
                  onChangeText={setExpDesc}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { marginTop: 14 }]}
                  onPress={handleCreateExpense}
                  disabled={isSavingExpense}
                  activeOpacity={0.8}
                >
                  {isSavingExpense ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Save Expense</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── ANIMATED CELEBRATION RECEIPT MODAL ── */}
      <Modal visible={!!successReceipt} transparent animationType="fade">
        <View style={styles.successModalOverlay}>
          <Animated.View
            style={[
              styles.successCard,
              {
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              },
            ]}
          >
            {/* Animated Pulsing Ring & Glowing Checkmark */}
            <View style={styles.successIconWrapper}>
              <Animated.View
                style={[
                  styles.successPulseRing,
                  {
                    transform: [{ scale: ringScale }],
                    opacity: ringOpacity,
                  },
                ]}
              />
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={38} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.successTitle}>Payment Received!</Text>
            <Text style={styles.successSub}>
              Banked successfully for <Text style={{ fontWeight: '800', color: '#0F172A' }}>{successReceipt?.hostelName}</Text>
            </Text>

            {/* Big Received Amount Box */}
            <View style={styles.successAmountBox}>
              <Text style={styles.successAmountLabel}>TOTAL AMOUNT RECEIVED</Text>
              <Text style={styles.successAmountVal}>₹{Number(successReceipt?.amount || 0).toLocaleString('en-IN')}</Text>
              <View style={styles.successTagRow}>
                <View style={styles.successMethodPill}>
                  <Ionicons name="card-outline" size={12} color="#059669" />
                  <Text style={styles.successMethodText}>{successReceipt?.paymentMethod || 'UPI'}</Text>
                </View>
                <View style={styles.successDatePill}>
                  <Ionicons name="time-outline" size={12} color="#64748B" />
                  <Text style={styles.successDateText}>Instant Banked</Text>
                </View>
              </View>
            </View>

            {/* Receipt Key-Values */}
            <View style={styles.successDetailsCard}>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailKey}>Hostel</Text>
                <Text style={styles.successDetailVal}>{successReceipt?.hostelName}</Text>
              </View>
              {successReceipt?.ownerName ? (
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailKey}>Owner</Text>
                  <Text style={styles.successDetailVal}>{successReceipt.ownerName}</Text>
                </View>
              ) : null}
              {successReceipt?.reference ? (
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailKey}>Reference / UTR</Text>
                  <Text style={styles.successDetailVal}>{successReceipt.reference}</Text>
                </View>
              ) : null}
              <View style={[styles.successDetailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text style={styles.successDetailKey}>P&L Status</Text>
                <Text style={[styles.successDetailVal, { color: '#059669', fontWeight: '800' }]}>Ledger Updated ✓</Text>
              </View>
            </View>

            {/* Dismiss CTA */}
            <TouchableOpacity
              style={styles.successDoneBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setSuccessReceipt(null);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.successDoneBtnText}>Done & View Ledger</Text>
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  masterBadgeText: {
    color: '#475569',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addExpenseBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiLabel: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
  },
  kpiVal: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  kpiSub: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  searchFilterBox: {
    marginBottom: 14,
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  filterPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  hostelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  hostelCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostelIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostelName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  ownerText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  statVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },
  statFreq: {
    fontSize: 9.5,
    color: '#6B7280',
    marginTop: 1,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EA580C',
  },
  payBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tabSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  },
  dueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dueCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dueDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dueHostelName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  dueOwnerName: {
    fontSize: 11,
    color: '#6B7280',
  },
  dueDateText: {
    fontSize: 10.5,
    color: '#4B5563',
    marginTop: 2,
  },
  dueCardRight: {
    alignItems: 'flex-end',
  },
  dueAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  expenseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EA580C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addSmallBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  expenseIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseCategory: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#111827',
  },
  expenseDesc: {
    fontSize: 11,
    color: '#6B7280',
  },
  expenseDate: {
    fontSize: 9.5,
    color: '#9CA3AF',
    marginTop: 1,
  },
  expenseAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
  },
  deleteExpenseBtn: {
    padding: 4,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11.5,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  modalSub: {
    fontSize: 12,
    color: '#EA580C',
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  freqChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  freqChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
  },
  freqChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  freqChipTextActive: {
    color: '#EA580C',
  },
  modalSaveBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  successIconWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successPulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.35)',
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  successSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
  },
  successAmountBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successAmountLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: 0.8,
  },
  successAmountVal: {
    fontSize: 32,
    fontWeight: '900',
    color: '#059669',
    marginVertical: 4,
    letterSpacing: -0.5,
  },
  successTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  successMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successMethodText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  successDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  successDateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  successDetailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 18,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  successDetailKey: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  successDetailVal: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  successDoneBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  successDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
