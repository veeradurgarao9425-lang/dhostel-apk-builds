import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, ScrollView, Platform, Alert, TextInput,
    Modal, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';

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
}

const TOP_TOOLS: MenuItem[] = [
    {
        label: 'QR Signup',
        subtitle: 'Self registration QR',
        icon: 'qr-code',
        iconColor: '#7C3AED',
        iconBg: '#EDE9FE',
        route: 'QRSignup',
    },
    {
        label: 'Expenses',
        subtitle: 'Track hostel expenses',
        icon: 'card',
        iconColor: '#2563EB',
        iconBg: '#DBEAFE',
        route: 'Expenses',
    },
    {
        label: 'Maintenance',
        subtitle: 'Track repairs & status',
        icon: 'construct',
        iconColor: '#D97706',
        iconBg: '#FEF3C7',
        route: 'Maintenance',
    },
];

const MENU_GROUPS: { groupTitle: string; items: MenuItem[] }[] = [
    {
        groupTitle: 'Management',
        items: [
            {
                label: 'Hostels',
                subtitle: 'View & manage all hostels',
                icon: 'business',
                iconColor: '#16A34A',
                iconBg: '#DCFCE7',
                route: 'Hostels',
            },
            {
                label: 'Tenants',
                subtitle: 'View & manage all tenants',
                icon: 'people',
                iconColor: '#7C3AED',
                iconBg: '#EDE9FE',
                route: 'Students',
            },
            {
                label: 'Rooms',
                subtitle: 'View & manage all rooms',
                icon: 'bed',
                iconColor: '#2563EB',
                iconBg: '#DBEAFE',
                route: 'Rooms',
            },
            {
                label: 'Vacate Notices',
                subtitle: 'Scheduled vacate list',
                icon: 'megaphone',
                iconColor: '#EA580C',
                iconBg: '#FFEDD5',
                route: 'Notices',
            },
            {
                label: 'Pending Payments',
                subtitle: 'Track pending dues',
                icon: 'alert-circle',
                iconColor: '#DC2626',
                iconBg: '#FEE2E2',
                route: 'PendingTab',
            },
            {
                label: 'Staff Management',
                subtitle: 'Add & manage staff',
                icon: 'person-circle',
                iconColor: '#0891B2',
                iconBg: '#CFFAFE',
                route: 'Staff',
            },
        ],
    },
    {
        groupTitle: 'Finance',
        items: [
            {
                label: 'Income Report',
                subtitle: 'View monthly income',
                icon: 'trending-up',
                iconColor: '#16A34A',
                iconBg: '#DCFCE7',
                route: 'IncomeDetails',
                routeParams: { period: 'month' },
            },
            {
                label: 'Bulk Delete',
                subtitle: 'Manage bulk removals',
                icon: 'trash-outline',
                iconColor: '#DC2626',
                iconBg: '#FEE2E2',
                route: 'BulkDelete',
            },
        ],
    },
    {
        groupTitle: 'Tools',
        items: [
            {
                label: 'Reminders',
                subtitle: 'Due date alerts',
                icon: 'notifications',
                iconColor: '#0891B2',
                iconBg: '#CFFAFE',
                route: 'Reminders',
            },
            {
                label: 'Reports & Analytics',
                subtitle: 'Detailed analytics',
                icon: 'bar-chart',
                iconColor: '#059669',
                iconBg: '#D1FAE5',
                route: 'Reports',
            },
        ],
    },
    {
        groupTitle: 'Account',
        items: [
            {
                label: 'Profile',
                subtitle: 'Your account info',
                icon: 'person',
                iconColor: '#6B7280',
                iconBg: '#F3F4F6',
                route: 'Profile',
            },
            {
                label: 'Settings',
                subtitle: 'Preferences & themes',
                icon: 'settings',
                iconColor: '#374151',
                iconBg: '#F9FAFB',
                route: 'Settings',
            },
        ],
    },
];

