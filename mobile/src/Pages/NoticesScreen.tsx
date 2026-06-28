import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Calendar, Trash2, User, ChevronRight, AlertTriangle, Plus, X, Search, Check
} from 'lucide-react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { SkeletonCardList } from '../components/ui/SkeletonCard';

export default function NoticesScreen({ navigation }: any) {
    const { showError, showSuccess, showApiError } = useToast();
    const confirm = useConfirmation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notices, setNotices] = useState<any[]>([]);
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [noticeDate, setNoticeDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [noticeReason, setNoticeReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchNotices = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            // Fetch students list (since notices are stored directly on student records)
            const res = await api.get('/students?limit=250');
            if (res.data.success) {
                const list = res.data.data || [];
                setAllStudents(list);
                const noticesList = list.filter(
                    (s: any) => s.vacate_notice_date !== null && 
                                s.vacate_notice_date !== undefined && 
                                s.status === 1 && 
                                s.room_id != null
                );
                // Sort by notice date ascending (soonest first)
                noticesList.sort((a: any, b: any) => a.vacate_notice_date.localeCompare(b.vacate_notice_date));
                setNotices(noticesList);
            }
        } catch (e: any) {
            console.error('Failed to fetch vacate notices:', e);
            showApiError(e, 'Failed to load vacancy notices.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    const handleCancelNotice = (student: any) => {
        confirm({
            title: 'Cancel Vacate Notice?',
            message: `Are you sure you want to clear the vacate schedule for ${student.first_name} ${student.last_name || ''}?`,
            confirmText: 'Yes, Clear Notice',
            cancelText: 'Cancel',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    const res = await api.put(`/students/${student.student_id}`, {
                        vacate_notice_date: null,
                        vacate_notice_reason: null
                    });
                    if (res.data.success) {
                        showSuccess('Vacate date removed.', 'Notice Cleared');
                        fetchNotices();
                    }
                } catch (e: any) {
                    showApiError(e, 'Failed to clear vacate notice.');
                }
            }
        });
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

    const handleScheduleNotice = async () => {
        if (!selectedStudent) {
            showError('Please select a student first');
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.put(`/students/${selectedStudent.student_id}`, {
                vacate_notice_date: noticeDate,
                vacate_notice_reason: noticeReason || null
            });
            if (res.data.success) {
                showSuccess(`Notice scheduled for ${selectedStudent.first_name}`);
                setCreateModalVisible(false);
                setSelectedStudent(null);
                setSearchQuery('');
                setNoticeReason('');
                fetchNotices();
            }
        } catch (e: any) {
            showApiError(e, 'Failed to schedule vacate notice.');
        } finally {
            setSubmitting(false);
        }
    };

    const availableStudents = allStudents.filter(s => 
        s.status === 1 && 
        s.room_id != null &&
        !s.vacate_notice_date && 
        s.room_number &&
        (
            (s.first_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
            (s.last_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
            (s.room_number?.toString() || '').includes(searchQuery)
        )
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <AppHeader 
                title="Vacate Schedules"
                subtitle="List of active tenants scheduled to leave the hostel"
            />

            {loading ? (
                <View style={{ padding: 16 }}>
                    <SkeletonCardList count={4} />
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        notices.length === 0 && { flexGrow: 1, justifyContent: 'center' }
                    ]}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotices(true); }} tintColor="#D97706" />
                    }
                >
                    {notices.length === 0 ? (
                        <EmptyState
                            icon="calendar-outline"
                            title="No Vacate Dates Scheduled"
                            subtitle="You can schedule checkout notices directly from a student's profile details."
                        />
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

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => { setSelectedStudent(null); setSearchQuery(''); setNoticeReason(''); setCreateModalVisible(true); }}>
                <Plus size={26} color="#FFF" strokeWidth={3.5} />
            </TouchableOpacity>

            {/* Create Vacate Notice Modal */}
            <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setCreateModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.handle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Schedule Vacate Notice</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {!selectedStudent ? (
                                <View>
                                    <View style={styles.searchContainer}>
                                        <Search size={18} color="#94A3B8" />
                                        <TextInput 
                                            style={styles.searchInput}
                                            placeholder="Search tenant or room..."
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            placeholderTextColor="#94A3B8"
                                        />
                                    </View>
                                    <Text style={styles.inputLabel}>Select Tenant</Text>
                                    {availableStudents.length === 0 ? (
                                        <Text style={styles.noStudentsText}>No eligible tenants found.</Text>
                                    ) : (
                                        availableStudents.slice(0, 10).map((s) => (
                                            <TouchableOpacity key={s.student_id} style={styles.studentSelectItem} onPress={() => setSelectedStudent(s)}>
                                                <View style={styles.studentSelectAvatar}><User size={16} color="#D97706" /></View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.studentSelectName}>{s.first_name} {s.last_name || ''}</Text>
                                                    <Text style={styles.studentSelectRoom}>Room {s.room_number || 'N/A'}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            ) : (
                                <View>
                                    <View style={styles.selectedStudentCard}>
                                        <View style={styles.studentSelectAvatar}><User size={18} color="#D97706" /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.studentSelectName}>{selectedStudent.first_name} {selectedStudent.last_name || ''}</Text>
                                            <Text style={styles.studentSelectRoom}>Room {selectedStudent.room_number || 'N/A'}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => setSelectedStudent(null)} style={styles.changeStudentBtn}>
                                            <Text style={styles.changeStudentText}>Change</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.inputLabel}>Expected Vacate Date *</Text>
                                    <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                                        <Calendar size={18} color="#D97706" />
                                        <Text style={styles.dateSelectorText}>
                                            {new Date(noticeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </Text>
                                        <ChevronRight size={18} color="#94A3B8" />
                                    </TouchableOpacity>

                                    <Text style={styles.inputLabel}>Reason / Notes (Optional)</Text>
                                    <TextInput 
                                        style={styles.reasonInput}
                                        placeholder="E.g., Completed studies, relocating..."
                                        value={noticeReason}
                                        onChangeText={setNoticeReason}
                                        multiline
                                        textAlignVertical="top"
                                    />

                                    <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={handleScheduleNotice} disabled={submitting}>
                                        {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Schedule Vacate</Text>}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <DateTimePickerModal isVisible={showDatePicker} mode="date" date={new Date(noticeDate)} onConfirm={(d: Date) => { setShowDatePicker(false); setNoticeDate(d.toISOString().split('T')[0]); }} onCancel={() => setShowDatePicker(false)} />
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

    fab: {
        position: 'absolute', bottom: 45, right: 24, width: 50, height: 50, borderRadius: 25,
        backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3,
    },
    modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
    modalContent: { 
        backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, 
        width: '100%', maxHeight: '90%', paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 40 : 20, 
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5, overflow: 'hidden' 
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16, marginTop: 4 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    modalBody: { paddingBottom: 24 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 16 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1E293B' },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8, marginTop: 8 },
    noStudentsText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
    studentSelectItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    studentSelectAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    studentSelectName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
    studentSelectRoom: { fontSize: 12, color: '#64748B', marginTop: 2 },
    selectedStudentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
    changeStudentBtn: { padding: 6 },
    changeStudentText: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },
    dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
    dateSelectorText: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#1E293B' },
    reasonInput: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 80, fontSize: 14, color: '#1E293B', marginBottom: 24 },
    submitBtn: { backgroundColor: '#F59E0B', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
