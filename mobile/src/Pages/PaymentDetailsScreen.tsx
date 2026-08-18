import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { DUMMY_PAYMENTS } from '../constants/dummyData';

export const PaymentDetailsScreen = ({ route, navigation }: any) => {
    const { id } = route.params || { id: '1' };
    const { theme, isDark } = useTheme();
    const payment = DUMMY_PAYMENTS.find(p => p.id === id) || DUMMY_PAYMENTS[0];

    const isPaid = payment.status === 'Paid';
    const statusColor = isPaid ? '#10B981' : payment.status === 'Pending' ? '#F59E0B' : '#EF4444';

    return (
        <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader
                title="Payment Details"
                subtitle="Transaction details & status"
                showBack={true}
            />
            <ScrollView 
                style={styles.content} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
            >
                {/* Main Card */}
                <View style={[
                    styles.mainCard,
                    {
                        backgroundColor: theme.cardBg,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                    }
                ]}>
                    {/* Header with Status */}
                    <View style={styles.cardHeaderSection}>
                        <View style={[styles.statusIconBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7' }]}>
                            <Ionicons name="checkmark-circle" size={24} color={statusColor} />
                        </View>
                        <View style={styles.statusTextCol}>
                            <View style={styles.statusTitleRow}>
                                <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>
                                    Payment {payment.status}
                                </Text>
                                <View style={[styles.livePill, { backgroundColor: isDark ? `${statusColor}25` : `${statusColor}18` }]}>
                                    <Text style={[styles.livePillText, { color: statusColor }]}>{payment.status.toUpperCase()}</Text>
                                </View>
                            </View>
                            <Text style={[styles.statusTimeText, { color: theme.textSecondary }]}>{payment.date || 'Recent Transaction'}</Text>
                        </View>
                    </View>

                    {/* Compact Covered Total Received Box */}
                    <View style={[
                        styles.amountCoveredBox,
                        {
                            backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                        }
                    ]}>
                        <View style={styles.amountLeftCol}>
                            <Text style={[styles.amountLabelText, { color: theme.textSecondary }]}>Total Received</Text>
                            <Text style={[styles.amountValueText, { color: '#10B981' }]}>
                                ₹{Number(payment.amount).toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={[styles.modeBadge, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF', borderColor: isDark ? 'rgba(99, 102, 241, 0.4)' : '#C7D2FE' }]}>
                            <Ionicons name="card-outline" size={13} color="#6366F1" />
                            <Text style={styles.modeBadgeText}>{payment.method || 'UPI'}</Text>
                        </View>
                    </View>

                    {/* Subtle Divider */}
                    <View style={[styles.cardDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

                    {/* Details List */}
                    <View style={styles.detailsList}>
                        <View style={styles.detailRow}>
                            <View style={styles.detailLabelWrap}>
                                <Ionicons name="person-outline" size={15} color={theme.textSecondary} />
                                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Student Name</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{payment.studentName}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailLabelWrap}>
                                <Ionicons name="barcode-outline" size={15} color={theme.textSecondary} />
                                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Transaction ID</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: '#6366F1', fontWeight: '800' }]}>
                                {`TXN-${payment.id}9820`}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailLabelWrap}>
                                <Ionicons name="calendar-outline" size={15} color={theme.textSecondary} />
                                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Payment Date</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{payment.date}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailLabelWrap}>
                                <Ionicons name="wallet-outline" size={15} color={theme.textSecondary} />
                                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Payment Mode</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{payment.method || 'UPI / GPay'}</Text>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionBtnPrimary, { backgroundColor: theme.primary }]}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="arrow-back" size={18} color="#FFF" />
                        <Text style={styles.actionBtnPrimaryText}>Back to Transactions</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
    scrollContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 40,
    },
    mainCard: {
        borderRadius: 22,
        borderWidth: 1,
        padding: 18,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
    },
    cardHeaderSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    statusIconBadge: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusTextCol: {
        flex: 1,
        gap: 2,
    },
    statusTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    livePill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    livePillText: {
        fontSize: 9.5,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    statusTimeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    amountCoveredBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 14,
    },
    amountLeftCol: {
        gap: 2,
    },
    amountLabelText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    amountValueText: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    modeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    modeBadgeText: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#6366F1',
    },
    cardDivider: {
        height: 1,
        marginBottom: 14,
    },
    detailsList: {
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    detailLabelWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 13.5,
        fontWeight: '700',
    },
    actionsRow: {
        marginTop: 16,
    },
    actionBtnPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    actionBtnPrimaryText: {
        color: '#FFFFFF',
        fontSize: 14.5,
        fontWeight: '800',
    },
});

export default PaymentDetailsScreen;
