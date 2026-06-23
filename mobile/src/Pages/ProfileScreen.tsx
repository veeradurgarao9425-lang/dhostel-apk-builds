import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const ProfileScreen = ({ navigation }: any) => {
    const { signOut, user, hostels, cycleHostels } = useAuth();
    const { theme, isDark } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [stats, setStats] = useState<any>(null);
    const [switching, setSwitching] = useState(false);


    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/owner-stats');
            if (response.data.success) setStats(response.data.data);
        } catch {}
    };

    useFocusEffect(React.useCallback(() => { fetchStats(); }, []));

    const handleLogout = async () => {
        Alert.alert(t('profile.signOutTitle'), t('profile.signOutMessage'), [
            { text: t('profile.cancel'), style: 'cancel' },
            {
                text: t('profile.signOut'), style: 'destructive', onPress: async () => {
                    await signOut();
                    navigation.replace('Login');
                }
            }
        ]);
    };


    const handleSwitchHostel = async () => {
        if (!hostels || hostels.length < 2) {
            Alert.alert(t('profile.singleHostel'), t('profile.singleHostelMsg'));
            return;
        }
        setSwitching(true);
        try {
            const newName = await cycleHostels();
            if (newName) {
                Alert.alert(t('profile.hostelSwitched'), t('profile.hostelSwitchedMsg', { name: newName }));
            }
        } catch {
            Alert.alert(t('common.error'), t('profile.switchError'));
        } finally {
            setSwitching(false);
        }
    };


    const initials = (user?.full_name || user?.email || 'U')
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const roleLabel = user?.role_id === 1 ? t('profile.administrator') : t('profile.hostelOwner');


    return (
        <View style={[styles.root, { backgroundColor: isDark ? '#0F172A' : '#F0F4FF' }]}>
            <StatusBar barStyle="light-content" />

            {/* ── HERO HEADER ── */}
            <LinearGradient
                colors={['#5B21B6', '#7C3AED', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.hero, { paddingTop: insets.top + 16 }]}
            >
                {/* Back button */}
                {navigation.canGoBack() && (
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={22} color="#FFF" />
                    </TouchableOpacity>
                )}

                {/* Avatar */}
                <View style={styles.avatarRing}>
                    <LinearGradient colors={['#FFFFFF', '#E9D5FF']} style={styles.avatarInner}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </LinearGradient>
                </View>

                <Text style={styles.heroName}>{user?.full_name || t('profile.hostelOwner')}</Text>
                <View style={styles.rolePill}>
                    <Ionicons name={user?.role_id === 1 ? 'shield-checkmark' : 'business'} size={12} color="#7C3AED" />
                    <Text style={styles.roleText}>{roleLabel}</Text>
                </View>
                <Text style={styles.heroHostel}>{user?.hostel_name || t('profile.noActiveHostel')}</Text>

            </LinearGradient>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── STATS ROW ── */}
                <View style={styles.statsRow}>
                    {[
                        { icon: 'business-outline', label: t('profile.hostels'), value: hostels?.length ?? 0, color: '#7C3AED', bg: '#EDE9FE' },
                        { icon: 'bed-outline', label: t('profile.occupied'), value: stats?.occupiedBeds ?? 0, color: '#059669', bg: '#DCFCE7' },
                        { icon: 'people-outline', label: t('profile.tenants'), value: stats?.tenantsCount ?? stats?.occupiedBeds ?? 0, color: '#0284C7', bg: '#E0F2FE' },
                    ].map((s, i) => (

                        <View key={i} style={[styles.statCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                            <View style={[styles.statIconBox, { backgroundColor: s.bg }]}>
                                <Ionicons name={s.icon as any} size={18} color={s.color} />
                            </View>
                            <Text style={[styles.statValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>{s.value}</Text>
                            <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* ── ACCOUNT INFO ── */}
                <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('profile.accountDetails')}</Text>
                <View style={[styles.infoCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                    {[
                        { icon: 'person-outline', label: t('profile.fullName'), value: user?.full_name || t('profile.notSet'), color: '#7C3AED', bg: '#EDE9FE' },
                        { icon: 'mail-outline', label: t('profile.email'), value: user?.email || t('profile.notSet'), color: '#0284C7', bg: '#E0F2FE' },
                        { icon: 'call-outline', label: t('profile.phone'), value: user?.phone || t('profile.notProvided'), color: '#059669', bg: '#DCFCE7' },
                        { icon: 'home-outline', label: t('profile.activeHostel'), value: user?.hostel_name || t('profile.none'), color: '#D97706', bg: '#FEF3C7' },
                    ].map((item, i, arr) => (


                        <View key={i}>
                            <View style={styles.infoRow}>
                                <View style={[styles.infoIcon, { backgroundColor: item.bg }]}>
                                    <Ionicons name={item.icon as any} size={16} color={item.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.infoLabel, { color: isDark ? '#94A3B8' : '#94A3B8' }]}>{item.label}</Text>
                                    <Text style={[styles.infoValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]} numberOfLines={1}>{item.value}</Text>
                                </View>
                            </View>
                            {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />}
                        </View>
                    ))}
                </View>

                {/* ── HOSTEL SWITCH (only if multiple) ── */}
                {hostels && hostels.length > 1 && (
                    <>
                        <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('profile.hostelSection')}</Text>
                        <TouchableOpacity
                            style={[styles.switchCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                            onPress={handleSwitchHostel}
                            disabled={switching}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.infoIcon, { backgroundColor: '#F0FDF4' }]}>
                                <Ionicons name="swap-horizontal-outline" size={18} color="#059669" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.switchTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>{t('profile.switchActiveHostel')}</Text>
                                <Text style={[styles.switchSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                                    {switching ? t('profile.switching') : t('profile.hostelsAvailable', { count: hostels.length })}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#CBD5E1'} />
                        </TouchableOpacity>
                    </>
                )}


                {/* ── MENU ── */}
                <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('profile.settingsSupport')}</Text>
                <View style={[styles.menuCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                    {[
                        { icon: 'settings-outline', label: t('profile.settings'), sub: t('profile.settingsSub'), color: '#7C3AED', bg: '#EDE9FE', onPress: () => navigation.navigate('Settings') },
                        { icon: 'business-outline', label: t('profile.manageHostels'), sub: t('profile.manageHostelsSub'), color: '#0284C7', bg: '#E0F2FE', onPress: () => navigation.navigate('Hostels') },
                        { icon: 'help-circle-outline', label: t('profile.helpSupport'), sub: t('profile.helpSupportSub'), color: '#D97706', bg: '#FEF3C7', onPress: () => Alert.alert(t('profile.helpSupport'), '📧 support@dhostel.com
📞 +91 98765 43210

Available 24/7') },
                    ].map((item, i, arr) => (

                        <View key={i}>
                            <TouchableOpacity style={styles.menuRow} onPress={item.onPress} activeOpacity={0.7}>
                                <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.menuTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>{item.label}</Text>
                                    <Text style={[styles.menuSub, { color: isDark ? '#94A3B8' : '#94A3B8' }]}>{item.sub}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={isDark ? '#475569' : '#CBD5E1'} />
                            </TouchableOpacity>
                            {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9', marginLeft: 62 }]} />}
                        </View>
                    ))}
                </View>

                {/* ── SIGN OUT ── */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                    <View style={styles.logoutIconBox}>
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.logoutText}>{t('profile.signOut')}</Text>
                </TouchableOpacity>

                <Text style={[styles.version, { color: isDark ? '#334155' : '#CBD5E1' }]}>{t('profile.version')}</Text>

            </ScrollView>
        </View>
    );
};

export default ProfileScreen;

const styles = StyleSheet.create({
    root: { flex: 1 },

    // Hero
    hero: {
        alignItems: 'center',
        paddingBottom: 30,
        paddingHorizontal: 20,
    },
    backBtn: {
        position: 'absolute',
        left: 16,
        top: 44,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarRing: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.3)',
        padding: 3,
        marginBottom: 12,
        marginTop: 10,
    },
    avatarInner: {
        flex: 1,
        borderRadius: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#7C3AED',
    },
    heroName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    rolePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 10,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#7C3AED',
    },
    heroHostel: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: 0.3,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    statIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },

    // Section label
    sectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 10,
        marginLeft: 4,
        textTransform: 'uppercase',
    },

    // Info card
    infoCard: {
        borderRadius: 20,
        padding: 4,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginHorizontal: 14,
    },

    // Switch card
    switchCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    switchTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    switchSub: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },

    // Menu card
    menuCard: {
        borderRadius: 20,
        padding: 4,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    menuIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    menuSub: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },

    // Logout
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    logoutIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FFE4E6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#EF4444',
    },

    // Footer
    version: {
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 10,
    },
});
