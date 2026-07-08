import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const QUICK_ACTIONS = [
    { label: 'Add Tenant', icon: 'person-add-outline', color: '#7C3AED', bg: '#EDE9FE', route: 'AddStudent' },
    { label: 'Add Room', icon: 'business-outline', color: '#2563EB', bg: '#DBEAFE', route: 'AddRoom' },
    { label: 'Pre-Book', icon: 'calendar-outline', color: '#F97316', bg: '#FFF7ED', route: 'PreBooking' },
    { label: 'Collected Rent', icon: 'wallet-outline', color: '#0D9488', bg: '#CCFBF1', route: 'CollectedPayments' },
    { label: 'Add Expense', icon: 'card-outline', color: '#D97706', bg: '#FEF3C7', route: 'AddExpense' },
    { label: 'Complaints', icon: 'construct-outline', color: '#DC2626', bg: '#FEE2E2', route: 'ComplaintsManagement' },
    { label: 'Bills', icon: 'document-text-outline', color: '#EA580C', bg: '#FFEDD5', route: 'BillReminders' },
    { label: 'Staff', icon: 'people-outline', color: '#059669', bg: '#D1FAE5', route: 'AddStaff' },
];

const getQuickActionLabelKey = (label: string) => {
    if (label === 'Add Tenant') return 'dashboard.addTenant';
    if (label === 'Add Room') return 'dashboard.addRoom';
    if (label === 'Pre-Book') return 'dashboard.preBook';
    if (label === 'Add Receipt') return 'dashboard.addReceipt';
    if (label === 'Collected Rent') return 'dashboard.collectedRent';
    if (label === 'Add Expense') return 'dashboard.addExpense';
    if (label === 'Bills') return 'dashboard.bills';
    if (label === 'Staff') return 'dashboard.staff';
    if (label === 'Reminders') return 'dashboard.reminders';
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
            <Text style={[s.sectionTitle, { fontSize: fontSize, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }]}>
                {t('dashboard.quickActions')}
            </Text>
            <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 8 }]}>
                <View style={s.quickRow}>
                    {QUICK_ACTIONS.map((a, i) => (
                        <TouchableOpacity
                            key={i}
                            style={s.quickItem}
                            activeOpacity={0.75}
                            onPress={() => handleQuickAction(a)}
                        >
                            <View style={s.quickIconWrap}>
                                <View style={[s.iconCircle, { backgroundColor: isDark ? '#334155' : a.bg }]}>
                                    {a.icon === 'rupee' ? (
                                        <Text style={{ color: isDark ? theme.primary : a.color, fontSize: 18, fontWeight: '800' }}>₹</Text>
                                    ) : (
                                        <Ionicons name={a.icon as any} size={22} color={isDark ? theme.primary : a.color} />
                                    )}
                                </View>
                                {a.route === 'PreBooking' && data.prebookingsCount > 0 && (
                                    <View style={s.prebookBadge}>
                                        <Text style={s.prebookBadgeText}>{data.prebookingsCount}</Text>
                                    </View>
                                )}
                            </View>
                            <Text
                                style={[
                                    s.quickLabel,
                                    { fontSize: Math.max(9, fontSize - 4), color: isDark ? theme.textSecondary : '#475569' }
                                ]}
                                numberOfLines={2}
                            >
                                {t(getQuickActionLabelKey(a.label))}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
};

const s = StyleSheet.create({
    sectionBlock: { gap: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '800' },
    card: {
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }
    },
    quickRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
    },
    quickItem: { width: '23%', alignItems: 'center', marginVertical: 4, paddingHorizontal: 1 },
    quickIconWrap: { position: 'relative', marginBottom: 4 },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    prebookBadge: {
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
        borderWidth: 1,
        borderColor: '#FFF',
    },
    prebookBadgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '900',
    },
    quickLabel: {
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
        lineHeight: 14,
    },
});
