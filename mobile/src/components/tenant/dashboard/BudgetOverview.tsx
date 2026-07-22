import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../../theme/tenantTheme';

interface BudgetOverviewProps {
    budget: number;
    spent: number;
    progressAnim: Animated.Value;
    dueAmount: number;
    totalRentAmount: number;
    rentDueDate: string | null;
    formatDate: (date: string | null) => string;
}

// Pick a motivational label based on spending level
function getSpendingMood(spent: number, budget: number) {
    if (budget <= 0) return null; // no budget set
    const pct = (spent / budget) * 100;
    if (pct >= 100) return { label: 'Over limit', color: '#DC2626', icon: 'alert-circle' as const };
    if (pct >= 80)  return { label: 'Near limit', color: '#D97706', icon: 'warning' as const };
    if (pct >= 50)  return { label: 'Half used',  color: '#6D4AFF', icon: 'trending-up' as const };
    return           { label: 'On track',    color: '#16A34A', icon: 'checkmark-circle' as const };
}

export const BudgetOverview = ({
    budget, spent, progressAnim, dueAmount, totalRentAmount, rentDueDate, formatDate
}: BudgetOverviewProps) => {
    const navigation = useNavigation<any>();

    const overBudget = budget > 0 && spent > budget;
    const pctNum = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
    const isRentDue = dueAmount > 0;
    const mood = getSpendingMood(spent, budget);

    const displayRentAmount = (isRentDue ? dueAmount : totalRentAmount || 0).toLocaleString('en-IN');

    return (
        <View style={styles.wrapper}>

            {/* ═══════════════════════════════════════
                CARD 1 — RENT STATUS
                Purpose: Hostel payment status
            ═══════════════════════════════════════ */}
            <TouchableOpacity
                activeOpacity={isRentDue ? 0.88 : 1}
                onPress={() => isRentDue && navigation.navigate('Dues')}
                style={styles.card}
            >
                <View style={[styles.accentStrip, {
                    backgroundColor: isRentDue ? '#EF4444' : '#22C55E',
                }]} />

                <View style={[styles.iconBox, {
                    backgroundColor: isRentDue ? '#FEF2F2' : '#F0FDF4',
                }]}>
                    <Ionicons
                        name="business"
                        size={22}
                        color={isRentDue ? '#DC2626' : '#16A34A'}
                    />
                </View>

                <View style={styles.cardInfo}>
                    <Text style={styles.cardLabel}>HOSTEL RENT</Text>
                    <Text style={[styles.cardAmount, {
                        color: isRentDue ? '#DC2626' : '#16A34A',
                    }]}>
                        ₹{displayRentAmount}
                    </Text>
                    <Text style={[styles.cardSub, { color: isRentDue ? '#EF4444' : '#16A34A' }]}>
                        {isRentDue
                            ? (rentDueDate ? `Due by ${formatDate(rentDueDate)}` : 'Payment pending')
                            : 'No pending dues'}
                    </Text>
                </View>

                {isRentDue ? (
                    <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => navigation.navigate('Dues')}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.payBtnText}>Pay Now</Text>
                        <Ionicons name="arrow-forward-outline" size={13} color="#FFF" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.paidTag}>
                        <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                        <Text style={styles.paidTagText}>Paid</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* ═══════════════════════════════════════
                CARD 2 — THIS MONTH'S EXPENSES
                Purpose: Personal spending tracker
                Clear label: "What you spent this month"
                NOT "budget" — that's confusing
            ═══════════════════════════════════════ */}
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Expenses')}
                style={styles.card}
            >
                <View style={[styles.accentStrip, {
                    backgroundColor: overBudget ? '#EF4444' : theme.colors.primary,
                }]} />

                <View style={[styles.iconBox, {
                    backgroundColor: overBudget ? '#FEF2F2' : theme.colors.primarySoft,
                }]}>
                    <Ionicons
                        name="trending-up-outline"
                        size={20}
                        color={overBudget ? theme.colors.danger : theme.colors.primary}
                    />
                </View>

                <View style={styles.cardInfo}>
                    {/* Label clearly explains what this is */}
                    <Text style={styles.cardLabel}>THIS MONTH'S SPENDING</Text>

                    <View style={styles.spendRow}>
                        <Text style={[styles.cardAmount, {
                            color: overBudget ? '#DC2626' : theme.colors.text,
                            fontSize: 20,
                        }]}>
                            ₹{spent > 0 ? spent.toLocaleString('en-IN') : '0'}
                        </Text>
                        {/* Mood chip — only if budget is set */}
                        {mood && (
                            <View style={[styles.moodChip, {
                                backgroundColor: mood.color + '18',
                            }]}>
                                <Ionicons name={mood.icon} size={10} color={mood.color} />
                                <Text style={[styles.moodText, { color: mood.color }]}>
                                    {mood.label}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Context line — different depending on budget setup */}
                    {budget > 0 ? (
                        <>
                            {/* Progress bar */}
                            <View style={styles.progressTrack}>
                                <Animated.View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: progressAnim.interpolate({
                                                inputRange: [0, 100],
                                                outputRange: ['0%', '100%'],
                                            }),
                                            backgroundColor: overBudget ? '#EF4444' : theme.colors.primary,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={styles.cardSub}>
                                {overBudget
                                    ? `₹${(spent - budget).toLocaleString('en-IN')} over your ₹${budget.toLocaleString('en-IN')} limit`
                                    : `${pctNum}% of ₹${budget.toLocaleString('en-IN')} limit used`}
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.cardSub}>
                            {spent > 0
                                ? 'Tap to see full breakdown →'
                                : 'No expenses logged this month yet'}
                        </Text>
                    )}
                </View>

                <Ionicons name="chevron-forward" size={14} color={theme.colors.textSubtle} />
            </TouchableOpacity>

        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginHorizontal: 16,
        gap: 10,
        marginBottom: 4,
    },

    // ── Shared card shell
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 14,
        paddingRight: 14,
        paddingLeft: 10,
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },

    // ── Left accent strip — instantly communicates status
    accentStrip: {
        width: 4,
        alignSelf: 'stretch',
        borderRadius: 2,
        marginRight: 2,
    },

    // ── Icon box
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },

    // ── Card text block
    cardInfo: {
        flex: 1,
        gap: 3,
    },
    cardLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.colors.textSubtle,
        letterSpacing: 0.6,
    },
    cardAmount: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
        color: theme.colors.text,
    },
    cardSub: {
        fontSize: 11,
        fontWeight: '500',
        color: theme.colors.textMuted,
        marginTop: 1,
    },

    // ── Spend row: amount + mood chip
    spendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    moodChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 20,
    },
    moodText: {
        fontSize: 10,
        fontWeight: '700',
    },

    // ── Progress bar (budget mode)
    progressTrack: {
        height: 4,
        backgroundColor: '#EBEBF0',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 2,
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },

    // ── Rent card CTA
    payBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#DC2626',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        flexShrink: 0,
    },
    payBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    paidTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        flexShrink: 0,
    },
    paidTagText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#16A34A',
    },
});
