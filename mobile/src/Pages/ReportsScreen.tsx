import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, RefreshControl, ActivityIndicator, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { ProfileMenu } from '../components/ProfileMenu';
import { buildReportHtml } from '../utils/reportHtml';
import * as Print from 'expo-print';
import { downloadAndSaveFile } from '../utils/fileDownloader';
import { toLocalDateStr } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';
import Svg, { Circle, Path } from 'react-native-svg';
import { CustomDateRangePicker } from '../components/ui/pickers/CustomDateRangePicker';
import { CustomMonthYearPicker } from '../components/ui/pickers/CustomMonthYearPicker';

const fmt = (n: number) => n.toLocaleString('en-IN');

// ── Progress Circle Component ──────────────────────────────────────────────────
const ProgressCircle = ({ value, size = 68, strokeWidth = 6, color = '#4ADE80', isDark }: any) => {
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
                <Text style={{ fontSize: 13, fontWeight: '900', color: isDark ? '#FFF' : '#0F172A' }}>{value}%</Text>
            </View>
        </View>
    );
};

// ── Card Wave Component ────────────────────────────────────────────────────────
const CardWave = ({ color }: { color: string }) => (
    <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden', borderRadius: 16 }]}>
        <Svg height="60" width="200%" style={{ position: 'absolute', bottom: -10, left: 0 }} viewBox="0 0 1440 320">
            <Path fill={color} fillOpacity="0.12" d="M0,256L48,229.3C96,203,192,149,288,154.7C384,160,480,224,576,218.7C672,213,768,139,864,128C960,117,1056,171,1152,197.3C1248,224,1344,224,1392,224L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
            <Path fill={color} fillOpacity="0.2" d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,213.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </Svg>
    </View>
);

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
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState<string | null>(null);
    const [showExcelPicker, setShowExcelPicker] = useState(false);
    const [downloadSelectModal, setDownloadSelectModal] = useState(false);

    // -- Filter State --
    const [filterMode, setFilterMode] = useState<'month' | 'custom'>('month');
    const [statsMonth, setStatsMonth] = useState(new Date());
    const [customStart, setCustomStart] = useState(() => { const d = new Date(); d.setDate(1); return d; });
    const [customEnd, setCustomEnd] = useState(new Date());

    const [filterSelectModal, setFilterSelectModal] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    // -- Data State --
    const [stats, setStats] = useState<any>(null);
    const [overview, setOverview] = useState<any>(null);
    const [defaulters, setDefaulters] = useState<any[]>([]);
    const [expensePreview, setExpensePreview] = useState<any[]>([]);
    const [trend, setTrend] = useState<any[]>([]);

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

    const loadExpensePreview = useCallback(async () => {
        try {
            const { startDate, endDate } = getQueryDates();
            const res = await api.get('/expenses', { params: { startDate, endDate, page: 1, limit: 25 } });
            if (res.data?.success) setExpensePreview(res.data.data || []);
        } catch (error) { console.warn('ReportsScreen: expense preview failed', error); }
    }, [getQueryDates]);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
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
                const nowDate = new Date(); nowDate.setHours(0, 0, 0, 0);
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
        } finally {
            setLoading(false); setRefreshing(false);
        }
    }, [getQueryDates]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const onRefresh = () => { setRefreshing(true); loadData(true); };

    const totalRent = overview?.rentCollected ?? overview?.feeCollection ?? stats?.monthlyRentCollected ?? stats?.feeCollection ?? 0;
    const pending = overview?.rentPending ?? stats?.monthlyRentPending ?? stats?.pendingDuesAmount ?? 0;
    const totalExpenses = overview?.totalExpenses ?? stats?.monthlyExpenses ?? 0;
    const netProfit = overview?.netProfit ?? (totalRent - totalExpenses);
    const totalDue = totalRent + pending;
    const occupancyRate = stats?.occupancyRate || 0;
    const totalBeds = stats?.totalBeds || 0;
    const occupiedBeds = stats?.occupiedBeds || 0;

    let periodLabel = '';
    if (filterMode === 'month') {
        periodLabel = statsMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } else {
        periodLabel = `${customStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${customEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

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
            const token = await AsyncStorage.getItem('token');
            if (!token) { showError('Authentication token not found.'); return; }

            const base = api.defaults.baseURL?.replace(/\/$/, '') || '';
            let url = '';
            let filename = '';

            if (overrideStart && overrideEnd) {
                const startStr = toLocalDateStr(overrideStart);
                const endStr = toLocalDateStr(overrideEnd);
                url = `${base}/reports/download/excel?startDate=${startStr}&endDate=${endStr}&reportType=${reportId}&token=${encodeURIComponent(token)}`;
                filename = `Report_${startStr}_to_${endStr}.xlsx`;
            } else {
                const { startDate, endDate, monthStr } = getQueryDates();
                if (filterMode === 'month' && monthStr) {
                    url = `${base}/reports/download/excel?month=${monthStr}&reportType=${reportId}&token=${encodeURIComponent(token)}`;
                    filename = `Report_${monthStr}.xlsx`;
                } else {
                    url = `${base}/reports/download/excel?startDate=${startDate}&endDate=${endDate}&reportType=${reportId}&token=${encodeURIComponent(token)}`;
                    filename = `Report_${startDate}_to_${endDate}.xlsx`;
                }
            }

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
                titleColor="#FFF"
                iconColor="#FFF"
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <ProfileMenu />
                    </View>
                }
            >
                <TouchableOpacity style={R.topFilterBtn} onPress={() => setFilterSelectModal(true)} activeOpacity={0.8}>
                    <Ionicons name="calendar-outline" size={14} color="#FFF" />
                    <Text style={R.topFilterTxt}>{periodLabel}</Text>
                    <Ionicons name="chevron-down" size={12} color="#FFF" />
                </TouchableOpacity>
            </AppHeader>

            <View style={[R.mainSheet, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
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
                            <Skeleton style={[R.mainDlBtn, { height: 56, marginHorizontal: 16 }]} isDark={isDark} />

                            <View style={R.secRow}>
                                <Text style={[R.secTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>All Reports</Text>
                                <View style={R.liveBadge}>
                                    <View style={R.liveDot} />
                                    <Text style={R.liveTxt}>Loading...</Text>
                                </View>
                            </View>
                            <View style={R.reportListContainer}>
                                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} style={{ height: 72, borderRadius: 16, marginBottom: 12 }} isDark={isDark} />)}
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={[R.topCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#F1F5F9', borderWidth: 1, overflow: 'hidden' }]}>
                                <CardWave color={netProfit >= 0 ? '#10B981' : '#EF4444'} />
                                <View style={R.topCardLeft}>
                                    <Text style={R.topCardLabel}>Net Profit</Text>
                                    <Text style={[R.topCardVal, { color: isDark ? '#F1F5F9' : '#0F172A', fontSize: 34 }]} numberOfLines={1} adjustsFontSizeToFit>
                                        {netProfit < 0 ? '-' : ''}{'\u20b9'}{fmt(Math.abs(netProfit))}
                                    </Text>
                                    {!!profitChangeLabel && (
                                        <View style={[R.badge, { backgroundColor: profitChange > 0 ? (isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5') : profitChange < 0 ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2') : (isDark ? 'rgba(100,116,139,0.15)' : '#F1F5F9') }]}>
                                            <Ionicons name={profitChange > 0 ? 'trending-up' : profitChange < 0 ? 'trending-down' : 'remove'} size={12} color={profitChange > 0 ? '#10B981' : profitChange < 0 ? '#EF4444' : '#64748B'} />
                                            <Text style={[R.badgeTxt, { color: profitChange > 0 ? '#10B981' : profitChange < 0 ? '#EF4444' : '#64748B' }]}>{profitChangeLabel}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={R.divider} />
                                <View style={R.topCardRight}>
                                    <Text style={R.topCardLabel}>Collection Rate</Text>
                                    <ProgressCircle value={collectionRate} size={70} strokeWidth={6} color="#4F46E5" isDark={isDark} />
                                    <Text style={R.subLabel}>of total collection</Text>
                                </View>
                            </View>

                            <View style={R.gridRow}>
                                {[
                                    { label: 'Collected', val: `₹${fmt(totalRent)}`, sub: 'Rent collected', c: '#10B981', i: 'wallet-outline', bg: '#D1FAE5', screen: 'CollectedPayments' },
                                    { label: 'Pending', val: `₹${fmt(pending)}`, sub: 'Dues outstanding', c: '#F59E0B', i: 'time-outline', bg: '#FEF3C7', screen: 'PendingPayments' },
                                    { label: 'Expenses', val: `₹${fmt(totalExpenses)}`, sub: 'Total expenses', c: '#EF4444', i: 'trending-down-outline', bg: '#FEE2E2', screen: 'Expenses' },
                                    { label: 'Occupancy', val: totalBeds > 0 ? `${occupiedBeds}/${totalBeds}` : 'N/A', sub: totalBeds > 0 ? `${occupancyRate}% occupied` : 'No beds data', c: '#3B82F6', i: 'bed-outline', bg: '#DBEAFE', screen: 'Rooms' },
                                ].map((m) => (
                                    <TouchableOpacity key={m.label} style={[R.gridItem, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]} onPress={() => navigation.navigate(m.screen)} activeOpacity={0.8}>
                                        <CardWave color={m.c} />
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 }}>
                                            <View style={[R.gridIconBg, { backgroundColor: isDark ? m.c + '20' : m.bg }]}>
                                                <Ionicons name={m.i as any} size={20} color={m.c} />
                                            </View>
                                            <View style={[R.gridArrow, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                                <Ionicons name="arrow-forward" size={14} color={isDark ? '#FFF' : '#0F172A'} />
                                            </View>
                                        </View>
                                        <Text style={[R.gridLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{m.label}</Text>
                                        <Text style={[R.gridVal, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{m.val}</Text>
                                        <Text style={R.gridSub}>{m.sub}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Download Full Report Button */}
                            <TouchableOpacity style={R.mainDlBtn} onPress={() => setDownloadSelectModal(true)} activeOpacity={0.8}>
                                <Ionicons name="download-outline" size={20} color="#4F46E5" />
                                <Text style={R.mainDlBtnTxt}>Download Full Report (Excel)</Text>
                            </TouchableOpacity>

                            {/* All Reports */}
                            <View style={R.secRow}>
                                <Text style={[R.secTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>All Reports</Text>
                                <View style={R.liveBadge}>
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
                        </>
                    )}
                </ScrollView>
            </View>

            <Modal visible={filterSelectModal} transparent animationType="fade" onRequestClose={() => setFilterSelectModal(false)}>
                <TouchableOpacity style={R.modalOverlay} activeOpacity={1} onPress={() => setFilterSelectModal(false)}>
                    <View style={[R.dropdownMenu, { backgroundColor: theme.cardBg }]}>
                        <TouchableOpacity style={[R.filterOpt, { borderBottomColor: isDark ? '#334155' : '#E2E8F0', borderBottomWidth: 1 }]}
                            onPress={() => { setFilterSelectModal(false); setShowMonthPicker(true); }}>
                            <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[R.fTitle, { color: theme.textPrimary }]}>Specific Month</Text>
                                <Text style={R.fSub}>E.g., June 2026</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={R.filterOpt}
                            onPress={() => { setFilterSelectModal(false); setShowCustomPicker(true); }}>
                            <Ionicons name="calendar-number-outline" size={18} color={theme.primary} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[R.fTitle, { color: theme.textPrimary }]}>Custom Date Range</Text>
                                <Text style={R.fSub}>E.g., 12 Jun - 18 Jun</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Download Selection Centered Modal */}
            <Modal visible={downloadSelectModal} transparent animationType="fade" onRequestClose={() => setDownloadSelectModal(false)}>
                <TouchableOpacity style={[R.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]} activeOpacity={1} onPress={() => setDownloadSelectModal(false)}>
                    <View style={[R.dlModalBox, { backgroundColor: theme.cardBg }]}>
                        <Text style={{ fontSize: 16, fontWeight: '800', marginBottom: 20, color: theme.textPrimary, textAlign: 'center' }}>Download Full Report</Text>
                        <TouchableOpacity style={[R.filterOpt, { borderBottomColor: isDark ? '#334155' : '#E2E8F0', borderBottomWidth: 1 }]}
                            onPress={() => { setDownloadSelectModal(false); handleDownloadExcel('full_excel'); }}>
                            <Ionicons name="cloud-download-outline" size={18} color={theme.primary} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[R.fTitle, { color: theme.textPrimary }]}>Current Filtered Data</Text>
                                <Text style={R.fSub}>{periodLabel}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={R.filterOpt}
                            onPress={() => { setDownloadSelectModal(false); setShowExcelPicker(true); }}>
                            <Ionicons name="calendar-number-outline" size={18} color={theme.primary} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[R.fTitle, { color: theme.textPrimary }]}>Custom Date Range</Text>
                                <Text style={R.fSub}>Select any date range</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <CustomMonthYearPicker
                visible={showMonthPicker}
                onClose={() => setShowMonthPicker(false)}
                onSelect={(d) => { setFilterMode('month'); setStatsMonth(d); setShowMonthPicker(false); loadData(); }}
                initialDate={statsMonth}
            />

            <CustomDateRangePicker
                visible={showCustomPicker}
                onClose={() => setShowCustomPicker(false)}
                onConfirm={(s: Date, e: Date) => { setFilterMode('custom'); setCustomStart(s); setCustomEnd(e); setShowCustomPicker(false); loadData(); }}
                initialStart={customStart}
                initialEnd={customEnd}
                restrictMonth={filterMode === 'month' ? statsMonth : undefined}
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
                restrictMonth={filterMode === 'month' ? statsMonth : undefined}
            />

            {!!exporting && (
                <View style={R.overlay}>
                    <View style={[R.overlayBox, { backgroundColor: theme.cardBg }]}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={[R.overlayTxt, { color: theme.textPrimary }]}>
                            {exporting === 'pdf' ? 'Generating PDF...' : 'Downloading Report...'}
                        </Text>
                    </View>
                </View>
            )}
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
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'flex-end',
        marginRight: 16, marginBottom: 12,
        paddingHorizontal: 10, paddingVertical: 6,
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
    topCard: {
        flexDirection: 'row',
        borderRadius: 20, padding: 10, marginHorizontal: 16, marginBottom: 12,
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
    gridRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginBottom: 8, justifyContent: 'center' },
    gridItem: {
        width: '47%',
        marginHorizontal: '1.5%',
        marginBottom: 10,
        borderRadius: 16, padding: 10, alignItems: 'flex-start',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    gridIconBg: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    gridArrow: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    gridLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
    gridVal: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
    gridSub: { fontSize: 8, color: '#64748B', fontWeight: '500' },
    linearCard: {
        marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    linearHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    linearTitle: { fontSize: 12, fontWeight: '800' },
    linearSub: { fontSize: 10, fontWeight: '600', color: '#64748B', marginTop: 2 },
    barBg: { height: 8, borderRadius: 4, backgroundColor: '#EEF2FF', width: '100%', overflow: 'hidden' },
    barFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 4 },
    mainDlBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginHorizontal: 16, borderRadius: 12, paddingVertical: 14,
        borderWidth: 1.5, borderColor: '#4F46E5', marginBottom: 24,
    },
    mainDlBtnTxt: { color: '#4F46E5', fontSize: 14, fontWeight: '800' },
    secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
    secTitle: { fontSize: 16, fontWeight: '900' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#DCFCE7' },
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

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 90, paddingRight: 16 },
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
});
