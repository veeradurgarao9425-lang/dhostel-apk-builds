import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, RefreshControl, ActivityIndicator, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureItem } from '../services/secureStore';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { buildReportHtml } from '../utils/reportHtml';
import * as Print from 'expo-print';
import { downloadAndSaveFile } from '../utils/fileDownloader';
import { toLocalDateStr } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import { ErrorState } from '../components/ui/ErrorState';
import Svg, { Circle } from 'react-native-svg';
import { CustomDateRangePicker } from '../components/ui/pickers/CustomDateRangePicker';
import { CustomMonthYearPicker } from '../components/ui/pickers/CustomMonthYearPicker';
import { ModalSheet } from '../components/FormComponents';
import { FullScreenLoader } from '../components/FullScreenLoader';

const fmt = (n: number) => n.toLocaleString('en-IN');

// ── Progress Circle Component ──────────────────────────────────────────────────
const ProgressCircle = ({ value, size = 80, strokeWidth = 8, color = '#4ADE80', isDark }: any) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0'}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: isDark ? '#FFF' : '#0F172A' }}>{value}%</Text>
            </View>
        </View>
    );
};

// ── Beds Donut Chart Component (Unified Vacant + Occupied Ring) ──────────────────
const BedsDonutChart = ({ occupied, total, occupancyRate, isDark }: any) => {
    const size = 110;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    
    const rate = Math.min(100, Math.max(0, occupancyRate));
    const occupiedOffset = circumference - (rate / 100) * circumference;

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={isDark ? '#7F1D1D' : '#FCA5A5'}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {rate > 0 && (
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#10B981"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={occupiedOffset}
                        strokeLinecap="round"
                        fill="transparent"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                )}
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? '#FFF' : '#0F172A' }}>{rate}%</Text>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#64748B', marginTop: 2 }}>Occupied</Text>
            </View>
        </View>
    );
};

// ── Skeleton Loader Component ──────────────────────────────────────────────────
const Skeleton = ({ style, isDark }: { style?: any, isDark?: boolean }) => {
    const anim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true })
        ])).start();
    }, []);
    return <Animated.View style={[{ backgroundColor: isDark ? '#334155' : '#E2E8F0', borderRadius: 16, opacity: anim }, style, { borderWidth: 0, elevation: 0, shadowOpacity: 0 }]} />;
};

