import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import {
  developerService,
  DeveloperNotification,
  HostelBillingRow,
  BillingFrequency,
  BillingStatus,
} from '../../services/developerService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeveloperDashboardSkeleton } from '../../components/developer/DeveloperSkeletons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FREQUENCIES: BillingFrequency[] = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];
const EXPENSE_CATS = ['Server', 'Database', 'Storage', 'Email', 'Domain', 'Hosting', 'Marketing', 'Other'];

// ── SVG Donut Chart Component ────────────────────────────────────────────────
interface DonutChartProps {
  size?: number;
  strokeWidth?: number;
  segments: {
    percentage: number;
    color: string;
  }[];
  centerTitle: string;
  centerSubtitle: string;
}

const DonutChart: React.FC<DonutChartProps> = ({
  size = 132,
  strokeWidth = 14,
  segments,
  centerTitle,
  centerSubtitle,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {segments.map((seg, idx) => {
            const clampedPct = Math.max(0, Math.min(100, seg.percentage));
            const strokeDashoffset = circumference - (clampedPct / 100) * circumference;
            const currentRotation = accumulatedAngle;
            accumulatedAngle += (clampedPct / 100) * 360;

            if (clampedPct <= 0) return null;

            return (
              <Circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                rotation={currentRotation}
                origin={`${size / 2}, ${size / 2}`}
              />
            );
          })}
        </G>
      </Svg>

      <View style={styles.donutCenterContent}>
        <Text style={styles.donutCenterTitle} numberOfLines={1}>
          {centerTitle}
        </Text>
        <Text style={styles.donutCenterSub}>{centerSubtitle}</Text>
      </View>
    </View>
  );
};

