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
    const [payments, setPayments] = useState<any[]>([]);
    
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProof, setSelectedProof] = useState<string | null>(null);

    const fetchPayments = useCallback(async (isRefresh = false) => {
        if (!user?.hostel_id) return;
        if (!isRefresh) setLoading(true);
        try {
            const res = await api.get('/fees/payments');
            if (res.data.success) {
                const list = res.data.data || [];
                const pending = list.filter((p: any) => p.verification_status === 'Pending');
                setPayments(pending);
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
        try {
            const res = await api.put(`/fees/payments/${paymentId}/verify`, { status });
            if (res.data.success) {
                showSuccessToast('Success', `Payment ${status}`);
                fetchPayments(true);
            }
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to verify payment.');
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader 
                title="Verify Payment Proofs" 
                alignLeft
                subtitle="Review payments submitted via tenant app"
                onBack={() => navigation.goBack()} 
            />
            
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : (
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPayments(true)} tintColor="#7C3AED" />}
                >
                    {payments.length === 0 ? (
                        <EmptyState illustration="pending" title="All Caught Up" subtitle="There are no pending payment proofs to verify." />
                    ) : (
                        payments.map((p) => (
                            <View key={p.payment_id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.title}>{p.first_name} {p.last_name}</Text>
                                        <Text style={styles.subtitle}>₹{p.amount_paid} • {p.payment_for_month}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                                        <Text style={[styles.statusText, { color: '#D97706' }]}>Pending</Text>
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

                                <View style={styles.actionsRow}>
                                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#DC2626' }]} onPress={() => handleVerify(p.payment_id, 'Rejected')}>
                                        <Text style={styles.btnText}>Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#10B981' }]} onPress={() => handleVerify(p.payment_id, 'Verified')}>
                                        <Text style={styles.btnText}>Verify & Accept</Text>
                                    </TouchableOpacity>
                                </View>
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
    scrollContent: { padding: 16, paddingBottom: 40 },
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
