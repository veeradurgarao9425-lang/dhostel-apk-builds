import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Wallet, Clock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Phase3EmptyState } from '../../components/UIComponents';
import { theme } from '../../theme';
import { getCategoryTheme } from '../../constants/categoryTheme';

interface RecentActivityProps {
    recentPayments: any[];
    formatDate: (date: string | null) => string;
    formatTime: (date: string | null) => string;
}

export const RecentActivity = ({ recentPayments, formatDate, formatTime }: RecentActivityProps) => {
    const navigation = useNavigation<any>();

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => navigation.navigate('Expenses')}
                    style={styles.viewAllBtn}
                >
                    <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
            </View>

            {recentPayments.length > 0 ? (
                <View style={{ gap: 10 }}>
                    {recentPayments.map((p) => {
                        const isPayment = p.mode === 'Payment';
                        const accentColor = isPayment ? theme.colors.success : theme.colors.danger;
                        const accentSoft = isPayment ? theme.colors.successSoft : theme.colors.dangerSoft;

                        let IconComponent = Wallet;
                        if (!isPayment) {
                            const catTheme = getCategoryTheme(p.cat);
                            IconComponent = catTheme.Icon;
                        }

                        return (
                            <View key={p.id} style={styles.activityCard}>
                                {/* Icon */}
                                <View style={[styles.iconCircle, { backgroundColor: accentSoft }]}>
                                    <IconComponent size={22} color={accentColor} strokeWidth={2} />
                                </View>

                                {/* Info */}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.actTitle} numberOfLines={1}>{p.title}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                        <Clock size={10} color={theme.colors.textSubtle} />
                                        <Text style={styles.actDate}>{formatDate(p.date)} · {formatTime(p.date)}</Text>
                                    </View>
                                </View>

                                {/* Amount + badge */}
                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                    <Text style={[styles.actAmount, { color: accentColor }]}>
                                        {isPayment ? '+' : '-'}₹{Number(p.amount).toLocaleString('en-IN')}
                                    </Text>
                                    <View style={[styles.typeBadge, { backgroundColor: accentSoft }]}>
                                        <Text style={[styles.typeBadgeText, { color: accentColor }]}>
                                            {isPayment ? 'Paid' : 'Expense'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            ) : (
                <View style={{ paddingTop: 10 }}>
                    <Phase3EmptyState variant="activity" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.text,
    },
    viewAllBtn: {
        backgroundColor: theme.colors.primarySoft,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    viewAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    activityCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 2,
    },
    actDate: {
        fontSize: 11,
        color: theme.colors.textSubtle,
        fontWeight: '500',
    },
    actAmount: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
});
