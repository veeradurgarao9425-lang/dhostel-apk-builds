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
import {
    Calendar, Trash2, User, ChevronRight, AlertTriangle, Plus, X, Search, Check, Info
} from 'lucide-react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { SkeletonCardList } from '../components/ui/SkeletonCard';

export default function NoticesScreen({ navigation }: any) {
    const { showError, showSuccess, showApiError } = useToast();
    const confirm = useConfirmation();
    const { theme, isDark } = useTheme();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [notices, setNotices] = useState<any[]>([]);
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [createModalVisible, setCreateModalVisible] = useState(false);

    // Main screen filters
    const [mainSearchQuery, setMainSearchQuery] = useState('');
    const [mainRoomFilter, setMainRoomFilter] = useState('');
    const [mainDateFilter, setMainDateFilter] = useState<string | null>(null);
    const [showMainDatePicker, setShowMainDatePicker] = useState(false);

    // Modal filters and inputs
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModalFloor, setSelectedModalFloor] = useState('All');
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [noticeDate, setNoticeDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [noticeReason, setNoticeReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchNotices = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        setError(false);
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
            setError(true);
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
                setSelectedModalFloor('All');
                setNoticeReason('');
                fetchNotices();
            }
        } catch (e: any) {
            showApiError(e, 'Failed to schedule vacate notice.');
        } finally {
            setSubmitting(false);
        }
    };

    // Filter notices for the main list screen
    const filteredNotices = notices.filter(n => {
        const matchesSearch = !mainSearchQuery ||
            `${n.first_name} ${n.last_name || ''}`.toLowerCase().includes(mainSearchQuery.toLowerCase());
        const matchesRoom = !mainRoomFilter ||
            (n.room_number && n.room_number.toString().includes(mainRoomFilter));
        const matchesDate = !mainDateFilter ||
            (n.vacate_notice_date && n.vacate_notice_date.startsWith(mainDateFilter));
        return matchesSearch && matchesRoom && matchesDate;
    });

    // Unique floors list for the modal filter
    const modalFloors = React.useMemo(() => {
        const floors = new Set<string>();
        allStudents.forEach(s => {
            if (s.floor_number !== undefined && s.floor_number !== null) {
                floors.add(s.floor_number.toString());
            }
        });
        return ['All', ...Array.from(floors).sort((a, b) => parseInt(a) - parseInt(b))];
    }, [allStudents]);

    // Available students filter for modal listing
    const availableStudents = allStudents.filter(s => {
        const matchesStatus = s.status === 1 && s.room_id != null && !s.vacate_notice_date && s.room_number;
        if (!matchesStatus) return false;

        const matchesSearch =
            (s.first_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (s.last_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (s.room_number?.toString() || '').includes(searchQuery);

        const matchesFloor = selectedModalFloor === 'All' ||
            (s.floor_number !== undefined && s.floor_number !== null && s.floor_number.toString() === selectedModalFloor);

        return matchesSearch && matchesFloor;
    });

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <AppHeader
                title="Vacate Schedules"
                subtitle="List of active tenants scheduled to leave the hostel"
                alignLeft={true}
            />

            {/* Main Screen Filters Row */}
            <View style={[styles.filtersContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <View style={styles.filterRow}>
                    <View style={[styles.searchFilterWrap, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                        <Search size={16} color="#94A3B8" />
                        <TextInput
                            style={[styles.filterInput, { color: isDark ? '#F8FAFC' : '#1E293B' }]}
                            placeholder="Student Name..."
                            placeholderTextColor="#94A3B8"
                            value={mainSearchQuery}
                            onChangeText={setMainSearchQuery}
                        />
                    </View>
                    <View style={[styles.roomFilterWrap, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                        <TextInput
                            style={[styles.filterInput, { color: isDark ? '#F8FAFC' : '#1E293B' }]}
                            placeholder="Room No"
                            placeholderTextColor="#94A3B8"
                            value={mainRoomFilter}
                            onChangeText={setMainRoomFilter}
                            keyboardType="numeric"
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.dateFilterBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }, mainDateFilter && { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
                        onPress={() => setShowMainDatePicker(true)}
                    >
                        <Calendar size={15} color={mainDateFilter ? theme.primary : '#64748B'} />
                        <Text style={[styles.dateFilterBtnText, { color: isDark ? '#94A3B8' : '#64748B' }, mainDateFilter && { color: theme.primary, fontWeight: '700' }]}>
                            {mainDateFilter ? new Date(mainDateFilter).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Date'}
                        </Text>
                        {mainDateFilter && (
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); setMainDateFilter(null); }} style={{ marginLeft: 4 }}>
                                <X size={13} color={theme.primary} />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={{ padding: 16 }}>
                    <SkeletonCardList count={4} />
                </View>
            ) : error ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ErrorState onRetry={() => fetchNotices(false)} />
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        filteredNotices.length === 0 && { flexGrow: 1, justifyContent: 'center' }
                    ]}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotices(true); }} tintColor={theme.primary} />
                    }
                >
                    {filteredNotices.length === 0 ? (
                        <EmptyState illustration="vacant"
                            title="No Vacate Dates Found"
                            subtitle={notices.length === 0 ? "You can schedule checkout notices directly by tapping the plus button." : "No scheduled vacate notice matches your selected filters."}
                        />
                    ) : (
                        filteredNotices.map((student) => {
                            const overdue = isOverdue(student.vacate_notice_date);
                            return (
                                <TouchableOpacity
                                    key={student.student_id}
                                    style={[styles.noticeCard, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                                    activeOpacity={0.85}
                                    onPress={() => navigation.navigate('StudentDetails', { studentId: student.student_id })}
                                >
                                    <View style={styles.noticeCardHeader}>
                                        <View style={[styles.avatarWrap, { backgroundColor: theme.primary + '15' }]}>
                                            <User size={18} color={theme.primary} />
                                        </View>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={[styles.nameText, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{student.first_name} {student.last_name || ''}</Text>
                                            <Text style={[styles.roomText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Room {student.room_number || 'Not Assigned'}</Text>
                                        </View>
                                        <View style={[styles.daysBadge, { backgroundColor: theme.primary + '15' }, overdue && styles.daysBadgeOverdue]}>
                                            <Text style={[styles.daysBadgeText, { color: theme.primary }, overdue && styles.daysBadgeTextOverdue]}>
                                                {getDaysLeftText(student.vacate_notice_date)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F8FAFC' }]} />

                                    <View style={styles.infoRow}>
                                        <Calendar size={14} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginRight: 6 }} />
                                        <Text style={[styles.dateLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Vacate Date:</Text>
                                        <Text style={[styles.dateValue, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                                            {new Date(student.vacate_notice_date).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </Text>
                                    </View>

                                    {student.vacate_notice_reason ? (
                                        <View style={[styles.reasonWrap, { backgroundColor: isDark ? '#1E1B4B' : '#FFFBEB', borderLeftColor: theme.primary }]}>
                                            <AlertTriangle size={13} color={isDark ? '#C084FC' : '#B45309'} style={{ marginTop: 2, marginRight: 5 }} />
                                            <Text style={[styles.reasonText, { color: isDark ? '#E9D5FF' : '#B45309' }]}>Reason: {student.vacate_notice_reason}</Text>
                                        </View>
                                    ) : null}

                                    <View style={[styles.cardActions, { borderTopColor: isDark ? '#334155' : '#F8FAFC' }]}>
                                        <TouchableOpacity
                                            style={styles.actionBtnSecondary}
                                            onPress={() => handleCancelNotice(student)}
                                        >
                                            <Trash2 size={14} color="#EF4444" style={{ marginRight: 4 }} />
                                            <Text style={styles.actionBtnTextSecondary}>Clear Schedule</Text>
                                        </TouchableOpacity>

                                        <View style={styles.viewDetailsBtn}>
                                            <Text style={[styles.viewDetailsText, { color: theme.primary }]}>View Profile</Text>
                                            <ChevronRight size={14} color={theme.primary} />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            )}

            {/* Floating Action Button */}
            <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} activeOpacity={0.85} onPress={() => { setSelectedStudent(null); setSearchQuery(''); setSelectedModalFloor('All'); setNoticeReason(''); setCreateModalVisible(true); }}>
                <Plus size={26} color="#FFF" strokeWidth={3.5} />
            </TouchableOpacity>

            {/* Create Vacate Notice Modal */}
            <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setCreateModalVisible(false)} />
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
                        <View style={styles.handle} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>Schedule Vacate Notice</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {!selectedStudent && (
                            <View>
                                <View style={[styles.searchContainer, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                                    <Search size={18} color="#94A3B8" />
                                    <TextInput
                                        style={[styles.searchInput, { color: isDark ? '#F8FAFC' : '#1E293B' }]}
                                        placeholder="Search tenant or room..."
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>

                                {/* Floor Tabs Selector in Create Modal */}
                                <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B', marginBottom: 6 }]}>Filter by Floor</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalFloorScroll} contentContainerStyle={styles.modalFloorContent}>
                                    {modalFloors.map((floor) => {
                                        const isSelected = selectedModalFloor === floor;
                                        return (
                                            <TouchableOpacity
                                                key={floor}
                                                style={[
                                                    styles.modalFloorTab,
                                                    { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
                                                    isSelected && { backgroundColor: theme.primary }
                                                ]}
                                                onPress={() => setSelectedModalFloor(floor)}
                                            >
                                                <Text style={[
                                                    styles.modalFloorTabText,
                                                    { color: isDark ? '#94A3B8' : '#64748B' },
                                                    isSelected && { color: '#FFFFFF', fontWeight: '700' }
                                                ]}>
                                                    {floor === 'All' ? 'All Floors' : `Floor ${floor}`}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {!selectedStudent ? (

                                <View>
                                    <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B', marginTop: 8 }]}>Select Tenant</Text>
                                    {availableStudents.length === 0 ? (
                                        <Text style={styles.noStudentsText}>No eligible tenants found.</Text>
                                    ) : (
                                        availableStudents.map((s) => (
                                            <TouchableOpacity key={s.student_id} style={[styles.studentSelectItem, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]} onPress={() => setSelectedStudent(s)}>
                                                <View style={[styles.studentSelectAvatar, { backgroundColor: theme.primary + '15' }]}><User size={16} color={theme.primary} /></View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.studentSelectName, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{s.first_name} {s.last_name || ''}</Text>
                                                    <Text style={[styles.studentSelectRoom, { color: isDark ? '#94A3B8' : '#64748B' }]}>Room {s.room_number || 'N/A'}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            ) : (
                                <View>
                                    <View style={[styles.selectedStudentCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                        <View style={[styles.studentSelectAvatar, { backgroundColor: theme.primary + '15' }]}><User size={18} color={theme.primary} /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.studentSelectName, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{selectedStudent.first_name} {selectedStudent.last_name || ''}</Text>
                                            <Text style={[styles.studentSelectRoom, { color: isDark ? '#94A3B8' : '#64748B' }]}>Room {selectedStudent.room_number || 'N/A'}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => setSelectedStudent(null)} style={styles.changeStudentBtn}>
                                            <Text style={styles.changeStudentText}>Change</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Expected Vacate Date *</Text>
                                    <TouchableOpacity style={[styles.dateSelector, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]} onPress={() => setShowDatePicker(true)}>
                                        <Calendar size={18} color={theme.primary} />
                                        <Text style={[styles.dateSelectorText, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                                            {new Date(noticeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </Text>
                                        <ChevronRight size={18} color="#94A3B8" />
                                    </TouchableOpacity>

                                    <Text style={[styles.inputLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Reason / Notes (Optional)</Text>
                                    <TextInput
                                        style={[styles.reasonInput, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#1E293B' }]}
                                        placeholder="E.g., Completed studies, relocating..."
                                        placeholderTextColor="#94A3B8"
                                        value={noticeReason}
                                        onChangeText={setNoticeReason}
                                        multiline
                                        textAlignVertical="top"
                                    />

                                    {/* Useful note at the bottom of the modal */}
                                    <View style={[styles.noteContainer, { backgroundColor: isDark ? '#334155' : '#EFF6FF', borderColor: theme.primary }]}>
                                        <Info size={16} color={theme.primary} style={{ marginTop: 2, marginRight: 8 }} />
                                        <Text style={[styles.noteText, { color: isDark ? '#F8FAFC' : '#1E3A8A' }]}>
                                            Note: Scheduling a vacate notice sets the expected checkout date. This bed will be flagged as upcoming-vacant, allowing you to pre-book it for new tenants starting after this date.
                                        </Text>
                                    </View>

                                    <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }, submitting && { opacity: 0.7 }]} onPress={handleScheduleNotice} disabled={submitting}>
                                        {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Schedule Vacate</Text>}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <DateTimePickerModal isVisible={showDatePicker} mode="date" date={new Date(noticeDate)} onConfirm={(d: Date) => { setShowDatePicker(false); setNoticeDate(d.toISOString().split('T')[0]); }} onCancel={() => setShowDatePicker(false)} />
            <DateTimePickerModal isVisible={showMainDatePicker} mode="date" date={mainDateFilter ? new Date(mainDateFilter) : new Date()} onConfirm={(d: Date) => { setShowMainDatePicker(false); setMainDateFilter(d.toISOString().split('T')[0]); }} onCancel={() => setShowMainDatePicker(false)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', marginTop: 120, paddingHorizontal: 32 },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
    emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19 },

    // Main filter bar styles
    filtersContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchFilterWrap: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 38,
    },
    roomFilterWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 8,
        height: 38,
    },
    filterInput: {
        flex: 1,
        fontSize: 13,
        paddingVertical: 0,
        marginLeft: 4,
    },
    dateFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 38,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    dateFilterBtnText: {
        fontSize: 12,
        marginLeft: 4,
    },

    noticeCard: { borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, borderWidth: 1 },
    noticeCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatarWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    nameText: { fontSize: 15, fontWeight: '700' },
    roomText: { fontSize: 12, fontWeight: '500', marginTop: 1 },
    daysBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    daysBadgeText: { fontSize: 11, fontWeight: '700' },
    daysBadgeOverdue: { backgroundColor: '#FEE2E2' },
    daysBadgeTextOverdue: { color: '#EF4444' },

    divider: { height: 1, marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    dateLabel: { fontSize: 13, fontWeight: '500', marginRight: 4 },
    dateValue: { fontSize: 13, fontWeight: '700' },

    reasonWrap: { flexDirection: 'row', padding: 10, borderRadius: 10, marginBottom: 14, borderLeftWidth: 3 },
    reasonText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 17 },

    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
    actionBtnSecondary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    actionBtnTextSecondary: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
    viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    viewDetailsText: { fontSize: 12, fontWeight: '700' },

    fab: {
        position: 'absolute', bottom: 140, right: 20, width: 52, height: 52, borderRadius: 26,
        justifyContent: 'center', alignItems: 'center', elevation: 10,
        shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, zIndex: 99999,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
    modalContent: {
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        width: '100%', maxHeight: '90%', paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5, overflow: 'hidden'
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16, marginTop: 4 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    modalBody: { paddingBottom: 24 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 16 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
    inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 8 },
    noStudentsText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
    studentSelectItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    studentSelectAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    studentSelectName: { fontSize: 14, fontWeight: '600' },
    studentSelectRoom: { fontSize: 12, marginTop: 2 },
    selectedStudentCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1 },
    changeStudentBtn: { padding: 6 },
    changeStudentText: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },
    dateSelector: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    dateSelectorText: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600' },
    reasonInput: { padding: 14, borderRadius: 12, borderWidth: 1, height: 80, fontSize: 14, marginBottom: 16 },
    submitBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

    // Modal Floor filter styles
    modalFloorScroll: {
        marginBottom: 8,
    },
    modalFloorContent: {
        paddingRight: 16,
        gap: 8,
        alignItems: 'center',
    },
    modalFloorTab: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
    },
    modalFloorTabText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Modal note styles
    noteContainer: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    noteText: {
        fontSize: 12,
        flex: 1,
        lineHeight: 17,
        fontWeight: '500',
    },
});
