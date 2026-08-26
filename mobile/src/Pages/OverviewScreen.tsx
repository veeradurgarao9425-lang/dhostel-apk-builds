import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, RefreshControl, Dimensions, Modal, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { ProfileMenu } from '../components/ProfileMenu';
import { HeaderNotification } from '../components/HeaderNotification';
import { useTheme } from '../../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { useTranslation } from 'react-i18next';
import { useRefresh } from '../../contexts/RefreshContext';
import { CustomDateRangePicker } from '../components/ui/pickers/CustomDateRangePicker';
import { CustomMonthYearPicker } from '../components/ui/pickers/CustomMonthYearPicker';
import { toLocalDateStr } from '../utils/dateUtils';
import { ErrorState } from '../components/ui/ErrorState';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Category Colors & Icons ──────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
    'electricity': '#F59E0B',
    'utilities': '#3B82F6',
    'maintenance': '#8B5CF6',
    'salaries': '#EC4899',
    'staff': '#EC4899',
    'groceries': '#F97316',
    'kitchen': '#F97316',
    'supplies': '#06B6D4',
    'rent': '#6366F1',
    'internet': '#14B8A6',
    'cleaning': '#EF4444',
    'water': '#0EA5E9',
    'lift': '#6366F1',
    'refund': '#EF4444',
    'deposit': '#F43F5E',
    'other': '#64748B',
    'others': '#64748B',
    'misc': '#64748B',
};

const CAT_ICONS: Record<string, string> = {
    'electricity': 'flash-sharp',
    'utilities': 'build-sharp',
    'maintenance': 'settings-sharp',
    'salaries': 'people-sharp',
    'staff': 'people-sharp',
    'groceries': 'restaurant-sharp',
    'kitchen': 'restaurant-sharp',
    'supplies': 'cube-sharp',
    'rent': 'home-sharp',
    'internet': 'wifi-sharp',
    'cleaning': 'brush-sharp',
    'water': 'water-sharp',
    'lift': 'swap-vertical-sharp',
    'refund': 'arrow-undo-sharp',
    'deposit': 'cash-sharp',
    'other': 'receipt-sharp',
    'others': 'receipt-sharp',
    'misc': 'receipt-sharp',
};

const getColor = (name: string) => {
    const lower = name.toLowerCase();
    for (const [key, color] of Object.entries(CAT_COLORS)) {
        if (lower.includes(key)) return color;
    }
    return '#64748B';
};

const getIcon = (name: string) => {
    const lower = name.toLowerCase();
    for (const [key, icon] of Object.entries(CAT_ICONS)) {
        if (lower.includes(key)) return icon;
    }
    return 'receipt-sharp';
};

const getLightColor = (color: string) => {
    if (color === '#F59E0B') return '#FEF3C7';
    if (color === '#3B82F6') return '#DBEAFE';
    if (color === '#8B5CF6') return '#EDE9FE';
    if (color === '#EC4899') return '#FCE7F3';
    if (color === '#F97316') return '#FFEDD5';
    if (color === '#06B6D4') return '#ECFEFF';
    if (color === '#6366F1') return '#E0E7FF';
    if (color === '#14B8A6') return '#E6FFFA';
    if (color === '#EF4444') return '#FEE2E2';
    if (color === '#0EA5E9') return '#E0F2FE';
    return '#F1F5F9';
};

