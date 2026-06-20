import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    Platform,
    UIManager,
    Alert
} from 'react-native';
import {
    User,
    Settings,
    ChevronRight,
    LogOut,
    ShieldCheck,
    Building,
    DoorOpen,
    Users,
    Phone,
    Mail,
    Building2,
    HelpCircle
} from 'lucide-react-native';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { HeaderNotification } from '../components/HeaderNotification';
import { AppHeader } from '../components/AppHeader';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }: any) => {
    const { signOut, user } = useAuth();
    const { theme, isDark, fontSize } = useTheme();
    const [stats, setStats] = useState<any>(null);

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/owner-stats');
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Profile fetch stats error:', error);
        }
    };

    useFocusEffect(React.useCallback(() => { fetchStats(); }, []));

    const handleLogout = async () => {
        await signOut();
        navigation.replace('Login');
    };

    const handleHelpSupport = () => {
        Alert.alert(
            "Help & Support",
            "For any queries, issues, or assistance, please contact us:\n\n📧 support@dhostel.com\n📞 +91 98765 43210\n\nWe are available 24/7.",
            [{ text: "OK", style: "default" }]
        );
    };

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, iconBg, titleColor, rightEl }: any) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.menuIconContainer, { backgroundColor: iconBg || (isDark ? '#334155' : '#F8FAFC') }]}>
                <Icon color={titleColor || (isDark ? theme.textPrimary : '#64748B')} size={20} />
            </View>
            <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { fontSize: fontSize + 1, color: titleColor || theme.textPrimary }]}>{title}</Text>
                {subtitle ? <Text style={[styles.menuSubtitle, { fontSize: Math.max(10, fontSize - 3), color: theme.textSecondary }]}>{subtitle}</Text> : null}
            </View>
            {rightEl !== undefined ? rightEl : <ChevronRight color={isDark ? '#475569' : '#CBD5E1'} size={18} />}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />

            {/* ── POWER HEADER ── */}
            <AppHeader
                title=""
                showBack={navigation.canGoBack()}
                rightComponent={<HeaderNotification navigation={navigation} />}
            >
                <View style={styles.profileBrief}>
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarMain}><User color={theme.primary} size={40} /></View>
                        <View style={styles.verifiedBadge}><ShieldCheck color="#FFF" size={12} /></View>
                    </View>
                    <View style={styles.nameHeader}>
                        <Text style={[styles.ownerName, { fontSize: fontSize + 6 }]}>{user?.full_name || 'Hostel Owner'}</Text>
                        <Text style={[styles.hostelSub, { fontSize: fontSize - 1 }]}>{user?.role || 'Hostel Owner'}</Text>
                    </View>
                </View>
            </AppHeader>

            <ScrollView
                style={styles.mainScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── STATS ROW ── */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <Building color="#3B82F6" size={24} />
                        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{stats?.hostelsCount ?? 0}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Hostels</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <DoorOpen color="#10B981" size={24} />
                        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{stats?.roomsCount ?? 0}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rooms</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <Users color="#8B5CF6" size={24} />
                        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{stats?.tenantsCount ?? 0}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Tenants</Text>
                    </View>
                </View>

                {/* ── PERSONAL INFORMATION ── */}
                <Text style={[styles.sectionLabel, { fontSize: Math.max(10, fontSize - 4), color: theme.textSecondary }]}>PERSONAL INFORMATION</Text>
                <View style={[styles.infoCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <View style={styles.infoItem}>
                        <View style={[styles.infoIconWrap, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                            <Phone color="#3B82F6" size={18} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Phone Number</Text>
                            <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{user?.phone || 'Not Provided'}</Text>
                        </View>
                    </View>

                    <View style={[styles.infoDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

                    <View style={styles.infoItem}>
                        <View style={[styles.infoIconWrap, { backgroundColor: isDark ? '#1E293B' : '#ECFDF5' }]}>
                            <Mail color="#10B981" size={18} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email Address</Text>
                            <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{user?.email || 'Not Provided'}</Text>
                        </View>
                    </View>

                    <View style={[styles.infoDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

                    <View style={styles.infoItem}>
                        <View style={[styles.infoIconWrap, { backgroundColor: isDark ? '#1E293B' : '#F5F3FF' }]}>
                            <Building2 color="#8B5CF6" size={18} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Active Hostel</Text>
                            <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{user?.hostel_name || 'No Active Hostel'}</Text>
                        </View>
                    </View>
                </View>

                {/* ── SUPPORT & SETTINGS ── */}
                <Text style={[styles.sectionLabel, { fontSize: Math.max(10, fontSize - 4), color: theme.textSecondary }]}>SUPPORT & SETTINGS</Text>
                <View style={[styles.menuCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <MenuItem
                        icon={Settings}
                        title="Settings"
                        subtitle="Change Password, Font Size, Theme"
                        onPress={() => navigation.navigate('Settings')}
                        iconBg={isDark ? '#334155' : theme.lightBg}
                        titleColor={theme.textPrimary}
                    />
                    <View style={[styles.innerDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                    
                    <MenuItem
                        icon={HelpCircle}
                        title="Help & Support"
                        subtitle="Contact support team, FAQs"
                        onPress={handleHelpSupport}
                        iconBg={isDark ? '#334155' : theme.lightBg}
                        titleColor={theme.textPrimary}
                    />
                    <View style={[styles.innerDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                    
                    <MenuItem
                        icon={LogOut}
                        title="Sign Out"
                        subtitle="Log out of your account"
                        onPress={handleLogout}
                        iconBg={isDark ? '#451A1A' : '#FEF2F2'}
                        titleColor="#EF4444"
                    />
                </View>

                <Text style={[styles.footerVersion, { color: theme.textSecondary }]}>Version 1.0.0</Text>
                <View style={styles.bottomSpace} />
            </ScrollView>
        </View>
    );
};

export default ProfileScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
    profileBrief: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    avatarWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', padding: 4 },
    avatarMain: { flex: 1, borderRadius: 40, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#10B981', borderRadius: 12, padding: 4, borderWidth: 2, borderColor: '#FFF' },
    nameHeader: { marginLeft: 16 },
    ownerName: { fontWeight: '900', color: '#FFF' },
    hostelSub: { color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

    mainScroll: { flex: 1, marginTop: -15 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
    sectionLabel: { fontWeight: '800', marginBottom: 12, marginLeft: 4, letterSpacing: 1 },

    // Stats Row
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },

    // Personal Info Card
    infoCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    infoIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoVal: {
        fontSize: 14,
        fontWeight: '700',
        marginTop: 2,
    },
    infoDivider: {
        height: 1,
        marginVertical: 12,
        opacity: 0.5,
    },

    // Menu Card
    menuCard: { borderRadius: 24, marginBottom: 20, paddingVertical: 4, elevation: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    menuIconContainer: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    menuText: { flex: 1 },
    menuTitle: { fontWeight: '700' },
    menuSubtitle: { marginTop: 2 },
    innerDivider: { height: 1, marginLeft: 65 },

    footerVersion: { textAlign: 'center', fontSize: 11, marginTop: 10 },
    bottomSpace: { height: 120 },
});

