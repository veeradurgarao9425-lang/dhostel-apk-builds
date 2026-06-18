import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, ScrollView, Platform, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

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
                label: 'Delete Expenses',
                subtitle: 'Remove expense items',
                icon: 'trash-outline',
                iconColor: '#DC2626',
                iconBg: '#FEE2E2',
                route: 'DeleteExpenses',
            },
            {
                label: 'Delete Rooms',
                subtitle: 'Remove hostel rooms',
                icon: 'trash',
                iconColor: '#DC2626',
                iconBg: '#FEE2E2',
                route: 'DeleteRooms',
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
                comingSoon: true,
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
    const { user, signOut } = useAuth();
    const { theme } = useTheme();

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

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.9}>
                <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
                    <View style={s.headerContent}>
                        <View style={s.avatarCircle}>
                            <Text style={s.avatarText}>
                                {(user?.full_name || 'O')[0].toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerName}>{user?.full_name || 'Owner'}</Text>
                            <Text style={s.headerSub}>🏠 {user?.hostel_name || 'My Hostel'}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>

            {/* Menu groups */}
            <ScrollView
                style={s.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 110, paddingTop: 16 }}
            >
                {/* Quick Access Tools */}
                <View style={s.topToolsGroup}>
                    <Text style={s.groupTitle}>Quick Tools</Text>
                    <View style={s.topToolsRow}>
                        {TOP_TOOLS.map((tool, index) => (
                            <TouchableOpacity
                                key={index}
                                style={s.topToolCard}
                                onPress={() => handlePress(tool)}
                                activeOpacity={0.7}
                            >
                                <View style={[s.topToolIconCircle, { backgroundColor: tool.iconBg }]}>
                                    <Ionicons name={tool.icon as any} size={20} color={tool.iconColor} />
                                </View>
                                <Text style={s.topToolLabel} numberOfLines={1}>{tool.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {MENU_GROUPS.map((group, gi) => (
                    <View key={gi} style={s.group}>
                        <Text style={s.groupTitle}>{group.groupTitle}</Text>
                        <View style={s.gridRow}>
                            {group.items.map((item, ii) => (
                                <TouchableOpacity
                                    key={ii}
                                    style={[s.gridCard, item.comingSoon && { opacity: 0.6 }]}
                                    onPress={() => handlePress(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[s.iconCircle, { backgroundColor: item.iconBg }]}>
                                        <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
                                    </View>
                                    <View style={s.cardTextWrap}>
                                        <Text style={s.cardLabel} numberOfLines={1}>{item.label}</Text>
                                        <Text style={s.cardSub} numberOfLines={2}>{item.subtitle}</Text>
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
                    style={s.logoutBtn}
                    onPress={handleLogout}
                    activeOpacity={0.8}
                >
                    <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                    <Text style={s.logoutText}>Log Out</Text>
                </TouchableOpacity>

                {/* App version */}
                <Text style={s.version}>dHostel v1.0.0</Text>
            </ScrollView>
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
        flex: 1,
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
});
