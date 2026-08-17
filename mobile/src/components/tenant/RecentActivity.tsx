import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface RecentActivityProps {
    recentPayments: any[];
    formatDate: (date: string | null) => string;
    formatTime: (date: string | null) => string;
}

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

export const RecentActivity = ({ recentPayments, formatDate }: RecentActivityProps) => {
    const navigation = useNavigation<any>();

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('AllExpenses')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.viewAllBtn}
                >
                    <Text style={styles.viewAllText}>See All</Text>
                    <Ionicons name="arrow-forward" size={12} color="#7C3AED" />
                </TouchableOpacity>
            </View>

            {recentPayments.length > 0 ? (
                <View style={styles.listContainer}>
                    {recentPayments.map((p, idx) => {
                        const isPayment = p.mode === 'Payment';
                        const isRejected =
                            p.status === 'Rejected' ||
                            p.verification_status === 'Rejected' ||
                            (p.title || '').toLowerCase().includes('rejected');
                        const cat = isPayment ? 'Payment' : (p.cat || 'Others');
                        const iconName: keyof typeof Ionicons.glyphMap = isRejected
                            ? 'close-circle-outline'
                            : IONICON_MAP[cat] || 'ellipsis-horizontal-outline';
                        const accentColor = isRejected ? '#EF4444' : isPayment ? '#16A34A' : '#7C3AED';
                        const iconBg = isRejected ? '#FEE2E2' : isPayment ? '#DCFCE7' : '#F4F1FF';
                        const sign = '−';
                        const amtColor = '#EF4444';
                        const badgeBg = isRejected ? '#FEE2E2' : isPayment ? '#DCFCE7' : '#FEE2E2';
                        const badgeTextColor = isRejected ? '#EF4444' : isPayment ? '#16A34A' : '#EF4444';
                        const badgeText = isRejected ? 'Rejected' : isPayment ? 'Rent Paid' : 'Spent';
                        const categoryLabel = isRejected ? 'Payment Rejected' : isPayment ? 'Rent Payment' : cat;

                        return (
                            <View key={p.id}>
                                <View style={styles.txRow}>
                                    <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                                        <Ionicons name={iconName} size={20} color={accentColor} />
                                    </View>

                                    <View style={styles.txMeta}>
                                        <Text style={[styles.txTitle, isRejected && { color: '#EF4444' }]} numberOfLines={1}>
                                            {p.title}
                                        </Text>
                                        <View style={styles.txSubRow}>
                                            <View style={[styles.catDot, { backgroundColor: accentColor }]} />
                                            <Text style={[styles.txCategory, isRejected && { color: '#EF4444' }]}>{categoryLabel}</Text>
                                            <Text style={styles.txDot}>·</Text>
                                            <Text style={styles.txDate}>{formatDate(p.date)}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.txRight}>
                                        <Text style={[styles.txAmount, { color: amtColor }]}>
                                            {sign}₹{Number(p.amount).toLocaleString('en-IN')}
                                        </Text>
                                        <View style={[styles.txBadge, { backgroundColor: badgeBg }]}>
                                            <Text style={[styles.txBadgeText, { color: badgeTextColor }]}>
                                                {badgeText}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {idx < recentPayments.length - 1 && (
                                    <View style={styles.divider} />
                                )}
                            </View>
                        );
                    })}
                </View>
            ) : (
                <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>No recent transactions found.</Text>
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
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F4F1FF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    viewAllText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#7C3AED',
    },
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
        color: '#0F172A',
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
        color: '#64748B',
    },
    txDot: {
        fontSize: 11,
        color: '#94A3B8',
    },
    txDate: {
        fontSize: 11,
        color: '#94A3B8',
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
        marginLeft: 70,
    },
    emptyWrap: {
        padding: 20,
        backgroundColor: '#FFF',
        borderRadius: 16,
        alignItems: 'center',
    },
    emptyText: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: '500',
    },
});
