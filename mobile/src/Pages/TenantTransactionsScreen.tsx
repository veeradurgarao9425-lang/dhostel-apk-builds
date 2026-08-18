import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { EmptyState } from '../components/ui/EmptyState';

interface PaymentTransaction {
    payment_id: number;
    fee_id: number;
    amount: number;
    payment_date: string;
    payment_mode_id: number;
    payment_mode_name?: string;
    transaction_id: string | null;
    notes: string | null;
    fee_month: string;
    due_date: string;
}

export default function TenantTransactionsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme } = useTheme();
    const { showApiError } = useToast();

    const { studentId, studentName } = route.params || {};

    const [student, setStudent] = useState<any>(null);
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = async () => {
        if (!studentId) return;
        try {
            setLoading(true);
            const res = await api.get(`/students/${studentId}`);
            if (res.data.success) {
                setStudent(res.data.data);
                setTransactions(res.data.data.payment_history || []);
            }
        } catch (e) {
            console.error('Fetch tenant transactions error:', e);
            showApiError(e, 'Failed to fetch transaction history');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
        }, [studentId])
    );

    // Calculations
    const totalPaid = transactions.reduce((sum, t) => sum + parseFloat(t.amount as any || 0), 0);
    const lastPaymentDate = transactions.length > 0
        ? new Date(transactions[0].payment_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
        : 'N/A';

    const handleViewReceipt = (tx: PaymentTransaction) => {
        const feeData = {
            fee_id: tx.fee_id || tx.payment_id,
            first_name: student?.first_name || studentName?.split(' ')[0] || 'Student',
            last_name: student?.last_name || studentName?.split(' ')[1] || '',
            room_number: student?.room_number || 'N/A',
            paid_amount: tx.amount,
            phone: student?.phone || 'N/A',
            fee_month: tx.fee_month || (tx as any).payment_for_month || new Date(tx.payment_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            due_date: tx.due_date || tx.payment_date
        };
        navigation.navigate('Receipt', { feeData });
    };

    const renderTransactionItem = ({ item }: { item: PaymentTransaction }) => {
        const payDate = new Date(item.payment_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        return (
            <TouchableOpacity
                style={styles.txRow}
                onPress={() => handleViewReceipt(item)}
                activeOpacity={0.7}
            >
                <View style={styles.txIconBox}>
                    <Ionicons name="card" size={20} color="#10B981" />
                </View>
                <View style={styles.txInfo}>
                    <Text style={styles.txTitle}>
                        Rent Payment • {
                            [(item as any).payment_for_month, item.fee_month].find(m => m && m !== 'NA' && m !== 'N/A') || 
                            new Date(item.payment_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        }
                    </Text>
                    <Text style={styles.txSub}>Mode: {item.payment_mode_name || 'Online'} • {payDate}</Text>
                    <Text style={[styles.txSub, { marginTop: 4, fontStyle: 'italic', fontSize: 11 }]}>
                        {item.notes ? `Note: ${item.notes}` : 'Note: Rent payment successfully recorded'}
                    </Text>
                </View>
                <View style={styles.txRight}>
                    <Text style={styles.txAmount}>₹{parseFloat(item.amount as any).toLocaleString('en-IN')}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <AppHeader 
                title="Tenant Transactions" 
                alignLeft 
                subtitle="Complete payment history"
            />

            {loading ? (
                <SkeletonList count={5} />
            ) : (
                <View style={styles.content}>
                    {/* Top Student Card Summary */}
                    <View style={styles.summaryCard}>
                        <View style={styles.avatarBox}>
                            <Text style={styles.avatarTxt}>
                                {(student?.first_name || studentName || 'S')[0].toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.summaryInfo}>
                            <Text style={styles.studentName}>{student?.first_name} {student?.last_name || ''}</Text>
                            <Text style={styles.transactionCount}>{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</Text>

                            <View style={styles.divider} />

                            <View style={styles.row}>
                                <View style={styles.col}>
                                    <Text style={styles.lbl}>Total Paid</Text>
                                    <Text style={styles.val}>₹{totalPaid.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.col}>
                                    <Text style={styles.lbl}>Last Payment</Text>
                                    <Text style={styles.val}>{lastPaymentDate}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Transactions Section */}
                    <Text style={styles.sectionTitle}>Payment History</Text>
                    <FlatList
                        data={transactions}
                        keyExtractor={(item) => `tx-${item.payment_id}`}
                        renderItem={renderTransactionItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <EmptyState illustration="pending"
                                title="No Payments Yet"
                                subtitle="No payment transactions recorded for this tenant."
                            />
                        }
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFF' },

    content: { flex: 1, padding: 16 },

    // Student Card Summary
    summaryCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        marginBottom: 20,
    },
    avatarBox: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarTxt: { fontSize: 22, fontWeight: '900', color: '#FFF' },
    summaryInfo: { flex: 1 },
    studentName: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    transactionCount: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },

    row: { flexDirection: 'row', justifyContent: 'space-between' },
    col: { flex: 1 },
    lbl: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' },
    val: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginTop: 2 },

    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 4 },

    // Transactions list
    listContent: { paddingBottom: 50 },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
    },
    txIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#ECFDF5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    txInfo: { flex: 1, gap: 2 },
    txTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    txSub: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
    txRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    txAmount: { fontSize: 14, fontWeight: '800', color: '#10B981' },

    emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' }
});
