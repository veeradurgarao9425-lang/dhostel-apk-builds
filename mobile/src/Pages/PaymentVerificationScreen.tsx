import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, Image, Modal
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { showErrorToast, showSuccessToast } from '../hooks/Toastconfig';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentVerificationScreen({ navigation }: any) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [allPayments, setAllPayments] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'Pending' | 'Verified' | 'Rejected'>('Pending');
    const [verifyingId, setVerifyingId] = useState<number | null>(null);
    
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProof, setSelectedProof] = useState<string | null>(null);

    const fetchPayments = useCallback(async (isRefresh = false) => {
        if (!user?.hostel_id) return;
        if (!isRefresh) setLoading(true);
        try {
            const res = await api.get('/fees/payments');
            if (res.data.success) {
                setAllPayments(res.data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch payments:', e);
            showErrorToast('Error', 'Failed to load payments.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.hostel_id]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handleVerify = async (paymentId: number, status: string) => {
        if (verifyingId !== null) return; // prevent double clicks
        setVerifyingId(paymentId);
        try {
            const res = await api.put(`/fees/payments/${paymentId}/verify`, { status });
            if (res.data.success) {
                showSuccessToast('Success', `Payment ${status}`);
                await fetchPayments(true);
            }
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to verify payment.');
        } finally {
            setVerifyingId(null);
        }
    };

    // Filter payments list based on tab
    const paymentsToShow = allPayments.filter((p: any) => {
        if (activeTab === 'Pending') return p.verification_status === 'Pending';
        if (activeTab === 'Verified') return p.verification_status === 'Verified' || p.verification_status === 'Approved';
        if (activeTab === 'Rejected') return p.verification_status === 'Rejected';
        return false;
    });

    // Calculate total received this month (Approved/Verified payments only)
    const receivedThisMonth = allPayments
        .filter((p: any) => {
            const isApproved = p.verification_status === 'Verified' || p.verification_status === 'Approved';
            if (!isApproved) return false;
            const payDate = new Date(p.payment_date);
            const now = new Date();
            return payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum: number, p: any) => sum + Number(p.amount_paid || 0), 0);

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Verify Payment Proofs" 
                alignLeft
                subtitle="Review payments submitted via tenant app"
                onBack={() => navigation.goBack()} 
            />

            {/* Received this Month Summary Card */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                    <Ionicons name="cash" size={24} color="#10B981" />
                </View>
                <View style={{ marginLeft: 12 }}>
                    <Text style={styles.summaryLabel}>Received This Month</Text>
                    <Text style={styles.summaryValue}>₹{receivedThisMonth.toLocaleString('en-IN')}</Text>
                </View>
            </View>

            {/* Tabs Header */}
            <View style={styles.tabRow}>
                {(['Pending', 'Verified', 'Rejected'] as const).map((tab) => {
                    const count = allPayments.filter((p: any) => {
                        if (tab === 'Pending') return p.verification_status === 'Pending';
                        if (tab === 'Verified') return p.verification_status === 'Verified' || p.verification_status === 'Approved';
                        if (tab === 'Rejected') return p.verification_status === 'Rejected';
                        return false;
                    }).length;
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabBtn, activeTab === tab && styles.tabActive]}
                            onPress={() => setActiveTab(tab)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab} ({count})
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : (
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPayments(true)} tintColor="#7C3AED" />}
                >
                    {paymentsToShow.length === 0 ? (
                        <EmptyState 
                            illustration="pending" 
                            title="No Payments Found" 
                            subtitle={`There are no ${activeTab.toLowerCase()} payments at this time.`} 
                        />
                    ) : (
                        paymentsToShow.map((p) => (
                            <View key={p.payment_id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                        <Text style={styles.title}>{p.first_name} {p.last_name}</Text>
                                        <Text style={styles.subtitle}>₹{p.amount_paid} • {p.payment_for_month}</Text>
                                    </View>
                                    <View style={[
                                        styles.statusBadge, 
                                        { 
                                            backgroundColor: p.verification_status === 'Pending' 
                                                ? '#FEF3C7' 
                                                : (p.verification_status === 'Verified' || p.verification_status === 'Approved')
                                                ? '#D1FAE5' 
                                                : '#FEE2E2' 
                                        }
                                    ]}>
                                        <Text style={[
                                            styles.statusText, 
                                            { 
                                                color: p.verification_status === 'Pending' 
                                                    ? '#D97706' 
                                                    : (p.verification_status === 'Verified' || p.verification_status === 'Approved')
                                                    ? '#065F46' 
                                                    : '#991B1B' 
                                            }
                                        ]}>
                                            {p.verification_status === 'Pending' 
                                                ? 'Pending' 
                                                : (p.verification_status === 'Verified' || p.verification_status === 'Approved')
                                                ? 'Approved' 
                                                : 'Rejected'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.date}>Date: {new Date(p.payment_date).toLocaleDateString()}</Text>

                                {p.proof_url ? (
                                    <TouchableOpacity 
                                        style={styles.proofBtn}
                                        onPress={() => {
                                            setSelectedProof(p.proof_url);
                                            setModalVisible(true);
                                        }}
                                    >
                                        <Ionicons name="image-outline" size={16} color="#7C3AED" />
                                        <Text style={styles.proofText}>View Proof Image</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={styles.noProof}>No proof image uploaded.</Text>
                                )}

                                {p.verification_status === 'Pending' && (
                                    <View style={styles.actionsRow}>
                                        {verifyingId === p.payment_id ? (
                                            <ActivityIndicator size="small" color="#7C3AED" style={{ paddingRight: 16 }} />
                                        ) : (
                                            <>
                                                <TouchableOpacity 
                                                    disabled={verifyingId !== null}
                                                    style={[styles.btn, { backgroundColor: '#DC2626' }]} 
                                                    onPress={() => handleVerify(p.payment_id, 'Rejected')}
                                                >
                                                    <Text style={styles.btnText}>Reject</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    disabled={verifyingId !== null}
                                                    style={[styles.btn, { backgroundColor: '#10B981' }]} 
                                                    onPress={() => handleVerify(p.payment_id, 'Verified')}
                                                >
                                                    <Text style={styles.btnText}>Verify & Accept</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            <Modal visible={modalVisible} transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalBg}>
                    <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
                        <Ionicons name="close-circle" size={36} color="#FFF" />
                    </TouchableOpacity>
                    {selectedProof && (
                        <Image 
                            source={{ uri: selectedProof }} 
                            style={styles.fullImage} 
                            resizeMode="contain" 
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F7FF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingTop: 8, paddingBottom: 40 },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    summaryIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#D1FAE5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0F172A',
        marginTop: 2,
    },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: '#EEF2FF',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        padding: 4,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 1,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#7C3AED',
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    title: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
    subtitle: { fontSize: 14, color: '#64748B', fontWeight: '600' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: '700' },
    date: { fontSize: 12, color: '#94A3B8', marginBottom: 12 },
    proofBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F3E8FF', borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
    proofText: { color: '#7C3AED', fontWeight: '600', fontSize: 13 },
    noProof: { color: '#94A3B8', fontStyle: 'italic', fontSize: 13, marginBottom: 12 },
    actionsRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 8 },
    btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    btnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalClose: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
    fullImage: { width: '100%', height: '80%' }
});
