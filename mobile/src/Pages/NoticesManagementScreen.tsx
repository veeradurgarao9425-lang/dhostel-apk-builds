import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, KeyboardAvoidingView, Platform, Modal, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList, SkeletonCardList } from '../components/ui/SkeletonCard';
import { DangerModal } from '../components/ui/DangerModal';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';

const NOTICE_TYPES = ['General', 'Important', 'Maintenance', 'Food'] as const;
type NoticeType = typeof NOTICE_TYPES[number];

const TYPE_CONFIG: Record<NoticeType, { emoji: string; color: string; bg: string }> = {
    General:     { emoji: '📢', color: '#6366F1', bg: '#EEF2FF' },
    Important:   { emoji: '🚨', color: '#DC2626', bg: '#FEE2E2' },
    Maintenance: { emoji: '🔧', color: '#D97706', bg: '#FEF3C7' },
    Food:        { emoji: '🍽️', color: '#16A34A', bg: '#DCFCE7' },
};

export default function NoticesManagementScreen({ navigation }: any) {
    const { user } = useAuth();
    const { showSuccess, showApiError, showError } = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notices, setNotices] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [noticeType, setNoticeType] = useState<NoticeType>('General');
    const [dangerModal, setDangerModal] = useState<{ visible: boolean; notice: any | null }>({
        visible: false, notice: null,
    });

    const fetchNotices = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const res = await api.get('/notices');
            if (res.data.success) {
                setNotices(res.data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch notices:', e);
            showError('Failed to load notices.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    const handleCreate = async () => {
        if (!title.trim() || !content.trim()) {
            showError('Title and content are required.');
            return;
        }
        setSaving(true);
        try {
            const res = await api.post('/notices', {
                title: title.trim(),
                content: content.trim(),
                notice_type: noticeType,
            });
            if (res.data.success) {
                showSuccess('Notice sent to all tenants!');
                setModalVisible(false);
                setTitle('');
                setContent('');
                setNoticeType('General');
                fetchNotices(true);
            } else {
                showError(res.data.error || 'Failed to post notice.');
            }
        } catch (e: any) {
            console.error('Failed to create notice:', e);
            showApiError(e, 'Network error.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (notice: any) => {
        setDangerModal({ visible: true, notice });
    };

    const handleDeleteConfirm = async () => {
        const { notice } = dangerModal;
        setDangerModal(p => ({ ...p, visible: false }));
        if (!notice) return;
        try {
            const res = await api.delete(`/notices/${notice.notice_id}`);
            if (res.data.success) {
                showSuccess('Notice removed.');
                fetchNotices(true);
            }
        } catch (e: any) {
            showApiError(e, 'Failed to delete notice.');
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const hrs = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (hrs < 1) return 'Just now';
        if (hrs < 24) return `${hrs}h ago`;
        return `${days}d ago`;
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Notices"
                subtitle="Post announcements to all tenants"
                onBack={() => navigation.goBack()}
                rightAction={
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add" size={22} color="#FFF" />
                    </TouchableOpacity>
                }
            />

            {loading ? (
                <SkeletonCardList count={4} />
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotices(true); }} tintColor="#7C3AED" />}
                >
                    {notices.length === 0 ? (
                        <EmptyState
                            icon="megaphone-outline"
                            title="No Notices Yet"
                            subtitle="Post your first announcement — tenants will see it instantly in their app."
                            actionLabel="Post Notice"
                            onAction={() => setModalVisible(true)}
                        />
                    ) : (
                        notices.map((n) => {
                            const cfg = TYPE_CONFIG[n.notice_type as NoticeType] || TYPE_CONFIG.General;
                            return (
                                <View key={n.notice_id} style={styles.card}>
                                    <View style={styles.cardTop}>
                                        <View style={[styles.typePill, { backgroundColor: cfg.bg }]}>
                                            <Text style={styles.typeEmoji}>{cfg.emoji}</Text>
                                            <Text style={[styles.typeLabel, { color: cfg.color }]}>{n.notice_type || 'General'}</Text>
                                        </View>
                                        <Text style={styles.timeText}>{timeAgo(n.created_at)}</Text>
                                    </View>
                                    <Text style={styles.noticeTitle}>{n.title}</Text>
                                    <Text style={styles.noticeContent} numberOfLines={3}>{n.content}</Text>
                                    <View style={styles.cardFooter}>
                                        <View style={styles.sentBadge}>
                                            <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                                            <Text style={styles.sentText}>Sent to all tenants</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleDelete(n)} style={styles.deleteBtn}>
                                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
                <LinearGradient colors={['#7C3AED', '#9333EA']} style={styles.fabGrad}>
                    <Ionicons name="add" size={26} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Create Notice Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Notice</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>This will be sent to all active tenants instantly.</Text>

                        {/* Type selector */}
                        <Text style={styles.label}>Category</Text>
                        <View style={styles.typeRow}>
                            {NOTICE_TYPES.map(type => {
                                const cfg = TYPE_CONFIG[type];
                                const active = noticeType === type;
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        style={[styles.typeChip, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                                        onPress={() => setNoticeType(type)}
                                    >
                                        <Text style={styles.typeChipEmoji}>{cfg.emoji}</Text>
                                        <Text style={[styles.typeChipText, active && { color: cfg.color }]}>{type}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Water Supply Interruption Tomorrow"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={120}
                        />

                        <Text style={styles.label}>Message</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            placeholder="Write the full notice here..."
                            value={content}
                            onChangeText={setContent}
                            multiline
                        />

                        <Text style={styles.label}>Attachment (Optional)</Text>
                        <TouchableOpacity style={styles.imageUploadBtn}>
                            <Ionicons name="image-outline" size={20} color="#7C3AED" />
                            <Text style={styles.imageUploadText}>Upload Image</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.saveBtn, (saving || !title.trim() || !content.trim()) && { opacity: 0.6 }]}
                            onPress={handleCreate}
                            disabled={saving || !title.trim() || !content.trim()}
                        >
                            <LinearGradient colors={['#7C3AED', '#9333EA']} style={styles.saveBtnGrad}>
                                {saving
                                    ? <ActivityIndicator color="#FFF" />
                                    : <>
                                        <Ionicons name="megaphone-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                                        <Text style={styles.saveBtnText}>Post Notice</Text>
                                    </>
                                }
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

            <DangerModal
                visible={dangerModal.visible}
                title="Delete Notice?"
                message={`Delete "${dangerModal.notice?.title || 'this notice'}"? Tenants will no longer see it.`}
                confirmText="Delete"
                onCancel={() => setDangerModal(p => ({ ...p, visible: false }))}
                onConfirm={handleDeleteConfirm}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },

    card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    typePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    typeEmoji: { fontSize: 12 },
    typeLabel: { fontSize: 12, fontWeight: '700' },
    timeText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
    noticeTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
    noticeContent: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 10 },
    sentBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    sentText: { fontSize: 12, color: '#16A34A', fontWeight: '600' },
    deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },

    fab: { position: 'absolute', bottom: 100, right: 20, borderRadius: 28, elevation: 8, shadowColor: '#7C3AED', shadowOpacity: 0.4, shadowRadius: 12 },
    fabGrad: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '90%' },
    modalHandle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
    modalSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 20 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8, marginTop: 16 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    typeChipEmoji: { fontSize: 14 },
    typeChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E293B', fontWeight: '500' },
    inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
    saveBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#7C3AED', shadowOpacity: 0.3, shadowRadius: 8 },
    saveBtnGrad: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
    imageUploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3E8FF', borderWidth: 1, borderColor: '#D8B4FE', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, marginBottom: 20 },
    imageUploadText: { color: '#7C3AED', fontSize: 14, fontWeight: '600', marginLeft: 8 },
});
