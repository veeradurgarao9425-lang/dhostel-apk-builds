import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, RefreshControl, Image, StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Plus, Search, Tag, X, Edit3, Trash2, Calendar, Megaphone } from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { DangerModal } from '../components/ui/DangerModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRefresh } from '../../contexts/RefreshContext';
import api from '../services/api';
import { HeaderNotification } from '../components/HeaderNotification';
import { ProfileMenu } from '../components/ProfileMenu';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { getResolvedImageUrl } from '../utils/imageHelper';

const DEFAULT_CATEGORIES = [
    { category_name: 'General', emoji: '📢', color: '#6366F1' },
    { category_name: 'Important', emoji: '🚨', color: '#DC2626' },
    { category_name: 'Maintenance', emoji: '🔧', color: '#D97706' },
    { category_name: 'Food', emoji: '🍽️', color: '#16A34A' },
];

export default function NoticesManagementScreen({ navigation }: any) {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const refreshData = (useRefresh as any)();
    const refreshKey = refreshData.refreshKey;
    const { showSuccess, showApiError } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notices, setNotices] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);
    const [search, setSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [dangerModal, setDangerModal] = useState<{ visible: boolean; notice: any | null }>({
        visible: false, notice: null,
    });

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const [catRes, notRes] = await Promise.all([
                api.get('/notices/categories').catch(() => ({ data: { data: [] } })),
                api.get('/notices')
            ]);
            
            if (catRes.data?.data?.length > 0) {
                const custom = catRes.data.data;
                const merged = [...DEFAULT_CATEGORIES];
                custom.forEach((c: any) => {
                    if (!merged.find(m => m.category_name.toLowerCase() === c.category_name.toLowerCase())) {
                        merged.push({
                            category_name: c.category_name,
                            emoji: c.emoji || '📌',
                            color: c.color || '#8B5CF6'
                        });
                    }
                });
                setCategories(merged);
            }
            
            if (notRes.data.success) {
                setNotices(notRes.data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch data:', e);
            showApiError(e, 'Failed to load notices.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchData(true);
        }, [fetchData, refreshKey])
    );

    const handleDeleteConfirm = async () => {
        const { notice } = dangerModal;
        setDangerModal(p => ({ ...p, visible: false }));
        if (!notice) return;
        try {
            const res = await api.delete(`/notices/${notice.notice_id}`);
            if (res.data.success) {
                showSuccess('Notice removed.');
                fetchData(true);
            }
        } catch (e: any) {
            showApiError(e, 'Failed to delete notice.');
        }
    };

    const timeAgo = (dateStr: string) => {
        if (!dateStr) return 'Just now';
        const safeDateStr = dateStr.endsWith('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
        const date = new Date(safeDateStr);
        let diff = Date.now() - date.getTime();
        
        if (isNaN(diff) || diff < 0) diff = 0;

        const mins = Math.floor(diff / 60000);
        const hrs = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hrs < 24) return `${hrs}h ago`;
        return `${days}d ago`;
    };

    const getCatConfig = (type: string) => {
        return categories.find(c => c.category_name === type) || { category_name: type, emoji: '📌', color: '#64748B' };
    };

    const filteredNotices = notices.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                              n.content.toLowerCase().includes(search.toLowerCase()) ||
                              n.notice_type?.toLowerCase().includes(search.toLowerCase());
        
        let matchesDate = true;
        if (selectedDate) {
            const nDate = new Date(n.created_at);
            matchesDate = nDate.getFullYear() === selectedDate.getFullYear() &&
                          nDate.getMonth() === selectedDate.getMonth() &&
                          nDate.getDate() === selectedDate.getDate();
        }
        return matchesSearch && matchesDate;
    });

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader
                title="Notices"
                subtitle="Broadcast announcement to all tenants"
                alignLeft={true}
                rightComponent={
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                }
            />

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <Search color={isDark ? '#94A3B8' : "#999999"} size={20} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                        placeholder="Search notices or categories..."
                        placeholderTextColor={isDark ? '#64748B' : "#999999"}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7} style={{ padding: 4 }}>
                            <X color={isDark ? '#94A3B8' : "#999999"} size={16} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity 
                    style={[styles.filterBtn, { backgroundColor: selectedDate ? theme.primary : (isDark ? '#1E293B' : '#FFFFFF'), borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                    onPress={() => setDatePickerVisibility(true)}
                    activeOpacity={0.7}
                >
                    <Calendar color={selectedDate ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')} size={20} />
                </TouchableOpacity>
                {selectedDate && (
                    <TouchableOpacity 
                        style={styles.clearDateBtn}
                        onPress={() => setSelectedDate(null)}
                        activeOpacity={0.7}
                    >
                        <X color="#EF4444" size={14} />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={{ paddingHorizontal: 16 }}><SkeletonList count={4} /></View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.listContentContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(true); }} tintColor={theme.primary} />}
                >
                    {filteredNotices.length === 0 ? (
                        <EmptyState illustration="notice"
                            title={search ? 'No Results' : 'No Notices Yet'}
                            subtitle={search ? 'Try adjusting your search filters.' : 'Post your first announcement — tenants will see it instantly in their app.'}
                            actionLabel={search ? undefined : 'Post Notice'}
                            onAction={search ? undefined : () => navigation.navigate('AddNotice')}
                        />
                    ) : (
                        filteredNotices.map((n) => {
                            const cfg = getCatConfig(n.notice_type);
                            return (
                                <TouchableOpacity 
                                    key={n.notice_id} 
                                    activeOpacity={0.9}
                                    onPress={() => navigation.navigate('NoticeDetails', { notice: n, categoryConfig: cfg, isAdmin: true })}
                                    style={[styles.premiumCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}
                                >
                                    <View style={[styles.cardAccentLine, { backgroundColor: cfg.color }]} />
                                    <View style={styles.cardInner}>
                                        <View style={styles.cardHeaderRow}>
                                            <View style={[styles.cardAvatarBg, { backgroundColor: isDark ? cfg.color + '25' : cfg.color + '15' }]}>
                                                <Text style={{ fontSize: 16 }}>{cfg.emoji}</Text>
                                            </View>
                                            <View style={styles.cardNameBlock}>
                                                <Text style={[styles.cardNameText, { color: theme.textPrimary }]} numberOfLines={1}>{cfg.category_name}</Text>
                                                <Text style={styles.cardStatusSub}>{timeAgo(n.created_at)}</Text>
                                            </View>
                                            <View style={styles.cardRightBlock}>
                                                <View style={styles.sentBadge}>
                                                    <Ionicons name="checkmark-done" size={14} color="#16A34A" />
                                                    <Text style={styles.sentText}>Sent</Text>
                                                </View>
                                            </View>
                                        </View>

                                        <Text style={[styles.noticeTitle, { color: theme.textPrimary }]}>{n.title}</Text>
                                        <Text style={[styles.noticeContent, { color: theme.textSecondary }]} numberOfLines={4}>{n.content}</Text>
                                        
                                        {n.image_url && (
                                            <Image 
                                                source={{ uri: getResolvedImageUrl(n.image_url) || '' }} 
                                                style={styles.noticeImage} 
                                            />
                                        )}

                                        <View style={[styles.cardFooterRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                            <View style={styles.footerLeftGroup}>
                                                <View style={styles.footerMetaItem}>
                                                    <Megaphone size={13} color="#94A3B8" />
                                                    <Text style={styles.footerMetaText}>Sent to all active tenants</Text>
                                                </View>
                                            </View>
                                            <View style={styles.cardActions}>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                                    onPress={() => navigation.navigate('AddNotice', { isEdit: true, notice: n })}
                                                    activeOpacity={0.7}
                                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                >
                                                    <Edit3 size={12} color="#3B82F6" />
                                                    <Text style={styles.actionBtnTextBlue}>Edit</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                                    onPress={() => setDangerModal({ visible: true, notice: n })}
                                                    activeOpacity={0.7}
                                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                >
                                                    <Trash2 size={12} color="#EF4444" />
                                                    <Text style={styles.actionBtnTextRed}>Delete</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('AddNotice')}
                activeOpacity={0.9}
            >
                <Plus color="#FFFFFF" size={22} strokeWidth={3.2} />
            </TouchableOpacity>

            <DangerModal
                visible={dangerModal.visible}
                title="Delete Notice?"
                message={`Delete "${dangerModal.notice?.title || 'this notice'}"? Tenants will no longer see it.`}
                confirmText="Delete"
                onCancel={() => setDangerModal(p => ({ ...p, visible: false }))}
                onConfirm={handleDeleteConfirm}
            />

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={(date) => {
                    setSelectedDate(date);
                    setDatePickerVisibility(false);
                }}
                onCancel={() => setDatePickerVisibility(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    searchSection: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        gap: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        gap: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '500',
    },
    filterBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearDateBtn: {
        position: 'absolute',
        right: 8,
        top: 6,
        backgroundColor: '#FEE2E2',
        borderRadius: 10,
        padding: 2,
    },
    listContentContainer: {
        padding: 16,
        paddingBottom: 180,
    },
    premiumCard: {
        borderRadius: 20,
        marginBottom: 12,
        flexDirection: 'row',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    cardAccentLine: {
        width: 5,
    },
    cardInner: {
        flex: 1,
        padding: 14,
        gap: 10,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardAvatarBg: {
        width: 38, height: 38,
        borderRadius: 19,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 10,
    },
    cardNameBlock: {
        flex: 1,
        justifyContent: 'center',
    },
    cardNameText: {
        fontSize: 12,
        fontWeight: '700',
    },
    cardStatusSub: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 2,
    },
    cardRightBlock: {
        alignItems: 'flex-end',
    },
    sentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    sentText: { fontSize: 10, color: '#16A34A', fontWeight: '700' },
    noticeTitle: {
        fontSize: 15,
        fontWeight: '800',
        marginTop: 2,
    },
    noticeContent: {
        fontSize: 13,
        lineHeight: 18,
    },
    noticeImage: {
        width: '100%',
        height: 140,
        borderRadius: 10,
        marginTop: 4,
        resizeMode: 'cover',
    },
    cardFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        paddingTop: 10,
        marginTop: 2,
    },
    footerLeftGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    footerMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerMetaText: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '700',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
    },
    actionBtnTextBlue: {
        fontSize: 10,
        color: '#3B82F6',
        fontWeight: '700',
    },
    actionBtnTextRed: {
        fontSize: 10,
        color: '#EF4444',
        fontWeight: '700',
    },
    fab: {
        position: 'absolute',
        bottom: 140,
        right: 20,
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        zIndex: 99999,
    },
});
