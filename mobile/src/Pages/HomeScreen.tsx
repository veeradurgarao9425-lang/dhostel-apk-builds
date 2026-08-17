import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, RefreshControl, Animated,
    ActivityIndicator, Linking, Image, Dimensions, Platform, DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ProfileMenu } from '../components/ProfileMenu';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { AppHeader } from '../components/AppHeader';
import { HeaderNotification } from '../components/HeaderNotification';
import { toLocalDateStr } from '../utils/dateUtils';
import { useRefresh } from '../../contexts/RefreshContext';
import { useTranslation } from 'react-i18next';
import { TenantAppCard } from '../components/TenantAppCard';
import MoreScreen from './MoreScreen';
import { ModalSheet } from '../components/FormComponents';
import { WarningCards } from '../components/dashboard/WarningCards';
import { OverviewCard } from '../components/dashboard/OverviewCard';
import { QuickActionsGrid } from '../components/dashboard/QuickActionsGrid';
import { StatisticsGrid } from '../components/dashboard/StatisticsGrid';
import { UpcomingCheckoutSchedules } from '../components/dashboard/UpcomingCheckoutSchedules';
import { CollectionDetailsSheet } from '../components/dashboard/CollectionDetailsSheet';
import { TopOverdueStudents } from '../components/dashboard/TopOverdueStudents';
import { UpcomingDues } from '../components/dashboard/UpcomingDues';
import { OccupancyCard } from '../components/dashboard/OccupancyCard';
import { SetupGuideCard } from '../components/dashboard/SetupGuideCard';

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
    totalStudentsCount: 0,
    leftTenants: 0,
    totalRooms: 0,
    availableRooms: 0,
    occupancyRate: 0,
    prebookingsCount: 0,
    noticesCount: 0,
    newAdmissionsCount: 0,
    monthlyExpenses: 0,
    staffCount: 0,
    latestNotice: null as any,
    upcomingVacates: [] as any[],
    unallocatedCount: 0,
    qrRegisterCount: 0,
    openComplaintsCount: 0,
    pendingAdmissionsCount: 0,
    unpaidStudents: [] as any[],
    upcomingDues: [] as any[],
    collectionStats: {
        totalExpected: 0,
        collected: 0,
        pending: 0,
        overdueAmount: 0,
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
    { label: 'Add Room', icon: 'business-outline', color: '#2563EB', bg: '#DBEAFE', route: 'AddRoom' },
    { label: 'Pre-Book', icon: 'calendar-outline', color: '#F97316', bg: '#FFF7ED', route: 'PreBooking' },
    { label: 'Collected Rent', icon: 'wallet-outline', color: '#0D9488', bg: '#CCFBF1', route: 'CollectedPayments' },
    { label: 'Add Expense', icon: 'card-outline', color: '#D97706', bg: '#FEF3C7', route: 'AddExpense' },
    { label: 'Complaints', icon: 'construct-outline', color: '#DC2626', bg: '#FEE2E2', route: 'ComplaintsManagement' },
    { label: 'Bills', icon: 'document-text-outline', color: '#EA580C', bg: '#FFEDD5', route: 'BillReminders' },
    { label: 'Staff', icon: 'people-outline', color: '#059669', bg: '#D1FAE5', route: 'AddStaff' },
    { label: 'Reminders', icon: 'notifications-outline', color: '#4F46E5', bg: '#E0E7FF', route: 'Reminders' },
];

