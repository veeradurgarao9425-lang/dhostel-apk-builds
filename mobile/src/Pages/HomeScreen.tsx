import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, RefreshControl, Animated,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ProfileMenu } from '../components/ProfileMenu';
import { AppHeader } from '../components/AppHeader';
import { HeaderNotification } from '../components/HeaderNotification';
import { toLocalDateStr } from '../utils/dateUtils';
import { useRefresh } from '../../contexts/RefreshContext';
import { useTranslation } from 'react-i18next';
import { TenantAppCard } from '../components/TenantAppCard';

// ─── Initial state ────────────────────────────────────────────────────────────
const INITIAL_STATE = {
    hostelName: '',
    hostelCode: '',
    monthAmount: 0,
    monthDue: 0,
    pendingAmount: 0,
    totalDuesAmount: 0,
    occupiedBeds: 0,
    totalBeds: 0,
    availableBeds: 0,
    todayAmount: 0,
    activeTenants: 0,
    leftTenants: 0,
    unpaidStudents: [] as any[],
    upcomingDues: [] as any[],
    totalRooms: 0,
    availableRooms: 0,
    occupancyRate: 0,
    prebookingsCount: 0,
    noticesCount: 0,
    newAdmissionsCount: 0,
    monthlyExpenses: 0,
    staffCount: 0,
    latestNotice: null as any,
    revenueTrend: [] as any[],
    upcomingVacates: [] as any[],
    unallocatedCount: 0,
    qrRegisterCount: 0,
    openComplaintsCount: 0,
    collectionStats: {
        totalExpected: 0,
        collected: 0,
        pending: 0,
        overdueCount: 0,
        dueTodayCount: 0,
        dueThisWeekCount: 0,
        paidCount: 0,
        tenantsCount: 0,
        monthName: ''
    }
};

// ─── Greeting helper ──────────────────────────────────────────────────────────
const getGreetingKey = () => {
    const h = new Date().getHours();
    if (h < 12) return 'dashboard.greetingMorning';
    if (h < 17) return 'dashboard.greetingAfternoon';
    return 'dashboard.greetingEvening';
};

// ─── Quick Management Actions ─────────────────────────────────────────────────
const QUICK_ACTIONS = [
    { label: 'Add Tenant', icon: 'person-add-outline', color: '#7C3AED', bg: '#EDE9FE', route: 'AddStudent' },
    { label: 'Pre-Book', icon: 'calendar-outline', color: '#F97316', bg: '#FFF7ED', route: 'PreBooking' },
    { label: 'Collected Rent', icon: 'wallet-outline', color: '#0D9488', bg: '#CCFBF1', route: 'CollectedPayments' },
    { label: 'Add Expense', icon: 'card-outline', color: '#D97706', bg: '#FEF3C7', route: 'AddExpense' },
    { label: 'Complaints', icon: 'construct-outline', color: '#DC2626', bg: '#FEE2E2', route: 'ComplaintsManagement' },
    { label: 'Bills', icon: 'document-text-outline', color: '#EA580C', bg: '#FFEDD5', route: 'BillReminders' },
    { label: 'Mess Menu', icon: 'restaurant-outline', color: '#059669', bg: '#D1FAE5', route: 'MessMenuManagement' },
    { label: 'Staff', icon: 'people-outline', color: '#059669', bg: '#D1FAE5', route: 'AddStaff' },
];

const getQuickActionLabelKey = (label: string) => {
    if (label === 'Add Tenant') return 'dashboard.addTenant';
    if (label === 'Pre-Book') return 'dashboard.preBook';
    if (label === 'Add Receipt') return 'dashboard.addReceipt';
    if (label === 'Collected Rent') return 'dashboard.collectedRent';
    if (label === 'Add Expense') return 'dashboard.addExpense';
    if (label === 'Bills') return 'dashboard.bills';
    if (label === 'Staff') return 'dashboard.staff';
    if (label === 'Reminders') return 'dashboard.reminders';
    return label;
};

// ─── Skeleton Block ───────────────────────────────────────────────────────────
const Skeleton = ({ style }: { style?: any }) => (
    <View style={[{ backgroundColor: '#E9D5FF', borderRadius: 8, opacity: 0.5 }, style]} />
);

