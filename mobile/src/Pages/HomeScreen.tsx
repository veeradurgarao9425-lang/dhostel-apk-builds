import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, Linking, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
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
    occupiedBeds: 0,
    totalBeds: 0,
    availableBeds: 0,
    todayAmount: 0,
    todaySplit: [] as { mode: string; total: number }[],
    unpaidStudents: [] as any[],
};

// ─── Skeleton Block ───────────────────────────────────────────────────────────
const SkeletonBox = ({ style, dark = false }: { style?: any; dark?: boolean }) => (
    <View style={[{ backgroundColor: dark ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.2)', borderRadius: 10 }, style]} />
);

// ─── Quick action config ──────────────────────────────────────────────────────
const QUICK_ACTIONS = [
    { label: 'Add\nStudent', emoji: '👤', bg: '#EDE9FE', route: 'AddStudent' },
    { label: 'Collect\nFee', emoji: '💰', bg: '#DCFCE7', route: 'FeeManagement' },
    { label: 'Add\nRoom', emoji: '🛏', bg: '#DBEAFE', route: 'AddRoom' },
    { label: 'Add\nExpense', emoji: '📋', bg: '#FEF3C7', route: 'AddExpense' },
];

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

            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            const todayStr = `${y}-${m}-${d}`;

            const [statsRes, summaryRes]: any = await Promise.all([
                api.get('/reports/dashboard-stats').catch(e => {
                    console.log('Dashboard stats error:', e.message);
                    return { data: { success: false } };
                }),
                api.get('/monthly-fees/summary').catch(e => {
                    console.log('Monthly fees summary error:', e.message);
                    return { data: { success: false } };
                }),
            ]);

            if (!statsRes.data.success && !summaryRes.data.success) {
                setHasError(true);
                return;
            }

            const d2 = statsRes.data.data || {};
            const todayRent = d2.todayRent || 0;
            const monthCollected = (d2.monthlyRentCollected ?? d2.feeCollection ?? 0) as number;
            const monthPending = (d2.monthlyRentPending ?? d2.pendingDuesAmount ?? 0) as number;
            const monthDue = (d2.monthlyRentDue ?? (monthCollected + monthPending)) as number;

            // ── Build top defaulters list ────────────────────────────────────
            let topDefaulters: any[] = [];
            if (summaryRes.data.success && summaryRes.data.data?.fees) {
                const fees: any[] = summaryRes.data.data.fees;
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                topDefaulters = fees
                    .filter(f =>
                        (f.balance || 0) > 0 &&
                        !['paid', 'fully paid'].includes((f.fee_status || '').toLowerCase())
                    )
                    .sort((a, b) => (b.balance || 0) - (a.balance || 0))
                    .slice(0, 5)
                    .map(f => {
                        const due = f.due_date ? new Date(f.due_date) : new Date();
                        due.setHours(0, 0, 0, 0);
                        const diffDays = Math.floor((now.getTime() - due.getTime()) / 86400000);
                        const isOverdue = diffDays > 0;
                        return {
                            id: f.student_id,
                            name: `${f.first_name || ''} ${f.last_name || ''}`.trim(),
                            amount: f.balance || 0,
                            phone: f.phone,
                            isOverdue,
                            daysLate: isOverdue ? diffDays : 0,
                            daysLeft: isOverdue ? 0 : Math.abs(diffDays),
                        };
                    });
            }

            setData({
                hostelName: user?.hostel_name || d2.hostel_name || 'My Hostel',
                monthAmount: monthCollected,
                monthDue,
                pendingAmount: monthPending,
                occupiedBeds: d2.occupiedBeds || 0,
                totalBeds: d2.totalBeds || 0,
                availableBeds: (d2.totalBeds || 0) - (d2.occupiedBeds || 0),
                todayAmount: todayRent,
                todaySplit: Array.isArray(d2.todaySplit)
                    ? d2.todaySplit.map((x: any) => ({ mode: x.mode, total: Number(x.total || 0) }))
                    : [],
                unpaidStudents: topDefaulters,
            });
            isFirstLoadRef.current = false;
        } catch (e) {
            console.log('Dashboard load error:', e);
            setHasError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const collectedPct = data.monthDue > 0
        ? Math.min(100, Math.round((data.monthAmount / data.monthDue) * 100))
        : 0;

    // ── Loading State ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={s.root}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
                    <View style={s.headerTopRow}>
                        <View>
                            <Text style={s.greeting}>Hello,</Text>
                            <Text style={s.userName}>{user?.full_name || 'Owner'}</Text>
                        </View>
                        <ProfileMenu />
                    </View>
                    <SkeletonBox style={{ height: 16, width: '50%', marginBottom: 8 }} />
                    <SkeletonBox style={{ height: 48, width: '70%', marginBottom: 16 }} />
                    <SkeletonBox style={{ height: 8, marginBottom: 8 }} />
                    <SkeletonBox style={{ height: 12, width: '60%', marginBottom: 20 }} />
                    <View style={s.statsRow}>
                        <SkeletonBox style={{ flex: 1, height: 56, marginHorizontal: 6, borderRadius: 12 }} />
                        <SkeletonBox style={{ flex: 1, height: 56, marginHorizontal: 6, borderRadius: 12 }} />
                        <SkeletonBox style={{ flex: 1, height: 56, marginHorizontal: 6, borderRadius: 12 }} />
                    </View>
                </LinearGradient>
                <View style={s.bodyContent}>
                    {/* Quick Actions Title */}
                    <SkeletonBox dark style={{ height: 15, width: 100, marginBottom: 12 }} />
                    {/* Quick Actions Grid */}
                    <View style={s.quickGrid}>
                        {[1, 2, 3, 4].map(i => (
                            <View key={i} style={[s.quickCard, { backgroundColor: '#FFF' }]}>
                                <SkeletonBox dark style={{ width: 44, height: 44, borderRadius: 14, marginBottom: 8 }} />
                                <SkeletonBox dark style={{ height: 10, width: 50, alignSelf: 'center', marginBottom: 4 }} />
                                <SkeletonBox dark style={{ height: 10, width: 30, alignSelf: 'center' }} />
                            </View>
                        ))}
                    </View>

                    {/* Earnings Report Button */}
                    <View style={s.infoCard}>
                        <SkeletonBox dark style={{ width: 32, height: 32, borderRadius: 16 }} />
                        <View style={{ flex: 1, gap: 6 }}>
                            <SkeletonBox dark style={{ height: 12, width: 140 }} />
                            <SkeletonBox dark style={{ height: 8, width: 180 }} />
                        </View>
                        <SkeletonBox dark style={{ width: 10, height: 16 }} />
                    </View>

                    {/* Section Title */}
                    <SkeletonBox dark style={{ height: 15, width: 130, marginBottom: 12, marginTop: 4 }} />

                    {/* List Items */}
                    {[1, 2].map(i => (
                        <View key={i} style={[s.studentCard, { backgroundColor: '#FFF' }]}>
                            <View style={s.studentInfo}>
                                <SkeletonBox dark style={{ height: 12, width: 100, marginBottom: 6 }} />
                                <SkeletonBox dark style={{ height: 8, width: 70 }} />
                            </View>
                            <SkeletonBox dark style={{ height: 12, width: 50, marginRight: 16 }} />
                            <SkeletonBox dark style={{ height: 26, width: 50, borderRadius: 8, marginRight: 12 }} />
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    // ── Error / Offline State ─────────────────────────────────────────────────
    if (hasError) {
        return (
            <View style={s.root}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
                    <View style={s.headerTopRow}>
                        <View>
                            <Text style={s.greeting}>Hello,</Text>
                            <Text style={s.userName}>{user?.full_name || 'Owner'}</Text>
                        </View>
                        <ProfileMenu />
                    </View>
                </LinearGradient>
                <View style={s.errorBox}>
                    <Text style={s.errorEmoji}>📡</Text>
                    <Text style={s.errorTitle}>Server Waking Up…</Text>
                    <Text style={s.errorSub}>
                        The server may be starting up after inactivity.{'\n'}
                        Please wait a moment and tap Retry.
                    </Text>
                    <TouchableOpacity style={[s.retryBtn, { backgroundColor: theme.primary }]} onPress={() => load()}>
                        <Text style={s.retryText}>↺  Retry</Text>
                    </TouchableOpacity>
                    {/* Still let them navigate */}
                    <View style={s.quickGrid}>
                        {QUICK_ACTIONS.map(a => (
                            <TouchableOpacity
                                key={a.route}
                                style={s.quickCard}
                                onPress={() => navigation.navigate(a.route)}
                            >
                                <View style={[s.quickIconBox, { backgroundColor: a.bg }]}>
                                    <Text style={s.quickEmoji}>{a.emoji}</Text>
                                </View>
                                <Text style={s.quickLabel}>{a.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        );
    }

    // ── Main Dashboard ────────────────────────────────────────────────────────
    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />
            <ScrollView
                style={s.body}
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
                {/* ── Header Gradient ── */}
                <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
                    <View style={s.headerTopRow}>
                        <View>
                            <Text style={s.greeting}>Hello,</Text>
                            <Text style={s.userName}>{user?.full_name || 'Owner'}</Text>
                            {data.hostelName ? (
                                <Text style={s.hostelTag}>🏠 {data.hostelName}</Text>
                            ) : null}
                        </View>
                        <View style={s.headerActions}>
                            <ProfileMenu />
                        </View>
                    </View>

                    <Text style={s.amountLabel}>This Month's Collection HELLO! DURGARAO GORIPARTHI</Text>
                    <Text style={s.bigAmount}>₹{data.monthAmount.toLocaleString('en-IN')}</Text>

                    <View style={s.progressBg}>
                        <View style={[s.progressFill, { width: `${collectedPct}%` as any }]} />
                    </View>
                    <Text style={s.progressText}>
                        {collectedPct}% collected · ₹{data.pendingAmount.toLocaleString('en-IN')} still pending
                    </Text>

                    <View style={s.statsRow}>
                        <TouchableOpacity
                            style={s.statBox}
                            onPress={() => navigation.navigate('RoomsTab', { filter: 'Full' })}
                        >
                            <Text style={s.statNum}>{data.occupiedBeds}</Text>
                            <Text style={s.statLbl}>Rooms Filled</Text>
                        </TouchableOpacity>
                        <View style={s.statDivider} />
                        <TouchableOpacity
                            style={s.statBox}
                            onPress={() => navigation.navigate('RoomsTab', { filter: 'Vacant' })}
                        >
                            <Text style={s.statNum}>{data.availableBeds}</Text>
                            <Text style={s.statLbl}>Empty Beds</Text>
                        </TouchableOpacity>
                        <View style={s.statDivider} />
                        <TouchableOpacity
                            style={s.statBox}
                            onPress={() => navigation.navigate('FinanceTab')}
                        >
                            <Text style={s.statNum}>
                                ₹{(data.todayAmount || 0).toLocaleString('en-IN')}
                            </Text>
                            <Text style={s.statLbl}>Today Rent</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <View style={s.bodyContent}>
                    {/* ── Quick Actions ── */}
                    <Text style={s.sectionTitle}>Quick Actions</Text>
                    <View style={s.quickGrid}>
                        {QUICK_ACTIONS.map(a => (
                            <TouchableOpacity
                                key={a.route}
                                style={s.quickCard}
                                onPress={() => navigation.navigate(a.route)}
                                activeOpacity={0.8}
                            >
                                <View style={[s.quickIconBox, { backgroundColor: a.bg }]}>
                                    <Text style={s.quickEmoji}>{a.emoji}</Text>
                                </View>
                                <Text style={s.quickLabel}>{a.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Today Payment Split ── */}
                    {data.todaySplit.length > 0 && (
                        <View style={[s.infoCard, { marginBottom: 16 }]}>
                            <Text style={s.infoCardIcon}>💳</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={s.infoCardTitle}>Today by Payment Mode</Text>
                                <Text style={s.infoCardSub}>Split of today's collections</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                {data.todaySplit.map((m, idx) => (
                                    <Text key={idx} style={s.splitText}>
                                        {m.mode}: ₹{Number(m.total || 0).toLocaleString('en-IN')}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ── Earnings Report Button ── */}
                    <TouchableOpacity
                        style={s.infoCard}
                        onPress={() => navigation.navigate('IncomeDetails', { period: 'month' })}
                        activeOpacity={0.85}
                    >
                        <Text style={s.infoCardIcon}>📊</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={s.infoCardTitle}>See Full Earnings Report</Text>
                            <Text style={s.infoCardSub}>Day · Week · Month breakdown</Text>
                        </View>
                        <Text style={s.arrowText}>›</Text>
                    </TouchableOpacity>

                    {/* ── Defaulters / Who Hasn't Paid ── */}
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>
                            {data.unpaidStudents.length > 0 ? '⚠️  Who Hasn\'t Paid?' : ''}
                        </Text>
                        {data.unpaidStudents.length > 0 && (
                            <TouchableOpacity onPress={() => navigation.navigate('FeeManagement')}>
                                <Text style={s.seeAllText}>See All →</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {data.unpaidStudents.length > 0 ? (
                        data.unpaidStudents.map(student => (
                            <TouchableOpacity
                                key={student.id}
                                style={[s.studentCard, student.isOverdue && s.studentCardOverdue]}
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate('StudentDetails', { studentId: student.id })}
                            >
                                <View style={[s.stripe, { backgroundColor: student.isOverdue ? '#EF4444' : '#F59E0B' }]} />
                                <View style={s.studentInfo}>
                                    <Text style={s.studentName}>{student.name}</Text>
                                    <Text style={[s.studentDays, { color: student.isOverdue ? '#EF4444' : '#D97706' }]}>
                                        {student.isOverdue
                                            ? `${student.daysLate} day${student.daysLate !== 1 ? 's' : ''} overdue`
                                            : `Due in ${student.daysLeft} day${student.daysLeft !== 1 ? 's' : ''}`}
                                    </Text>
                                </View>
                                <Text style={s.studentAmount}>₹{student.amount.toLocaleString('en-IN')}</Text>
                                <TouchableOpacity
                                    style={[s.callBtn, student.isOverdue && s.callBtnRed]}
                                    onPress={() => Linking.openURL(`tel:${student.phone}`)}
                                >
                                    <Text style={s.callBtnText}>📞 Call</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={s.allClearBanner}>
                            <Text style={{ fontSize: 36 }}>🎉</Text>
                            <View style={{ marginLeft: 16 }}>
                                <Text style={s.allClearTitle}>All Clear!</Text>
                                <Text style={s.allClearSub}>No pending payments this month</Text>
                            </View>
                        </View>
                    )}

                    <View style={{ height: 30 }} />
                </View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F1F5F9' },

    // Header
    header: {
        paddingTop: 52,
        paddingBottom: 28,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    greeting: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    userName: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 1 },
    hostelTag: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 3 },
    headerActions: { flexDirection: 'row', gap: 12 },

    amountLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
    bigAmount: { fontSize: 44, fontWeight: '900', color: '#FFF', letterSpacing: -1, marginBottom: 16 },

    progressBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: '#FFF', borderRadius: 99 },
    progressText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 20 },

    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.18)',
        borderRadius: 16,
        paddingVertical: 14,
    },
    statBox: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
    statNum: { fontSize: 20, fontWeight: '900', color: '#FFF', marginBottom: 2 },
    statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },

    // Body
    body: { flex: 1 },
    bodyContent: { padding: 16 },

    // Loading
    loadingText: { fontSize: 15, fontWeight: '700', color: '#64748B', marginTop: 14 },
    loadingSubText: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 4 },

    // Error
    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    errorEmoji: { fontSize: 52, marginBottom: 12 },
    errorTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
    errorSub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    retryBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginBottom: 32 },
    retryText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

    // Quick actions
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
    seeAllText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },

    quickGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    quickCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 18,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
    },
    quickIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickEmoji: { fontSize: 22 },
    quickLabel: { fontSize: 10, fontWeight: '700', color: '#475569', textAlign: 'center' },

    // Info card (payment split + earnings report)
    infoCard: {
        backgroundColor: '#FFF',
        borderRadius: 18,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
    },
    infoCardIcon: { fontSize: 26 },
    infoCardTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    infoCardSub: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 },
    arrowText: { fontSize: 26, color: '#CBD5E1', fontWeight: '300' },
    splitText: { fontSize: 11, fontWeight: '800', color: '#1E293B' },

    // Defaulters list
    studentCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#FDE68A',
        elevation: 1,
    },
    studentCardOverdue: { borderColor: '#FECACA' },
    stripe: { width: 5, alignSelf: 'stretch' },
    studentInfo: { flex: 1, paddingVertical: 14, paddingLeft: 12 },
    studentName: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 3 },
    studentDays: { fontSize: 11, fontWeight: '600' },
    studentAmount: { fontSize: 14, fontWeight: '900', color: '#1E293B', paddingHorizontal: 10 },
    callBtn: {
        backgroundColor: '#FEF3C7',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 12,
    },
    callBtnRed: { backgroundColor: '#FEE2E2' },
    callBtnText: { fontSize: 11, fontWeight: '700', color: '#92400E' },

    // All-clear banner
    allClearBanner: {
        backgroundColor: '#F0FDF4',
        borderRadius: 18,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        marginTop: 4,
    },
    allClearTitle: { fontSize: 16, fontWeight: '800', color: '#15803D' },
    allClearSub: { fontSize: 12, color: '#4ADE80', fontWeight: '600', marginTop: 3 },
});