const getQuickActionLabelKey = (label: string) => {
    if (label === 'Add Tenant') return 'dashboard.addTenant';
    if (label === 'Add Room') return 'dashboard.addRoom';
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { user, hostels, hostelsLoading, loadHostels, updateTokenAndUser } = useAuth();
    const { showError, showApiError, showSuccess } = useToast();
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();
    const [data, setData] = useState(INITIAL_STATE);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [backgroundLoading, setBackgroundLoading] = useState(false);
    const [showCollectionSheet, setShowCollectionSheet] = useState(false);
    const [showHostelSelector, setShowHostelSelector] = useState(false);
    const [switchingHostelId, setSwitchingHostelId] = useState<number | null>(null);
    const [showTour, setShowTour] = useState(false);
    const [tourStep, setTourStep] = useState(0);
    const [renewalStudents, setRenewalStudents] = useState<any[]>([]);
    const [isPagerScrollEnabled, setIsPagerScrollEnabled] = useState(true);

    useEffect(() => {
        DeviceEventEmitter.emit('TOUR_STATE_CHANGE', showTour);
    }, [showTour]);
    const scrollViewRef = useRef<ScrollView>(null);
    const horizontalScrollRef = useRef<ScrollView>(null);
    const headerSelectorRef = useRef<any>(null);
    const SCREEN_WIDTH = Dimensions.get('window').width;
    const [activePageIndex, setActivePageIndex] = useState(0);

    const scrollToPage = useCallback((pageIndex: number) => {
        setActivePageIndex(pageIndex);
        horizontalScrollRef.current?.scrollTo({ x: pageIndex * SCREEN_WIDTH, animated: true });
    }, [SCREEN_WIDTH]);

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

    // Load hostels when hostel selector opens or if empty on mount
    useEffect(() => {
        if (showHostelSelector || hostels.length === 0) {
            loadHostels();
        }
    }, [showHostelSelector, hostels.length, loadHostels]);

    // Check tour status on user load
    useEffect(() => {
        const checkTour = async () => {
            try {
                const tourCompleted = await AsyncStorage.getItem('has_completed_tour_v1');
                if (!tourCompleted && user) {
                    setTimeout(() => {
                        setShowTour(true);
                        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
                    }, 800);
                }
            } catch (err) {
                console.log('Error checking tour:', err);
            }
        };
        checkTour();
    }, [user]);



    // ── Data loader ───────────────────────────────────────────────────────────
    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh && isFirstLoadRef.current) {
                setLoading(true);
            } else if (!isRefresh) {
                setBackgroundLoading(true);
            }
            setHasError(false);

            const [statsRes, summaryRes, hostelRes, noticeRes, overviewRes, studentsRes, complaintsRes, renewalsRes]: any = await Promise.all([
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
                    : Promise.resolve({ data: { success: false } }),
                api.get('/students', { params: { renewalDueSoon: 'true', renewalDays: '15', status: 1 } }).catch(() => ({ data: { success: false } }))
            ]);

            // Update renewal students if the request succeeded
            if (renewalsRes?.data?.success) {
                setRenewalStudents(renewalsRes.data.data || []);
            }

            if (!statsRes.data?.success && !summaryRes.data?.success && !studentsRes.data?.success && !overviewRes.data?.success) {
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

            // Build collection stats picture
            const collectionStats = {
                totalExpected: 0, collected: 0, pending: 0, overdueAmount: 0,
                overdueCount: 0, dueTodayCount: 0, dueThisWeekCount: 0,
                paidCount: 0, tenantsCount: 0, monthName: ''
            };
            let topDefaulters: any[] = [];
            let upcomingDuesList: any[] = [];
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

                // Build top overdue defaulters + next-3-days dues, grouped per student
                const studentMap = new Map<number, any>();
                fees
                    .filter(f => (f.balance || 0) > 0 && !['paid', 'fully paid'].includes((f.fee_status || '').toLowerCase()))
                    .forEach(f => {
                        const due = f.due_date ? new Date(f.due_date) : new Date();
                        due.setHours(0, 0, 0, 0);
                        const diffDays = Math.floor((now.getTime() - due.getTime()) / 86400000);
                        const id = f.student_id;
                        if (!studentMap.has(id)) {
                            studentMap.set(id, {
                                id,
                                name: `${f.first_name || ''} ${f.last_name || ''}`.trim(),
                                room_number: f.room_number,
                                phone: f.phone,
                                amount: 0,
                                isOverdue: false,
                                daysLate: 0,
                                daysLeft: 9999,
                            });
                        }
                        const st = studentMap.get(id);
                        st.amount += parseFloat(f.balance || 0);
                        if (diffDays > 0) {
                            st.isOverdue = true;
                            if (diffDays > st.daysLate) st.daysLate = diffDays;
                        } else {
                            const left = Math.abs(diffDays);
                            if (left < st.daysLeft) st.daysLeft = left;
                        }
                    });
                const mappedFees = Array.from(studentMap.values());
                topDefaulters = mappedFees
                    .filter(f => f.isOverdue)
                    .sort((a, b) => b.daysLate - a.daysLate || b.amount - a.amount)
                    .slice(0, 5);
                upcomingDuesList = mappedFees
                    .filter(f => !f.isOverdue && f.daysLeft <= 7 && f.daysLeft >= 0)
                    .sort((a, b) => a.daysLeft - b.daysLeft)
                    .slice(0, 5);
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
            const pendingAdmissionsCount = activeStudents.filter((s: any) => s.admission_status === 0 && (s.status === 1 || s.status === 2)).length;
            const totalStudentsCount = activeStudents.filter((s: any) => s.status === 1).length;
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
                totalStudentsCount,
                leftTenants: d2.leftTenants || d2.vacatedStudents || 0,
                totalRooms: d2.totalRooms || 0,
                availableRooms: d2.availableRooms || 0,
                occupancyRate: d2.occupancyRate || 0,
                prebookingsCount: d2.prebookingsCount || 0,
                noticesCount: d2.noticesCount || 0,
                newAdmissionsCount: d2.newAdmissionsCount || 0,
                monthlyExpenses: d2.monthlyExpenses || 0,
                staffCount: d2.staffCount || 0,
                latestNotice: activeNotice,
                upcomingVacates,
                unallocatedCount,
                qrRegisterCount,
                openComplaintsCount,
                pendingAdmissionsCount,
                unpaidStudents: topDefaulters,
                upcomingDues: upcomingDuesList,
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

    // ── Active Hostel switcher handler ─────────────────────────────────────────
    const handleHostelSelect = async (hostelId: number, hostelName: string) => {
        if (Number(hostelId) === Number(user?.hostel_id)) {
            setShowHostelSelector(false);
            return;
        }
        try {
            setSwitchingHostelId(hostelId);
            const res = await api.put('/auth/active-hostel', { hostel_id: hostelId });
            if (res.data?.success) {
                const { token, hostel_name } = res.data.data;
                await updateTokenAndUser(token, { hostel_id: hostelId, hostel_name });
                showSuccess(`Switched active hostel to ${hostel_name}`);
                setShowHostelSelector(false);
                // Trigger reload of stats
                await load(true);
            } else {
                showError(res.data?.error || 'Failed to switch active hostel');
            }
        } catch (err: any) {
            console.error('Switch active hostel error:', err);
            showApiError(err, 'An error occurred while switching hostels.');
        } finally {
            setSwitchingHostelId(null);
        }
    };

    // ── Quick action press handler ────────────────────────────────────────────
    const handleQuickAction = (a: typeof QUICK_ACTIONS[0]) => {
        navigation.navigate(a.route);
    };

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

    const renderTourOverlay = () => {
        if (!showTour) return null;

        const showSetupGuide = data.totalBeds === 0 || data.totalStudentsCount === 0;
        const tourSteps = [
            {
                icon: "business",
                iconColor: "#7C3AED",
                iconBg: isDark ? 'rgba(124, 58, 237, 0.18)' : 'rgba(124, 58, 237, 0.08)',
                title: "Select Active Hostel",
                desc: "Tap the hostel name dropdown inside the top header to switch between your different hostels instantly from anywhere on the dashboard.",
            },
            ...(showSetupGuide ? [{
                icon: "rocket",
                iconColor: "#EA580C",
                iconBg: isDark ? 'rgba(234, 88, 12, 0.18)' : 'rgba(234, 88, 12, 0.08)',
                title: "Quick Setup Guide",
                desc: "Follow the 3-step checklist to configure your rooms, add floors, and register your first tenant to get started.",
            }] : []),
            {
                icon: "cash",
                iconColor: "#16A34A",
                iconBg: isDark ? 'rgba(22, 163, 74, 0.18)' : 'rgba(22, 163, 74, 0.08)',
                title: "Record Rent Collection",
                desc: "Issue rent bills, record payments, and send digital PDF receipts to your tenants in one click.",
            },
            {
                icon: "flash",
                iconColor: "#2563EB",
                iconBg: isDark ? 'rgba(37, 99, 235, 0.18)' : 'rgba(37, 99, 235, 0.08)',
                title: "Shortcuts & Quick Actions",
                desc: "Add new rooms, check in tenants, or broadcast notice announcements to all occupants quickly.",
            },
            {
                icon: "pie-chart",
                iconColor: "#06B6D4",
                iconBg: isDark ? 'rgba(6, 182, 212, 0.18)' : 'rgba(6, 182, 212, 0.08)',
                title: "Performance Statistics",
                desc: "Track your total occupied beds, available rooms, pending dues, and current month collections at a glance.",
            },
            {
                icon: "calendar",
                iconColor: "#E11D48",
                iconBg: isDark ? 'rgba(225, 29, 72, 0.18)' : 'rgba(225, 29, 72, 0.08)',
                title: "Upcoming Dues List",
                desc: "Track tenants with pending room rent due and send automatic payment reminders directly to their phones.",
            },
            {
                icon: "log-out",
                iconColor: "#8B5CF6",
                iconBg: isDark ? 'rgba(139, 92, 246, 0.18)' : 'rgba(139, 92, 246, 0.08)',
                title: "Upcoming Checkout Schedule",
                desc: "Keep track of upcoming tenant check-outs to manage room availability and advance booking plans.",
            },
        ];

        const step = tourSteps[tourStep];
        if (!step) return null;

        const handleNext = async () => {
            if (tourStep < tourSteps.length - 1) {
                setTourStep(tourStep + 1);
            } else {
                setShowTour(false);
                try {
                    await AsyncStorage.setItem('has_completed_tour_v1', 'true');
                } catch (e) {
                    console.log(e);
                }
            }
        };

        const handleBack = () => {
            if (tourStep > 0) {
                setTourStep(tourStep - 1);
            }
        };

        const handleSkip = async () => {
            setShowTour(false);
            try {
                await AsyncStorage.setItem('has_completed_tour_v1', 'true');
            } catch (e) {
                console.log(e);
            }
        };

        return (
            <View style={s.tourOverlayContainer}>
                {/* Full screen dimming overlay that captures and blocks all touches */}
                <View 
                    style={s.tourOverlayDimmer} 
                    onStartShouldSetResponder={() => true}
                    onResponderTerminationRequest={() => false}
                />

                {/* Bottom Sheet Card Container */}
                <View style={s.tourDialogCenter}>
                    <View style={[s.tourDialogCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        {/* Triangular arrow on the upper side (pointing up) */}
                        <View style={[s.tourArrowUp, { borderBottomColor: theme.cardBg }]} />

                        {/* 1. Title */}
                        <Text style={[s.tourDialogTitle, { color: theme.textPrimary }]}>{step.title}</Text>

                        {/* 2. Description */}
                        <Text style={[s.tourDialogDesc, { color: theme.textSecondary }]}>{step.desc}</Text>

                        {/* 3. Footer Row */}
                        <View style={s.tourDialogFooter}>
                            {/* Left: Back (if step > 0) or Skip + Progress dots */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                {tourStep > 0 ? (
                                    <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
                                        <Text style={[s.tourDialogBackText, { color: theme.primary }]}>Back</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
                                        <Text style={[s.tourDialogBackText, { color: theme.textSecondary }]}>Skip</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Progress dots */}
                                <View style={s.tourProgressIndicatorRow}>
                                    {tourSteps.map((_, idx) => (
                                        <View 
                                            key={idx} 
                                            style={[
                                                s.tourProgressDot, 
                                                idx === tourStep 
                                                    ? { backgroundColor: theme.primary, width: 6 } 
                                                    : { backgroundColor: isDark ? '#334155' : '#E2E8F0', width: 6 }
                                            ]} 
                                        />
                                    ))}
                                </View>
                            </View>

                            {/* Right: Next button */}
                            <TouchableOpacity 
                                style={[s.tourDialogNextBtn, { backgroundColor: theme.primary }]} 
                                onPress={handleNext}
                                activeOpacity={0.85}
                            >
                                <Text style={s.tourDialogNextBtnText}>
                                    {tourStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // ── Main Dashboard ────────────────────────────────────────────────────────
    return (
        <View style={[s.root, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />

            {/* ─────────────────── HEADER ─────────────────── */}
            <LinearGradient
                colors={[theme.gradientStart, theme.gradientEnd]}
                style={[s.newHeader, { paddingTop: Math.max(insets.top + 8, 48) }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
                {/* Decorative glow orbs */}
                <View style={s.hdrOrb1} />
                <View style={s.hdrOrb2} />

                <View style={s.headerRow1}>
                    {/* LEFT: Avatar + greeting + hostel pill */}
                    <TouchableOpacity
                        style={s.avatarCircle}
                        onPress={() => navigation.navigate('Profile')}
                        activeOpacity={0.8}
                    >
                        {(user as any)?.photo && typeof (user as any).photo === 'string' && (user as any).photo.trim() !== '' && (user as any).photo.trim() !== 'null' && (user as any).photo.startsWith('http') ? (
                            <Image source={{ uri: (user as any).photo }} style={s.avatarImage} />
                        ) : (
                            <Text style={s.avatarLetter}>{avatarLetter(user?.full_name || 'O')}</Text>
                        )}
                    </TouchableOpacity>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                        {/* Greeting + name row */}
                        <Text style={s.hdrGreeting}>{t(getGreetingKey())} 👋</Text>
                        <Text style={s.headerOwnerName} numberOfLines={1} ellipsizeMode="tail">
                            {user?.full_name?.split(' ')[0] || 'Admin'}
                        </Text>
                        {/* Hostel selector pill */}
                        <TouchableOpacity
                            ref={headerSelectorRef}
                            onPress={() => { setShowHostelSelector(true); loadHostels(); }}
                            activeOpacity={0.75}
                            style={s.hostelNameBtn}
                        >
                            <Ionicons name="business" size={11} color="rgba(255,255,255,0.9)" />
                            <Text style={s.hostelNameLabel} numberOfLines={1}>
                                {data.hostelName || 'My Hostel'}
                            </Text>
                            <Ionicons name="chevron-down" size={10} color="rgba(255,255,255,0.85)" />
                        </TouchableOpacity>
                    </View>

                    {/* RIGHT: actions */}
                    <View style={s.headerActions}>
                        <TouchableOpacity
                            style={s.headerIconBtn}
                            onPress={() => scrollToPage(activePageIndex === 0 ? 1 : 0)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name={activePageIndex === 0 ? "apps-outline" : "grid-outline"} size={19} color="#FFF" />
                        </TouchableOpacity>
                        {backgroundLoading && (
                            <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" style={{ marginRight: 2 }} />
                        )}
                        <HeaderNotification navigation={navigation} />
                    </View>
                </View>

                {/* Date strip */}
                <View style={s.hdrDateStrip}>
                    <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
                    <Text style={s.hdrDateText}>
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                </View>
            </LinearGradient>

            {/* ── Side-by-Side Pager View (Horizontal Scroll) ── */}
            <ScrollView
                ref={horizontalScrollRef}
                horizontal
                pagingEnabled
                directionalLockEnabled={true}
                disableIntervalMomentum={true}
                decelerationRate="fast"
                scrollEnabled={isPagerScrollEnabled}
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setActivePageIndex(page);
                }}
                style={{ flex: 1 }}
            >
                {/* ── PAGE 0: Dashboard Content ── */}
                <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                    <ScrollView
                        ref={scrollViewRef}
                        scrollEnabled={true}
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 180 }}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => { setRefreshing(true); load(true); }}
                                tintColor={theme.primary}
                            />
                        }
                    >
                        <View style={s.body}>
                            {/* Setup guide for first-time owners: show whenever setup is incomplete (missing rooms OR missing tenants) */}
                            {!loading && (data.totalStudentsCount === 0 || (data.totalBeds === 0 && data.totalRooms === 0)) ? (
                                <View collapsable={false}>
                                    <SetupGuideCard
                                        hasHostel={Boolean(user?.hostel_id || data.hostelName)}
                                        hasRooms={data.totalBeds > 0 || data.totalRooms > 0}
                                        hasTenants={data.totalStudentsCount > 0 || data.occupiedBeds > 0}
                                    />
                                </View>
                            ) : null}
                            {(data.unallocatedCount > 0 || data.qrRegisterCount > 0 || data.openComplaintsCount > 0 || data.pendingAdmissionsCount > 0) && (
                                <WarningCards data={data} />
                            )}
                            <View
                                collapsable={false}
                                onTouchStart={() => setIsPagerScrollEnabled(false)}
                                onTouchEnd={() => setIsPagerScrollEnabled(true)}
                                onTouchCancel={() => setIsPagerScrollEnabled(true)}
                            >
                                <QuickActionsGrid data={data} />
                            </View>
                            {(data.totalBeds > 0 || data.totalRooms > 0) && (
                                <>
                                    <View
                                        collapsable={false}
                                        onTouchStart={() => setIsPagerScrollEnabled(false)}
                                        onTouchEnd={() => setIsPagerScrollEnabled(true)}
                                        onTouchCancel={() => setIsPagerScrollEnabled(true)}
                                    >
                                        <OverviewCard data={data} setShowCollectionSheet={setShowCollectionSheet} pulseValue={pulseValue} fmt={fmt} />
                                    </View>
                                    <View
                                        collapsable={false}
                                        onTouchStart={() => setIsPagerScrollEnabled(false)}
                                        onTouchEnd={() => setIsPagerScrollEnabled(true)}
                                        onTouchCancel={() => setIsPagerScrollEnabled(true)}
                                    >
                                        <StatisticsGrid data={data} fmt={fmt} />
                                    </View>
                                    <View
                                        onTouchStart={() => setIsPagerScrollEnabled(false)}
                                        onTouchEnd={() => setIsPagerScrollEnabled(true)}
                                        onTouchCancel={() => setIsPagerScrollEnabled(true)}
                                    >
                                        <TopOverdueStudents data={data} />
                                    </View>
                                    <View
                                        collapsable={false}
                                        onTouchStart={() => setIsPagerScrollEnabled(false)}
                                        onTouchEnd={() => setIsPagerScrollEnabled(true)}
                                        onTouchCancel={() => setIsPagerScrollEnabled(true)}
                                    >
                                        <UpcomingDues data={data} renewalStudents={renewalStudents} />
                                    </View>
                                    <View
                                        collapsable={false}
                                        onTouchStart={() => setIsPagerScrollEnabled(false)}
                                        onTouchEnd={() => setIsPagerScrollEnabled(true)}
                                        onTouchCancel={() => setIsPagerScrollEnabled(true)}
                                    >
                                        <UpcomingCheckoutSchedules data={data} />
                                    </View>
                                    <OccupancyCard data={data} />
                                </>
                            )}
                            <TenantAppCard theme={theme} isDark={isDark} hostelCode={data.hostelCode} />
                        </View>
                    </ScrollView>
                </View>

                {/* ── PAGE 1: More Screen Content ── */}
                <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                    <MoreScreen hideHeader={true} />
                </View>
            </ScrollView>
            <CollectionDetailsSheet data={data} showCollectionSheet={showCollectionSheet} setShowCollectionSheet={setShowCollectionSheet} />

            {/* Hostel Selector Bottom Sheet */}
            <ModalSheet visible={showHostelSelector} onClose={() => setShowHostelSelector(false)} maxHeight="75%">
                {/* Header */}
                <View style={[s.selectorHeader, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[s.selectorIconWrap, { backgroundColor: theme.primary + '15' }]}>
                            <Ionicons name="business" size={16} color={theme.primary} />
                        </View>
                        <View>
                            <Text style={[s.selectorTitle, { color: theme.textPrimary }]}>Select Active Hostel</Text>
                            <Text style={[s.selectorSub, { color: theme.textSecondary }]}>
                                {hostels.length} {hostels.length === 1 ? 'hostel' : 'hostels'} registered
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => setShowHostelSelector(false)} style={[s.selectorCloseBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <Ionicons name="close" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* List of Hostels */}
                <ScrollView contentContainerStyle={s.selectorScrollContent} showsVerticalScrollIndicator={false}>
                    {hostelsLoading ? (
                        <View style={{ padding: 16 }}>
                            <SkeletonList count={3} />
                        </View>
                    ) : hostels.length === 0 ? (
                        <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
                            <Ionicons name="business-outline" size={32} color={theme.textSecondary} />
                            <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '700' }}>No Hostels Found</Text>
                            <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center' }}>No active hostels are registered under your account yet.</Text>
                            <TouchableOpacity
                                style={{ marginTop: 8, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: theme.primary + '15', borderRadius: 12 }}
                                onPress={() => loadHostels()}
                            >
                                <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>↺  Retry Loading</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        hostels.map((h: any) => {
                            const isActive = Number(h.hostel_id) === Number(user?.hostel_id);
                            const isSwitching = switchingHostelId === h.hostel_id;
                            
                            // Color theme based on hostel type
                            const isGirls = h.hostel_type?.toLowerCase().includes('girl');
                            const isBoys = h.hostel_type?.toLowerCase().includes('boy');
                            const statusColor = isGirls ? '#DB2777' : (isBoys ? '#2563EB' : '#0EA5E9');
                            const avatarBg = isGirls ? 'rgba(219, 39, 119, 0.12)' : (isBoys ? 'rgba(37, 99, 235, 0.12)' : 'rgba(14, 165, 233, 0.12)');

                            // Extract initials
                            const getInitials = (name: string) => {
                                if (!name || typeof name !== 'string') return 'H';
                                const cleanName = name.trim().replace(/\s+/g, ' ');
                                const parts = cleanName.split(' ');
                                if (parts.length > 1) {
                                    const first = parts[0]?.[0] || '';
                                    const second = parts[1]?.[0] || '';
                                    return (first + second).toUpperCase();
                                }
                                return cleanName.slice(0, 2).toUpperCase();
                            };

                            return (
                                <TouchableOpacity
                                    key={h.hostel_id}
                                    style={[
                                        s.hostelSelectItem,
                                        {
                                            backgroundColor: isActive ? (isDark ? '#1E293B' : '#F8FAFC') : 'transparent',
                                            borderColor: isActive ? theme.primary + '30' : (isDark ? '#334155' : '#E2E8F0'),
                                            borderWidth: 1,
                                        }
                                    ]}
                                    onPress={() => handleHostelSelect(h.hostel_id, h.hostel_name)}
                                    activeOpacity={0.75}
                                    disabled={isSwitching}
                                >
                                    <View style={s.hostelSelectInner}>
                                        {/* Left initials badge */}
                                        <View style={[s.hostelSelectAvatar, { backgroundColor: avatarBg, overflow: 'hidden' }]}>
                                            {h.photo && typeof h.photo === 'string' && h.photo.trim() !== '' && h.photo.trim() !== 'null' && h.photo.startsWith('http') ? (
                                                <Image source={{ uri: h.photo }} style={s.avatarImage} />
                                            ) : (
                                                <Text style={[s.hostelSelectAvatarText, { color: statusColor }]}>
                                                    {getInitials(h.hostel_name)}
                                                </Text>
                                            )}
                                        </View>

                                        {/* Middle info */}
                                        <View style={s.hostelSelectInfo}>
                                            <Text style={[s.hostelSelectName, { color: theme.textPrimary }]} numberOfLines={1}>
                                                {h.hostel_name}
                                            </Text>
                                            <View style={s.hostelSelectSubRow}>
                                                <Ionicons name="location-outline" size={11} color={theme.textSecondary} style={{ marginRight: 2 }} />
                                                <Text style={[s.hostelSelectAddress, { color: theme.textSecondary }]} numberOfLines={1}>
                                                    {(() => {
                                                        const addressParts = [h.address, h.city].filter(v => v && String(v).trim().length > 0 && String(v).trim() !== ',');
                                                        return addressParts.join(', ') || 'No address';
                                                    })()}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Right status / actions */}
                                        <View style={s.hostelSelectRight}>
                                            {isSwitching ? (
                                                <ActivityIndicator size="small" color={theme.primary} />
                                            ) : isActive ? (
                                                <View style={[s.activeIndicator, { backgroundColor: theme.primary }]}>
                                                    <Ionicons name="checkmark" size={12} color="#FFF" />
                                                </View>
                                            ) : (
                                                <View style={s.inactiveIndicator} />
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}

                    {/* Divider */}
                    <View style={[s.selectorDivider, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]} />

                    {hostelsLoading ? (
                        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                            <SkeletonList count={2} />
                        </View>
                    ) : (
                        <>
                            {/* Actions at the bottom of the list */}
                            {hostels.length < 2 && (
                                <TouchableOpacity
                                    style={[s.selectorActionBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                    onPress={() => {
                                        setShowHostelSelector(false);
                                        navigation.navigate('AddHostel');
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <View style={[s.selectorActionIcon, { backgroundColor: '#EDE9FE' }]}>
                                        <Ionicons name="add" size={18} color="#7C3AED" />
                                    </View>
                                    <Text style={[s.selectorActionText, { color: theme.textPrimary }]}>Add New Hostel</Text>
                                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[s.selectorActionBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                onPress={() => {
                                    setShowHostelSelector(false);
                                    navigation.navigate('Hostels');
                                }}
                                activeOpacity={0.75}
                            >
                                <View style={[s.selectorActionIcon, { backgroundColor: '#DBEAFE' }]}>
                                    <Ionicons name="list-outline" size={16} color="#2563EB" />
                                </View>
                                <Text style={[s.selectorActionText, { color: theme.textPrimary }]}>Manage All Hostels</Text>
                                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[s.selectorActionBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0', marginTop: 8 }]}
                                onPress={() => {
                                    setShowHostelSelector(false);
                                    setTourStep(0);
                                    setShowTour(true);
                                }}
                                activeOpacity={0.75}
                            >
                                <View style={[s.selectorActionIcon, { backgroundColor: '#FEF3C7' }]}>
                                    <Ionicons name="help-circle-outline" size={16} color="#D97706" />
                                </View>
                                <Text style={[s.selectorActionText, { color: theme.textPrimary }]}>Quick Tour Guide</Text>
                                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </ModalSheet>
            {renderTourOverlay()}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8F7FF' },

    // ── Premium Header ──────────────────────────────────────────────────────
    newHeader: {
        paddingBottom: 10,
        paddingHorizontal: 18,
        position: 'relative',
        overflow: 'hidden',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    hdrOrb1: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.05)',
        top: -60,
        right: -30,
    },
    hdrOrb2: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.04)',
        bottom: -20,
        left: 20,
    },
    hdrGreeting: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.65)',
        marginBottom: 1,
        letterSpacing: 0.2,
    },
    hdrDateStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    hdrDateText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    // Row 1: left group + right icons
    headerRow1: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    // Left: avatar + hostel name side by side
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        marginRight: 10,
    },
    avatarCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarLetter: {
        fontSize: 17,
        fontWeight: '900',
        color: '#FFF',
    },
    headerOwnerName: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -0.2,
        marginBottom: 3,
    },
    // Hostel name button (translucent pill style drop-down)
    hostelNameBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.28)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 14,
        gap: 4,
        alignSelf: 'flex-start',
    },
    hostelNameLabel: {
        fontSize: 11.5,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.92)',
        maxWidth: 140,
    },

    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRow2: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    greetingText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -0.3,
    },
    dateText: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.72)',
        marginTop: 3,
    },

    // ── Legacy Header (kept for error/loading screens) ───────────────────────
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

    // ── Overview card ────────────────────────────────────────────────────────
    overviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    overviewItem: {
        flex: 1,
        alignItems: 'center',
    },
    overviewDivider: {
        width: 1,
        alignSelf: 'stretch',
        marginHorizontal: 4,
    },
    overviewValue: {
        fontWeight: '800',
        marginBottom: 2,
    },
    overviewLabel: {
        fontWeight: '600',
        textAlign: 'center',
    },
    overviewProgressWrap: {
        paddingHorizontal: 2,
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

    // ── Collection details sheet ─────────────────────────────────────────────
    sheetHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    sheetTitleText: {
        fontSize: 18,
        fontWeight: '800',
    },
    sheetCloseBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(148,163,184,0.15)',
    },
    sheetHero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 16,
        padding: 14,
    },
    sheetHeroCircle: {
        width: 66,
        height: 66,
        borderRadius: 33,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(124,58,237,0.1)',
    },
    sheetHeroDivider: {
        height: 1,
        marginVertical: 2,
    },
    sheetTile: {
        flex: 1,
        backgroundColor: '#FEF2F2',
        padding: 10,
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#EF4444',
        gap: 2,
    },
    sheetTileLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#EF4444',
    },
    sheetTileValue: {
        fontSize: 15,
        fontWeight: '800',
    },
    sheetTileSub: {
        fontSize: 10,
        fontWeight: '700',
        color: '#991B1B',
    },
    sheetSectionLabel: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 8,
    },
    sheetSectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    sheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
    },
    sheetRowAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
    },
    sheetActionBtnText: {
        color: '#FFF',
        fontSize: 12.5,
        fontWeight: '800',
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
    rowCallBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },

    // ── Due/Overdue horizontal chip cards ───────────────────────────────────
    dueChip: {
        width: 190,
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    dueChipName: {
        fontSize: 13,
        fontWeight: '700',
    },
    dueChipMeta: {
        fontSize: 10.5,
        fontWeight: '600',
        marginTop: 3,
    },
    dueChipAmount: {
        fontSize: 15,
        fontWeight: '800',
    },
    dueChipCallBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Hostel Selector Sheet ────────────────────────────────────────────────
    selectorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        paddingTop: 8,
        borderBottomWidth: 1,
    },
    selectorIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectorTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    selectorSub: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },
    selectorCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectorScrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    hostelSelectItem: {
        borderRadius: 14,
        marginBottom: 12,
        padding: 14,
    },
    hostelSelectInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hostelSelectAvatar: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hostelSelectAvatarText: {
        fontSize: 14,
        fontWeight: '800',
    },
    hostelSelectInfo: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    hostelSelectName: {
        fontSize: 14,
        fontWeight: '700',
    },
    hostelSelectSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    hostelSelectAddress: {
        fontSize: 11,
        fontWeight: '500',
    },
    hostelSelectRight: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeIndicator: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inactiveIndicator: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#CBD5E1',
    },
    selectorDivider: {
        height: 1,
        marginVertical: 16,
    },
    selectorActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginBottom: 8,
    },
    selectorActionIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    selectorActionText: {
        fontSize: 13,
        fontWeight: '700',
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    tourOverlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
    },
    tourOverlayDimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    tourDialogCenter: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: Platform.OS === 'ios' ? 130 : 115,
    },
    tourDialogCard: {
        width: Dimensions.get('window').width - 32,
        borderRadius: 14,
        padding: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        position: 'relative',
    },
    tourArrowUp: {
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderBottomWidth: 10,
        borderStyle: 'solid',
        backgroundColor: 'transparent',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        position: 'absolute',
        top: -10,
        alignSelf: 'center',
    },
    tourDialogTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'left',
    },
    tourDialogDesc: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
        marginBottom: 20,
        textAlign: 'left',
    },
    tourProgressIndicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    tourProgressDot: {
        height: 6,
        width: 6,
        borderRadius: 3,
    },
    tourDialogFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    tourDialogBackText: {
        fontSize: 13,
        fontWeight: '700',
    },
    tourDialogNextBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tourDialogNextBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
    },
    tabChipsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 20,
        padding: 3,
        marginTop: 10,
        alignSelf: 'center',
    },
    tabChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 16,
        borderRadius: 17,
        gap: 6,
    },
    tabChipActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    tabChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.85)',
    },
    tabChipTextActive: {
        color: '#4F46E5',
        fontWeight: '800',
    },
});
