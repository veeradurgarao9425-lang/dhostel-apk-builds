import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, StatusBar, Platform, LayoutAnimation, UIManager
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomDatePicker } from '../components/ui/pickers/CustomDatePicker';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonCardList } from '../components/ui/SkeletonCard';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { showErrorToast, showSuccessToast } from '../hooks/Toastconfig';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STATUS_TABS = ['All', 'Pending', 'In Progress', 'Resolved'];
const theme = { gradientStart: '#7C3AED', gradientEnd: '#5B21B6' };

export default function ComplaintsManagementScreen({ navigation }: any) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const [activeTab, setActiveTab] = useState('All');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

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
        setUpdatingId(complaintId);
        try {
            const res = await api.put(`/complaints/${complaintId}/status`, { status });
            if (res.data.success) {
                showSuccessToast('Updated', `Complaint marked as ${status}`);
                await fetchComplaints();
            }
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to update status.');
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredComplaints = useMemo(() => {
        let result = complaints;

        if (activeTab !== 'All') {
            result = result.filter(c => c.status === activeTab);
        }

        if (selectedDate) {
            result = result.filter(c => {
                const cDate = new Date(c.created_at);
                return cDate.getDate() === selectedDate.getDate() && 
                       cDate.getMonth() === selectedDate.getMonth() && 
                       cDate.getFullYear() === selectedDate.getFullYear();
            });
        }

        return result;
    }, [complaints, activeTab, selectedDate]);

    const stats = useMemo(() => {
        const total = complaints.length;
        const pending = complaints.filter(c => c.status === 'Pending').length;
        const inProgress = complaints.filter(c => c.status === 'In Progress').length;
        const resolved = complaints.filter(c => c.status === 'Resolved').length;
        return { total, pending, inProgress, resolved };
    }, [complaints]);

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
            
            <AppHeader 
                title="Complaints" 
                subtitle="Track tenant issues"
                alignLeft={true}
                onBack={() => navigation.goBack()} 
                rightComponent={
                    <TouchableOpacity 
                        style={s.dateFilterBtn} 
                        onPress={() => setDatePickerVisible(true)}
                    >
                        <Ionicons name="calendar-outline" size={18} color="#FFF" />
                        <Text style={s.dateFilterBtnText}>
                            {selectedDate ? selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Filter Date'}
                        </Text>
                    </TouchableOpacity>
                }
            />

            {selectedDate && (
                <View style={s.dateFilterRow}>
                    <Text style={s.dateFilterText}>Filtered by: {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                    <TouchableOpacity onPress={() => { setSelectedDate(null); LayoutAnimation.easeInEaseOut(); }}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            )}

            <View style={s.statsRowOutside}>
                <View style={[s.statCardOutside, { backgroundColor: '#F3E8FF' }]}>
                    <View style={[s.statIconCircle, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
                        <Ionicons name="documents" size={16} color="#7C3AED" />
                    </View>
                    <View style={s.statTextContainer}>
                        <Text style={[s.statValOutside, { color: '#7C3AED' }]}>{stats.total}</Text>
                        <Text style={[s.statLblOutside, { color: '#7C3AED' }]}>Total</Text>
                    </View>
                </View>

                <View style={[s.statCardOutside, { backgroundColor: '#FEE2E2' }]}>
                    <View style={[s.statIconCircle, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}>
                        <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    </View>
                    <View style={s.statTextContainer}>
                        <Text style={[s.statValOutside, { color: '#DC2626' }]}>{stats.pending}</Text>
                        <Text style={[s.statLblOutside, { color: '#DC2626' }]}>Pending</Text>
                    </View>
                </View>

                <View style={[s.statCardOutside, { backgroundColor: '#DCFCE7' }]}>
                    <View style={[s.statIconCircle, { backgroundColor: 'rgba(22, 163, 74, 0.1)' }]}>
                        <Ionicons name="checkmark-done-circle" size={16} color="#16A34A" />
                    </View>
                    <View style={s.statTextContainer}>
                        <Text style={[s.statValOutside, { color: '#16A34A' }]}>{stats.resolved}</Text>
                        <Text style={[s.statLblOutside, { color: '#16A34A' }]}>Resolved</Text>
                    </View>
                </View>
            </View>

            <View style={s.tabWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScrollContainer}>
                    {STATUS_TABS.map(tab => {
                        const active = activeTab === tab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[s.tabButton, active && s.activeTabButton]}
                                onPress={() => { setActiveTab(tab); LayoutAnimation.easeInEaseOut(); }}
                            >
                                <Text style={[s.tabText, active && s.activeTabText]}>{tab}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {loading ? (
                <SkeletonCardList count={4} />
            ) : (
                <ScrollView
                    contentContainerStyle={[
                        s.scrollContent,
                        filteredComplaints.length === 0 && { flexGrow: 1, justifyContent: 'center' }
                    ]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchComplaints(true)} tintColor="#7C3AED" />}
                >
                    {filteredComplaints.length === 0 ? (
                        <EmptyState icon="construct-outline" title="No Complaints Found" subtitle="Try changing the filter or date." />
                    ) : (
                        filteredComplaints.map((c) => {
                            const isResolved = c.status === 'Resolved';
                            const isProgress = c.status === 'In Progress';
                            const statusColor = isResolved ? '#16A34A' : isProgress ? '#D97706' : '#DC2626';
                            const statusBg = isResolved ? '#DCFCE7' : isProgress ? '#FEF3C7' : '#FEE2E2';

                            return (
                                <View key={c.complaint_id} style={[s.card, isResolved && { opacity: 0.85, borderColor: '#DCFCE7' }]}>
                                    <View style={s.cardTop}>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                <View style={s.avatarCircle}>
                                                    <Text style={s.avatarInitials}>
                                                        {c.first_name?.[0] || '?'}{c.last_name?.[0] || ''}
                                                    </Text>
                                                </View>
                                                <View>
                                                    <Text style={s.tenantName}>{c.first_name} {c.last_name}</Text>
                                                    <Text style={s.roomText}>Room {c.room_number || 'N/A'}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={s.dateText}>{new Date(c.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</Text>
                                            <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
                                                <Text style={[s.statusText, { color: statusColor }]}>{c.status}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={s.divider} />
                                    <View style={s.cardBottom}>
                                        <Text style={s.complaintTitle}>{c.title}</Text>
                                        <Text style={s.description}>{c.description || 'No additional details provided.'}</Text>
                                        <Text style={s.categoryTag}>{c.category}</Text>
                                    </View>
                                    <View style={s.actionsRow}>
                                        {c.status !== 'In Progress' && c.status !== 'Resolved' && (
                                            <TouchableOpacity
                                                style={[s.btn, { backgroundColor: '#F59E0B' }, updatingId === c.complaint_id && { opacity: 0.7 }]}
                                                onPress={() => updateStatus(c.complaint_id, 'In Progress')}
                                                disabled={updatingId !== null}
                                            >
                                                {updatingId === c.complaint_id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.btnText}>Mark In Progress</Text>}
                                            </TouchableOpacity>
                                        )}
                                        {c.status !== 'Resolved' && (
                                            <TouchableOpacity
                                                style={[s.btn, { backgroundColor: '#10B981' }, updatingId === c.complaint_id && { opacity: 0.7 }]}
                                                onPress={() => updateStatus(c.complaint_id, 'Resolved')}
                                                disabled={updatingId !== null}
                                            >
                                                {updatingId === c.complaint_id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.btnText}>Mark Resolved</Text>}
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}

            <CustomDatePicker
                visible={isDatePickerVisible}
                onClose={() => setDatePickerVisible(false)}
                onConfirm={(date) => {
                    setSelectedDate(date);
                    setDatePickerVisible(false);
                    LayoutAnimation.easeInEaseOut();
                }}
                initialDate={selectedDate || new Date()}
                title="Select Date"
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F7FF' },
    dateFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    dateFilterBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
    dateFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FEE2E2',
        marginHorizontal: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 12,
        marginBottom: 8,
    },
    dateFilterText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },
    statsRowOutside: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 16,
        marginTop: 8
    },
    statCardOutside: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 6,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statIconCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    statTextContainer: {
        width: '100%',
        alignItems: 'center',
    },
    statValOutside: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 2,
        textAlign: 'center',
    },
    statLblOutside: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    },

    tabWrapper: { marginBottom: 12 },
    tabScrollContainer: { paddingHorizontal: 16, gap: 10 },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    activeTabButton: {
        backgroundColor: '#7C3AED',
        borderColor: '#7C3AED',
    },
    tabText: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#FFF',
    },

    scrollContent: { padding: 16, paddingBottom: 40 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    avatarCircle: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginRight: 10
    },
    avatarInitials: { color: '#7C3AED', fontWeight: '700', fontSize: 14 },
    tenantName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    roomText: { fontSize: 12, color: '#64748B', marginTop: 2 },
    dateText: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
    cardBottom: {},
    complaintTitle: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 4 },
    description: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 4 },
    categoryTag: { fontSize: 11, color: '#475569', fontWeight: '600', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
    actionsRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 8 },
    btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, minWidth: 110, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#FFF', fontSize: 13, fontWeight: '600' }
});

