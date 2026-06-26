import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { showErrorToast, showSuccessToast } from '../hooks/Toastconfig';

export default function ComplaintsManagementScreen({ navigation }: any) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [complaints, setComplaints] = useState<any[]>([]);

    const fetchComplaints = useCallback(async (isRefresh = false) => {
        if (!user?.hostel_id) return;
        if (!isRefresh) setLoading(true);
        try {
            const res = await api.get(`/complaints/hostel/${user.hostel_id}`);
            if (res.data.success) {
                setComplaints(res.data.complaints || []);
            }
        } catch (e) {
            console.error('Failed to fetch complaints:', e);
            showErrorToast('Error', 'Failed to load complaints.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.hostel_id]);

    useEffect(() => {
        fetchComplaints();
    }, [fetchComplaints]);

    const updateStatus = async (complaintId: number, status: string) => {
        try {
            const res = await api.put(`/complaints/${complaintId}/status`, { status });
            if (res.data.success) {
                showSuccessToast('Updated', `Complaint marked as ${status}`);
                fetchComplaints();
            }
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to update status.');
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Complaints Management" onBack={() => navigation.goBack()} />
            
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : (
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchComplaints(true)} tintColor="#7C3AED" />}
                >
                    {complaints.length === 0 ? (
                        <EmptyState icon="construct-outline" title="No Complaints" message="There are no active complaints from tenants." />
                    ) : (
                        complaints.map((c) => (
                            <View key={c.complaint_id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.title}>{c.title}</Text>
                                        <Text style={styles.category}>{c.category}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: c.status === 'Resolved' ? '#DCFCE7' : c.status === 'In Progress' ? '#FEF3C7' : '#FEE2E2' }]}>
                                        <Text style={[styles.statusText, { color: c.status === 'Resolved' ? '#16A34A' : c.status === 'In Progress' ? '#D97706' : '#DC2626' }]}>
                                            {c.status}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.description}>{c.description || 'No additional details provided.'}</Text>
                                <Text style={styles.date}>Raised on: {new Date(c.created_at).toLocaleDateString()}</Text>

                                <View style={styles.actionsRow}>
                                    {c.status !== 'In Progress' && c.status !== 'Resolved' && (
                                        <TouchableOpacity style={[styles.btn, { backgroundColor: '#F59E0B' }]} onPress={() => updateStatus(c.complaint_id, 'In Progress')}>
                                            <Text style={styles.btnText}>Mark In Progress</Text>
                                        </TouchableOpacity>
                                    )}
                                    {c.status !== 'Resolved' && (
                                        <TouchableOpacity style={[styles.btn, { backgroundColor: '#10B981' }]} onPress={() => updateStatus(c.complaint_id, 'Resolved')}>
                                            <Text style={styles.btnText}>Mark Resolved</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
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
    category: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: '700' },
    description: { fontSize: 14, color: '#475569', marginVertical: 8, lineHeight: 20 },
    date: { fontSize: 12, color: '#94A3B8', marginBottom: 12 },
    actionsRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 8 },
    btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    btnText: { color: '#FFF', fontSize: 13, fontWeight: '600' }
});
