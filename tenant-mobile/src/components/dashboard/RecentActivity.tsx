import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Wallet, Clock, TrendingDown, ArrowUpRight } from 'lucide-react-native';
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
            {/* Header */}
            <View style={styles.sectionHeader}>
                <View style={styles.titleRow}>
                    <View style={styles.sectionDot} />
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                </View>
                <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => navigation.navigate('Expenses')}
                    style={styles.viewAllBtn}
                >
                    <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
            </View>

            {recentPayments.length > 0 ? (
                <View style={{ gap: 8 }}>
                    {recentPayments.map((p, idx) => {
                        const isPayment = p.mode === 'Payment';
                        const accentColor = isPayment ? theme.colors.success : theme.colors.danger;
                        const accentSoft = isPayment ? theme.colors.successSoft : theme.colors.dangerSoft;
                        const AmountIcon = isPayment ? Wallet : TrendingDown;

                        let IconComponent: any = Wallet;
                        if (!isPayment) {
                            const catTheme = getCategoryTheme(p.cat);
                            IconComponent = catTheme.Icon;
                        }

                        return (
                            <View key={p.id} style={styles.card}>
                                {/* Icon */}
                                <View style={[styles.iconCircle, { backgroundColor: accentSoft }]}>
                                    <IconComponent size={20} color={accentColor} strokeWidth={2.2} />
                                </View>

                                {/* Info */}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle} numberOfLines={1}>{p.title}</Text>
                                    <View style={styles.cardDateRow}>
                                        <Clock size={10} color={theme.colors.textSubtle} />
                                        <Text style={styles.cardDate}>
                                            {formatDate(p.date)} · {formatTime(p.date)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Amount */}
                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                    <Text style={[styles.cardAmount, { color: accentColor }]}>
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
                <View style={styles.emptyWrap}>
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
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionDot: {
        width: 4,
        height: 18,
        borderRadius: 2,
        backgroundColor: theme.colors.primary,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: -0.3,
    },
    viewAllBtn: {
        backgroundColor: theme.colors.primarySoft,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    viewAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 3,
    },
    cardDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardDate: {
        fontSize: 11,
        color: theme.colors.textSubtle,
        fontWeight: '500',
    },
    cardAmount: {
        fontSize: 16,
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
    emptyWrap: {
        paddingTop: 10,
    },
});
