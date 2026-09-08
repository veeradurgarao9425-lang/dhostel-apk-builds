import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList, SkeletonCardList } from '../components/ui/SkeletonCard';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';

export default function RequestsManagementScreen({ navigation }: any) {
    const { user } = useAuth();
    const { showApiError, showSuccess, showError } = useToast();
    const confirm = useConfirmation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'Leaves' | 'Visitors'>('Leaves');
    const [leaves, setLeaves] = useState<any[]>([]);
    const [visitors, setVisitors] = useState<any[]>([]);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!user?.hostel_id) return;
        if (!isRefresh) setLoading(true);
        try {
            const [leaveRes, visitorRes] = await Promise.all([
                api.get(`/requests/leave/hostel/${user.hostel_id}`),
                api.get(`/requests/visitor/hostel/${user.hostel_id}`)
            ]);
            
            if (leaveRes.data.success) {
                setLeaves(leaveRes.data.leaves || []);
            }
            if (visitorRes.data.success) {
                setVisitors(visitorRes.data.visitors || []);
            }
        } catch (e) {
            console.error('Failed to fetch requests:', e);
            showApiError(e, 'Failed to load requests.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.hostel_id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateStatus = async (type: 'leave' | 'visitor', id: number, status: string) => {
        try {
            const endpoint = type === 'leave' 
                ? `/requests/leave/${id}/status`
                : `/requests/visitor/${id}/status`;
                
            const res = await api.put(endpoint, { status });
            if (res.data.success) {
                showSuccess(`${type === 'leave' ? 'Gate Pass / Leave' : 'Visitor Pass'} marked as ${status}.`);
                fetchData(true);
            }
        } catch (e: any) {
            showApiError(e, 'Failed to update status.');
        }
    };

    const handleActionWithConfirmation = (
        type: 'leave' | 'visitor', 
        id: number, 
        status: 'Approved' | 'Rejected', 
        name?: string
    ) => {
        const isApprove = status === 'Approved';
        const label = type === 'leave' ? 'Gate Pass / Leave' : 'Visitor Pass';
        
        confirm({
            title: `${isApprove ? 'Approve' : 'Reject'} ${label}?`,
            message: isApprove
                ? `Are you sure you want to approve this ${label.toLowerCase()}${name ? ` for ${name}` : ''}? An instant push notification will be sent to the tenant.`
                : `Are you sure you want to reject this ${label.toLowerCase()}${name ? ` for ${name}` : ''}?`,
            confirmText: isApprove ? 'Yes, Approve' : 'Yes, Reject',
            cancelText: 'Cancel',
            variant: isApprove ? 'info' : 'danger',
            onConfirm: async () => {
                await updateStatus(type, id, status);
            },
        });
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Leave & Visitor Requests" onBack={() => navigation.goBack()} />
            
            <View style={styles.tabRow}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'Leaves' && styles.tabActive]}
                    onPress={() => setActiveTab('Leaves')}
                >
                    <Text style={[styles.tabText, activeTab === 'Leaves' && styles.tabTextActive]}>Leave Requests</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'Visitors' && styles.tabActive]}
                    onPress={() => setActiveTab('Visitors')}
                >
                    <Text style={[styles.tabText, activeTab === 'Visitors' && styles.tabTextActive]}>Visitor Passes</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <SkeletonCardList count={4} />
            ) : (
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#7C3AED" />}
                >
                    {activeTab === 'Leaves' ? (
                        leaves.length === 0 ? (
                            <EmptyState illustration="notice" title="No Leave Requests" subtitle="No pending leave requests." />
                        ) : (
                            leaves.map(req => (
                                <View key={req.leave_id} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <View>
                                            <Text style={styles.title}>
                                                {req.first_name ? `${req.first_name} ${req.last_name || ''}`.trim() : `Student #${req.student_id}`}
                                                {req.room_number ? ` • Room ${req.room_number}` : ''}
                                            </Text>
                                            <Text style={styles.subtitle}>
                                                {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: req.status === 'Approved' ? '#DCFCE7' : req.status === 'Rejected' ? '#FEE2E2' : '#FEF3C7' }]}>
                                            <Text style={[styles.statusText, { color: req.status === 'Approved' ? '#16A34A' : req.status === 'Rejected' ? '#DC2626' : '#D97706' }]}>
                                                {req.status}
                                            </Text>
                                        </View>
                                    </View>
                                    {!!req.reason && <Text style={styles.description}>Reason: {req.reason}</Text>}
                                    <View style={styles.actionsRow}>
                                        {req.status === 'Pending' && (
                                            <>
                                                <TouchableOpacity 
                                                    style={[styles.btn, { backgroundColor: '#DC2626' }]} 
                                                    onPress={() => handleActionWithConfirmation('leave', req.leave_id, 'Rejected', req.first_name ? `${req.first_name} ${req.last_name || ''}`.trim() : undefined)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.btnText}>Reject</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    style={[styles.btn, { backgroundColor: '#10B981' }]} 
                                                    onPress={() => handleActionWithConfirmation('leave', req.leave_id, 'Approved', req.first_name ? `${req.first_name} ${req.last_name || ''}`.trim() : undefined)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.btnText}>Approve</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                </View>
                            ))
                        )
                    ) : (
                        visitors.length === 0 ? (
                            <EmptyState illustration="notice" title="No Visitor Requests" subtitle="No pending visitor passes." />
                        ) : (
                            visitors.map(req => (
                                <View key={req.visitor_id} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <View>
                                            <Text style={styles.title}>
                                                {req.visitor_name} {req.relation ? `(${req.relation})` : ''}
                                                {req.first_name ? ` • by ${req.first_name}` : ''}
                                            </Text>
                                            <Text style={styles.subtitle}>
                                                Date: {new Date(req.visit_date).toLocaleDateString()} at {req.visit_time}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: req.status === 'Approved' ? '#DCFCE7' : req.status === 'Rejected' ? '#FEE2E2' : '#FEF3C7' }]}>
                                            <Text style={[styles.statusText, { color: req.status === 'Approved' ? '#16A34A' : req.status === 'Rejected' ? '#DC2626' : '#D97706' }]}>
                                                {req.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.actionsRow}>
                                        {req.status === 'Pending' && (
                                            <>
                                                <TouchableOpacity 
                                                    style={[styles.btn, { backgroundColor: '#DC2626' }]} 
                                                    onPress={() => handleActionWithConfirmation('visitor', req.visitor_id, 'Rejected', req.visitor_name)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.btnText}>Reject</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    style={[styles.btn, { backgroundColor: '#10B981' }]} 
                                                    onPress={() => handleActionWithConfirmation('visitor', req.visitor_id, 'Approved', req.visitor_name)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.btnText}>Approve</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                </View>
                            ))
                        )
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
    tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 8, gap: 12 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    tabActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
    tabText: { fontWeight: '600', color: '#64748B' },
    tabTextActive: { color: '#FFF' },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    title: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
    subtitle: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: '700' },
    description: { fontSize: 14, color: '#475569', marginVertical: 8, lineHeight: 20 },
    actionsRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 8 },
    btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    btnText: { color: '#FFF', fontSize: 13, fontWeight: '600' }
});
