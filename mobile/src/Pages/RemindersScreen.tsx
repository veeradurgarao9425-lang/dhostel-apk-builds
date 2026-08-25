import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    StatusBar, LayoutAnimation, Platform, UIManager,
    Alert, Modal, ScrollView, RefreshControl, Keyboard, KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ProfileMenu } from '../components/ProfileMenu';
import { FormInput } from '../components/FormComponents';
import { AppHeader } from '../components/AppHeader';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { DangerModal } from '../components/ui/DangerModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../theme/index';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Reminder {
    reminder_id: number;
    hostel_id: number;
    title: string;
    reminder_date: string;
    description: string | null;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    category: 'Rent' | 'Utility' | 'Maintenance' | 'Staff' | 'General';
    status: 'PENDING' | 'COMPLETED';
    created_at: string;
}

const CATEGORIES = ['Rent', 'Utility', 'Maintenance', 'Staff', 'General'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

const CATEGORY_ICONS: Record<string, string> = {
    Rent: 'home',
    Utility: 'flash',
    Maintenance: 'construct',
    Staff: 'people',
    General: 'notifications',
};

const CATEGORY_COLORS: Record<string, string> = {
    Rent: '#7C3AED',
    Utility: '#D97706',
    Maintenance: '#059669',
    Staff: '#0ea5e9',
    General: '#64748B',
};

const PRIORITY_COLORS: Record<string, { text: string; bg: string }> = {
    LOW: { text: '#2563EB', bg: '#DBEAFE' },
    MEDIUM: { text: '#D97706', bg: '#FEF3C7' },
    HIGH: { text: '#DC2626', bg: '#FEE2E2' },
};

export default function RemindersScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const { showApiError, showSuccess, showError } = useToast();

    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [dangerModal, setDangerModal] = useState<{ visible: boolean; remId: number | null }>({
        visible: false, remId: null,
    });

    // Form states
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
    const [category, setCategory] = useState<'Rent' | 'Utility' | 'Maintenance' | 'Staff' | 'General'>('General');

    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [titleError, setTitleError] = useState('');
    const [dateError, setDateError] = useState('');
    const insets = useSafeAreaInsets();
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const fetchReminders = async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const res = await api.get('/reminders');
            if (res.data.success) {
                setReminders(res.data.data);
            }
        } catch (e) {
            console.error('Fetch reminders error:', e);
            if (!isSilent) showApiError(e, 'Failed to load reminders');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchReminders();
        }, [])
    );

    const handleOpenCreate = () => {
        setEditingReminder(null);
        setTitle('');
        setTitleError('');
        setDateError('');
        setDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setPriority('MEDIUM');
        setCategory('General');
        setIsModalVisible(true);
    };

    const handleOpenEdit = (rem: Reminder) => {
        setEditingReminder(rem);
        setTitle(rem.title);
        setTitleError('');
        setDateError('');
        setDate(rem.reminder_date.substring(0, 10));
        setDescription(rem.description || '');
        setPriority(rem.priority);
        setCategory(rem.category);
        setIsModalVisible(true);
    };

    const handleSaveReminder = async () => {
        let hasErr = false;
        if (!title || !title.trim()) {
            setTitleError('Title is required');
            hasErr = true;
        } else if (title.trim().length < 3) {
            setTitleError('Title must be at least 3 characters');
            hasErr = true;
        } else {
            setTitleError('');
        }

        if (!date) {
            setDateError('Date is required');
            hasErr = true;
        } else {
            setDateError('');
        }

        if (hasErr) {
            showError('Please fix the required fields.');
            return;
        }

        try {
            setSubmitLoading(true);
            const payload = {
                title,
                reminder_date: date,
                description: description || null,
                priority,
                category,
                status: editingReminder ? editingReminder.status : 'PENDING'
            };

            if (editingReminder) {
                const res = await api.put(`/reminders/${editingReminder.reminder_id}`, payload);
                if (res.data.success) {
                    showSuccess('Reminder updated successfully.');
                    setIsModalVisible(false);
                    fetchReminders(true);
                }
            } else {
                const res = await api.post('/reminders', payload);
                if (res.data.success) {
                    showSuccess('Reminder created successfully.');
                    setIsModalVisible(false);
                    fetchReminders(true);
                }
            }
        } catch (e: any) {
            console.error('Save reminder error:', e);
            showApiError(e, 'Failed to save reminder');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleToggleStatus = async (rem: Reminder) => {
        const nextStatus = rem.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
        try {
            const res = await api.put(`/reminders/${rem.reminder_id}`, { status: nextStatus });
            if (res.data.success) {
                LayoutAnimation.easeInEaseOut();
                setReminders(prev => prev.map(r => r.reminder_id === rem.reminder_id ? { ...r, status: nextStatus } : r));
                showSuccess(nextStatus === 'COMPLETED' ? 'Marked as completed.' : 'Marked as pending.');
            }
        } catch (e) {
            console.error(e);
            showError('Failed to update reminder status');
        }
    };

    const handleDeleteReminder = (remId: number) => {
        setDangerModal({ visible: true, remId });
    };

    const handleDeleteConfirm = async () => {
        const { remId } = dangerModal;
        setDangerModal(p => ({ ...p, visible: false }));
        if (!remId) return;
        try {
            const res = await api.delete(`/reminders/${remId}`);
            if (res.data.success) {
                LayoutAnimation.easeInEaseOut();
                setReminders(prev => prev.filter(r => r.reminder_id !== remId));
                showSuccess('Reminder deleted.');
            }
        } catch (e) {
            showError('Failed to delete reminder');
        }
    };

    // Calculate metrics
    const stats = useMemo(() => {
        const upcoming = reminders.filter(r => r.status === 'PENDING').length;
        const completed = reminders.filter(r => r.status === 'COMPLETED').length;
        return { upcoming, completed };
    }, [reminders]);

    const renderItem = ({ item }: { item: Reminder }) => {
        const isCompleted = item.status === 'COMPLETED';
        const color = CATEGORY_COLORS[item.category] || '#64748B';
        const icon = CATEGORY_ICONS[item.category] || 'notifications';
        const pri = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.MEDIUM;

        const dateStr = new Date(item.reminder_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        return (
            <View style={[s.card, isCompleted && s.completedCard]}>
                <View style={s.cardMain}>
                    {/* Left: Category Icon Circle */}
                    <View style={[s.iconCircle, { backgroundColor: isCompleted ? '#F1F5F9' : color + '15' }]}>
                        <Ionicons name={icon as any} size={18} color={isCompleted ? '#94A3B8' : color} />
                    </View>

                    {/* Middle: Info */}
                    <View style={s.info}>
                        <Text style={[s.cardTitle, isCompleted && s.completedText]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        {item.description ? (
                            <Text style={[s.cardSub, isCompleted && s.completedText]} numberOfLines={2}>
                                {item.description}
                            </Text>
                        ) : null}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                            <Text style={s.cardDate}>📅 {dateStr}</Text>
                            {!isCompleted && (
                                <View style={[s.priBadge, { backgroundColor: pri.bg }]}>
                                    <Text style={[s.priText, { color: pri.text }]}>{item.priority}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Right: Checkbox */}
                    <View style={s.checkboxContainer}>
                        <TouchableOpacity onPress={() => handleToggleStatus(item)} style={{ padding: 8 }}>
                            <Ionicons
                                name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                                size={26}
                                color={isCompleted ? '#10B981' : '#CBD5E1'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Action Row */}
                <View style={s.bottomActions}>
                    <TouchableOpacity style={s.bottomBtn} onPress={() => handleOpenEdit(item)}>
                        <Ionicons name="pencil-outline" size={16} color="#64748B" />
                        <Text style={s.bottomBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <View style={s.actionDivider} />
                    <TouchableOpacity style={s.bottomBtn} onPress={() => handleDeleteReminder(item.reminder_id)}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={[s.bottomBtnText, { color: '#EF4444' }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <AppHeader 
                title="Hostel Reminders" 
                subtitle="Manage alerts & scheduled events"
                onBack={() => navigation.goBack()}
            />

            {/* Stats Row Outside */}
            <View style={s.statsRowOutside}>
                <View style={[s.statCardOutside, { backgroundColor: '#F3E8FF' }]}>
                    <View style={[s.statIconCircle, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
                        <Ionicons name="time" size={20} color="#7C3AED" />
                    </View>
                    <View style={s.statTextContainer}>
                        <Text style={[s.statValOutside, { color: '#7C3AED' }]}>{stats.upcoming}</Text>
                        <Text style={[s.statLblOutside, { color: '#7C3AED' }]}>Upcoming</Text>
                    </View>
                </View>

                <View style={[s.statCardOutside, { backgroundColor: '#DCFCE7' }]}>
                    <View style={[s.statIconCircle, { backgroundColor: 'rgba(22, 163, 74, 0.1)' }]}>
                        <Ionicons name="checkmark-done-circle" size={20} color="#16A34A" />
                    </View>
                    <View style={s.statTextContainer}>
                        <Text style={[s.statValOutside, { color: '#16A34A' }]}>{stats.completed}</Text>
                        <Text style={[s.statLblOutside, { color: '#16A34A' }]}>Completed</Text>
                    </View>
                </View>
            </View>

            {/* List */}
            {loading ? (
                <SkeletonList count={5} />
            ) : (
                <FlatList
                    data={reminders}
                    keyExtractor={(item) => item.reminder_id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchReminders(true); }}
                            tintColor="#7C3AED"
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState illustration="reminders"
                            title="No Reminders Set"
                            subtitle="Add reminders to track rent, bills, or tasks."
                            actionLabel="Add Reminder"
                            onAction={handleOpenCreate}
                        />
                    }
                />
            )}

            {/* Add FAB */}
            <TouchableOpacity
                style={[
                    s.fab,
                    {
                        backgroundColor: theme.primary,
                        bottom: Math.max(insets.bottom + 85, 100),
                    },
                ]}
                onPress={handleOpenCreate}
                activeOpacity={0.85}
            >
                <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="slide" onRequestClose={() => setIsModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                    <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                    <AppHeader 
                        title={editingReminder ? 'Edit Reminder' : 'Add New Reminder'} 
                        onBack={() => setIsModalVisible(false)} 
                    />
                    <FullScreenLoader visible={submitLoading} />

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
                        <View style={{ marginBottom: 16 }}>
                            <Text style={s.formLabel}>
                                Title <Text style={{ color: '#EF4444', fontWeight: '800' }}>*</Text>
                            </Text>
                            <FormInput
                                placeholder="Enter title (e.g. Pay Internet Bill)"
                                value={title}
                                error={titleError}
                                onChangeText={(t: string) => {
                                    setTitle(t);
                                    if (t.trim().length >= 3) setTitleError('');
                                }}
                                icon={(props: any) => <Ionicons name="text-outline" size={18} color={props.color} />}
                            />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={s.formLabel}>
                                Select Date <Text style={{ color: '#EF4444', fontWeight: '800' }}>*</Text>
                            </Text>
                            <TouchableOpacity 
                                style={[s.dateField, dateError ? { borderColor: '#EF4444' } : {}]} 
                                onPress={() => setDatePickerVisible(true)}
                            >
                                <Ionicons name="calendar-outline" size={18} color={dateError ? '#EF4444' : '#64748B'} />
                                <Text style={[s.dateFieldText, { marginLeft: 10 }]}>{date}</Text>
                            </TouchableOpacity>
                            {dateError ? <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '600' }}>{dateError}</Text> : null}
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={s.formLabel}>
                                Category <Text style={{ color: '#EF4444', fontWeight: '800' }}>*</Text>
                            </Text>
                            <View style={s.chipRow}>
                                {CATEGORIES.map((cat) => {
                                    const active = category === cat;
                                    const catColor = CATEGORY_COLORS[cat];
                                    return (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[s.chip, active && { backgroundColor: catColor, borderColor: catColor }]}
                                            onPress={() => setCategory(cat)}
                                        >
                                            <Text style={[s.chipText, active && { color: '#FFF' }]}>{cat}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={s.formLabel}>
                                Priority <Text style={{ color: '#EF4444', fontWeight: '800' }}>*</Text>
                            </Text>
                            <View style={s.chipRow}>
                                {PRIORITIES.map((pri) => {
                                    const active = priority === pri;
                                    return (
                                        <TouchableOpacity
                                            key={pri}
                                            style={[s.chip, active && { backgroundColor: '#1E293B', borderColor: '#1E293B' }]}
                                            onPress={() => setPriority(pri)}
                                        >
                                            <Text style={[s.chipText, active && { color: '#FFF' }]}>{pri}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={s.formLabel}>Description (Optional)</Text>
                            <FormInput
                                placeholder="Add optional details..."
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                icon={(props: any) => <Ionicons name="document-text-outline" size={18} color={props.color} />}
                            />
                        </View>
                    </ScrollView>

                    {/* ─── Sticky Footer ───────────────────────────────────────────────────── */}
                    <View style={[s.stickyFooter, { paddingBottom: isKeyboardVisible ? SPACING.md : (insets.bottom + SPACING.md) }]}>
                        <TouchableOpacity
                            style={s.cancelButton}
                            onPress={() => setIsModalVisible(false)}
                            disabled={submitLoading}
                        >
                            <Text style={s.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.submitButton, submitLoading && { opacity: 0.7 }]}
                            onPress={handleSaveReminder}
                            disabled={submitLoading}
                        >
                            <Text style={s.submitButtonText}>{editingReminder ? 'Update Reminder' : 'Add Reminder'}</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Date Picker Modal */}
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={(d) => { setDate(d.toISOString().split('T')[0]); setDatePickerVisible(false); }}
                onCancel={() => setDatePickerVisible(false)}
            />

            <DangerModal
                visible={dangerModal.visible}
                title="Delete Reminder?"
                message="Are you sure you want to delete this reminder? This action cannot be undone."
                confirmText="Delete"
                onCancel={() => setDangerModal(p => ({ ...p, visible: false }))}
                onConfirm={handleDeleteConfirm}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    statsRowOutside: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
    },
    statCardOutside: {
        flex: 1,
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
    },
    statIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    statTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    statValOutside: {
        fontSize: 20,
        fontWeight: '900',
    },
    statLblOutside: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 1,
    },

    listContent: { padding: 16, paddingBottom: 120 },

    // Card styling
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        overflow: 'hidden'
    },
    completedCard: { opacity: 0.65 },
    cardMain: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
    },
    iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    info: { flex: 1, gap: 2 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    cardSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },
    cardDate: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
    completedText: { textDecorationLine: 'line-through' },

    checkboxContainer: { justifyContent: 'center', alignItems: 'center' },
    priBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    priText: { fontSize: 9, fontWeight: '800' },

    bottomActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        height: 44,
    },
    bottomBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6
    },
    bottomBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    actionDivider: { width: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 30 },
    emptyText: { fontSize: 16, color: '#1E293B', fontWeight: '800', marginTop: 12 },
    emptySub: { fontSize: 12, color: '#94A3B8', fontWeight: '500', textAlign: 'center', marginTop: 4 },

    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 12,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        zIndex: 99999,
    },

    formLabel: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 6, marginTop: 12 },
    formInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, fontSize: 14, color: '#1E293B', fontWeight: '600' },
    textarea: { minHeight: 60, textAlignVertical: 'top' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
    chipText: { fontSize: 11, fontWeight: '700', color: '#64748B' },

    dateField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, gap: 10 },
    dateFieldText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },

    stickyFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF'
    },
    cancelButtonText: { color: '#475569', fontWeight: '600', fontSize: 15 },
    submitButton: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#7C3AED',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: { color: '#FFF', fontWeight: '900', fontSize: 14 }
});
