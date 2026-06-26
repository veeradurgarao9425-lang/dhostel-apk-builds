import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, RefreshControl, ActivityIndicator, Alert, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { downloadAndSaveFile } from '../utils/fileDownloader';
import { toLocalDateStr } from '../utils/dateUtils';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { ProfileMenu } from '../components/ProfileMenu';
import { buildReportHtml } from '../utils/reportHtml';
import { LinearGradient } from 'expo-linear-gradient';

const fmt = (n: number) => n.toLocaleString('en-IN');

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
                            style={[R.actionBtn, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                            onPress={onDownload}
                            disabled={!!exporting}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            {exporting === report.id
                                ? <ActivityIndicator size="small" color={report.iconColor} />
                                : <Ionicons name="download-outline" size={17} color={report.iconColor} />
                            }
                        </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#CBD5E1'} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ReportsScreen() {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState<null | string>(null);
    // Cache: store data between navigations, only reload if stale (>2 min)
    const lastLoadedAt = useRef<number>(0);
    const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

    const [excelRangeModal, setExcelRangeModal] = useState(false);
    const [pendingExportType, setPendingExportType] = useState<'download' | 'email'>('download');
    const [excelStart, setExcelStart] = useState(() => { const d = new Date(); d.setDate(1); return d; });
    const [excelEnd, setExcelEnd] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const [stats, setStats] = useState<any>(null);
    const [defaulters, setDefaulters] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [trend, setTrend] = useState<any[]>([]);
    const [statsMonth, setStatsMonth] = useState(new Date());

    const changeMonth = (dir: -1 | 1) => {
        const now = new Date();
        const d = new Date(statsMonth);
        d.setMonth(d.getMonth() + dir);
        if (dir === 1 && (d.getFullYear() > now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth()))) return;
        setStatsMonth(d);
    };

    const loadData = useCallback(async (silent = false, forceRefresh = false) => {
        // Skip reload if data is still fresh (cache hit)
        const now = Date.now();
        const isCacheValid = lastLoadedAt.current > 0 && (now - lastLoadedAt.current) < CACHE_TTL_MS;
        if (isCacheValid && !forceRefresh && !silent) {
            setLoading(false);
            return;
        }
        if (!silent) setLoading(true);
        try {
            const [statsRes, feesRes, expRes, trendRes] = await Promise.all([
                api.get('/reports/dashboard-stats').catch(() => ({ data: { success: false } })),
                api.get('/monthly-fees/summary').catch(() => ({ data: { success: false } })),
                api.get('/expenses').catch(() => ({ data: { success: false } })),
                api.get('/reports/monthly-overview').catch(() => ({ data: { success: false } })),
            ]);
            if (statsRes.data?.success) setStats(statsRes.data.data);
            if (trendRes.data?.success && trendRes.data.data?.trend) setTrend(trendRes.data.data.trend.slice(-6));
            if (feesRes.data?.success && feesRes.data.data?.fees) {
                const fees: any[] = feesRes.data.data.fees;
                const nowDate = new Date(); nowDate.setHours(0, 0, 0, 0);
                setDefaulters(
                    fees
                        .filter(f => (f.balance || 0) > 0 && !['paid', 'fully paid'].includes((f.fee_status || '').toLowerCase()))
                        .sort((a, b) => (b.balance || 0) - (a.balance || 0))
                        .slice(0, 5)
                        .map(f => {
                            const due = f.due_date ? new Date(f.due_date) : new Date();
                            due.setHours(0, 0, 0, 0);
                            return { id: f.student_id, name: `${f.first_name || ''} ${f.last_name || ''}`.trim(), amount: f.balance || 0, days: Math.floor((nowDate.getTime() - due.getTime()) / 86400000) };
                        })
                );
            }
            if (expRes.data?.success) setExpenses(expRes.data.data || []);
            lastLoadedAt.current = Date.now(); // Mark cache as fresh
        } catch (e) { console.error('ReportsScreen:', e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const onRefresh = () => { setRefreshing(true); loadData(true, true); };

    const totalRent = stats ? (stats.monthlyRentCollected || stats.feeCollection || 0) : 0;
    const pending = stats ? (stats.monthlyRentPending || stats.pendingDuesAmount || 0) : 0;
    const totalDue = totalRent + pending;
    const occupancyRate = stats?.occupancyRate || 0;
    const totalBeds = stats?.totalBeds || 0;
    const occupiedBeds = stats?.occupiedBeds || 0;
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const netProfit = totalRent - totalExpenses;
    const periodLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const collectionRate = totalDue > 0 ? Math.round((totalRent / totalDue) * 100) : 0;

    const handleExportPDF = async () => {
        setExporting('pdf');
        try {
            const html = buildReportHtml({ hostelName: user?.hostel_name || 'My Hostel', ownerName: user?.full_name, periodLabel, totalRent, pending, totalExpenses, netProfit, collectionRate, occupancyRate, occupiedBeds, totalBeds, defaulters, expenses, trend });
            const { uri } = await Print.printToFileAsync({ html });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF Report', UTI: 'com.adobe.pdf' });
            else Alert.alert('Saved', 'Report saved to:\n' + uri);
        } catch (e: any) { Alert.alert('Export Failed', e?.message || 'Could not generate PDF.'); }
        finally { setExporting(null); }
    };

    const openExcelModal = (type: 'download' | 'email') => {
        const d = new Date(); d.setDate(1);
        setExcelStart(d); setExcelEnd(new Date());
        setPendingExportType(type); setExcelRangeModal(true);
    };

    const handleDoExcelDownload = async () => {
        if (excelStart > excelEnd) { Alert.alert('Invalid Range', 'Start date must be before end date.'); return; }
        setExcelRangeModal(false); setExporting('excel');
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) { Alert.alert('Error', 'Authentication token not found.'); return; }
            const startStr = toLocalDateStr(excelStart); const endStr = toLocalDateStr(excelEnd);
            const base = api.defaults.baseURL?.replace(/\/$/, '') || '';
            const url = `${base}/reports/download/excel?startDate=${startStr}&endDate=${endStr}&token=${encodeURIComponent(token)}`;
            const filename = `hostel_report_${startStr}_to_${endStr}.xlsx`;
            const destUri = `${FileSystem.documentDirectory}${filename}`;
            const result = await FileSystem.downloadAsync(url, destUri);
            if (result.status === 200) {
                // File is already saved — share directly, no re-copy
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(result.uri, {
                        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        dialogTitle: `Open ${filename}`,
                        UTI: 'com.microsoft.excel.xlsx',
                    });
                } else {
                    Alert.alert('Downloaded', `Saved as:\n${filename}`);
                }
            } else Alert.alert('Download Failed', `Server returned ${result.status}`);
        } catch (e: any) { Alert.alert('Export Failed', e?.message || 'Could not download Excel.'); }
        finally { setExporting(null); }
    };

    const handleEmailExcel = async () => {
        if (excelStart > excelEnd) { Alert.alert('Invalid Range', 'Start date must be before end date.'); return; }
        setExcelRangeModal(false); setExporting('email');
        try {
            const startStr = toLocalDateStr(excelStart); const endStr = toLocalDateStr(excelEnd);
            const res = await api.post(`/reports/email-excel?startDate=${startStr}&endDate=${endStr}`);
            if (res.data?.success) Alert.alert('Report Sent', res.data.message || `Emailed to ${user?.email}.`);
            else throw new Error(res.data?.error || 'Could not send report.');
        } catch (e: any) { Alert.alert('Email Failed', e?.response?.data?.error || e?.message || 'Please try again.'); }
        finally { setExporting(null); }
    };

    const REPORTS = [
        { id: 'collection', title: 'Collection Report', description: 'All rent payments received', icon: 'cash-outline', iconColor: '#10B981', iconBg: '#D1FAE5', canDownload: true, onView: () => navigation.navigate('CollectedPayments') },
        { id: 'dues', title: 'Due & Pending Report', description: `${defaulters.length} tenants with outstanding dues`, icon: 'alert-circle-outline', iconColor: '#F59E0B', iconBg: '#FEF3C7', canDownload: true, onView: () => navigation.navigate('PendingPayments') },
        { id: 'expenses', title: 'Expense Report', description: `${expenses.length} expenses recorded`, icon: 'trending-down-outline', iconColor: '#EF4444', iconBg: '#FEE2E2', canDownload: true, onView: () => navigation.navigate('Expenses') },
        { id: 'occupancy', title: 'Occupancy Report', description: `${occupiedBeds}/${totalBeds} beds occupied · ${occupancyRate}% full`, icon: 'bed-outline', iconColor: '#3B82F6', iconBg: '#DBEAFE', canDownload: true, onView: () => navigation.navigate('Rooms') },
        { id: 'tenants', title: 'Tenant Report', description: 'All active tenants and their details', icon: 'people-outline', iconColor: '#8B5CF6', iconBg: '#EDE9FE', canDownload: true, onView: () => navigation.navigate('Students') },
        { id: 'monthly', title: 'Monthly Summary', description: `${periodLabel} · Net ${netProfit >= 0 ? '+' : ''}\u20b9${fmt(netProfit)}`, icon: 'bar-chart-outline', iconColor: '#7C3AED', iconBg: '#EDE9FE', canDownload: true, onView: () => navigation.navigate('Overview') },
        { id: 'excel', title: 'Custom Report (Excel)', description: 'Download full data for any date range', icon: 'grid-outline', iconColor: '#059669', iconBg: '#D1FAE5', canDownload: true, onView: () => openExcelModal('download') },
        { id: 'pdf', title: 'Summary Report (PDF)', description: 'Shareable PDF with all key metrics', icon: 'document-text-outline', iconColor: '#DC2626', iconBg: '#FEE2E2', canDownload: true, onView: handleExportPDF },
    ];

    const downloadHandlers: Record<string, () => void> = {
        collection: () => openExcelModal('download'),
        dues: () => openExcelModal('download'),
        expenses: () => openExcelModal('download'),
        occupancy: () => openExcelModal('download'),
        tenants: () => openExcelModal('download'),
        monthly: () => openExcelModal('download'),
        excel: () => openExcelModal('download'),
        pdf: handleExportPDF,
    };

    if (loading) {
        return (
            <View style={[R.root, { backgroundColor: isDark ? theme.background : '#F0F4FF' }]}>
                <AppHeader title="Analytics & Reports" />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 13 }}>Loading reports...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[R.root, { backgroundColor: isDark ? theme.background : '#F0F4FF' }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader
                title="Analytics & Reports"
                alignLeft
                showBack={navigation.canGoBack()}
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity style={[R.hBtn, !!exporting && { opacity: 0.6 }]} onPress={() => openExcelModal('email')} disabled={!!exporting}>
                            <Ionicons name="mail-outline" size={16} color="#FFF" />
                        </TouchableOpacity>
                        <ProfileMenu />
                    </View>
                }
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
            >
                {/* Live KPI Banner */}
                <LinearGradient colors={['#7C3AED', '#5F2EEA', '#4338CA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={R.banner}>
                    <View style={R.bannerTop}>
                        <TouchableOpacity onPress={() => changeMonth(-1)} style={R.navBtn}>
                            <Ionicons name="chevron-back" size={20} color="#FFF" />
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={R.bannerMonthLabel}>PERIOD</Text>
                            <Text style={R.bannerPeriod}>{periodLabel}</Text>
                        </View>
                        <TouchableOpacity onPress={() => changeMonth(1)} style={R.navBtn} disabled={statsMonth.getMonth() === new Date().getMonth() && statsMonth.getFullYear() === new Date().getFullYear()}>
                            <Ionicons name="chevron-forward" size={20} color={statsMonth.getMonth() === new Date().getMonth() && statsMonth.getFullYear() === new Date().getFullYear() ? 'rgba(255,255,255,0.2)' : '#FFF'} />
                        </TouchableOpacity>
                    </View>
                    <View style={[R.netBox, { alignItems: 'center', marginBottom: 16 }]}>
                        <Text style={R.netLabel}>NET PROFIT</Text>
                        <Text style={[R.netVal, { color: netProfit >= 0 ? '#4ADE80' : '#FCA5A5' }]}>
                            {netProfit >= 0 ? '+' : ''}{'\u20b9'}{fmt(netProfit)}
                        </Text>
                    </View>
                    <View style={R.kpiRow}>
                        {[
                            { label: 'Collected', value: fmt(totalRent) },
                            { label: 'Pending', value: fmt(pending) },
                            { label: 'Expenses', value: fmt(totalExpenses) },
                            { label: 'Beds', value: `${occupiedBeds}/${totalBeds}` },
                        ].map((k, i) => (
                            <React.Fragment key={k.label}>
                                {i > 0 && <View style={R.kpiDivider} />}
                                <View style={R.kpiItem}>
                                    <Text style={R.kpiVal}>{i < 3 ? '\u20b9' : ''}{k.value}</Text>
                                    <Text style={R.kpiLbl}>{k.label}</Text>
                                </View>
                            </React.Fragment>
                        ))}
                    </View>
                    {totalDue > 0 && (
                        <View style={R.progWrap}>
                            <View style={R.progBg}>
                                <View style={[R.progFill, { width: (`${Math.min(100, collectionRate)}%` as any) }]} />
                            </View>
                            <Text style={R.progLbl}>{collectionRate}% collection rate this month</Text>
                        </View>
                    )}
                    {/* Quick Download Button */}
                    <TouchableOpacity
                        style={R.bannerDownloadBtn}
                        onPress={() => openExcelModal('download')}
                        disabled={!!exporting}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="download-outline" size={14} color="#7C3AED" />
                        <Text style={R.bannerDownloadTxt}>Download Full Report (Excel)</Text>
                    </TouchableOpacity>
                </LinearGradient>

                {/* Top Defaulters Alert */}
                {defaulters.length > 0 && (
                    <View style={[R.alertCard, { backgroundColor: isDark ? '#2D1515' : '#FFF5F5', borderColor: '#FCA5A5' }]}>
                        <View style={R.alertRow}>
                            <Ionicons name="warning-outline" size={15} color="#EF4444" />
                            <Text style={R.alertTitle}>Top Due Tenants</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('PendingPayments')}>
                                <Text style={R.alertLink}>View All {'\u2192'}</Text>
                            </TouchableOpacity>
                        </View>
                        {defaulters.slice(0, 3).map((d, i) => (
                            <View key={d.id} style={R.dRow}>
                                <View style={R.dRank}><Text style={R.dRankTxt}>#{i + 1}</Text></View>
                                <Text style={[R.dName, { color: isDark ? '#F1F5F9' : '#0F172A' }]} numberOfLines={1}>{d.name}</Text>
                                <Text style={R.dAmt}>{'\u20b9'}{fmt(d.amount)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Section header */}
                <View style={R.secRow}>
                    <Text style={[R.secTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>ALL REPORTS</Text>
                    <View style={R.liveChip}>
                        <View style={R.liveDot} />
                        <Text style={R.liveTxt}>Live data</Text>
                    </View>
                </View>

                {/* Report cards */}
                <View style={[R.reportList, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    {REPORTS.map((r, idx) => (
                        <View key={r.id}>
                            <ReportCard report={r} onView={r.onView} onDownload={downloadHandlers[r.id]} exporting={exporting} isDark={isDark} />
                            {idx < REPORTS.length - 1 && <View style={[R.sep, { backgroundColor: isDark ? '#334155' : '#F8FAFC', marginLeft: 72 }]} />}
                        </View>
                    ))}
                </View>

                {/* 6-Month Trend */}
                {trend.length > 0 && (
                    <View style={[R.trendCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <View style={R.trendHead}>
                            <Ionicons name="bar-chart-outline" size={16} color="#7C3AED" />
                            <Text style={[R.trendHeadTxt, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>6-Month Revenue Trend</Text>
                        </View>
                        <View style={[R.trendHRow, { borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            {['MONTH', 'INCOME', 'EXPENSE', 'NET'].map((h, i) => (
                                <Text key={h} style={[R.trendHCell, i === 0 && { flex: 1.5, textAlign: 'left' }]}>{h}</Text>
                            ))}
                        </View>
                        {trend.map((t: any, i: number) => {
                            const net = (t.income || 0) - (t.expenses || 0);
                            const isCur = i === trend.length - 1;
                            return (
                                <View key={i} style={[R.trendRow, isCur && { backgroundColor: isDark ? '#2D1B69' : '#F5F3FF' }]}>
                                    <Text style={[R.trendCell, { flex: 1.5, textAlign: 'left', color: isDark ? '#E2E8F0' : '#334155', fontWeight: isCur ? '800' : '500' }]}>{t.monthLabel || t.month}</Text>
                                    <Text style={[R.trendCell, { color: '#059669' }]}>{'\u20b9'}{fmt(t.income || 0)}</Text>
                                    <Text style={[R.trendCell, { color: '#EF4444' }]}>{'\u20b9'}{fmt(t.expenses || 0)}</Text>
                                    <Text style={[R.trendCell, { color: net >= 0 ? '#059669' : '#EF4444', fontWeight: '700' }]}>{'\u20b9'}{fmt(net)}</Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Footer */}
                <View style={R.footer}>
                    <Ionicons name="shield-checkmark-outline" size={13} color="#7C3AED" />
                    <Text style={R.footerTxt}>All reports include real-time data {'\u00b7'} Updated just now</Text>
                </View>
            </ScrollView>

            {/* Export date-range modal */}
            <Modal visible={excelRangeModal} transparent animationType="slide" onRequestClose={() => setExcelRangeModal(false)}>
                <TouchableOpacity style={R.backdrop} activeOpacity={1} onPress={() => setExcelRangeModal(false)}>
                    <TouchableOpacity activeOpacity={1} style={[R.sheet, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                        <View style={R.handle} />
                        <Text style={[R.sheetTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Export Report</Text>
                        <Text style={[R.sheetSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                            Select a date range for your {pendingExportType === 'email' ? 'email' : 'Excel'} export
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                            {[{ label: 'Last 7 Days', days: 7 }, { label: 'This Month', days: 0 }, { label: 'Last Month', days: -1 }].map(preset => (
                                <TouchableOpacity key={preset.label}
                                    onPress={() => {
                                        const today = new Date();
                                        if (preset.days > 0) { const s = new Date(today); s.setDate(today.getDate() - preset.days + 1); setExcelStart(s); setExcelEnd(today); }
                                        else if (preset.days === 0) { const s = new Date(today); s.setDate(1); setExcelStart(s); setExcelEnd(today); }
                                        else { setExcelStart(new Date(today.getFullYear(), today.getMonth() - 1, 1)); setExcelEnd(new Date(today.getFullYear(), today.getMonth(), 0)); }
                                    }}
                                    style={{ flex: 1, paddingVertical: 9, backgroundColor: isDark ? '#334155' : '#F1F5F9', borderRadius: 10, alignItems: 'center' }}
                                >
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#CBD5E1' : '#475569' }}>{preset.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24, alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => setShowStartPicker(true)} style={[R.datePk, { borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 4 }}>FROM</Text>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#F1F5F9' : '#0F172A' }}>{excelStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                            </TouchableOpacity>
                            <Ionicons name="arrow-forward" size={18} color="#94A3B8" />
                            <TouchableOpacity onPress={() => setShowEndPicker(true)} style={[R.datePk, { borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 4 }}>TO</Text>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: isDark ? '#F1F5F9' : '#0F172A' }}>{excelEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={handleDoExcelDownload} style={[R.sheetBtn, { backgroundColor: '#059669', marginBottom: 10 }]} activeOpacity={0.85}>
                            <Ionicons name="download-outline" size={20} color="#FFF" />
                            <Text style={R.sheetBtnTxt}>Download Excel (.xlsx)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleEmailExcel} style={[R.sheetBtn, { backgroundColor: theme.primary, marginBottom: 16 }]} activeOpacity={0.85}>
                            <Ionicons name="mail-outline" size={20} color="#FFF" />
                            <Text style={R.sheetBtnTxt}>Email to My Account</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={R.sheetCancel} onPress={() => setExcelRangeModal(false)} activeOpacity={0.7}>
                            <Text style={[R.sheetCancelTxt, { color: theme.primary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            <DateTimePickerModal isVisible={showStartPicker} mode="date" date={excelStart} maximumDate={new Date()} onConfirm={d => { setExcelStart(d); setShowStartPicker(false); }} onCancel={() => setShowStartPicker(false)} />
            <DateTimePickerModal isVisible={showEndPicker} mode="date" date={excelEnd} maximumDate={new Date()} onConfirm={d => { setExcelEnd(d); setShowEndPicker(false); }} onCancel={() => setShowEndPicker(false)} />

            {!!exporting && (
                <View style={R.overlay}>
                    <View style={R.overlayBox}>
                        <ActivityIndicator size="large" color="#7C3AED" />
                        <Text style={R.overlayTxt}>
                            {exporting === 'pdf' ? 'Generating PDF...' : exporting === 'email' ? 'Sending email...' : 'Preparing Excel...'}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const R = StyleSheet.create({
    root: { flex: 1 },
    hBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
    banner: { marginHorizontal: 16, marginTop: 14, marginBottom: 14, borderRadius: 20, padding: 18, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    bannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    bannerMonthLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
    bannerPeriod: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 2, textAlign: 'center' },
    netBox: { alignItems: 'center', marginBottom: 14 },
    netLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
    netVal: { fontSize: 22, fontWeight: '900', marginTop: 2 },
    navBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    bannerDownloadBtn: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 16 },
    bannerDownloadTxt: { fontSize: 12, fontWeight: '800', color: '#7C3AED' },
    kpiRow: { flexDirection: 'row', alignItems: 'center' },
    kpiItem: { flex: 1, alignItems: 'center' },
    kpiVal: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    kpiLbl: { color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: '600', marginTop: 3, textAlign: 'center' },
    kpiDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
    progWrap: { marginTop: 14 },
    progBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
    progFill: { height: '100%' as any, backgroundColor: '#4ADE80', borderRadius: 3 },
    progLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', marginTop: 6 },
    alertCard: { marginHorizontal: 16, marginBottom: 14, borderRadius: 16, borderWidth: 1, padding: 14 },
    alertRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    alertTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#EF4444' },
    alertLink: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
    dRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
    dRank: { width: 26, height: 26, borderRadius: 7, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center' },
    dRankTxt: { fontSize: 10, fontWeight: '800', color: '#EF4444' },
    dName: { flex: 1, fontSize: 13, fontWeight: '600' },
    dAmt: { fontSize: 13, fontWeight: '800', color: '#EF4444' },
    secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
    secTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#D1FAE5', backgroundColor: 'rgba(209,250,229,0.15)' },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    liveTxt: { fontSize: 10, fontWeight: '700', color: '#10B981' },
    reportList: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    reportCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    cardText: { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    cardDesc: { fontSize: 12, fontWeight: '500' },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    actionBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    sep: { height: 1 },
    trendCard: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
    trendHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    trendHeadTxt: { fontSize: 14, fontWeight: '700' },
    trendHRow: { flexDirection: 'row', paddingBottom: 8, marginBottom: 4, borderBottomWidth: 1 },
    trendHCell: { flex: 1, fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, textAlign: 'right' },
    trendRow: { flexDirection: 'row', paddingVertical: 8, borderRadius: 8, paddingHorizontal: 4 },
    trendCell: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'right' },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16 },
    footerTxt: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginBottom: 16 },
    sheetTitle: { fontSize: 18, fontWeight: '800' },
    sheetSub: { fontSize: 12.5, fontWeight: '600', marginTop: 3, marginBottom: 16 },
    datePk: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1.5 },
    sheetBtn: { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    sheetBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    sheetCancel: { alignItems: 'center', paddingVertical: 12 },
    sheetCancelTxt: { fontSize: 15, fontWeight: '800' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    overlayBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center', gap: 14, minWidth: 200 },
    overlayTxt: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
});
