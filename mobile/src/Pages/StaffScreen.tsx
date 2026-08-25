import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    StatusBar, LayoutAnimation, Platform, UIManager,
    Linking, ScrollView, SectionList, Modal, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { HeaderNotification } from '../components/HeaderNotification';
import { ProfileMenu } from '../components/ProfileMenu';
import { AppHeader } from '../components/AppHeader';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../theme/index';
import { Plus } from 'lucide-react-native';
import { getResolvedImageUrl } from '../utils/imageHelper';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Staff Categories ────────────────────────────────────────────────────────
const CATEGORIES = [
    { key: 'All', label: 'Management', icon: 'briefcase', color: '#4F46E5', bg: '#EEF2FF' },
    { key: 'Cook', label: 'Kitchen', icon: 'restaurant', color: '#D97706', bg: '#FEF3C7' },
    { key: 'Housekeeping', label: 'Housekeeping', icon: 'brush', color: '#059669', bg: '#D1FAE5' },
    { key: 'Security', label: 'Security', icon: 'shield-checkmark', color: '#DC2626', bg: '#FEE2E2' },
    { key: 'Others', label: 'Others', icon: 'ellipsis-horizontal', color: '#475569', bg: '#F1F5F9' },
];

const ROLES = ['Cook', 'Housekeeping', 'Security', 'Warden', 'Cleaner', 'Others'];

