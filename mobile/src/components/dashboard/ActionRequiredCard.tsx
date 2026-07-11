import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface ActionRequiredCardProps {
    data: {
        collectionStats: {
            overdueCount: number;
            overdueAmount: number;
            dueTodayCount: number;
            dueThisWeekCount: number;
            pending: number;
        };
        unpaidStudents: any[];
        upcomingDues: any[];
    };
    fmt: (n: number) => string;
}

export const ActionRequiredCard = ({ data, fmt }: ActionRequiredCardProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();

    const { overdueCount, overdueAmount, dueTodayCount, dueThisWeekCount } = data.collectionStats;

    // Nothing to show
    if (overdueCount === 0 && dueTodayCount === 0 && dueThisWeekCount === 0) return null;

    const rows = [
        overdueCount > 0 && {
            key: 'overdue',
            icon: 'alert-circle' as const,
            iconColor: '#DC2626',
            iconBg: isDark ? 'rgba(220,38,38,0.15)' : '#FEF2F2',
            label: `${overdueCount} Overdue`,
            sublabel: `₹${overdueAmount > 0 ? fmt(overdueAmount) : '—'} pending`,
            badgeColor: '#DC2626',
            badgeBg: isDark ? 'rgba(220,38,38,0.18)' : '#FEE2E2',
            tab: 'Overdue',
        },
        dueTodayCount > 0 && {
            key: 'today',
            icon: 'time' as const,
            iconColor: '#EA580C',
            iconBg: isDark ? 'rgba(234,88,12,0.15)' : '#FFF7ED',
            label: `${dueTodayCount} Due Today`,
            sublabel: 'Collect before end of day',
            badgeColor: '#EA580C',
            badgeBg: isDark ? 'rgba(234,88,12,0.18)' : '#FFEDD5',
            tab: 'Next 7 Days',
        },
        dueThisWeekCount > 0 && {
            key: 'week',
            icon: 'calendar' as const,
            iconColor: '#D97706',
            iconBg: isDark ? 'rgba(217,119,6,0.15)' : '#FFFBEB',
            label: `${dueThisWeekCount} Due This Week`,
            sublabel: 'Upcoming in next 7 days',
            badgeColor: '#D97706',
            badgeBg: isDark ? 'rgba(217,119,6,0.18)' : '#FEF3C7',
            tab: 'Next 7 Days',
        },
    ].filter(Boolean) as any[];

    return (
        <View style={s.sectionBlock}>
            {/* Section header */}
            <View style={s.sectionHeaderRow}>
                <View style={s.sectionTitleRow}>
                    <Ionicons name="warning" size={13} color="#DC2626" />
                    <Text style={[s.sectionTitle, { fontSize: fontSize - 1, color: theme.textSecondary }]}>
                        ACTION REQUIRED
                    </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('PendingTab')} activeOpacity={0.7}>
                    <Text style={[s.seeAll, { color: theme.primary }]}>View All →</Text>
                </TouchableOpacity>
            </View>

            {/* Card */}
            <View style={[s.card, {
                backgroundColor: theme.cardBg,
                borderColor: isDark ? '#334155' : '#FEE2E2',
            }]}>
                {rows.map((row, idx) => (
                    <TouchableOpacity
                        key={row.key}
                        style={[
                            s.row,
                            idx < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? '#1E293B' : '#F8F0F0' }
                        ]}
                        activeOpacity={0.75}
                        onPress={() => navigation.navigate('PendingTab', { tab: row.tab })}
                    >
                        {/* Icon */}
                        <View style={[s.iconBox, { backgroundColor: row.iconBg }]}>
                            <Ionicons name={row.icon} size={18} color={row.iconColor} />
                        </View>

                        {/* Text */}
                        <View style={s.textCol}>
                            <Text style={[s.rowLabel, { color: isDark ? '#F8FAFC' : '#1E293B', fontSize }]}>
                                {row.label}
                            </Text>
                            <Text style={[s.rowSub, { color: theme.textSecondary, fontSize: fontSize - 3 }]}>
                                {row.sublabel}
                            </Text>
                        </View>

                        {/* Badge + chevron */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[s.badge, { backgroundColor: row.badgeBg }]}>
                                <Text style={[s.badgeText, { color: row.badgeColor }]}>{row.label.split(' ')[0]}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                        </View>
                    </TouchableOpacity>
                ))}

                {/* Bottom: View all dues link */}
                <TouchableOpacity
                    style={[s.viewAllRow, { backgroundColor: isDark ? 'rgba(124,58,237,0.08)' : '#F5F3FF' }]}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('PendingTab', { tab: 'All Dues' })}
                >
                    <Ionicons name="wallet-outline" size={14} color={theme.primary} />
                    <Text style={[s.viewAllText, { color: theme.primary, fontSize: fontSize - 2 }]}>
                        View All Pending Dues
                    </Text>
                    <Ionicons name="arrow-forward" size={13} color={theme.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const s = StyleSheet.create({
    sectionBlock: { gap: 8 },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    seeAll: { fontSize: 12, fontWeight: '700' },

    card: {
        borderRadius: 20,
        borderWidth: 1.5,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#DC2626',
        shadowOpacity: 0.07,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        gap: 12,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textCol: { flex: 1 },
    rowLabel: { fontWeight: '700', marginBottom: 1 },
    rowSub: { fontWeight: '500' },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    viewAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 11,
        paddingHorizontal: 16,
    },
    viewAllText: {
        fontWeight: '700',
    },
});
