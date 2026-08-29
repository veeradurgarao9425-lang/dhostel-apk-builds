import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, ScrollView, Platform, TextInput,
    Modal, ActivityIndicator, Image, Animated
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { DashboardCache } from '../services/dashboardCache';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { useToast } from '../context/ToastContext';
import * as Clipboard from 'expo-clipboard';
import { TenantAppCard } from '../components/TenantAppCard';
import { HeaderNotification } from '../components/HeaderNotification';
import { HostixBrand } from '../components/HostixBrand';

// ─── Menu item definition ─────────────────────────────────────────────────────
interface MenuItem {
    label: string;
    subtitle: string;
    icon: string;
    iconColor: string;
    iconBg: string;
    route: string;
    routeParams?: object;
    comingSoon?: boolean;
    danger?: boolean;
    badgeCount?: string | number;
}

interface MoreScreenProps {
    hideHeader?: boolean;
}

export default function MoreScreen({ hideHeader = false }: MoreScreenProps) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { user, signOut, updateTokenAndUser, hostels = [], loadHostels } = useAuth();
    const confirm = useConfirmation();

    const borderAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(borderAnim, { toValue: 1, duration: 4000, useNativeDriver: false }),
                Animated.timing(borderAnim, { toValue: 0, duration: 4000, useNativeDriver: false })
            ])
        ).start();
    }, [borderAnim]);

    const animatedBorderColor = borderAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#3B82F6']
    });

    const animatedShadowColor = borderAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: ['rgba(59, 130, 246, 0.3)', 'rgba(139, 92, 246, 0.3)', 'rgba(236, 72, 153, 0.3)', 'rgba(249, 115, 22, 0.3)', 'rgba(59, 130, 246, 0.3)']
    });

    const [stats, setStats] = useState<any>(null);
    const lastStatsFetchRef = React.useRef<number>(0);

    const fetchStats = async (force = false) => {
        const now = Date.now();
        if (!force && now - lastStatsFetchRef.current < 30000 && stats) {
            return;
        }
        try {
            lastStatsFetchRef.current = now;
            // Reuse cached /reports/dashboard-stats if HomeScreen already fetched it.
            const cachedStats = DashboardCache.getStats();
            const [ownerRes, reportRes] = await Promise.all([
                api.get('/dashboard/owner-stats').catch(() => ({ data: { success: false } })),
                cachedStats
                    ? Promise.resolve({ data: { success: true, data: cachedStats } })
                    : api.get('/reports/dashboard-stats').catch(() => ({ data: { success: false } })),
            ]);
            let combinedStats: any = {};
            if (ownerRes.data?.success) combinedStats = { ...combinedStats, ...ownerRes.data.data };
            if (reportRes.data?.success) {
                const reportData = reportRes.data.data;
                combinedStats = { ...combinedStats, ...reportData };
                // Write back to cache only if we actually fetched (not from cache).
                if (!cachedStats && reportData) DashboardCache.setStats(reportData);
            }
            setStats(combinedStats);
        } catch (error) {
            if (__DEV__) console.error('Failed to fetch stats for More screen', error);
        }
    };

    useFocusEffect(React.useCallback(() => {
        if (user) {
            fetchStats();
            if (hostels.length === 0) {
                loadHostels();
            }
        }
    }, [user, hostels.length, loadHostels]));
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();
    const { showToast, showSuccess, showError, showApiError } = useToast();

    const isStaff = user?.role === 'STAFF';

    const permissions = useMemo(() => {
        let perms = user?.permissions;
        if (typeof perms === 'string') {
            try {
                perms = JSON.parse(perms);
            } catch (_) {
                perms = {};
            }
        }
        return perms || {};
    }, [user?.permissions]);

    const hasPerm = useCallback((moduleKey: string) => {
        if (!isStaff) return true; // Owners have full access
        const val = permissions[moduleKey];
        return val === 'manage' || val === 'view' || val === true || val === '1';
    }, [isStaff, permissions]);

    const topTools = useMemo<MenuItem[]>(() => {
        const list: MenuItem[] = [];
        if (hasPerm('students') || hasPerm('tenants')) {
            list.push({
                label: t('more.qrSignup', 'Tenant QR Register'),
                subtitle: t('more.qrSignupSub', 'Self-registration code'),
                icon: 'qr-code',
                iconColor: '#7C3AED',
                iconBg: '#EDE9FE',
                route: 'QRSignup',
            });
        }
        if (hasPerm('expenses')) {
            list.push({
                label: t('more.expenses', 'Expenses'),
                subtitle: t('more.expensesSub', 'Track daily spending'),
                icon: 'card',
                iconColor: '#2563EB',
                iconBg: '#DBEAFE',
                route: 'Expenses',
            });
        }
        if (hasPerm('students')) {
            list.push({
                label: t('more.guests', 'Guests'),
                subtitle: t('more.guestsSub', 'Short-stay visitors'),
                icon: 'walk',
                iconColor: '#0891B2',
                iconBg: '#CFFAFE',
                route: 'Guests',
            });
        }
        return list;
    }, [t, hasPerm]);

    const menuGroups = useMemo(() => {
        const groups: { groupTitle: string; items: MenuItem[] }[] = [];

        // 1. Quick Actions
        const quickItems: MenuItem[] = [];
        if (hasPerm('students') || hasPerm('tenants')) {
            quickItems.push({
                label: 'Add Tenant',
                subtitle: 'Register and check-in a new tenant',
                icon: 'person-add-outline',
                iconColor: '#7C3AED',
                iconBg: '#EDE9FE',
                route: 'AddStudent',
            });
        }
        if (hasPerm('rooms')) {
            quickItems.push({
                label: 'Add Room',
                subtitle: 'Create a new room or beds',
                icon: 'bed-outline',
                iconColor: '#0284C7',
                iconBg: '#E0F2FE',
                route: 'AddRoom',
            });
        }
        if (hasPerm('dues') || hasPerm('finance')) {
            quickItems.push({
                label: 'Collect Rent',
                subtitle: 'Record manual rent payments',
                icon: 'cash-outline',
                iconColor: '#10B981',
                iconBg: '#D1FAE5',
                route: 'CollectedPayments',
            });
        }
        if (hasPerm('expenses')) {
            quickItems.push({
                label: 'Add Expense',
                subtitle: 'Record hostel maintenance expenses',
                icon: 'receipt-outline',
                iconColor: '#EA580C',
                iconBg: '#FFEDD5',
                route: 'AddExpense',
            });
        }
        if (!isStaff) {
            quickItems.push({
                label: 'Add Staff',
                subtitle: 'Register a new hostel helper/guard',
                icon: 'people-outline',
                iconColor: '#0891B2',
                iconBg: '#CFFAFE',
                route: 'AddStaff',
            });
        }
        if (quickItems.length > 0) {
            groups.push({ groupTitle: 'Quick Actions (One-Tap)', items: quickItems });
        }

        // 2. People & Documents
        const peopleItems: MenuItem[] = [];
        if (hasPerm('students') || hasPerm('tenants')) {
            peopleItems.push({
                label: t('more.tenants', 'Tenants'),
                subtitle: t('more.tenantsSub', 'Manage resident profiles'),
                icon: 'people',
                iconColor: '#7C3AED',
                iconBg: '#EDE9FE',
                route: 'Students',
                badgeCount: (stats?.tenantsCount || stats?.totalStudents || 0) > 0 ? (stats?.tenantsCount || stats?.totalStudents) : undefined,
            });
        }
        peopleItems.push({
            label: 'Documents & KYC Files',
            subtitle: 'All resident ID proofs & photos in one place',
            icon: 'folder-open-outline',
            iconColor: '#9333EA',
            iconBg: '#F3E8FF',
            route: 'DocumentsHub',
        });
        if (!isStaff) {
            peopleItems.push({
                label: t('more.staffManagement', 'Staff Management'),
                subtitle: t('more.staffManagementSub', 'Manage staff roles & credentials'),
                icon: 'person-circle',
                iconColor: '#0891B2',
                iconBg: '#CFFAFE',
                route: 'Staff',
                badgeCount: stats?.staffCount ?? 0,
            });
        }
        if (hasPerm('students')) {
            peopleItems.push({
                label: t('more.guests', 'Guests'),
                subtitle: t('more.guestsSub', 'Short-stay visitors'),
                icon: 'walk',
                iconColor: '#0891B2',
                iconBg: '#CFFAFE',
                route: 'Guests',
            });
        }
        if (hasPerm('students') || hasPerm('rooms')) {
            peopleItems.push({
                label: 'Vacate Bed & Checkouts',
                subtitle: 'Manage vacating tenants & settlements',
                icon: 'log-out-outline',
                iconColor: '#EF4444',
                iconBg: '#FEE2E2',
                route: 'Notices',
            });
        }
        if (peopleItems.length > 0) {
            groups.push({ groupTitle: 'People & Documents', items: peopleItems });
        }

        // 3. Money & Finance
        const financeItems: MenuItem[] = [];
        if (hasPerm('dues') || hasPerm('finance')) {
            financeItems.push({
                label: t('more.pendingPayments', 'Pending Dues'),
                subtitle: t('more.pendingPaymentsSub', 'Track overdue rent payments'),
                icon: 'alert-circle',
                iconColor: '#DC2626',
                iconBg: '#FEE2E2',
                route: 'PendingTab',
                badgeCount: stats?.pendingDuesCount ?? 0,
            });
        }
        if (hasPerm('verify_rent')) {
            financeItems.push({
                label: 'Verify Rent',
                subtitle: 'Verify uploaded payment proofs',
                icon: 'shield-checkmark-outline',
                iconColor: '#16A34A',
                iconBg: '#DCFCE7',
                route: 'PaymentVerification',
                badgeCount: 0,
            });
        }
        if (hasPerm('expenses')) {
            financeItems.push({
                label: t('more.expenses', 'Expenses'),
                subtitle: t('more.expensesSub', 'Hostel maintenance & utility costs'),
                icon: 'card',
                iconColor: '#2563EB',
                iconBg: '#DBEAFE',
                route: 'Expenses',
            });
        }
        if (hasPerm('dues') || hasPerm('finance')) {
            financeItems.push({
                label: 'Bill Reminders',
                subtitle: 'Track pending tenant rent & utility dues',
                icon: 'receipt-outline',
                iconColor: '#EA580C',
                iconBg: '#FFEDD5',
                route: 'BillReminders',
            });
        }
        if (!isStaff && (hasPerm('income') || hasPerm('reports'))) {
            financeItems.push({
                label: t('more.incomeReport', 'Income Report'),
                subtitle: t('more.incomeReportSub', 'Monthly collections & net cashflow'),
                icon: 'trending-up',
                iconColor: '#16A34A',
                iconBg: '#DCFCE7',
                route: 'IncomeDetails',
                routeParams: { period: 'month' },
            });
        }
        if (!isStaff && hasPerm('reports')) {
            financeItems.push({
                label: t('more.reportsAnalytics', 'Reports & Analytics'),
                subtitle: t('more.reportsAnalyticsSub', 'Financial summaries & exports'),
                icon: 'bar-chart',
                iconColor: '#059669',
                iconBg: '#D1FAE5',
                route: 'Reports',
            });
        }
        if (financeItems.length > 0) {
            groups.push({ groupTitle: 'Money & Finance', items: financeItems });
        }

        // 4. Property & Operations
        const propertyItems: MenuItem[] = [];
        if (hasPerm('rooms')) {
            propertyItems.push({
                label: t('more.rooms', 'Rooms & Beds'),
                subtitle: t('more.roomsSub', 'Manage rooms and bed configurations'),
                icon: 'bed',
                iconColor: '#2563EB',
                iconBg: '#DBEAFE',
                route: 'Rooms',
                badgeCount: stats?.rooms ? `${stats.rooms.occupied_beds}/${stats.rooms.total_beds}` : '0/0',
            });
        }
        if (!isStaff) {
            propertyItems.push({
                label: t('more.hostels', 'My Hostels'),
                subtitle: t('more.hostelsSub', 'Manage and switch branches'),
                icon: 'business',
                iconColor: '#16A34A',
                iconBg: '#DCFCE7',
                route: 'Hostels',
                badgeCount: stats?.hostelsCount || 0,
            });
        }
        if (hasPerm('complaints')) {
            propertyItems.push({
                label: 'Complaints & Maintenance',
                subtitle: 'Track & resolve resident tickets',
                icon: 'construct-outline',
                iconColor: '#E11D48',
                iconBg: '#FFE4E6',
                route: 'ComplaintsManagement',
            });
        }
        if (hasPerm('mess')) {
            propertyItems.push({
                label: 'Mess & Food Menu',
                subtitle: 'Weekly menu & dining schedule',
                icon: 'restaurant-outline',
                iconColor: '#EA580C',
                iconBg: '#FFEDD5',
                route: 'MessMenuManagement',
            });
        }
        if (!isStaff) {
            propertyItems.push({
                label: 'Bulk Delete & Cleanup',
                subtitle: 'Manage deleted records & bulk room cleanup',
                icon: 'trash-outline',
                iconColor: '#DC2626',
                iconBg: '#FEE2E2',
                route: 'BulkDelete',
            });
        }
        if (propertyItems.length > 0) {
            groups.push({ groupTitle: 'Property & Operations', items: propertyItems });
        }

        // 5. Shortcuts & Info
        const shortcutItems: MenuItem[] = [];
        if (hasPerm('notices') || hasPerm('dues')) {
            shortcutItems.push({
                label: 'Reminders & Tasks',
                subtitle: 'Create hostel alerts & custom reminders',
                icon: 'alarm-outline',
                iconColor: '#0284C7',
                iconBg: '#E0F2FE',
                route: 'Reminders',
            });
        }
        if (hasPerm('students')) {
            shortcutItems.push({
                label: t('more.qrSignup', 'Tenant QR Register'),
                subtitle: t('more.qrSignupSub', 'Invite tenants to self-register'),
                icon: 'qr-code',
                iconColor: '#7C3AED',
                iconBg: '#EDE9FE',
                route: 'QRSignup',
            });
        }
        if (hasPerm('rooms') || hasPerm('students')) {
            shortcutItems.push({
                label: 'Pre-Bookings',
                subtitle: 'Manage upcoming reservations',
                icon: 'calendar-outline',
                iconColor: '#D97706',
                iconBg: '#FEF3C7',
                route: 'PreBooking',
            });
        }
        if (hasPerm('notices')) {
            shortcutItems.push({
                label: 'Notices Board',
                subtitle: 'Post announcements to tenants',
                icon: 'megaphone-outline',
                iconColor: '#7C3AED',
                iconBg: '#EDE9FE',
                route: 'NoticesManagement',
            });
        }
        shortcutItems.push({
            label: t('more.appSettings', 'Settings & Privacy'),
            subtitle: t('more.appSettingsSub', 'Profile & app preferences'),
            icon: 'settings-outline',
            iconColor: '#475569',
            iconBg: '#F1F5F9',
            route: 'Settings',
        });
        shortcutItems.push({
            label: t('more.privacyPolicy', 'Privacy Policy'),
            subtitle: t('more.privacyPolicySub', 'Terms of service & privacy compliance'),
            icon: 'shield-checkmark-outline',
            iconColor: '#059669',
            iconBg: '#D1FAE5',
            route: 'PrivacyPolicy',
        });
        groups.push({ groupTitle: 'Shortcuts & Info', items: shortcutItems });

        return groups;
    }, [t, stats, hasPerm, isStaff]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectorVisible, setSelectorVisible] = useState(false);
    const [loadingHostels, setLoadingHostels] = useState(false);
    const [ownedHostels, setOwnedHostels] = useState<any[]>([]);
    const [switching, setSwitching] = useState(false);

    const filteredMenuGroups = useMemo(() => {
        if (!searchQuery.trim()) return menuGroups;
        const q = searchQuery.toLowerCase().trim();
        return menuGroups.map(group => ({
            ...group,
            items: group.items.filter(item =>
                item.label?.toLowerCase().includes(q) ||
                item.subtitle?.toLowerCase().includes(q)
            )
        })).filter(group => group.items.length > 0);
    }, [menuGroups, searchQuery]);

    const isListEmpty = useMemo(() => {
        return filteredMenuGroups.every(g => g.items.length === 0);
    }, [filteredMenuGroups]);

    const handleLogout = () => {
        confirm({
            title: t('more.logOutTitle', 'Logout'),
            message: t('more.logOutConfirm', 'Are you sure you want to log out?'),
            confirmText: t('more.logOut', 'Logout'),
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await signOut();
                } catch (e) {
                    console.error('Logout error', e);
                }
            }
        });
    };

    const handlePress = (item: MenuItem) => {
        if (item.route === 'LOGOUT') {
            handleLogout();
            return;
        }
        if (item.route) {
            navigation.navigate(item.route, item.routeParams);
        }
    };

    const handleSwitchHostel = async (hostelId: number) => {
        if (switching) return;
        try {
            setSwitching(true);
            const res = await api.post('/auth/switch-hostel', { hostel_id: hostelId });
            if (res.data?.success && res.data.data?.token) {
                await updateTokenAndUser(res.data.data.token, res.data.data.user);
                showSuccess(t('more.switchHostelSuccess', 'Hostel switched successfully'));
                setSelectorVisible(false);
            }
        } catch (e) {
            showApiError(e);
        } finally {
            setSwitching(false);
        }
    };

    const openHostelSelector = async () => {
        setSelectorVisible(true);
        setLoadingHostels(true);
        try {
            const res = await api.get('/hostels?my_hostels=true');
            if (res.data?.success) {
                setOwnedHostels(res.data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch owned hostels:', e);
        } finally {
            setLoadingHostels(false);
        }
    };

    return (
        <View style={[s.root, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            {!hideHeader && (
                <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={[s.header, { paddingTop: insets.top ? insets.top + 8 : 40, paddingBottom: 16 }]}>
                    {/* Top Row: Brand & Actions */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            {navigation.canGoBack() && (
                                <TouchableOpacity
                                    onPress={() => navigation.goBack()}
                                    style={{ padding: 4 }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                                </TouchableOpacity>
                            )}
                            <HostixBrand fontSize={22} uppercase={true} />
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <HeaderNotification navigation={navigation} />
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Settings')}
                                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="settings-outline" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Owner Profile Banner Card */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Profile')}
                        activeOpacity={0.9}
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.12)',
                            borderRadius: 18,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.22)',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        <LinearGradient
                            colors={['#A78BFA', '#F472B6']}
                            style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFF' }}>
                                {(user?.full_name || user?.name || (user as any)?.first_name || 'O')[0].toUpperCase()}
                            </Text>
                        </LinearGradient>

                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF' }} numberOfLines={1}>
                                    {user?.full_name || user?.name || ((user as any)?.first_name ? `${(user as any).first_name} ${(user as any).last_name || ''}`.trim() : '') || (user?.role_id === 1 ? 'Hostel Administrator' : 'Hostel Owner')}
                                </Text>
                            </View>
                            {isStaff ? (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                        backgroundColor: 'rgba(0,0,0,0.25)',
                                        alignSelf: 'flex-start',
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 10,
                                        marginTop: 4,
                                    }}
                                >
                                    <Ionicons name="business" size={12} color="#A7F3D0" />
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#A7F3D0' }} numberOfLines={1}>
                                        {user?.hostel_name || (hostels.find(h => Number(h.hostel_id) === Number(user?.hostel_id))?.hostel_name) || 'Assigned Hostel'}
                                    </Text>
                                    <View style={{ backgroundColor: '#10B981', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 4 }}>
                                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF' }}>STAFF</Text>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={openHostelSelector}
                                    activeOpacity={0.8}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                        backgroundColor: 'rgba(0,0,0,0.25)',
                                        alignSelf: 'flex-start',
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 10,
                                        marginTop: 4,
                                    }}
                                >
                                    <Ionicons name="business" size={12} color="#FCD34D" />
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FCD34D' }} numberOfLines={1}>
                                        {user?.hostel_name || 'Switch Hostel'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={12} color="#FCD34D" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                </LinearGradient>
            )}

            {/* Menu groups */}
            <ScrollView
                style={s.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 140 : 120, paddingTop: 10 }}
            >
                {/* Big Search Bar - Always Visible with Gemini breathing border glow */}
                <Animated.View style={[
                    s.bigSearchWrap,
                    {
                        backgroundColor: isDark ? '#1E293B' : '#FFF',
                        borderColor: animatedBorderColor,
                        shadowColor: animatedShadowColor,
                        shadowOpacity: 0.5,
                        shadowRadius: 10,
                    }
                ]}>
                    <Ionicons name="search" size={18} color={isDark ? '#94A3B8' : '#64748B'} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[s.bigSearchInput, { color: theme.textPrimary, fontSize: fontSize - 1 }]}
                        placeholder="Search settings, tools, actions..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </Animated.View>
                {/* QR Signup Onboarding Card */}
                {!searchQuery && (
                    <TouchableOpacity
                        style={[s.selfRegisterCard, { backgroundColor: isDark ? '#1E1B4B' : '#EDE9FE', borderColor: isDark ? '#312E81' : '#DDD6FE' }]}
                        onPress={() => navigation.navigate('QRSignup')}
                        activeOpacity={0.8}
                    >
                        <View style={s.selfRegisterContent}>
                            <View style={[s.selfRegisterIconCircle, { backgroundColor: isDark ? '#4C1D95' : '#7C3AED' }]}>
                                <Ionicons name="qr-code-outline" size={20} color="#FFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.selfRegisterTitle, { color: isDark ? '#FFF' : '#4C1D95' }]}>
                                    Tenant Self-Registration
                                </Text>
                                <Text style={[s.selfRegisterSub, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>
                                    Tenants scan QR via camera to fill profiles. No app download required!
                                </Text>
                            </View>
                            <View style={[s.selfRegisterBtn, { backgroundColor: isDark ? '#7C3AED' : '#4C1D95' }]}>
                                <Text style={s.selfRegisterBtnText}>View QR</Text>
                                <Ionicons name="chevron-forward" size={12} color="#FFF" style={{ marginLeft: 2 }} />
                            </View>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Empty State */}
                {isListEmpty && (
                    <View style={s.emptyState}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
                        <Text style={[s.emptyText, { color: theme.textPrimary, fontSize: fontSize + 1, fontWeight: '700' }]}>{t('more.noMatchingTools')}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: fontSize - 2, marginTop: 4 }}>{t('more.trySearchingDifferent')}</Text>
                    </View>
                )}

                {!isListEmpty && filteredMenuGroups.map((group, gi) => (
                    <View key={gi} style={s.group}>
                        <Text style={[s.groupTitle, { color: theme.textSecondary, fontSize: fontSize - 2 }]}>{group.groupTitle}</Text>
                        <View style={s.gridRow}>
                            {group.items.map((item, ii) => (
                                <TouchableOpacity
                                    key={ii}
                                    style={[s.gridCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }, (item as any).comingSoon && { opacity: 0.6 }]}
                                    onPress={() => handlePress(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[s.iconCircle, { backgroundColor: isDark ? '#334155' : item.iconBg }]}>
                                        <Ionicons name={item.icon as any} size={20} color={isDark ? theme.primary : item.iconColor} />
                                    </View>
                                    <View style={s.cardTextWrap}>
                                        <Text style={[s.cardLabel, { color: theme.textPrimary, fontSize: fontSize - 1 }]} numberOfLines={1}>{item.label}</Text>
                                        <Text style={[s.cardSub, { color: theme.textSecondary, fontSize: fontSize - 3, lineHeight: fontSize - 1 }]} numberOfLines={2}>{item.subtitle}</Text>
                                    </View>
                                    {(item as any).badgeCount !== undefined && ((item as any).badgeCount !== 0 && (item as any).badgeCount !== '0/0') && (
                                        <View style={[s.badgeContainer, { backgroundColor: theme.primary }]}>
                                            <Text style={s.badgeText}>{(item as any).badgeCount}</Text>
                                        </View>
                                    )}

                                    {(item as any).comingSoon && (
                                        <View style={s.soonBadge}>
                                            <Text style={s.soonBadgeText}>Soon</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                {/* App Feedback & Support Banner */}
                <TouchableOpacity
                    style={{
                        marginVertical: 14,
                        borderRadius: 18,
                        overflow: 'hidden',
                        shadowColor: '#7C3AED',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        elevation: 4,
                    }}
                    onPress={() => navigation.navigate('Feedback')}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={['#7C3AED', '#5F2EEA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="chatbox-ellipses" size={22} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>
                                App Feedback & Support
                            </Text>
                            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.88)', marginTop: 2 }}>
                                Tell us what we need to improve or report an issue.
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Logout Button */}
                <TouchableOpacity
                    style={[s.logoutBtn, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2', borderColor: isDark ? '#991B1B' : '#FCA5A5' }]}
                    onPress={handleLogout}
                    activeOpacity={0.8}
                >
                    <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                    <Text style={[s.logoutText, { color: '#DC2626', fontSize: fontSize }]}>{t('more.logOut')}</Text>
                </TouchableOpacity>

                {/* 2-Color Brand Footer */}
                <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
                    <HostixBrand fontSize={22} subtitle="PG OS" lightTheme={!isDark} />
                    <Text style={[s.version, { fontSize: fontSize - 3, color: theme.textSecondary, marginTop: 4 }]}>
                        v1.0.0 · Smart Hostel Management
                    </Text>
                </View>
            </ScrollView>

            {/* ─────────────────── HOSTEL SWITCHER MODAL ─────────────────── */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={selectorVisible}
                onRequestClose={() => setSelectorVisible(false)}
            >
                <View style={s.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setSelectorVisible(false)}
                    />
                    <View style={[s.modalSheet, { backgroundColor: theme.cardBg }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: theme.textPrimary }]}>{t('more.switchHostel')}</Text>
                            <TouchableOpacity
                                style={s.modalCloseBtn}
                                onPress={() => setSelectorVisible(false)}
                            >
                                <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '700' }}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        {switching || loadingHostels ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={theme.primary} />
                                <Text style={{ marginTop: 12, color: theme.textSecondary, fontWeight: '600' }}>
                                    {switching ? t('more.switchingHostel') : t('more.loadingHostels')}
                                </Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
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

                                {hostels.map((h: any) => {
                                    const isActive = h.hostel_id && user?.hostel_id && (Number(h.hostel_id) === Number(user.hostel_id));
                                    return (
                                        <TouchableOpacity
                                            key={h.hostel_id}
                                            style={[
                                                s.hostelItem,
                                                isActive && s.hostelItemActive,
                                                isActive ? {
                                                    borderColor: theme.primary,
                                                    backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : theme.lightBg,
                                                } : {
                                                    borderColor: isDark ? '#334155' : '#E2E8F0',
                                                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                                }
                                            ]}
                                            onPress={() => handleSwitchHostel(h.hostel_id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[
                                                s.hostelItemIconContainer,
                                                { backgroundColor: isActive ? theme.primary : (isDark ? '#334155' : '#F1F5F9') }
                                            ]}>
                                                <Ionicons
                                                    name="business"
                                                    size={20}
                                                    color={isActive ? '#FFFFFF' : theme.textSecondary}
                                                />
                                            </View>

                                            <View style={s.hostelItemContent}>
                                                <View style={s.hostelItemHeaderRow}>
                                                    <Text style={[s.hostelItemText, { color: theme.textPrimary }]} numberOfLines={1}>
                                                        {h.hostel_name}
                                                    </Text>
                                                    {h.hostel_type && (
                                                        <View style={[
                                                            s.hostelTypeBadge,
                                                            {
                                                                backgroundColor: h.hostel_type === 'Boys'
                                                                    ? 'rgba(59, 130, 246, 0.15)'
                                                                    : h.hostel_type === 'Girls'
                                                                        ? 'rgba(236, 72, 153, 0.15)'
                                                                        : 'rgba(16, 185, 129, 0.15)'
                                                            }
                                                        ]}>
                                                            <Text style={[
                                                                s.hostelTypeBadgeText,
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

                                                <View style={s.hostelLocationRow}>
                                                    <Ionicons name="location-outline" size={12} color={theme.textSecondary} style={{ marginRight: 3 }} />
                                                    <Text style={[s.hostelLocationText, { color: theme.textSecondary }]} numberOfLines={1}>
                                                        {h.address || h.city || 'No address added'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={s.hostelItemRight}>
                                                {isActive ? (
                                                    <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                                                ) : (
                                                    <View style={[s.hostelItemUncheckedCircle, { borderColor: isDark ? '#475569' : '#CBD5E1' }]} />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                {hostels.length < 2 ? (
                                    <TouchableOpacity
                                        style={[s.addHostelBtn, { backgroundColor: theme.primary }]}
                                        onPress={() => {
                                            setSelectorVisible(false);
                                            navigation.navigate('AddHostel');
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="add" size={20} color="#FFF" />
                                        <Text style={s.addHostelText}>{t('more.addNewHostel')}</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={[s.limitNoteContainer, isDark && { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.3)' }]}>
                                        <Text style={s.limitNoteText}>
                                            {t('more.limitNote')}
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8F7FF' },

    header: {
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 25,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    searchIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSearchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        marginTop: 14,
    },
    headerSearchInput: {
        flex: 1,
        color: '#1E293B',
        fontWeight: '700',
    },
    bigSearchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 20,
        minHeight: 52,
        borderWidth: 1.5,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    bigSearchInput: {
        flex: 1,
        fontWeight: '700',
        paddingVertical: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
        paddingHorizontal: 30,
    },
    emptyText: {
        textAlign: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: { fontSize: 16, fontWeight: '900', color: '#FFF' },
    headerName: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 2 },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

    scroll: { flex: 1 },

    topToolsGroup: {
        marginHorizontal: 16,
        marginBottom: 20,
    },
    topToolsRow: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'space-between',
    },
    topToolCard: {
        width: '31.5%',
        backgroundColor: '#FFF',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 8,
    },
    topToolIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    topToolLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#1E293B',
        textAlign: 'center',
    },

    group: { marginHorizontal: 16, marginBottom: 24 },
    badgeContainer: {
        position: 'absolute',
        top: 12,
        right: 12,
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    groupTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1.0,
        marginBottom: 12,
        marginLeft: 4,
    },
    gridRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    gridCard: {
        width: '48%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 14,
        elevation: 2,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'flex-start',
        minHeight: 116,
        position: 'relative',
        marginBottom: 4,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    cardTextWrap: { flex: 1, width: '100%' },
    cardLabel: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 3 },
    cardSub: { fontSize: 10, color: '#94A3B8', fontWeight: '500', lineHeight: 13 },
    soonBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#EDE9FE',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    soonBadgeText: { fontSize: 8, fontWeight: '800', color: '#7C3AED' },

    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEE2E2',
        marginHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        marginBottom: 24,
    },
    logoutText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#DC2626',
    },

    version: {
        textAlign: 'center',
        fontSize: 11,
        color: '#CBD5E1',
        fontWeight: '600',
        marginBottom: 8,
    },
    hostelHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
        maxWidth: 140,
    },
    hostelHeaderBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 11,
        marginRight: 2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
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
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: 1.5,
    },
    hostelItemActive: {
        borderColor: '#7C3AED',
    },
    hostelItemText: {
        fontSize: 15,
        fontWeight: '800',
    },
    hostelItemIconContainer: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    hostelItemContent: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 6,
    },
    hostelItemHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    hostelTypeBadge: {
        paddingHorizontal: 7,
        paddingVertical: 1.5,
        borderRadius: 8,
    },
    hostelTypeBadgeText: {
        fontWeight: '800',
        fontSize: 9,
    },
    hostelLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hostelLocationText: {
        fontWeight: '600',
        fontSize: 11,
    },
    hostelItemRight: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    hostelItemUncheckedCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
    },
    addHostelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7C3AED',
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
    limitNoteContainer: {
        backgroundColor: 'rgba(249, 115, 22, 0.08)',
        borderColor: 'rgba(249, 115, 22, 0.2)',
        borderWidth: 1,
        padding: 12,
        borderRadius: 14,
        marginTop: 10,
        alignItems: 'center',
    },
    limitNoteText: {
        color: '#F97316',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    activeHostelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginTop: 4,
        marginBottom: 16,
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
    },
    activeHostelLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    activeHostelIconContainer: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeHostelTextWrap: {
        flex: 1,
    },
    activeHostelLabel: {
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    activeHostelName: {
        fontWeight: '800',
        marginTop: 2,
    },
    activeHostelSwitchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    activeHostelSwitchText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
    },
    codeCard: {
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
    },
    codeCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    codeCardTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    codeBox: {
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
    },
    selfRegisterCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        borderWidth: 1,
        padding: 14,
        elevation: 2,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    selfRegisterContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selfRegisterIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selfRegisterTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    selfRegisterSub: {
        fontSize: 10.5,
        fontWeight: '600',
        lineHeight: 14,
        marginTop: 2,
        paddingRight: 6,
    },
    selfRegisterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    selfRegisterBtnText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
});
