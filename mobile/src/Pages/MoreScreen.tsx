import React, { useState, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, ScrollView, Platform, TextInput,
    Modal, ActivityIndicator, Image
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { useToast } from '../context/ToastContext';
import * as Clipboard from 'expo-clipboard';
import { TestUIModal } from '../components/TestUIModal';

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

export default function MoreScreen() {
    const navigation = useNavigation<any>();
    const { user, signOut, updateTokenAndUser, hostels: authHostels, loadHostels } = useAuth();
    const confirm = useConfirmation();
    const [testUiVisible, setTestUiVisible] = useState(false);

    const [stats, setStats] = useState<any>(null);

    const fetchStats = async () => {
        try {
            const [ownerRes, reportRes] = await Promise.all([
                api.get('/dashboard/owner-stats').catch(() => ({ data: { success: false } })),
                api.get('/reports/dashboard-stats').catch(() => ({ data: { success: false } }))
            ]);
            let combinedStats: any = {};
            if (ownerRes.data?.success) combinedStats = { ...combinedStats, ...ownerRes.data.data };
            if (reportRes.data?.success) combinedStats = { ...combinedStats, ...reportRes.data.data };
            setStats(combinedStats);
        } catch (error) {
            console.error('Failed to fetch stats for More screen', error);
        }
    };

    useFocusEffect(React.useCallback(() => { fetchStats(); }, []));

    useEffect(() => {
        if (authHostels.length === 0) {
            loadHostels();
        }
    }, [authHostels.length, loadHostels]);
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();

    const topTools = useMemo<MenuItem[]>(() => [
        {
            label: t('more.qrSignup'),
            subtitle: t('more.qrSignupSub'),
            icon: 'qr-code',
            iconColor: '#7C3AED',
            iconBg: '#EDE9FE',
            route: 'QRSignup',
        },
        {
            label: t('more.expenses'),
            subtitle: t('more.expensesSub'),
            icon: 'card',
            iconColor: '#2563EB',
            iconBg: '#DBEAFE',
            route: 'Expenses',
        },
        {
            label: t('more.guests'),
            subtitle: t('more.guestsSub'),
            icon: 'walk',
            iconColor: '#0891B2',
            iconBg: '#CFFAFE',
            route: 'Guests',
        },
    ], [t]);

    const menuGroups = useMemo<{ groupTitle: string; items: MenuItem[] }[]>(() => [
        {
            groupTitle: t('more.management'),
            items: [
                {
                    label: 'Collect Rent',
                    subtitle: 'Collect fees and record payments',
                    icon: 'cash-outline',
                    iconColor: '#10B981',
                    iconBg: '#D1FAE5',
                    route: 'CollectedPayments',
                },
                {
                    label: t('more.pendingPayments'),
                    subtitle: t('more.pendingPaymentsSub'),
                    icon: 'alert-circle',
                    iconColor: '#DC2626',
                    iconBg: '#FEE2E2',
                    route: 'PendingTab',
                    badgeCount: stats?.pendingDuesCount ?? 0,
                },
                {
                    label: t('more.incomeReport'),
                    subtitle: t('more.incomeReportSub'),
                    icon: 'trending-up',
                    iconColor: '#16A34A',
                    iconBg: '#DCFCE7',
                    route: 'IncomeDetails',
                    routeParams: { period: 'month' },
                },
                {
                    label: t('more.reportsAnalytics'),
                    subtitle: t('more.reportsAnalyticsSub'),
                    icon: 'bar-chart',
                    iconColor: '#059669',
                    iconBg: '#D1FAE5',
                    route: 'Reports',
                },
                {
                    label: t('more.rooms'),
                    subtitle: t('more.roomsSub'),
                    icon: 'bed',
                    iconColor: '#2563EB',
                    iconBg: '#DBEAFE',
                    route: 'Rooms',
                    badgeCount: stats?.rooms ? `${stats.rooms.occupied_beds}/${stats.rooms.total_beds}` : '0/0',
                },
                {
                    label: t('more.tenants'),
                    subtitle: t('more.tenantsSub'),
                    icon: 'people',
                    iconColor: '#7C3AED',
                    iconBg: '#EDE9FE',
                    route: 'Students',
                    badgeCount: (stats?.tenantsCount || stats?.totalStudents || 0) > 0 ? (stats?.tenantsCount || stats?.totalStudents) : undefined,
                },
                {
                    label: t('more.staffManagement'),
                    subtitle: t('more.staffManagementSub'),
                    icon: 'person-circle',
                    iconColor: '#0891B2',
                    iconBg: '#CFFAFE',
                    route: 'Staff',
                    badgeCount: stats?.staffCount ?? 0,
                },
                {
                    label: 'Verify Rent',
                    subtitle: 'Verify uploaded payment proofs',
                    icon: 'shield-checkmark-outline',
                    iconColor: '#16A34A',
                    iconBg: '#DCFCE7',
                    route: 'PaymentVerification',
                    badgeCount: 0,
                },
                {
                    label: 'Mess Menu',
                    subtitle: 'Manage weekly food schedule',
                    icon: 'restaurant-outline',
                    iconColor: '#059669',
                    iconBg: '#D1FAE5',
                    route: 'MessMenuManagement',
                },
                {
                    label: 'Notices Board',
                    subtitle: 'Post announcements to tenants',
                    icon: 'megaphone-outline',
                    iconColor: '#7C3AED',
                    iconBg: '#EDE9FE',
                    route: 'NoticesManagement',
                },
                {
                    label: 'Complaints',
                    subtitle: 'Manage tenant complaints',
                    icon: 'construct-outline',
                    iconColor: '#DC2626',
                    iconBg: '#FEE2E2',
                    route: 'ComplaintsManagement',
                    badgeCount: 0,
                },
                {
                    label: t('more.vacateNotices'),
                    subtitle: t('more.vacateNoticesSub'),
                    icon: 'calendar-outline',
                    iconColor: '#EA580C',
                    iconBg: '#FFEDD5',
                    route: 'Notices',
                    badgeCount: stats?.noticesCount || 0,
                },
                {
                    label: 'Tenant Reviews',
                    subtitle: 'View ratings from your tenants',
                    icon: 'star-outline',
                    iconColor: '#F59E0B',
                    iconBg: '#FFFBEB',
                    route: 'RatingsManagement',
                },
            ],
        },
        {
            groupTitle: 'Hostel',
            items: [
                {
                    label: t('more.hostels'),
                    subtitle: t('more.hostelsSub'),
                    icon: 'business',
                    iconColor: '#16A34A',
                    iconBg: '#DCFCE7',
                    route: 'Hostels',
                    badgeCount: stats?.hostelsCount || 0,
                },
                {
                    label: t('more.bulkDelete'),
                    subtitle: t('more.bulkDeleteSub'),
                    icon: 'trash-outline',
                    iconColor: '#DC2626',
                    iconBg: '#FEE2E2',
                    route: 'BulkDelete',
                },
            ],
        },
        {
            groupTitle: t('more.tools'),
            items: [
                {
                    label: t('more.reminders'),
                    subtitle: t('more.remindersSub'),
                    icon: 'notifications',
                    iconColor: '#0891B2',
                    iconBg: '#CFFAFE',
                    route: 'Reminders',
                },
            ],
        },
        {
            groupTitle: t('more.account'),
            items: [
                {
                    label: t('more.profile'),
                    subtitle: t('more.profileSub'),
                    icon: 'person',
                    iconColor: '#8B5CF6',
                    iconBg: '#EDE9FE',
                    route: 'Profile',
                },
                {
                    label: t('more.settings', 'Settings'),
                    subtitle: t('more.appSettingsSub'),
                    icon: 'settings',
                    iconColor: '#3B82F6',
                    iconBg: '#DBEAFE',
                    route: 'Settings',
                },
                {
                    label: 'Test UI Components',
                    subtitle: 'Preview all UI elements',
                    icon: 'color-palette',
                    iconColor: '#EC4899',
                    iconBg: '#FCE7F3',
                    route: 'TestUI',
                }
            ],
        },
    ], [t, stats]);

    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectorVisible, setSelectorVisible] = useState(false);
    const [hostels, setHostels] = useState<any[]>([]);
    const [switching, setSwitching] = useState(false);
    const [loadingHostels, setLoadingHostels] = useState(false);
    const [copiedActiveCode, setCopiedActiveCode] = useState(false);
    const [copiedCardCode, setCopiedCardCode] = useState(false);

    const handleCopyCode = async (code: string, type: 'active' | 'card') => {
        try {
            await Clipboard.setStringAsync(code);
            if (type === 'active') {
                setCopiedActiveCode(true);
                setTimeout(() => setCopiedActiveCode(false), 2000);
            } else {
                setCopiedCardCode(true);
                setTimeout(() => setCopiedCardCode(false), 2000);
            }
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    const fetchHostels = async () => {
        try {
            setLoadingHostels(true);
            const res = await api.get('/hostels?my_hostels=true');
            if (res.data?.success) {
                setHostels(res.data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch owned hostels:', e);
        } finally {
            setLoadingHostels(false);
        }
    };

    const handleSwitchHostel = async (hostelId: number) => {
        if (Number(hostelId) === Number(user?.hostel_id)) {
            setSelectorVisible(false);
            return;
        }
        try {
            setSwitching(true);
            const res = await api.put('/auth/active-hostel', { hostel_id: hostelId });
            if (res.data?.success) {
                const { token, hostel_name } = res.data.data;
                await updateTokenAndUser(token, { hostel_id: hostelId, hostel_name });
                setSelectorVisible(false);
                showSuccess(`Switched to ${hostel_name}`);
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

    const openHostelSelector = () => {
        setSelectorVisible(true);
        fetchHostels();
    };

    const handlePress = (item: MenuItem) => {
        if (item.comingSoon) {
            return;
        }

        if (item.route === 'TestUI') {
            setTestUiVisible(true);
            return;
        }

        if (item.route) {
            navigation.navigate(item.route, item.routeParams);
        }
    };

    const handleLogout = () => {
        confirm({
            title: t('more.confirmLogOut', 'Confirm Log Out'),
            message: t('more.logOutConfirmMsg', 'Are you sure you want to log out from the application?'),
            confirmText: t('more.logOut', 'Log Out'),
            cancelText: t('overview.cancel', 'Cancel'),
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await signOut();
                } catch (e) {
                    console.error('Logout failed:', e);
                }
            }
        });
    };

    // Filter topTools
    const filteredTopTools = useMemo(() => {
        if (!searchQuery) return topTools;
        const q = searchQuery.toLowerCase();
        return topTools.filter(tVal => tVal.label.toLowerCase().includes(q) || tVal.subtitle.toLowerCase().includes(q));
    }, [searchQuery, topTools]);

    // Filter menuGroups
    const filteredMenuGroups = useMemo(() => {
        if (!searchQuery) return menuGroups;
        const q = searchQuery.toLowerCase();
        return menuGroups.map(group => {
            const items = group.items.filter(item =>
                item.label.toLowerCase().includes(q) ||
                item.subtitle.toLowerCase().includes(q)
            );
            return { ...group, items };
        }).filter(group => group.items.length > 0);
    }, [searchQuery, menuGroups]);

    const isListEmpty = filteredTopTools.length === 0 && filteredMenuGroups.length === 0;

    return (
        <View style={[s.root, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
                <View style={s.headerContent}>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.9} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <View style={s.avatarCircle}>
                            <Text style={s.avatarText}>
                                {(user?.full_name || 'O')[0].toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.headerName, { fontSize: fontSize + 3 }]} numberOfLines={1}>
                                {user?.full_name || (user?.role_id === 1 ? 'Hostel Administrator' : 'Hostel Owner')}
                            </Text>
                            <Text style={{ fontSize: fontSize - 2, color: 'rgba(255, 255, 255, 0.75)', fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                                {user?.phone ? `+91 ${user.phone}` : (user?.email || 'Admin User')}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
                            style={s.searchIconBtn}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={showSearch ? "close" : "search"} size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {showSearch && (
                    <View style={s.headerSearchWrap}>
                        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                        <TextInput
                            style={[s.headerSearchInput, { fontSize: fontSize }]}
                            placeholder={t('more.searchPlaceholder')}
                            placeholderTextColor="#94A3B8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color="#94A3B8" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </LinearGradient>

            {/* Menu groups */}
            <ScrollView
                style={s.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 110, paddingTop: 16 }}
            >
                {/* Active Hostel Selection Card */}
                {!isListEmpty && !searchQuery && (
                    <View>
                        <TouchableOpacity
                            style={[
                                s.activeHostelCard,
                                {
                                    backgroundColor: theme.cardBg,
                                    borderColor: isDark ? '#334155' : '#E2E8F0',
                                }
                            ]}
                            onPress={openHostelSelector}
                            activeOpacity={0.8}
                        >
                            <View style={s.activeHostelLeft}>
                                <View style={[s.activeHostelIconContainer, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : theme.primary + '12' }]}>
                                    <Ionicons name="business" size={20} color={theme.primary} />
                                </View>
                                <View style={s.activeHostelTextWrap}>
                                    <Text style={[s.activeHostelLabel, { color: theme.textSecondary, fontSize: fontSize - 4 }]}>{t('more.activeHostel')}</Text>
                                    <Text style={[s.activeHostelName, { color: theme.textPrimary, fontSize: fontSize - 1 }]} numberOfLines={1}>
                                        {user?.hostel_name || t('more.noActiveHostel')}
                                    </Text>
                                    {(() => {
                                        const hCode = authHostels.find((h: any) => h.hostel_id === user?.hostel_id)?.hostel_code;
                                        if (hCode) {
                                            return (
                                                <TouchableOpacity
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        handleCopyCode(hCode, 'active');
                                                    }}
                                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={{ fontSize: fontSize - 3, color: copiedActiveCode ? '#10B981' : theme.primary, fontWeight: '700' }}>
                                                        {copiedActiveCode ? 'Copied!' : `Code: ${hCode}`}
                                                    </Text>
                                                    <Ionicons
                                                        name={copiedActiveCode ? "checkmark-circle" : "copy-outline"}
                                                        size={12}
                                                        color={copiedActiveCode ? '#10B981' : theme.primary}
                                                    />
                                                </TouchableOpacity>
                                            );
                                        }
                                        return null;
                                    })()}
                                </View>
                            </View>
                            <View style={[s.activeHostelSwitchBtn, { backgroundColor: theme.primary }]}>
                                <Text style={s.activeHostelSwitchText}>{t('more.switch')}</Text>
                                <Ionicons name="swap-horizontal" size={12} color="#FFF" />
                            </View>
                        </TouchableOpacity>

                        {/* Hostel Connection Code Block - Show only for Owners (role_id !== 1) */}
                        {user?.role_id !== 1 && authHostels.find((h: any) => h.hostel_id === user?.hostel_id)?.hostel_code && (
                            <View style={[s.codeCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                <View style={s.codeCardHeader}>
                                    <Ionicons name="key" size={16} color={theme.primary} />
                                    <Text style={[s.codeCardTitle, { color: theme.textPrimary }]}>Hostel Connection Code</Text>
                                </View>
                                <TouchableOpacity
                                    style={[s.codeBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                                    onPress={() => {
                                        const hCode = authHostels.find((h: any) => h.hostel_id === user?.hostel_id)?.hostel_code;
                                        if (hCode) handleCopyCode(hCode, 'card');
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: 4, color: copiedCardCode ? '#10B981' : theme.primary }}>
                                            {authHostels.find((h: any) => h.hostel_id === user?.hostel_id)?.hostel_code}
                                        </Text>
                                        <Ionicons
                                            name={copiedCardCode ? "checkmark-circle" : "copy-outline"}
                                            size={20}
                                            color={copiedCardCode ? '#10B981' : theme.primary}
                                        />
                                    </View>
                                    <Text style={{ fontSize: 12, color: copiedCardCode ? '#10B981' : theme.textSecondary, marginTop: 6, textAlign: 'center', fontWeight: copiedCardCode ? '700' : '400' }}>
                                        {copiedCardCode ? 'Code copied to clipboard!' : 'Tap code to copy and share with your tenants.'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}



                {/* Empty State */}
                {isListEmpty && (
                    <View style={s.emptyState}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
                        <Text style={[s.emptyText, { color: theme.textPrimary, fontSize: fontSize + 1, fontWeight: '700' }]}>{t('more.noMatchingTools')}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: fontSize - 2, marginTop: 4 }}>{t('more.trySearchingDifferent')}</Text>
                    </View>
                )}

                {/* Quick Access Tools */}
                {!isListEmpty && filteredTopTools.length > 0 && (
                    <View style={s.topToolsGroup}>
                        <Text style={[s.groupTitle, { color: theme.textSecondary, fontSize: fontSize - 2 }]}>{t('more.quickTools')}</Text>
                        <View style={s.topToolsRow}>
                            {filteredTopTools.map((tool, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[s.topToolCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                                    onPress={() => handlePress(tool)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[s.topToolIconCircle, { backgroundColor: isDark ? '#334155' : tool.iconBg }]}>
                                        <Ionicons name={tool.icon as any} size={20} color={isDark ? theme.primary : tool.iconColor} />
                                    </View>
                                    <Text style={[s.topToolLabel, { color: theme.textPrimary, fontSize: fontSize - 3 }]} numberOfLines={1}>{tool.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {!isListEmpty && filteredMenuGroups.map((group, gi) => (
                    <View key={gi} style={s.group}>
                        <Text style={[s.groupTitle, { color: theme.textSecondary, fontSize: fontSize - 2 }]}>{group.groupTitle}</Text>
                        <View style={s.gridRow}>
                            {group.items.map((item, ii) => (
                                <TouchableOpacity
                                    key={ii}
                                    style={[s.gridCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }, item.comingSoon && { opacity: 0.6 }]}
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
                                    {item.badgeCount !== undefined && (item.badgeCount !== 0 && item.badgeCount !== '0/0') && (
                                        <View style={[s.badgeContainer, { backgroundColor: theme.primary }]}>
                                            <Text style={s.badgeText}>{item.badgeCount}</Text>
                                        </View>
                                    )}

                                    {item.comingSoon && (
                                        <View style={s.soonBadge}>
                                            <Text style={s.soonBadgeText}>Soon</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Logout Button */}
                <TouchableOpacity
                    style={[s.logoutBtn, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2', borderColor: isDark ? '#991B1B' : '#FCA5A5' }]}
                    onPress={handleLogout}
                    activeOpacity={0.8}
                >
                    <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                    <Text style={[s.logoutText, { color: '#DC2626', fontSize: fontSize }]}>{t('more.logOut')}</Text>
                </TouchableOpacity>

                {/* App version */}
                <Text style={[s.version, { fontSize: fontSize - 3, color: theme.textSecondary }]}>Hostix v1.0.0</Text>
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
                                    backgroundColor: theme.isDark ? 'rgba(79, 70, 229, 0.12)' : '#F0F9FF',
                                    borderColor: theme.isDark ? 'rgba(79, 70, 229, 0.25)' : '#E0F2FE',
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

            <TestUIModal visible={testUiVisible} onClose={() => setTestUiVisible(false)} />
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
});