// ── Animated Report Card ──────────────────────────────────────────────────────
const ReportCard = ({ report, onDownload, onView, exporting, isDark }: any) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
    const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[R.reportCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                onPress={onView}
                activeOpacity={1}
            >
                <View style={[R.iconCircle, { backgroundColor: report.iconBg }]}>
                    <Ionicons name={report.icon} size={20} color={report.iconColor} />
                </View>
                <View style={R.cardText}>
                    <Text style={[R.cardTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]} numberOfLines={1}>{report.title}</Text>
                    <Text style={[R.cardDesc, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>{report.description}</Text>
                </View>
                <View style={R.cardActions}>
                    {report.canDownload && (
                        <TouchableOpacity
                            style={R.actionBtn}
                            onPress={onDownload}
                            disabled={!!exporting}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.6}
                        >
                            {exporting === report.id
                                ? <ActivityIndicator size="small" color={report.iconColor} />
                                : <Ionicons name="download-outline" size={20} color={report.iconColor} />
                            }
                        </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#CBD5E1'} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function ReportsScreen() {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const { user } = useAuth();
    const { showError, showSuccess, showApiError } = useToast();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState<string | null>(null);
    const [showExcelPicker, setShowExcelPicker] = useState(false);
    const [downloadSelectModal, setDownloadSelectModal] = useState(false);

    // -- Tabs --
    const [activeTab, setActiveTab] = useState<'financials' | 'occupancy' | 'reports'>('financials');

    // Dynamic current calendar month name (e.g. "July", "August")
    const currentMonthName = useMemo(() => {
        return new Date().toLocaleString('en-US', { month: 'long' });
    }, []);

    // -- Unified Date Filter presets (matching the dues filter) --
    const [datePreset, setDatePreset] = useState<string>(currentMonthName);
    const [customStart, setCustomStart] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
    const [customEnd, setCustomEnd] = useState(new Date());

    const [filterSelectModal, setFilterSelectModal] = useState(false);
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    // -- Data State --
    const [stats, setStats] = useState<any>(null);
    const [overview, setOverview] = useState<any>(null);
    const [defaulters, setDefaulters] = useState<any[]>([]);
    const [expensePreview, setExpensePreview] = useState<any[]>([]);
    const [trend, setTrend] = useState<any[]>([]);

    const dateOptions = useMemo(() => [
        'Custom Date Range',
        'All Time',
        'Today',
        'Yesterday',
        currentMonthName,
        'Last 30 Days',
        'Previous Month',
        'Last 3 Months',
        'Last 6 Months',
        'Last 12 Months',
        'Previous Year'
    ], [currentMonthName]);

    const getQueryDates = useCallback(() => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (datePreset === 'Today') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (datePreset === 'Yesterday') {
            start.setDate(now.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(now.getDate() - 1);
            end.setHours(23, 59, 59, 999);
        } else if (datePreset === 'Last 30 Days') {
            start.setDate(now.getDate() - 30);
        } else if (datePreset === 'Last 3 Months') {
            start.setDate(now.getDate() - 90);
        } else if (datePreset === 'Last 6 Months') {
            start.setDate(now.getDate() - 180);
        } else if (datePreset === 'Last 12 Months') {
            start.setDate(now.getDate() - 365);
        } else if (datePreset === 'Previous Month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (datePreset === 'Previous Year') {
            start = new Date(now.getFullYear() - 1, 0, 1);
            end = new Date(now.getFullYear() - 1, 11, 31);
        } else if (datePreset === 'All Time') {
            start = new Date(2020, 0, 1);
        } else if (datePreset === 'Custom Date Range') {
            return { startDate: toLocalDateStr(customStart), endDate: toLocalDateStr(customEnd), monthStr: null };
        } else {
            if (datePreset === currentMonthName) {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                return { startDate: toLocalDateStr(start), endDate: toLocalDateStr(end), monthStr };
            }
        }
        return { startDate: toLocalDateStr(start), endDate: toLocalDateStr(end), monthStr: null };
    }, [datePreset, customStart, customEnd, currentMonthName]);

    const loadExpensePreview = useCallback(async () => {
        try {
            const { startDate, endDate } = getQueryDates();
            const res = await api.get('/expenses', { params: { startDate, endDate, page: 1, limit: 25 } });
            if (res.data?.success) setExpensePreview(res.data.data || []);
        } catch (error) { console.warn('ReportsScreen: expense preview failed', error); }
    }, [getQueryDates]);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(false);
        try {
            const { startDate, endDate, monthStr } = getQueryDates();

            const [statsRes, feesSummaryRes, overviewRes] = await Promise.all([
                api.get('/reports/dashboard-stats', { params: { startDate, endDate } }).catch(() => ({ data: { success: false } })),
                api.get('/monthly-fees/summary', { params: { startDate, endDate, onlyPending: 'true', page: 1, limit: 10 } }).catch(() => ({ data: { success: false } })),
                api.get('/reports/monthly-overview', { params: monthStr ? { month: monthStr } : { startDate, endDate } }).catch(() => ({ data: { success: false } })),
            ]);

            if (statsRes.data?.success) setStats(statsRes.data.data);

            if (feesSummaryRes.data?.success && Array.isArray(feesSummaryRes.data.data?.fees)) {
                const fees: any[] = feesSummaryRes.data.data.fees;
                setDefaulters(
                    fees.filter((f) => (f.balance || 0) > 0 && !['fully paid', 'paid'].includes(String(f.fee_status || '').toLowerCase()))
                        .sort((a, b) => (b.balance || 0) - (a.balance || 0))
                        .slice(0, 3)
                        .map((f) => ({
                            id: f.student_id || `${f.fee_id}-${Math.random()}`,
                            name: `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Unknown',
                            amount: Number(f.balance || 0),
                        }))
                );
            }

            if (overviewRes.data?.success && overviewRes.data.data?.currentMonth) {
                setOverview(overviewRes.data.data.currentMonth);
                if (overviewRes.data.data.trend) setTrend(overviewRes.data.data.trend.slice(-6));
            }

        } catch (e) {
            console.error('ReportsScreen:', e);
            setError(true);
        } finally {
            setLoading(false); setRefreshing(false);
        }
    }, [getQueryDates]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    useEffect(() => {
        loadData(false);
    }, [activeTab, datePreset, customStart, customEnd]);

    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const totalRent = overview?.rentCollected ?? overview?.feeCollection ?? stats?.monthlyRentCollected ?? stats?.feeCollection ?? 0;
    const pending = overview?.rentPending ?? stats?.monthlyRentPending ?? stats?.pendingDuesAmount ?? 0;
    const totalExpenses = overview?.totalExpenses ?? stats?.monthlyExpenses ?? 0;
    const netProfit = overview?.netProfit ?? (totalRent - totalExpenses);
    const totalDue = totalRent + pending;
    const occupancyRate = stats?.occupancyRate || 0;
    const totalBeds = stats?.totalBeds || 0;
    const occupiedBeds = stats?.occupiedBeds || 0;

    const periodLabel = useMemo(() => {
        if (datePreset === 'Custom Date Range') {
            return `${customStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${customEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        }
        return datePreset;
    }, [datePreset, customStart, customEnd]);

    const collectionRate = totalDue > 0 ? Math.round((totalRent / totalDue) * 100) : 0;

    let profitChange = 0;
    let profitChangeLabel = '';
    if (trend && trend.length >= 2) {
        const curr = trend[trend.length - 1].netProfit || 0;
        const prev = trend[trend.length - 2].netProfit || 0;
        if (prev === 0) {
            profitChange = curr > 0 ? 100 : 0;
        } else {
            profitChange = Math.round(((curr - prev) / Math.abs(prev)) * 100);
        }
        if (profitChange > 0) profitChangeLabel = `+${profitChange}% vs last month`;
        else if (profitChange < 0) profitChangeLabel = `${profitChange}% vs last month`;
        else profitChangeLabel = `Same as last month`;
    }

    const handleDownloadExcel = async (reportId: string = 'full_excel', overrideStart?: Date, overrideEnd?: Date) => {
        setExporting(reportId);
        try {
            const token = (await getSecureItem('token')) || (await AsyncStorage.getItem('token'));
            if (!token) { showError('Authentication token not found. Please log in again.'); return; }

            const base = (api.defaults.baseURL || 'https://dark-dew-bf62.veeradurgarao840.workers.dev/api').replace(/\/$/, '');
            let startStr = '';
            let endStr = '';

            if (overrideStart && overrideEnd) {
                startStr = toLocalDateStr(overrideStart);
                endStr = toLocalDateStr(overrideEnd);
            } else {
                const dates = getQueryDates();
                startStr = dates.startDate;
                endStr = dates.endDate;
            }

            // Calls report download endpoint with specific reportType (collection, dues, expenses, occupancy, tenants, full_excel)
            const url = `${base}/reports/download/excel?startDate=${startStr}&endDate=${endStr}&reportType=${encodeURIComponent(reportId)}&token=${encodeURIComponent(token)}`;
            
            const titles: Record<string, string> = {
                collection: 'Rent_Collection_Report',
                dues: 'Pending_Dues_Report',
                expenses: 'Expenses_Report',
                occupancy: 'Rooms_Occupancy_Report',
                tenants: 'Tenants_Report',
                full_excel: 'Complete_Hostel_Report',
            };
            const prefix = titles[reportId] || `${reportId}_report`;
            const filename = `${prefix}_${startStr}_to_${endStr}.xlsx`;

            await downloadAndSaveFile(url, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } catch (e: any) {
            showApiError(e, 'Could not download Excel report.');
        } finally {
            setExporting(null);
        }
    };

    const handleExportPDF = async () => {
        setExporting('pdf');
        try {
            if (expensePreview.length === 0) await loadExpensePreview();
            const html = buildReportHtml({
                hostelName: user?.hostel_name || 'My Hostel',
                ownerName: user?.full_name,
                periodLabel, totalRent, pending, totalExpenses, netProfit, collectionRate, occupancyRate, occupiedBeds, totalBeds, defaulters, expenses: expensePreview, trend,
            });
            const { uri } = await Print.printToFileAsync({ html });
            await downloadAndSaveFile(uri, `report_${periodLabel.replace(/\s+/g, '_')}.pdf`, 'application/pdf', true);
        } catch (e: any) { showApiError(e, 'Could not generate PDF.'); }
        finally { setExporting(null); }
    };

    const REPORTS = [
        { id: 'collection', title: 'Collection Report', description: 'All rent payments received', icon: 'cash-outline', iconColor: '#10B981', iconBg: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5', canDownload: true, onView: () => navigation.navigate('CollectedPayments') },
        { id: 'dues', title: 'Due & Pending Report', description: `${defaulters.length} tenants with outstanding dues`, icon: 'alert-circle-outline', iconColor: '#F59E0B', iconBg: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7', canDownload: true, onView: () => navigation.navigate('PendingPayments') },
        { id: 'expenses', title: 'Expense Report', description: 'Expense summary and spending patterns', icon: 'trending-down-outline', iconColor: '#EF4444', iconBg: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2', canDownload: true, onView: () => navigation.navigate('Expenses') },
        { id: 'occupancy', title: 'Occupancy Report', description: `${occupiedBeds}/${totalBeds} beds occupied · ${occupancyRate}% full`, icon: 'bed-outline', iconColor: '#3B82F6', iconBg: isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE', canDownload: true, onView: () => navigation.navigate('Rooms') },
        { id: 'tenants', title: 'Tenant Report', description: 'All active tenants and their details', icon: 'people-outline', iconColor: '#8B5CF6', iconBg: isDark ? 'rgba(139,92,246,0.15)' : '#EDE9FE', canDownload: true, onView: () => navigation.navigate('Students') },
    ];

    const downloadHandlers: Record<string, () => void> = {
        collection: () => handleDownloadExcel('collection'),
        dues: () => handleDownloadExcel('dues'),
        expenses: () => handleDownloadExcel('expenses'),
        occupancy: () => handleDownloadExcel('occupancy'),
        tenants: () => handleDownloadExcel('tenants'),
        pdf: handleExportPDF,
    };

    return (
        <View style={[R.root, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
            <StatusBar barStyle="light-content" />

            <AppHeader
                title="Analytics & Reports"
                subtitle="Track performance & insights"
                alignLeft
                showBack={navigation.canGoBack()}
                // @ts-ignore
                titleColor="#FFF"
                iconColor="#FFF"
                rightComponent={
                    <TouchableOpacity style={[R.topFilterBtn, { marginBottom: 0 }]} onPress={() => setFilterSelectModal(true)} activeOpacity={0.8}>
                        <Ionicons name="calendar-outline" size={14} color="#FFF" />
                        <Text style={R.topFilterTxt}>{periodLabel}</Text>
                        <Ionicons name="chevron-down" size={12} color="#FFF" />
                    </TouchableOpacity>
                }
            />

            <View style={[R.mainSheet, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
                {/* ── Tabs Segmented Control ── */}
                <View style={[R.tabBar, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                    {(['financials', 'occupancy', 'reports'] as const).map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[R.tabBtn, isActive && { backgroundColor: theme.cardBg }]}
                                onPress={() => setActiveTab(tab)}
                                activeOpacity={0.8}
                            >
                                <Text style={[
                                    R.tabText, 
                                    { color: isActive ? theme.primary : (isDark ? '#94A3B8' : '#64748B') },
                                    isActive && { fontWeight: '800' }
                                ]}>
                                    {tab === 'financials' ? 'Financials' : tab === 'occupancy' ? 'Occupancy' : 'All Reports'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
                >
                    {loading && !refreshing ? (
                        <>
                            <Skeleton style={[R.topCard, { height: 100 }]} isDark={isDark} />
                            <View style={R.gridRow}>
                                {[1, 2, 3, 4].map(i => <Skeleton key={i} style={[R.gridItem, { height: 110 }]} isDark={isDark} />)}
                            </View>
                            <Skeleton style={{ height: 160, borderRadius: 20, marginHorizontal: 16 }} isDark={isDark} />
                        </>
                    ) : error ? (
                        <View style={{ paddingTop: 40 }}>
                            <ErrorState onRetry={() => loadData(false)} />
                        </View>
                    ) : (
                        <>
                            {/* ── TAB CONTENT: Financials ── */}
                            {activeTab === 'financials' && (
                                <View style={{ gap: 14 }}>
                                    {/* Net Profit Banner */}
                                    <View style={[R.topCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1 }]}>
                                        <View style={R.topCardLeft}>
                                            <Text style={[R.topCardLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Net Profit</Text>
                                            <Text style={[R.topCardVal, { color: isDark ? '#F1F5F9' : '#0F172A', fontSize: 30 }]} numberOfLines={1} adjustsFontSizeToFit>
                                                {netProfit < 0 ? '-' : ''}{'\u20b9'}{fmt(Math.abs(netProfit))}
                                            </Text>
                                            {!!profitChangeLabel && (
                                                <View style={[R.badge, { backgroundColor: profitChange > 0 ? (isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5') : profitChange < 0 ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2') : (isDark ? 'rgba(100,116,139,0.15)' : '#F1F5F9') }]}>
                                                    <Ionicons name={profitChange > 0 ? 'trending-up' : profitChange < 0 ? 'trending-down' : 'remove'} size={12} color={profitChange > 0 ? '#10B981' : profitChange < 0 ? '#EF4444' : '#64748B'} />
                                                    <Text style={[R.badgeTxt, { color: profitChange > 0 ? '#10B981' : profitChange < 0 ? '#EF4444' : '#64748B' }]}>{profitChangeLabel}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={[R.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                                        <View style={R.topCardRight}>
                                            <Text style={[R.topCardLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Collection Rate</Text>
                                            <ProgressCircle value={collectionRate} size={70} strokeWidth={6} color="#4F46E5" isDark={isDark} />
                                        </View>
                                    </View>

                                    {/* 3 Grid items for financials */}
                                    <View style={R.gridRow}>
                                        {[
                                            { label: 'Collected', val: `₹${fmt(totalRent)}`, sub: 'Rent collected', c: '#10B981', i: 'wallet-outline', bg: '#D1FAE5', screen: 'CollectedPayments' },
                                            { label: 'Pending Dues', val: `₹${fmt(pending)}`, sub: 'Dues outstanding', c: '#EF4444', i: 'alert-circle-outline', bg: '#FEE2E2', screen: 'PendingPayments' },
                                            { label: 'Expenses', val: `₹${fmt(totalExpenses)}`, sub: 'Total expenses', c: '#F59E0B', i: 'trending-down-outline', bg: '#FEF3C7', screen: 'Expenses' },
                                        ].map((m) => (
                                            <TouchableOpacity key={m.label} style={[R.gridItem, { width: '30%', marginHorizontal: '1%', backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1 }]} onPress={() => navigation.navigate(m.screen)} activeOpacity={0.8}>
                                                <View style={[R.gridIconBg, { backgroundColor: isDark ? m.c + '20' : m.bg, marginBottom: 8 }]}>
                                                    <Ionicons name={m.i as any} size={16} color={m.c} />
                                                </View>
                                                <Text style={[R.gridLabel, { color: isDark ? '#94A3B8' : '#64748B', fontSize: 9 }]} numberOfLines={1}>{m.label}</Text>
                                                <Text style={[R.gridVal, { color: isDark ? '#F8FAFC' : '#0F172A', fontSize: 13 }]} numberOfLines={1}>{m.val}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {/* Visual Financial Breakdowns */}
                                    <View style={[R.breakdownCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1 }]}>
                                        <Text style={[R.breakdownTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Financial Insights</Text>
                                        <View style={{ gap: 14 }}>
                                            {[
                                                { label: "Today's Collection", val: `₹${fmt(overview?.todayCollection ?? 0)}`, icon: 'today-outline', color: '#10B981', bg: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5' },
                                                { label: "Month's Collection", val: `₹${fmt(totalRent)}`, icon: 'wallet-outline', color: '#10B981', bg: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5' },
                                                { label: "Pending Dues", val: `₹${fmt(pending)}`, icon: 'alert-circle-outline', color: '#EF4444', bg: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2' },
                                                { label: "Month's Expense", val: `₹${fmt(totalExpenses)}`, icon: 'trending-down-outline', color: '#F59E0B', bg: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7' },
                                                { label: "Net Profit / Loss", val: `₹${fmt(netProfit)}`, icon: 'bar-chart-outline', color: netProfit >= 0 ? '#10B981' : '#EF4444', bg: isDark ? (netProfit >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)') : (netProfit >= 0 ? '#D1FAE5' : '#FEE2E2') },
                                            ].map((item, index) => (
                                                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                                                            <Ionicons name={item.icon as any} size={14} color={item.color} />
                                                        </View>
                                                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E2E8F0' : '#475569' }}>{item.label}</Text>
                                                    </View>
                                                    <Text style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#FFF' : '#1E293B' }}>{item.val}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* ── TAB CONTENT: Occupancy ── */}
                            {activeTab === 'occupancy' && (
                                <View style={{ gap: 14 }}>
                                    {/* Unified Occupancy Card */}
                                    <View style={[R.topCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1, paddingVertical: 18, alignItems: 'center' }]}>
                                        <View style={{ flex: 1.2, alignItems: 'center', justifyContent: 'center' }}>
                                            <BedsDonutChart occupied={occupiedBeds} total={totalBeds} occupancyRate={occupancyRate} isDark={isDark} />
                                        </View>
                                        <View style={[R.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                                        <View style={{ flex: 1.5, paddingLeft: 16 }}>
                                            <Text style={[R.topCardLabel, { color: isDark ? '#94A3B8' : '#64748B', marginBottom: 10 }]}>Beds Overview</Text>
                                            
                                            <View style={{ gap: 8 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                                                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: isDark ? '#CBD5E1' : '#475569' }}>Occupied: </Text>
                                                    <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#FFF' : '#0F172A' }}>{occupiedBeds}</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? '#7F1D1D' : '#FCA5A5' }} />
                                                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: isDark ? '#CBD5E1' : '#475569' }}>Vacant: </Text>
                                                    <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#FFF' : '#0F172A' }}>{Math.max(0, totalBeds - occupiedBeds)}</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' }} />
                                                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: isDark ? '#CBD5E1' : '#475569' }}>Total Beds: </Text>
                                                    <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#FFF' : '#0F172A' }}>{totalBeds}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Occupancy stats details list */}
                                    <View style={[R.breakdownCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1 }]}>
                                        <Text style={[R.breakdownTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Occupancy Status Details</Text>
                                        <View style={{ gap: 14 }}>
                                            {[
                                                { label: "Occupancy Rate", val: `${occupancyRate}%`, icon: 'trending-up-outline', color: '#10B981', bg: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5' },
                                                { label: "Occupied Beds", val: `${occupiedBeds}`, icon: 'checkmark-circle-outline', color: '#10B981', bg: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5' },
                                                { label: "Vacant Beds", val: `${Math.max(0, totalBeds - occupiedBeds)}`, icon: 'ellipse-outline', color: '#EF4444', bg: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2' },
                                                { label: "Rent Defaulters", val: `${defaulters.length} tenants`, icon: 'people-outline', color: '#8B5CF6', bg: isDark ? 'rgba(139,92,246,0.15)' : '#EDE9FE' },
                                                { label: "Total capacity", val: `${totalBeds} Beds`, icon: 'bed-outline', color: '#3B82F6', bg: isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE' },
                                            ].map((item, index) => (
                                                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                                                            <Ionicons name={item.icon as any} size={14} color={item.color} />
                                                        </View>
                                                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E2E8F0' : '#475569' }}>{item.label}</Text>
                                                    </View>
                                                    <Text style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#FFF' : '#1E293B' }}>{item.val}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* ── TAB CONTENT: All Reports ── */}
                            {activeTab === 'reports' && (
                                <View style={{ gap: 14 }}>
                                    {/* Premium Export Master Statement Card */}
                                    <View style={{
                                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                        borderRadius: 20,
                                        padding: 16,
                                        borderWidth: 1.5,
                                        borderColor: isDark ? '#334155' : '#E2E8F0',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 10,
                                        elevation: 3,
                                    }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                            <View style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 14,
                                                backgroundColor: isDark ? '#312E81' : '#EDE9FE',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                                <Ionicons name="document-text-outline" size={22} color="#7C3AED" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 15.5, fontWeight: '800', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                                                    Master Audit Statement
                                                </Text>
                                                <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                                                    Complete compiled financial ledger & room breakdown
                                                </Text>
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            style={{
                                                backgroundColor: '#7C3AED',
                                                paddingVertical: 12,
                                                paddingHorizontal: 16,
                                                borderRadius: 14,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                                shadowColor: '#7C3AED',
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowOpacity: 0.25,
                                                shadowRadius: 8,
                                                elevation: 4,
                                            }}
                                            onPress={() => setDownloadSelectModal(true)}
                                            activeOpacity={0.85}
                                        >
                                            <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                                            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                                                Export Master Statement (.xlsx)
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={R.secRow}>
                                        <Text style={[R.secTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Available Sheets</Text>
                                        <View style={[R.liveBadge, { backgroundColor: isDark ? 'rgba(22,163,74,0.18)' : '#DCFCE7' }]}>
                                            <View style={R.liveDot} />
                                            <Text style={R.liveTxt}>Live data</Text>
                                        </View>
                                    </View>

                                    <View style={R.reportListContainer}>
                                        {REPORTS.map((r) => (
                                            <View key={r.id} style={{ marginBottom: 12 }}>
                                                <ReportCard report={r} onView={r.onView} onDownload={downloadHandlers[r.id]} exporting={exporting} isDark={isDark} />
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </View>

            {/* Premium Date Preset Bottom Sheet Picker */}
            <ModalSheet visible={filterSelectModal} onClose={() => setFilterSelectModal(false)} maxHeight="60%">
                <View style={[R.bottomSheetMenu, { backgroundColor: theme.cardBg }]}>
                    <View style={R.sheetHeader}>
                        <Text style={[R.sheetTitle, { color: theme.textPrimary }]}>Select Period</Text>
                        <TouchableOpacity onPress={() => setFilterSelectModal(false)}>
                            <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#0F172A'} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 24 }}>
                        {dateOptions.map((opt) => {
                            const isSelected = datePreset === opt;
                            return (
                                <TouchableOpacity
                                    key={opt}
                                    style={R.sheetOpt}
                                    onPress={() => {
                                        setDatePreset(opt);
                                        setFilterSelectModal(false);
                                        if (opt === 'Custom Date Range') {
                                            setShowCustomPicker(true);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[R.radioCircle, { borderColor: isSelected ? theme.primary : (isDark ? '#475569' : '#CBD5E1') }]}>
                                        {isSelected && <View style={[R.radioDot, { backgroundColor: theme.primary }]} />}
                                    </View>
                                    <Text style={[R.sheetOptText, { color: theme.textPrimary, fontWeight: isSelected ? '800' : '600' }]}>
                                        {opt}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </ModalSheet>

            {/* Download Selection Centered Modal */}
            <Modal visible={downloadSelectModal} transparent animationType="fade" onRequestClose={() => setDownloadSelectModal(false)}>
                <TouchableOpacity style={[R.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]} activeOpacity={1} onPress={() => setDownloadSelectModal(false)}>
                    <View style={[R.dlModalBox, { backgroundColor: theme.cardBg }]}>
                        <Text style={{ fontSize: 16, fontWeight: '800', marginBottom: 20, color: theme.textPrimary, textAlign: 'center' }}>Download Full Report</Text>
                        <TouchableOpacity style={[R.filterOpt, { borderBottomColor: isDark ? '#334155' : '#E2E8F0', borderBottomWidth: 1 }]}
                            onPress={() => { setDownloadSelectModal(false); handleDownloadExcel('full_excel'); }} activeOpacity={0.7}>
                            <Ionicons name="cloud-download-outline" size={18} color={theme.primary} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[R.fTitle, { color: theme.textPrimary }]}>Current Filtered Data</Text>
                                <Text style={[R.fSub, { color: theme.textSecondary }]}>{periodLabel}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={R.filterOpt}
                            onPress={() => { setDownloadSelectModal(false); setShowExcelPicker(true); }} activeOpacity={0.7}>
                            <Ionicons name="calendar-number-outline" size={18} color={theme.primary} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[R.fTitle, { color: theme.textPrimary }]}>Custom Date Range</Text>
                                <Text style={[R.fSub, { color: theme.textSecondary }]}>Select any date range</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <CustomDateRangePicker
                visible={showCustomPicker}
                onClose={() => setShowCustomPicker(false)}
                onConfirm={(s: Date, e: Date) => { setDatePreset('Custom Date Range'); setCustomStart(s); setCustomEnd(e); setShowCustomPicker(false); }}
                initialStart={customStart}
                initialEnd={customEnd}
            />

            <CustomDateRangePicker
                visible={showExcelPicker}
                onClose={() => setShowExcelPicker(false)}
                onConfirm={(s: Date, e: Date) => {
                    setShowExcelPicker(false);
                    handleDownloadExcel('full_excel', s, e);
                }}
                initialStart={customStart}
                initialEnd={customEnd}
            />

            {/* FullScreen Loader */}
            <FullScreenLoader
                visible={!!exporting}
                message={
                    exporting === 'pdf'
                        ? 'Generating PDF Report...'
                        : exporting === 'full_excel'
                        ? 'Generating Complete Audit Excel Report...'
                        : exporting === 'collection'
                        ? 'Generating Rent Collection Excel Report...'
                        : exporting === 'expenses'
                        ? 'Generating Expenses Excel Report...'
                        : exporting === 'dues'
                        ? 'Generating Pending Dues Excel Report...'
                        : exporting === 'occupancy'
                        ? 'Generating Rooms & Occupancy Excel Report...'
                        : exporting === 'tenants'
                        ? 'Generating Tenants List Excel Report...'
                        : 'Preparing Excel Report...'
                }
            />
        </View>
    );
}

const R = StyleSheet.create({
    root: { flex: 1 },
    purpleHeader: {
        backgroundColor: '#4F46E5',
        paddingTop: 10,
        paddingBottom: 12,
    },
    hBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
    topFilterBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    },
    topFilterTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    mainSheet: {
        flex: 1,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingTop: 16,
        overflow: 'hidden',
    },
    
    // Tab Segmented bar
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 14,
        padding: 4,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 12.5,
        fontWeight: '600',
    },

    topCard: {
        flexDirection: 'row',
        borderRadius: 20, padding: 16, marginHorizontal: 16, marginBottom: 12,
        alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    },
    topCardLeft: { flex: 1, paddingRight: 10, justifyContent: 'center' },
    topCardLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6 },
    topCardVal: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 8, gap: 2 },
    badgeTxt: { fontSize: 10, fontWeight: '700' },
    divider: { width: 1, backgroundColor: '#F1F5F9', marginHorizontal: 8 },
    topCardRight: { flex: 1, alignItems: 'center', paddingLeft: 10 },
    subLabel: { fontSize: 9, fontWeight: '600', color: '#64748B', marginTop: 6 },
    gridRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, marginBottom: 8, justifyContent: 'space-between' },
    gridItem: {
        borderRadius: 16, padding: 12, alignItems: 'flex-start',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    gridIconBg: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    gridArrow: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    gridLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
    gridVal: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
    gridSub: { fontSize: 8, color: '#64748B', fontWeight: '500' },
    
    // Breakdown Section styles
    breakdownCard: {
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    breakdownTitle: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 12,
    },
    progressRow: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
    },
    barBg: { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3 },

    mainDlBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginHorizontal: 16, borderRadius: 12, paddingVertical: 14,
        borderWidth: 1.5, borderColor: '#4F46E5', marginBottom: 24,
    },
    mainDlBtnTxt: { color: '#4F46E5', fontSize: 14, fontWeight: '800' },
    secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
    secTitle: { fontSize: 16, fontWeight: '900' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
    liveTxt: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
    reportListContainer: { marginHorizontal: 16, paddingBottom: 20 },
    reportCard: { 
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12,
        borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    cardText: { flex: 1 },
    cardTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
    cardDesc: { fontSize: 11, fontWeight: '600' },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    actionBtn: { padding: 4 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', paddingTop: 0, paddingRight: 0 },
    dropdownMenu: {
        position: 'absolute', top: 90, right: 16,
        borderRadius: 16, padding: 8, width: 220,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    },
    dlModalBox: {
        borderRadius: 20, padding: 24, width: '85%', maxWidth: 340,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    },
    filterOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 },
    fTitle: { fontSize: 13, fontWeight: '700' },
    fSub: { fontSize: 10, color: '#64748B', marginTop: 2, fontWeight: '600' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 9999, elevation: 9999 },
    overlayBox: { borderRadius: 20, padding: 28, alignItems: 'center', gap: 14, minWidth: 200 },
    overlayTxt: { fontSize: 14, fontWeight: '700' },

    // Bottom Sheet styles
    bottomSheetMenu: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        width: '100%',
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '900',
    },
    sheetOpt: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 12,
    },
    sheetOptText: {
        fontSize: 14,
    },
    radioCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioDot: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
    },
});
