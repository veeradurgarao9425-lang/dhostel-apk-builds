import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_W } = Dimensions.get('window');
const BODY_PAD = 14;

// Original 8 Quick Actions (with Guests instead of Pre-Book)
const QUICK_ACTIONS = [
    { label: 'Add Tenant',     icon: 'person-add',          color: '#7C3AED', bg: '#EDE9FE', route: 'AddStudent' },
    { label: 'Add Room',       icon: 'bed',                  color: '#0284C7', bg: '#E0F2FE', route: 'AddRoom' },
    { label: 'Guests',         icon: 'people-circle',        color: '#D97706', bg: '#FEF3C7', route: 'Guests' },
    { label: 'Collect Rent',   icon: 'cash',                 color: '#10B981', bg: '#D1FAE5', route: 'CollectedPayments' },
    { label: 'Add Expense',    icon: 'receipt',              color: '#EA580C', bg: '#FFEDD5', route: 'AddExpense' },
    { label: 'Complaints',     icon: 'chatbubble-ellipses',  color: '#E11D48', bg: '#FFE4E6', route: 'ComplaintsManagement' },
    { label: 'Bill Reminders', icon: 'notifications',        color: '#4F46E5', bg: '#EEF2FF', route: 'BillReminders' },
    { label: 'Staff',          icon: 'people',               color: '#0891B2', bg: '#CFFAFE', route: 'AddStaff' },
];

const getLabel = (label: string, t: any) => {
    if (label === 'Add Tenant') return t('dashboard.addTenant', label);
    if (label === 'Add Room') return t('dashboard.addRoom', label);
    if (label === 'Guests') return t('dashboard.guests', label);
    if (label === 'Collect Rent') return t('dashboard.collectedRent', label);
    if (label === 'Add Expense') return t('dashboard.addExpense', label);
    if (label === 'Bill Reminders') return t('dashboard.bills', label);
    if (label === 'Staff') return t('dashboard.staff', label);
    return label;
};

// 2 pages of 4
const PAGES = [QUICK_ACTIONS.slice(0, 4), QUICK_ACTIONS.slice(4, 8)];
const TOTAL_PAGES = PAGES.length;

interface QuickActionsGridProps {
    data: { prebookingsCount: number; };
}

export const QuickActionsGrid = ({ data }: QuickActionsGridProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    // Card width = full card width (no padding on the outer card, inner spacing)
    const PAGE_W = SCREEN_W - BODY_PAD * 2;

    const renderPage = ({ item }: { item: typeof QUICK_ACTIONS }) => (
        <View style={[s.page, { width: PAGE_W }]}>
            {item.map((a, i) => (
                <TouchableOpacity
                    key={i}
                    style={[s.quickItem, { backgroundColor: isDark ? '#1E293B' : theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                    activeOpacity={0.72}
                    onPress={() => navigation.navigate(a.route)}
                >
                    <View style={s.quickIconWrap}>
                        <View style={[s.iconCircle, { backgroundColor: isDark ? '#0F172A' : a.bg }]}>
                            <Ionicons name={a.icon as any} size={20} color={a.color} />
                        </View>
                    </View>
                    <Text
                        style={[s.quickLabel, { fontSize: Math.max(9, fontSize - 4), color: isDark ? '#94A3B8' : '#475569' }]}
                        numberOfLines={2}
                    >
                        {getLabel(a.label, t)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <View style={s.sectionBlock}>
            {/* Card container */}
            <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                {/* Section header inside the card container */}
                <View style={s.cardHeaderRow}>
                    <View style={s.sectionTitleRow}>
                        <Ionicons name="flash" size={12} color="#7C3AED" />
                        <Text style={[s.sectionTitle, { fontSize: fontSize - 2, color: theme.textSecondary }]}>
                            {t('dashboard.quickActions')}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('More' as any)}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                    >
                        <Text style={[s.viewAll, { color: theme.primary, fontSize: fontSize - 2 }]}>View All</Text>
                        <Ionicons name="chevron-forward" size={12} color={theme.primary} style={{ marginTop: 1 }} />
                    </TouchableOpacity>
                </View>

                {/* Paged FlatList — 4 items per page */}
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
    quickItem: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 14,
        borderWidth: 1,
        gap: 4,
        width: 66,
    },
    quickIconWrap: { position: 'relative' },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: -4, right: -4,
        backgroundColor: '#EA580C',
        borderRadius: 8,
        minWidth: 16, height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    badgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
    quickLabel: {
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 12,
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
