import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Wallet, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { theme } from '../../theme';

interface BudgetOverviewProps {
    budget: number;
    spent: number;
    progressAnim: Animated.Value;
    dueAmount: number;
    totalRentAmount: number;
    rentDueDate: string | null;
    formatDate: (date: string | null) => string;
}

export const BudgetOverview = ({
    budget, spent, progressAnim, dueAmount, totalRentAmount, rentDueDate, formatDate
}: BudgetOverviewProps) => {
    const navigation = useNavigation<any>();

    const overBudget = budget > 0 && spent > budget;

    return (
        <View style={styles.container}>
            {/* ── MAIN FOCUS: RENT DUE ── */}
            <TouchableOpacity 
                activeOpacity={dueAmount > 0 ? 0.8 : 1}
                onPress={() => dueAmount > 0 ? navigation.navigate('Payments') : undefined}
                style={[styles.dueCard, { borderColor: dueAmount > 0 ? theme.colors.dangerSoft : theme.colors.successSoft }]}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>
                    <View style={[styles.iconWrap, { backgroundColor: dueAmount > 0 ? theme.colors.dangerSoft : theme.colors.successSoft }]}>
                        {dueAmount > 0
                            ? <AlertCircle size={24} color={theme.colors.danger} strokeWidth={2.5} />
                            : <CheckCircle2 size={24} color={theme.colors.successDark} strokeWidth={2.5} />
                        }
                    </View>
                    
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Text style={styles.dueTitleText}>
                                {dueAmount > 0 ? 'Rent Due' : 'Rent Cleared'}
                            </Text>
                            {dueAmount > 0 && rentDueDate && (
                                <View style={styles.dueBadge}>
                                    <Text style={styles.dueBadgeText}>Due {formatDate(rentDueDate)}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.dueAmountText, { color: dueAmount > 0 ? theme.colors.danger : theme.colors.successDark }]}>
                            ₹{(dueAmount > 0 ? dueAmount : (totalRentAmount || 0)).toLocaleString('en-IN')}
                        </Text>
                    </View>

                    {dueAmount > 0 ? (
                        <View style={[styles.payBtnSolid, { backgroundColor: theme.colors.danger }]}>
                            <Text style={styles.payBtnSolidText}>Pay Now</Text>
                        </View>
                    ) : (
                        <View style={[styles.dueBadge, { backgroundColor: theme.colors.successSoft }]}>
                            <Text style={[styles.dueBadgeText, { color: theme.colors.successDark }]}>All Paid</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            {/* ── SMALL BUDGET ROW ── */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Expenses')} style={styles.smallBudgetRow}>
                <View style={{ width: '100%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={styles.smallBudgetLeft}>
                            <Wallet size={16} color={theme.colors.primary} strokeWidth={2} />
                            <Text style={styles.smallBudgetLabel}>Monthly Budget</Text>
                        </View>
                        <View style={styles.smallBudgetRight}>
                            <Text style={styles.smallBudgetAmount}>
                                <Text style={[styles.smallBudgetSpent, overBudget && { color: theme.colors.danger }]}>
                                    ₹{spent.toLocaleString('en-IN')}
                                </Text>
                                <Text style={styles.smallBudgetLimit}> / ₹{budget > 0 ? budget.toLocaleString('en-IN') : '0'}</Text>
                            </Text>
                            <ChevronRight size={16} color={theme.colors.textMuted} strokeWidth={2.5} style={{ marginLeft: 6 }} />
                        </View>
                    </View>
                    <View style={{ height: 6, backgroundColor: 'rgba(109, 74, 255, 0.15)', borderRadius: 3, overflow: 'hidden' }}>
                        <Animated.View style={{ height: '100%', width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: theme.colors.success, borderRadius: 3 }} />
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 16,
        gap: 16,
    },
    // SHARED STYLES
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // DUE CARD
    dueCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
    },
    dueContent: {
        padding: 20,
    },
    dueHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    dueHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dueTitleText: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.text,
    },
    dueBadge: {
        backgroundColor: theme.colors.dangerSoft,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    dueBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.danger,
    },
    dueAmountText: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    payBtnSolid: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    payBtnSolidText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },

    // SMALL BUDGET ROW
    smallBudgetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.primarySoft,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(109, 74, 255, 0.1)',
    },
    smallBudgetLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    smallBudgetLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.primaryDark,
    },
    smallBudgetRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    smallBudgetAmount: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    smallBudgetSpent: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.colors.primaryDark,
    },
    smallBudgetLimit: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
});