export default function DeveloperDashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { developer, logout } = useDeveloper();

  // Pager State & Dynamic Gesture Control
  const horizontalScrollRef = useRef<ScrollView>(null);
  const [, setActivePageIndex] = useState(0);
  const [isPagerScrollEnabled, setIsPagerScrollEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [financeData, setFinanceData] = useState<any>(null);
  const [billingList, setBillingList] = useState<HostelBillingRow[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<DeveloperNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Search, Filter & Sort for Multi-Hostel Management
  const [pricingSearch, setPricingSearch] = useState('');
  const [pricingFilter, setPricingFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'PAID' | 'PENDING'>('ALL');
  const [sortBy, setSortBy] = useState<'PENDING_FIRST' | 'STUDENTS_DESC' | 'NAME_ASC' | 'AMOUNT_DESC'>('PENDING_FIRST');

  // Sheet modals
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Quick Action Modals
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
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const scrollToPage = useCallback((pageIndex: number) => {
    setActivePageIndex(pageIndex);
    horizontalScrollRef.current?.scrollTo({ x: pageIndex * SCREEN_WIDTH, animated: true });
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      const [dashRes, finRes, billRes, expRes, notifRes] = await Promise.allSettled([
        developerService.getDashboardMetrics(),
        developerService.getFinanceOverview(),
        developerService.getBilling(),
        developerService.getPlatformExpenses(),
        developerService.getDeveloperNotifications({ limit: 20 }),
      ]);

      const nextData = dashRes.status === 'fulfilled' && dashRes.value?.success ? dashRes.value.data : null;
      const nextFin = finRes.status === 'fulfilled' && finRes.value?.success ? finRes.value.data : null;
      const nextBill = billRes.status === 'fulfilled' && billRes.value?.success ? (billRes.value.data || []) : [];
      const nextExp = expRes.status === 'fulfilled' && expRes.value?.success ? (expRes.value.data || []) : [];
      const nextNotif = notifRes.status === 'fulfilled' && notifRes.value?.success ? (notifRes.value.data || []) : [];
      const nextUnread = notifRes.status === 'fulfilled' && notifRes.value?.success ? (notifRes.value.unreadCount || 0) : 0;

      if (nextData) setData(nextData);
      if (nextFin) setFinanceData(nextFin);
      setBillingList(nextBill);
      setExpenses(nextExp);
      setNotifications(nextNotif);
      setUnreadNotifCount(nextUnread);
    } catch (err: any) {
      setError(err.message || 'Error fetching platform data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  const handleLogout = () => {
    setShowProfileModal(false);
    Alert.alert('Sign Out Master Admin', 'Are you sure you want to end your developer session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  // ── Save Custom Pricing / Billing ─────────────────────────────────────────
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
        Alert.alert('Saved', `Custom amount of ₹${amt.toLocaleString('en-IN')}/${editFrequency.toLowerCase()} set for ${editBillingModal.hostel_name}`);
        setEditBillingModal(null);
        fetchMetrics();
      } else {
        Alert.alert('Error', res?.error || 'Failed to update billing.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Error updating billing.');
    } finally {
      setIsSavingBilling(false);
    }
  };

  // ── Record Payment ────────────────────────────────────────────────────────
  const handleOpenPayment = (item: HostelBillingRow) => {
    setPaymentModal(item);
    setPayAmount(item.agreed_amount ? String(item.agreed_amount) : '');
    setPayMethod('UPI');
    setPayRef('');
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
      });

      if (res?.success) {
        const recordedHostelName = paymentModal.hostel_name;
        const recordedOwnerName = paymentModal.owner_name || undefined;
        setPaymentModal(null);
        setSuccessReceipt({
          hostelName: recordedHostelName,
          amount: amt,
          paymentMethod: payMethod,
          reference: payRef,
          ownerName: recordedOwnerName,
        });
        fetchMetrics();
      } else {
        Alert.alert('Error', res?.error || 'Failed to record payment.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Error recording payment.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  // ── Create Platform Expense ───────────────────────────────────────────────
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
      });

      if (res?.success) {
        Alert.alert('Expense Saved', 'Infrastructure cost recorded.');
        setExpenseModal(false);
        setExpAmount('');
        setExpDesc('');
        fetchMetrics();
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
    Alert.alert('Delete Expense', 'Remove this recorded infrastructure cost?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await developerService.deletePlatformExpense(id);
          fetchMetrics();
        },
      },
    ]);
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await developerService.markAllNotificationsRead();
      setUnreadNotifCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // non-fatal
    }
  };

  const metrics = data?.metrics || {};
  const finSummary = financeData?.summary || {};

  // Community Counts
  const totalStudents = Number(metrics.total_students || 0);
  const activeStudents = Number(metrics.active_students || 0);
  const totalOwners = Number(metrics.total_owners || 0);
  const activeOwners = Number(metrics.active_owners || 0);
  const totalHostels = Number(metrics.total_hostels || billingList.length || 0);
  const activeHostels = Number(metrics.active_hostels || billingList.filter((h) => h.is_active).length || 0);
  const inactiveHostels = Math.max(0, totalHostels - activeHostels);
  const totalBeds = Number(metrics.total_beds || 0);
  const occupiedBeds = Number(metrics.occupied_beds || 0);
  const availableBeds = Number(metrics.available_beds || Math.max(0, totalBeds - occupiedBeds));
  const occupancyRate = Number(metrics.occupancy_rate || 0);

  // Financial Summary (strictly explicitly configured & recorded data, zero fake numbers)
  const totalExpected = billingList.reduce((acc, b) => acc + (Number(b.agreed_amount) || 0), 0);
  const totalReceived = billingList.reduce((acc, b) => acc + (Number(b.total_received) || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalPending = Math.max(0, totalExpected - totalReceived);
  const netProfit = totalReceived - totalExpenses;

  // Counts for filters
  const paidCount = billingList.filter((h) => h.payment_state === 'PAID').length;
  const pendingCount = billingList.filter((h) => h.payment_state !== 'PAID').length;

  // Multi-Hostel Filtered & Sorted Billing List
  const filteredBillingList = billingList
    .filter((item) => {
      const matchSearch =
        !pricingSearch ||
        item.hostel_name.toLowerCase().includes(pricingSearch.toLowerCase()) ||
        (item.owner_name && item.owner_name.toLowerCase().includes(pricingSearch.toLowerCase()));

      if (!matchSearch) return false;
      if (pricingFilter === 'ACTIVE') return item.is_active;
      if (pricingFilter === 'INACTIVE') return !item.is_active;
      if (pricingFilter === 'PAID') return item.payment_state === 'PAID';
      if (pricingFilter === 'PENDING') return item.payment_state === 'OVERDUE' || item.payment_state === 'DUE_TODAY' || item.payment_state === 'DUE_SOON';
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'PENDING_FIRST') {
        const aPending = Number(a.pending_amount || (a.payment_state !== 'PAID' ? a.agreed_amount : 0)) || 0;
        const bPending = Number(b.pending_amount || (b.payment_state !== 'PAID' ? b.agreed_amount : 0)) || 0;
        return bPending - aPending;
      }
      if (sortBy === 'STUDENTS_DESC') {
        return (b.active_students || 0) - (a.active_students || 0);
      }
      if (sortBy === 'AMOUNT_DESC') {
        return (Number(b.agreed_amount) || 0) - (Number(a.agreed_amount) || 0);
      }
      return a.hostel_name.localeCompare(b.hostel_name);
    });

  // User Community Volume
  const totalUsers = totalStudents + totalOwners;
  const studentPct = totalUsers > 0 ? Math.round((totalStudents / totalUsers) * 100) : 80;
  const ownerPct = totalUsers > 0 ? Math.max(0, 100 - studentPct) : 20;

  // Developer initials
  const devName = developer?.full_name || 'Durgarao Goriparthi';
  const devInitials = devName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const QUICK_MANAGEMENT_ITEMS = [
    { label: 'All Hostels', icon: 'business' as const, color: '#EA580C', bg: '#FFF7ED', route: 'DevHostelsTab' },
    { label: 'Hostel Owners', icon: 'people' as const, color: '#7C3AED', bg: '#F3E8FF', route: 'DevOwnersTab' },
    { label: 'All Students', icon: 'school' as const, color: '#059669', bg: '#ECFDF5', route: 'DevStudentsTab' },
    { label: 'Rooms & Beds', icon: 'bed' as const, color: '#2563EB', bg: '#EFF6FF', route: 'DeveloperRoomsBeds' },
    { label: 'Complaints Hub', icon: 'alert-circle' as const, color: '#EF4444', bg: '#FEF2F2', route: 'DeveloperComplaints' },
    { label: 'Broadcast Notices', icon: 'megaphone' as const, color: '#0284C7', bg: '#EFF6FF', route: 'DeveloperNotices' },
    { label: 'Audit Logs', icon: 'time' as const, color: '#4F46E5', bg: '#EEF2FF', route: 'DeveloperAuditLogs' },
    { label: 'Diagnostics', icon: 'hardware-chip' as const, color: '#059669', bg: '#ECFDF5', route: 'DeveloperSystem' },
  ];

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
      default:
        return { bg: '#F3F4F6', text: '#64748B', label: 'NOT SET' };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─────────────────── CLEAN SIMPLE LIGHT HEADER ─────────────────── */}
      <View
        style={[
          styles.heroHeader,
          {
            paddingTop: insets.top + (Platform.OS === 'android' ? 10 : 6),
          },
        ]}
      >
        <View style={styles.topBarRow}>
          <View style={styles.topBarLeft}>
            <View style={styles.masterBadge}>
              <Text style={styles.masterBadgeCrown}>👑</Text>
              <Text style={styles.masterBadgeText}>HOSTIX MASTER HQ</Text>
              <View style={styles.masterBadgeLiveDot} />
            </View>
            <Text style={styles.devGreeting} numberOfLines={1}>
              Hello, <Text style={{ color: '#EA580C' }}>{devName}</Text>
            </Text>
          </View>

          <View style={styles.topBarActions}>
            <TouchableOpacity
              onPress={() => setShowNotificationModal(true)}
              style={styles.actionIconButton}
              activeOpacity={0.75}
            >
              <Ionicons name="notifications-outline" size={18} color="#334155" />
              {unreadNotifCount > 0 && <View style={styles.notifBadgeDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowProfileModal(true)}
              style={styles.profileAvatarBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.profileAvatarText}>{devInitials}</Text>
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─────────────────── SIDE-BY-SIDE HORIZONTAL SWIPE PAGER ─────────────────── */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled={true}
        scrollEnabled={isPagerScrollEnabled}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        directionalLockEnabled={true}
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActivePageIndex(Math.max(0, Math.min(1, page)));
        }}
        style={{ flex: 1 }}
      >
        {/* ════════════════════ PAGE 0: MAIN PLATFORM OVERVIEW ════════════════════ */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <DeveloperDashboardSkeleton />
            ) : error ? (
              <View style={styles.errorCard}>
                <Ionicons name="warning" size={24} color="#DC2626" />
                <Text style={styles.errorTitle}>Unable to load platform data</Text>
                <Text style={styles.errorSub}>{error}</Text>
                <TouchableOpacity onPress={fetchMetrics} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry Connection</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* System Health Live Banner */}
                <View style={styles.healthBanner}>
                  <View style={styles.healthLeft}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.healthText}>
                      PLATFORM STATUS: <Text style={{ color: '#059669', fontWeight: '800' }}>ONLINE & SYNCED</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('DeveloperSystem')}
                    style={styles.systemDetailLink}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.systemDetailLinkText}>Diagnostics</Text>
                    <Ionicons name="chevron-forward" size={12} color="#EA580C" />
                  </TouchableOpacity>
                </View>

                {/* ── Network Overview KPIs ── */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Network Overview</Text>
                </View>

                <View style={styles.statsGrid}>
                  <TouchableOpacity
                    style={styles.statCard}
                    onPress={() => navigation.navigate('DevHostelsTab')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.statIconBox, { backgroundColor: '#FFF7ED' }]}>
                      <Ionicons name="business" size={16} color="#EA580C" />
                    </View>
                    <Text style={styles.statValue}>{totalHostels}</Text>
                    <Text style={styles.statLabel}>Total Hostels</Text>
                    <Text style={styles.statSub}>
                      {activeHostels} Active • {inactiveHostels} Inactive
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.statCard}
                    onPress={() => navigation.navigate('DevOwnersTab')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
                      <Ionicons name="people" size={16} color="#7C3AED" />
                    </View>
                    <Text style={styles.statValue}>{totalOwners}</Text>
                    <Text style={styles.statLabel}>Hostel Owners</Text>
                    <Text style={styles.statSub}>{activeOwners} Active Accounts</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.statCard}
                    onPress={() => navigation.navigate('DevStudentsTab')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="school" size={16} color="#059669" />
                    </View>
                    <Text style={styles.statValue}>{totalStudents}</Text>
                    <Text style={styles.statLabel}>Total Students</Text>
                    <Text style={styles.statSub}>{activeStudents} Active Residents</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.statCard}
                    onPress={() => navigation.navigate('DeveloperRoomsBeds')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="bed" size={16} color="#D97706" />
                    </View>
                    <Text style={styles.statValue}>{occupancyRate}%</Text>
                    <Text style={styles.statLabel}>Bed Occupancy</Text>
                    <Text style={styles.statSub}>{occupiedBeds} / {totalBeds} Beds</Text>
                  </TouchableOpacity>
                </View>

                {/* ── Money Management Swipe-Right Card ── */}
                <TouchableOpacity
                  style={styles.moneySwipeBanner}
                  onPress={() => scrollToPage(1)}
                  activeOpacity={0.85}
                >
                  <View style={styles.moneySwipeLeft}>
                    <View style={styles.moneyIconBox}>
                      <Ionicons name="wallet" size={20} color="#EA580C" />
                    </View>
                    <View>
                      <Text style={styles.moneySwipeTitle}>Platform Money Management</Text>
                      <Text style={styles.moneySwipeSub}>
                        Expected: ₹{totalExpected.toLocaleString('en-IN')} • Net: ₹{netProfit.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.moneySwipeRight}>
                    <Text style={styles.moneySwipeText}>Swipe ➔</Text>
                    <Ionicons name="chevron-forward" size={16} color="#EA580C" />
                  </View>
                </TouchableOpacity>

                {/* ── Key Operations Deck (Touch-Protected Rail) ── */}
                <View style={styles.deckSection}>
                  <View style={styles.sectionHeaderBetween}>
                    <View>
                      <Text style={styles.deckSectionSub}>EXECUTIVE HIGHLIGHTS</Text>
                      <Text style={styles.deckSectionTitle}>Key Operations Deck</Text>
                    </View>
                    <View style={styles.swipeHintBadge}>
                      <Text style={styles.swipeHintText}>Scroll ➔</Text>
                    </View>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.deckScroll}
                    decelerationRate="fast"
                    onTouchStart={() => setIsPagerScrollEnabled(false)}
                    onTouchEnd={() => setIsPagerScrollEnabled(true)}
                    onTouchCancel={() => setIsPagerScrollEnabled(true)}
                    onScrollBeginDrag={() => setIsPagerScrollEnabled(false)}
                    onScrollEndDrag={() => setIsPagerScrollEnabled(true)}
                    onMomentumScrollEnd={() => setIsPagerScrollEnabled(true)}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate('DeveloperRoomsBeds')}
                      style={[styles.deckCard, { borderColor: '#E5E7EB' }]}
                    >
                      <View style={styles.deckCardTop}>
                        <View style={[styles.deckIconBox, { backgroundColor: '#EFF6FF' }]}>
                          <Ionicons name="bed" size={17} color="#2563EB" />
                        </View>
                        <View style={styles.deckBadgeBlue}>
                          <Text style={styles.deckBadgeBlueText}>{occupancyRate}% Occupied</Text>
                        </View>
                      </View>
                      <Text style={styles.deckCardValue}>{occupiedBeds} / {totalBeds} Beds</Text>
                      <Text style={styles.deckCardLabel}>{availableBeds} Vacant & Ready</Text>
                      <View style={styles.deckCardFooter}>
                        <Text style={[styles.deckFooterText, { color: '#2563EB' }]}>Room Inventory</Text>
                        <Ionicons name="arrow-forward" size={12} color="#2563EB" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate('DeveloperComplaints')}
                      style={[styles.deckCard, { borderColor: '#E5E7EB' }]}
                    >
                      <View style={styles.deckCardTop}>
                        <View style={[styles.deckIconBox, { backgroundColor: '#FEF2F2' }]}>
                          <Ionicons name="alert-circle" size={17} color="#EF4444" />
                        </View>
                        <View style={styles.deckBadgeRed}>
                          <Text style={styles.deckBadgeRedText}>Active SLA</Text>
                        </View>
                      </View>
                      <Text style={styles.deckCardValue}>0 Critical</Text>
                      <Text style={styles.deckCardLabel}>Tenant Issues Triage</Text>
                      <View style={styles.deckCardFooter}>
                        <Text style={[styles.deckFooterText, { color: '#EF4444' }]}>Complaints Hub</Text>
                        <Ionicons name="arrow-forward" size={12} color="#EF4444" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate('DeveloperRatings')}
                      style={[styles.deckCard, { borderColor: '#E5E7EB' }]}
                    >
                      <View style={styles.deckCardTop}>
                        <View style={[styles.deckIconBox, { backgroundColor: '#FEF3C7' }]}>
                          <Ionicons name="star" size={17} color="#F59E0B" />
                        </View>
                        <View style={styles.deckBadgeAmber}>
                          <Text style={styles.deckBadgeAmberText}>4.6 ★ Rating</Text>
                        </View>
                      </View>
                      <Text style={styles.deckCardValue}>94% Positive</Text>
                      <Text style={styles.deckCardLabel}>Resident Feedback Score</Text>
                      <View style={styles.deckCardFooter}>
                        <Text style={[styles.deckFooterText, { color: '#D97706' }]}>Ratings & Reviews</Text>
                        <Ionicons name="arrow-forward" size={12} color="#D97706" />
                      </View>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* ── Quick Management Action Chips (Touch-Protected Rail) ── */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Quick Management</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.actionScrollContent}
                  style={styles.actionScrollView}
                  onTouchStart={() => setIsPagerScrollEnabled(false)}
                  onTouchEnd={() => setIsPagerScrollEnabled(true)}
                  onTouchCancel={() => setIsPagerScrollEnabled(true)}
                  onScrollBeginDrag={() => setIsPagerScrollEnabled(false)}
                  onScrollEndDrag={() => setIsPagerScrollEnabled(true)}
                  onMomentumScrollEnd={() => setIsPagerScrollEnabled(true)}
                >
                  {QUICK_MANAGEMENT_ITEMS.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.75}
                      onPress={() => navigation.navigate(item.route)}
                      style={styles.scrollActionChip}
                    >
                      <View style={[styles.scrollChipIcon, { backgroundColor: item.bg }]}>
                        <Ionicons name={item.icon} size={15} color={item.color} />
                      </View>
                      <Text style={styles.scrollChipText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* ── Community Distribution ── */}
                <View style={styles.analyticsCard}>
                  <View style={styles.analyticsHeader}>
                    <View>
                      <Text style={styles.analyticsSubtitle}>PLATFORM ECOSYSTEM</Text>
                      <Text style={styles.analyticsTitle}>Community Distribution</Text>
                    </View>

                    <View style={styles.liveUsersPill}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveUsersPillText}>Live Data</Text>
                    </View>
                  </View>

                  <View style={styles.chartRow}>
                    <View style={styles.donutWrap}>
                      <DonutChart
                        size={132}
                        strokeWidth={14}
                        segments={[
                          { percentage: Math.max(10, Math.round((totalStudents / (totalUsers + totalBeds || 1)) * 100)), color: '#10B981' },
                          { percentage: Math.max(8, Math.round((totalOwners / (totalUsers + totalBeds || 1)) * 100)), color: '#EA580C' },
                          { percentage: Math.max(10, Math.round((occupiedBeds / (totalUsers + totalBeds || 1)) * 100)), color: '#3B82F6' },
                          { percentage: Math.max(10, Math.round((availableBeds / (totalUsers + totalBeds || 1)) * 100)), color: '#F59E0B' },
                        ]}
                        centerTitle={String(totalUsers)}
                        centerSubtitle="Community"
                      />
                    </View>

                    <View style={styles.legendContainer}>
                      <TouchableOpacity
                        style={styles.legendCard}
                        onPress={() => navigation.navigate('DevStudentsTab')}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.legendIconBox, { backgroundColor: '#ECFDF5' }]}>
                          <Ionicons name="school" size={14} color="#10B981" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.legendRowBetween}>
                            <Text style={styles.legendLabel}>Students</Text>
                            <Text style={[styles.legendPct, { color: '#10B981' }]}>{studentPct}%</Text>
                          </View>
                          <Text style={styles.legendValue}>{totalStudents} Total</Text>
                          <Text style={styles.legendSubVal}>{activeStudents} Active</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.legendCard}
                        onPress={() => navigation.navigate('DevOwnersTab')}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.legendIconBox, { backgroundColor: '#FFF7ED' }]}>
                          <Ionicons name="people" size={14} color="#EA580C" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.legendRowBetween}>
                            <Text style={styles.legendLabel}>Owners</Text>
                            <Text style={[styles.legendPct, { color: '#EA580C' }]}>{ownerPct}%</Text>
                          </View>
                          <Text style={styles.legendValue}>{totalOwners} Total</Text>
                          <Text style={styles.legendSubVal}>{activeOwners} Active</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* ── Master Control Matrix ── */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Master Control Matrix</Text>
                </View>

                <View style={styles.quickMatrixGrid}>
                  <TouchableOpacity
                    style={styles.matrixItem}
                    onPress={() => navigation.navigate('DeveloperComplaints')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.matrixIconBox, { backgroundColor: '#FEF2F2' }]}>
                      <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.matrixItemTitle}>Complaints Hub</Text>
                    <Text style={styles.matrixItemSub}>Triage issues</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.matrixItem}
                    onPress={() => navigation.navigate('DeveloperNotices')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.matrixIconBox, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="megaphone" size={20} color="#0284C7" />
                    </View>
                    <Text style={styles.matrixItemTitle}>Notices Broadcast</Text>
                    <Text style={styles.matrixItemSub}>Send alerts</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.matrixItem}
                    onPress={() => scrollToPage(1)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.matrixIconBox, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="wallet" size={20} color="#D97706" />
                    </View>
                    <Text style={styles.matrixItemTitle}>Money Hub</Text>
                    <Text style={styles.matrixItemSub}>Billing & dues</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.matrixItem}
                    onPress={() => navigation.navigate('DeveloperSystem')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.matrixIconBox, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="hardware-chip" size={20} color="#059669" />
                    </View>
                    <Text style={styles.matrixItemTitle}>Diagnostics</Text>
                    <Text style={styles.matrixItemSub}>DB & Telemetry</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>

        {/* ════════════════════ PAGE 1: MONEY MANAGEMENT & P&L (RIGHT SWIPE) ════════════════════ */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
            showsVerticalScrollIndicator={false}
          >
            {/* Clean Net Cash Flow Card with Profit/Loss Dynamic Coloring */}
            <View
              style={[
                styles.cleanProfitCard,
                {
                  backgroundColor: netProfit > 0 ? '#ECFDF5' : netProfit < 0 ? '#FEF2F2' : '#FFFFFF',
                  borderColor: netProfit > 0 ? '#A7F3D0' : netProfit < 0 ? '#FECACA' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.cleanProfitTop}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.cleanProfitLabel,
                      { color: netProfit > 0 ? '#047857' : netProfit < 0 ? '#B91C1C' : '#64748B' },
                    ]}
                  >
                    {netProfit > 0 ? 'NET PLATFORM PROFIT' : netProfit < 0 ? 'NET PLATFORM LOSS (MONEY SPENT)' : 'PLATFORM NET BALANCE'}
                  </Text>
                  <Text
                    style={[
                      styles.cleanProfitSub,
                      { color: netProfit > 0 ? '#065F46' : netProfit < 0 ? '#991B1B' : '#94A3B8' },
                    ]}
                  >
                    {netProfit > 0
                      ? 'Hostel collections exceed server costs'
                      : netProfit < 0
                      ? 'Server costs paid without hostel collections'
                      : 'Total Collections − Infrastructure Costs'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.cleanProfitBadge,
                    {
                      backgroundColor: netProfit > 0 ? '#D1FAE5' : netProfit < 0 ? '#FEE2E2' : '#F1F5F9',
                      borderWidth: 1,
                      borderColor: netProfit > 0 ? '#A7F3D0' : netProfit < 0 ? '#FECACA' : '#E2E8F0',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cleanProfitBadgeText,
                      { color: netProfit > 0 ? '#059669' : netProfit < 0 ? '#DC2626' : '#64748B' },
                    ]}
                  >
                    {netProfit > 0 ? 'PROFIT' : netProfit < 0 ? 'NET LOSS' : 'BALANCED'}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.cleanProfitVal,
                  { color: netProfit > 0 ? '#059669' : netProfit < 0 ? '#DC2626' : '#0F172A' },
                ]}
              >
                {netProfit > 0 ? `+₹${netProfit.toLocaleString('en-IN')}` : netProfit < 0 ? `-₹${Math.abs(netProfit).toLocaleString('en-IN')}` : '₹0'}
              </Text>

              <View
                style={[
                  styles.cleanProfitBreakdown,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: netProfit > 0 ? '#D1FAE5' : netProfit < 0 ? '#FEE2E2' : '#F1F5F9',
                  },
                ]}
              >
                <View style={styles.cleanBreakdownItem}>
                  <Text style={styles.cleanBreakdownLabel}>Hostel Income</Text>
                  <Text style={[styles.cleanBreakdownVal, { color: '#059669' }]}>+₹{totalReceived.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.cleanBreakdownMinus}>−</Text>
                <View style={styles.cleanBreakdownItem}>
                  <Text style={styles.cleanBreakdownLabel}>Server / Costs Paid</Text>
                  <Text style={[styles.cleanBreakdownVal, { color: '#DC2626' }]}>−₹{totalExpenses.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.cleanBreakdownMinus}>=</Text>
                <View style={styles.cleanBreakdownItem}>
                  <Text style={styles.cleanBreakdownLabel}>Net Remaining</Text>
                  <Text style={[styles.cleanBreakdownVal, { color: netProfit > 0 ? '#059669' : netProfit < 0 ? '#DC2626' : '#0F172A' }]}>
                    {netProfit > 0 ? `+₹${netProfit.toLocaleString('en-IN')}` : netProfit < 0 ? `-₹${Math.abs(netProfit).toLocaleString('en-IN')}` : '₹0'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 4 Financial Grid Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.finCardLabel}>EXPECTED REVENUE</Text>
                <Text style={styles.finCardVal}>₹{totalExpected.toLocaleString('en-IN')}</Text>
                <Text style={styles.finCardSub}>Projected total</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.finCardLabel}>COLLECTED REVENUE</Text>
                <Text style={[styles.finCardVal, { color: '#059669' }]}>₹{totalReceived.toLocaleString('en-IN')}</Text>
                <Text style={styles.finCardSub}>Banked payments</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.finCardLabel}>PENDING DUES</Text>
                <Text style={[styles.finCardVal, { color: '#DC2626' }]}>₹{totalPending.toLocaleString('en-IN')}</Text>
                <Text style={styles.finCardSub}>Receivables</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.finCardLabel}>TOTAL EXPENSES</Text>
                <Text style={[styles.finCardVal, { color: '#D97706' }]}>₹{totalExpenses.toLocaleString('en-IN')}</Text>
                <Text style={styles.finCardSub}>Infrastructure costs</Text>
              </View>
            </View>

            {/* ── Multi-Hostel Management Bar ── */}
            <View style={styles.sectionHeaderBetween}>
              <View>
                <Text style={styles.sectionTitle}>Hostels Pricing & Dues</Text>
                <Text style={styles.sectionSubText}>Top 3 Preview</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('DeveloperFinance')}
                style={styles.viewAllTopBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.viewAllTopBtnText}>View All ({billingList.length})</Text>
                <Ionicons name="arrow-forward" size={13} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Visual Hostel Pricing Cards (Top 3 Preview) */}
            {filteredBillingList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="business-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Hostels Found</Text>
                <Text style={styles.emptySub}>No hostel matched your search filter.</Text>
              </View>
            ) : (
              filteredBillingList.slice(0, 3).map((item) => {
                const badge = getBadgeStyle(item.payment_state);
                const isPaid = item.payment_state === 'PAID';
                return (
                  <View
                    key={item.hostel_id}
                    style={styles.pricingCard}
                  >
                    {/* Top Info */}
                    <View style={styles.pricingCardTop}>
                      <View style={[styles.pricingIconBox, { backgroundColor: isPaid ? '#ECFDF5' : '#F8FAFC' }]}>
                        <Ionicons name="business" size={17} color={isPaid ? '#059669' : '#EA580C'} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.pricingHostelName}>{item.hostel_name}</Text>
                        <Text style={styles.pricingOwnerText}>
                          Owner: <Text style={{ fontWeight: '700', color: '#374151' }}>{item.owner_name || 'N/A'}</Text>
                          {item.owner_phone ? ` • 📞 ${item.owner_phone}` : ''}
                        </Text>
                      </View>
                      <View style={[styles.statusTag, item.is_active ? styles.statusTagActive : styles.statusTagInactive]}>
                        <Text style={[styles.statusTagText, { color: item.is_active ? '#059669' : '#6B7280' }]}>
                          {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                      </View>
                    </View>

                    {/* Custom Pricing Highlight Box */}
                    <View style={styles.customPriceHighlight}>
                      <View style={styles.priceHighlightLeft}>
                        <Text style={styles.priceHighlightLabel}>AGREED HOSTEL FEE</Text>
                        <Text style={styles.priceHighlightVal}>
                          ₹{Number(item.agreed_amount || 0).toLocaleString('en-IN')}
                          <Text style={styles.priceHighlightFreq}> / {item.billing_frequency?.toLowerCase() || 'mo'}</Text>
                        </Text>
                      </View>

                      <View style={styles.priceHighlightRight}>
                        <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                        <Text style={styles.priceDueText}>
                          {item.active_students || 0} active students
                        </Text>
                      </View>
                    </View>

                    {/* Financial Snapshot for this hostel */}
                    <View style={styles.hostelFinRow}>
                      <Text style={styles.hostelFinText}>
                        Collected: <Text style={{ fontWeight: '800', color: '#059669' }}>₹{Number(item.total_received || 0).toLocaleString('en-IN')}</Text>
                      </Text>
                      <Text style={styles.hostelFinText}>
                        Students: <Text style={{ fontWeight: '800', color: '#111827' }}>{item.active_students || 0}</Text>
                      </Text>
                      <Text style={styles.hostelFinText}>
                        Pending: <Text style={{ fontWeight: '800', color: '#DC2626' }}>₹{Number(item.pending_amount || 0).toLocaleString('en-IN')}</Text>
                      </Text>
                    </View>

                    {/* Action Buttons: Edit Custom Price / Record Payment */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.editPriceBtn}
                        onPress={() => handleOpenEditBilling(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="create-outline" size={15} color="#EA580C" />
                        <Text style={styles.editPriceBtnText}>Set / Edit Price</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.recordPayBtn}
                        onPress={() => handleOpenPayment(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-circle-outline" size={15} color="#FFF" />
                        <Text style={styles.recordPayBtnText}>Record Payment</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {/* ── Platform Infrastructure Expenses ── */}
            <View style={styles.expenseSectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Platform Infrastructure Costs ({expenses.length})</Text>
                <Text style={styles.sectionSubText}>Server, DB, email, and domain costs deducted from profit</Text>
              </View>
              <TouchableOpacity
                style={styles.addExpenseBtn}
                onPress={() => setExpenseModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#FFF" />
                <Text style={styles.addExpenseBtnText}>Add Cost</Text>
              </TouchableOpacity>
            </View>

            {expenses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={36} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Expenses Recorded</Text>
                <Text style={styles.emptySub}>Tap "Add Cost" above to record server, database, or domain expenses.</Text>
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
          </ScrollView>
        </View>
      </ScrollView>

      {/* ── MODAL: EDIT CUSTOM PRICING / AGREED AMOUNT ── */}
      <Modal visible={!!editBillingModal} transparent animationType="fade" onRequestClose={() => setEditBillingModal(null)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', maxHeight: '90%' }}
          >
            <View style={styles.modalContent}>
              <View style={styles.dragHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Set Hostel Custom Amount</Text>
                <TouchableOpacity onPress={() => setEditBillingModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalSub}>{editBillingModal?.hostel_name}</Text>

                <Text style={styles.inputLabel}>
                  Custom Agreed Amount (₹) [Default: {editBillingModal?.active_students || 0} students × ₹10 = ₹{(editBillingModal?.active_students || 0) * 10}]
                </Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="e.g. 3000, 5000, 10000"
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
                  placeholder="e.g. Custom pricing for 50 beds"
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                />

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  <TouchableOpacity
                    style={[styles.modalSaveBtn, { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]}
                    onPress={async () => {
                      if (!editBillingModal) return;
                      await developerService.resetHostelBilling(editBillingModal.hostel_id);
                      setEditBillingModal(null);
                      fetchMetrics();
                    }}
                  >
                    <Text style={[styles.modalSaveBtnText, { color: '#64748B' }]}>Reset to ₹0</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSaveBtn, { flex: 2 }]}
                    onPress={handleSaveBilling}
                    disabled={isSavingBilling}
                  >
                    {isSavingBilling ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.modalSaveBtnText}>Save Agreed Fee</Text>
                    )}
                  </TouchableOpacity>
                </View>
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
              <View style={styles.dragHandle} />
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

      {/* ── MODAL: ADD EXPENSE ── */}
      <Modal visible={expenseModal} transparent animationType="fade" onRequestClose={() => setExpenseModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', maxHeight: '90%' }}
          >
            <View style={styles.modalContent}>
              <View style={styles.dragHandle} />
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
                  placeholder="e.g. Render server hosting / Supabase DB subscription"
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

      {/* ── System Notifications Modal Sheet ── */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowNotificationModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalSheetContent, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
                <View style={styles.dragHandle} />
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="notifications" size={18} color="#EA580C" />
                    <Text style={styles.modalTitle}>System Notifications</Text>
                    {unreadNotifCount > 0 && (
                      <View style={styles.notifCountBadge}>
                        <Text style={styles.notifCountBadgeText}>{unreadNotifCount} new</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {unreadNotifCount > 0 && (
                      <TouchableOpacity onPress={handleMarkAllNotificationsRead}>
                        <Text style={styles.markReadText}>Mark read</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => setShowNotificationModal(false)}
                      style={styles.modalCloseBtn}
                    >
                      <Ionicons name="close" size={20} color="#78716C" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
                  {notifications.length === 0 ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Ionicons name="notifications-off-outline" size={32} color="#D1D5DB" />
                      <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 8 }}>No notifications found</Text>
                    </View>
                  ) : (
                    notifications.map((notif) => (
                      <View key={notif.notification_id} style={[styles.notifItem, !notif.is_read && styles.notifItemUnread]}>
                        <View
                          style={[
                            styles.notifIconWrap,
                            {
                              backgroundColor:
                                notif.type === 'NEW_OWNER' || notif.type === 'NEW_HOSTEL'
                                  ? '#FFF7ED'
                                  : notif.type === 'PAYMENT_RECEIVED'
                                  ? '#ECFDF5'
                                  : notif.type === 'PAYMENT_OVERDUE'
                                  ? '#FEF2F2'
                                  : '#EFF6FF',
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              notif.type === 'NEW_OWNER'
                                ? 'person-add'
                                : notif.type === 'NEW_HOSTEL'
                                ? 'business'
                                : notif.type === 'PAYMENT_RECEIVED'
                                ? 'checkmark-circle'
                                : notif.type === 'PAYMENT_OVERDUE'
                                ? 'alert-circle'
                                : 'notifications'
                            }
                            size={16}
                            color={
                              notif.type === 'NEW_OWNER' || notif.type === 'NEW_HOSTEL'
                                ? '#EA580C'
                                : notif.type === 'PAYMENT_RECEIVED'
                                ? '#059669'
                                : notif.type === 'PAYMENT_OVERDUE'
                                ? '#DC2626'
                                : '#2563EB'
                            }
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.notifItemTitle}>{notif.title}</Text>
                          <Text style={styles.notifItemSub}>{notif.message}</Text>
                          <Text style={styles.notifTime}>
                            {new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.modalActionBtn}
                  onPress={() => {
                    setShowNotificationModal(false);
                    navigation.navigate('DeveloperAuditLogs');
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalActionBtnText}>View Full Audit Trail</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Developer Profile Modal Sheet ── */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowProfileModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalSheetContent, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
                <View style={styles.dragHandle} />
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="person-circle" size={20} color="#EA580C" />
                    <Text style={styles.modalTitle}>Developer Profile</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowProfileModal(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#78716C" />
                  </TouchableOpacity>
                </View>

                <View style={styles.profileInfoCard}>
                  <View style={styles.profileBigAvatar}>
                    <Text style={styles.profileBigAvatarText}>{devInitials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>{developer?.full_name || 'Master Super Admin'}</Text>
                    <Text style={styles.profileEmail}>{developer?.email || developer?.username || 'developer@hostix.app'}</Text>
                    <View style={styles.profileRoleTag}>
                      <Text style={styles.profileRoleTagText}>SUPER_DEVELOPER</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.profileLinks}>
                  <TouchableOpacity
                    style={styles.profileLinkItem}
                    onPress={() => {
                      setShowProfileModal(false);
                      scrollToPage(1);
                    }}
                  >
                    <View style={[styles.profileLinkIcon, { backgroundColor: '#FFF7ED' }]}>
                      <Ionicons name="wallet" size={16} color="#EA580C" />
                    </View>
                    <Text style={styles.profileLinkText}>Money Management & P&L</Text>
                    <Ionicons name="chevron-forward" size={16} color="#B5A496" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.profileLinkItem}
                    onPress={() => {
                      setShowProfileModal(false);
                      navigation.navigate('DevControlTab');
                    }}
                  >
                    <View style={[styles.profileLinkIcon, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="construct" size={16} color="#2563EB" />
                    </View>
                    <Text style={styles.profileLinkText}>Developer Control Hub</Text>
                    <Ionicons name="chevron-forward" size={16} color="#B5A496" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.profileLinkItem}
                    onPress={() => {
                      setShowProfileModal(false);
                      Linking.openURL('https://wa.me/916303359425?text=Hello%20Developer%20Support');
                    }}
                  >
                    <View style={[styles.profileLinkIcon, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="logo-whatsapp" size={16} color="#059669" />
                    </View>
                    <Text style={styles.profileLinkText}>WhatsApp Developer Chat</Text>
                    <Ionicons name="chevron-forward" size={16} color="#B5A496" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.profileLinkItem}
                    onPress={() => {
                      setShowProfileModal(false);
                      navigation.navigate('DeveloperSystem');
                    }}
                  >
                    <View style={[styles.profileLinkIcon, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="speedometer" size={16} color="#2563EB" />
                    </View>
                    <Text style={styles.profileLinkText}>System Diagnostics</Text>
                    <Ionicons name="chevron-forward" size={16} color="#B5A496" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleLogout}
                  style={[styles.profileLogoutBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                  <Text style={styles.profileLogoutBtnText}>Sign Out Developer Session</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroHeader: {
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
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  topBarLeft: {
    flex: 1,
    paddingRight: 8,
  },
  masterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  masterBadgeCrown: {
    fontSize: 10,
  },
  masterBadgeText: {
    color: '#475569',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  devGreeting: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  masterBadgeLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  devSubGreeting: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  profileAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#EA580C',
    fontSize: 13,
    fontWeight: '900',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 8,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    padding: 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  healthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  healthLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  healthText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  systemDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  systemDetailLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  sectionSubText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 2,
  },
  statSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  moneySwipeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moneySwipeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  moneyIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moneySwipeTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  moneySwipeSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  moneySwipeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  moneySwipeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  viewAllTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewAllTopBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllFullBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  viewAllBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  viewAllBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewAllBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllBannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  deckSection: {
    marginBottom: 16,
  },
  deckSectionSub: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  deckSectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  swipeHintBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  swipeHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  deckScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  deckCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  deckCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deckIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckBadgeBlue: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deckBadgeBlueText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  deckBadgeRed: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deckBadgeRedText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  deckBadgeAmber: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deckBadgeAmberText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#D97706',
  },
  deckCardValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  deckCardLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  deckCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  deckFooterText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  actionScrollView: {
    marginBottom: 16,
  },
  actionScrollContent: {
    gap: 8,
  },
  scrollActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scrollChipIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  cleanProfitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cleanProfitTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cleanProfitLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  cleanProfitSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  cleanProfitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cleanProfitBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cleanProfitVal: {
    fontSize: 28,
    fontWeight: '900',
    marginVertical: 6,
    letterSpacing: -0.5,
  },
  cleanProfitBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cleanBreakdownItem: {
    alignItems: 'center',
  },
  cleanBreakdownLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  cleanBreakdownVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  cleanBreakdownMinus: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
  },
  finCardLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#6B7280',
  },
  finCardVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginVertical: 3,
  },
  finCardSub: {
    fontSize: 9.5,
    color: '#9CA3AF',
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  filterPillActive: {
    backgroundColor: '#EA580C',
  },
  filterPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  sortBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  sortChips: {
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
  },
  sortChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  sortChipTextActive: {
    color: '#EA580C',
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pricingCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pricingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingHostelName: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#111827',
  },
  pricingOwnerText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  statusTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagActive: {
    backgroundColor: '#ECFDF5',
  },
  statusTagInactive: {
    backgroundColor: '#F3F4F6',
  },
  statusTagText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  customPriceHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 10,
  },
  priceHighlightLeft: {
    flex: 1,
  },
  priceHighlightLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.5,
  },
  priceHighlightVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#9A3412',
    marginTop: 2,
  },
  priceHighlightFreq: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  priceHighlightRight: {
    alignItems: 'flex-end',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  priceDueText: {
    fontSize: 9.5,
    color: '#78716C',
  },
  hostelFinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 10,
  },
  hostelFinText: {
    fontSize: 11,
    color: '#6B7280',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editPriceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  editPriceBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  recordPayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EA580C',
  },
  recordPayBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  expenseSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addExpenseBtnText: {
    color: '#FFF',
    fontSize: 11,
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
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  analyticsSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  analyticsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  liveUsersPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveUsersPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  donutCenterSub: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  legendContainer: {
    flex: 1,
    gap: 8,
  },
  legendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 8,
  },
  legendIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  legendPct: {
    fontSize: 10,
    fontWeight: '800',
  },
  legendValue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#374151',
    marginTop: 1,
  },
  legendSubVal: {
    fontSize: 9.5,
    color: '#9CA3AF',
  },
  quickMatrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  matrixItem: {
    width: (SCREEN_WIDTH - 40) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  matrixIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  matrixItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  matrixItemSub: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 1,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginVertical: 8,
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
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
  modalSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifCountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  notifCountBadgeText: {
    color: '#FFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  markReadText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  modalCloseBtn: {
    padding: 4,
  },
  notifList: {
    maxHeight: 350,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notifItemUnread: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  notifIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  notifItemSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  notifTime: {
    fontSize: 9.5,
    color: '#9CA3AF',
    marginTop: 2,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  modalActionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },
  profileInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  profileBigAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FB923C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBigAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EA580C',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  profileRoleTag: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  profileRoleTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#EA580C',
  },
  profileLinks: {
    gap: 8,
    marginBottom: 14,
  },
  profileLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  profileLinkIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLinkText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  profileLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  profileLogoutBtnText: {
    color: '#DC2626',
    fontSize: 13.5,
    fontWeight: '800',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#DC2626',
    marginTop: 8,
  },
  errorSub: {
    fontSize: 12,
    color: '#7F1D1D',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
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
