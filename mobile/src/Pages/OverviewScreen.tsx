import React, { useState, useCallback } from 'react';
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
const Skeleton = ({ style }: { style?: any }) => (
    <View style={[{ backgroundColor: '#E9D5FF', borderRadius: 12, opacity: 0.5 }, style]} />
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OverviewScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Default to current month
    const [targetDate, setTargetDate] = useState(new Date());
    const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

    const fetchData = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            const res = await api.get('/reports/monthly-overview', { params: { month: monthStr } });
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (e) {
            console.error('Overview fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [monthStr]);

    useFocusEffect(useCallback(() => { fetchData(true); }, [fetchData]));

    const [showPicker, setShowPicker] = useState(false);
    const [pickerYear, setPickerYear] = useState(targetDate.getFullYear());

    const openPicker = () => {
        setPickerYear(targetDate.getFullYear());
        setShowPicker(true);
    };

    const selectMonth = (monthIndex: number) => {
        const now = new Date();
        if (pickerYear === now.getFullYear() && monthIndex > now.getMonth()) return;
        const d = new Date(pickerYear, monthIndex, 1);
        setLoading(true);
        setTargetDate(d);
        setShowPicker(false);
    };

    const shiftMonth = (delta: number) => {
        const d = new Date(targetDate);
        d.setMonth(d.getMonth() + delta);
        const now = new Date();
        if (d.getFullYear() > now.getFullYear() || (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth())) {
            return; // Restrict future months
        }
        setLoading(true);
        setTargetDate(d);
    };

    const monthLabel = targetDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const canGoBack = navigation.canGoBack();

    // ── Loading ──
    if (loading && !data) {
        return (
            <View style={s.root}>
                <StatusBar barStyle="light-content" />
                <AppHeader
                    title="Financial Overview"
                    showBack={canGoBack}
                    rightComponent={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <HeaderNotification navigation={navigation} />
                            <ProfileMenu />
                        </View>
                    }
                />
                <View style={{ padding: 16, gap: 14 }}>
                    <Skeleton style={{ height: 120, borderRadius: 24 }} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Skeleton style={{ flex: 1, height: 110, borderRadius: 20 }} />
                        <Skeleton style={{ flex: 1, height: 110, borderRadius: 20 }} />
                    </View>
                    <Skeleton style={{ height: 220, borderRadius: 24 }} />
                </View>
            </View>
        );
    }

    const cm = data?.currentMonth || {};
    const trend = data?.trend || [];
    const isProfit = (cm.netProfit || 0) >= 0;
    const trendMax = Math.max(...trend.map((t: any) => Math.max(t.income, t.expenses)), 1);

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* ── Header ── */}
            <AppHeader
                title="Financial Overview"
                showBack={canGoBack}
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                }
            >
                {/* Month Navigation */}
                <View style={s.monthNav}>
                    <TouchableOpacity onPress={() => shiftMonth(-1)} style={s.monthArrow}>
                        <Ionicons name="chevron-back" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={openPicker} style={s.monthLabelBox}>
                        <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.7)" />
                        <Text style={s.monthLabel}>{monthLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => shiftMonth(1)} style={s.monthArrow}>
                        <Ionicons name="chevron-forward" size={18} color="#FFF" />
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

                    {/* ── Net Profit/Loss Hero Card ── */}
                    <LinearGradient
                        colors={isProfit ? ['#E6F9F3', '#D1FAE5'] : ['#FFEBEE', '#FEE2E2']}
                        style={[s.heroCard, { borderColor: isProfit ? '#A7F3D0' : '#FECACA' }]}
                    >
                        <View style={s.heroContentRow}>
                            <View style={s.heroTextWrap}>
                                <Text style={[s.heroLabel, { color: isProfit ? '#047857' : '#B91C1C' }]}>NET {isProfit ? 'PROFIT' : 'LOSS'}</Text>
                                <Text style={[s.heroValue, { color: isProfit ? '#065F46' : '#991B1B' }]}>{fmtFull(Math.abs(cm.netProfit || 0))}</Text>
                            </View>
                            <View style={[s.heroIconCircle, { shadowColor: isProfit ? '#059669' : '#DC2626' }]}>
                                <Ionicons
                                    name={isProfit ? 'trending-up' : 'trending-down'}
                                    size={28}
                                    color={isProfit ? '#10B981' : '#EF4444'}
                                />
                            </View>
                        </View>
                        {cm.profitMargin !== 0 && (
                            <View style={[s.marginBadge, { backgroundColor: isProfit ? 'rgba(4, 120, 87, 0.1)' : 'rgba(185, 28, 28, 0.1)' }]}>
                                <Text style={[s.marginBadgeText, { color: isProfit ? '#047857' : '#B91C1C' }]}>Margin: {cm.profitMargin}%</Text>
                            </View>
                        )}
                    </LinearGradient>

                    {/* ── Income vs Expenses Row ── */}
                    <View style={s.summaryRow}>
                        {/* Income Card */}
                        <TouchableOpacity style={[s.summaryCard, s.incomeCard]} onPress={() => navigation.navigate('IncomeDetails')} activeOpacity={0.8}>
                            <View style={[s.summaryIconBox, { backgroundColor: '#D1FAE5' }]}>
                                <Ionicons name="arrow-up-circle" size={16} color="#10B981" />
                            </View>
                            <Text style={s.summaryLabel}>INCOME</Text>
                            <Text style={[s.summaryValue, { color: '#065F46' }]}>{fmt(cm.totalIncome || 0)}</Text>
                            <View style={s.summaryDetail}>
                                <Text style={s.summaryDetailText}>Fees: {fmt(cm.feeCollection || 0)}</Text>
                                {(cm.otherIncome || 0) > 0 && (
                                    <Text style={s.summaryDetailText}>Other: {fmt(cm.otherIncome)}</Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Expenses Card */}
                        <TouchableOpacity style={[s.summaryCard, s.expenseCard]} onPress={() => navigation.navigate('Expenses')} activeOpacity={0.8}>
                            <View style={[s.summaryIconBox, { backgroundColor: '#FEE2E2' }]}>
                                <Ionicons name="arrow-down-circle" size={16} color="#EF4444" />
                            </View>
                            <Text style={s.summaryLabel}>EXPENSES</Text>
                            <Text style={[s.summaryValue, { color: '#991B1B' }]}>{fmt(cm.totalExpenses || 0)}</Text>
                            <View style={s.summaryDetail}>
                                <Text style={s.summaryDetailText}>
                                    {(cm.expenseBreakdown || []).length} categories
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* ── Rent Collection Status ── */}
                    {(cm.rentDue || 0) > 0 && (
                        <View style={s.card}>
                            <View style={s.cardHeader}>
                                <View style={s.cardHeaderLeft}>
                                    <Ionicons name="wallet-outline" size={18} color="#7C3AED" />
                                    <Text style={s.cardTitle}>Rent Collection</Text>
                                </View>
                            </View>
                            <View style={s.rentRow}>
                                <View style={[s.rentItem, { backgroundColor: '#EFF6FF' }]}>
                                    <Text style={[s.rentItemLabel, { color: '#3B82F6' }]}>Due</Text>
                                    <Text style={[s.rentItemVal, { color: '#2563EB' }]}>{fmt(cm.rentDue)}</Text>
                                </View>
                                <View style={[s.rentItem, { backgroundColor: '#F0FDF4' }]}>
                                    <Text style={[s.rentItemLabel, { color: '#16A34A' }]}>Collected</Text>
                                    <Text style={[s.rentItemVal, { color: '#16A34A' }]}>{fmt(cm.rentCollected)}</Text>
                                </View>
                                <View style={[s.rentItem, { backgroundColor: '#FFFBEB' }]}>
                                    <Text style={[s.rentItemLabel, { color: '#D97706' }]}>Pending</Text>
                                    <Text style={[s.rentItemVal, { color: '#D97706' }]}>{fmt(cm.rentPending)}</Text>
                                </View>
                            </View>
                            {/* Progress */}
                            <View style={s.progressWrap}>
                                <View style={s.progressBg}>
                                    <View style={[s.progressFill, {
                                        width: `${cm.rentDue > 0 ? Math.min(100, (cm.rentCollected / cm.rentDue) * 100) : 0}%`,
                                    }]} />
                                </View>
                                <Text style={s.progressText}>
                                    {cm.rentDue > 0 ? Math.round((cm.rentCollected / cm.rentDue) * 100) : 0}% collected
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* ── Expense Breakdown ── */}
                    <View style={s.card}>
                        <View style={s.cardHeader}>
                            <View style={s.cardHeaderLeft}>
                                <Ionicons name="pie-chart-outline" size={18} color="#7C3AED" />
                                <Text style={s.cardTitle}>Expense Breakdown</Text>
                            </View>
                            <Text style={s.cardMeta}>{fmtFull(cm.totalExpenses || 0)}</Text>
                        </View>

                        {(cm.expenseBreakdown || []).length === 0 ? (
                            <View style={s.emptyBlock}>
                                <Ionicons name="receipt-outline" size={36} color="#CBD5E1" />
                                <Text style={s.emptyText}>No expenses this month</Text>
                            </View>
                        ) : (
                            <View style={{ gap: 14 }}>
                                {(cm.expenseBreakdown || []).map((cat: any, i: number) => {
                                    const color = getColor(cat.category_name);
                                    const lightColor = getLightColor(color);
                                    const iconName = getIcon(cat.category_name);
                                    return (
                                        <View key={cat.category_id || i}>
                                            <View style={s.catRow}>
                                                <View style={s.catLeft}>
                                                    <View style={[s.catIconBox, { backgroundColor: lightColor }]}>
                                                        <Ionicons name={iconName as any} size={15} color={color} />
                                                    </View>
                                                    <Text style={s.catName}>{cat.category_name}</Text>
                                                </View>
                                                <View style={s.catRight}>
                                                    <Text style={s.catAmount}>{fmtFull(cat.amount)}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* ── 12-Month Trend ── */}
                    <View style={s.card}>
                        <View style={s.cardHeader}>
                            <View style={s.cardHeaderLeft}>
                                <Ionicons name="bar-chart-outline" size={18} color="#7C3AED" />
                                <Text style={s.cardTitle}>12-Month Trend</Text>
                            </View>
                        </View>

                        {/* Legend */}
                        <View style={s.legendRow}>
                            <View style={s.legendItem}>
                                <View style={[s.legendDot, { backgroundColor: '#10B981' }]} />
                                <Text style={s.legendText}>Income</Text>
                            </View>
                            <View style={s.legendItem}>
                                <View style={[s.legendDot, { backgroundColor: '#EF4444' }]} />
                                <Text style={s.legendText}>Expenses</Text>
                            </View>
                        </View>

                        {/* Chart */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={s.chartContainer}>
                                {trend.map((t: any, i: number) => {
                                    const incH = Math.max(3, (t.income / trendMax) * 90);
                                    const expH = Math.max(3, (t.expenses / trendMax) * 90);
                                    const isCurrent = t.month === monthStr;
                                    return (
                                        <View key={t.month} style={[s.chartCol, isCurrent && s.chartColCurrent]}>
                                            {/* Values on top */}
                                            {t.income > 0 && (
                                                <Text style={[s.chartTopVal, isCurrent && { color: '#10B981', fontWeight: 'bold' }]}>
                                                    {fmt(t.income)}
                                                </Text>
                                            )}
                                            <View style={s.chartBars}>
                                                <View style={[s.chartBar, {
                                                    height: incH,
                                                    backgroundColor: isCurrent ? '#10B981' : '#A7F3D0',
                                                }]} />
                                                <View style={[s.chartBar, {
                                                    height: expH,
                                                    backgroundColor: isCurrent ? '#EF4444' : '#FECACA',
                                                }]} />
                                            </View>
                                            <Text style={[s.chartMonth, isCurrent && {
                                                color: '#7C3AED', fontWeight: '800'
                                            }]}>
                                                {t.monthLabel}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {/* Averages */}
                        <View style={s.avgRow}>
                            <View style={s.avgItem}>
                                <Text style={s.avgLabel}>Avg Income</Text>
                                <Text style={[s.avgValue, { color: '#10B981' }]}>
                                    {fmt(trend.reduce((sum: number, t: any) => sum + t.income, 0) / Math.max(trend.filter((t: any) => t.income > 0).length, 1))}
                                </Text>
                            </View>
                            <View style={s.avgDivider} />
                            <View style={s.avgItem}>
                                <Text style={s.avgLabel}>Avg Expenses</Text>
                                <Text style={[s.avgValue, { color: '#EF4444' }]}>
                                    {fmt(trend.reduce((sum: number, t: any) => sum + t.expenses, 0) / Math.max(trend.filter((t: any) => t.expenses > 0).length, 1))}
                                </Text>
                            </View>
                            <View style={s.avgDivider} />
                            <View style={s.avgItem}>
                                <Text style={s.avgLabel}>Avg Profit</Text>
                                <Text style={[s.avgValue, { color: '#3B82F6' }]}>
                                    {fmt(trend.reduce((sum: number, t: any) => sum + t.profit, 0) / Math.max(trend.filter((t: any) => t.income > 0 || t.expenses > 0).length, 1))}
                                </Text>
                            </View>
                        </View>
                    </View>

                </View>
            </ScrollView>

            {/* ── Month/Year Picker Modal ── */}
            <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
                <View style={s.modalOverlay}>
                    <View style={s.pickerCard}>
                        <View style={s.pickerHeader}>
                            <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} style={s.yearArrow}>
                                <Ionicons name="chevron-back" size={20} color="#334155" />
                            </TouchableOpacity>
                            <Text style={s.pickerYearText}>{pickerYear}</Text>
                            <TouchableOpacity 
                                onPress={() => setPickerYear(y => y + 1)} 
                                style={[s.yearArrow, pickerYear >= new Date().getFullYear() && { opacity: 0.3 }]}
                                disabled={pickerYear >= new Date().getFullYear()}
                            >
                                <Ionicons name="chevron-forward" size={20} color="#334155" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={s.monthGrid}>
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => {
                                const now = new Date();
                                const isFuture = pickerYear > now.getFullYear() || (pickerYear === now.getFullYear() && i > now.getMonth());
                                const isSelected = pickerYear === targetDate.getFullYear() && i === targetDate.getMonth();
                                return (
                                    <TouchableOpacity 
                                        key={m} 
                                        style={[s.monthCell, isSelected && s.monthCellSelected, isFuture && s.monthCellDisabled]}
                                        disabled={isFuture}
                                        onPress={() => selectMonth(i)}
                                    >
                                        <Text style={[s.monthCellText, isSelected && s.monthCellTextSelected, isFuture && s.monthCellTextDisabled]}>{m}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity style={s.pickerCloseBtn} onPress={() => setShowPicker(false)}>
                            <Text style={s.pickerCloseText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Translucent loading overlay */}
            {loading && data && (
                <View style={s.loadingOverlay}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={s.loadingText}>Fetching overview...</Text>
                </View>
            )}
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