// ─── Format currency ──────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const fmtFull = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ style, isDark }: { style?: any; isDark?: boolean }) => (
    <View style={[{ backgroundColor: isDark ? '#334155' : '#E9D5FF', borderRadius: 12, opacity: 0.5 }, style]} />
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OverviewScreen() {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const { t } = useTranslation();
    const { refreshCounter } = useRefresh();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [backgroundLoading, setBackgroundLoading] = useState(false);

    // -- Filter State --
    const [filterMode, setFilterMode] = useState<'month' | 'custom'>('month');
    const [statsMonth, setStatsMonth] = useState(new Date());
    const [customStart, setCustomStart] = useState(() => { const d = new Date(); d.setDate(1); return d; });
    const [customEnd, setCustomEnd] = useState(new Date());

    const [filterSelectModal, setFilterSelectModal] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    const getQueryDates = useCallback(() => {
        if (filterMode === 'month') {
            const year = statsMonth.getFullYear();
            const month = statsMonth.getMonth() + 1;
            const start = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            return { startDate: start, endDate: end, monthStr: `${year}-${String(month).padStart(2, '0')}` };
        } else {
            return { startDate: toLocalDateStr(customStart), endDate: toLocalDateStr(customEnd), monthStr: null };
        }
    }, [filterMode, statsMonth, customStart, customEnd]);

    const lastOverviewFetchRef = React.useRef<number>(0);

    const fetchData = useCallback(async (isRefresh = false, force = false) => {
        const now = Date.now();
        if (!force && isRefresh && now - lastOverviewFetchRef.current < 15000 && data) {
            return;
        }
        try {
            lastOverviewFetchRef.current = now;
            if (!isRefresh && !data) {
                setLoading(true);
            } else if (data !== null) {
                setBackgroundLoading(true);
            }
            const { startDate, endDate, monthStr } = getQueryDates();
            const res = await api.get('/reports/monthly-overview', { 
                params: monthStr ? { month: monthStr } : { startDate, endDate } 
            });
            if (res.data.success) {
                setData(res.data.data);
                setError(false);
            } else {
                setError(true);
            }
        } catch (e) {
            console.error('Overview fetch error:', e);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setBackgroundLoading(false);
        }
    }, [getQueryDates, data]);

    useFocusEffect(useCallback(() => {
        const now = Date.now();
        // Skip refetch if data is fresh (loaded within last 30s) — avoids hitting API on every tab switch
        if (data !== null && now - lastOverviewFetchRef.current < 30_000) return;
        fetchData(true);
    }, [fetchData, data]));

    useEffect(() => {
        fetchData(false, true);
    }, [filterMode, statsMonth, customStart, customEnd]);

    // ── Auto-refresh when anything is added/updated globally (expenses, income, students) ──
    useEffect(() => {
        if (refreshCounter === 0) return;
        fetchData(true);
    }, [refreshCounter]);

    const canGoBack = navigation.canGoBack();

    const handlePrevMonth = () => {
        setFilterMode('month');
        setStatsMonth(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    };

    const handleNextMonth = () => {
        setFilterMode('month');
        setStatsMonth(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });
    };

    // ── Loading ──
    if (loading && !data) {
        return (
            <View style={[s.root, { backgroundColor: theme.background }]}>
                <StatusBar barStyle="light-content" />
                <AppHeader
                    title={t('overview.title')}
                    showBack={canGoBack}
                    rightComponent={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <HeaderNotification navigation={navigation} />
                            <ProfileMenu />
                        </View>
                    }
                />
                <View style={{ padding: 16, gap: 14 }}>
                    <Skeleton style={{ height: 120, borderRadius: 24 }} isDark={isDark} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Skeleton style={{ flex: 1, height: 110, borderRadius: 20 }} isDark={isDark} />
                        <Skeleton style={{ flex: 1, height: 110, borderRadius: 20 }} isDark={isDark} />
                    </View>
                    <Skeleton style={{ height: 220, borderRadius: 24 }} isDark={isDark} />
                </View>
            </View>
        );
    }

    if (error && !data) {
        return (
            <View style={[s.root, { backgroundColor: theme.background }]}>
                <StatusBar barStyle="light-content" />
                <AppHeader
                    title={t('overview.title')}
                    showBack={canGoBack}
                    rightComponent={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <HeaderNotification navigation={navigation} />
                            <ProfileMenu />
                        </View>
                    }
                />
                <ErrorState onRetry={() => fetchData(false)} />
            </View>
        );
    }

    const cm = data?.currentMonth || {};
    const trend = data?.trend || [];
    const isProfit = (cm.netProfit || 0) >= 0;
    const trendMax = Math.max(...trend.map((t: any) => Math.max(t.income, t.expenses)), 1);
    const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    const currentMonthStr = filterMode === 'month' 
        ? `${statsMonth.getFullYear()}-${String(statsMonth.getMonth() + 1).padStart(2, '0')}`
        : null;

    const isCurrentMonth = filterMode === 'month' && 
        statsMonth.getMonth() === new Date().getMonth() && 
        statsMonth.getFullYear() === new Date().getFullYear();

    const periodLabel = filterMode === 'month'
        ? statsMonth.toLocaleString('default', { month: 'short', year: 'numeric' })
        : `${customStart.getDate()} ${customStart.toLocaleString('default', { month: 'short' })} - ${customEnd.getDate()} ${customEnd.toLocaleString('default', { month: 'short' })}`;

    // Shared dark-mode override for generic `s.card` surfaces
    const darkCard = isDark ? { backgroundColor: '#1E293B', borderColor: '#334155' } : null;

    return (
        <View style={[s.root, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />

            {/* ── Header ── */}
            <AppHeader
                title={t('overview.title')}
                showBack={canGoBack}
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                }
            >
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    
                    {/* Month Navigator Group */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
                        <TouchableOpacity 
                            onPress={handlePrevMonth}
                            style={{ paddingHorizontal: 8, paddingVertical: 6 }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={16} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 5,
                                paddingHorizontal: 8, paddingVertical: 4,
                            }} 
                            onPress={() => setFilterSelectModal(true)} 
                            activeOpacity={0.8}
                        >
                            <Ionicons name="calendar-outline" size={13} color="#FFF" />
                            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>{periodLabel}</Text>
                            <Ionicons name="chevron-down" size={12} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={handleNextMonth}
                            style={{ paddingHorizontal: 8, paddingVertical: 6 }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-forward" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Quick shortcut redirection to daily income view */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('IncomeDetails', { period: 'day' })}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#FFFFFF',
                            borderRadius: 12,
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            gap: 5,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 2,
                        }}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="flash" size={13} color="#7C3AED" />
                        <Text style={{ color: '#7C3AED', fontSize: 13, fontWeight: '800' }}>Today</Text>
                        <Ionicons name="chevron-forward" size={14} color="#7C3AED" />
                    </TouchableOpacity>
                </View>
            </AppHeader>


            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 110 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchData(true); }}
                        tintColor="#7C3AED"
                    />
                }
            >
                <View style={s.body}>

                    {/* ── Active Filter Badge (Always visible so owner knows what's loaded) ── */}
                    {(!isCurrentMonth || (filterMode as string) === 'custom') && (
                        <View style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            backgroundColor: isDark ? '#1E293B' : '#F5F3FF',
                            paddingHorizontal: 12, paddingVertical: 8,
                            borderRadius: 10, marginBottom: 12,
                            borderWidth: 1, borderColor: isDark ? '#334155' : '#DDD6FE',
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                <Ionicons name={filterMode === 'month' ? "calendar" : "funnel"} size={13} color="#7C3AED" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#C4B5FD' : '#6D28D9' }}>
                                    {filterMode === 'month'
                                        ? `Filtered: ${statsMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`
                                        : `Custom: ${periodLabel}`}
                                </Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => { setFilterMode('month'); setStatsMonth(new Date()); }}
                                style={{ backgroundColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 3.5, borderRadius: 6 }}
                                activeOpacity={0.8}
                            >
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFF' }}>Reset</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Net Profit/Loss Hero Card ── */}
                    <LinearGradient
                        colors={isProfit
                            ? (isDark ? ['#0F3D2E', '#0C4A3A'] : ['#E6F9F3', '#D1FAE5'])
                            : (isDark ? ['#4A1515', '#5C1A1A'] : ['#FFEBEE', '#FEE2E2'])}
                        style={[s.heroCard, { borderColor: isProfit ? (isDark ? '#0F5C46' : '#A7F3D0') : (isDark ? '#7F2D2D' : '#FECACA') }]}
                    >
                        <View style={s.heroContentRow}>
                            <View style={s.heroTextWrap}>
                                <Text style={[s.heroLabel, { color: isProfit ? (isDark ? '#6EE7B7' : '#047857') : (isDark ? '#FCA5A5' : '#B91C1C') }]}>{isProfit ? t('overview.netProfit') : t('overview.netLoss')}</Text>
                                <Text style={[s.heroValue, { color: isProfit ? (isDark ? '#A7F3D0' : '#065F46') : (isDark ? '#FECACA' : '#991B1B') }]}>{fmtFull(Math.abs(cm.netProfit || 0))}</Text>
                            </View>
                            <View style={[s.heroIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF', shadowColor: isProfit ? '#059669' : '#DC2626' }]}>
                                <Ionicons
                                    name={isProfit ? 'trending-up' : 'trending-down'}
                                    size={28}
                                    color={isProfit ? '#10B981' : '#EF4444'}
                                />
                            </View>
                        </View>
                        {cm.profitMargin !== 0 && (
                            <View style={[s.marginBadge, { backgroundColor: isProfit ? 'rgba(4, 120, 87, 0.16)' : 'rgba(185, 28, 28, 0.16)' }]}>
                                <Text style={[s.marginBadgeText, { color: isProfit ? (isDark ? '#6EE7B7' : '#047857') : (isDark ? '#FCA5A5' : '#B91C1C') }]}>{t('overview.margin')}: {cm.profitMargin}%</Text>
                            </View>
                        )}
                    </LinearGradient>

                    {/* ── Income vs Expenses Row ── */}
                    <View style={s.summaryRow}>
                        {/* Income Card */}
                        <TouchableOpacity
                            style={[s.summaryCard, {
                                backgroundColor: theme.cardBg,
                                borderColor: isDark ? '#334155' : '#E2E8F0',
                            }]}
                            onPress={() => navigation.navigate('IncomeDetails')}
                            activeOpacity={0.8}
                        >
                            <View style={[s.summaryIconBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5' }]}>
                                <Ionicons name="arrow-up-circle" size={16} color="#10B981" />
                            </View>
                            <Text style={[s.summaryLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('overview.income')}</Text>
                            <Text style={[s.summaryValue, { color: isDark ? '#6EE7B7' : '#10B981' }]}>{fmt(cm.totalIncome || 0)}</Text>
                            <View style={s.summaryDetail}>
                                <Text style={[s.summaryDetailText, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('overview.fees')}: {fmt(cm.feeCollection || 0)}</Text>
                                {Number(cm.admissionFeeCollection || 0) > 0 && (
                                    <Text style={[s.summaryDetailText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Admission: {fmt(cm.admissionFeeCollection)}</Text>
                                )}
                                {(cm.otherIncome || 0) > 0 && (
                                    <Text style={[s.summaryDetailText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Direct: {fmt(Math.max(0, Number(cm.otherIncome) - Number(cm.guestIncome || 0)))}</Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Expenses Card */}
                        <TouchableOpacity
                            style={[s.summaryCard, {
                                backgroundColor: theme.cardBg,
                                borderColor: isDark ? '#334155' : '#E2E8F0',
                            }]}
                            onPress={() => navigation.navigate('Expenses')}
                            activeOpacity={0.8}
                        >
                            <View style={[s.summaryIconBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2' }]}>
                                <Ionicons name="arrow-down-circle" size={16} color="#EF4444" />
                            </View>
                            <Text style={[s.summaryLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('overview.expenses')}</Text>
                            <Text style={[s.summaryValue, { color: isDark ? '#FCA5A5' : '#EF4444' }]}>{fmt(cm.totalExpenses || 0)}</Text>
                            <View style={s.summaryDetail}>
                                <Text style={[s.summaryDetailText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                                    {(cm.expenseBreakdown || []).length} {t('overview.categories')}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* ── Rent Collection Status ── */}
                    {(cm.rentDue || 0) > 0 && (
                        <View style={[s.card, darkCard]}>
                            <View style={s.cardHeader}>
                                <View style={s.cardHeaderLeft}>
                                    <Ionicons name="wallet-outline" size={18} color="#7C3AED" />
                                    <Text style={[s.cardTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>{t('overview.rentCollection')}</Text>
                                </View>
                            </View>
                            <View style={s.rentRow}>
                                <View style={[s.rentItem, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}>
                                    <Text style={[s.rentItemLabel, { color: isDark ? '#60A5FA' : '#3B82F6' }]}>{t('overview.due')}</Text>
                                    <Text style={[s.rentItemVal, { color: isDark ? '#93C5FD' : '#2563EB' }]}>{fmt(cm.rentDue)}</Text>
                                </View>
                                <View style={[s.rentItem, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#F0FDF4' }]}>
                                    <Text style={[s.rentItemLabel, { color: isDark ? '#34D399' : '#16A34A' }]}>{t('overview.collected')}</Text>
                                    <Text style={[s.rentItemVal, { color: isDark ? '#6EE7B7' : '#16A34A' }]}>{fmt(cm.rentCollected)}</Text>
                                </View>
                                <View style={[s.rentItem, { backgroundColor: isDark ? 'rgba(217,119,6,0.15)' : '#FFFBEB' }]}>
                                    <Text style={[s.rentItemLabel, { color: isDark ? '#FBBF24' : '#D97706' }]}>{t('overview.pending')}</Text>
                                    <Text style={[s.rentItemVal, { color: isDark ? '#FCD34D' : '#D97706' }]}>{fmt(cm.rentPending)}</Text>
                                </View>
                            </View>
                            {/* Progress */}
                            <View style={s.progressWrap}>
                                <View style={[s.progressBg, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <View style={[s.progressFill, {
                                        width: `${cm.rentDue > 0 ? Math.min(100, (cm.rentCollected / cm.rentDue) * 100) : 0}%`,
                                    }]} />
                                </View>
                                <Text style={[s.progressText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                                    {cm.rentDue > 0 ? Math.round((cm.rentCollected / cm.rentDue) * 100) : 0}% {t('overview.collectedPercentage')}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* ── Income Breakdown ── */}
                    {(() => {
                        const rentAmt = Number(cm.feeCollection || 0);
                        const guestAmt = Number(cm.guestIncome || 0);
                        const admissionAmt = Number(cm.admissionFeeCollection || 0);
                        const otherAmt = Math.max(0, Number(cm.otherIncome || 0) - guestAmt);
                        const incomeItems = [
                            { name: 'Rent Collection', amount: rentAmt, icon: 'card-outline', color: '#10B981', lightColor: '#D1FAE5' },
                            { name: 'Admission Fees', amount: admissionAmt, icon: 'person-add-outline', color: '#8B5CF6', lightColor: '#EDE9FE' },
                            { name: 'Guest Stay', amount: guestAmt, icon: 'walk-outline', color: '#06B6D4', lightColor: '#CFFAFE' },
                            { name: 'Direct Income', amount: otherAmt, icon: 'receipt-outline', color: '#F59E0B', lightColor: '#FEF3C7' },
                        ].filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount);

                        return (
                            <View style={[s.card, darkCard]}>
                                <View style={s.cardHeader}>
                                    <View style={s.cardHeaderLeft}>
                                        <Ionicons name="trending-up-outline" size={18} color="#10B981" />
                                        <Text style={[s.cardTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>Income Breakdown</Text>
                                    </View>
                                    <Text style={[s.cardMeta, { color: '#10B981' }]}>{fmtFull(cm.totalIncome || 0)}</Text>
                                </View>

                                {incomeItems.length === 0 ? (
                                    <View style={s.emptyBlock}>
                                        <Ionicons name="receipt-outline" size={36} color={isDark ? '#475569' : '#CBD5E1'} />
                                        <Text style={s.emptyText}>No income collected this month</Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 14 }}>
                                        {incomeItems.map((item, i) => (
                                            <View key={i}>
                                                <View style={s.catRow}>
                                                    <View style={s.catLeft}>
                                                        <View style={[s.catIconBox, { backgroundColor: isDark ? item.color + '30' : item.lightColor }]}>
                                                            <Ionicons name={item.icon as any} size={15} color={item.color} />
                                                        </View>
                                                        <Text style={[s.catName, { color: isDark ? '#E2E8F0' : '#334155' }]}>{item.name}</Text>
                                                    </View>
                                                    <View style={s.catRight}>
                                                        <Text style={[s.catAmount, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{fmtFull(item.amount)}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    })()}

                    {/* ── Expense Breakdown ── */}
                    <View style={[s.card, darkCard]}>
                        <TouchableOpacity 
                            style={s.cardHeader}
                            onPress={() => navigation.navigate('Expenses')}
                            activeOpacity={0.7}
                        >
                            <View style={s.cardHeaderLeft}>
                                <Ionicons name="pie-chart-outline" size={18} color="#7C3AED" />
                                <Text style={[s.cardTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>{t('overview.expenseBreakdown')}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={s.cardMeta}>{fmtFull(cm.totalExpenses || 0)}</Text>
                                <Ionicons name="chevron-forward" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                            </View>
                        </TouchableOpacity>

                        {(cm.expenseBreakdown || []).length === 0 ? (
                            <View style={s.emptyBlock}>
                                <Ionicons name="receipt-outline" size={36} color={isDark ? '#475569' : '#CBD5E1'} />
                                <Text style={s.emptyText}>{t('overview.noExpenses')}</Text>
                            </View>
                        ) : (
                            <View style={{ gap: 14 }}>
                                {(cm.expenseBreakdown || []).slice(0, 5).map((cat: any, i: number) => {
                                    const color = getColor(cat.category_name);
                                    const lightColor = getLightColor(color);
                                    const iconName = getIcon(cat.category_name);
                                    return (
                                        <TouchableOpacity 
                                            key={cat.category_id || i}
                                            onPress={() => navigation.navigate('Expenses', { categoryId: cat.category_id > 0 ? cat.category_id : undefined })}
                                            activeOpacity={0.7}
                                        >
                                            <View style={s.catRow}>
                                                <View style={s.catLeft}>
                                                    <View style={[s.catIconBox, { backgroundColor: isDark ? color + '30' : lightColor }]}>
                                                        <Ionicons name={iconName as any} size={15} color={color} />
                                                    </View>
                                                    <View>
                                                        <Text style={[s.catName, { color: isDark ? '#E2E8F0' : '#334155' }]}>{cat.category_name}</Text>
                                                        {cat.percentage > 0 && (
                                                            <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '500' }}>{cat.percentage}% of total</Text>
                                                        )}
                                                    </View>
                                                </View>
                                                <View style={s.catRight}>
                                                    <Text style={[s.catAmount, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{fmtFull(cat.amount)}</Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* ── Admission Fee Status ── */}
                    {(() => {
                        const adm = cm.admissionStats;
                        if (!adm || adm.totalStudents === 0) return null;
                        const paidPct = adm.totalStudents > 0 ? Math.round((adm.paidStudents / adm.totalStudents) * 100) : 0;
                        return (
                            <View style={[s.card, { paddingVertical: 12 }, darkCard]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: isDark ? 'rgba(217,119,6,0.18)' : '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name="key-outline" size={15} color="#D97706" />
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#F1F5F9' : '#1E293B' }}>Admission Fees</Text>
                                            <Text style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', marginTop: 1 }}>
                                                {adm.paidStudents}/{adm.totalStudents} students paid · {adm.pendingStudents} pending
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#FBBF24' : '#D97706' }}>
                                            ₹{adm.totalPaidAmount.toLocaleString('en-IN')}
                                        </Text>
                                        <Text style={{ fontSize: 9, color: isDark ? '#64748B' : '#94A3B8', marginTop: 1 }}>
                                            of ₹{adm.totalExpectedAmount.toLocaleString('en-IN')} expected
                                        </Text>
                                    </View>
                                </View>
                                {adm.totalExpectedAmount > 0 && (
                                    <View style={{ marginTop: 10 }}>
                                        <View style={{ height: 5, backgroundColor: isDark ? 'rgba(217,119,6,0.18)' : '#FEF3C7', borderRadius: 3, overflow: 'hidden' }}>
                                            <View style={{ height: '100%', width: `${paidPct}%`, backgroundColor: '#D97706', borderRadius: 3 }} />
                                        </View>
                                        <Text style={{ fontSize: 9, color: isDark ? '#64748B' : '#94A3B8', marginTop: 4 }}>{paidPct}% collected</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })()}

                    {/* ── 12-Month Trend ── */}
                    <View style={[s.card, darkCard]}>
                        <View style={s.cardHeader}>
                            <View style={s.cardHeaderLeft}>
                                <Ionicons name="bar-chart-outline" size={18} color="#7C3AED" />
                                <Text style={[s.cardTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>{t('overview.trendTitle')}</Text>
                            </View>
                        </View>

                        {/* Legend */}
                        <View style={s.legendRow}>
                            <View style={s.legendItem}>
                                <View style={[s.legendDot, { backgroundColor: '#10B981' }]} />
                                <Text style={[s.legendText, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('overview.legendIncome')}</Text>
                            </View>
                            <View style={s.legendItem}>
                                <View style={[s.legendDot, { backgroundColor: '#EF4444' }]} />
                                <Text style={[s.legendText, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('overview.legendExpenses')}</Text>
                            </View>
                        </View>

                        {/* Chart */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={s.chartContainer}>
                                {trend.map((tVal: any, i: number) => {
                                    const incH = Math.max(3, (tVal.income / trendMax) * 90);
                                    const expH = Math.max(3, (tVal.expenses / trendMax) * 90);
                                    const isCurrent = tVal.month === currentMonthStr;
                                    return (
                                        <View key={tVal.month} style={[s.chartCol, isCurrent && { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                            {/* Values on top */}
                                            {tVal.income > 0 && (
                                                <Text style={[s.chartTopVal, isCurrent && { color: '#10B981', fontWeight: 'bold' }]}>
                                                    {fmt(tVal.income)}
                                                </Text>
                                            )}
                                            <View style={s.chartBars}>
                                                <View style={[s.chartBar, {
                                                    height: incH,
                                                    backgroundColor: isCurrent ? '#10B981' : (isDark ? 'rgba(16,185,129,0.35)' : '#A7F3D0'),
                                                }]} />
                                                <View style={[s.chartBar, {
                                                    height: expH,
                                                    backgroundColor: isCurrent ? '#EF4444' : (isDark ? 'rgba(239,68,68,0.35)' : '#FECACA'),
                                                }]} />
                                            </View>
                                            <Text style={[s.chartMonth, isCurrent && {
                                                color: '#7C3AED', fontWeight: '800'
                                            }]}>
                                                {t('overview.' + tVal.monthLabel.toLowerCase(), tVal.monthLabel) as string}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {/* Averages */}
                        <View style={[s.avgRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <View style={s.avgItem}>
                                <Text style={[s.avgLabel, { color: isDark ? '#94A3B8' : undefined }]}>{t('overview.avgIncome')}</Text>
                                <Text style={[s.avgValue, { color: '#10B981' }]}>
                                    {fmt(trend.reduce((sum: number, tVal: any) => sum + tVal.income, 0) / Math.max(trend.filter((tVal: any) => tVal.income > 0).length, 1))}
                                </Text>
                            </View>
                            <View style={[s.avgDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                            <View style={s.avgItem}>
                                <Text style={[s.avgLabel, { color: isDark ? '#94A3B8' : undefined }]}>{t('overview.avgExpenses')}</Text>
                                <Text style={[s.avgValue, { color: '#EF4444' }]}>
                                    {fmt(trend.reduce((sum: number, tVal: any) => sum + tVal.expenses, 0) / Math.max(trend.filter((tVal: any) => tVal.expenses > 0).length, 1))}
                                </Text>
                            </View>
                            <View style={[s.avgDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                            <View style={s.avgItem}>
                                <Text style={[s.avgLabel, { color: isDark ? '#94A3B8' : undefined }]}>{t('overview.avgProfit')}</Text>
                                <Text style={[s.avgValue, { color: '#3B82F6' }]}>
                                    {fmt(trend.reduce((sum: number, tVal: any) => sum + tVal.profit, 0) / Math.max(trend.filter((tVal: any) => tVal.income > 0 || tVal.expenses > 0).length, 1))}
                                </Text>
                            </View>
                        </View>
                    </View>

                </View>
            </ScrollView>



            {/* Translucent loading overlay */}
            {loading && data && (
                <View style={[s.loadingOverlay, { backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.75)' }]}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={[s.loadingText, { color: isDark ? '#C4B5FD' : '#7C3AED' }]}>{t('overview.fetchingOverview')}</Text>
                </View>
            )}

            <Modal visible={filterSelectModal} transparent animationType="fade" onRequestClose={() => setFilterSelectModal(false)}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 90, paddingRight: 16 }} activeOpacity={1} onPress={() => setFilterSelectModal(false)}>
                    <View style={{ backgroundColor: theme.cardBg, position: 'absolute', top: 90, right: 16, borderRadius: 16, padding: 8, width: 220, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderBottomColor: isDark ? '#334155' : '#F1F5F9', borderBottomWidth: 1 }}
                            onPress={() => { setFilterSelectModal(false); setShowMonthPicker(true); }} activeOpacity={0.7}>
                            <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>Specific Month</Text>
                                <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2, fontWeight: '600' }}>E.g., June 2026</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 }}
                            onPress={() => { setFilterSelectModal(false); setShowCustomPicker(true); }} activeOpacity={0.7}>
                            <Ionicons name="options-outline" size={18} color={theme.primary} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>Custom Range</Text>
                                <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2, fontWeight: '600' }}>Select start & end date</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <CustomMonthYearPicker
                visible={showMonthPicker}
                onClose={() => setShowMonthPicker(false)}
                onConfirm={(d: Date) => { setFilterMode('month'); setStatsMonth(d); setShowMonthPicker(false); }}
                initialDate={statsMonth}
            />

            <CustomDateRangePicker
                visible={showCustomPicker}
                onClose={() => setShowCustomPicker(false)}
                onConfirm={(s: Date, e: Date) => { setFilterMode('custom'); setCustomStart(s); setCustomEnd(e); setShowCustomPicker(false); }}
                initialStart={customStart}
                initialEnd={customEnd}
                restrictMonth={filterMode === 'month' ? statsMonth : undefined}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },

    // Header
    header: {
        paddingTop: 54,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 6,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.3,
    },

    // Month nav
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        gap: 14,
    },
    monthArrow: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.16)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthLabelBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.16)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 14,
    },
    monthLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },

    body: { padding: 14, gap: 12 },

    // Hero Card
    heroCard: {
        borderRadius: 18,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 1,
    },
    heroContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroTextWrap: {
        flex: 1,
    },
    heroIconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    heroLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginBottom: 3,
    },
    heroValue: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    marginBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 7,
        marginTop: 10,
    },
    marginBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },

    // Summary row
    summaryRow: {
        flexDirection: 'row',
        gap: 10,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 16,
        padding: 10,
        borderWidth: 1,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    incomeCard: {
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
    },
    expenseCard: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
    },
    summaryIconBox: {
        width: 26,
        height: 26,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '900',
    },
    summaryDetail: {
        marginTop: 3,
        gap: 1,
    },
    summaryDetailText: {
        fontSize: 9,
        color: '#64748B',
        fontWeight: '600',
    },

    // Generic Card
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 14,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    cardMeta: { fontSize: 13, color: '#EF4444', fontWeight: '800' },

    // Rent collection
    rentRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    rentItem: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    rentItemLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
    rentItemVal: { fontSize: 15, fontWeight: '900' },
    progressWrap: { marginTop: 4 },
    progressBg: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
        backgroundColor: '#10B981',
    },
    progressText: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '700',
        marginTop: 6,
        textAlign: 'right',
    },

    // Expense category breakdown
    catRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    catIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catName: { fontSize: 14, fontWeight: '700', color: '#334155' },
    catRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    catAmount: { fontSize: 14, fontWeight: '900', color: '#1E293B' },
    catPercent: { fontSize: 11, color: '#94A3B8', fontWeight: '600', width: 36, textAlign: 'right' },
    catBarBg: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
    },
    catBarFill: {
        height: '100%',
        borderRadius: 3,
    },

    // Empty state
    emptyBlock: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },

    // Legend
    legendRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 14,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: '#64748B', fontWeight: '600' },

    // Chart
    chartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        paddingBottom: 4,
        minWidth: SCREEN_W - 80,
    },
    chartCol: {
        flex: 1,
        alignItems: 'center',
        minWidth: 32,
        paddingVertical: 4,
        borderRadius: 8,
    },
    chartColCurrent: {
        backgroundColor: '#F1F5F9',
    },
    chartTopVal: {
        fontSize: 8,
        fontWeight: '700',
        color: '#94A3B8',
        marginBottom: 4,
        height: 10,
    },
    chartBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        height: 90,
    },
    chartBar: {
        width: 10,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        borderBottomLeftRadius: 1,
        borderBottomRightRadius: 1,
    },
    chartMonth: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 6,
    },

    // Averages
    avgRow: {
        flexDirection: 'row',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    avgItem: { flex: 1, alignItems: 'center' },
    avgDivider: { width: 1, backgroundColor: '#F1F5F9', height: 28, alignSelf: 'center' },
    avgLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
    avgValue: { fontSize: 14, fontWeight: '800' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    pickerCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, width: '100%', maxWidth: 340, elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 15, shadowOffset: { width: 0, height: 5 } },
    pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 10 },
    yearArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    pickerYearText: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
    monthCell: { width: '30%', height: 48, marginVertical: 6, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    monthCellSelected: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
    monthCellDisabled: { opacity: 0.4, backgroundColor: '#F1F5F9' },
    monthCellText: { fontSize: 14, fontWeight: '700', color: '#475569' },
    monthCellTextSelected: { color: '#FFF' },
    monthCellTextDisabled: { color: '#94A3B8' },
    pickerCloseBtn: { marginTop: 20, paddingVertical: 14, alignItems: 'center', borderRadius: 14, backgroundColor: '#F1F5F9' },
    pickerCloseText: { fontSize: 15, fontWeight: '700', color: '#64748B' },

    // Loading Overlay
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: '700',
        color: '#7C3AED',
    },
});
