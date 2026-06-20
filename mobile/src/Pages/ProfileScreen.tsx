import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    LayoutAnimation,
    Platform,
    UIManager
} from 'react-native';
import {
    User,
    Settings,
    TrendingUp,
    FileText,
    ChevronRight,
    LogOut,
    Globe,
    ShieldCheck,
    Briefcase,
    Settings2,
    Wrench
} from 'lucide-react-native';

import { useTranslation } from 'react-i18next';
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

const T = {
    en: {
        superAdmin: 'Super Admin',
        hostelManager: 'Hostel Manager',
        income: 'Total Income',
        expenses: 'Expenses',
        occupancy: 'Occupancy',
        reports: 'Reports',
        signOut: 'Sign Out',
        version: 'Version 1.0.0'
    },
    hi: {
        superAdmin: 'सुपर व्यवस्थापक',
        hostelManager: 'बॉयज हॉस्टल मैनेजर',
        income: 'कुल आय',
        expenses: 'खर्चे',
        occupancy: 'कब्ज़ा',
        reports: 'रिपोर्ट',
        signOut: 'साइन आउट',
        version: 'संस्करण 1.0.0'
    },
    te: {
        superAdmin: 'సూపర్ అడ్మిన్',
        hostelManager: 'హాస్టల్ మేనేజర్',
        income: 'మొత్తం ఆదాయం',
        expenses: 'ఖర్చులు',
        occupancy: 'సామర్థ్యం',
        reports: 'నివేదికలు',
        signOut: 'బయటకు వెళ్ళు',
        version: 'వెర్షన్ 1.0.0'
    }
};

