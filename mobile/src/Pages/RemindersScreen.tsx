import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    StatusBar, ActivityIndicator, LayoutAnimation, Platform, UIManager,
    Alert, Modal, ScrollView, RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { ProfileMenu } from '../components/ProfileMenu';
import { FormInput, ModalSheet } from '../components/FormComponents';

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

    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

    // Form states
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
    const [category, setCategory] = useState<'Rent' | 'Utility' | 'Maintenance' | 'Staff' | 'General'>('General');

    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const fetchReminders = async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const res = await api.get('/reminders');
            if (res.data.success) {
                setReminders(res.data.data);
            }
        } catch (e) {
            console.error('Fetch reminders error:', e);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load reminders' });
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
        setDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setPriority('MEDIUM');
        setCategory('General');
        setIsModalVisible(true);
    };

    const handleOpenEdit = (rem: Reminder) => {
        setEditingReminder(rem);
        setTitle(rem.title);
        setDate(rem.reminder_date.substring(0, 10));
        setDescription(rem.description || '');
        setPriority(rem.priority);
        setCategory(rem.category);
        setIsModalVisible(true);
    };

    const handleSaveReminder = async () => {
        if (!title || !date) {
            Alert.alert('Required Fields', 'Please fill Title and Select Date');
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
                    Toast.show({ type: 'success', text1: '✓ Updated', text2: 'Reminder updated successfully' });
                    setIsModalVisible(false);
                    fetchReminders(true);
                }
            } else {
                const res = await api.post('/reminders', payload);
                if (res.data.success) {
                    Toast.show({ type: 'success', text1: '✓ Saved', text2: 'Reminder created successfully' });
                    setIsModalVisible(false);
                    fetchReminders(true);
                }
            }
        } catch (e: any) {
            console.error('Save reminder error:', e);
            Alert.alert('Error', e.response?.data?.error || 'Failed to save reminder');
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
                Toast.show({ type: 'success', text1: nextStatus === 'COMPLETED' ? 'Marked Completed ✓' : 'Marked Pending' });
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to update reminder status');
        }
    };

    const handleDeleteReminder = (remId: number) => {
        Alert.alert(
            'Delete Reminder',
            'Are you sure you want to delete this reminder?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await api.delete(`/reminders/${remId}`);
                            if (res.data.success) {
                                LayoutAnimation.easeInEaseOut();
                                setReminders(prev => prev.filter(r => r.reminder_id !== remId));
                                Toast.show({ type: 'success', text1: 'Deleted successfully' });
                            }
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete reminder');
                        }
                    }
                }
            ]
        );
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
                    <Text style={s.cardDate}>📅 {dateStr}</Text>
                </View>

                {/* Right: Actions and Badges */}
                <View style={s.actions}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        {/* Priority Badge */}
                        {!isCompleted && (
                            <View style={[s.priBadge, { backgroundColor: pri.bg }]}>
                                <Text style={[s.priText, { color: pri.text }]}>{item.priority}</Text>
                            </View>
                        )}
                        {/* Checkbox status toggle */}
                        <TouchableOpacity onPress={() => handleToggleStatus(item)}>
                            <Ionicons
                                name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                                size={22}
                                color={isCompleted ? '#10B981' : '#CBD5E1'}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Edit/Delete Buttons */}
                    <View style={s.actionRow}>
                        <TouchableOpacity style={s.actionBtn} onPress={() => handleOpenEdit(item)}>
                            <Ionicons name="pencil-outline" size={14} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.actionBtn} onPress={() => handleDeleteReminder(item.reminder_id)}>
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
                <View style={s.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Ionicons name="chevron-back" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>Hostel Reminders</Text>
                        <Text style={s.headerSubtitle}>Manage alerts & scheduled events</Text>
                    </View>
                    <ProfileMenu />
                </View>

                {/* Stat cards in header */}
                <View style={s.statsRow}>
                    <View style={s.statCard}>
                        <Text style={s.statVal}>{stats.upcoming}</Text>
                        <Text style={s.statLbl}>Upcoming</Text>
                    </View>
                    <View style={s.statCard}>
                        <Text style={[s.statVal, { color: '#10B981' }]}>{stats.completed}</Text>
                        <Text style={s.statLbl}>Completed</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 40 }} />
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
                        <View style={s.emptyWrap}>
                            <Text style={{ fontSize: 50, marginBottom: 10 }}>🔔</Text>
                            <Text style={s.emptyText}>No reminders set yet</Text>
                            <Text style={s.emptySub}>Add reminders to track rent, bills, or tasks.</Text>
                        </View>
                    }
                />
            )}

            {/* Add FAB */}
            <TouchableOpacity style={s.fab} onPress={handleOpenCreate} activeOpacity={0.85}>
                <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>

            <ModalSheet visible={isModalVisible} onClose={() => setIsModalVisible(false)} maxHeight="82%">
                <View style={s.drawerHeader}>
                    <Text style={s.drawerTitle}>{editingReminder ? 'Edit Reminder' : 'Add New Reminder'}</Text>
                    <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                        <Ionicons name="close" size={22} color="#475569" />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
                    <FormInput
                        label="Title *"
                        placeholder="Enter title (e.g. Pay Internet Bill)"
                        value={title}
                        onChangeText={setTitle}
                        icon={(props: any) => <Ionicons name="text-outline" size={18} color={props.color} />}
                    />

                    <Text style={s.formLabel}>Select Date *</Text>
                    <TouchableOpacity style={s.dateField} onPress={() => setDatePickerVisible(true)}>
                        <Ionicons name="calendar-outline" size={18} color="#64748B" />
                        <Text style={s.dateFieldText}>{date}</Text>
                    </TouchableOpacity>

                    <Text style={s.formLabel}>Category *</Text>
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

                    <Text style={s.formLabel}>Priority *</Text>
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

                    <FormInput
                        label="Description"
                        placeholder="Add optional details..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        icon={(props: any) => <Ionicons name="document-text-outline" size={18} color={props.color} />}
                    />

                    <TouchableOpacity
                        style={[s.submitBtn, submitLoading && { opacity: 0.6 }]}
                        onPress={handleSaveReminder}
                        disabled={submitLoading}
                    >
                        {submitLoading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={s.submitBtnText}>{editingReminder ? 'Update Reminder' : 'Add Reminder'}</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </ModalSheet>

            {/* Date Picker Modal */}
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={(d) => { setDate(d.toISOString().split('T')[0]); setDatePickerVisible(false); }}
                onCancel={() => setDatePickerVisible(false)}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFF' },
    headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

    statsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, padding: 12, alignItems: 'center' },
    statVal: { fontSize: 18, fontWeight: '900', color: '#FFF' },
    statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '700', marginTop: 2 },

    listContent: { padding: 16, paddingBottom: 120 },

    // Card styling
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 15,
        marginBottom: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    completedCard: { opacity: 0.65 },
    iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    info: { flex: 1, gap: 2 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
    cardSub: { fontSize: 11, color: '#64748B', fontWeight: '500' },
    cardDate: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
    completedText: { textDecorationLine: 'line-through' },

    actions: { alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 8 },
    priBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    priText: { fontSize: 8, fontWeight: '900' },

    actionRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
    actionBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 30 },
    emptyText: { fontSize: 16, color: '#1E293B', fontWeight: '800', marginTop: 12 },
    emptySub: { fontSize: 12, color: '#94A3B8', fontWeight: '500', textAlign: 'center', marginTop: 4 },

    fab: { position: 'absolute', bottom: 80, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#7C3AED', shadowOpacity: 0.3, shadowRadius: 8 },

    // Modal Drawer
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    drawerContainer: { flex: 1, justifyContent: 'flex-end' },
    drawerContent: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, height: '82%' },
    drawerHandle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    drawerTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },

    formLabel: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 6, marginTop: 12 },
    formInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, fontSize: 14, color: '#1E293B', fontWeight: '600' },
    textarea: { minHeight: 60, textAlignVertical: 'top' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
    chipText: { fontSize: 11, fontWeight: '700', color: '#64748B' },

    dateField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, gap: 10 },
    dateFieldText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },

    submitBtn: { height: 48, borderRadius: 12, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center', marginTop: 24, elevation: 2 },
    submitBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14 }
});