// ─── Staff Card Component ───────────────────────────────────────────────────
const StaffCard = React.memo(({ item, onCall, onWhatsApp, onToggleStatus, onPayments, onPressCard }: any) => {
    const isActive = item.status === 'ACTIVE';
    const initials = item.full_name ? item.full_name[0].toUpperCase() : 'S';
    const [imgErr, setImgErr] = useState(false);
    const photoUrl = getResolvedImageUrl(item.photo);

    return (
        <TouchableOpacity style={s.card} activeOpacity={0.9} onPress={() => onPressCard(item)}>
            <View style={s.cardMain}>
                <View style={s.avatarBox}>
                    {photoUrl && !imgErr ? (
                        <Image
                            source={{ uri: photoUrl }}
                            style={s.avatarImg}
                            onError={() => setImgErr(true)}
                        />
                    ) : (
                        <Text style={s.avatarInitials}>{initials}</Text>
                    )}
                </View>
                <View style={s.infoContainer}>
                    <Text style={s.nameText} numberOfLines={1}>{item.full_name}</Text>
                    <Text style={s.phoneText}>{item.phone}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        <View style={s.roleBadge}>
                            <Text style={s.roleBadgeText}>{item.role}</Text>
                        </View>
                        {item.monthly_salary != null && item.monthly_salary !== '' && (
                            <View style={[s.roleBadge, { backgroundColor: '#F0FDF4' }]}>
                                <Text style={[s.roleBadgeText, { color: '#16A34A' }]}>₹ {Number(item.monthly_salary).toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={[s.statusBadge, { backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2', position: 'absolute', top: 15, right: 15 }]}>
                    <Text style={[s.statusBadgeText, { color: isActive ? '#16A34A' : '#EF4444' }]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <View style={s.divider} />

            <View style={s.cardActions}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => onWhatsApp(item.phone, item.full_name)}
                        style={s.actionBtnIcon}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                        <Text style={s.actionBtnIconText}>WhatsApp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onCall(item.phone)}
                        style={s.actionBtnIcon}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="call" size={14} color="#0EA5E9" />
                        <Text style={s.actionBtnIconText}>Call</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                        onPress={() => onPayments(item)}
                        style={[s.statusToggleBtnNew, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}
                    >
                        <Text style={[s.statusToggleTextNew, { color: '#9333EA' }]}>Wallet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onToggleStatus(item)}
                        style={[
                            s.statusToggleBtnNew,
                            {
                                backgroundColor: isActive ? '#FEE2E2' : '#DCFCE7',
                                borderColor: isActive ? '#FECACA' : '#BBF7D0'
                            }
                        ]}
                    >
                        <Text style={[s.statusToggleTextNew, { color: isActive ? '#EF4444' : '#16A34A' }]}>
                            {isActive ? 'Deactivate' : 'Activate'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
});

// ─── Main Component ──────────────────────────────────────────────────────────
export default function StaffScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const { user } = useAuth();
    const confirm = useConfirmation();
    const { showApiError, showSuccess, showError } = useToast();

    const [staffList, setStaffList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const lastStaffFetchRef = useRef<number>(0);

    // ── Fetch Staff list ─────────────────────────────────────────────────────
    const fetchStaff = async (isSilent = false, force = false) => {
        const now = Date.now();
        if (!force && staffList.length > 0 && now - lastStaffFetchRef.current < 15000) {
            return;
        }
        try {
            lastStaffFetchRef.current = now;
            if (!isSilent && staffList.length === 0) setLoading(true);
            const res = await api.get('/staff');
            if (res.data?.success) {
                setStaffList(res.data.data || []);
            }
        } catch (e) {
            showApiError(e, 'Failed to fetch staff list');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStaff(true);
        }, [staffList.length])
    );

    // ── Group filtered staff by role category ──────────────────────────────────
    const groupedStaff = useMemo(() => {
        const q = search.toLowerCase().trim();
        const filtered = staffList.filter(item => {
            return !q ||
                item.full_name?.toLowerCase().includes(q) ||
                item.phone?.includes(q) ||
                item.role?.toLowerCase().includes(q);
        });

        const groups: Record<string, { title: string; icon: string; color: string; bg: string; data: any[] }> = {
            Management: { title: 'Management', icon: 'briefcase', color: '#4F46E5', bg: '#EEF2FF', data: [] },
            Kitchen: { title: 'Kitchen Staff', icon: 'restaurant', color: '#D97706', bg: '#FEF3C7', data: [] },
            Housekeeping: { title: 'Housekeeping & Cleaning', icon: 'brush', color: '#059669', bg: '#D1FAE5', data: [] },
            Security: { title: 'Security', icon: 'shield-checkmark', color: '#DC2626', bg: '#FEE2E2', data: [] },
            Others: { title: 'Others', icon: 'ellipsis-horizontal', color: '#475569', bg: '#F1F5F9', data: [] }
        };

        filtered.forEach(item => {
            const role = (item.role || '').toLowerCase();
            if (role === 'warden' || role === 'manager') {
                groups.Management.data.push(item);
            } else if (role === 'cook') {
                groups.Kitchen.data.push(item);
            } else if (role === 'housekeeping' || role === 'cleaner' || role === 'laundry') {
                groups.Housekeeping.data.push(item);
            } else if (role === 'security') {
                groups.Security.data.push(item);
            } else {
                groups.Others.data.push(item);
            }
        });

        return Object.values(groups).filter(sec => sec.data.length > 0);
    }, [staffList, search]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleCall = useCallback((num: string) => {
        Linking.openURL(`tel:${num}`);
    }, []);

    const handleWhatsApp = useCallback((num: string, name: string) => {
        const msg = `Hi ${name}, hope you are doing well! 🏠`;
        Linking.openURL(`whatsapp://send?phone=91${num}&text=${encodeURIComponent(msg)}`);
    }, []);

    const handleToggleStatus = useCallback(async (item: any) => {
        const nextStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        confirm({
            title: 'Update Status',
            message: `Change ${item.full_name}'s status to ${nextStatus}?`,
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            variant: 'warning',
            onConfirm: async () => {
                try {
                    const res = await api.put(`/staff/${item.staff_id}`, { status: nextStatus });
                    if (res.data.success) {
                        fetchStaff(true);
                        showSuccess('Status updated successfully.');
                    }
                } catch (e) {
                    showError('Failed to update status');
                }
            }
        });
    }, [confirm]);

    // ── Rendering helper for list items ──────────────────────────────────────
    const handlePayments = useCallback((item: any) => {
        navigation.navigate('StaffPayments', { staffId: item.staff_id, staffName: item.full_name });
    }, [navigation]);

    const handleCardPress = useCallback((item: any) => {
        navigation.navigate('StaffDetails', { staffId: item.staff_id });
    }, [navigation]);

    const renderItem = useCallback(({ item }: any) => (
        <StaffCard
            item={item}
            onCall={handleCall}
            onWhatsApp={handleWhatsApp}
            onToggleStatus={handleToggleStatus}
            onPayments={handlePayments}
            onPressCard={handleCardPress}
        />
    ), [handleCall, handleWhatsApp, handleToggleStatus, handlePayments, handleCardPress]);

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <AppHeader
                title="Staff Management"
                subtitle={`${staffList.length} Total Members`}
                rightComponent={
                    <View style={s.headerActions}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                }
            >
                {/* Search box */}
                <View style={s.searchContainer}>
                    <Ionicons name="search" size={18} color="#94A3B8" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search staffs..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>
            </AppHeader>

            {/* Content List */}
            {loading ? (
                <SkeletonList count={6} />
            ) : (
                <SectionList
                    sections={groupedStaff}
                    keyExtractor={(item) => item.staff_id.toString()}
                    renderItem={renderItem}
                    renderSectionHeader={({ section: { title, icon, color, bg, data } }) => (
                        <View style={[s.sectionHeaderContainer, { backgroundColor: bg }]}>
                            <View style={[s.sectionIconContainer, { backgroundColor: color }]}>
                                <Ionicons name={icon as any} size={13} color="#FFF" />
                            </View>
                            <Text style={[s.sectionHeaderTitle, { color }]}>{title}</Text>
                            <View style={[s.sectionHeaderBadge, { backgroundColor: color }]}>
                                <Text style={s.sectionHeaderBadgeText}>{data.length}</Text>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={[
                        s.listContent,
                        staffList.length === 0 && { flexGrow: 1, justifyContent: 'center' }
                    ]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <EmptyState illustration="staff"
                            title={search.trim() ? 'No Results' : 'No Staff Yet'}
                            subtitle={
                                search.trim()
                                    ? `No staff match "${search.trim()}"`
                                    : 'Add your first staff member to get started.'
                            }
                            actionLabel={search.trim() ? undefined : 'Add Staff'}
                            onAction={search.trim() ? undefined : () => navigation.navigate('AddStaff')}
                        />
                    }
                />
            )}

            {/* Floating Action Button (FAB) to Add Staff */}
            <TouchableOpacity
                style={[
                    s.fab,
                    {
                        backgroundColor: theme.primary,
                        bottom: Math.max(insets.bottom + 85, 100),
                    },
                ]}
                onPress={() => navigation.navigate('AddStaff')}
                activeOpacity={0.85}
            >
                <Plus color="#FFF" size={26} strokeWidth={2.8} />
            </TouchableOpacity>
        </View>
    );
}

// ─── Stylesheet ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    headerActions: { flexDirection: 'row', gap: 12 },

    searchContainer: { backgroundColor: '#FFF', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 46 },
    searchInput: { flex: 1, marginLeft: 10, fontWeight: '600', color: '#1E293B' },

    // Section Headers
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginTop: 16,
        marginBottom: 8,
        gap: 8
    },
    sectionIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    sectionHeaderTitle: {
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        flex: 1
    },
    sectionHeaderBadge: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center'
    },
    sectionHeaderBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900'
    },

    listContent: { padding: 16, paddingBottom: 180 },

    // Cards
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
    },
    cardMain: { flex: 1, padding: 15, flexDirection: 'row', alignItems: 'center' },
    avatarBox: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: 50, height: 50, borderRadius: 25 },
    avatarInitials: { fontSize: 20, fontWeight: '900', color: '#4F46E5' },
    infoContainer: { flex: 1, marginLeft: 15 },
    nameText: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
    phoneText: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 2 },
    salaryText: { fontSize: 12, color: '#475569', fontWeight: '800', marginBottom: 6 },
    badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    roleBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6
    },
    roleBadgeText: { fontSize: 9, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
    statusBadge: {
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6
    },
    statusBadgeText: { fontSize: 9, fontWeight: '900' },

    actionColumn: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    iconCircle: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#F1F5F9'
    },

    divider: { height: 1, backgroundColor: '#F1F5F9' },
    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#FAFAFA' },
    actionBtnIcon: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
    actionBtnIconText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
    statusToggleBtnNew: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    statusToggleTextNew: { fontSize: 11, fontWeight: '800' },

    fab: {
        position: 'absolute',
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

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },

    formLabel: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 6, marginTop: 12 },
    formInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, fontSize: 14, color: '#1E293B', fontWeight: '600' },

    // Selfie box
    selfieBox: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FFF5F5', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    selfieLabel: { fontSize: 13, fontWeight: '800', color: '#EC4899', marginTop: 8 },
    selfieSub: { fontSize: 10, color: '#94A3B8', fontWeight: '500', marginTop: 2 },

    roleSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    roleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
    roleChipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

    statusSelector: { flexDirection: 'row', gap: 8, marginTop: 4 },
    statusChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF', alignItems: 'center' },
    statusChipText: { fontSize: 12, fontWeight: '800', color: '#64748B' },

    dateField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, gap: 10 },
    dateText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },

    uploadRow: { flexDirection: 'row', marginTop: 4 },
    uploadButton: { height: 42, backgroundColor: '#4F46E5', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    uploadBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

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
        backgroundColor: '#FF6B6B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
});
