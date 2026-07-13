import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
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
    const pctNum = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
    const isRentDue = dueAmount > 0;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(8)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 9 }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.wrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* ── RENT ROW (compact horizontal card) ── */}
            <TouchableOpacity
                activeOpacity={isRentDue ? 0.85 : 1}
                onPress={() => isRentDue && navigation.navigate('Dues')}
                style={[styles.rentRow, { borderColor: isRentDue ? '#FECACA' : '#BBF7D0' }]}
            >
                {/* Icon */}
                <View style={[styles.rentIconWrap, { backgroundColor: isRentDue ? theme.colors.dangerSoft : theme.colors.successSoft }]}>
                    <Ionicons
                        name={isRentDue ? 'home' : 'checkmark-circle'}
                        size={20}
                        color={isRentDue ? theme.colors.danger : theme.colors.successDark}
                    />
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                    <Text style={styles.rentLabel}>Monthly Rent</Text>
                    <View style={styles.rentAmountRow}>
                        <Text style={[styles.rentAmount, { color: isRentDue ? theme.colors.danger : theme.colors.successDark }]}>
                            ₹{(isRentDue ? dueAmount : totalRentAmount || 0).toLocaleString('en-IN')}
                        </Text>
                        <View style={[styles.dueBadge, { backgroundColor: isRentDue ? theme.colors.dangerSoft : theme.colors.successSoft }]}>
                            <Text style={[styles.rentSub, { color: isRentDue ? theme.colors.danger : theme.colors.successDark }]}>
                                {isRentDue
                                    ? (rentDueDate ? `Due ${formatDate(rentDueDate)}` : 'Pending')
                                    : 'Cleared'
                                }
                            </Text>
                        </View>
                    </View>
                </View>

                {/* CTA */}
                {isRentDue ? (
                    <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => navigation.navigate('Dues')}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.payBtnText}>Pay</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.paidChip}>
                        <Ionicons name="checkmark" size={12} color={theme.colors.successDark} />
                        <Text style={styles.paidChipText}>Paid</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* ── BUDGET ROW (compact inline) ── */}
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Expenses')}
                style={styles.budgetRow}
            >
                {/* Icon */}
                <View style={[styles.budgetIconWrap, { backgroundColor: overBudget ? theme.colors.dangerSoft : theme.colors.primarySoft }]}>
                    <Ionicons
                        name="wallet"
                        size={18}
                        color={overBudget ? theme.colors.danger : theme.colors.primary}
                    />
                </View>

                {/* Label + bar */}
                <View style={{ flex: 1, gap: 5 }}>
                    <View style={styles.budgetTopRow}>
                        <Text style={styles.budgetLabel}>Budget</Text>
                        <Text style={[styles.budgetAmt, overBudget && { color: theme.colors.danger }]}>
                            ₹{spent.toLocaleString('en-IN')}
                            <Text style={styles.budgetOf}> / ₹{budget > 0 ? budget.toLocaleString('en-IN') : '—'}</Text>
                        </Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                {
                                    width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                                    backgroundColor: overBudget ? theme.colors.danger : theme.colors.primary,
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.budgetHint}>
                        {budget > 0
                            ? (overBudget ? `₹${(spent - budget).toLocaleString('en-IN')} over budget` : `${pctNum}% used this month`)
                            : 'Tap to set a monthly budget'}
                    </Text>
                </View>

                <Ionicons name="chevron-forward" size={14} color={theme.colors.textSubtle} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginHorizontal: 16,
        gap: 10,
        marginBottom: 8,
    },

    // ── RENT ROW
    rentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    rentIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rentLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textMuted,
        marginBottom: 2,
    },
    rentAmountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    rentAmount: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    dueBadge: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    rentSub: {
        fontSize: 10,
        fontWeight: '700',
    },
    payBtn: {
        backgroundColor: theme.colors.danger,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 99,
    },
    payBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    paidChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.successSoft,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 99,
    },
    paidChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.successDark,
    },

    // ── BUDGET ROW
    budgetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
    },
    budgetIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    budgetTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    budgetLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textMuted,
    },
    budgetAmt: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.colors.primaryDark,
    },
    budgetOf: {
        fontSize: 11,
        fontWeight: '500',
        color: theme.colors.textMuted,
    },
    progressTrack: {
        height: 5,
        backgroundColor: theme.colors.borderSoft,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    budgetHint: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.textSubtle,
    },
});