// ─── Simple bar chart using plain Views ───────────────────────────────────────
const RevenueBar = ({ amount, maxAmount, month, isCurrent }: any) => {
    const barH = Math.max(6, Math.round((amount / Math.max(maxAmount, 1)) * 72));
    return (
        <View style={bc.column}>
            <Text style={[bc.topLabel, isCurrent && { color: '#EA580C' }]}>
                {amount > 0 ? (amount >= 1000 ? `₹${(amount / 1000).toFixed(0)}k` : `₹${amount}`) : ''}
            </Text>
            <View style={bc.barWrap}>
                <View
                    style={[
                        bc.bar,
                        {
                            height: barH,
                            backgroundColor: isCurrent ? '#EA580C' : '#FFEDD5',
                            borderRadius: isCurrent ? 6 : 4,
                        },
                    ]}
                />
            </View>
            <Text style={[bc.month, isCurrent && { color: '#EA580C', fontWeight: '800' }]}>
                {month}
            </Text>
        </View>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomeScreen() {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();
    const [data, setData] = useState(INITIAL_STATE);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [backgroundLoading, setBackgroundLoading] = useState(false);
    const isFirstLoadRef = React.useRef(true);

    const pulseValue = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseValue, {
                    toValue: 1.12,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseValue, {
                    toValue: 1.0,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // ── Data loader ───────────────────────────────────────────────────────────
    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh && isFirstLoadRef.current) {
                setLoading(true);
            } else if (!isRefresh) {
                setBackgroundLoading(true);
            }
            setHasError(false);

            const [statsRes, summaryRes, hostelRes, noticeRes, overviewRes, studentsRes, complaintsRes]: any = await Promise.all([
                api.get('/reports/dashboard-stats').catch(() => ({ data: { success: false } })),
                api.get('/monthly-fees/summary').catch(() => ({ data: { success: false } })),
                user?.hostel_id
                    ? api.get(`/hostels/${user.hostel_id}`).catch(() => ({ data: { success: false } }))
                    : Promise.resolve({ data: { success: false } }),
                api.get('/notices').catch(() => ({ data: { success: false } })),
                api.get('/reports/monthly-overview').catch(() => ({ data: { success: false } })),
                api.get('/students?limit=250').catch(() => ({ data: { success: false } })),
                user?.hostel_id
                    ? api.get(`/complaints/hostel/${user.hostel_id}`).catch(() => ({ data: { success: false } }))
                    : Promise.resolve({ data: { success: false } })
            ]);

            if (!statsRes.data.success && !summaryRes.data.success) {
                setHasError(true);
                return;
            }

            const d2 = statsRes.data.data || {};
            const monthCollected = (d2.monthlyRentCollected ?? d2.feeCollection ?? 0) as number;
            const monthPending = (d2.monthlyRentPending ?? d2.pendingDuesAmount ?? 0) as number;
            const monthDue = (d2.monthlyRentDue ?? (monthCollected + monthPending)) as number;
            const occupied = d2.occupiedBeds || 0;
            const total = d2.totalBeds || 0;
            const monthlyOverview = overviewRes.data?.success ? overviewRes.data.data : null;
            const currentMonthRevenue = Number(monthlyOverview?.currentMonth?.totalIncome ?? monthCollected ?? 0);

            // Build top 5 defaulters list and upcoming dues
            let topDefaulters: any[] = [];
            let upcomingDuesList: any[] = [];
            if (summaryRes.data.success && summaryRes.data.data?.fees) {
                const fees: any[] = summaryRes.data.data.fees;
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                // Group by student ID to prevent duplicates
                const studentMap = new Map();

                fees
                    .filter(f =>
                        (f.balance || 0) > 0 &&
                        !['paid', 'fully paid'].includes((f.fee_status || '').toLowerCase()),
                    )
                    .forEach(f => {
                        const due = f.due_date ? new Date(f.due_date) : new Date();
                        due.setHours(0, 0, 0, 0);
                        const diffDays = Math.floor((now.getTime() - due.getTime()) / 86400000);

                        const id = f.student_id;
                        if (!studentMap.has(id)) {
                            studentMap.set(id, {
                                id: id,
                                name: `${f.first_name || ''} ${f.last_name || ''}`.trim(),
                                amount: 0,
                                phone: f.phone,
                                isOverdue: false,
                                daysLate: 0,
                                daysLeft: 9999, // default large number
                            });
                        }

                        const s = studentMap.get(id);
                        s.amount += parseFloat(f.balance || 0);

                        if (diffDays > 0) {
                            s.isOverdue = true;
                            if (diffDays > s.daysLate) s.daysLate = diffDays;
                        } else {
                            const left = Math.abs(diffDays);
                            if (left < s.daysLeft) s.daysLeft = left;
                        }
                    });

                const mappedFees = Array.from(studentMap.values());

                topDefaulters = mappedFees
                    .filter(f => f.isOverdue)
                    .sort((a, b) => b.daysLate - a.daysLate || b.amount - a.amount)
                    .slice(0, 5);

                upcomingDuesList = mappedFees
                    .filter(f => !f.isOverdue && f.daysLeft <= 3 && f.daysLeft >= 0)
                    .sort((a, b) => a.daysLeft - b.daysLeft)
                    .slice(0, 5);
            }

            // Build collection stats picture
            const collectionStats = {
                totalExpected: 0, collected: 0, pending: 0, overdueAmount: 0,
                overdueCount: 0, dueTodayCount: 0, dueThisWeekCount: 0,
                paidCount: 0, tenantsCount: 0, monthName: ''
            };
            if (summaryRes.data.success && summaryRes.data.data?.fees) {
                const fees: any[] = summaryRes.data.data.fees;
                collectionStats.tenantsCount = fees.length;

                const now = new Date();
                now.setHours(0, 0, 0, 0);
                collectionStats.monthName = now.toLocaleString('en-IN', { month: 'long' });

                fees.forEach(f => {
                    const balance = parseFloat(f.balance || 0);
                    const paid = parseFloat(f.paid_amount || 0);
                    const totalDue = balance + paid;

                    collectionStats.totalExpected += totalDue;
                    collectionStats.collected += paid;
                    collectionStats.pending += balance;

                    if (balance <= 0) {
                        collectionStats.paidCount++;
                    } else {
                        const due = f.due_date ? new Date(f.due_date) : new Date();
                        due.setHours(0, 0, 0, 0);
                        const diffDays = Math.floor((due.getTime() - now.getTime()) / 86400000);

                        if (diffDays < 0) {
                            collectionStats.overdueCount++;
                            collectionStats.overdueAmount += balance;
                        } else if (diffDays === 0) {
                            collectionStats.dueTodayCount++;
                        } else if (diffDays > 0 && diffDays <= 7) {
                            collectionStats.dueThisWeekCount++;
                        }
                    }
                });
            }

            const activeNotice = noticeRes.data?.success && noticeRes.data.data?.length > 0
                ? noticeRes.data.data[0]
                : null;

            const upcomingVacates = studentsRes.data?.success
                ? (studentsRes.data.data || [])
                    .filter((s: any) => s.vacate_notice_date !== null && s.vacate_notice_date !== undefined && s.status === 1 && s.room_id != null)
                    .sort((a: any, b: any) => a.vacate_notice_date.localeCompare(b.vacate_notice_date))
                    .slice(0, 3)
                    .map((s: any) => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const diff = new Date(s.vacate_notice_date).getTime() - new Date(todayStr).getTime();
                        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        return {
                            student_id: s.student_id,
                            name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                            room_number: s.room_number,
                            vacate_date: s.vacate_notice_date,
                            daysLeft: days,
                            reason: s.vacate_notice_reason
                        };
                    })
                : [];

            const activeStudents = studentsRes.data?.success ? (studentsRes.data.data || []) : [];
            const unallocatedCount = activeStudents.filter((s: any) => s.status === 1 && !s.room_id).length;
            const qrRegisterCount = activeStudents.filter((s: any) => s.status === 3).length;
            const allComplaints = complaintsRes.data?.success ? (complaintsRes.data.complaints || []) : [];
            const openComplaintsCount = allComplaints.filter((c: any) => c.status === 'Open' || c.status === 'In Progress').length;

            setData({
                hostelName: user?.hostel_name || d2.hostel_name || hostelRes?.data?.data?.hostel_name || 'My Hostel',
                hostelCode: (user as any)?.hostel_code || (d2 as any)?.hostel_code || hostelRes?.data?.data?.hostel_code || hostelRes?.data?.data?.code || 'STAYVIX',
                monthAmount: currentMonthRevenue,
                monthDue,
                pendingAmount: monthPending,
                totalDuesAmount: d2.pendingDuesAmount || 0,
                occupiedBeds: occupied,
                totalBeds: total,
                availableBeds: total - occupied,
                todayAmount: d2.todayRent || 0,
                activeTenants: occupied,
                leftTenants: d2.leftTenants || d2.vacatedStudents || 0,
                unpaidStudents: topDefaulters,
                upcomingDues: upcomingDuesList,
                totalRooms: d2.totalRooms || 0,
                availableRooms: d2.availableRooms || 0,
                occupancyRate: d2.occupancyRate || 0,
                prebookingsCount: d2.prebookingsCount || 0,
                noticesCount: d2.noticesCount || 0,
                newAdmissionsCount: d2.newAdmissionsCount || 0,
                monthlyExpenses: d2.monthlyExpenses || 0,
                staffCount: d2.staffCount || 0,
                latestNotice: activeNotice,
                revenueTrend: overviewRes.data?.success && overviewRes.data.data?.trend ? overviewRes.data.data.trend : [],
                upcomingVacates,
                unallocatedCount,
                qrRegisterCount,
                openComplaintsCount,
                collectionStats,
            });
            isFirstLoadRef.current = false;
        } catch {
            setHasError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setBackgroundLoading(false);
        }
    }, [user, user?.hostel_id]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    // ── Also refresh when any mutation screen signals a data change ────────────
    const { refreshCounter } = useRefresh();
    useEffect(() => {
        if (refreshCounter > 0) {
            load();
        }
    }, [refreshCounter]);

    // ── Quick action press handler ────────────────────────────────────────────
    const handleQuickAction = (a: typeof QUICK_ACTIONS[0]) => {
        navigation.navigate(a.route);
    };

    // ── Revenue chart data (real trend data from backend) ──
    const currentMonthIdx = new Date().getMonth(); // 0-based
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hasRealTrend = data.revenueTrend && data.revenueTrend.length > 0;
    // Only ever show REAL data. When the backend has no trend yet, plot real
    // zeros for past months and the actual current-month figure — never invent
    // numbers for a business owner to act on.
    const revenueData = hasRealTrend
        ? data.revenueTrend.slice(-6).map((t: any) => ({
            month: t.monthLabel,
            amount: t.income || 0,
            isCurrent: t.month === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        }))
        : Array.from({ length: 6 }, (_, i) => {
            const mIdx = (currentMonthIdx - 5 + i + 12) % 12;
            const isCurrent = i === 5;
            return {
                month: MONTH_NAMES[mIdx],
                amount: isCurrent ? data.monthAmount : 0,
                isCurrent,
            };
        });
    const maxRevenue = Math.max(...revenueData.map(r => r.amount), 1);

    // ─── Format currency compactly ───────────────────────────────────────────
    const fmt = (n: number) => {
        if (n >= 10000000) { // 1 Crore
            return `₹${(n / 10000000).toFixed(1)}Cr`;
        }
        if (n >= 100000) { // 1 Lakh
            return `₹${(n / 100000).toFixed(1)}L`;
        }
        if (n >= 1000) {
            return `₹${(n / 1000).toFixed(1)}k`;
        }
        return `₹${n.toLocaleString('en-IN')}`;
    };

    // ─── Avatar initial ──────────────────────────────────────────────────────
    const avatarLetter = (name: string) => (name || 'T')[0].toUpperCase();

    // ── Loading Screen ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[s.root, { backgroundColor: theme.background }]}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.headerSkeleton}>
                    <View style={s.skHeaderRow}>
                        <View>
                            <Skeleton style={{ width: 100, height: 12, marginBottom: 6 }} />
                            <Skeleton style={{ width: 160, height: 22 }} />
                        </View>
                        <Skeleton style={{ width: 40, height: 40, borderRadius: 20 }} />
                    </View>
                </LinearGradient>
                <View style={{ padding: 16, gap: 14 }}>
                    <Skeleton style={{ height: 110, borderRadius: 18 }} />
                    <Skeleton style={{ height: 90, borderRadius: 18 }} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Skeleton style={{ flex: 1, height: 90, borderRadius: 18 }} />
                        <Skeleton style={{ flex: 1, height: 90, borderRadius: 18 }} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Skeleton style={{ flex: 1, height: 90, borderRadius: 18 }} />
                        <Skeleton style={{ flex: 1, height: 90, borderRadius: 18 }} />
                    </View>
                </View>
            </View>
        );
    }

    // ── Error Screen ──────────────────────────────────────────────────────────
    if (hasError) {
        return (
            <View style={[s.root, { backgroundColor: theme.background }]}>
                <StatusBar barStyle="light-content" />
                <AppHeader
                    title={`${t(getGreetingKey())},`}
                    subtitle={(user?.full_name || 'Owner').split(' ')[0]}
                    showBack={navigation.canGoBack()}
                    rightComponent={
                        <HeaderNotification navigation={navigation} />
                    }
                />
                <View style={s.errorCenter}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>📡</Text>
                    <Text style={[s.errorTitle, { color: theme.textPrimary }]}>{t('dashboard.serverWaking')}</Text>
                    <Text style={[s.errorSub, { color: theme.textSecondary }]}>
                        {t('dashboard.serverStarting')}
                    </Text>
                    <TouchableOpacity
                        style={s.retryBtn}
                        onPress={() => load()}
                        activeOpacity={0.85}
                    >
                        <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.retryGrad}>
                            <Text style={s.retryText}>↺  {t('dashboard.retry')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Main Dashboard ────────────────────────────────────────────────────────
    return (
        <View style={[s.root, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />

            {/* ─────────────────── FIXED HEADER ─────────────────── */}
            <AppHeader
                title={`${t(getGreetingKey())}`}
                subtitle={user?.full_name || 'Admin'}
                showBack={false}
                alignLeft={true}
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                }
            >
                <View style={{ marginTop: -2 }}>
                    <Text style={s.hostelSubText}>{data.hostelName}</Text>
                </View>
            </AppHeader>

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 110 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); load(true); }}
                        tintColor={theme.primary}
                    />
                }
            >
                <View style={s.body}>

                    {/* Unallocated Tenants warning card */}
                    {data.unallocatedCount > 0 && (
                        <TouchableOpacity
                            style={[
                                s.card,
                                {
                                    backgroundColor: isDark ? '#3B1A1A' : '#FEF2F2',
                                    borderColor: '#FCA5A5',
                                    borderWidth: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: 14,
                                    marginBottom: 16,
                                    borderRadius: 16,
                                }
                            ]}
                            onPress={() => {
                                navigation.navigate('Students', { filterUnallocated: true });
                            }}
                            activeOpacity={0.8}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="alert-circle" size={20} color="#DC2626" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: '800', fontSize: 14, color: isDark ? '#FECACA' : '#991B1B' }}>
                                        {data.unallocatedCount} {data.unallocatedCount === 1 ? 'Tenant needs room allocation' : 'Tenants need room allocation'}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: isDark ? '#FCA5A5' : '#EF4444', marginTop: 2 }}>
                                        Tap to allocate rooms
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#DC2626" />
                        </TouchableOpacity>
                    )}

                    {/* QR Signups warning card */}
                    {data.qrRegisterCount > 0 && (
                        <TouchableOpacity
                            style={[
                                s.card,
                                {
                                    backgroundColor: isDark ? '#1A3038' : '#F0F9FF',
                                    borderColor: '#BAE6FD',
                                    borderWidth: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: 14,
                                    marginBottom: 16,
                                    borderRadius: 16,
                                }
                            ]}
                            onPress={() => {
                                navigation.navigate('Students', { filter: 'QRRegister' });
                            }}
                            activeOpacity={0.8}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="person-add" size={20} color="#0284C7" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: '800', fontSize: 14, color: isDark ? '#E0F2FE' : '#0369A1' }}>
                                        {data.qrRegisterCount} {data.qrRegisterCount === 1 ? 'New Registration Awaiting Approval' : 'New Registrations Awaiting Approval'}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: isDark ? '#BAE6FD' : '#0284C7', marginTop: 2 }}>
                                        Tap to review and approve signups
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#0284C7" />
                        </TouchableOpacity>
                    )}

                    {/* Open Complaints warning card */}
                    {data.openComplaintsCount > 0 && (
                        <TouchableOpacity
                            style={[
                                s.card,
                                {
                                    backgroundColor: isDark ? '#2D1A0E' : '#FFF7ED',
                                    borderColor: '#FED7AA',
                                    borderWidth: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: 14,
                                    marginBottom: 16,
                                    borderRadius: 16,
                                }
                            ]}
                            onPress={() => {
                                navigation.navigate('ComplaintsManagement');
                            }}
                            activeOpacity={0.8}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="construct" size={20} color="#D97706" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: '800', fontSize: 14, color: isDark ? '#FEF3C7' : '#92400E' }}>
                                        {data.openComplaintsCount} {data.openComplaintsCount === 1 ? 'Open Complaint' : 'Open Complaints'} from Tenants
                                    </Text>
                                    <Text style={{ fontSize: 11, color: isDark ? '#FCD34D' : '#D97706', marginTop: 2 }}>
                                        Tap to view and resolve
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#D97706" />
                        </TouchableOpacity>
                    )}



                    {/* ─────────────────── TOP METRICS ROW ─────────────────── */}
                    <View style={s.topMetricsRow}>
                        {/* Card 1: Today's Collection */}
                        <TouchableOpacity
                            style={[s.topMetricCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                            onPress={() => navigation.navigate('IncomeDetails', { period: 'day' })}
                            activeOpacity={0.8}
                        >
                            <View style={[s.topMetricIconCircle, { backgroundColor: '#E8F5E9' }]}>
                                <Text style={{ color: '#2E7D32', fontSize: 14, fontWeight: '800' }}>₹</Text>
                            </View>
                            <Text style={[s.topMetricLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('dashboard.today')}</Text>
                            <Text style={[s.topMetricValue, { color: '#2E7D32' }]} numberOfLines={1}>{fmt(data.todayAmount)}</Text>
                        </TouchableOpacity>

                        {/* Card 2: Pending Dues */}
                        <TouchableOpacity
                            style={[s.topMetricCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                            onPress={() => navigation.navigate('PendingTab')}
                            activeOpacity={0.8}
                        >
                            <View style={[s.topMetricIconCircle, { backgroundColor: '#FFE0B2' }]}>
                                <Ionicons name="wallet-outline" size={15} color="#E65100" />
                            </View>
                            <Text style={[s.topMetricLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('dashboard.pending')}</Text>
                            <Text style={[s.topMetricValue, { color: '#E65100' }]} numberOfLines={1}>{fmt(data.totalDuesAmount)}</Text>
                        </TouchableOpacity>

                        {/* Card 3: This Month Collection */}
                        <TouchableOpacity
                            style={[s.topMetricCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                            onPress={() => navigation.navigate('IncomeDetails', { period: 'month' })}
                            activeOpacity={0.8}
                        >
                            <View style={[s.topMetricIconCircle, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="bar-chart-outline" size={15} color="#1565C0" />
                            </View>
                            <Text style={[s.topMetricLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('dashboard.month')}</Text>
                            <Text style={[s.topMetricValue, { color: '#1565C0' }]} numberOfLines={1}>{fmt(data.monthAmount)}</Text>
                        </TouchableOpacity>

                        {/* Card 4: New Admissions */}
                        <TouchableOpacity
                            style={[s.topMetricCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                            onPress={() => {
                                const today = new Date();
                                const lastWeek = new Date();
                                lastWeek.setDate(today.getDate() - 7);
                                navigation.navigate('Students', {
                                    startDate: toLocalDateStr(lastWeek),
                                    endDate: toLocalDateStr(today)
                                });
                            }}
                            activeOpacity={0.8}
                        >
                            <View style={[s.topMetricIconCircle, { backgroundColor: '#F3E5F5' }]}>
                                <Ionicons name="person-add-outline" size={15} color="#4A148C" />
                            </View>
                            <Text style={[s.topMetricLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('dashboard.new')}</Text>
                            <Text style={[s.topMetricValue, { color: '#4A148C' }]} numberOfLines={1}>{(data as any).newAdmissionsCount ?? 0}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ─────────────────── BEDS OVERVIEW ─────────────────── */}
                    {data.totalBeds === 0 ? (
                        <TouchableOpacity
                            style={[
                                s.card,
                                {
                                    backgroundColor: theme.cardBg,
                                    borderColor: isDark ? '#334155' : '#F1F5F9',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    padding: 16,
                                    gap: 14
                                }
                            ]}
                            onPress={() => navigation.navigate('AddRoom')}
                            activeOpacity={0.8}
                        >
                            <Animated.View style={{
                                transform: [{ scale: pulseValue }],
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: theme.primary,
                                justifyContent: 'center',
                                alignItems: 'center',
                                shadowColor: theme.primary,
                                shadowOffset: { width: 0, height: 3 },
                                shadowOpacity: 0.2,
                                shadowRadius: 4,
                                elevation: 3,
                            }}>
                                <Ionicons name="add" size={26} color="#FFF" />
                            </Animated.View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginBottom: 2 }}>
                                    {t('dashboard.registerRooms')}
                                </Text>
                                <Text style={{ fontSize: 11.5, color: theme.textSecondary, fontWeight: '600', lineHeight: 15 }}>
                                    {t('dashboard.addFirstRoom')}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                        </TouchableOpacity>
                    ) : (
                        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <View style={[s.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                                <TouchableOpacity
                                    style={s.cardHeaderLeft}
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate('Rooms', { filter: 'All' })}
                                >
                                    <Ionicons name="apps" size={15} color={theme.primary} />
                                    <Text style={[s.cardTitle, { fontSize: fontSize - 1, color: theme.textPrimary }]}>{t('dashboard.bedsOccupancyOverview')}</Text>
                                    <Ionicons name="chevron-forward" size={12} color={theme.textSecondary} style={{ marginLeft: 2 }} />
                                </TouchableOpacity>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={[s.cardMeta, { fontSize: Math.max(9, fontSize - 4), color: theme.textSecondary, fontWeight: '700' }]}>
                                        {t('dashboard.roomsCount')}: {data.totalRooms} ({data.availableRooms} {t('dashboard.avail')})
                                    </Text>
                                    <Animated.View style={{ transform: [{ scale: pulseValue }] }}>
                                        <TouchableOpacity
                                            onPress={() => navigation.navigate('AddRoom')}
                                            style={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 11,
                                                backgroundColor: theme.primary,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                shadowColor: theme.primary,
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.2,
                                                shadowRadius: 3,
                                                elevation: 2,
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="add" size={14} color="#FFF" style={{ fontWeight: '900' }} />
                                        </TouchableOpacity>
                                    </Animated.View>
                                </View>
                            </View>

                            {/* Progress Bar Visual */}
                            <View style={s.bedProgressContainer}>
                                <View style={[s.progressBarBackground, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <View style={[s.progressBarFill, { width: `${data.occupancyRate}%`, backgroundColor: '#7C3AED' }]} />
                                </View>
                                <View style={s.progressTextRow}>
                                    <Text style={[s.progressTextLabel, { fontSize: Math.max(9, fontSize - 4), color: theme.textSecondary }]}>
                                        {data.occupiedBeds} / {data.totalBeds} {t('dashboard.bedsOccupied')}
                                    </Text>
                                    <Text style={[s.progressTextVal, { fontSize: fontSize - 3, color: '#7C3AED', fontWeight: '800' }]}>
                                        {data.occupancyRate}%
                                    </Text>
                                </View>
                            </View>

                            <View style={s.bedsRowNew}>
                                {/* Available */}
                                <TouchableOpacity
                                    style={[s.bedCardNew, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E8F5E9' }]}
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate('Rooms', { filter: 'Vacant' })}
                                >
                                    <View style={[s.bedIconNew, { backgroundColor: '#E8F5E9' }]}>
                                        <Ionicons name="checkmark-circle-sharp" size={20} color="#2E7D32" />
                                    </View>
                                    <View>
                                        <Text style={[s.bedNumNew, { fontSize: fontSize - 2, color: isDark ? theme.textPrimary : '#2E7D32' }]}>{data.availableBeds}</Text>
                                        <Text style={[s.bedLblNew, { fontSize: Math.max(9, fontSize - 5), color: theme.textSecondary }]}>{t('dashboard.available')}</Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Occupied */}
                                <TouchableOpacity
                                    style={[s.bedCardNew, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#FFEBEE' }]}
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate('Rooms', { filter: 'Full' })}
                                >
                                    <View style={[s.bedIconNew, { backgroundColor: '#FFEBEE' }]}>
                                        <Ionicons name="people-sharp" size={20} color="#C62828" />
                                    </View>
                                    <View>
                                        <Text style={[s.bedNumNew, { fontSize: fontSize - 2, color: isDark ? theme.textPrimary : '#C62828' }]}>{data.occupiedBeds}</Text>
                                        <Text style={[s.bedLblNew, { fontSize: Math.max(9, fontSize - 5), color: theme.textSecondary }]}>{t('dashboard.occupied')}</Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Notices board */}
                                <TouchableOpacity
                                    style={[s.bedCardNew, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#FFF3E0' }]}
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate('Notices')}
                                >
                                    <View style={[s.bedIconNew, { backgroundColor: '#FFF3E0' }]}>
                                        <Ionicons name="megaphone-sharp" size={20} color="#EF6C00" />
                                    </View>
                                    <View>
                                        <Text style={[s.bedNumNew, { fontSize: fontSize - 2, color: isDark ? theme.textPrimary : '#EF6C00' }]}>{data.noticesCount}</Text>
                                        <Text style={[s.bedLblNew, { fontSize: Math.max(9, fontSize - 5), color: theme.textSecondary }]}>{t('dashboard.notices')}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* ─────────────────── QUICK ACTIONS ─────────────────── */}
                    <View style={s.sectionBlock}>
                        <Text style={[s.sectionTitle, { fontSize: fontSize, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }]}>
                            {t('dashboard.quickActions')}
                        </Text>
                        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 8, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }]}>
                            <View style={s.quickRow}>
                                {QUICK_ACTIONS.map((a, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={s.quickItem}
                                        activeOpacity={0.75}
                                        onPress={() => handleQuickAction(a)}
                                    >
                                        <View style={s.quickIconWrap}>
                                            <View style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#334155' : a.bg, borderRadius: 12 }]}>
                                                {a.icon === 'rupee' ? (
                                                    <Text style={{ color: isDark ? theme.primary : a.color, fontSize: 18, fontWeight: '800' }}>₹</Text>
                                                ) : (
                                                    <Ionicons name={a.icon as any} size={22} color={isDark ? theme.primary : a.color} />
                                                )}
                                            </View>
                                            {a.route === 'PreBooking' && data.prebookingsCount > 0 && (
                                                <View style={s.prebookBadge}>
                                                    <Text style={s.prebookBadgeText}>{data.prebookingsCount}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text
                                            style={[
                                                s.quickLabel,
                                                { fontSize: Math.max(9, fontSize - 4), color: isDark ? theme.textSecondary : '#475569', fontWeight: '600', marginTop: 4 }
                                            ]}
                                            numberOfLines={2}
                                        >
                                            {t(getQuickActionLabelKey(a.label))}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* ─────────────────── STATISTICS ─────────────────── */}
                    <View style={s.sectionBlock}>
                        <Text style={[s.sectionTitle, { fontSize: fontSize, color: theme.textPrimary }]}>📊 {t('dashboard.statistics')}</Text>
                        <View style={s.statisticsRow}>
                            {/* Card 1: Total Tenants */}
                            <TouchableOpacity
                                style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                                onPress={() => navigation.navigate('Students')}
                                activeOpacity={0.8}
                            >
                                <View style={[s.statIconBox, { backgroundColor: '#EDE9FE' }]}>
                                    <Ionicons name="people" size={18} color="#7C3AED" />
                                </View>
                                <Text style={[s.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('dashboard.tenants')}</Text>
                                <Text style={[s.statNum, { color: '#7C3AED' }]} numberOfLines={1}>{data.activeTenants}</Text>
                            </TouchableOpacity>

                            {/* Card 2: Reports */}
                            <TouchableOpacity
                                style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                                onPress={() => navigation.navigate('Reports')}
                                activeOpacity={0.8}
                            >
                                <View style={[s.statIconBox, { backgroundColor: '#FFEDD5' }]}>
                                    <Ionicons name="bar-chart-outline" size={18} color="#EA580C" />
                                </View>
                                <Text style={[s.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('dashboard.reports')}</Text>
                                <Text style={[s.statNum, { color: '#EA580C', fontSize: 12 }]} numberOfLines={1}>{t('dashboard.view')}</Text>
                            </TouchableOpacity>

                            {/* Card 3: Expenses (This Month) */}
                            <TouchableOpacity
                                style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                                onPress={() => navigation.navigate('Expenses')}
                                activeOpacity={0.8}
                            >
                                <View style={[s.statIconBox, { backgroundColor: '#E0F2FE' }]}>
                                    <Ionicons name="trending-down" size={18} color="#0284C7" />
                                </View>
                                <Text style={[s.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('dashboard.expenses')}</Text>
                                <Text style={[s.statNum, { color: '#0284C7' }]} numberOfLines={1}>{fmt((data as any).monthlyExpenses || 0)}</Text>
                            </TouchableOpacity>

                            {/* Card 4: Staff */}
                            <TouchableOpacity
                                style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                                onPress={() => navigation.navigate('Staff')}
                                activeOpacity={0.8}
                            >
                                <View style={[s.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                                    <Ionicons name="person" size={18} color="#16A34A" />
                                </View>
                                <Text style={[s.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('dashboard.staff')}</Text>
                                <Text style={[s.statNum, { color: '#16A34A' }]} numberOfLines={1}>{(data as any).staffCount ?? 0}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─────────────────── TOP DEFAULTERS (OVERDUE) ─────────────────── */}
                    {data.unpaidStudents && data.unpaidStudents.length > 0 && (
                        <View style={s.sectionBlock}>
                            <Text style={[s.sectionTitle, { fontSize: fontSize, color: '#DC2626', textTransform: 'uppercase' }]}>
                                ⚠️ Top 5 Overdue Students
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
                                {data.unpaidStudents.map((item, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[s.card, { backgroundColor: isDark ? '#3B1A1A' : '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, padding: 12, borderRadius: 12, width: 150 }]}
                                        onPress={() => navigation.navigate('StudentDetails', { studentId: item.id })}
                                    >
                                        <Text style={{ fontWeight: '700', fontSize: 14, color: isDark ? '#FECACA' : '#991B1B' }} numberOfLines={1}>{item.name}</Text>
                                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#DC2626', marginTop: 4 }}>₹{item.amount}</Text>
                                        <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>
                                            {item.isOverdue ? `${item.daysLate}d Overdue` : 'Pending'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* ─────────────────── NEXT 3 DAYS DUES ─────────────────── */}
                    {data.upcomingDues && data.upcomingDues.length > 0 && (
                        <View style={s.sectionBlock}>
                            <Text style={[s.sectionTitle, { fontSize: fontSize, color: '#D97706', textTransform: 'uppercase' }]}>
                                🕒 Dues in Next 3 Days
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
                                {data.upcomingDues.map((item, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[s.card, { backgroundColor: isDark ? '#2D1A0E' : '#FFF7ED', borderColor: '#FCD34D', borderWidth: 1, padding: 12, borderRadius: 12, width: 150 }]}
                                        onPress={() => navigation.navigate('StudentDetails', { studentId: item.id })}
                                    >
                                        <Text style={{ fontWeight: '700', fontSize: 14, color: isDark ? '#FEF3C7' : '#92400E' }} numberOfLines={1}>{item.name}</Text>
                                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#D97706', marginTop: 4 }}>₹{item.amount}</Text>
                                        <Text style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>
                                            {item.daysLeft === 0 ? 'Due Today' : `Due in ${item.daysLeft}d`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* ─────────────────── IMPORTANT NOTICE BANNER ─────────────────── */}
                    {data.latestNotice ? (
                        <TouchableOpacity
                            style={[s.noticeBanner, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE' }]}
                            onPress={() => navigation.navigate('NoticesManagement')}
                            activeOpacity={0.8}
                        >
                            <View style={s.noticeHeaderRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons name="megaphone" size={18} color={isDark ? "#93C5FD" : "#2563EB"} />
                                    <Text style={[s.noticeBannerTitle, { color: isDark ? "#93C5FD" : "#2563EB" }]}>{t('dashboard.importantNotice')}</Text>
                                </View>
                                <TouchableOpacity
                                    style={[s.noticeViewAllBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)' }]}
                                    onPress={() => navigation.navigate('NoticesManagement')}
                                >
                                    <Text style={[s.noticeViewAllText, { color: isDark ? "#93C5FD" : "#2563EB" }]}>{t('dashboard.viewAll')}  ➔</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={[s.noticeBannerContent, { color: theme.textPrimary }]} numberOfLines={2}>
                                {data.latestNotice.title}: {data.latestNotice.content}
                            </Text>
                            <Text style={s.noticeBannerDate}>
                                {new Date(data.latestNotice.created_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </TouchableOpacity>
                    ) : null}

                    {/* ─────────────────── UPCOMING CHECKOUT SCHEDULES ─────────────────── */}
                    {data.upcomingVacates && data.upcomingVacates.length > 0 ? (
                        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <View style={s.cardHeader}>
                                <View style={s.cardHeaderLeft}>
                                    <Ionicons name="calendar-outline" size={15} color="#EF4444" />
                                    <Text style={[s.cardTitle, { fontSize: fontSize - 1, color: theme.textPrimary }]}>{t('dashboard.upcomingCheckoutSchedules')}</Text>
                                </View>
                            </View>
                            <View style={{ gap: 10 }}>
                                {data.upcomingVacates.map((item, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[s.checkoutItem, { borderColor: isDark ? '#475569' : '#E2E8F0' }]}
                                        onPress={() => navigation.navigate('StudentDetails', { studentId: item.student_id })}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[s.checkoutAvatar, { backgroundColor: theme.primary + '15' }]}>
                                            <Text style={[s.checkoutAvatarText, { color: theme.primary }]}>
                                                {avatarLetter(item.name)}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.checkoutName, { color: theme.textPrimary }]}>{item.name}</Text>
                                            <Text style={[s.checkoutSub, { color: theme.textSecondary }]}>Room {item.room_number}</Text>
                                        </View>
                                        <View style={[
                                            s.checkoutBadge,
                                            { backgroundColor: item.daysLeft <= 3 ? '#FEE2E2' : '#FEF3C7' }
                                        ]}>
                                            <Text style={[
                                                s.checkoutBadgeText,
                                                { color: item.daysLeft <= 3 ? '#EF4444' : '#D97706' }
                                            ]}>
                                                {item.daysLeft <= 0 ? t('dashboard.today') : `${item.daysLeft} ${t('dashboard.daysLeft')}`}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : null}

                    {/* ─────────────────── TENANT APP PROMO ─────────────────── */}
                    <TenantAppCard theme={theme} isDark={isDark} hostelCode={data.hostelCode} />

                    {/* ─────────────────── COLLECTION PICTURE ─────────────────── */}
                    <View style={{ marginBottom: 40 }}>
                        <Text style={[s.sectionTitle, { color: theme.textPrimary, marginBottom: 16 }]}>
                            {data.collectionStats.monthName} Collection Status
                        </Text>
                        <View style={[s.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0', padding: 16, paddingBottom: 24 }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Total Expected</Text>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '700' }}>₹{data.collectionStats.totalExpected.toLocaleString('en-IN')}</Text>
                                    <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>({data.collectionStats.tenantsCount} tenants)</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '600' }}>Collected</Text>
                                <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 8 }}>
                                    <Text style={{ color: '#10B981', fontSize: 15, fontWeight: '700' }}>₹{data.collectionStats.collected.toLocaleString('en-IN')}</Text>
                                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                                        ({data.collectionStats.totalExpected > 0 ? Math.round((data.collectionStats.collected / data.collectionStats.totalExpected) * 100) : 0}%)
                                    </Text>
                                </View>
                            </View>

                            {/* Progress bar */}
                            <View style={{ height: 8, backgroundColor: isDark ? '#334155' : '#E2E8F0', borderRadius: 4, marginVertical: 8, overflow: 'hidden' }}>
                                <View style={{ height: '100%', backgroundColor: '#10B981', width: `${data.collectionStats.totalExpected > 0 ? Math.round((data.collectionStats.collected / data.collectionStats.totalExpected) * 100) : 0}%`, borderRadius: 4 }} />
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '600' }}>Pending</Text>
                                <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '700' }}>₹{data.collectionStats.pending.toLocaleString('en-IN')}</Text>
                            </View>

                            <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#E2E8F0', marginBottom: 16 }} />

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                <View style={{ width: '48%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700' }}>Overdue:</Text>
                                    <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '800' }}>{data.collectionStats.overdueCount} (₹{(data.collectionStats.overdueAmount || 0).toLocaleString('en-IN')})</Text>
                                </View>
                                <View style={{ width: '48%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700' }}>Due Today:</Text>
                                    <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '800' }}>{data.collectionStats.dueTodayCount}</Text>
                                </View>
                                <View style={{ width: '48%', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700' }}>Due This Wk:</Text>
                                    <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '800' }}>{data.collectionStats.dueThisWeekCount}</Text>
                                </View>
                                <View style={{ width: '48%', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700' }}>Paid:</Text>
                                    <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '800' }}>{data.collectionStats.paidCount}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                </View>
            </ScrollView>
        </View>
    );
}

// ─── Bar chart styles ─────────────────────────────────────────────────────────
const bc = StyleSheet.create({
    column: { flex: 1, alignItems: 'center' },
    topLabel: { fontSize: 8, color: '#7C3AED', fontWeight: '700', marginBottom: 3, height: 12 },
    barWrap: {
        height: 80,
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 3,
    },
    bar: { width: '80%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    month: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 5 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8F7FF' },

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
        paddingTop: 52,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    greeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
    ownerName: { fontSize: 22, fontWeight: '900', color: '#FFF', marginTop: 2 },
    hostelTag: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 4 },
    bellBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    bellDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FBBF24',
        borderWidth: 1.5,
        borderColor: '#7C3AED',
    },

    // ── Loading skeleton ─────────────────────────────────────────────────────
    headerSkeleton: {
        paddingTop: 52,
        paddingBottom: 28,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    skHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    // ── Error ────────────────────────────────────────────────────────────────
    errorCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    errorTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
    errorSub: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
    },
    retryBtn: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    retryGrad: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    retryText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

    // ── Body ─────────────────────────────────────────────────────────────────
    body: { padding: 14, gap: 14 },

    // ── Generic card ─────────────────────────────────────────────────────────
    card: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 22,
        elevation: 3,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    cardMeta: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },

    // ── Beds Overview ────────────────────────────────────────────────────────
    bedProgressContainer: {
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    progressBarBackground: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: '#7C3AED',
    },
    progressTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressTextLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    progressTextVal: {
        fontSize: 12,
        color: '#7C3AED',
        fontWeight: '800',
    },
    bedsRowNew: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    bedCardNew: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        backgroundColor: '#FFF',
        gap: 6,
    },
    bedIconNew: {
        width: 38,
        height: 38,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bedNumNew: {
        fontSize: 16,
        fontWeight: '800',
        lineHeight: 19,
    },
    bedLblNew: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 1,
    },

    // ── Quick Management ─────────────────────────────────────────────────────
    quickRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
    },
    quickItem: { width: '23%', alignItems: 'center', marginVertical: 4, paddingHorizontal: 1 },
    quickIconWrap: { position: 'relative', marginBottom: 4 },
    quickIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockBadge: {
        position: 'absolute',
        top: -3,
        right: -3,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#94A3B8',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    quickLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#374151',
        textAlign: 'center',
        lineHeight: 14,
    },

    // ── Statistics ───────────────────────────────────────────────────────────
    sectionBlock: { gap: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    seeAll: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },

    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 6,
        position: 'relative',
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    statNum: {
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 2,
    },
    statLbl: { fontSize: 11, color: '#64748B', fontWeight: '600' },
    redDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444',
    },

    // ── Finance Hub — full-width list rows ──────────────────────────────────
    finHubCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    finHubAccent: {
        width: 4,
        alignSelf: 'stretch',
    },
    finHubIconBox: {
        width: 44,
        height: 44,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 12,
    },
    finHubBody: { flex: 1, paddingVertical: 14 },
    finHubTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 3 },
    finHubSub: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
    finHubRight: {
        alignItems: 'flex-end',
        paddingRight: 14,
        gap: 4,
    },
    finHubAmount: { fontSize: 15, fontWeight: '900' },

    // ── Revenue chart ────────────────────────────────────────────────────────
    chartWrap: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingVertical: 8,
    },
    chartNote: {
        fontSize: 10,
        color: '#CBD5E1',
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 4,
    },
    prebookBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EA580C',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: '#FFF',
    },
    prebookBadgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '900',
    },

    // Switcher Dropdown Pill
    hostelSubText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '600',
        marginTop: 2,
    },

    topMetricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 8,
    },
    topMetricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    topMetricCard: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
    },
    topMetricIconCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    topMetricLabel: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 1,
    },
    topMetricValue: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 0,
    },
    topMetricSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    topMetricSubText: {
        fontSize: 8,
        fontWeight: '500',
        textAlign: 'center',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 2,
    },
    statSubtext: {
        fontSize: 8,
        fontWeight: '600',
        color: '#94A3B8',
        textAlign: 'center',
    },
    horizontalScrollContainer: {
        gap: 12,
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    statisticsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 6,
    },
    noticeBanner: {
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 4,
        marginTop: 10,
    },
    noticeHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    noticeBannerTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#2563EB',
    },
    noticeViewAllBtn: {
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    noticeViewAllText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2563EB',
    },
    noticeBannerContent: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 18,
        marginBottom: 6,
    },
    noticeBannerDate: {
        fontSize: 10,
        fontWeight: '500',
        color: '#94A3B8',
    },
    checkoutItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    checkoutAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkoutAvatarText: {
        fontSize: 14,
        fontWeight: '700',
    },
    checkoutName: {
        fontSize: 13,
        fontWeight: '700',
    },
    checkoutSub: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    checkoutBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkoutBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
});
