import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ProfileMenu } from '../components/ProfileMenu';

// ─── Initial state ────────────────────────────────────────────────────────────
const INITIAL_STATE = {
    hostelName: '',
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
    totalRooms: 0,
    occupancyRate: 0,
    prebookingsCount: 0,
    noticesCount: 0,
};

// ─── Greeting helper ──────────────────────────────────────────────────────────
const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
};

// ─── Quick Management Actions ─────────────────────────────────────────────────
const QUICK_ACTIONS = [
    { label: 'Add\nTenant', icon: 'person-add-outline', color: '#7C3AED', bg: '#EDE9FE', route: 'AddStudent', comingSoon: false },
    { label: 'Add\nRoom',   icon: 'home-outline',       color: '#2563EB', bg: '#DBEAFE', route: 'AddRoom',    comingSoon: false },
    { label: 'Pre-Book',    icon: 'calendar-outline',   color: '#EA580C', bg: '#FFEDD5', route: 'PreBooking', comingSoon: false },
    { label: 'Bills',       icon: 'receipt-outline',    color: '#D97706', bg: '#FEF3C7', route: 'BillReminders', comingSoon: false },
    { label: 'Remind',      icon: 'notifications-outline', color: '#DC2626', bg: '#FEE2E2', route: 'Reminders', comingSoon: false },
    { label: 'Staff',       icon: 'people-outline',     color: '#059669', bg: '#D1FAE5', route: 'Staff', comingSoon: false },
];

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
                {amount > 0 ? `₹${(amount / 1000).toFixed(0)}k` : ''}
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
    const { theme } = useTheme();
    const [data, setData] = useState(INITIAL_STATE);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasError, setHasError] = useState(false);
    const isFirstLoadRef = React.useRef(true);

    // ── Data loader ───────────────────────────────────────────────────────────
    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh && isFirstLoadRef.current) setLoading(true);
            setHasError(false);

            const [statsRes, summaryRes]: any = await Promise.all([
                api.get('/reports/dashboard-stats').catch(() => ({ data: { success: false } })),
                api.get('/monthly-fees/summary').catch(() => ({ data: { success: false } })),
            ]);

            if (!statsRes.data.success && !summaryRes.data.success) {
                setHasError(true);
                return;
            }

            const d2 = statsRes.data.data || {};
            const monthCollected = (d2.monthlyRentCollected ?? d2.feeCollection ?? 0) as number;
            const monthPending   = (d2.monthlyRentPending  ?? d2.pendingDuesAmount  ?? 0) as number;
            const monthDue       = (d2.monthlyRentDue ?? (monthCollected + monthPending)) as number;
            const occupied       = d2.occupiedBeds || 0;
            const total          = d2.totalBeds || 0;

            // Build top 3 defaulters list
            let topDefaulters: any[] = [];
            if (summaryRes.data.success && summaryRes.data.data?.fees) {
                const fees: any[] = summaryRes.data.data.fees;
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                topDefaulters = fees
                    .filter(f =>
                        (f.balance || 0) > 0 &&
                        !['paid', 'fully paid'].includes((f.fee_status || '').toLowerCase()),
                    )
                    .sort((a, b) => (b.balance || 0) - (a.balance || 0))
                    .slice(0, 3)
                    .map(f => {
                        const due = f.due_date ? new Date(f.due_date) : new Date();
                        due.setHours(0, 0, 0, 0);
                        const diffDays = Math.floor((now.getTime() - due.getTime()) / 86400000);
                        return {
                            id: f.student_id,
                            name: `${f.first_name || ''} ${f.last_name || ''}`.trim(),
                            amount: f.balance || 0,
                            phone: f.phone,
                            isOverdue: diffDays > 0,
                            daysLate: diffDays > 0 ? diffDays : 0,
                            daysLeft: diffDays <= 0 ? Math.abs(diffDays) : 0,
                        };
                    });
            }

            setData({
                hostelName:      user?.hostel_name || d2.hostel_name || 'My Hostel',
                monthAmount:     monthCollected,
                monthDue,
                pendingAmount:   monthPending,
                totalDuesAmount: d2.pendingDuesAmount || 0,
                occupiedBeds:    occupied,
                totalBeds:       total,
                availableBeds:   total - occupied,
                todayAmount:     d2.todayRent || 0,
                activeTenants:   occupied,
                leftTenants:     d2.leftTenants || d2.vacatedStudents || 0,
                unpaidStudents:  topDefaulters,
                totalRooms:      d2.totalRooms || 0,
                occupancyRate:   d2.occupancyRate || 0,
                prebookingsCount: d2.prebookingsCount || 0,
                noticesCount:    d2.noticesCount || 0,
            });
            isFirstLoadRef.current = false;
        } catch {
            setHasError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    // ── Quick action press handler ────────────────────────────────────────────
    const handleQuickAction = (a: typeof QUICK_ACTIONS[0]) => {
        if (a.comingSoon) {
            navigation.navigate('ComingSoon', (a as any).routeParams);
        } else {
            navigation.navigate(a.route);
        }
    };

    // ── Revenue chart data (current month = real; past = 0 until API returns history) ──
    const currentMonthIdx = new Date().getMonth(); // 0-based
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueData = Array.from({ length: 6 }, (_, i) => {
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
    const fmt = (n: number) =>
        n >= 1000
            ? `₹${(n / 1000).toFixed(1)}k`
            : `₹${n.toLocaleString('en-IN')}`;

    // ─── Avatar initial ──────────────────────────────────────────────────────
    const avatarLetter = (name: string) => (name || 'T')[0].toUpperCase();

    // ── Loading Screen ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={s.root}>
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
            <View style={s.root}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
                    <View style={s.headerRow}>
                        <View>
                            <Text style={s.greeting}>{getGreeting()},</Text>
                            <Text style={s.ownerName}>{(user?.full_name || 'Owner').split(' ')[0]}</Text>
                        </View>
                        <TouchableOpacity style={s.bellBtn}>
                            <Ionicons name="notifications-outline" size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
                <View style={s.errorCenter}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>📡</Text>
                    <Text style={s.errorTitle}>Server Waking Up…</Text>
                    <Text style={s.errorSub}>
                        The server may be starting up after inactivity.{'\n'}
                        Please wait a moment and tap Retry.
                    </Text>
                    <TouchableOpacity
                        style={s.retryBtn}
                        onPress={() => load()}
                        activeOpacity={0.85}
                    >
                        <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.retryGrad}>
                            <Text style={s.retryText}>↺  Retry</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Main Dashboard ────────────────────────────────────────────────────────
    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* ─────────────────── FIXED HEADER ─────────────────── */}
            <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
                <View style={s.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.greeting}>{getGreeting()},</Text>
                        <Text style={s.ownerName} numberOfLines={1}>
                            {(user?.full_name || 'Owner').split(' ').slice(0, 2).join(' ')}
                        </Text>
                        <Text style={s.hostelTag}>🏠 {data.hostelName}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity
                            style={s.bellBtn}
                            onPress={() => navigation.navigate('Notifications')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="notifications-outline" size={22} color="#FFF" />
                            {data.totalDuesAmount > 0 && <View style={s.bellDot} />}
                        </TouchableOpacity>
                        <ProfileMenu />
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 110 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); load(true); }}
                        tintColor="#7C3AED"
                    />
                }
            >

                <View style={s.body}>

                    {/* ─────────────────── BEDS OVERVIEW ─────────────────── */}
                    <View style={s.card}>
                        <TouchableOpacity
                            style={s.cardHeader}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate('Rooms', { filter: 'All' })}
                        >
                            <View style={s.cardHeaderLeft}>
                                <Ionicons name="apps" size={17} color="#7C3AED" />
                                <Text style={s.cardTitle}>Beds & Occupancy Overview</Text>
                                <Ionicons name="chevron-forward" size={14} color="#94A3B8" style={{ marginLeft: 2 }} />
                            </View>
                            <Text style={s.cardMeta}>
                                Total: {data.totalBeds} beds
                            </Text>
                        </TouchableOpacity>

                        {/* Progress Bar Visual */}
                        <View style={s.bedProgressContainer}>
                            <View style={s.progressBarBackground}>
                                <View style={[s.progressBarFill, { width: `${data.occupancyRate}%` }]} />
                            </View>
                            <View style={s.progressTextRow}>
                                <Text style={s.progressTextLabel}>Occupancy Rate</Text>
                                <Text style={s.progressTextVal}>{data.occupancyRate}%</Text>
                            </View>
                        </View>

                        <View style={s.bedsRowNew}>
                            {/* Available */}
                            <TouchableOpacity
                                style={[s.bedCardNew, { borderColor: '#E8F5E9' }]}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('Rooms', { filter: 'Vacant' })}
                            >
                                <View style={[s.bedIconNew, { backgroundColor: '#E8F5E9' }]}>
                                    <Ionicons name="checkmark-circle-sharp" size={18} color="#2E7D32" />
                                </View>
                                <View>
                                    <Text style={[s.bedNumNew, { color: '#2E7D32' }]}>{data.availableBeds}</Text>
                                    <Text style={s.bedLblNew}>Available</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Occupied */}
                            <TouchableOpacity
                                style={[s.bedCardNew, { borderColor: '#FFEBEE' }]}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('Rooms', { filter: 'Full' })}
                            >
                                <View style={[s.bedIconNew, { backgroundColor: '#FFEBEE' }]}>
                                    <Ionicons name="people-sharp" size={18} color="#C62828" />
                                </View>
                                <View>
                                    <Text style={[s.bedNumNew, { color: '#C62828' }]}>{data.occupiedBeds}</Text>
                                    <Text style={s.bedLblNew}>Occupied</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Notices board */}
                            <TouchableOpacity
                                style={[s.bedCardNew, { borderColor: '#FFF3E0' }]}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('Notices')}
                            >
                                <View style={[s.bedIconNew, { backgroundColor: '#FFF3E0' }]}>
                                    <Ionicons name="megaphone-sharp" size={18} color="#EF6C00" />
                                </View>
                                <View>
                                    <Text style={[s.bedNumNew, { color: '#EF6C00' }]}>{data.noticesCount}</Text>
                                    <Text style={s.bedLblNew}>Notices</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─────────────────── QUICK MANAGEMENT ─────────────────── */}
                    <View style={s.card}>
                        <View style={s.cardHeader}>
                            <View style={s.cardHeaderLeft}>
                                <Ionicons name="flash-outline" size={17} color="#7C3AED" />
                                <Text style={s.cardTitle}>Quick Management</Text>
                            </View>
                        </View>
                        <View style={s.quickRow}>
                            {QUICK_ACTIONS.map((a, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={s.quickItem}
                                    activeOpacity={0.75}
                                    onPress={() => handleQuickAction(a)}
                                >
                                    <View style={s.quickIconWrap}>
                                        <View style={[s.quickIconCircle, { backgroundColor: a.bg }]}>
                                            <Ionicons name={a.icon as any} size={22} color={a.color} />
                                        </View>
                                        {a.comingSoon && (
                                            <View style={s.lockBadge}>
                                                <Ionicons name="lock-closed" size={7} color="#FFF" />
                                            </View>
                                        )}
                                        {a.route === 'PreBooking' && data.prebookingsCount > 0 && (
                                            <View style={s.prebookBadge}>
                                                <Text style={s.prebookBadgeText}>{data.prebookingsCount}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text
                                        style={[
                                            s.quickLabel,
                                            a.comingSoon && { color: '#9CA3AF' },
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {a.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* ─────────────────── STATISTICS ─────────────────── */}
                    <View style={s.sectionBlock}>
                        <Text style={s.sectionTitle}>📊 Statistics</Text>
                        <View style={s.statsGrid}>

                            {/* Line 1: Left Tenants & Occupancy Rate */}
                            {/* Left Tenants */}
                            <TouchableOpacity
                                style={[s.statCard, { backgroundColor: '#FFF', borderColor: '#E5E7EB', borderWidth: 1.5 }]}
                                onPress={() => navigation.navigate('Students', { filter: 'Inactive' })}
                                activeOpacity={0.8}
                            >
                                <View style={[s.statIconBox, { backgroundColor: '#F3F4F6' }]}>
                                    <Ionicons name="person-remove" size={20} color="#6B7280" />
                                </View>
                                <Text style={[s.statNum, { color: '#6B7280' }]}>{data.leftTenants}</Text>
                                <Text style={s.statLbl}>Left Tenants</Text>
                            </TouchableOpacity>

                            {/* Occupancy Rate */}
                            <TouchableOpacity
                                style={[s.statCard, { backgroundColor: '#FFF', borderColor: '#FBCFE8', borderWidth: 1.5 }]}
                                onPress={() => navigation.navigate('Rooms', { filter: 'All' })}
                                activeOpacity={0.8}
                            >
                                <View style={[s.statIconBox, { backgroundColor: '#FCE7F3' }]}>
                                    <Ionicons name="analytics" size={20} color="#DB2777" />
                                </View>
                                <Text style={[s.statNum, { color: '#DB2777' }]}>{data.occupancyRate}%</Text>
                                <Text style={s.statLbl}>Occupancy Rate</Text>
                            </TouchableOpacity>

                            {/* Line 2: Total Rooms & Active Tenants */}
                            {/* Total Rooms */}
                            <TouchableOpacity
                                style={[s.statCard, { backgroundColor: '#FFF', borderColor: '#BFDBFE', borderWidth: 1.5 }]}
                                onPress={() => navigation.navigate('Rooms', { filter: 'All' })}
                                activeOpacity={0.8}
                            >
                                <View style={[s.statIconBox, { backgroundColor: '#DBEAFE' }]}>
                                    <Ionicons name="home" size={20} color="#2563EB" />
                                </View>
                                <Text style={[s.statNum, { color: '#2563EB' }]}>{data.totalRooms}</Text>
                                <Text style={s.statLbl}>Total Rooms</Text>
                            </TouchableOpacity>

                            {/* Active Tenants */}
                            <TouchableOpacity
                                style={[s.statCard, { backgroundColor: '#FFF', borderColor: '#DDD6FE', borderWidth: 1.5 }]}
                                onPress={() => navigation.navigate('Students')}
                                activeOpacity={0.8}
                            >
                                <View style={[s.statIconBox, { backgroundColor: '#EDE9FE' }]}>
                                    <Ionicons name="people" size={20} color="#7C3AED" />
                                </View>
                                <Text style={[s.statNum, { color: '#7C3AED' }]}>{data.activeTenants}</Text>
                                <Text style={s.statLbl}>Active Tenants</Text>
                            </TouchableOpacity>

                            {/* Line 3: Pending Dues & Collected Amount (Swapped) */}
                            {/* Pending Dues */}
                            <TouchableOpacity
                                style={[s.statCard, { backgroundColor: '#FFF', borderColor: '#FDE68A', borderWidth: 1.5 }]}
                                onPress={() => navigation.navigate('PendingTab')}
                                activeOpacity={0.8}
                            >
                                <View style={[s.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                                    <Ionicons name="time" size={20} color="#D97706" />
                                </View>
                                <Text style={[s.statNum, { color: '#D97706' }]}>{fmt(data.totalDuesAmount)}</Text>
                                <Text style={s.statLbl}>Pending Dues</Text>
                                {data.totalDuesAmount > 0 && <View style={s.redDot} />}
                            </TouchableOpacity>

                            {/* Collected Amount */}
                            <TouchableOpacity
                                style={[s.statCard, { backgroundColor: '#FFF', borderColor: '#A7F3D0', borderWidth: 1.5 }]}
                                onPress={() => navigation.navigate('CollectedPayments')}
                                activeOpacity={0.8}
                            >
                                <View style={[s.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                                    <Ionicons name="cash" size={20} color="#16A34A" />
                                </View>
                                <Text style={[s.statNum, { color: '#16A34A' }]}>{fmt(data.monthAmount)}</Text>
                                <Text style={s.statLbl}>Collected</Text>
                            </TouchableOpacity>

                        </View>
                    </View>

                    {/* ─────────────────── FINANCE HUB ─────────────────── */}
                    <View style={s.sectionBlock}>
                        <Text style={s.sectionTitle}>💹 Finance Hub</Text>

                        {/* Dues Report — full width */}
                        <TouchableOpacity
                            style={s.finHubCard}
                            onPress={() => navigation.navigate('PendingTab')}
                            activeOpacity={0.85}
                        >
                            <View style={[s.finHubAccent, { backgroundColor: '#DC2626' }]} />
                            <View style={[s.finHubIconBox, { backgroundColor: '#FEE2E2' }]}>
                                <Ionicons name="time-outline" size={22} color="#DC2626" />
                            </View>
                            <View style={s.finHubBody}>
                                <Text style={s.finHubTitle}>Dues Report</Text>
                                <Text style={s.finHubSub}>Tap to view all unpaid tenants</Text>
                            </View>
                            <View style={s.finHubRight}>
                                <Text style={[s.finHubAmount, { color: '#DC2626' }]}>
                                    ₹{data.totalDuesAmount.toLocaleString('en-IN')}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                            </View>
                        </TouchableOpacity>

                        {/* Receipts — full width */}
                        <TouchableOpacity
                            style={s.finHubCard}
                            onPress={() => navigation.navigate('CollectedPayments')}
                            activeOpacity={0.85}
                        >
                            <View style={[s.finHubAccent, { backgroundColor: '#16A34A' }]} />
                            <View style={[s.finHubIconBox, { backgroundColor: '#DCFCE7' }]}>
                                <Ionicons name="receipt-outline" size={22} color="#16A34A" />
                            </View>
                            <View style={s.finHubBody}>
                                <Text style={s.finHubTitle}>Receipts & History</Text>
                                <Text style={s.finHubSub}>This month's collections</Text>
                            </View>
                            <View style={s.finHubRight}>
                                <Text style={[s.finHubAmount, { color: '#16A34A' }]}>
                                    ₹{data.monthAmount.toLocaleString('en-IN')}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                            </View>
                        </TouchableOpacity>

                        {/* Financial Overview — full width */}
                        <TouchableOpacity
                            style={s.finHubCard}
                            onPress={() => navigation.navigate('OverviewTab')}
                            activeOpacity={0.85}
                        >
                            <View style={[s.finHubAccent, { backgroundColor: '#7C3AED' }]} />
                            <View style={[s.finHubIconBox, { backgroundColor: '#EDE9FE' }]}>
                                <Ionicons name="bar-chart-outline" size={22} color="#7C3AED" />
                            </View>
                            <View style={s.finHubBody}>
                                <Text style={s.finHubTitle}>Financial Overview</Text>
                                <Text style={s.finHubSub}>Profit & Loss, monthly overview</Text>
                            </View>
                            <View style={s.finHubRight}>
                                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                            </View>
                        </TouchableOpacity>

                    </View>

                    {/* ─────────────────── REVENUE OVERVIEW ─────────────────── */}
                    <TouchableOpacity
                        style={s.card}
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('IncomeDetails', { period: 'month' })}
                    >
                        <View style={s.cardHeader}>
                            <View style={s.cardHeaderLeft}>
                                <Ionicons name="trending-up-outline" size={17} color="#7C3AED" />
                                <Text style={s.cardTitle}>Revenue Overview</Text>
                            </View>
                            <Text style={s.cardMeta}>Last 6 months</Text>
                        </View>
                        <View style={s.chartWrap}>
                            {revenueData.map((item, i) => (
                                <RevenueBar
                                    key={i}
                                    amount={item.amount}
                                    maxAmount={maxRevenue}
                                    month={item.month}
                                    isCurrent={item.isCurrent}
                                />
                            ))}
                        </View>
                        <Text style={s.chartNote}>
                            * Past months will fill as data accumulates
                        </Text>
                    </TouchableOpacity>


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
        borderRadius: 20,
        padding: 16,
        elevation: 2,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    cardTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    cardMeta: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },

    // ── Beds Overview ────────────────────────────────────────────────────────
    bedProgressContainer: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    progressBarBackground: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
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
        borderRadius: 14,
        borderWidth: 1.5,
        backgroundColor: '#FFF',
        gap: 8,
    },
    bedIconNew: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bedNumNew: {
        fontSize: 14,
        fontWeight: '800',
        lineHeight: 18,
    },
    bedLblNew: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 1,
    },

    // ── Quick Management ─────────────────────────────────────────────────────
    quickRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    quickItem: { width: '30%', alignItems: 'center', marginVertical: 8, paddingHorizontal: 2 },
    quickIconWrap: { position: 'relative', marginBottom: 7 },
    quickIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 15,
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
        fontSize: 10,
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
        width: '47%',
        borderRadius: 18,
        padding: 14,
        position: 'relative',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
    },
    statIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    statNum: { fontSize: 20, fontWeight: '900', marginBottom: 3 },
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
});
