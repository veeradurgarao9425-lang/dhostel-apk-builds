import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, ActivityIndicator, Dimensions, Linking, Modal, Alert
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
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const initialPeriod: Period = route.params?.period || 'month';

    const [period, setPeriod] = useState<Period>(initialPeriod);
    const [refDate, setRefDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

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

    const { theme } = useTheme();

    const handleExport = async () => {
        if (exportStart > exportEnd) {
            Alert.alert('Invalid Range', 'Start date must be before end date.');
            return;
        }

        setIsExporting(true);
        try {
            const startStr = toLocalDateString(exportStart);
            const endStr = toLocalDateString(exportEnd);
            const token = await AsyncStorage.getItem('token');

            if (!token) {
                Alert.alert('Error', 'Authentication token not found. Please log in again.');
                return;
            }

            const baseURL = (api.defaults.baseURL || 'https://dhostel-backend.onrender.com/api').replace(/\/$/, '');
            const exportUrl = `${baseURL}/income/export?startDate=${startStr}&endDate=${endStr}&token=${encodeURIComponent(token)}&all=true`;

            const filename = `income_report_${startStr}_to_${endStr}.xlsx`;
            const fileUri = `${FileSystem.documentDirectory}${filename}`;

            const downloadResult = await FileSystem.downloadAsync(exportUrl, fileUri);
            
            setShowExportModal(false);

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
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to export data');
        } finally {
            setIsExporting(false);
        }
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const dateStr = toLocalDateString(refDate);
            const res = await api.get('/income/analytics', {
                params: { type: period, date: dateStr },
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
    }, [period, refDate]);

    useEffect(() => { load(); }, [load]);

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
    
    // Filter transactions into separate categories
    const rentTransactions = transactionsList.filter((t: any) => t.type === 'Rent');
    const guestTransactions = transactionsList.filter((t: any) => t.type === 'Guest');
    const otherTransactions = transactionsList.filter((t: any) => t.type === 'Other');

    const total = transactionsList.reduce((sum: number, t: any) => sum + t.amount, 0);
    const rentTotal = rentTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    const guestTotal = guestTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    const otherTotal = otherTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);

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

    const getPeriodDropdownText = () => {
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
            return refDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
        return refDate.toLocaleDateString('en-IN', { month: 'long' });
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
                                            ₹{b.value >= 1000 ? `${(b.value / 1000).toFixed(0)}k` : Math.round(b.value)}
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

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* ── HEADER (MATCHING APP GRADIENT) ────────────────────────── */}
            <AppHeader
                title="Earnings"
                rightComponent={
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
                                }
                            }}
                        >
                            <Text style={[s.tabButtonText, period === p && s.tabButtonTextActive]}>
                                {p === 'day' ? 'Day' : p === 'week' ? 'Week' : 'Month'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </AppHeader>

            {/* BODY */}
            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* DATE PERIOD NAV CARD */}
                <View style={s.periodNavCard}>
                    <TouchableOpacity
                        style={s.periodDropdown}
                        onPress={() => {
                            if (period === 'day') {
                                setDatePickerVisible(true);
                            } else {
                                setShowSelectorModal(true);
                            }
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={s.periodDropdownText}>{getPeriodDropdownText()}</Text>
                        <Ionicons name="chevron-down" size={14} color="#475569" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>

                    <View style={s.amountNavRow}>
                        <TouchableOpacity onPress={() => shiftDate(-1)} style={s.navArrowBtn}>
                            <Ionicons name="chevron-back" size={24} color="#000000" />
                        </TouchableOpacity>

                        {loading ? (
                            <ActivityIndicator color="#000000" size="small" style={{ marginHorizontal: 20 }} />
                        ) : (
                            <Text style={s.bigAmountText}>₹{total.toLocaleString('en-IN')}</Text>
                        )}

                        <TouchableOpacity
                            onPress={() => { if (canGoForward()) shiftDate(1); }}
                            style={[s.navArrowBtn, !canGoForward() && { opacity: 0.25 }]}
                            disabled={!canGoForward()}
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
                        <View style={s.statsCol}>
                            <Text style={s.statsNum}>₹{averagePayment.toLocaleString('en-IN')}</Text>
                            <Text style={s.statsLbl}>Avg Payment</Text>
                        </View>
                    </View>
                )}

                {/* SEGREGATED TRANSACTION CARDS */}
                {!loading && (
                    <View style={s.cardsWrapper}>
                        
                        {/* Rent Collections Card */}
                        {(rentTransactions.length > 0 || (guestTransactions.length === 0 && otherTransactions.length === 0)) && (
                            <View style={s.flatCard}>
                                <View style={s.cardHeaderRow}>
                                    <Text style={s.cardHeaderTitle}>
                                        {period === 'day' ? 'Daily Rent Collections' : period === 'week' ? 'Weekly Rent Collections' : 'Monthly Rent Collections'}
                                    </Text>
                                    <Text style={s.cardHeaderTotal}>₹{rentTotal.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={s.cardBody}>
                                    {rentTransactions.length > 0 ? (
                                        rentTransactions.map((tx: any, index: number) => (
                                            <TouchableOpacity
                                                key={tx.id ?? index}
                                                style={[s.transactionRow, index === rentTransactions.length - 1 && { borderBottomWidth: 0 }]}
                                                onPress={() => {
                                                    if (tx.student_id) {
                                                        navigation.navigate('TenantTransactions', { studentId: tx.student_id, studentName: tx.title });
                                                    }
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={s.avatarCircle}>
                                                    <Text style={s.avatarText}>{(tx.title || 'S')[0]}</Text>
                                                </View>
                                                <View style={s.txDetails}>
                                                    <Text style={s.txTitleText} numberOfLines={1}>{tx.title}</Text>
                                                    <Text style={s.txSubText}>{new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {tx.subtitle}</Text>
                                                </View>
                                                <Text style={s.txAmountText}>₹{tx.amount.toLocaleString('en-IN')}</Text>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <Text style={s.emptyTransactionsText}>No rent collections recorded for this period</Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Guest Collections Card */}
                        {guestTransactions.length > 0 && (
                            <View style={[s.flatCard, { marginTop: 16 }]}>
                                <View style={s.cardHeaderRow}>
                                    <Text style={s.cardHeaderTitle}>Guest Stay Collections</Text>
                                    <Text style={s.cardHeaderTotal}>₹{guestTotal.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={s.cardBody}>
                                    {guestTransactions.map((tx: any, index: number) => (
                                        <TouchableOpacity
                                            key={tx.id ?? index}
                                            style={[s.transactionRow, index === guestTransactions.length - 1 && { borderBottomWidth: 0 }]}
                                            onPress={() => {
                                                navigation.navigate('Guests');
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[s.avatarCircle, { backgroundColor: '#F3E5F5' }]}>
                                                <Text style={[s.avatarText, { color: '#4A148C' }]}>{(tx.title || 'G')[0]}</Text>
                                            </View>
                                            <View style={s.txDetails}>
                                                <Text style={s.txTitleText} numberOfLines={1}>{tx.title}</Text>
                                                <Text style={s.txSubText}>
                                                    {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {tx.subtitle}
                                                    {tx.description ? ` · ${tx.description}` : ''}
                                                </Text>
                                            </View>
                                            <Text style={s.txAmountText}>₹{tx.amount.toLocaleString('en-IN')}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Other / Indirect Income Card */}
                        {otherTransactions.length > 0 && (
                            <View style={[s.flatCard, { marginTop: 16 }]}>
                                <View style={s.cardHeaderRow}>
                                    <Text style={s.cardHeaderTitle}>Other / Indirect Income</Text>
                                    <Text style={s.cardHeaderTotal}>₹{otherTotal.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={s.cardBody}>
                                    {otherTransactions.map((tx: any, index: number) => (
                                        <View
                                            key={tx.id ?? index}
                                            style={[s.transactionRow, index === otherTransactions.length - 1 && { borderBottomWidth: 0 }]}
                                        >
                                            <View style={[s.avatarCircle, { backgroundColor: '#E3F2FD' }]}>
                                                <Text style={[s.avatarText, { color: '#1565C0' }]}>{(tx.title || 'O')[0]}</Text>
                                            </View>
                                            <View style={s.txDetails}>
                                                <Text style={s.txTitleText} numberOfLines={1}>{tx.title}</Text>
                                                <Text style={s.txSubText}>
                                                    {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {tx.subtitle}
                                                    {tx.description ? ` · ${tx.description}` : ''}
                                                </Text>
                                            </View>
                                            <Text style={s.txAmountText}>₹{tx.amount.toLocaleString('en-IN')}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                    </View>
                )}

                <View style={{ height: 60 }} />
            </ScrollView>

            {/* BOTTOM SHEET SELECT DROPDOWN MODAL */}
            <Modal
                visible={showSelectorModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSelectorModal(false)}
            >
                <View style={s.modalOverlay}>
                    <TouchableOpacity
                        style={s.modalDismissOverlay}
                        activeOpacity={1}
                        onPress={() => setShowSelectorModal(false)}
                    />
                    <View style={s.bottomSheetContent}>
                        <View style={s.bottomSheetHeader}>
                            <Text style={s.bottomSheetTitle}>
                                {period === 'month' ? 'Select month' : 'Select week'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowSelectorModal(false)} style={s.closeCircle}>
                                <X size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={s.bottomSheetScroll} showsVerticalScrollIndicator={false}>
                            {period === 'month' && getMonthsList().map((d, index) => {
                                const isCurrent = isCurrentMonth(d);
                                const isSelected = isSelectedMonth(d);
                                const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[s.bottomSheetItem, isSelected && s.bottomSheetItemSelected]}
                                        onPress={() => {
                                            setRefDate(d);
                                            setShowSelectorModal(false);
                                        }}
                                    >
                                        <Text style={[s.bottomSheetItemText, isSelected && s.bottomSheetItemTextSelected]}>
                                            {label}
                                        </Text>
                                        {isCurrent && (
                                            <View style={[s.currentMonthBadge, { backgroundColor: theme.primary }]}>
                                                <Text style={s.currentMonthBadgeText}>This month</Text>
                                            </View>
                                        )}
                                        {isSelected && !isCurrent && (
                                            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}

                            {period === 'week' && getWeekRanges().map((w, index) => {
                                const isCurrent = isCurrentWeek(w.start);
                                const isSelected = isSelectedWeek(w.start, w.end);
                                const label = getWeekRangeLabel(w.start, w.end);
                                const yearLabel = w.start.getFullYear();

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[s.bottomSheetItem, isSelected && s.bottomSheetItemSelected]}
                                        onPress={() => {
                                            setRefDate(w.start);
                                            setShowSelectorModal(false);
                                        }}
                                    >
                                        <Text style={[s.bottomSheetItemText, isSelected && s.bottomSheetItemTextSelected]}>
                                            {label} {yearLabel}
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

            {/* DATE EXPORT MODAL */}
            <Modal
                visible={showExportModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowExportModal(false)}
            >
                <View style={s.exportOverlay}>
                    <View style={s.exportModalContent}>
                        <View style={s.exportModalHeader}>
                            <Text style={s.exportModalTitle}>Export Income Report</Text>
                            <TouchableOpacity onPress={() => setShowExportModal(false)}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <Text style={s.exportLabel}>Select Date Range</Text>
                        <Text style={s.exportSubLabel}>Export data formats in Excel spreadsheet</Text>

                        <View style={s.exportInputsRow}>
                            <TouchableOpacity style={s.exportDateInput} onPress={() => setStartDatePickerVisible(true)}>
                                <Ionicons name="calendar-outline" size={16} color="#64748B" />
                                <Text style={s.exportDateInputText}>
                                    {exportStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Text>
                            </TouchableOpacity>
                            <Text style={{ color: '#94A3B8', fontWeight: '800' }}>→</Text>
                            <TouchableOpacity style={s.exportDateInput} onPress={() => setEndDatePickerVisible(true)}>
                                <Ionicons name="calendar-outline" size={16} color="#64748B" />
                                <Text style={s.exportDateInputText}>
                                    {exportEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {exportStart > exportEnd && (
                            <Text style={s.exportWarningText}>⚠️ Start date must be before end date</Text>
                        )}

                        <TouchableOpacity
                            style={[
                                s.exportConfirmBtn,
                                (isExporting || exportStart > exportEnd) && s.exportConfirmBtnDisabled
                            ]}
                            onPress={handleExport}
                            disabled={isExporting || exportStart > exportEnd}
                        >
                            {isExporting ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <>
                                    <Text style={s.exportConfirmText}>Download Excel File</Text>
                                    <Download size={18} color="#FFF" />
                                </>
                            )}
                        </TouchableOpacity>
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
                    setRefDate(date);
                    setDatePickerVisible(false);
                }}
                onCancel={() => setDatePickerVisible(false)}
            />
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    exportModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
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
});