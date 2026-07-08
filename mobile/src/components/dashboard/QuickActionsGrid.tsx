import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

// Better icons chosen for clarity: what does the action DO, not what it navigates to
const QUICK_ACTIONS = [
    { label: 'Add Tenant',     icon: 'person-add',          color: '#7C3AED', bg: '#EDE9FE', route: 'AddStudent' },
    { label: 'Add Room',       icon: 'bed',                  color: '#2563EB', bg: '#DBEAFE', route: 'AddRoom' },
    { label: 'Pre-Book',       icon: 'calendar',             color: '#F97316', bg: '#FFF7ED', route: 'PreBooking' },
    { label: 'Collect Rent',   icon: 'cash',                 color: '#0D9488', bg: '#CCFBF1', route: 'CollectedPayments' },
    { label: 'Add Expense',    icon: 'receipt',              color: '#D97706', bg: '#FEF3C7', route: 'AddExpense' },
    { label: 'Complaints',     icon: 'chatbubble-ellipses',  color: '#DC2626', bg: '#FEE2E2', route: 'ComplaintsManagement' },
    { label: 'Bill Reminders', icon: 'notifications',        color: '#EA580C', bg: '#FFEDD5', route: 'BillReminders' },
    { label: 'Staff',          icon: 'people',               color: '#059669', bg: '#D1FAE5', route: 'AddStaff' },
];

const getQuickActionLabelKey = (label: string) => {
    if (label === 'Add Tenant') return 'dashboard.addTenant';
    if (label === 'Add Room') return 'dashboard.addRoom';
    if (label === 'Pre-Book') return 'dashboard.preBook';
    if (label === 'Collect Rent') return 'dashboard.collectedRent';
    if (label === 'Add Expense') return 'dashboard.addExpense';
    if (label === 'Bill Reminders') return 'dashboard.bills';
    if (label === 'Staff') return 'dashboard.staff';
    return label;
};

interface QuickActionsGridProps {
    data: {
        prebookingsCount: number;
    };
}

export const QuickActionsGrid = ({ data }: QuickActionsGridProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();

    const handleQuickAction = (a: typeof QUICK_ACTIONS[0]) => {
        navigation.navigate(a.route);
    };

    return (
        <View style={s.sectionBlock}>
            <View style={s.sectionHeaderRow}>
                <View style={s.sectionTitleRow}>
                    <Ionicons name="flash" size={13} color="#7C3AED" />
                    <Text style={[s.sectionTitle, { fontSize: fontSize - 1, color: theme.textSecondary }]}>
                        {t('dashboard.quickActions')}
                    </Text>
                </View>
            </View>
            <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <View style={s.quickRow}>
                    {QUICK_ACTIONS.map((a, i) => (
                        <TouchableOpacity
                            key={i}
                            style={s.quickItem}
                            activeOpacity={0.72}
                            onPress={() => handleQuickAction(a)}
                        >
                            <View style={s.quickIconWrap}>
                                <View style={[s.iconCircle, { backgroundColor: isDark ? '#1E293B' : a.bg }]}>
                                    <Ionicons name={a.icon as any} size={20} color={isDark ? theme.primary : a.color} />
                                </View>
                                {a.route === 'PreBooking' && data.prebookingsCount > 0 && (
                                    <View style={s.badge}>
                                        <Text style={s.badgeText}>{data.prebookingsCount}</Text>
                                    </View>
                                )}
                            </View>
                            <Text
                                style={[s.quickLabel, { fontSize: Math.max(9, fontSize - 4), color: isDark ? theme.textSecondary : '#475569' }]}
                                numberOfLines={2}
                            >
                                {t(getQuickActionLabelKey(a.label), a.label)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
};

const s = StyleSheet.create({
    sectionBlock: { gap: 8 },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
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
    card: {
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    quickRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
    },
    quickItem: { width: '23%', alignItems: 'center', marginVertical: 5, paddingHorizontal: 1 },
    quickIconWrap: { position: 'relative', marginBottom: 5 },
    iconCircle: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EA580C',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '900',
    },
    quickLabel: {
        fontWeight: '600',
        marginTop: 3,
        textAlign: 'center',
        lineHeight: 13,
    },
});
