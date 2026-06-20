import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Calendar, Trash2, User, ChevronRight, AlertTriangle
} from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import api from '../services/api';
import { showErrorToast, showSuccessToast } from '../hooks/Toastconfig';

export default function NoticesScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notices, setNotices] = useState<any[]>([]);

    const fetchNotices = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            // Fetch students list (since notices are stored directly on student records)
            const res = await api.get('/students?limit=250');
            if (res.data.success) {
                const list = (res.data.data || []).filter(
                    (s: any) => s.status === 1 && s.vacate_notice_date !== null && s.vacate_notice_date !== undefined
                );
                // Sort by notice date ascending (soonest first)
                list.sort((a: any, b: any) => a.vacate_notice_date.localeCompare(b.vacate_notice_date));
                setNotices(list);
            }
        } catch (e: any) {
            console.error('Failed to fetch vacate notices:', e);
            showErrorToast('Error', 'Failed to load vacancy notices.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    const handleCancelNotice = (student: any) => {
        Alert.alert(
            'Cancel Vacate Notice?',
            `Are you sure you want to clear the vacate schedule for ${student.first_name} ${student.last_name || ''}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Clear Notice',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await api.put(`/students/${student.student_id}`, {
                                vacate_notice_date: null,
                                vacate_notice_reason: null
                            });
                            if (res.data.success) {
                                showSuccessToast('Notice Cleared', 'Vacate date removed.');
                                fetchNotices();
                            }
                        } catch (e: any) {
                            Alert.alert('Error', e.response?.data?.error || 'Failed to clear vacate notice.');
                        }
                    }
                }
            ]
        );
    };

    const getDaysLeftText = (dateStr: string) => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateStr === todayStr) return 'Today';
        
        const diff = new Date(dateStr).getTime() - new Date(todayStr).getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        
        if (days < 0) return `Overdue by ${Math.abs(days)}d`;
        if (days === 1) return 'Tomorrow';
        return `in ${days} days`;
    };

    const isOverdue = (dateStr: string) => {
        const todayStr = new Date().toISOString().split('T')[0];
        return new Date(dateStr).getTime() < new Date(todayStr).getTime();
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <AppHeader 
                title="Vacate Schedules"
                subtitle="List of active tenants scheduled to leave the hostel"
            />

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#D97706" />
                    <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '500' }}>Loading vacancy schedules...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotices(true); }} tintColor="#D97706" />
                    }
                >
                    {notices.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconWrap}>
                                <Calendar size={40} color="#94A3B8" />
                            </View>
                            <Text style={styles.emptyTitle}>No vacate dates scheduled</Text>
                            <Text style={styles.emptySubtitle}>You can schedule checkout notices directly from student profile details.</Text>
                        </View>
                    ) : (
                        notices.map((student) => {
                            const overdue = isOverdue(student.vacate_notice_date);
                            return (
                                <TouchableOpacity
                                    key={student.student_id}
                                    style={styles.noticeCard}
                                    activeOpacity={0.85}
                                    onPress={() => navigation.navigate('StudentDetails', { studentId: student.student_id })}
                                >
                                    <View style={styles.noticeCardHeader}>
                                        <View style={styles.avatarWrap}>
                                            <User size={18} color="#D97706" />
                                        </View>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.nameText}>{student.first_name} {student.last_name || ''}</Text>
                                            <Text style={styles.roomText}>Room {student.room_number || 'Not Assigned'}</Text>
                                        </View>
                                        <View style={[styles.daysBadge, overdue && styles.daysBadgeOverdue]}>
                                            <Text style={[styles.daysBadgeText, overdue && styles.daysBadgeTextOverdue]}>
                                                {getDaysLeftText(student.vacate_notice_date)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.infoRow}>
                                        <Calendar size={14} color="#64748B" style={{ marginRight: 6 }} />
                                        <Text style={styles.dateLabel}>Vacate Date:</Text>
                                        <Text style={styles.dateValue}>
                                            {new Date(student.vacate_notice_date).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </Text>
                                    </View>

                                    {student.vacate_notice_reason ? (
                                        <View style={styles.reasonWrap}>
                                            <AlertTriangle size={13} color="#B45309" style={{ marginTop: 2, marginRight: 5 }} />
                                            <Text style={styles.reasonText}>Reason: {student.vacate_notice_reason}</Text>
                                        </View>
                                    ) : null}

                                    <View style={styles.cardActions}>
                                        <TouchableOpacity
                                            style={styles.actionBtnSecondary}
                                            onPress={() => handleCancelNotice(student)}
                                        >
                                            <Trash2 size={14} color="#EF4444" style={{ marginRight: 4 }} />
                                            <Text style={styles.actionBtnTextSecondary}>Clear Schedule</Text>
                                        </TouchableOpacity>
                                        
                                        <View style={styles.viewDetailsBtn}>
                                            <Text style={styles.viewDetailsText}>View Profile</Text>
                                            <ChevronRight size={14} color="#D97706" />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', marginTop: 120, paddingHorizontal: 32 },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
    emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19 },
    
    noticeCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
    noticeCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatarWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    nameText: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    roomText: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 1 },
    daysBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    daysBadgeText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
    daysBadgeOverdue: { backgroundColor: '#FEE2E2' },
    daysBadgeTextOverdue: { color: '#EF4444' },
    
    divider: { height: 1, backgroundColor: '#F8FAFC', marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    dateLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', marginRight: 4 },
    dateValue: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    
    reasonWrap: { flexDirection: 'row', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
    reasonText: { fontSize: 12, color: '#B45309', fontWeight: '500', flex: 1, lineHeight: 17 },
    
    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 12 },
    actionBtnSecondary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    actionBtnTextSecondary: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
    viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    viewDetailsText: { fontSize: 12, fontWeight: '700', color: '#D97706' },
});
