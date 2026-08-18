import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, ActivityIndicator, Dimensions, Linking, Modal, Platform, Animated, RefreshControl,
    TextInput
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Download, X, Mail, FileSpreadsheet, Send } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toLocalDateStr as toLocalDateString } from '../utils/dateUtils';
import { AppHeader } from '../components/AppHeader';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SuccessModal } from '../components/SuccessModal';
import { useToast } from '../context/ToastContext';
import { downloadAndSaveFile } from '../utils/fileDownloader';
import { FullScreenLoader } from '../components/FullScreenLoader';

import { CustomMonthYearPicker } from '../components/ui/pickers/CustomMonthYearPicker';
import { CustomDateRangePicker } from '../components/ui/pickers/CustomDateRangePicker';
import { ModalSheet } from '../components/FormComponents';

const { width, height } = Dimensions.get('window');
type Period = 'day' | 'week' | 'month';

// toLocalDateString is now imported from utils/dateUtils as an alias.

function getWeekRangeLabel(start: Date, end: Date): string {
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `${fmt(start)} - ${fmt(end)}`;
}

function getDateLabel(period: Period, date: Date): string {
    if (period === 'day') {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        const dateStr = date.toDateString();
        if (dateStr === today.toDateString()) {
            return `Today: ${date.getDate()} ${date.toLocaleDateString('en-IN', { month: 'long' })}`;
        }
        if (dateStr === yesterday.toDateString()) {
            return `Yesterday: ${date.getDate()} ${date.toLocaleDateString('en-IN', { month: 'long' })}`;
        }
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (period === 'week') {
        const start = new Date(date);
        const day = start.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Align to Monday
        start.setDate(start.getDate() + diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return getWeekRangeLabel(start, end);
    }
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function IncomeDetailsScreen() {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { showError, showSuccess, showApiError } = useToast();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const initialPeriod: Period = route.params?.period || 'month';

    const [period, setPeriod] = useState<Period>(initialPeriod);
    const [refDate, setRefDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [visibleCount, setVisibleCount] = useState(10);

    const [showWeekSelectorModal, setShowWeekSelectorModal] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'day' | 'week'>('day');
    const [customRangeStart, setCustomRangeStart] = useState<Date | null>(null);
    const [customRangeEnd, setCustomRangeEnd] = useState<Date | null>(null);

    // Export Modal states
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportRange, setExportRange] = useState<'day' | 'week' | 'month'>('month');
    const [recipientEmail, setRecipientEmail] = useState(user?.email || '');
    const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [exportStart, setExportStart] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    });
    const [exportEnd, setExportEnd] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);
    const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
    const [isEndDatePickerVisible, setEndDatePickerVisible] = useState(false);
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

    // Keep recipient email in sync when user loads
    useEffect(() => {
        if (user?.email && !recipientEmail) {
            setRecipientEmail(user.email);
        }
    }, [user?.email]);

    const openExportModal = () => {
        setExportRange(period);
        setRecipientEmail(user?.email || '');
        setExportMonth(toLocalDateString(refDate).slice(0, 7));
        setShowExportModal(true);
    };
    
    // Bottom Sheet Select Modal state
    const [showSelectorModal, setShowSelectorModal] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [downloadedFileUri, setDownloadedFileUri] = useState<string | null>(null);


    const [avgModalVisible, setAvgModalVisible] = useState(false);
    const [scaleAnim] = useState(new Animated.Value(0));

    const openAvgModal = () => {
        setAvgModalVisible(true);
        scaleAnim.setValue(0);
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const closeAvgModal = () => {
        Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setAvgModalVisible(false);
        });
    };

    const handleDownloadExcel = async () => {
        setIsExporting(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                showError('Authentication token not found. Please log in again.');
                return;
            }

            const todayStr = toLocalDateString(refDate);
            const currentMonthStr = exportMonth || todayStr.slice(0, 7);
            const baseURL = (api.defaults.baseURL || 'http://143.244.131.69:8081/api').replace(/\/$/, '');

            let queryParams = `token=${encodeURIComponent(token)}`;
            let filename = `Earnings_Report_${exportRange}_${todayStr}.xlsx`;

            if (exportRange === 'day') {
                queryParams += `&type=day&date=${todayStr}&month=${currentMonthStr}`;
            } else if (exportRange === 'week') {
                queryParams += `&type=week&date=${todayStr}&month=${currentMonthStr}`;
            } else {
                queryParams += `&month=${currentMonthStr}`;
                filename = `Earnings_Report_Month_${currentMonthStr}.xlsx`;
            }

            const exportUrl = `${baseURL}/income/export?${queryParams}`;

            setShowExportModal(false);
            await downloadAndSaveFile(exportUrl, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            showSuccess('Excel report downloaded successfully!');
        } catch (error: any) {
            console.error(error);
            showApiError(error, 'Failed to export earnings report');
        } finally {
            setIsExporting(false);
        }
    };

    const handleEmailReport = async () => {
        const target = recipientEmail.trim();
        if (!target) {
            showError('Please enter a valid recipient email address.');
            return;
        }

        setIsSendingEmail(true);
        try {
            const todayStr = toLocalDateString(refDate);
            const currentMonthStr = exportMonth || todayStr.slice(0, 7);

            // Always include month so legacy/current backends both accept it
            const payload: any = {
                email: target,
                recipientEmail: target,
                month: currentMonthStr,
                type: exportRange,
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

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        setVisibleCount(10);
        try {
            const params: Record<string, any> = {};
            if (customRangeStart && customRangeEnd) {
                params.startDate = toLocalDateString(customRangeStart);
                params.endDate = toLocalDateString(customRangeEnd);
            } else {
                params.type = period;
                params.date = toLocalDateString(refDate);
            }
            const res = await api.get('/income/analytics', {
                params,
                timeout: 15000,
            });

            if (res.data?.success) {
                setData(res.data.data ?? null);
            } else {
                setData(null);
                setError(res.data?.message || 'No data returned from server.');
            }
        } catch (e: any) {
            console.log(e);
            setData(null);
            if (e?.code === 'ECONNABORTED') {
                setError('Request timed out. Check your connection.');
            } else {
                setError('Failed to load data. Tap to retry.');
            }
        } finally {
            setLoading(false);
        }
    }, [period, refDate, customRangeStart, customRangeEnd]);

    useEffect(() => { load(); }, [load]);

    const handleConfirmMonth = (date: Date) => {
        setCustomRangeStart(null);
        setCustomRangeEnd(null);
        setPeriod('month');
        setRefDate(date);
        setShowMonthPicker(false);
    };

    const handleConfirmCustomRange = (start: Date, end: Date) => {
        setCustomRangeStart(start);
        setCustomRangeEnd(end);
        setPeriod('month');
        setShowCustomPicker(false);
    };

    const shiftDate = (dir: -1 | 1) => {
        const d = new Date(refDate);
        if (period === 'day') d.setDate(d.getDate() + dir);
        if (period === 'week') d.setDate(d.getDate() + dir * 7);
        if (period === 'month') d.setMonth(d.getMonth() + dir);
        setRefDate(new Date(d));
    };

    const canGoForward = (): boolean => {
        const today = new Date();
        if (period === 'day') {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const refStart = new Date(refDate);
            refStart.setHours(0, 0, 0, 0);
            return refStart < todayStart;
        }
        if (period === 'week') {
            const thisWeekMonday = new Date();
            const d = thisWeekMonday.getDay();
            thisWeekMonday.setDate(thisWeekMonday.getDate() - (d === 0 ? 6 : d - 1));
            thisWeekMonday.setHours(0, 0, 0, 0);
            const refMonday = new Date(refDate);
            const rd = refMonday.getDay();
            refMonday.setDate(refMonday.getDate() - (rd === 0 ? 6 : rd - 1));
            refMonday.setHours(0, 0, 0, 0);
            return refMonday < thisWeekMonday;
        }
        return !(refDate.getFullYear() === today.getFullYear() && refDate.getMonth() === today.getMonth());
    };

    const transactionsList = data?.transactions ?? [];
    const allTransactions = [...transactionsList].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Filter transactions into separate categories
    const rentTransactions = transactionsList.filter((t: any) => t.type === 'Rent');
    const guestTransactions = transactionsList.filter((t: any) => t.type === 'Guest');
    const otherTransactions = transactionsList.filter((t: any) => t.type === 'Other');
    const admissionTransactions = transactionsList.filter((t: any) => t.type === 'Admission');

    const total = transactionsList.reduce((sum: number, t: any) => sum + t.amount, 0);
    const rentTotal = rentTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    const guestTotal = guestTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    const otherTotal = otherTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    const admissionTotal = admissionTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalPaymentsCount = transactionsList.length;
    const averagePayment = totalPaymentsCount > 0 ? Math.round(total / totalPaymentsCount) : 0;

    // Calculate bar chart data dynamically based on All Collections
    const getWeekBars = () => {
        const graph = [];
        const refMonday = new Date(refDate);
        const rd = refMonday.getDay();
        refMonday.setDate(refMonday.getDate() - (rd === 0 ? 6 : rd - 1));
        refMonday.setHours(0, 0, 0, 0);
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 0; i < 7; i++) {
            const d = new Date(refMonday);
            d.setDate(refMonday.getDate() + i);
            const ds = toLocalDateString(d);
            const val = transactionsList
                .filter((t: any) => t.date === ds)
                .reduce((s: number, t: any) => s + t.amount, 0);
            graph.push({ label: days[d.getDay()], value: val });
        }
        return graph;
    };

    const getMonthBars = () => {
        const graph = [];
        for (let i = 0; i < 4; i++) {
            const val = transactionsList.filter((t: any) => {
                let dNum = 1;
                if (typeof t.date === 'string' && t.date) {
                    dNum = parseInt(t.date.split('-')[2], 10);
                }
                if (isNaN(dNum)) return false;
                if (i === 3) {
                    return dNum > 21;
                }
                return dNum > i * 7 && dNum <= (i + 1) * 7;
            }).reduce((s: number, t: any) => s + t.amount, 0);
            graph.push({ label: `Week ${i + 1}`, value: val });
        }
        return graph;
    };

    const bars: { label: string; value: number }[] = period === 'week' ? getWeekBars() : getMonthBars();

    // Helper lists for Bottom Sheet Selectors
    const getMonthsList = () => {
        const list = [];
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            list.push(d);
        }
        return list;
    };

    const getWeekRanges = () => {
        const ranges = [];
        const today = new Date();
        const day = today.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const thisMonday = new Date(today);
        thisMonday.setDate(today.getDate() + diff);

        for (let i = 0; i < 8; i++) {
            const start = new Date(thisMonday);
            start.setDate(thisMonday.getDate() - i * 7);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            ranges.push({ start, end });
        }
        return ranges;
    };

    const isCurrentMonth = (d: Date) => {
        const today = new Date();
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    };

    const isSelectedMonth = (d: Date) => {
        return d.getFullYear() === refDate.getFullYear() && d.getMonth() === refDate.getMonth();
    };

    const isSelectedWeek = (wStart: Date, wEnd: Date) => {
        const refMonday = new Date(refDate);
        const rd = refMonday.getDay();
        refMonday.setDate(refMonday.getDate() - (rd === 0 ? 6 : rd - 1));
        refMonday.setHours(0,0,0,0);

        const targetMonday = new Date(wStart);
        targetMonday.setHours(0,0,0,0);

        return refMonday.getTime() === targetMonday.getTime();
    };

    const isCurrentWeek = (wStart: Date) => {
        const today = new Date();
        const day = today.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const thisMonday = new Date(today);
        thisMonday.setDate(today.getDate() + diff);
        thisMonday.setHours(0,0,0,0);

        const targetMonday = new Date(wStart);
        targetMonday.setHours(0,0,0,0);

        return thisMonday.getTime() === targetMonday.getTime();
    };

    const getBarChartLabel = (period: Period, label: string, index: number): string => {
        if (period === 'month') {
            const labels = ["1", "2-8", "9-15", "16-22", "23-28"];
            return labels[index] || label;
        }
        if (period === 'week') {
            const refMonday = new Date(refDate);
            const rd = refMonday.getDay();
            refMonday.setDate(refMonday.getDate() - (rd === 0 ? 6 : rd - 1));
            
            const d = new Date(refMonday);
            d.setDate(refMonday.getDate() + index);
            return String(d.getDate());
        }
        return label;
    };

    const getPeriodLabel = () => {
        if (customRangeStart && customRangeEnd) {
            return `Custom: ${customRangeStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${customRangeEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        }
        if (period === 'day') {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            if (refDate.toDateString() === today.toDateString()) {
                return `Today: ${refDate.getDate()} ${refDate.toLocaleDateString('en-IN', { month: 'short' })}`;
            }
            if (refDate.toDateString() === yesterday.toDateString()) {
                return `Yesterday: ${refDate.getDate()} ${refDate.toLocaleDateString('en-IN', { month: 'short' })}`;
            }
            return refDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        if (period === 'week') {
            const start = new Date(refDate);
            const day = start.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            start.setDate(start.getDate() + diff);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            
            const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            return `${fmt(start)} - ${fmt(end)}`;
        }
        return refDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    };

    const renderBarChart = () => {
        if (period === 'day' || bars.length === 0 || total === 0) return null;
        
        const maxVal = Math.max(...bars.map(b => b.value), 1);
        const maxValIndex = bars.findIndex(b => b.value === maxVal);
        const CHART_H = 100;

        return (
            <View style={s.chartContainer}>
                <View style={s.chartTitleRow}>
                    <Text style={s.chartTitle}>{refDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
                </View>
                
                <View style={s.chartPlotArea}>
                    <View style={s.chartDashedLine} />
                    
                    <View style={s.barsRow}>
                        {bars.map((b, i) => {
                            const barHeight = Math.max((b.value / maxVal) * CHART_H, b.value > 0 ? 8 : 4);
                            const isHighest = i === maxValIndex && b.value > 0;
                            const label = getBarChartLabel(period, b.label, i);

                            return (
                                <View key={i} style={s.barColumn}>
                                    {b.value > 0 && (
                                        <Text style={[s.barValueLabel, isHighest && s.barValueLabelHighest]}>
                                            ₹{b.value >= 10000 ? `${(b.value / 1000).toFixed(1)}k` : Math.round(b.value).toLocaleString('en-IN')}
                                        </Text>
                                    )}
                                    <View style={[
                                        s.bar,
                                        {
                                            height: barHeight,
                                            backgroundColor: isHighest ? theme.primary : b.value > 0 ? '#64748B' : '#E2E8F0',
                                        }
                                    ]} />
                                    <Text style={[s.barLabel, isHighest && s.barLabelActive]}>
                                        {label}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>
        );
    };
    const renderSkeletonRows = () => {
        return (
            <View style={[s.flatCard, { padding: 16 }]}>
                {[1, 2, 3, 4].map((key) => (
                    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: key === 4 ? 0 : 1, borderBottomColor: (theme as any).isDark ? '#334155' : '#F1F5F9', gap: 12 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: (theme as any).isDark ? '#334155' : '#E2E8F0' }} />
                        <View style={{ flex: 1, gap: 6 }}>
                            <View style={{ width: '60%', height: 14, backgroundColor: (theme as any).isDark ? '#334155' : '#E2E8F0', borderRadius: 4 }} />
                            <View style={{ width: '40%', height: 10, backgroundColor: (theme as any).isDark ? '#334155' : '#E2E8F0', borderRadius: 4 }} />
                        </View>
                        <View style={{ width: 50, height: 14, backgroundColor: (theme as any).isDark ? '#334155' : '#E2E8F0', borderRadius: 4 }} />
                    </View>
                ))}
            </View>
        );
    };

    const renderTransactionRow = (tx: any, index: number) => {
        let iconBg = '#EDE9FE'; // Admission (indigo/purple)
        let iconColor = '#7C3AED';
        let iconChar = 'A';
        let targetScreen = 'TenantTransactions';
        let targetParams: any = { studentId: tx.student_id, studentName: tx.title };

        const isDeposit = tx.type === 'Deposit' || 
                          tx.type === 'Deposit Refund' || 
                          tx.type?.toLowerCase().includes('deposit') || 
                          tx.title?.toLowerCase().includes('deposit') ||
                          tx.subtitle?.toLowerCase().includes('deposit') ||
                          tx.source?.toLowerCase().includes('deposit') || 
                          tx.source?.toLowerCase().includes('deduction');

        if (tx.type === 'Rent') {
            iconBg = '#DCFCE7'; // Rent (green)
            iconColor = '#15803D';
            iconChar = 'R';
            targetScreen = 'TenantTransactions';
            targetParams = { studentId: tx.student_id, studentName: tx.title };
        } else if (isDeposit) {
            iconBg = '#EFF6FF'; // Deposit / Refund (blue)
            iconColor = '#2563EB';
            iconChar = 'D';
            targetScreen = tx.student_id ? 'TenantTransactions' : 'Income';
            targetParams = { studentId: tx.student_id, studentName: tx.title };
        } else if (tx.type === 'Guest') {
            iconBg = '#F3E5F5'; // Guest (purple)
            iconColor = '#6B21A8';
            iconChar = 'G';
            targetScreen = 'Guests';
            targetParams = {};
        } else if (tx.type === 'Admission') {
            iconBg = '#EDE9FE';
            iconColor = '#7C3AED';
            iconChar = 'A';
            targetScreen = 'TenantTransactions';
            targetParams = { studentId: tx.student_id, studentName: tx.title };
        } else {
            iconBg = '#FFEDD5'; // Other (orange)
            iconColor = '#C2410C';
            iconChar = 'O';
            targetScreen = 'Income'; 
            targetParams = {};
        }

        const displaySubtitle = isDeposit ? (tx.subtitle || 'Deposit / Settlement') : (tx.subtitle || tx.type);

        return (
            <TouchableOpacity
                key={tx.id ?? index}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    marginBottom: 10,
                    backgroundColor: theme.cardBg,
                    borderColor: (theme as any).isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                    shadowColor: (theme as any).isDark ? '#000' : '#475569',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 2,
                }}
                onPress={() => {
                    if (targetScreen === 'TenantTransactions' && !tx.student_id) return;
                    navigation.navigate(targetScreen as any, targetParams);
                }}
                activeOpacity={0.7}
            >
                <View style={[s.avatarCircle, { backgroundColor: iconBg }]}>
                    <Text style={[s.avatarText, { color: iconColor }]}>{iconChar}</Text>
                </View>
                
                <View style={s.txDetails}>
                    <Text style={[s.txTitleText, { color: theme.textPrimary }]} numberOfLines={1}>
                        {tx.title}
                    </Text>
                    <Text style={[s.txSubText, { color: theme.textSecondary }]}>
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {displaySubtitle}
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[s.txAmountText, { color: theme.textPrimary }]}>
                        ₹{tx.amount.toLocaleString('en-IN')}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={s.root}>
            <FullScreenLoader visible={isExporting} />
            <StatusBar barStyle="light-content" />

            <AppHeader
                title="Earnings"
                rightComponent={
                    <TouchableOpacity 
                        onPress={openExportModal} 
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: 'rgba(255, 255, 255, 0.18)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.25)',
                        }}
                        activeOpacity={0.75}
                        accessibilityLabel="Export Earnings Report"
                    >
                        {isExporting ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Download size={20} color="#FFF" />
                        )}
                    </TouchableOpacity>
                }
            >
                {/* Outlined Period tab selectors */}
                <View style={s.tabBarContainer}>
                    {(['day', 'week', 'month'] as const).map(p => (
                        <TouchableOpacity
                            key={p}
                            style={[s.tabButton, period === p && s.tabButtonActive]}
                            onPress={() => {
                                if (period !== p) {
                                    setData(null);
                                    setError(null);
                                    setPeriod(p);
                                    setCustomRangeStart(null);
                                    setCustomRangeEnd(null);
                                }
                            }}
                        >
                            <Text style={[s.tabButtonText, period === p && s.tabButtonTextActive]}>
                                {p === 'day' ? 'Day' : p === 'week' ? 'Week' : 'Month'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Direct Filters based on active Tab */}
                {period === 'month' ? (
                    <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 10, marginBottom: 4 }}>
                        <TouchableOpacity style={s.topFilterBtn} onPress={() => setShowMonthPicker(true)} activeOpacity={0.8}>
                            <Ionicons name="calendar-outline" size={14} color="#FFF" />
                            <Text style={s.topFilterTxt}>{getPeriodLabel()}</Text>
                            <Ionicons name="chevron-down" size={12} color="#FFF" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>

                        <TouchableOpacity style={s.topFilterBtn} onPress={() => setShowCustomPicker(true)} activeOpacity={0.8}>
                            <Ionicons name="swap-horizontal-outline" size={14} color="#FFF" />
                            <Text style={s.topFilterTxt}>{customRangeStart && customRangeEnd ? 'Custom Active' : 'Custom Range'}</Text>
                            <Ionicons name="chevron-down" size={12} color="#FFF" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ marginTop: 10, marginBottom: 4, alignItems: 'center' }}>
                        <TouchableOpacity 
                            style={s.topFilterBtn} 
                            onPress={() => {
                                if (period === 'day') {
                                    setDatePickerMode('day');
                                    setDatePickerVisible(true);
                                } else if (period === 'week') {
                                    setShowWeekSelectorModal(true);
                                }
                            }} 
                            activeOpacity={0.8}
                        >
                            <Ionicons name="calendar-outline" size={14} color="#FFF" />
                            <Text style={s.topFilterTxt}>{getPeriodLabel()}</Text>
                            <Ionicons name="chevron-down" size={12} color="#FFF" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                    </View>
                )}
            </AppHeader>

            {/* BODY */}
            <ScrollView 
                contentContainerStyle={s.scrollContent} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={load}
                        colors={[theme.primary]}
                        tintColor={theme.primary}
                    />
                }
            >
                
                {/* DATE PERIOD NAV CARD */}
                <View style={s.periodNavCard}>
                    <View style={{ marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {customRangeStart && customRangeEnd ? 'Custom Period Revenue' : `${period.toUpperCase()}LY REVENUE`}
                        </Text>
                    </View>

                    <View style={s.amountNavRow}>
                        <TouchableOpacity 
                            onPress={() => shiftDate(-1)} 
                            style={[s.navArrowBtn, (customRangeStart && customRangeEnd) && { opacity: 0.25 }]}
                            disabled={!!(customRangeStart && customRangeEnd)}
                        >
                            <Ionicons name="chevron-back" size={24} color="#000000" />
                        </TouchableOpacity>

                        {loading ? (
                            <ActivityIndicator color="#000000" size="small" style={{ marginHorizontal: 20 }} />
                        ) : (
                            <Text style={s.bigAmountText}>₹{total.toLocaleString('en-IN')}</Text>
                        )}

                        <TouchableOpacity
                            onPress={() => { if (canGoForward()) shiftDate(1); }}
                            style={[s.navArrowBtn, (!canGoForward() || (customRangeStart && customRangeEnd)) && { opacity: 0.25 }]}
                            disabled={!canGoForward() || !!(customRangeStart && customRangeEnd)}
                        >
                            <Ionicons name="chevron-forward" size={24} color="#000000" />
                        </TouchableOpacity>
                    </View>
                </View>

                {error && (
                    <TouchableOpacity style={s.retryBtn} onPress={load}>
                        <Text style={s.retryText}>{error} Tap to retry.</Text>
                    </TouchableOpacity>
                )}

                {/* GRAPH CONTAINER */}
                {!loading && renderBarChart()}

                {/* STATISTICS GRID */}
                {!loading && (
                    <View style={s.statsContainer}>
                        <View style={s.statsCol}>
                            <Text style={s.statsNum}>{totalPaymentsCount}</Text>
                            <Text style={s.statsLbl}>Payments</Text>
                        </View>
                        <View style={s.statsDivider} />
                        <TouchableOpacity 
                            style={s.statsCol}
                            onPress={openAvgModal}
                            activeOpacity={0.7}
                        >
                            <Text style={s.statsNum}>₹{averagePayment.toLocaleString('en-IN')}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={s.statsLbl}>Avg Payment</Text>
                                <Ionicons name="help-circle-outline" size={13} color="#64748B" />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* TRANSACTION CARD CONTAINER */}
                <View style={s.cardsWrapper}>
                    {loading ? (
                        renderSkeletonRows()
                    ) : allTransactions.length > 0 ? (
                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 4 }}>
                                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary }}>Recent Transactions</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('AllTransactions', { transactions: allTransactions })}>
                                    <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 13 }}>View All</Text>
                                </TouchableOpacity>
                            </View>
                            
                            {allTransactions.slice(0, 5).map((tx, index) => renderTransactionRow(tx, index))}

                            {allTransactions.length > 5 && (
                                <TouchableOpacity 
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 14,
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        marginTop: 4,
                                        backgroundColor: theme.cardBg,
                                        borderColor: (theme as any).isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                                        shadowColor: (theme as any).isDark ? '#000' : '#475569',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 6,
                                        elevation: 2,
                                        gap: 6
                                    }}
                                    onPress={() => navigation.navigate('AllTransactions', { transactions: allTransactions })}
                                >
                                    <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 14 }}>View All Transactions ({allTransactions.length})</Text>
                                    <Ionicons name="arrow-forward" size={16} color={theme.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <View style={[s.flatCard, { padding: 30, alignItems: 'center' }]}>
                            <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>No transactions recorded for this period</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 60 }} />
            </ScrollView>

            {/* WEEK SELECTOR DRAWER MODAL */}
            <Modal
                visible={showWeekSelectorModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowWeekSelectorModal(false)}
            >
                <View style={s.bottomSheetOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setShowWeekSelectorModal(false)}
                    />
                    <View style={[s.bottomSheetContent, { backgroundColor: theme.cardBg }]}>
                        <View style={s.bottomSheetHeader}>
                            <Text style={[s.bottomSheetTitle, { color: theme.textPrimary }]}>Select week</Text>
                            <TouchableOpacity onPress={() => setShowWeekSelectorModal(false)} style={s.closeCircle}>
                                <Ionicons name="close" size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={s.bottomSheetScroll} showsVerticalScrollIndicator={false}>
                            {getWeekRanges().map((w, index) => {
                                const isCurrent = isCurrentWeek(w.start);
                                const isSelected = isSelectedWeek(w.start, w.end);
                                const label = getWeekRangeLabel(w.start, w.end);

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[s.bottomSheetItem, isSelected && s.bottomSheetItemSelected]}
                                        onPress={() => {
                                            setRefDate(w.start);
                                            setCustomRangeStart(null);
                                            setCustomRangeEnd(null);
                                            setShowWeekSelectorModal(false);
                                        }}
                                    >
                                        <Text style={[s.bottomSheetItemText, isSelected && s.bottomSheetItemTextSelected, { color: theme.textPrimary }]}>
                                            {label}
                                        </Text>
                                        {isCurrent && (
                                            <View style={[s.currentMonthBadge, { backgroundColor: theme.primary }]}>
                                                <Text style={s.currentMonthBadgeText}>This week</Text>
                                            </View>
                                        )}
                                        {isSelected && !isCurrent && (
                                            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <CustomMonthYearPicker
                visible={showMonthPicker}
                onClose={() => setShowMonthPicker(false)}
                onConfirm={handleConfirmMonth}
                initialDate={refDate}
            />

            <CustomDateRangePicker
                visible={showCustomPicker}
                onClose={() => setShowCustomPicker(false)}
                onConfirm={handleConfirmCustomRange}
                initialStart={customRangeStart || undefined}
                initialEnd={customRangeEnd || undefined}
                restrictMonth={refDate}
            />

            {/* EXPORT & EMAIL MODAL */}
            <Modal
                visible={showExportModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowExportModal(false)}
            >
                <View style={s.modalOverlay}>
                    <View style={[s.exportModalBox, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0', borderWidth: 1 }]}>
                        
                        {/* Header with Title and Close (Cross) button */}
                        <View style={s.modalHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <View style={[s.modalIconWrap, { backgroundColor: theme.primary + '18' }]}>
                                    <FileSpreadsheet color={theme.primary} size={22} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.modalTitleText, { color: theme.textPrimary }]}>Export Earnings Report</Text>
                                    <Text style={[s.modalSubtitleText, { color: theme.textSecondary }]}>
                                        Select period to download Excel spreadsheet
                                    </Text>
                                </View>
                            </View>
                            {/* Close Cross Button */}
                            <TouchableOpacity
                                onPress={() => setShowExportModal(false)}
                                style={[s.closeCrossBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                                activeOpacity={0.7}
                            >
                                <X size={18} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Period Selector Tabs */}
                        <Text style={[s.inputLabelText, { color: theme.textSecondary }]}>REPORT PERIOD</Text>
                        <View style={[s.rangeTabRow, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                            {(['day', 'week', 'month'] as const).map(r => (
                                <TouchableOpacity
                                    key={r}
                                    style={[
                                        s.rangeTabItem,
                                        exportRange === r && [s.rangeTabItemActive, { backgroundColor: theme.primary }]
                                    ]}
                                    onPress={() => setExportRange(r)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[
                                        s.rangeTabText,
                                        { color: exportRange === r ? '#FFF' : theme.textSecondary }
                                    ]}>
                                        {r === 'day' ? 'Today (Day)' : r === 'week' ? '7 Days (Week)' : 'Month'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Month Selector if Month tab is chosen */}
                        {exportRange === 'month' && (
                            <View style={{ marginBottom: 14 }}>
                                <Text style={[s.inputLabelText, { color: theme.textSecondary }]}>MONTH (YYYY-MM)</Text>
                                <TextInput
                                    style={[
                                        s.textInputField,
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

                        {/* Recipient Email Input */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={[s.inputLabelText, { color: theme.textSecondary }]}>RECIPIENT EMAIL</Text>
                            <TextInput
                                style={[
                                    s.textInputField,
                                    { color: theme.textPrimary, borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }
                                ]}
                                value={recipientEmail}
                                onChangeText={setRecipientEmail}
                                placeholder="name@example.com"
                                placeholderTextColor={theme.textSecondary}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        {/* Dual Action Buttons: Download Excel + Send to Mail */}
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                            <TouchableOpacity
                                style={[s.dualActionBtn, s.downloadExcelBtn, { flex: 1 }]}
                                onPress={handleDownloadExcel}
                                disabled={isExporting || isSendingEmail}
                                activeOpacity={0.85}
                            >
                                {isExporting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <FileSpreadsheet color="#FFF" size={16} />
                                        <Text style={[s.dualActionBtnText, { fontSize: 13 }]}>Download</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[s.dualActionBtn, { flex: 1, backgroundColor: theme.primary }]}
                                onPress={handleEmailReport}
                                disabled={isExporting || isSendingEmail}
                                activeOpacity={0.85}
                            >
                                {isSendingEmail ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Mail color="#FFF" size={16} />
                                        <Text style={[s.dualActionBtnText, { fontSize: 13 }]}>Send to Mail</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* POPUP DATE PICKERS */}
            <DateTimePickerModal
                isVisible={isStartDatePickerVisible}
                mode="date"
                date={exportStart}
                maximumDate={new Date()}
                onConfirm={(date) => {
                    setExportStart(date);
                    setStartDatePickerVisible(false);
                }}
                onCancel={() => setStartDatePickerVisible(false)}
            />
            <DateTimePickerModal
                isVisible={isEndDatePickerVisible}
                mode="date"
                date={exportEnd}
                maximumDate={new Date()}
                onConfirm={(date) => {
                    setExportEnd(date);
                    setEndDatePickerVisible(false);
                }}
                onCancel={() => setEndDatePickerVisible(false)}
            />
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={refDate}
                onConfirm={(date) => {
                    setDatePickerVisible(false);
                    setCustomRangeStart(null);
                    setCustomRangeEnd(null);
                    if (datePickerMode === 'day') {
                        setPeriod('day');
                        setRefDate(date);
                    } else {
                        setPeriod('week');
                        setRefDate(date);
                    }
                }}
                onCancel={() => setDatePickerVisible(false)}
            />

            {/* Average Payment Info Modal */}
            <Modal
                visible={avgModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={closeAvgModal}
            >
                <View style={s.modalOverlay}>
                    <Animated.View 
                        style={[
                            s.modalContent, 
                            { 
                                backgroundColor: theme.cardBg,
                                transform: [{ scale: scaleAnim }]
                            }
                        ]}
                    >
                        <View style={[s.modalHeader, { borderBottomColor: theme.background }]}>
                            <Text style={[s.modalTitle, { color: theme.textPrimary }]}>Average Payment</Text>
                            <TouchableOpacity onPress={closeAvgModal} style={s.modalCloseBtn}>
                                <Ionicons name="close" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={s.modalBody}>
                            <View style={[s.iconWrapper, { backgroundColor: theme.lightBg }]}>
                                <Ionicons name="stats-chart" size={32} color={theme.primary} />
                            </View>
                            <Text style={[s.modalDescription, { color: theme.textSecondary }]}>
                                This represents the average amount collected per payment transaction.
                            </Text>
                            
                            <View style={[s.formulaCard, { backgroundColor: theme.background }]}>
                                <Text style={[s.formulaLabel, { color: theme.textSecondary }]}>Calculation Formula:</Text>
                                <Text style={[s.formulaText, { color: theme.textPrimary }]}>
                                    Total Earnings ÷ Total Payments
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[s.modalConfirmBtn, { backgroundColor: theme.primary }]} 
                            onPress={closeAvgModal}
                        >
                            <Text style={s.modalConfirmText}>Got it</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>

        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8F7FF' },

    // ── HEADER (MATCHING APP GRADIENT) ─────────────────────────────────────
    header: {
        paddingTop: 54,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    iconBtn: {
        width: 38, height: 38,
        borderRadius: 19,
        alignItems: 'center', justifyContent: 'center',
    },
    screenTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    tabBarContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 24,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabButtonActive: {
        backgroundColor: '#FFFFFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
    },
    tabButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.85)',
    },
    tabButtonTextActive: {
        color: '#000000',
        fontWeight: '800',
    },

    // ── SCROLL CONTENT ──────────────────────────────────────────────────────
    scrollContent: {
        padding: 16,
    },

    // ── DATE PERIOD NAV CARD ────────────────────────────────────────────────
    periodNavCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        marginBottom: 16,
    },
    periodDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 10,
    },
    periodDropdownText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1E293B',
    },
    amountNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
    },
    navArrowBtn: {
        width: 36, height: 36,
        alignItems: 'center', justifyContent: 'center',
    },
    bigAmountText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: -0.5,
    },

    // ── retry button ────────────────────────────────────────────────────────
    retryBtn: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    retryText: { color: '#EF4444', fontWeight: '700' },

    // ── CUSTOM BAR CHART ───────────────────────────────────────────────────
    chartContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
    },
    chartTitleRow: {
        marginBottom: 12,
    },
    chartTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
    },
    chartPlotArea: {
        height: 140,
        justifyContent: 'flex-end',
        position: 'relative',
    },
    chartDashedLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 24,
        height: 1,
        borderStyle: 'dashed',
        borderWidth: 0.5,
        borderColor: '#CBD5E1',
    },
    barsRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 120,
    },
    barColumn: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '100%',
        flex: 1,
    },
    barValueLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748B',
        marginBottom: 4,
    },
    barValueLabelHighest: {
        color: '#000000',
        fontWeight: '900',
    },
    bar: {
        width: 18,
        borderRadius: 4,
        marginBottom: 6,
    },
    barLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        height: 14,
    },
    barLabelActive: {
        color: '#000000',
        fontWeight: '800',
    },

    // ── STATISTICS GRID ─────────────────────────────────────────────────────
    statsContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
    },
    statsCol: {
        flex: 1,
        alignItems: 'center',
    },
    statsNum: {
        fontSize: 18,
        fontWeight: '800',
        color: '#000000',
    },
    statsLbl: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
        marginTop: 2,
    },
    statsDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
    },

    // ── SEGREGATED FLAT CARDS ───────────────────────────────────────────────
    cardsWrapper: {
        gap: 16,
        marginBottom: 16,
    },
    flatCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    cardHeaderTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
    },
    cardHeaderTotal: {
        fontSize: 15,
        fontWeight: '900',
        color: '#059669',
    },
    cardBody: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    avatarCircle: {
        width: 32, height: 32,
        borderRadius: 16,
        backgroundColor: '#DBEAFE',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 10,
    },
    avatarText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#2563EB',
    },
    txDetails: {
        flex: 1,
        marginRight: 8,
        gap: 2,
    },
    txTitleText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    txSubText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94A3B8',
    },
    txAmountText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#000000',
    },
    emptyTransactionsText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
        textAlign: 'center',
        paddingVertical: 18,
    },

    // ── EXPORT BUTTON ───────────────────────────────────────────────────────
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        paddingVertical: 14,
        gap: 8,
        elevation: 2,
    },
    exportButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },

    // ── BOTTOM SHEET MODAL ─────────────────────────────────────────────────
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalDismissOverlay: {
        flex: 1,
    },
    bottomSheetContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.65,
        paddingBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 12,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.15)',
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    bottomSheetTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000000',
    },
    closeCircle: {
        width: 32, height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center', justifyContent: 'center',
    },
    bottomSheetScroll: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    bottomSheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    bottomSheetItemSelected: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 10,
        marginHorizontal: -10,
    },
    bottomSheetItemText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    bottomSheetItemTextSelected: {
        color: '#3B82F6',
        fontWeight: '800',
    },
    currentMonthBadge: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    currentMonthBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#FFFFFF',
    },

    // ── UNIFIED EXPORT MODAL STYLING ──────────────────────────────────────
    exportModalBox: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 24,
        padding: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 14,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 18,
    },
    modalIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitleText: {
        fontSize: 18,
        fontWeight: '800',
    },
    modalSubtitleText: {
        fontSize: 12,
        marginTop: 2,
    },
    closeCrossBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    inputLabelText: {
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    rangeTabRow: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 3,
        marginBottom: 14,
    },
    rangeTabItem: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    rangeTabItemActive: {
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    rangeTabText: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    textInputField: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontSize: 14,
        fontWeight: '600',
    },
    modalActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 6,
    },
    dualActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 13,
        borderRadius: 14,
    },
    downloadExcelBtn: {
        backgroundColor: '#10B981',
    },
    dualActionBtnText: {
        color: '#FFF',
        fontSize: 13.5,
        fontWeight: '800',
    },

    // ── AVERAGE PAYMENT MODAL ──
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.8)',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalBody: {
        alignItems: 'center',
        paddingVertical: 18,
    },
    iconWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    modalDescription: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        fontWeight: '500',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    formulaCard: {
        width: '100%',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    formulaLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    formulaText: {
        fontSize: 13,
        fontWeight: '800',
    },
    modalConfirmBtn: {
        borderRadius: 12,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
    },
    modalConfirmText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    topFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    topFilterTxt: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },

    modalSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 20,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 12,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.15)',
    },
    filterOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    filterOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    filterOptionText: {
        flex: 1,
    },
    filterOptionTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    filterOptionSub: {
        fontSize: 11,
        marginTop: 2,
    },
});