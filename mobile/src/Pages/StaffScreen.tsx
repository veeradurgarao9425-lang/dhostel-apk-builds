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
import { Plus, UserPlus, KeyRound, Check } from 'lucide-react-native';
import { getResolvedImageUrl } from '../utils/imageHelper';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Staff Card Component ───────────────────────────────────────────────────
const StaffCard = React.memo(({ item, onCall, onWhatsApp, onToggleStatus, onPayments, onEditAccess, onPressCard }: any) => {
    const isActive = item.status === 'ACTIVE';
    const hasAccess = Boolean(item.can_login || item.user_id);
    const initials = item.full_name ? item.full_name[0].toUpperCase() : 'S';
    const [imgErr, setImgErr] = useState(false);
    const photoUrl = getResolvedImageUrl(item.photo);

    return (
        <TouchableOpacity style={s.card} activeOpacity={0.9} onPress={() => onPressCard(item)}>
            {/* ── Top Tags Strip ("tags in card top") ── */}
            <View style={s.cardTopTags}>
                <View style={s.tagGroupLeft}>
                    {/* Role Tag */}
                    <View style={s.roleBadge}>
                        <Text style={s.roleBadgeText}>{item.role || 'Staff'}</Text>
                    </View>

                    {/* App Access Tag */}
                    {hasAccess ? (
                        <View style={s.accessBadge}>
                            <Ionicons name="key" size={10} color="#2563EB" />
                            <Text style={s.accessBadgeText}>App Access</Text>
                        </View>
                    ) : null}

                    {/* Monthly Salary Tag */}
                    {item.monthly_salary != null && item.monthly_salary !== '' && (
                        <View style={[s.roleBadge, { backgroundColor: '#F0FDF4' }]}>
                            <Text style={[s.roleBadgeText, { color: '#16A34A' }]}>
                                ₹{Number(item.monthly_salary).toLocaleString('en-IN')}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Status Tag */}
                <View style={[s.statusBadge, { backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2' }]}>
                    <View style={[s.statusDot, { backgroundColor: isActive ? '#16A34A' : '#EF4444' }]} />
                    <Text style={[s.statusBadgeText, { color: isActive ? '#16A34A' : '#EF4444' }]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            {/* ── Main Details ── */}
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
                    {item.email ? <Text style={s.emailText} numberOfLines={1}>{item.email}</Text> : null}
                </View>
            </View>

            <View style={s.divider} />

            {/* ── Actions Strip ── */}
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
                    {/* Direct App Access Button */}
                    <TouchableOpacity
                        onPress={() => onEditAccess(item)}
                        style={[
                            s.statusToggleBtnNew,
                            {
                                backgroundColor: hasAccess ? '#EFF6FF' : '#F8FAFC',
                                borderColor: hasAccess ? '#BFDBFE' : '#E2E8F0',
                            }
                        ]}
                    >
                        <Text style={[s.statusToggleTextNew, { color: hasAccess ? '#2563EB' : '#64748B' }]}>
                            {hasAccess ? 'Access' : '+ Access'}
                        </Text>
                    </TouchableOpacity>

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
    const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'access' | 'cook' | 'housekeeping' | 'security' | 'others'>('all');

    const lastStaffFetchRef = useRef<number>(0);

    // ── Helper to check if staff has app access ─────────────────────────────
    const hasAppAccess = useCallback((s: any) => {
        if (!s) return false;
        if (s.can_login === 1 || s.can_login === '1' || s.can_login === true || s.can_login === 'true') return true;
        if (s.user_id && s.user_id !== 0 && s.user_id !== '0') return true;
        if (s.permissions && typeof s.permissions === 'object') {
            const vals = Object.values(s.permissions);
            if (vals.some(v => v === 'manage' || v === 'view' || v === true)) return true;
        }
        return false;
    }, []);

    // ── Fetch Staff list ─────────────────────────────────────────────────────
    const fetchStaff = async (isSilent = false, force = false) => {
        const now = Date.now();
        if (!force && staffList.length > 0 && now - lastStaffFetchRef.current < 5000) {
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
            fetchStaff(true, true);
        }, [])
    );

    // ── Calculate Category & Status Counts ────────────────────────────────────
    const counts = useMemo(() => {
        const total = staffList.length;
        const active = staffList.filter(s => s.status === 'ACTIVE').length;
        const inactive = staffList.filter(s => s.status !== 'ACTIVE').length;
        const access = staffList.filter(hasAppAccess).length;
        const cook = staffList.filter(s => (s.role || '').toLowerCase().includes('cook')).length;
        const housekeeping = staffList.filter(s => {
            const r = (s.role || '').toLowerCase();
            return r.includes('housekeeping') || r.includes('cleaner') || r.includes('laundry');
        }).length;
        const security = staffList.filter(s => (s.role || '').toLowerCase().includes('security')).length;
        const others = staffList.filter(s => {
            const r = (s.role || '').toLowerCase();
            return !r.includes('cook') && !r.includes('housekeeping') && !r.includes('cleaner') && !r.includes('laundry') && !r.includes('security') && !r.includes('warden') && !r.includes('manager');
        }).length;
        return { total, active, inactive, access, cook, housekeeping, security, others };
    }, [staffList, hasAppAccess]);

    // ── Small Filter Tabs Config ──────────────────────────────────────────────
    const FILTER_TABS = useMemo(() => [
        { key: 'all', label: 'All', count: counts.total },
        { key: 'active', label: 'Active', count: counts.active },
        { key: 'inactive', label: 'Inactive', count: counts.inactive },
        { key: 'access', label: 'App Access', count: counts.access, icon: 'key-outline' },
        { key: 'cook', label: 'Kitchen', count: counts.cook },
        { key: 'housekeeping', label: 'Housekeeping', count: counts.housekeeping },
        { key: 'security', label: 'Security', count: counts.security },
        { key: 'others', label: 'Others', count: counts.others },
    ], [counts]);

    // ── Group filtered staff by role category ──────────────────────────────────
    const groupedStaff = useMemo(() => {
        const q = search.toLowerCase().trim();
        const filtered = staffList.filter(item => {
            const matchSearch = !q ||
                item.full_name?.toLowerCase().includes(q) ||
                item.phone?.includes(q) ||
                item.role?.toLowerCase().includes(q);
            if (!matchSearch) return false;

            if (activeTab === 'active') return item.status === 'ACTIVE';
            if (activeTab === 'inactive') return item.status !== 'ACTIVE';
            if (activeTab === 'access') return hasAppAccess(item);
            if (activeTab === 'cook') return (item.role || '').toLowerCase().includes('cook');
            if (activeTab === 'housekeeping') {
                const r = (item.role || '').toLowerCase();
                return r.includes('housekeeping') || r.includes('cleaner') || r.includes('laundry');
            }
            if (activeTab === 'security') return (item.role || '').toLowerCase().includes('security');
            if (activeTab === 'others') {
                const r = (item.role || '').toLowerCase();
                return !r.includes('cook') && !r.includes('housekeeping') && !r.includes('cleaner') && !r.includes('laundry') && !r.includes('security') && !r.includes('warden') && !r.includes('manager');
            }

            return true;
        });

        if (activeTab === 'access') {
            return filtered.length > 0 ? [{
                title: `Staff with App Access (${filtered.length})`,
                icon: 'key',
                color: '#2563EB',
                bg: '#EFF6FF',
                data: filtered
            }] : [];
        }

        const groups: Record<string, { title: string; icon: string; color: string; bg: string; data: any[] }> = {
            Management: { title: 'Management & Wardens', icon: 'briefcase', color: '#4F46E5', bg: '#EEF2FF', data: [] },
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
    }, [staffList, search, activeTab, hasAppAccess]);

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

    const handlePayments = useCallback((item: any) => {
        navigation.navigate('StaffPayments', { staffId: item.staff_id, staffName: item.full_name });
    }, [navigation]);

    const handleEditAccess = useCallback((item: any) => {
        navigation.navigate('AddTeamMember', { staffId: item.staff_id });
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
            onEditAccess={handleEditAccess}
            onPressCard={handleCardPress}
        />
    ), [handleCall, handleWhatsApp, handleToggleStatus, handlePayments, handleEditAccess, handleCardPress]);

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

            {/* ── Top Small Tabs (All, Active, Inactive, App Access, Categories) ── */}
            <View style={s.filterTabsContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.filterTabsScroll}
                >
                    {FILTER_TABS.map(tab => {
                        const isSelected = activeTab === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setActiveTab(tab.key as any);
                                }}
                                style={[
                                    s.filterTabPill,
                                    isSelected && s.filterTabPillActive,
                                ]}
                                activeOpacity={0.7}
                            >
                                {tab.icon && (
                                    <Ionicons
                                        name={tab.icon as any}
                                        size={12}
                                        color={isSelected ? '#FFFFFF' : '#2563EB'}
                                        style={{ marginRight: 4 }}
                                    />
                                )}
                                <Text style={[s.filterTabText, isSelected && s.filterTabTextActive]}>
                                    {tab.label}
                                </Text>
                                <View style={[s.filterTabBadge, isSelected && s.filterTabBadgeActive]}>
                                    <Text style={[s.filterTabBadgeText, isSelected && s.filterTabBadgeTextActive]}>
                                        {tab.count}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ── Banner when App Access Tab is selected ── */}
            {activeTab === 'access' && (
                <View style={s.accessHeaderBanner}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.accessBannerTitle}>App Access Members</Text>
                        <Text style={s.accessBannerSub}>
                            Staff who can log into Hostix and manage enabled modules.
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={s.addTeamMemberBtn}
                        onPress={() => navigation.navigate('AddTeamMember')}
                        activeOpacity={0.8}
                    >
                        <UserPlus size={14} color="#FFFFFF" />
                        <Text style={s.addTeamMemberBtnText}>Add Member</Text>
                    </TouchableOpacity>
                </View>
            )}

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
                        groupedStaff.length === 0 && { flexGrow: 1, justifyContent: 'center' }
                    ]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <EmptyState
                            illustration="staff"
                            title={
                                activeTab === 'access'
                                    ? 'No Members with App Access'
                                    : search.trim()
                                    ? 'No Results'
                                    : 'No Staff Found'
                            }
                            subtitle={
                                activeTab === 'access'
                                    ? 'Add a team member to give them mobile app login and module access.'
                                    : search.trim()
                                    ? `No staff match "${search.trim()}"`
                                    : 'Add your first staff member to get started.'
                            }
                            actionLabel={activeTab === 'access' ? 'Add Team Member' : 'Add Staff'}
                            onAction={() => navigation.navigate(activeTab === 'access' ? 'AddTeamMember' : 'AddStaff')}
                        />
                    }
                />
            )}

            {/* Floating Action Button (FAB) */}
            <TouchableOpacity
                style={[
                    s.fab,
                    {
                        backgroundColor: activeTab === 'access' ? '#2563EB' : theme.primary,
                        bottom: Math.max(insets.bottom + 20, 24),
                    },
                ]}
                onPress={() => navigation.navigate(activeTab === 'access' ? 'AddTeamMember' : 'AddStaff')}
                activeOpacity={0.85}
            >
                <Plus size={28} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
}

// ─── Stylesheet ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    headerActions: { flexDirection: 'row', gap: 12 },

    searchContainer: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 46,
    },
    searchInput: { flex: 1, marginLeft: 10, fontWeight: '600', color: '#1E293B' },

    // ── Top Small Filter Tabs ──
    filterTabsContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingVertical: 10,
    },
    filterTabsScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterTabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterTabPillActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    filterTabText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    filterTabTextActive: {
        color: '#FFFFFF',
    },
    filterTabBadge: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
        marginLeft: 6,
    },
    filterTabBadgeActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    filterTabBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#475569',
    },
    filterTabBadgeTextActive: {
        color: '#FFFFFF',
    },

    // ── App Access Banner ──
    accessHeaderBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#EFF6FF',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    accessBannerTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1D4ED8',
    },
    accessBannerSub: {
        fontSize: 11,
        color: '#60A5FA',
        fontWeight: '500',
        marginTop: 2,
    },
    addTeamMemberBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#2563EB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    addTeamMemberBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Section Headers
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginTop: 14,
        marginBottom: 8,
        gap: 8,
    },
    sectionIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeaderTitle: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        flex: 1,
    },
    sectionHeaderBadge: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeaderBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },

    listContent: { padding: 16, paddingBottom: 180 },

    // ── Card ──
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
    // Top Tags Row ("tags in card top")
    cardTopTags: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 4,
    },
    tagGroupLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        flexWrap: 'wrap',
    },
    roleBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    roleBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#475569',
        textTransform: 'uppercase',
    },
    accessBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    accessBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#2563EB',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },

    cardMain: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: 48, height: 48, borderRadius: 24 },
    avatarInitials: { fontSize: 18, fontWeight: '900', color: '#4F46E5' },
    infoContainer: { flex: 1, marginLeft: 12 },
    nameText: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
    phoneText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
    emailText: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 1 },

    divider: { height: 1, backgroundColor: '#F1F5F9' },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#FAFAFA',
    },
    actionBtnIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    actionBtnIconText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
    statusToggleBtnNew: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
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
});
