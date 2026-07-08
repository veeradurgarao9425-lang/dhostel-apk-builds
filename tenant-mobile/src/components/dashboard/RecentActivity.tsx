import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import CategoryGlowBadge from '../../components/ui/CategoryGlowBadge';
import { Phase3EmptyState } from '../../components/UIComponents';

const TEXT_DARK = "#1F2937";
const TEXT_MID = "#6B7280";

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
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => navigation.navigate("Expenses")}>
                    <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
            </View>

            {recentPayments.length > 0 ? (
                <View style={{ gap: 12 }}>
                    {recentPayments.map((p) => (
                        <View key={p.id} style={[styles.globalCard, { paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, borderLeftColor: p.mode === 'Payment' ? '#10B981' : '#3B82F6', borderRadius: 14 }]}>
                            {p.mode === 'Payment' ? (
                                <View style={[styles.cardIconWrap, { width: 44, height: 44, borderRadius: 14, backgroundColor: '#D1FAE5' }]}>
                                    <Wallet size={20} color="#10B981" />
                                </View>
                            ) : (
                                <CategoryGlowBadge category={p.cat} size="sm" />
                            )}
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 }}>{p.title}</Text>
                                <Text style={{ fontSize: 11, color: TEXT_MID, fontWeight: '500' }}>{formatDate(p.date)} • {formatTime(p.date)}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 2 }}>
                                <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.3 }}>
                                    {p.mode === 'Payment' ? '+' : '-'}₹{p.amount.toLocaleString('en-IN')}
                                </Text>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: p.mode === 'Payment' ? '#10B981' : '#EF4444' }}>
                                    {p.mode === 'Payment' ? 'Paid' : 'Expense'}
                                </Text>
                            </View>
                        </View>
                    ))}
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
        marginBottom: 28,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
    viewAllText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2952F3',
    },
    globalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        borderWidth: 0,
        shadowColor: "#1F2937",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 3,
    },
    cardIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
