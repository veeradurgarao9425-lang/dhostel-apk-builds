import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Phase3EmptyState } from '../UIComponents';
import { theme } from '../../../theme/tenantTheme';
import { getCategoryTheme } from '../../../constants/categoryTheme';

interface RecentActivityProps {
    recentPayments: any[];
    formatDate: (date: string | null) => string;
    formatTime: (date: string | null) => string;
}

// Map lucide icons to Ionicon equivalents for consistency
const IONICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
    Food: 'restaurant-outline',
    Transport: 'car-outline',
    Shopping: 'bag-handle-outline',
    Bills: 'receipt-outline',
    Entertainment: 'film-outline',
    Health: 'medkit-outline',
    Coffee: 'cafe-outline',
    Travel: 'airplane-outline',
    Rent: 'business-outline',
    Utilities: 'flash-outline',
    Gifts: 'gift-outline',
    Education: 'book-outline',
    Gym: 'barbell-outline',
    Pets: 'paw-outline',
    Family: 'people-outline',
    Fuel: 'flame-outline',
    Others: 'ellipsis-horizontal-outline',
    Payment: 'wallet-outline',
};

export const RecentActivity = ({ recentPayments, formatDate, formatTime }: RecentActivityProps) => {
    const navigation = useNavigation<any>();

    return (
        <View style={styles.section}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Expenses')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.viewAllBtn}
                >
                    <Text style={styles.viewAllText}>See All</Text>
                    <Ionicons name="arrow-forward" size={12} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {recentPayments.length > 0 ? (
                <View style={styles.listContainer}>
                    {recentPayments.map((p, idx) => {
                        const isPayment = p.mode === 'Payment';
                        const cat = isPayment ? 'Payment' : (p.cat || 'Others');
                        const catTheme = getCategoryTheme(cat);

                        // Use Ionicon name for the category
                        const iconName: keyof typeof Ionicons.glyphMap =
                            IONICON_MAP[cat] || 'ellipsis-horizontal-outline';

                        const accentColor = isPayment ? '#16A34A' : catTheme.color;
                        const iconBg = isPayment ? '#DCFCE7' : catTheme.bg;

                        const sign = '−';  // All transactions are outgoing — tenant never gets credits
                        const amtColor = isPayment ? '#6D4AFF' : '#EF4444'; // Purple for rent paid, red for expenses

                        // Format a clean label: "Payment · UPI" or "Food · Expense"
                        const categoryLabel = isPayment ? 'Rent Payment' : cat;

                        return (
                            <View key={p.id}>
                                <View style={styles.txRow}>
                                    {/* Left: Color-coded icon */}
                                    <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                                        <Ionicons
                                            name={iconName}
                                            size={20}
                                            color={accentColor}
                                        />
                                    </View>

                                    {/* Center: Title + Date */}
                                    <View style={styles.txMeta}>
                                        <Text style={styles.txTitle} numberOfLines={1}>
                                            {p.title}
                                        </Text>
                                        <View style={styles.txSubRow}>
                                            <View style={[styles.catDot, { backgroundColor: accentColor }]} />
                                            <Text style={styles.txCategory}>{categoryLabel}</Text>
                                            <Text style={styles.txDot}>·</Text>
                                            <Text style={styles.txDate}>{formatDate(p.date)}</Text>
                                        </View>
                                    </View>

                                    {/* Right: Amount */}
                                    <View style={styles.txRight}>
                                        <Text style={[styles.txAmount, { color: amtColor }]}>
                                            {sign}₹{Number(p.amount).toLocaleString('en-IN')}
                                        </Text>
                                        <View style={[styles.txBadge, {
                                            backgroundColor: isPayment ? '#EDE9FF' : '#FEE2E2',
                                        }]}>
                                            <Text style={[styles.txBadgeText, { color: amtColor }]}>
                                                {isPayment ? 'Rent Paid' : 'Spent'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Hairline divider (not after last item) */}
                                {idx < recentPayments.length - 1 && (
                                    <View style={styles.divider} />
                                )}
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

    // ── Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.primarySoft,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    viewAllText: {
        fontSize: 12,
        fontWeight: '800',
        color: theme.colors.primary,
    },

    // ── List container — single white card
    listContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },

    // ── Transaction row
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    txMeta: {
        flex: 1,
        gap: 4,
    },
    txTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        letterSpacing: -0.1,
    },
    txSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    catDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    txCategory: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textMuted,
    },
    txDot: {
        fontSize: 11,
        color: theme.colors.textSubtle,
    },
    txDate: {
        fontSize: 11,
        color: theme.colors.textSubtle,
        fontWeight: '500',
    },
    txRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    txAmount: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    txBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    txBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#EBEBF0',
        marginLeft: 70, // align with text, not icon
    },

    emptyWrap: {
        paddingTop: 10,
    },
});
