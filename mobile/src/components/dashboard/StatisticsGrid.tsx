import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_W } = Dimensions.get('window');
const BODY_PAD = 14;

interface StatisticsGridProps {
    data: {
        activeTenants: number;
        monthlyExpenses?: number;
        staffCount?: number;
        totalRooms?: number;
        monthAmount?: number;
        collectionStats: {
            collected: number;
            totalExpected: number;
            pending: number;
            overdueAmount: number;
        };
    };
    fmt: (n: number) => string;
}

export const StatisticsGrid = ({ data, fmt }: StatisticsGridProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const PAGE_W = SCREEN_W - BODY_PAD * 2;
    // Calculate exact width for 4 items per page to maximize space
    const ITEM_W = (PAGE_W - 24) / 4;

    const collectedVal = data.collectionStats?.collected || 0;
    const pendingVal = data.collectionStats?.pending || 0;
    const monthlyExpensesVal = data.monthlyExpenses || 0;
    const monthAmountVal = data.monthAmount || 0;

    // Helper to format values for compact display (e.g. 1.2L or 5.4k)
    const formatValue = (val: number) => {
        if (val >= 100000) {
            return `${(val / 100000).toFixed(1)}L`;
        }
        if (val >= 1000) {
            return `${(val / 1000).toFixed(1)}k`;
        }
        return val.toString();
    };

    // 8 metrics across two pages
    const STATS_ITEMS = [
        // Page 1: Finance
        { label: 'Collected', icon: 'cash', color: '#10B981', bg: '#D1FAE5', value: `₹${formatValue(collectedVal)}`, route: 'CollectedPayments' },
        { label: 'Pending', icon: 'alert-circle', color: '#EF4444', bg: '#FEE2E2', value: `₹${formatValue(pendingVal)}`, route: 'PendingTab' },
        { label: 'Income', icon: 'trending-up', color: '#059669', bg: '#D1FAE5', value: `₹${formatValue(monthAmountVal)}`, route: 'Income' },
        { label: 'Expenses', icon: 'receipt', color: '#EA580C', bg: '#FFEDD5', value: `₹${formatValue(monthlyExpensesVal)}`, route: 'Expenses' },

        // Page 2: Operations & Reports
        { label: t('dashboard.tenants'), icon: 'people', color: '#7C3AED', bg: '#EDE9FE', value: data.activeTenants.toString(), route: 'StudentsTab' },
        { label: 'Rooms', icon: 'home', color: '#0284C7', bg: '#E0F2FE', value: (data.totalRooms ?? 0).toString(), route: 'Rooms' },
        { label: t('dashboard.staff'), icon: 'people-circle', color: '#0891B2', bg: '#CFFAFE', value: (data.staffCount ?? 0).toString(), route: 'Staff' },
        { label: 'Analytics', icon: 'bar-chart', color: '#4F46E5', bg: '#EEF2FF', value: 'View', route: 'Reports' },
    ];

    const PAGES = [STATS_ITEMS.slice(0, 4), STATS_ITEMS.slice(4, 8)];
    const TOTAL_PAGES = PAGES.length;

    const renderPage = ({ item }: { item: typeof STATS_ITEMS }) => (
        <View style={[s.page, { width: PAGE_W }]}>
            {item.map((a, i) => (
                <TouchableOpacity
                    key={i}
                    style={[s.statItem, { width: ITEM_W, backgroundColor: isDark ? '#1E293B' : theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                    activeOpacity={0.72}
                    onPress={() => navigation.navigate(a.route as any)}
                >
                    {/* Top: Icon */}
                    <View style={[s.statIconBox, { backgroundColor: isDark ? '#0F172A' : a.bg }]}>
                        <Ionicons name={a.icon as any} size={16} color={a.color} />
                    </View>
                    
                    {/* Middle: Big bold value (fully visible) */}
                    <Text style={[s.statNum, { color: isDark ? theme.textPrimary : '#1F2937' }]} numberOfLines={1}>
                        {a.value}
                    </Text>

                    {/* Bottom: Label */}
                    <Text style={[s.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                        {a.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <View style={s.sectionBlock}>
            {/* Card container */}
            <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                {/* Section header inside the card */}
                <View style={s.cardHeaderRow}>
                    <View style={s.sectionTitleRow}>
                        <Ionicons name="stats-chart" size={12} color="#4F46E5" />
                        <Text style={[s.sectionTitle, { fontSize: fontSize - 2, color: theme.textSecondary }]}>
                            {t('dashboard.statistics')}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Reports')}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                    >
                        <Text style={[s.viewAll, { color: theme.primary, fontSize: fontSize - 2 }]}>View All</Text>
                        <Ionicons name="chevron-forward" size={12} color={theme.primary} style={{ marginTop: 1 }} />
                    </TouchableOpacity>
                </View>

                {/* FlatList horizontal paging */}
                <FlatList
                    ref={flatListRef}
                    data={PAGES}
                    keyExtractor={(_, idx) => `page-${idx}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    snapToInterval={PAGE_W}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    bounces={false}
                    renderItem={renderPage}
                    onMomentumScrollEnd={(e) => {
                        const page = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
                        setCurrentPage(page);
                    }}
                />

                {/* ── Page indicator dots ─────────────────────────── */}
                <View style={s.dotsRow}>
                    {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
                        <TouchableOpacity
                            key={i}
                            activeOpacity={0.7}
                            onPress={() => {
                                flatListRef.current?.scrollToIndex({ index: i, animated: true });
                                setCurrentPage(i);
                            }}
                        >
                            <View
                                style={[
                                    s.dot,
                                    {
                                        backgroundColor: i === currentPage ? theme.primary : (isDark ? '#334155' : '#CBD5E1'),
                                        width: i === currentPage ? 15 : 5,
                                    }
                                ]}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
};

const s = StyleSheet.create({
    sectionBlock: { marginVertical: 0 },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    sectionTitle: {
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    viewAll: {
        fontWeight: '700',
    },
    card: {
        borderRadius: 20,
        paddingTop: 12,
        paddingBottom: 8,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        overflow: 'hidden',
    },
    page: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
    },
    statItem: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderRadius: 14,
        borderWidth: 1,
        gap: 6,
    },
    statIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statNum: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
        width: '100%',
    },
    statLabel: {
        fontSize: 9.5,
        fontWeight: '600',
        textAlign: 'center',
        width: '100%',
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        paddingTop: 8,
        paddingBottom: 2,
    },
    dot: {
        height: 5,
        borderRadius: 2.5,
    },
});