export default function MoreScreen() {
    const navigation = useNavigation<any>();
    const { user, signOut, updateTokenAndUser } = useAuth();
    const { theme, isDark, fontSize } = useTheme();

    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectorVisible, setSelectorVisible] = useState(false);
    const [hostels, setHostels] = useState<any[]>([]);
    const [switching, setSwitching] = useState(false);
    const [loadingHostels, setLoadingHostels] = useState(false);

    const fetchHostels = async () => {
        try {
            setLoadingHostels(true);
            const res = await api.get('/hostels');
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
        if (hostelId === user?.hostel_id) {
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
            } else {
                Alert.alert('Error', res.data?.error || 'Failed to switch active hostel');
            }
        } catch (err: any) {
            console.error('Switch active hostel error:', err);
            Alert.alert('Error', err.response?.data?.error || 'An error occurred while switching hostels.');
        } finally {
            setSwitching(false);
        }
    };

    const openHostelSelector = () => {
        setSelectorVisible(true);
        fetchHostels();
    };

    const handlePress = (item: MenuItem) => {
        if (item.comingSoon) return;
        navigation.navigate(item.route, item.routeParams);
    };

    const handleLogout = () => {
        Alert.alert(
            'Confirm Log Out',
            'Are you sure you want to log out from the application?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                        } catch (e) {
                            console.error('Logout failed:', e);
                        }
                    }
                }
            ]
        );
    };

    // Filter TOP_TOOLS
    const filteredTopTools = useMemo(() => {
        if (!searchQuery) return TOP_TOOLS;
        const q = searchQuery.toLowerCase();
        return TOP_TOOLS.filter(t => t.label.toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q));
    }, [searchQuery]);

    // Filter MENU_GROUPS
    const filteredMenuGroups = useMemo(() => {
        if (!searchQuery) return MENU_GROUPS;
        const q = searchQuery.toLowerCase();
        return MENU_GROUPS.map(group => {
            const items = group.items.filter(item =>
                item.label.toLowerCase().includes(q) ||
                item.subtitle.toLowerCase().includes(q)
            );
            return { ...group, items };
        }).filter(group => group.items.length > 0);
    }, [searchQuery]);

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
                            <Text style={[s.headerName, { fontSize: fontSize + 4 }]}>{user?.full_name || 'Owner'}</Text>
                            <TouchableOpacity
                                style={[s.hostelHeaderBtn, { marginTop: 4, alignSelf: 'flex-start' }]}
                                onPress={openHostelSelector}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="business" size={12} color="#FFF" style={{ marginRight: 4 }} />
                                <Text style={s.hostelHeaderBtnText} numberOfLines={1}>{user?.hostel_name || 'My Hostel'}</Text>
                                <Ionicons name="chevron-down" size={9} color="#FFF" style={{ marginLeft: 2 }} />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
                            style={s.searchIconBtn}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={showSearch ? "close" : "search-outline"} size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {showSearch && (
                    <View style={s.headerSearchWrap}>
                        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                        <TextInput
                            style={[s.headerSearchInput, { fontSize: fontSize }]}
                            placeholder="Search menu tools..."
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
                {/* Empty State */}
                {isListEmpty && (
                    <View style={s.emptyState}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
                        <Text style={[s.emptyText, { color: theme.textPrimary, fontSize: fontSize + 1, fontWeight: '700' }]}>No matching tools found</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: fontSize - 2, marginTop: 4 }}>Try searching for a different keyword</Text>
                    </View>
                )}

                {/* Quick Access Tools */}
                {!isListEmpty && filteredTopTools.length > 0 && (
                    <View style={s.topToolsGroup}>
                        <Text style={[s.groupTitle, { color: theme.textSecondary, fontSize: fontSize - 2 }]}>Quick Tools</Text>
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
                    <Text style={[s.logoutText, { color: '#DC2626', fontSize: fontSize }]}>Log Out</Text>
                </TouchableOpacity>

                {/* App version */}
                <Text style={[s.version, { fontSize: fontSize - 3, color: theme.textSecondary }]}>Stivo v1.0.0</Text>
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
                            <Text style={[s.modalTitle, { color: theme.textPrimary }]}>Switch Hostel</Text>
                            <TouchableOpacity
                                style={s.modalCloseBtn}
                                onPress={() => setSelectorVisible(false)}
                            >
                                <Ionicons name="close" size={22} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {switching || loadingHostels ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={theme.primary} />
                                <Text style={{ marginTop: 12, color: theme.textSecondary, fontWeight: '600' }}>
                                    {switching ? 'Switching active hostel...' : 'Loading hostels...'}
                                </Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
                                {hostels.map((h: any) => {
                                    const isActive = h.hostel_id === user?.hostel_id;
                                    return (
                                        <TouchableOpacity
                                            key={h.hostel_id}
                                            style={[
                                                s.hostelItem,
                                                isActive && s.hostelItemActive,
                                                isActive && { borderColor: theme.primary, backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.08)' }
                                            ]}
                                            onPress={() => handleSwitchHostel(h.hostel_id)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[s.hostelItemText, { color: theme.textPrimary }]}>
                                                {h.hostel_name}
                                            </Text>
                                            {isActive && (
                                                <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                                            )}
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
                                        <Text style={s.addHostelText}>Add New Hostel</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={[s.limitNoteContainer, isDark && { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.3)' }]}>
                                        <Text style={s.limitNoteText}>
                                            ℹ️ Note: Every owner is limited to a maximum of 2 active hostels.
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
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 22, fontWeight: '900', color: '#FFF' },
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
        backgroundColor: 'rgba(15, 23, 42, 0.3)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 20,
        maxHeight: '75%',
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
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(148, 163, 184, 0.15)',
    },
    hostelItemActive: {
        borderColor: '#7C3AED',
        backgroundColor: 'rgba(124, 58, 237, 0.08)',
    },
    hostelItemText: {
        fontSize: 15,
        fontWeight: '700',
        flex: 1,
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
});
