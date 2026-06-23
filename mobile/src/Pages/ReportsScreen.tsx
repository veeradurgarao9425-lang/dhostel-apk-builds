import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { ProfileMenu } from '../components/ProfileMenu';
import { buildReportHtml } from '../utils/reportHtml';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const TABS = ['Summary', 'Tenants', 'Finance'] as const;
type TabType = typeof TABS[number];

// ── Mini Stat Cell ────────────────────────────────────────────────────────────
const StatCell = ({ icon, label, value, iconBg, iconColor, dark }: any) => (
    <View style={[sc.cell, { backgroundColor: dark ? '#1E293B' : '#F8FAFC', borderColor: dark ? '#334155' : '#F1F5F9' }]}>
        <View style={[sc.iconBox, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[sc.cellValue, { color: dark ? '#F1F5F9' : '#0F172A' }]}>{value}</Text>
        <Text style={[sc.cellLabel, { color: dark ? '#94A3B8' : '#64748B' }]}>{label}</Text>
    </View>
);

// ── Progress Row ─────────────────────────────────────────────────────────────
const ProgressRow = ({ label, value, total, color }: any) => {
    const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
    return (
        <View style={pr.row}>
            <View style={pr.top}>
                <Text style={pr.label}>{label}</Text>
                <Text style={[pr.val, { color }]}>{pct}%</Text>
            </View>
            <View style={pr.track}>
                <View style={[pr.fill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
};

// ── Defaulter Row ─────────────────────────────────────────────────────────────
const DefaulterRow = ({ rank, name, amount, days, color }: any) => (
    <View style={dr.row}>
        <View style={[dr.rank, { backgroundColor: color + '20' }]}>
            <Text style={[dr.rankNum, { color }]}>#{rank}</Text>
        </View>
        <View style={{ flex: 1 }}>
            <Text style={dr.name} numberOfLines={1}>{name}</Text>
            <Text style={dr.days}>{days > 0 ? `${days} days overdue` : 'Due soon'}</Text>
        </View>
        <Text style={[dr.amt, { color }]}>{fmt(amount)}</Text>
    </View>
);

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ReportsScreen() {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<TabType>('Summary');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState<null | 'pdf' | 'excel' | 'email'>(null);
    const [exportModal, setExportModal] = useState(false);

    const [stats, setStats] = useState<any>(null);
    const [monthlyFees, setMonthlyFees] = useState<any>(null);
    const [defaulters, setDefaulters] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [trend, setTrend] = useState<any[]>([]);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [statsRes, feesRes, expRes, trendRes] = await Promise.all([
                api.get('/reports/dashboard-stats').catch(() => ({ data: { success: false } })),
                api.get('/monthly-fees/summary').catch(() => ({ data: { success: false } })),
                api.get('/expenses').catch(() => ({ data: { success: false } })),
                api.get('/reports/monthly-overview').catch(() => ({ data: { success: false } })),
            ]);

            if (statsRes.data?.success) setStats(statsRes.data.data);
            if (trendRes.data?.success && trendRes.data.data?.trend) {
                setTrend(trendRes.data.data.trend.slice(-6));
            }

            if (feesRes.data?.success && feesRes.data.data?.fees) {
                const fees: any[] = feesRes.data.data.fees;
                const now = new Date(); now.setHours(0, 0, 0, 0);
                const list = fees
                    .filter(f => (f.balance || 0) > 0 && !['paid', 'fully paid'].includes((f.fee_status || '').toLowerCase()))
                    .sort((a, b) => (b.balance || 0) - (a.balance || 0))
                    .slice(0, 5)
                    .map(f => {
                        const due = f.due_date ? new Date(f.due_date) : new Date();
                        due.setHours(0, 0, 0, 0);
                        return {
                            id: f.student_id,
                            name: `${f.first_name || ''} ${f.last_name || ''}`.trim(),
                            amount: f.balance || 0,
                            days: Math.floor((now.getTime() - due.getTime()) / 86400000),
                        };
                    });
                setDefaulters(list);
                setMonthlyFees(feesRes.data.data);
            }

            if (expRes.data?.success) {
                setExpenses(expRes.data.data || []);
            }
        } catch (e) {
            console.error('ReportsScreen load error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    // ── Summary computed values ──────────────────────────────────────────────
    const totalRent = stats ? (stats.monthlyRentCollected || stats.feeCollection || 0) : 0;
    const pending = stats ? (stats.monthlyRentPending || stats.pendingDuesAmount || 0) : 0;
    const totalDue = totalRent + pending;
    const collectionRate = totalDue > 0 ? Math.round((totalRent / totalDue) * 100) : 0;
    const occupancyRate = stats?.occupancyRate || 0;
    const totalBeds = stats?.totalBeds || 0;
    const occupiedBeds = stats?.occupiedBeds || 0;
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const netProfit = totalRent - totalExpenses;

    const periodLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const _now = new Date();
    const monthParam = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`;

    // ── Export: on-device PDF (instant, offline, professional) ────────────────
    const handleExportPDF = async () => {
        setExporting('pdf');
        setExportModal(false);
        try {
            const html = buildReportHtml({
                hostelName: user?.hostel_name || 'My Hostel',
                ownerName: user?.full_name,
                periodLabel,
                totalRent, pending, totalExpenses, netProfit,
                collectionRate, occupancyRate, occupiedBeds, totalBeds,
                defaulters, expenses, trend,
            });
            const { uri } = await Print.printToFileAsync({ html });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Share / Email Report',
                    UTI: 'com.adobe.pdf',
                });
            } else {
                Alert.alert('Saved', 'Report saved to:\n' + uri);
            }
        } catch (e: any) {
            Alert.alert('Export Failed', e?.message || 'Could not generate the PDF report.');
        } finally {
            setExporting(null);
        }
    };

    // ── Export: Excel from backend (full transaction spreadsheet) ─────────────
    const handleExportExcel = async () => {
        setExportModal(false);
        try {
            const token = await AsyncStorage.getItem('token');
            const base = api.defaults.baseURL?.replace(/\/$/, '') || '';
            const exportUrl = `${base}/reports/download/excel?month=${monthParam}&token=${encodeURIComponent(token || '')}`;
            
            const filename = `reports_excel_${monthParam}.xlsx`;
            const fileUri = `${FileSystem.documentDirectory}${filename}`;

            const downloadResult = await FileSystem.downloadAsync(exportUrl, fileUri);

            if (downloadResult.status === 200) {
                Alert.alert(
                    'Download Completed',
                    'The report has been downloaded successfully.',
                    [
                        {
                            text: 'Share / Open',
                            onPress: () => Sharing.shareAsync(downloadResult.uri)
                        },
                        {
                            text: 'OK',
                            style: 'cancel'
                        }
                    ]
                );
            } else {
                Alert.alert('Error', `Server returned status code ${downloadResult.status}`);
            }
        } catch (e: any) {
            Alert.alert('Excel Export Failed', e?.message || 'Could not initiate the Excel download.');
        }
    };

    // ── Email the Excel report to the logged-in user's own email ──────────────
    const handleEmailExcel = async () => {
        setExporting('email');
        setExportModal(false);
        try {
            const res = await api.post(`/reports/email-excel?month=${monthParam}`);
            if (res.data?.success) {
                Alert.alert('Report Sent 📧', res.data.message || `The report has been emailed to ${user?.email}.`);
            } else {
                throw new Error(res.data?.error || 'Could not send the report.');
            }
        } catch (e: any) {
            Alert.alert(
                'Email Failed',
                e?.response?.data?.error || e?.message || 'Could not email the report. Please try again.',
            );
        } finally {
            setExporting(null);
        }
    };

    if (loading) {
        return (
            <View style={[s.root, { backgroundColor: theme.background }]}>
                <AppHeader title="Analytics & Reports" />
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />
            </View>
        );
    }

    return (
        <View style={[s.root, { backgroundColor: isDark ? theme.background : '#F0F4FF' }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader
                title="Analytics & Reports"
                alignLeft={true}
                showBack={navigation.canGoBack()}
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity
                            style={[s.headerExportBtn, !!exporting && { opacity: 0.6 }]}
                            onPress={() => setExportModal(true)}
                            disabled={!!exporting}
                            activeOpacity={0.8}
                        >
                            {exporting
                                ? <ActivityIndicator color="#FFF" size="small" />
                                : <Ionicons name="share-outline" size={18} color="#FFF" />
                            }
                        </TouchableOpacity>
                        <ProfileMenu />
                    </View>
                }
            />

            {/* ── TAB SWITCHER ────────────────────────────────────────────── */}
            <View style={[s.tabBar, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
                {TABS.map((tab) => {
                    const active = activeTab === tab;
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[s.tabBtn, active && s.tabBtnActive]}
                            onPress={() => setActiveTab(tab)}
                            activeOpacity={0.8}
                        >
                            <Text style={[s.tabText, { color: active ? '#5F2EEA' : (isDark ? '#94A3B8' : '#64748B') }]}>
                                {tab}
                            </Text>
                            {active && <View style={s.tabUnderline} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} colors={['#5F2EEA']} />}
            >

                {/* ══════════════════ SUMMARY TAB ══════════════════ */}
                {activeTab === 'Summary' && (
                    <>
                        {/* KPI Grid */}
                        <Text style={[s.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>KEY METRICS THIS MONTH</Text>
                        <View style={s.kpiGrid}>
                            <StatCell icon="cash-sharp" label="Collected" value={fmt(totalRent)} iconBg="#ECFDF5" iconColor="#059669" dark={isDark} />
                            <StatCell icon="time-sharp" label="Pending" value={fmt(pending)} iconBg="#FEF3C7" iconColor="#D97706" dark={isDark} />
                            <StatCell icon="trending-down-sharp" label="Expenses" value={fmt(totalExpenses)} iconBg="#FEE2E2" iconColor="#EF4444" dark={isDark} />
                            <StatCell icon="stats-chart-sharp" label="Net Profit" value={fmt(netProfit)} iconBg="#EDE9FE" iconColor="#7C3AED" dark={isDark} />
                        </View>

                        {/* Progress section */}
                        <View style={[s.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <View style={s.cardHeader}>
                                <Ionicons name="analytics" size={15} color="#5F2EEA" />
                                <Text style={[s.cardTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Occupancy & Collection Rate</Text>
                            </View>
                            <ProgressRow label={`Occupancy  (${occupiedBeds}/${totalBeds} beds)`} value={occupiedBeds} total={totalBeds} color="#7C3AED" />
                            <ProgressRow label={`Collection  (${fmt(totalRent)} / ${fmt(totalDue)})`} value={totalRent} total={totalDue} color="#5F2EEA" />
                        </View>

                        {/* Revenue trend mini table */}
                        {trend.length > 0 && (
                            <View style={[s.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                <View style={s.cardHeader}>
                                    <Ionicons name="bar-chart-sharp" size={15} color="#5F2EEA" />
                                    <Text style={[s.cardTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Monthly Revenue Trend</Text>
                                </View>
                                <View style={s.trendTable}>
                                    <View style={[s.trendHeader, { borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                        <Text style={[s.trendHCol, { flex: 1.5 }]}>MONTH</Text>
                                        <Text style={s.trendHCol}>INCOME</Text>
                                        <Text style={s.trendHCol}>EXPENSE</Text>
                                        <Text style={s.trendHCol}>NET</Text>
                                    </View>
                                    {trend.map((t: any, i: number) => {
                                        const net = (t.income || 0) - (t.expenses || 0);
                                        const isCurrent = i === trend.length - 1;
                                        return (
                                            <View key={i} style={[s.trendRow, isCurrent && { backgroundColor: isDark ? '#0F2027' : '#F0FDFA' }]}>
                                                <Text style={[s.trendLabel, { flex: 1.5, color: isDark ? '#E2E8F0' : '#334155', fontWeight: isCurrent ? '800' : '500' }]}>
                                                    {t.monthLabel || t.month}
                                                </Text>
                                                <Text style={[s.trendCell, { color: '#059669' }]}>{fmt(t.income || 0)}</Text>
                                                <Text style={[s.trendCell, { color: '#EF4444' }]}>{fmt(t.expenses || 0)}</Text>
                                                <Text style={[s.trendCell, { color: net >= 0 ? '#059669' : '#EF4444', fontWeight: '700' }]}>{fmt(net)}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </>
                )}

                {/* ══════════════════ TENANTS TAB ══════════════════ */}
                {activeTab === 'Tenants' && (
                    <>
                        {/* Tenant stats */}
                        <Text style={[s.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>OCCUPANCY BREAKDOWN</Text>
                        <View style={s.kpiGrid}>
                            <StatCell icon="people-sharp" label="Active" value={stats?.occupiedBeds || 0} iconBg="#EDE9FE" iconColor="#7C3AED" dark={isDark} />
                            <StatCell icon="bed-sharp" label="Vacant" value={(stats?.totalBeds || 0) - (stats?.occupiedBeds || 0)} iconBg="#DCFCE7" iconColor="#16A34A" dark={isDark} />
                            <StatCell icon="calendar-sharp" label="Pre-booked" value={stats?.prebookingsCount || 0} iconBg="#FEF9C3" iconColor="#CA8A04" dark={isDark} />
                            <StatCell icon="exit-sharp" label="Left" value={stats?.leftTenants || stats?.vacatedStudents || 0} iconBg="#FEE2E2" iconColor="#DC2626" dark={isDark} />
                        </View>

                        {/* Top defaulters */}
                        {defaulters.length > 0 && (
                            <View style={[s.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                <View style={s.cardHeader}>
                                    <Ionicons name="alert-circle-sharp" size={15} color="#EF4444" />
                                    <Text style={[s.cardTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Top Rent Defaulters</Text>
                                </View>
                                {defaulters.map((d, i) => {
                                    const colors = ['#EF4444', '#F97316', '#EAB308', '#7C3AED', '#64748B'];
                                    return (
                                        <DefaulterRow
                                            key={d.id}
                                            rank={i + 1}
                                            name={d.name}
                                            amount={d.amount}
                                            days={d.days}
                                            color={colors[i] || '#64748B'}
                                        />
                                    );
                                })}
                            </View>
                        )}

                        {defaulters.length === 0 && (
                            <View style={s.emptyBlock}>
                                <Text style={s.emptyEmoji}>🎉</Text>
                                <Text style={[s.emptyText, { color: isDark ? '#94A3B8' : '#64748B' }]}>No pending rent dues!</Text>
                            </View>
                        )}
                    </>
                )}

                {/* ══════════════════ FINANCE TAB ══════════════════ */}
                {activeTab === 'Finance' && (
                    <>
                        <Text style={[s.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>INCOME vs EXPENSES</Text>

                        {/* P&L summary row */}
                        <View style={[s.plRow, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <View style={s.plItem}>
                                <View style={[s.plDot, { backgroundColor: '#059669' }]} />
                                <View>
                                    <Text style={[s.plLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Income</Text>
                                    <Text style={[s.plVal, { color: '#059669' }]}>{fmt(totalRent)}</Text>
                                </View>
                            </View>
                            <View style={[s.plDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                            <View style={s.plItem}>
                                <View style={[s.plDot, { backgroundColor: '#EF4444' }]} />
                                <View>
                                    <Text style={[s.plLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Expenses</Text>
                                    <Text style={[s.plVal, { color: '#EF4444' }]}>{fmt(totalExpenses)}</Text>
                                </View>
                            </View>
                            <View style={[s.plDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                            <View style={s.plItem}>
                                <View style={[s.plDot, { backgroundColor: netProfit >= 0 ? '#7C3AED' : '#F97316' }]} />
                                <View>
                                    <Text style={[s.plLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Net</Text>
                                    <Text style={[s.plVal, { color: netProfit >= 0 ? '#7C3AED' : '#F97316' }]}>{fmt(netProfit)}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Expense list */}
                        {expenses.length > 0 ? (
                            <View style={[s.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                <View style={s.cardHeader}>
                                    <Ionicons name="receipt-sharp" size={15} color="#EF4444" />
                                    <Text style={[s.cardTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Expense Ledger</Text>
                                </View>
                                {expenses.slice(0, 10).map((e: any, i: number) => (
                                    <View key={i} style={[s.expRow, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                        <View style={[s.expDot, { backgroundColor: '#FEE2E2' }]}>
                                            <Ionicons name="card-sharp" size={13} color="#EF4444" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.expTitle, { color: isDark ? '#E2E8F0' : '#0F172A' }]} numberOfLines={1}>
                                                {e.description || e.category || 'Expense'}
                                            </Text>
                                            <Text style={[s.expDate, { color: isDark ? '#94A3B8' : '#94A3B8' }]}>
                                                {e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : ''}
                                            </Text>
                                        </View>
                                        <Text style={[s.expAmt, { color: '#EF4444' }]}>-{fmt(Number(e.amount) || 0)}</Text>
                                    </View>
                                ))}
                                {expenses.length > 10 && (
                                    <TouchableOpacity style={s.viewMoreBtn} onPress={() => navigation.navigate('Expenses')} activeOpacity={0.7}>
                                        <Text style={s.viewMoreText}>View All {expenses.length} Expenses →</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View style={s.emptyBlock}>
                                <Text style={s.emptyEmoji}>💰</Text>
                                <Text style={[s.emptyText, { color: isDark ? '#94A3B8' : '#64748B' }]}>No expense records found</Text>
                            </View>
                        )}


                    </>
                )}

            </ScrollView>

            {/* ── EXPORT OPTIONS SHEET ─────────────────────────────────────── */}
            <Modal
                visible={exportModal}
                transparent
                animationType="slide"
                onRequestClose={() => setExportModal(false)}
            >
                <TouchableOpacity
                    style={s.sheetBackdrop}
                    activeOpacity={1}
                    onPress={() => setExportModal(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                        <View style={s.sheetHandle} />
                        <Text style={[s.sheetTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Export Report</Text>
                        <Text style={[s.sheetSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                            {periodLabel} · {user?.hostel_name || 'My Hostel'}
                        </Text>



                        {/* Excel */}
                        <TouchableOpacity
                            style={[s.sheetOption, { borderColor: isDark ? '#334155' : '#ECECF5' }]}
                            onPress={handleExportExcel}
                            activeOpacity={0.8}
                        >
                            <View style={[s.sheetIcon, { backgroundColor: '#00875A18' }]}>
                                <Ionicons name="grid" size={22} color="#00875A" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.sheetOptTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Download Excel</Text>
                                <Text style={[s.sheetOptSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>Full transaction spreadsheet (.xlsx)</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#CBD5E1'} />
                        </TouchableOpacity>

                        {/* Email to my account */}
                        <TouchableOpacity
                            style={[s.sheetOption, { borderColor: isDark ? '#334155' : '#ECECF5' }]}
                            onPress={handleEmailExcel}
                            activeOpacity={0.8}
                        >
                            <View style={[s.sheetIcon, { backgroundColor: theme.primary + '18' }]}>
                                <Ionicons name="mail" size={22} color={theme.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.sheetOptTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Email to my account</Text>
                                <Text style={[s.sheetOptSub, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                                    Send Excel to {user?.email || 'your email'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#CBD5E1'} />
                        </TouchableOpacity>

                        <View style={s.sheetNote}>
                            <Ionicons name="information-circle-outline" size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                            <Text style={[s.sheetNoteText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                                Tip: after a download, tap “Mail” in the share sheet to send it to anyone. “Email to my account” sends it straight to your registered email.
                            </Text>
                        </View>

                        <TouchableOpacity style={s.sheetCancel} onPress={() => setExportModal(false)} activeOpacity={0.7}>
                            <Text style={[s.sheetCancelText, { color: theme.primary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1 },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        paddingHorizontal: 16,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        position: 'relative',
    },
    tabBtnActive: {},
    tabText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    tabUnderline: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        width: '60%',
        backgroundColor: '#5F2EEA',
        borderRadius: 2,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 10,
        marginTop: 4,
    },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 14,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 14,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    exportBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(20,184,166,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerExportBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Trend table
    trendTable: {},
    trendHeader: {
        flexDirection: 'row',
        paddingBottom: 8,
        marginBottom: 4,
        borderBottomWidth: 1,
    },
    trendHCol: {
        flex: 1,
        fontSize: 9,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.5,
        textAlign: 'right',
    },
    trendRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderRadius: 8,
        paddingHorizontal: 4,
    },
    trendLabel: {
        fontSize: 12,
    },
    trendCell: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'right',
    },
    // P&L row
    plRow: {
        flexDirection: 'row',
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 14,
        alignItems: 'center',
    },
    plItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    plDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    plLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    plVal: {
        fontSize: 15,
        fontWeight: '800',
        marginTop: 2,
    },
    plDivider: {
        width: 1,
        height: 40,
        marginHorizontal: 8,
    },
    // Expense rows
    expRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        gap: 10,
    },
    expDot: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expTitle: {
        fontSize: 13,
        fontWeight: '600',
    },
    expDate: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    expAmt: {
        fontSize: 13,
        fontWeight: '800',
    },
    viewMoreBtn: {
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 4,
    },
    viewMoreText: {
        fontSize: 13,
        color: '#5F2EEA',
        fontWeight: '700',
    },
    // Export banner
    exportBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#5F2EEA',
        borderRadius: 16,
        padding: 18,
        marginTop: 6,
        elevation: 4,
        shadowColor: '#5F2EEA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    exportBannerTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    exportBannerSub: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '500',
    },
    emptyBlock: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '600',
    },
    // ── Export bottom sheet ──────────────────────────────────────────────────
    sheetBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 28,
    },
    sheetHandle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#CBD5E1',
        marginBottom: 16,
    },
    sheetTitle: { fontSize: 18, fontWeight: '800' },
    sheetSub: { fontSize: 12.5, fontWeight: '600', marginTop: 3, marginBottom: 16 },
    sheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
    },
    sheetIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetOptTitle: { fontSize: 14.5, fontWeight: '800' },
    sheetOptSub: { fontSize: 11.5, fontWeight: '500', marginTop: 2 },
    sheetNote: {
        flexDirection: 'row',
        gap: 7,
        alignItems: 'flex-start',
        marginTop: 6,
        marginBottom: 14,
        paddingHorizontal: 4,
    },
    sheetNoteText: { flex: 1, fontSize: 11.5, fontWeight: '500', lineHeight: 16 },
    sheetCancel: { alignItems: 'center', paddingVertical: 12 },
    sheetCancelText: { fontSize: 15, fontWeight: '800' },
});

// ── Sub-component styles ─────────────────────────────────────────────────────
const sc = StyleSheet.create({
    cell: {
        flex: 1,
        minWidth: '45%',
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        gap: 6,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    cellValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    cellLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
});

const pr = StyleSheet.create({
    row: { marginBottom: 14 },
    top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    label: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    val: { fontSize: 12, fontWeight: '800' },
    track: { height: 7, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4 },
});

const dr = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 10,
    },
    rank: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankNum: {
        fontSize: 12,
        fontWeight: '800',
    },
    name: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
    },
    days: {
        fontSize: 11,
        fontWeight: '500',
        color: '#94A3B8',
        marginTop: 2,
    },
    amt: {
        fontSize: 14,
        fontWeight: '800',
    },
});