const ProfileScreen = ({ navigation }: any) => {
    const { signOut, user } = useAuth();
    const { i18n } = useTranslation();
    const { theme, isDark, fontSize } = useTheme();
    const [stats, setStats] = useState<any>(null);

    // TAB STATE
    const [activeTab, setActiveTab] = useState<'Personal' | 'Business'>('Personal');

    const currentLang = (i18n.language || 'en').split('-')[0];
    const t = (T as any)[currentLang] || T['en'];

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

    const handleTabChange = (tab: 'Personal' | 'Business') => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveTab(tab);
    };

    // ── Components ─────────────────────────────────────────────────────

    const GridTool = ({ icon: Icon, title, value, color, bg, onPress }: any) => (
        <TouchableOpacity
            style={[styles.toolCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={[styles.toolIconWrap, { backgroundColor: isDark ? '#334155' : bg }]}>
                <Icon color={isDark ? theme.primary : color} size={24} />
            </View>
            <View style={styles.toolText}>
                <Text style={[styles.toolLabel, { fontSize: Math.max(10, fontSize - 3), color: theme.textSecondary }]}>{title}</Text>
                <Text style={[styles.toolValue, { fontSize: fontSize, color: isDark ? theme.textPrimary : color }]}>{value}</Text>
            </View>
        </TouchableOpacity>
    );

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
                        <Text style={[styles.ownerName, { fontSize: fontSize + 6 }]}>{user?.full_name || t.superAdmin}</Text>
                        <Text style={[styles.hostelSub, { fontSize: fontSize - 1 }]}>{user?.hostel_name || t.hostelManager}</Text>
                    </View>
                </View>

                {/* ── SEGMENTED TABS ── */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Personal' && styles.activeTab, activeTab === 'Personal' && isDark && { backgroundColor: '#1E293B' }]}
                        onPress={() => handleTabChange('Personal')}
                    >
                        <Settings2 color={activeTab === 'Personal' ? theme.primary : '#FFF'} size={18} />
                        <Text style={[styles.tabText, { fontSize: fontSize - 2 }, activeTab === 'Personal' ? { color: theme.primary } : { color: '#FFF' }]}>Account</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Business' && styles.activeTab, activeTab === 'Business' && isDark && { backgroundColor: '#1E293B' }]}
                        onPress={() => handleTabChange('Business')}
                    >
                        <Briefcase color={activeTab === 'Business' ? theme.primary : '#FFF'} size={18} />
                        <Text style={[styles.tabText, { fontSize: fontSize - 2 }, activeTab === 'Business' ? { color: theme.primary } : { color: '#FFF' }]}>Toolkit</Text>
                    </TouchableOpacity>
                </View>
            </AppHeader>

            <ScrollView
                style={styles.mainScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {activeTab === 'Business' ? (
                    <View style={styles.tabContent}>
                        <Text style={[styles.sectionLabel, { fontSize: Math.max(10, fontSize - 4), color: theme.textSecondary }]}>OPERATIONS & ANALYTICS</Text>
                        <View style={styles.toolGrid}>
                            <GridTool
                                icon={TrendingUp} title={t.income}
                                value={stats ? `₹${(stats.fees.today_collected / 1000).toFixed(1)}k` : '₹0k'}
                                color="#3B82F6" bg="#EFF6FF" onPress={() => navigation.navigate('IncomeDetails', { period: 'month' })}
                            />
                            <GridTool
                                icon={FileText} title={t.reports} value="Reports"
                                color="#8B5CF6" bg="#F5F3FF" onPress={() => navigation.navigate('Reports')}
                            />
                            <GridTool
                                icon={Wrench} title="Maintenance" value="Issues"
                                color="#EAB308" bg="#FEF9C3" onPress={() => navigation.navigate('Maintenance')}
                            />
                        </View>
                    </View>
                ) : (
                    <View style={styles.tabContent}>
                        <Text style={[styles.sectionLabel, { fontSize: Math.max(10, fontSize - 4), color: theme.textSecondary }]}>ACCOUNT SETTINGS</Text>
                        <View style={[styles.menuCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                            <MenuItem
                                icon={Settings}
                                title="Settings"
                                subtitle="Profile Details, Password, Font Size, Dark Mode"
                                onPress={() => navigation.navigate('Settings')}
                                iconBg={isDark ? '#334155' : theme.lightBg}
                                titleColor={theme.textPrimary}
                            />
                            <View style={[styles.innerDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                            <MenuItem
                                icon={Globe}
                                title="QR Student Signup"
                                subtitle="Generate QR for self-registration"
                                onPress={() => navigation.navigate('QRSignup')}
                                iconBg={isDark ? '#334155' : theme.lightBg}
                                titleColor={theme.textPrimary}
                            />
                            <View style={[styles.innerDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                            <MenuItem
                                icon={LogOut}
                                title={t.signOut}
                                subtitle="Log out of your account"
                                onPress={handleLogout}
                                iconBg={isDark ? '#451A1A' : '#FEF2F2'}
                                titleColor="#EF4444"
                            />
                        </View>
                    </View>
                )}

                <Text style={[styles.footerVersion, { color: theme.textSecondary }]}>{t.version}</Text>
                <View style={styles.bottomSpace} />
            </ScrollView>
        </View>
    );
};

export default ProfileScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
    profileBrief: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    avatarWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', padding: 4 },
    avatarMain: { flex: 1, borderRadius: 40, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#10B981', borderRadius: 12, padding: 4, borderWidth: 2, borderColor: '#FFF' },
    nameHeader: { marginLeft: 16 },
    ownerName: { fontWeight: '900', color: '#FFF' },
    hostelSub: { color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.1)', padding: 4, borderRadius: 16 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 },
    activeTab: { backgroundColor: '#FFF' },
    tabText: { fontWeight: '800' },

    mainScroll: { flex: 1, marginTop: -15 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
    tabContent: {},
    sectionLabel: { fontWeight: '800', marginBottom: 12, marginLeft: 4, letterSpacing: 1 },

    // Toolkit Grid
    toolGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    toolCard: { width: (width - 44) / 2, borderRadius: 24, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    toolIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    toolText: { marginLeft: 12, flex: 1 },
    toolLabel: { fontWeight: '700' },
    toolValue: { fontWeight: '900', marginTop: 2 },

    menuCard: { borderRadius: 24, marginBottom: 20, paddingVertical: 4, elevation: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    menuIconContainer: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    menuText: { flex: 1 },
    menuTitle: { fontWeight: '700' },
    menuSubtitle: { marginTop: 2 },
    innerDivider: { height: 1, marginLeft: 65 },

    footerVersion: { textAlign: 'center', fontSize: 11 },
    bottomSpace: { height: 120 },
});

