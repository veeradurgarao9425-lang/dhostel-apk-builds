import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Modal,
    ActivityIndicator,
    TextInput,
    Alert,
    Linking,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { HeaderNotification } from '../components/HeaderNotification';
import { HostixBrand } from '../components/HostixBrand';

const ProfileScreen = ({ navigation }: any) => {
    const { user, signOut, updateTokenAndUser, hostels: contextHostels } = useAuth();
    const { theme, isDark } = useTheme();
    const { t } = useTranslation();
    const { showError, showSuccess, showApiError, showToast } = useToast();
    const insets = useSafeAreaInsets();
    const confirm = useConfirmation();
    const [stats, setStats] = useState<any>(null);
    const [switching, setSwitching] = useState(false);

    // Hostel switcher states
    const [selectorVisible, setSelectorVisible] = useState(false);
    const [hostelsList, setHostelsList] = useState<any[]>([]);
    const [loadingHostels, setLoadingHostels] = useState(false);

    // Profile edit states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        email: '',
        phone: '',
    });
    const [savingProfile, setSavingProfile] = useState(false);
    
    // Support Modal
    const [supportModalVisible, setSupportModalVisible] = useState(false);

    const fetchStats = async () => {
        try {
            const [ownerRes, reportRes] = await Promise.all([
                api.get('/dashboard/owner-stats').catch(() => ({ data: { success: false } })),
                api.get('/reports/dashboard-stats').catch(() => ({ data: { success: false } }))
            ]);
            
            let combinedStats: any = {};
            if (ownerRes.data?.success) {
                combinedStats = { ...combinedStats, ...ownerRes.data.data };
            }
            if (reportRes.data?.success) {
                combinedStats = { ...combinedStats, ...reportRes.data.data };
            }
            setStats(combinedStats);
        } catch {}
    };

    useFocusEffect(React.useCallback(() => { 
        if (user) {
            fetchStats(); 
        }
    }, [user]));

    const handleLogout = () => {
        confirm({
            title: t('profile.signOutTitle', 'Sign Out'),
            message: t('profile.signOutMessage', 'Are you sure you want to sign out?'),
            confirmText: t('profile.signOut', 'Sign Out'),
            cancelText: t('profile.cancel', 'Cancel'),
            variant: 'danger',
            onConfirm: async () => {
                await signOut();
            }
        });
    };

    const openHostelSelector = async () => {
        setSelectorVisible(true);
        setLoadingHostels(true);
        try {
            const res = await api.get('/hostels?my_hostels=true');
            if (res.data?.success) {
                setHostelsList(res.data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch owned hostels:', e);
        } finally {
            setLoadingHostels(false);
        }
    };

    const handleSelectHostel = async (hostelId: number) => {
        if (Number(hostelId) === Number(user?.hostel_id)) {
            setSelectorVisible(false);
            return;
        }
        setSwitching(true);
        try {
            const res = await api.put('/auth/active-hostel', { hostel_id: hostelId });
            if (res.data?.success) {
                const { token, hostel_name } = res.data.data;
                await updateTokenAndUser(token, { hostel_id: hostelId, hostel_name });
                setSelectorVisible(false);
                fetchStats(); // refresh stats for new active hostel
                showSuccess(t('profile.hostelSwitchedMsg', { name: hostel_name }), t('profile.hostelSwitched', 'Hostel Switched'));
            } else {
                showError(res.data?.error || 'Failed to switch active hostel');
            }
        } catch (err: any) {
            console.error('Switch active hostel error:', err);
            showApiError(err, 'An error occurred while switching hostels.');
        } finally {
            setSwitching(false);
        }
    };

    const openEditModal = () => {
        setEditForm({
            full_name: user?.full_name || '',
            email: user?.email || '',
            phone: user?.phone || '',
        });
        setEditModalVisible(true);
    };

    const handleSaveProfile = async () => {
        if (!editForm.full_name.trim()) {
            showError(t('profile.nameRequired', 'Full Name is required.'));
            return;
        }
        if (!editForm.phone.trim()) {
            showError(t('profile.phoneRequired', 'Phone Number is required.'));
            return;
        }
        if (!/^\d{10}$/.test(editForm.phone.trim())) {
            showError(t('profile.phoneLength', 'Phone Number must be exactly 10 digits.'));
            return;
        }
        if (editForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
            showError(t('profile.invalidEmail', 'Please enter a valid email address.'));
            return;
        }

        setSavingProfile(true);
        try {
            const res = await api.put(`/users/owners/${user?.user_id}`, {
                full_name: editForm.full_name.trim(),
                email: editForm.email.trim(),
                phone: editForm.phone.trim(),
            });
            if (res.data?.success) {
                await updateTokenAndUser(undefined, {
                    full_name: editForm.full_name.trim(),
                    email: editForm.email.trim(),
                    phone: editForm.phone.trim(),
                });
                setEditModalVisible(false);
                showSuccess(t('profile.profileUpdated', 'Profile updated successfully!'));
            } else {
                showError(res.data?.error || 'Failed to update profile.');
            }
        } catch (err: any) {
            console.error('Update profile error:', err);
            showApiError(err, 'An error occurred while updating profile.');
        } finally {
            setSavingProfile(false);
        }
    };

    // Compact currency formatter
    const fmt = (n: number) => {
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
        return `₹${n.toLocaleString('en-IN')}`;
    };

    const displayName = user?.full_name || user?.name || ((user as any)?.first_name ? `${(user as any).first_name} ${(user as any).last_name || ''}`.trim() : '') || '';
    const initials = (displayName || user?.email || 'U')
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const roleLabel = user?.role_id === 1 ? t('profile.administrator', 'Administrator') : t('profile.hostelOwner', 'Hostel Owner');

    const totalHostels = stats?.hostelsCount ?? contextHostels?.length ?? 0;
    const totalTenants = stats?.totalStudents ?? stats?.tenantsCount ?? 0;
    const occupiedBeds = stats?.occupiedBeds ?? stats?.rooms?.occupied_beds ?? 0;
    const totalBeds = stats?.totalBeds ?? stats?.rooms?.total_beds ?? 0;
    const occupancyRate = stats?.occupancyRate ?? (totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0);
    const thisMonthRevenue = stats?.feeCollection ?? stats?.monthlyRentCollected ?? 0;

    // Bulletproof active hostel name fallback: check user, contextHostels list, and stats
    const matchedHostel = contextHostels?.find((h: any) => Number(h.hostel_id) === Number(user?.hostel_id)) || contextHostels?.[0];
    const activeHostelName = user?.hostel_name || matchedHostel?.hostel_name || stats?.hostel_name || stats?.hostel?.hostel_name || (totalHostels > 0 ? (contextHostels?.[0]?.hostel_name || 'My Hostel') : null);

    return (
        <View style={[styles.root, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── HERO HEADER ── */}
            <LinearGradient
                colors={['#4F46E5', '#7C3AED', '#9333EA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.hero, { paddingTop: insets.top + 12 }]}
            >
                {/* Header Top Navigation Row */}
                <View style={styles.headerTopRow}>
                    {navigation.canGoBack() ? (
                        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                            <Ionicons name="chevron-back" size={22} color="#FFF" />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 36 }} />
                    )}
                    <View style={styles.headerActionsRight}>
                        <HeaderNotification navigation={navigation} />
                        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Settings')} activeOpacity={0.7}>
                            <Ionicons name="settings-outline" size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Profile Summary Row */}
                <View style={styles.profileSummaryRow}>
                    {/* Avatar with purple ring & camera icon */}
                    <View style={styles.avatarContainer}>
                        <LinearGradient colors={['#A78BFA', '#C084FC']} style={styles.avatarInner}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </LinearGradient>
                        <TouchableOpacity 
                            style={styles.cameraBadge} 
                            onPress={() => Alert.alert(t('profile.photoTitle', 'Profile Photo'), t('profile.photoMsg', 'Upload profile photo feature coming soon!'))}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="camera" size={12} color="#7C3AED" />
                        </TouchableOpacity>
                    </View>

                    {/* Profile Details Column */}
                    <View style={styles.profileDetailsCol}>
                        <Text style={styles.profileName} numberOfLines={1}>{displayName || t('profile.hostelOwner', 'Hostel Owner')}</Text>
                        <View style={styles.roleBadge}>
                            <Ionicons name="shield-checkmark" size={12} color="#7C3AED" />
                            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                        </View>
                        <View style={styles.activeHostelSubRow}>
                            <Ionicons name="business" size={14} color="rgba(255, 255, 255, 0.85)" />
                            <Text style={styles.activeHostelSubText} numberOfLines={1}>
                                {activeHostelName || t('profile.noActiveHostel', 'No Active Hostel')}
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── APP-STYLE STATS GRID ── */}
                <View style={styles.statsGrid}>
                    {/* Hostels */}
                    <TouchableOpacity 
                        style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                        onPress={() => navigation.navigate('Hostels')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.statIconBox, { backgroundColor: '#EDE9FE' }]}>
                            <Ionicons name="business" size={18} color="#7C3AED" />
                        </View>
                        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{totalHostels}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('profile.hostels', 'Hostels')}</Text>
                    </TouchableOpacity>

                    {/* Tenants */}
                    <TouchableOpacity 
                        style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                        onPress={() => navigation.navigate('Students')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                            <Ionicons name="people" size={18} color="#10B981" />
                        </View>
                        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{totalTenants}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('profile.tenants', 'Tenants')}</Text>
                    </TouchableOpacity>

                    {/* Occupied */}
                    <TouchableOpacity 
                        style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                        onPress={() => navigation.navigate('Rooms')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
                            <Ionicons name="bed" size={18} color="#0284C7" />
                        </View>
                        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{occupiedBeds}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('profile.occupied', 'Occupied')}</Text>
                    </TouchableOpacity>

                    {/* Revenue (This Month) */}
                    <TouchableOpacity 
                        style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                        onPress={() => navigation.navigate('Reports')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="cash" size={18} color="#D97706" />
                        </View>
                        <Text style={[styles.statValue, { color: theme.textPrimary }]} numberOfLines={1}>{fmt(thisMonthRevenue)}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('profile.thisMonth', 'This Month')}</Text>
                    </TouchableOpacity>
                </View>

                {/* ── ACTIVE HOSTEL SECTION ── */}
                <View style={styles.sectionHeaderRow}>
                    <Ionicons name="business" size={16} color="#7C3AED" />
                    <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                        {t('profile.activeHostelSection', 'Active Hostel')}
                    </Text>
                </View>

                <TouchableOpacity 
                    style={[styles.activeHostelCard, { backgroundColor: isDark ? '#1E293B' : '#F5F3FF', borderColor: isDark ? '#334155' : '#DDD6FE' }]}
                    onPress={openHostelSelector}
                    activeOpacity={0.8}
                >
                    <View style={styles.activeHostelDetailsRow}>
                        {/* Purple-tinted building icon container */}
                        <View style={styles.buildingIconContainer}>
                            <Ionicons name="business" size={36} color="#7C3AED" />
                        </View>

                        {/* Details */}
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={[styles.activeHostelName, { color: isDark ? '#F8FAFC' : '#1E1B4B' }]} numberOfLines={1}>
                                {activeHostelName || t('profile.noActiveHostel', 'No Active Hostel')}
                            </Text>
                            
                            {/* Currently Active Status Pill */}
                            <View style={styles.activeStatusPill}>
                                <View style={styles.activeStatusDot} />
                                <Text style={styles.activeStatusText}>{t('profile.currentlyActive', 'Currently Active')}</Text>
                            </View>

                            {/* Sub stats grid/columns */}
                            <View style={styles.activeHostelStatsRow}>
                                <View style={styles.activeSubStatItem}>
                                    <View style={styles.activeSubStatValRow}>
                                        <Ionicons name="people" size={14} color="#7C3AED" style={{ marginRight: 4 }} />
                                        <Text style={[styles.activeSubStatValText, { color: theme.textPrimary }]}>{totalTenants}</Text>
                                    </View>
                                    <Text style={[styles.activeSubStatLabel, { color: theme.textSecondary }]}>Tenants</Text>
                                </View>
                                
                                <View style={styles.activeSubStatItem}>
                                    <View style={styles.activeSubStatValRow}>
                                        <Ionicons name="bed" size={14} color="#10B981" style={{ marginRight: 4 }} />
                                        <Text style={[styles.activeSubStatValText, { color: theme.textPrimary }]}>{occupiedBeds}/{totalBeds}</Text>
                                    </View>
                                    <Text style={[styles.activeSubStatLabel, { color: theme.textSecondary }]}>Beds Occupied</Text>
                                </View>
                                
                                <View style={styles.activeSubStatItem}>
                                    <View style={styles.activeSubStatValRow}>
                                        <Ionicons name="trending-up" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                                        <Text style={[styles.activeSubStatValText, { color: theme.textPrimary }]}>{occupancyRate}%</Text>
                                    </View>
                                    <Text style={[styles.activeSubStatLabel, { color: theme.textSecondary }]}>Occupancy</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* ── ACCOUNT DETAILS ── */}
                <View style={styles.sectionHeaderRow}>
                    <Ionicons name="person" size={16} color="#7C3AED" />
                    <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                        {t('profile.accountDetails', 'Account Details')}
                    </Text>
                    <TouchableOpacity 
                        onPress={openEditModal} 
                        style={[(styles as any).editLink, { backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }]}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="pencil" size={12} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={[styles.editLinkText, { color: '#FFF' }]}>{t('common.edit', 'Edit')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.accountCard, { backgroundColor: theme.cardBg }]}>
                    {[
                        { icon: 'person-outline', label: t('profile.fullName', 'Full Name'), value: user?.full_name || t('profile.notSet', 'Not Set'), color: '#7C3AED', bg: '#EDE9FE' },
                        { icon: 'mail-outline', label: t('profile.email', 'Email Address'), value: user?.email || t('profile.notSet', 'Not Set'), color: '#0284C7', bg: '#E0F2FE' },
                        { icon: 'call-outline', label: t('profile.phone', 'Phone Number'), value: user?.phone || t('profile.notProvided', 'Not Provided'), color: '#059669', bg: '#DCFCE7' },
                        { icon: 'home-outline', label: t('profile.registeredHostel', 'Registered Hostel'), value: activeHostelName || t('profile.none', 'None'), color: '#D97706', bg: '#FEF3C7' },
                    ].map((item, i, arr) => (
                        <View key={i}>
                            <View style={styles.infoRow}>
                                <View style={[styles.infoIcon, { backgroundColor: item.bg }]}>
                                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.infoLabel, { color: isDark ? '#94A3B8' : '#94A3B8' }]}>{item.label}</Text>
                                    <Text style={[styles.infoValue, { color: theme.textPrimary }]} numberOfLines={1}>{item.value}</Text>
                                </View>
                            </View>
                            {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />}
                        </View>
                    ))}
                </View>

                {/* ── MANAGE SECTION ── */}
                <View style={styles.sectionHeaderRow}>
                    <Ionicons name="grid" size={16} color="#7C3AED" />
                    <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                        {t('profile.manage', 'Manage')}
                    </Text>
                </View>

                <View style={styles.manageGrid}>
                    {[
                        { icon: 'swap-horizontal', label: t('profile.switchHostel', 'Switch Hostel'), color: '#10B981', bg: '#DCFCE7', onPress: openHostelSelector },
                        { icon: 'business', label: t('profile.manageHostels', 'Hostels'), color: '#7C3AED', bg: '#EDE9FE', onPress: () => navigation.navigate('Hostels') },
                        { icon: 'bar-chart', label: t('profile.reports', 'Reports'), color: '#0284C7', bg: '#E0F2FE', onPress: () => navigation.navigate('Reports') },
                        { icon: 'chatbubble-ellipses', label: 'Feedback & Help', color: '#EF4444', bg: '#FEE2E2', onPress: () => navigation.navigate('Feedback') },
                    ].map((item, i) => (
                        <TouchableOpacity key={i} style={styles.manageItem} onPress={item.onPress} activeOpacity={0.7}>
                            <View style={[styles.manageIconBox, { backgroundColor: item.bg }]}>
                                <Ionicons name={item.icon as any} size={18} color={item.color} />
                            </View>
                            <Text style={[styles.manageText, { color: theme.textPrimary }]} numberOfLines={1}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── SETTINGS (Removed) ── */}

                {/* ── LOG OUT ── */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                    <View style={styles.logoutIconBox}>
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.logoutTitle}>{t('more.logOut', 'Log Out')}</Text>
                        <Text style={styles.logoutSub}>{t('profile.signOutDesc', 'Sign out from your account')}</Text>
                    </View>
                </TouchableOpacity>

                {/* 2-Color Brand Footer */}
                <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
                    <HostixBrand fontSize={22} subtitle="PG OS" lightTheme={!isDark} />
                    <Text style={[styles.version, { color: isDark ? '#475569' : '#94A3B8', marginTop: 4 }]}>
                        v1.0.0 · Smart Hostel Management
                    </Text>
                </View>
            </ScrollView>

            {/* ─── HOSTEL SWITCHER MODAL (DRAWER) ─── */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={selectorVisible}
                onRequestClose={() => setSelectorVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setSelectorVisible(false)}
                    />
                    <View style={[styles.modalSheet, { backgroundColor: theme.cardBg, paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('profile.switchHostel', 'Switch Hostel')}</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setSelectorVisible(false)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '700' }}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        {switching || loadingHostels ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={theme.primary} />
                                <Text style={{ marginTop: 12, color: theme.textSecondary, fontWeight: '600' }}>
                                    {switching ? t('profile.switchingHostel', 'Switching active hostel...') : t('profile.loadingHostels', 'Loading hostels...')}
                                </Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: (theme as any).isDark ? 'rgba(79, 70, 229, 0.12)' : '#F0F9FF',
                                    borderColor: (theme as any).isDark ? 'rgba(79, 70, 229, 0.25)' : '#E0F2FE',
                                    borderWidth: 1,
                                    padding: 12,
                                    borderRadius: 14,
                                    marginBottom: 16,
                                    gap: 8,
                                }}>
                                    <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
                                    <Text style={{ flex: 1, color: theme.textSecondary, fontSize: 12, fontWeight: '600', lineHeight: 16 }}>
                                        Note: Switch between your hostels here. You can manage or add new hostels from the Hostels page under settings.
                                    </Text>
                                </View>

                                {hostelsList.map((h: any) => {
                                    const isActive = Number(h.hostel_id) === Number(user?.hostel_id);
                                    return (
                                        <TouchableOpacity
                                            key={h.hostel_id}
                                            style={[
                                                styles.hostelItem,
                                                isActive && styles.hostelItemActive,
                                                isActive ? {
                                                    borderColor: theme.primary,
                                                    backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#F5F3FF',
                                                } : {
                                                    borderColor: isDark ? '#334155' : '#E2E8F0',
                                                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                                }
                                            ]}
                                            onPress={() => handleSelectHostel(h.hostel_id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[
                                                styles.hostelItemIconContainer,
                                                { backgroundColor: isActive ? theme.primary : (isDark ? '#334155' : '#F1F5F9') }
                                            ]}>
                                                <Ionicons 
                                                    name="business" 
                                                    size={20} 
                                                    color={isActive ? '#FFFFFF' : theme.textSecondary} 
                                                />
                                            </View>

                                            <View style={styles.hostelItemContent}>
                                                <View style={styles.hostelItemHeaderRow}>
                                                    <Text style={[styles.hostelItemText, { color: theme.textPrimary }]} numberOfLines={1}>
                                                        {h.hostel_name}
                                                    </Text>
                                                    {h.hostel_type && (
                                                        <View style={[
                                                            styles.hostelTypeBadge,
                                                            { 
                                                                backgroundColor: h.hostel_type === 'Boys' 
                                                                    ? 'rgba(59, 130, 246, 0.15)' 
                                                                    : h.hostel_type === 'Girls' 
                                                                        ? 'rgba(236, 72, 153, 0.15)' 
                                                                        : 'rgba(16, 185, 129, 0.15)' 
                                                            }
                                                        ]}>
                                                            <Text style={[
                                                                styles.hostelTypeBadgeText,
                                                                { 
                                                                    color: h.hostel_type === 'Boys' 
                                                                        ? '#3B82F6' 
                                                                        : h.hostel_type === 'Girls' 
                                                                            ? '#EC4899' 
                                                                            : '#10B981'
                                                                }
                                                            ]}>
                                                                {h.hostel_type}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                <View style={styles.hostelLocationRow}>
                                                    <Ionicons name="location-outline" size={12} color={theme.textSecondary} style={{ marginRight: 3 }} />
                                                    <Text style={[styles.hostelLocationText, { color: theme.textSecondary }]} numberOfLines={1}>
                                                        {h.address || h.city || 'No address added'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.hostelItemRight}>
                                                {isActive ? (
                                                    <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                                                ) : (
                                                    <View style={[styles.hostelItemUncheckedCircle, { borderColor: isDark ? '#475569' : '#CBD5E1' }]} />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                <TouchableOpacity
                                    style={[styles.addHostelBtn, { backgroundColor: theme.primary }]}
                                    onPress={() => {
                                        setSelectorVisible(false);
                                        navigation.navigate('AddHostel');
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="add" size={20} color="#FFF" />
                                    <Text style={styles.addHostelText}>{t('profile.addNewHostel', 'Add New Hostel')}</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ─── EDIT PROFILE MODAL (FIXED KEYBOARD AVOIDING & SCROLL) ─── */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => {
                            Keyboard.dismiss();
                            setEditModalVisible(false);
                        }}
                    />
                    <View style={[styles.modalSheet, { backgroundColor: theme.cardBg, maxHeight: '90%', paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('profile.editProfile', 'Edit Profile')}</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Ionicons name="close" size={22} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 24 }}
                        >
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('profile.fullName', 'Full Name')}</Text>
                                <TextInput
                                    style={[styles.modalInput, { color: theme.textPrimary, borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#1E293B' : '#FFF' }]}
                                    value={editForm.full_name}
                                    onChangeText={(val) => setEditForm(p => ({ ...p, full_name: val }))}
                                    placeholder="Full Name"
                                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('profile.email', 'Email Address')}</Text>
                                <TextInput
                                    style={[styles.modalInput, { color: isDark ? '#64748B' : '#94A3B8', borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}
                                    value={editForm.email}
                                    placeholder="Email Address"
                                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                    editable={false}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('profile.phone', 'Phone Number')}</Text>
                                <TextInput
                                    style={[styles.modalInput, { color: theme.textPrimary, borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#1E293B' : '#FFF' }]}
                                    value={editForm.phone}
                                    onChangeText={(val) => setEditForm(p => ({ ...p, phone: val }))}
                                    placeholder="Phone Number"
                                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                />
                            </View>

                            {savingProfile ? (
                                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
                            ) : (
                                <TouchableOpacity
                                    style={[styles.saveBtn, { backgroundColor: theme.primary, marginBottom: 12 }]}
                                    onPress={handleSaveProfile}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.saveBtnText}>{t('common.save', 'Save Changes')}</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            {/* ── SUPPORT MODAL ── */}
            <Modal visible={supportModalVisible} transparent animationType="fade" onRequestClose={() => setSupportModalVisible(false)}>
                <View style={[styles.modalOverlay, { justifyContent: 'center', paddingHorizontal: 32, backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSupportModalVisible(false)} />
                    <View style={[(styles as any).modalContent, { backgroundColor: theme.cardBg, borderRadius: 24, padding: 20, alignItems: 'center', width: '100%', maxHeight: undefined, paddingBottom: 20 }]}>
                        
                        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: (theme as any).isDark ? '#1E1B4B' : '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                            <Ionicons name="headset" size={28} color="#3B82F6" />
                        </View>
                        
                        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginBottom: 4, textAlign: 'center' }}>Hostix Support</Text>
                        <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 18 }}>
                            Available 24/7 to assist you with any queries.
                        </Text>

                        <View style={{ width: '100%', gap: 10 }}>
                            <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#064E3B' : '#F0FDF4', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#065F46' : '#DCFCE7' }}
                                onPress={() => Linking.openURL('tel:+916303359425')}
                                activeOpacity={0.7}
                            >
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#022C22' : '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                    <Ionicons name="call" size={18} color="#10B981" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, color: isDark ? '#6EE7B7' : '#16A34A', fontWeight: '600', marginBottom: 2 }}>Call Us</Text>
                                    <Text style={{ fontSize: 14, color: isDark ? '#A7F3D0' : '#14532D', fontWeight: '700' }}>+91 6303359425</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={isDark ? '#6EE7B7' : '#16A34A'} />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#1E40AF' : '#DBEAFE' }}
                                onPress={() => Linking.openURL('mailto:support@hostix.in')}
                                activeOpacity={0.7}
                            >
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#172554' : '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                    <Ionicons name="mail" size={18} color="#3B82F6" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, color: isDark ? '#93C5FD' : '#2563EB', fontWeight: '600', marginBottom: 2 }}>Email Us</Text>
                                    <Text style={{ fontSize: 14, color: isDark ? '#BFDBFE' : '#1E3A8A', fontWeight: '700' }}>support@hostix.in</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={isDark ? '#93C5FD' : '#2563EB'} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            style={{ width: '100%', paddingVertical: 12, marginTop: 16, borderRadius: 12, alignItems: 'center', backgroundColor: isDark ? '#334155' : '#F1F5F9' }}
                            onPress={() => setSupportModalVisible(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>Close</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default ProfileScreen;

const styles = StyleSheet.create({
    root: { flex: 1 },

    // Header Top Row
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    headerActionsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notiBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F59E0B',
        borderWidth: 1,
        borderColor: '#7C3AED',
    },

    // Hero
    hero: {
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingBottom: 28,
    },
    profileSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    avatarContainer: {
        position: 'relative',
        width: 84,
        height: 84,
        borderRadius: 42,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        padding: 2,
    },
    avatarInner: {
        flex: 1,
        borderRadius: 38,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    cameraBadge: {
        position: 'absolute',
        right: -2,
        bottom: -2,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
    },
    profileDetailsCol: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    profileName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        alignSelf: 'flex-start',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginBottom: 8,
        elevation: 1,
    },
    roleBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#7C3AED',
        textTransform: 'uppercase',
    },
    activeHostelSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    activeHostelSubText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.85)',
    },

    // Stats Grid (our app pattern)
    statsGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        alignItems: 'center',
        justifyContent: 'center',
    },
    statIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
    },

    // Section Titles
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    editLinkRow: {
        marginLeft: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingVertical: 2,
        paddingHorizontal: 6,
    },
    editLinkText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#7C3AED',
    },

    // Active Hostel Section
    activeHostelCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    activeHostelDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buildingIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 14,
        backgroundColor: '#EDE9FE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeHostelName: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    activeStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        alignSelf: 'flex-start',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginBottom: 8,
    },
    activeStatusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginRight: 5,
    },
    activeStatusText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#15803D',
        textTransform: 'uppercase',
    },
    activeHostelStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        width: '100%',
    },
    activeSubStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    activeSubStatValRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    activeSubStatValText: {
        fontSize: 14,
        fontWeight: '800',
    },
    activeSubStatLabel: {
        fontSize: 10,
        fontWeight: '700',
    },

    // Account Card
    accountCard: {
        borderRadius: 16,
        padding: 4,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginHorizontal: 12,
    },

    // Manage Grid
    manageGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 4,
    },
    manageItem: {
        width: '19%',
        alignItems: 'center',
    },
    manageIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
        elevation: 1,
    },
    manageText: {
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
    },

    // Logout
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FECACA',
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 24,
    },
    logoutIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFE4E6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#EF4444',
        marginBottom: 2,
    },
    logoutSub: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },

    // Version
    version: {
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 20,
    },

    // Bottom Drawer Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 20,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 12,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.15)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(148, 163, 184, 0.15)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    modalCloseBtn: {
        padding: 4,
    },
    hostelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 14,
        borderWidth: 1.5,
        backgroundColor: '#FFFFFF',
    },
    hostelItemActive: {
        borderColor: '#7C3AED',
        backgroundColor: 'rgba(124, 58, 237, 0.08)',
    },
    hostelItemText: {
        fontSize: 15,
        fontWeight: '800',
    },
    hostelItemIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    hostelItemContent: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8,
    },
    hostelItemHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    hostelTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    hostelTypeBadgeText: {
        fontWeight: '800',
        fontSize: 10,
    },
    hostelLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    hostelLocationText: {
        fontWeight: '600',
        fontSize: 12,
        lineHeight: 18,
    },
    hostelItemRight: {
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
    },
    hostelItemUncheckedCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
    },
    addHostelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        marginTop: 10,
        gap: 8,
    },
    addHostelText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 15,
    },

    // Edit Profile Inputs
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        marginLeft: 4,
    },
    modalInput: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        fontWeight: '600',
    },
    saveBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        marginTop: 10,
    },
    saveBtnText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 15,
    },
});
