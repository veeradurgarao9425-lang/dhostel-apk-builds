import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, ActivityIndicator, Dimensions, Linking, Modal, Platform, Animated, RefreshControl
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Download, X } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
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

    const [showExportModal, setShowExportModal] = useState(false);
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

    const handleMailOption = () => {
        Linking.openURL('mailto:support@dhostel.com?subject=DHostel%20Earnings%20Feedback');
    };

    const handleExport = async () => {
        if (exportStart > exportEnd) {
            showError('Start date must be before end date.');
            return;
        }

        setIsExporting(true);
        try {
            const startStr = toLocalDateString(exportStart);
            const endStr = toLocalDateString(exportEnd);
            const token = await AsyncStorage.getItem('token');

            if (!token) {
                showError('Authentication token not found. Please log in again.');
                return;
            }

            const baseURL = (api.defaults.baseURL || 'https://dhostel-backend.onrender.com/api').replace(/\/$/, '');
            const exportUrl = `${baseURL}/income/export?startDate=${startStr}&endDate=${endStr}&token=${encodeURIComponent(token)}&all=true`;

            const filename = `income_report_${startStr}_to_${endStr}.xlsx`;

            setShowExportModal(false);
            await downloadAndSaveFile(exportUrl, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } catch (error: any) {
            console.error(error);
            showApiError(error, 'Failed to export data');
        } finally {
            setIsExporting(false);
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
                    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: key === 4 ? 0 : 1, borderBottomColor: theme.isDark ? '#334155' : '#F1F5F9', gap: 12 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.isDark ? '#334155' : '#E2E8F0' }} />
                        <View style={{ flex: 1, gap: 6 }}>
                            <View style={{ width: '60%', height: 14, backgroundColor: theme.isDark ? '#334155' : '#E2E8F0', borderRadius: 4 }} />
                            <View style={{ width: '40%', height: 10, backgroundColor: theme.isDark ? '#334155' : '#E2E8F0', borderRadius: 4 }} />
                        </View>
                        <View style={{ width: 50, height: 14, backgroundColor: theme.isDark ? '#334155' : '#E2E8F0', borderRadius: 4 }} />
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

        if (tx.type === 'Rent') {
            iconBg = '#DCFCE7'; // Rent (green)
            iconColor = '#15803D';
            iconChar = 'R';
            targetScreen = 'TenantTransactions';
            targetParams = { studentId: tx.student_id, studentName: tx.title };
        } else if (tx.type === 'Guest') {
            iconBg = '#F3E5F5'; // Guest (purple)
            iconColor = '#6B21A8';
            iconChar = 'G';
            targetScreen = 'Guests';
            targetParams = {};
        } else if (tx.type === 'Other') {
            iconBg = '#FFEDD5'; // Other (orange)
            iconColor = '#C2410C';
            iconChar = 'O';
            targetScreen = 'Income'; 
            targetParams = {};
        }

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
                    borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                    shadowColor: theme.isDark ? '#000' : '#475569',
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
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {tx.subtitle || tx.type}
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
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity 
                            onPress={handleMailOption} 
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="mail-outline" size={20} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => setShowExportModal(true)} 
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Download size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
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
                                        borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                                        shadowColor: theme.isDark ? '#000' : '#475569',
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
                <View style={s.modalOverlay}>
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

            {/* DATE EXPORT MODAL */}
            <Modal
                visible={showExportModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowExportModal(false)}
            >
                <View style={s.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setShowExportModal(false)}
                    />
                    <View style={[s.bottomSheetContent, { backgroundColor: theme.cardBg }]}>
                        <View style={s.bottomSheetHeader}>
                            <Text style={[s.bottomSheetTitle, { color: theme.textPrimary }]}>Export Income Report</Text>
                            <TouchableOpacity onPress={() => setShowExportModal(false)}>
                                <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '700' }}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                            <Text style={[s.exportLabel, { color: theme.textSecondary }]}>Select Date Range</Text>
                            <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>All transactions in this range will be exported</Text>

                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                                <TouchableOpacity 
                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.isDark ? '#334155' : '#F8FAFC', borderWidth: 1, borderColor: theme.isDark ? '#475569' : '#E2E8F0', padding: 12, borderRadius: 12, gap: 8 }} 
                                    onPress={() => setStartDatePickerVisible(true)}
                                >
                                    <Ionicons name="calendar-outline" size={18} color="#64748B" />
                                    <View>
                                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>Start Date</Text>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginTop: 2 }}>
                                            {exportStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.isDark ? '#334155' : '#F8FAFC', borderWidth: 1, borderColor: theme.isDark ? '#475569' : '#E2E8F0', padding: 12, borderRadius: 12, gap: 8 }} 
                                    onPress={() => setEndDatePickerVisible(true)}
                                >
                                    <Ionicons name="calendar-outline" size={18} color="#64748B" />
                                    <View>
                                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>End Date</Text>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginTop: 2 }}>
                                            {exportEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {exportStart > exportEnd && (
                                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700', marginBottom: 16 }}>⚠️ Start date must be before end date</Text>
                            )}

                            <TouchableOpacity
                                style={{
                                    backgroundColor: (isExporting || exportStart > exportEnd) ? '#94A3B8' : theme.primary,
                                    borderRadius: 16,
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 8,
                                }}
                                onPress={handleExport}
                                disabled={isExporting || exportStart > exportEnd}
                            >
                                {isExporting ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <>
                                        <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Download Excel Report</Text>
                                        <Download size={18} color="#FFF" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
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
    modalOverlay: {
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

    // ── DATE EXPORT MODAL ──────────────────────────────────────────────────
    exportOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        padding: 20,
    },
    exportModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 16,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.15)',
    },
    exportModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    exportModalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    exportLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#334155',
        marginBottom: 4,
    },
    exportSubLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        marginBottom: 16,
    },
    exportInputsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    exportDateInput: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        gap: 8,
    },
    exportDateInputText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1F2937',
    },
    exportWarningText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#EF4444',
        marginBottom: 12,
    },
    exportConfirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981',
        borderRadius: 12,
        height: 48,
        gap: 8,
        marginTop: 4,
    },
    exportConfirmBtnDisabled: {
        backgroundColor: '#A7F3D0',
    },
    exportConfirmText: {
        color: '#FFFFFF',
        fontSize: 13,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
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
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(148, 163, 184, 0.15)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
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