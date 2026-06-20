import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    Dimensions,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import api from '../services/api';
import { ProfileMenu } from '../components/ProfileMenu';
import { useTheme } from '../../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';

const { width: SCREEN_W } = Dimensions.get('window');

// Category design configs
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

const fmt = (n: number) => {
    if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
};

const fmtFull = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function ReportsScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    
    // States
    const [overviewData, setOverviewData] = useState<any>(null);
    const [statsData, setStatsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    
    // Target date defaults to current month
    const [targetDate, setTargetDate] = useState(new Date());
    const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    
    const now = new Date();
    const isCurrentMonth = targetDate.getFullYear() === now.getFullYear() && targetDate.getMonth() === now.getMonth();

    const fetchData = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            
            // 1. Fetch monthly financial details
            const overviewRes = await api.get('/reports/monthly-overview', { params: { month: monthStr } });
            
            // 2. Fetch occupancy and general stats
            const statsRes = await api.get('/reports/dashboard-stats');
            
            if (overviewRes.data.success) {
                setOverviewData(overviewRes.data.data);
            }
            if (statsRes.data.success) {
                setStatsData(statsRes.data.data);
            }
        } catch (e) {
            console.error('Reports fetch error:', e);
            Alert.alert('Error', 'Failed to fetch analytics data. Please check your connection.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [monthStr]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const shiftMonth = (delta: number) => {
        const d = new Date(targetDate);
        d.setMonth(d.getMonth() + delta);
        
        // Block future month selections
        if (d > now) {
            return;
        }
        setTargetDate(d);
    };

    const handleDownloadExcel = async () => {
        try {
            setDownloading(true);
            
            const fileUrl = `${api.defaults.baseURL}/reports/download/excel?month=${monthStr}`;
            const token = api.defaults.headers.common['Authorization'];
            
            // Path to save file locally on the device
            const filename = `Hostel_Report_${monthStr}.xlsx`;
            const localUri = `${FileSystem.documentDirectory}${filename}`;
            
            const downloadResult = await FileSystem.downloadAsync(
                fileUrl,
                localUri,
                {
                    headers: {
                        'Authorization': token ? String(token) : '',
                    }
                }
            );

            if (downloadResult.status === 200) {
                // Share the file natively
                await Sharing.shareAsync(downloadResult.uri, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: `Share ${filename}`,
                    UTI: 'org.openxmlformats.spreadsheetml.sheet'
                });
            } else {
                throw new Error(`Download failed with status ${downloadResult.status}`);
            }
        } catch (error) {
            console.error('Excel report download error:', error);
            Alert.alert('Download Failed', 'Could not retrieve or share the Excel report. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    const monthLabel = targetDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const canGoBack = navigation.canGoBack();

    if (loading && !overviewData) {
        return (
            <View style={s.root}>
                <StatusBar barStyle="light-content" />
                <AppHeader
                    title="Reports & Analytics"
                    showBack={canGoBack}
                    rightComponent={<ProfileMenu />}
                />
                <View style={s.loaderWrap}>
                    <ActivityIndicator size="large" color={theme.gradientStart} />
                    <Text style={s.loaderText}>Analyzing metrics...</Text>
                </View>
            </View>
        );
    }

    const cm = overviewData?.currentMonth || {};
    const isProfit = (cm.netProfit || 0) >= 0;
    
    // Occupancy information
    const totalBeds = statsData?.totalBeds || 0;
    const occupiedBeds = statsData?.occupiedBeds || 0;
    const availBeds = totalBeds - occupiedBeds;
    const occupancyRate = statsData?.occupancyRate || 0;

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <AppHeader
                title="Reports & Analytics"
                showBack={canGoBack}
                rightComponent={<ProfileMenu />}
            >
                {/* Month Navigator */}
                <View style={s.monthNav}>
                    <TouchableOpacity onPress={() => shiftMonth(-1)} style={s.monthArrow}>
                        <Ionicons name="chevron-back" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <View style={s.monthLabelBox}>
                        <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.7)" />
                        <Text style={s.monthLabel}>{monthLabel}</Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => shiftMonth(1)} 
                        style={[s.monthArrow, isCurrentMonth && { opacity: 0.3 }]}
                        disabled={isCurrentMonth}
                    >
                        <Ionicons name="chevron-forward" size={18} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </AppHeader>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchData(true); }}
                        tintColor={theme.gradientStart}
                    />
                }
            >
                <View style={s.body}>
                    
                    {/* Excel Download Section */}
                    <TouchableOpacity
                        style={s.downloadCard}
                        onPress={handleDownloadExcel}
                        disabled={downloading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={s.downloadGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={s.downloadInfo}>
                                <View style={s.downloadIconBox}>
                                    <Ionicons name="document-text" size={26} color="#059669" />
                                </View>
                                <View style={s.downloadTextWrap}>
                                    <Text style={s.downloadTitle}>Export Excel Report</Text>
                                    <Text style={s.downloadSubtitle}>Download multi-sheet Summary, Tenants, Payments, Rooms & Expenses workbook</Text>
                                </View>
                            </View>
                            {downloading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <View style={s.downloadShareBadge}>
                                    <Ionicons name="share-social-outline" size={18} color="#FFF" />
                                    <Text style={s.downloadShareText}>Share</Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Stats Grid */}
                    <View style={s.grid}>
                        {/* Net Income/Loss Hero Card */}
                        <View style={[s.heroCard, { borderColor: isProfit ? '#A7F3D0' : '#FECACA', backgroundColor: isProfit ? '#ECFDF5' : '#FEF2F2' }]}>
                            <View style={s.heroContentRow}>
                                <View>
                                    <Text style={[s.heroLabel, { color: isProfit ? '#047857' : '#B91C1C' }]}>NET PROFIT / LOSS</Text>
                                    <Text style={[s.heroValue, { color: isProfit ? '#065F46' : '#991B1B' }]}>{fmtFull(cm.netProfit || 0)}</Text>
                                </View>
                                <View style={[s.heroIconCircle, { backgroundColor: isProfit ? '#D1FAE5' : '#FEE2E2' }]}>
                                    <Ionicons
                                        name={isProfit ? 'trending-up' : 'trending-down'}
                                        size={24}
                                        color={isProfit ? '#10B981' : '#EF4444'}
                                    />
                                </View>
                            </View>
                            <View style={s.marginBadge}>
                                <Text style={[s.marginBadgeText, { color: isProfit ? '#047857' : '#B91C1C' }]}>Margin: {cm.profitMargin || 0}%</Text>
                            </View>
                        </View>

                        {/* Income & Expense Summary */}
                        <View style={s.statsRow}>
                            <View style={[s.statsCard, s.incomeBg]}>
                                <View style={[s.statsIconBox, { backgroundColor: '#D1FAE5' }]}>
                                    <Ionicons name="arrow-up" size={16} color="#10B981" />
                                </View>
                                <Text style={s.statsLabel}>TOTAL INCOME</Text>
                                <Text style={[s.statsValue, { color: '#065F46' }]}>{fmt(cm.totalIncome || 0)}</Text>
                            </View>

                            <View style={[s.statsCard, s.expenseBg]}>
                                <View style={[s.statsIconBox, { backgroundColor: '#FEE2E2' }]}>
                                    <Ionicons name="arrow-down" size={16} color="#EF4444" />
                                </View>
                                <Text style={s.statsLabel}>TOTAL EXPENSES</Text>
                                <Text style={[s.statsValue, { color: '#991B1B' }]}>{fmt(cm.totalExpenses || 0)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Occupancy Card */}
                    <View style={s.card}>
                        <View style={s.cardHeader}>
                            <Ionicons name="bed-outline" size={18} color="#2563EB" />
                            <Text style={s.cardTitle}>Occupancy Overview</Text>
                            <Text style={s.rateBadge}>{occupancyRate}% Full</Text>
                        </View>
                        <View style={s.occupancyRow}>
                            <View style={s.occupancyCell}>
                                <Text style={s.occVal}>{totalBeds}</Text>
                                <Text style={s.occLabel}>Total Beds</Text>
                            </View>
                            <View style={s.occDivider} />
                            <View style={s.occupancyCell}>
                                <Text style={[s.occVal, { color: '#2563EB' }]}>{occupiedBeds}</Text>
                                <Text style={s.occLabel}>Occupied</Text>
                            </View>
                            <View style={s.occDivider} />
                            <View style={s.occupancyCell}>
                                <Text style={[s.occVal, { color: '#10B981' }]}>{availBeds >= 0 ? availBeds : 0}</Text>
                                <Text style={s.occLabel}>Available</Text>
                            </View>
                        </View>
                        <View style={s.progressWrap}>
                            <View style={s.progressBg}>
                                <View style={[s.progressFill, { width: `${occupancyRate}%` }]} />
                            </View>
                        </View>
                    </View>

                    {/* Expense Breakdown Category Progress */}
                    <View style={s.card}>
                        <View style={s.cardHeader}>
                            <Ionicons name="pie-chart-outline" size={18} color="#EA580C" />
                            <Text style={s.cardTitle}>Expense Breakdown</Text>
                        </View>
                        
                        {(!cm.expenseBreakdown || cm.expenseBreakdown.length === 0) ? (
                            <View style={s.emptyBlock}>
                                <Ionicons name="receipt-outline" size={32} color="#CBD5E1" />
                                <Text style={s.emptyText}>No expenses recorded for this month</Text>
                            </View>
                        ) : (
                            <View style={s.categoryList}>
                                {cm.expenseBreakdown.map((cat: any, i: number) => {
                                    const color = getColor(cat.category_name);
                                    const lightBg = getLightColor(color);
                                    const iconName = getIcon(cat.category_name);
                                    return (
                                        <View key={cat.category_id || i} style={s.catBlock}>
                                            <View style={s.catInfoRow}>
                                                <View style={s.catLeft}>
                                                    <View style={[s.catIconCircle, { backgroundColor: lightBg }]}>
                                                        <Ionicons name={iconName as any} size={14} color={color} />
                                                    </View>
                                                    <Text style={s.catLabelText}>{cat.category_name}</Text>
                                                </View>
                                                <View style={s.catRight}>
                                                    <Text style={s.catAmountText}>{fmtFull(cat.amount)}</Text>
                                                    <Text style={s.catPercentText}>{cat.percentage}%</Text>
                                                </View>
                                            </View>
                                            <View style={s.catProgressBg}>
                                                <View style={[s.catProgressFill, { width: `${cat.percentage}%`, backgroundColor: color }]} />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },

    // Header
    header: {
        paddingTop: 54,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
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
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.3,
    },

    // Month navigation
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

    loaderWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },

    scrollContent: {
        paddingBottom: 40,
    },
    body: {
        padding: 16,
        gap: 16,
    },

    // Download button/card
    downloadCard: {
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#10B981',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    downloadGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
    },
    downloadInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        marginRight: 12,
    },
    downloadIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadTextWrap: {
        flex: 1,
    },
    downloadTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 2,
    },
    downloadSubtitle: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 13,
        fontWeight: '500',
    },
    downloadShareBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.22)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    downloadShareText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFF',
    },

    // Hero and grid
    grid: {
        gap: 12,
    },
    heroCard: {
        borderRadius: 22,
        padding: 18,
        borderWidth: 1.5,
    },
    heroContentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    heroValue: {
        fontSize: 26,
        fontWeight: '900',
    },
    heroIconCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    marginBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 10,
    },
    marginBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },

    // Stats side-by-side
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statsCard: {
        flex: 1,
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
    },
    incomeBg: {
        backgroundColor: '#ECFDF5',
        borderColor: '#D1FAE5',
    },
    expenseBg: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FEE2E2',
    },
    statsIconBox: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statsLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    statsValue: {
        fontSize: 18,
        fontWeight: '900',
    },

    // Card
    card: {
        backgroundColor: '#FFF',
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
        flex: 1,
    },
    rateBadge: {
        fontSize: 11,
        fontWeight: '800',
        color: '#2563EB',
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },

    // Occupancy
    occupancyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    occupancyCell: {
        flex: 1,
        alignItems: 'center',
    },
    occVal: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1E293B',
    },
    occLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94A3B8',
        marginTop: 2,
    },
    occDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#F1F5F9',
    },
    progressWrap: {
        height: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBg: {
        width: '100%',
        height: '100%',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2563EB',
        borderRadius: 4,
    },

    // Category breakdown
    emptyBlock: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    emptyText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
    },
    categoryList: {
        gap: 12,
    },
    catBlock: {
        gap: 6,
    },
    catInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    catLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    catIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catLabelText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
    },
    catRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    catAmountText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#1E293B',
    },
    catPercentText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94A3B8',
        width: 32,
        textAlign: 'right',
    },
    catProgressBg: {
        height: 5,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    catProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
});
