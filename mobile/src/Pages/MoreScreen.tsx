import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

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
                iconColor: '#7C3AED',
                iconBg: '#EDE9FE',
                route: 'Rooms',
            },
            {
                label: 'Finance Hub',
                subtitle: 'Collections, dues & expenses',
                icon: 'wallet',
                iconColor: '#2563EB',
                iconBg: '#DBEAFE',
                route: 'FinanceTab',
            },
            {
                label: 'Staff Management',
                subtitle: 'Add & manage hostel staff',
                icon: 'person-circle',
                iconColor: '#059669',
                iconBg: '#D1FAE5',
                route: 'Staff',
                comingSoon: false,
            },
            {
                label: 'Maintenance',
                subtitle: 'Track repair & maintenance',
                icon: 'construct',
                iconColor: '#D97706',
                iconBg: '#FEF3C7',
                route: 'Maintenance',
            },
            {
                label: 'Delete Rooms',
                subtitle: 'Remove unused rooms',
                icon: 'trash-bin',
                iconColor: '#DC2626',
                iconBg: '#FEE2E2',
                route: 'DeleteRooms',
            },
        ],
    },
    {
        groupTitle: 'Finance',
        items: [
            {
                label: 'Expenses',
                subtitle: 'Track hostel expenses',
                icon: 'card',
                iconColor: '#2563EB',
                iconBg: '#DBEAFE',
                route: 'Expenses',
            },
            {
                label: 'Income Report',
                subtitle: 'View detailed income data',
                icon: 'trending-up',
                iconColor: '#16A34A',
                iconBg: '#DCFCE7',
                route: 'IncomeDetails',
                routeParams: { period: 'month' },
            },
            {
                label: 'Delete Expenses',
                subtitle: 'Remove expense records',
                icon: 'trash',
                iconColor: '#DC2626',
                iconBg: '#FEE2E2',
                route: 'DeleteExpenses',
            },
        ],
    },
    {
        groupTitle: 'Tools',
        items: [
            {
                label: 'Reminders',
                subtitle: 'Set due date reminders',
                icon: 'notifications',
                iconColor: '#0891B2',
                iconBg: '#CFFAFE',
                route: 'Reminders',
                comingSoon: false,
            },
            {
                label: 'QR Signup',
                subtitle: 'Tenant self-registration',
                icon: 'qr-code',
                iconColor: '#7C3AED',
                iconBg: '#EDE9FE',
                route: 'QRSignup',
            },
            {
                label: 'Reports & Analytics',
                subtitle: 'Detailed hostel analytics',
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
                subtitle: 'Manage your account',
                icon: 'person-circle',
                iconColor: '#6B7280',
                iconBg: '#F3F4F6',
                route: 'Profile',
            },
            {
                label: 'Settings',
                subtitle: 'App preferences',
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
    const { user } = useAuth();

    const handlePress = (item: MenuItem) => {
        navigation.navigate(item.route, item.routeParams);
    };

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.9}>
                <LinearGradient colors={['#6D28D9', '#7C3AED']} style={s.header}>
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
                {MENU_GROUPS.map((group, gi) => (
                    <View key={gi} style={s.group}>
                        <Text style={s.groupTitle}>{group.groupTitle}</Text>
                        <View style={s.groupCard}>
                            {group.items.map((item, ii) => (
                                <TouchableOpacity
                                    key={ii}
                                    style={[
                                        s.menuRow,
                                        ii < group.items.length - 1 && s.menuRowBorder,
                                    ]}
                                    onPress={() => handlePress(item)}
                                    activeOpacity={0.7}
                                >
                                    {/* Icon */}
                                    <View style={[s.menuIconWrap, { backgroundColor: item.iconBg }]}>
                                        <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
                                    </View>

                                    {/* Text */}
                                    <View style={s.menuTextWrap}>
                                        <View style={s.menuLabelRow}>
                                            <Text style={s.menuLabel}>{item.label}</Text>
                                            {item.comingSoon && (
                                                <View style={s.soonBadge}>
                                                    <Text style={s.soonBadgeText}>Soon</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={s.menuSub}>{item.subtitle}</Text>
                                    </View>

                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

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
    profileBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    scroll: { flex: 1 },

    group: { marginHorizontal: 16, marginBottom: 20 },
    groupTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
        marginLeft: 4,
    },
    groupCard: {
        backgroundColor: '#FFF',
        borderRadius: 18,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },

    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        gap: 13,
    },
    menuRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    menuIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuTextWrap: { flex: 1 },
    menuLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
    menuLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
    menuSub: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

    soonBadge: {
        backgroundColor: '#EDE9FE',
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    soonBadgeText: { fontSize: 9, fontWeight: '800', color: '#7C3AED' },

    version: {
        textAlign: 'center',
        fontSize: 11,
        color: '#CBD5E1',
        fontWeight: '600',
        marginBottom: 8,
    },
});
