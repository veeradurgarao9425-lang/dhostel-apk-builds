import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, Mail, FileSpreadsheet, X, Send } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadAndSaveFile } from '../utils/fileDownloader';
import { useAuth } from '../../contexts/AuthContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { ProfileMenu } from '../components/ProfileMenu';
import { useTheme } from '../../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { FullScreenLoader } from '../components/FullScreenLoader';

export const IncomeScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { showApiError, showError, showSuccess } = useToast();
    const [search, setSearch] = useState('');
    const [incomes, setIncomes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Day' | 'Week' | 'Month'>('Day');
    const [isExporting, setIsExporting] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportRange, setExportRange] = useState<'Day' | 'Week' | 'Month'>('Day');
    const [recipientEmail, setRecipientEmail] = useState(user?.email || '');
    const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    // Keep recipient email in sync when user loads
    useEffect(() => {
        if (user?.email && !recipientEmail) {
            setRecipientEmail(user.email);
        }
    }, [user?.email]);

    // Open export modal with current active tab
    const openExportModal = () => {
        setExportRange(activeTab);
        setRecipientEmail(user?.email || '');
        setExportMonth(new Date().toISOString().slice(0, 7));
        setShowExportModal(true);
    };

    const handleEmailReport = async () => {
        const target = recipientEmail.trim();
        if (!target) {
            showError('Please enter a valid recipient email address.');
            return;
        }

        setIsSendingEmail(true);
        try {
            const todayStr = new Date().toISOString().slice(0, 10);
            const currentMonthStr = exportMonth || todayStr.slice(0, 7);

            // Always include month so legacy/current backends both accept it
            const payload: any = {
                email: target,
                recipientEmail: target,
                month: currentMonthStr,
                type: exportRange.toLowerCase(),
                date: todayStr,
            };

            const response = await api.post('/income/email-export', payload);
            if (response.data.success) {
                showSuccess(response.data.message || `Excel report sent to ${target}!`);
                setShowExportModal(false);
            } else {
                showError(response.data.error || 'Failed to send email report');
            }
        } catch (error: any) {
            console.error(error);
            showApiError(error, 'Failed to send email report');
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleDownloadExcel = async () => {
        setIsExporting(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                showError('Authentication token not found. Please log in again.');
                return;
            }

            const todayStr = new Date().toISOString().slice(0, 10);
            const currentMonthStr = exportMonth || todayStr.slice(0, 7);
            const baseURL = (api.defaults.baseURL || 'https://dark-dew-bf62.veeradurgarao840.workers.dev/api').replace(/\/$/, '');

            let queryParams = `token=${encodeURIComponent(token)}`;
            let filename = `Income_Report_${exportRange}_${todayStr}.xlsx`;

            if (exportRange === 'Day') {
                queryParams += `&type=day&date=${todayStr}&month=${currentMonthStr}`;
            } else if (exportRange === 'Week') {
                queryParams += `&type=week&date=${todayStr}&month=${currentMonthStr}`;
            } else {
                queryParams += `&month=${currentMonthStr}`;
                filename = `Income_Report_Month_${currentMonthStr}.xlsx`;
            }

            const exportUrl = `${baseURL}/income/export?${queryParams}`;

            setShowExportModal(false);
            await downloadAndSaveFile(exportUrl, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            showSuccess(`Excel report downloaded successfully!`);
        } catch (error) {
            console.error(error);
            showApiError(error, 'Failed to export income report');
        } finally {
            setIsExporting(false);
        }
    };

    const [error, setError] = useState(false);
    const fetchIncomes = async () => {
        try {
            setLoading(true);
            setError(false);
            const response = await api.get('/income');
            if (response.data.success) {
                setIncomes(response.data.data || []);
            } else {
                setError(true);
            }
        } catch (error) {
            console.error('Error fetching incomes:', error);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchIncomes);
        return unsubscribe;
    }, [navigation]);

    const totalIncome = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);
    const dObj = new Date();
    const todayStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
    const todayIncome = incomes
        .filter(inc => (inc.income_date || '').startsWith(todayStr))
        .reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);

    const todaySplit = incomes
        .filter(inc => (inc.income_date || '').startsWith(todayStr))
        .reduce((acc: any, inc) => {
            const mode = inc.payment_mode || 'Cash';
            acc[mode] = (acc[mode] || 0) + parseFloat(inc.amount);
            return acc;
        }, {});

    const filteredIncomes = incomes.filter(inc =>
        inc.source?.toLowerCase().includes(search.toLowerCase()) ||
        inc.description?.toLowerCase().includes(search.toLowerCase())
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            {(['Day', 'Week', 'Month'] as const).map(tab => (
                <TouchableOpacity
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.activeTab]}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderDayContent = () => {
        const dailyGrouped = filteredIncomes.reduce((acc: any, inc) => {
            const date = inc.income_date;
            if (!acc[date]) acc[date] = { date, total: 0, count: 0, items: [] };
            acc[date].total += parseFloat(inc.amount);
            acc[date].count += 1;
            acc[date].items.push(inc);
            return acc;
        }, {});

        const sortedDays = Object.values(dailyGrouped).sort((a: any, b: any) => b.date.localeCompare(a.date));

        return (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Today's Collection Card */}
                <View style={[styles.dailySplitCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <Text style={[styles.splitTitle, { color: theme.textSecondary }]}>Today's Collection</Text>
                    <Text style={[styles.splitAmount, { color: theme.textPrimary }]}>₹{todayIncome.toLocaleString('en-IN')}</Text>
                    <View style={styles.splitGrid}>
                        {Object.entries(todaySplit).map(([mode, amt]: any) => (
                            <View key={mode} style={[styles.splitItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                <Text style={[styles.splitMode, { color: theme.textSecondary }]}>{mode}</Text>
                                <Text style={[styles.splitVal, { color: theme.textPrimary }]}>₹{amt.toLocaleString()}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Text style={[styles.sectionHeader, { color: theme.textPrimary }]}>Recent Collections</Text>
                {sortedDays.length === 0 && (
                    <EmptyState illustration="income"
                        title="No Collections Yet"
                        subtitle="Your rent collections and payments will appear here."
                    />
                )}
                {sortedDays.map((day: any) => (
                    <TouchableOpacity
                        key={day.date}
                        style={[styles.dayGroupCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}
                        onPress={() => navigation.navigate('IncomeDetails', { date: day.date, items: day.items })}
                        activeOpacity={0.85}
                    >
                        <View style={styles.dayHeader}>
                            <View>
                                <Text style={[styles.dayText, { color: theme.textSecondary }]}>{new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                                <Text style={[styles.countText, { color: theme.textSecondary }]}>{day.count} Payments</Text>
                            </View>
                            <Text style={styles.dayTotal}>₹{day.total.toLocaleString()}</Text>
                        </View>
                        <View style={[styles.progressBar, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <View style={[styles.progressFill, { width: '100%', backgroundColor: theme.primary }]} />
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    const renderGraphPlaceholder = (title: string) => (
        <View style={styles.graphPlaceholder}>
            <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>{title} Performance</Text>
                <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>Sample preview — detailed {title.toLowerCase()}ly charts coming soon</Text>
            </View>
            <View style={[styles.mockChart, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                <LinearGradient colors={[theme.primary + '20', 'transparent']} style={styles.chartGradient}>
                    {/* Simulated Bars */}
                    <View style={styles.barsRow}>
                        {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                            <View key={i} style={[styles.bar, { height: `${h}%`, backgroundColor: theme.primary }]} />
                        ))}
                    </View>
                </LinearGradient>
            </View>
            <View style={styles.chartFooter}>
                <Text style={styles.footerText}>Trending UP this {activeTab.toLowerCase()}</Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <FullScreenLoader visible={isExporting} />
            <StatusBar barStyle="light-content" />
            <AppHeader
                title="Income"
                rightComponent={
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        {/* Single Download/Export Button */}
                        <TouchableOpacity
                            onPress={openExportModal}
                            disabled={isExporting}
                            activeOpacity={0.75}
                            style={styles.headerActionBtn}
                            accessibilityLabel="Export Income Report"
                        >
                            {isExporting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Download color="#FFF" size={19} />
                            )}
                        </TouchableOpacity>
                        <ProfileMenu />
                    </View>
                }
            >
                {renderTabs()}
            </AppHeader>

            {loading ? (
                <SkeletonList count={5} />
            ) : error ? (
                <EmptyState illustration="income" 
                    title="Failed to Load" 
                    subtitle="Something went wrong while fetching data." 
                    actionLabel="Retry" 
                    onAction={fetchIncomes} 
                />
            ) : (
                <View style={{ flex: 1 }}>
                    {activeTab === 'Day' ? renderDayContent() : renderGraphPlaceholder(activeTab)}
                </View>
            )}

            {/* Export & Email Report Modal */}
            <Modal visible={showExportModal} animationType="fade" transparent={true} onRequestClose={() => setShowExportModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1 }]}>
                        
                        {/* Header with Title and Close (Cross) button */}
                        <View style={styles.modalHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <View style={[styles.modalIconWrap, { backgroundColor: theme.primary + '18' }]}>
                                    <FileSpreadsheet color={theme.primary} size={22} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Export Income Report</Text>
                                    <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                                        Download Excel or send to email
                                    </Text>
                                </View>
                            </View>
                            {/* Close Cross Button */}
                            <TouchableOpacity
                                onPress={() => setShowExportModal(false)}
                                style={[styles.closeCrossBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                                activeOpacity={0.7}
                            >
                                <X size={18} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Period Selector Tabs */}
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>REPORT PERIOD</Text>
                        <View style={[styles.rangeTabRow, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                            {(['Day', 'Week', 'Month'] as const).map(r => (
                                <TouchableOpacity
                                    key={r}
                                    style={[
                                        styles.rangeTabItem,
                                        exportRange === r && [styles.rangeTabItemActive, { backgroundColor: theme.primary }]
                                    ]}
                                    onPress={() => setExportRange(r)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[
                                        styles.rangeTabText,
                                        { color: exportRange === r ? '#FFF' : theme.textSecondary }
                                    ]}>
                                        {r === 'Day' ? 'Today (Day)' : r === 'Week' ? '7 Days (Week)' : 'Month'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Month Selector if Month tab is chosen */}
                        {exportRange === 'Month' && (
                            <View style={{ marginBottom: 14 }}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>MONTH (YYYY-MM)</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        { color: theme.textPrimary, borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }
                                    ]}
                                    value={exportMonth}
                                    onChangeText={setExportMonth}
                                    placeholder="YYYY-MM"
                                    placeholderTextColor={theme.textSecondary}
                                    maxLength={7}
                                    autoCapitalize="none"
                                />
                            </View>
                        )}

                        {/* Recipient Email input for sending email */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>RECIPIENT EMAIL (FOR EMAIL OPTION)</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    { color: theme.textPrimary, borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }
                                ]}
                                value={recipientEmail}
                                onChangeText={setRecipientEmail}
                                placeholder="name@example.com"
                                placeholderTextColor={theme.textSecondary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Dual Action Buttons at Bottom */}
                        <View style={styles.modalActions}>
                            {/* 1. Download Excel Button */}
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.downloadBtn]}
                                onPress={handleDownloadExcel}
                                disabled={isExporting}
                                activeOpacity={0.85}
                            >
                                <FileSpreadsheet color="#FFF" size={16} />
                                <Text style={styles.actionBtnText}>Download Excel</Text>
                            </TouchableOpacity>

                            {/* 2. Send via Email Button */}
                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: theme.primary }]} 
                                onPress={handleEmailReport}
                                disabled={isSendingEmail}
                                activeOpacity={0.85}
                            >
                                {isSendingEmail ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Mail color="#FFF" size={16} />
                                        <Text style={styles.actionBtnText}>Send to Email</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerActionBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', padding: 4, borderRadius: 14, marginTop: 10, marginBottom: 10 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
    activeTab: { backgroundColor: '#FFFFFF' },
    tabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
    activeTabText: { color: '#1E293B' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, padding: 16 },
    dailySplitCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    splitTitle: { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.2, textTransform: 'uppercase' },
    splitAmount: { fontSize: 32, fontWeight: '900', color: '#1E293B', marginVertical: 6 },
    splitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    splitItem: { backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', minWidth: '47%' },
    splitMode: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
    splitVal: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginTop: 2 },
    sectionHeader: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 12, marginTop: 2 },
    dayGroupCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
    dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    dayText: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    countText: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 1 },
    dayTotal: { fontSize: 20, fontWeight: '900', color: '#10B981' },
    progressBar: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    graphPlaceholder: { padding: 20, flex: 1 },
    chartHeader: { marginBottom: 20 },
    chartTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
    chartSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 4 },
    mockChart: { height: 200, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, elevation: 3 },
    chartGradient: { flex: 1, justifyContent: 'flex-end' },
    barsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: '100%', paddingHorizontal: 10 },
    bar: { width: 15, borderRadius: 8 },
    chartFooter: { marginTop: 16, alignItems: 'center' },
    footerText: { fontSize: 14, color: '#10B981', fontWeight: '700' },
    fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, zIndex: 100 },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
    errorSub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
    retryBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, elevation: 4 },
    retryText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    modalContent: { width: '100%', maxWidth: 420, padding: 22, borderRadius: 24, elevation: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 16 },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
    modalIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    closeCrossBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    modalSubtitle: { fontSize: 12, marginTop: 2 },
    inputLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
    rangeTabRow: { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 14 },
    rangeTabItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    rangeTabItemActive: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
    rangeTabText: { fontSize: 12, fontWeight: '700' },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontWeight: '600' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 6 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 14 },
    downloadBtn: { backgroundColor: '#10B981' },
    actionBtnText: { color: '#FFF', fontSize: 13.5, fontWeight: '800' },
});

export default IncomeScreen;