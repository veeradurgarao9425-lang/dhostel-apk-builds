import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Alert, ActivityIndicator } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Card } from '../components/Card';
import { Bell, Shield, Moon, Globe, ChevronRight, Type, User, Mail, Building, Lock, Palette } from 'lucide-react-native';
import { useTheme, themes, ThemeId } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { LanguageSelector } from '../components/LanguageSelector';

export const SettingsScreen = ({ navigation }: any) => {
    const { theme, themeId, setThemeId, isDark, toggleTheme, fontSize, setFontSize } = useTheme();
    const { user } = useAuth();
    const { t, i18n } = useTranslation();

    // Local state for toggles
    const [notifications, setNotifications] = useState(true);

    // Profile Details state
    const [name, setName] = useState(user?.full_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [hostelName, setHostelName] = useState(user?.hostel_name || '');
    const [profileSaving, setProfileSaving] = useState(false);

    // Change Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    const SettingRow = ({ icon, label, value, type = 'chevron', onPress, rightElement }: any) => (
        <TouchableOpacity
            style={styles.row}
            onPress={onPress}
            disabled={type === 'switch' && !onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#334155' : theme.lightBg }]}>
                {icon}
            </View>
            <Text style={[styles.label, { fontSize: fontSize, color: theme.textPrimary }]}>{label}</Text>

            {type === 'chevron' && (
                <View style={styles.rightSide}>
                    {value && <Text style={[styles.value, { fontSize: fontSize - 1, color: theme.textSecondary }]}>{value}</Text>}
                    <ChevronRight size={20} color={isDark ? '#475569' : '#CBD5E1'} />
                </View>
            )}

            {type === 'switch' && (
                <Switch
                    value={value}
                    onValueChange={onPress}
                    trackColor={{ false: '#E2E8F0', true: theme.primary + '80' }}
                    thumbColor={value ? theme.primary : '#F8FAFC'}
                />
            )}

            {type === 'custom' && rightElement}
        </TouchableOpacity>
    );

    const handleSaveProfile = async () => {
        try {
            setProfileSaving(true);
            const response = await api.put('/users/profile', {
                full_name: name,
            });
            if (response.data.success) {
                Alert.alert(t('common.success'), t('settings.successSave'));
            } else {
                Alert.alert(t('common.error'), response.data.error || t('common.error'));
            }
        } catch (error: any) {
            console.error('Update profile error:', error);
            Alert.alert(t('common.error'), error.response?.data?.error || t('common.error'));
        } finally {
            setProfileSaving(false);
        }
    };


    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert(t('common.error'), t('settings.passwordRequired'));
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert(t('common.error'), t('settings.passwordMismatch'));
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert(t('common.error'), t('settings.passwordTooShort'));
            return;
        }
        try {
            setPasswordLoading(true);
            const response = await api.post('/auth/change-password', {
                currentPassword,
                newPassword,
            });
            if (response.data.success) {
                Alert.alert(t('common.success'), t('settings.passwordChanged'));
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                Alert.alert(t('common.error'), response.data.error || t('common.error'));
            }
        } catch (error: any) {
            console.error('Change password error:', error);
            Alert.alert(t('common.error'), error.response?.data?.error || t('common.error'));
        } finally {
            setPasswordLoading(false);
        }
    };


    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <AppHeader title={t('settings.title')} />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── PROFILE DETAILS SECTION ── */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('settings.profileDetails')}</Text>

                <Card style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <View style={styles.inputRow}>
                        <View style={styles.inputIcon}>
                            <User size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                        </View>
                        <TextInput
                            style={[styles.input, { fontSize, color: theme.textPrimary }]}
                            value={name}
                            onChangeText={setName}
                            placeholder={t('settings.fullName')}
                            placeholderTextColor={isDark ? '#64748B' : '#A0AEC0'}
                        />

                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                    <View style={styles.inputRow}>
                        <View style={styles.inputIcon}>
                            <Mail size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                        </View>
                        <TextInput
                            style={[styles.input, { fontSize, color: isDark ? '#64748B' : '#94A3B8' }]}
                            value={email}
                            onChangeText={setEmail}
                            placeholder={t('settings.emailAddress')}
                            placeholderTextColor={isDark ? '#64748B' : '#A0AEC0'}
                            editable={false}
                        />

                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                    <View style={styles.inputRow}>
                        <View style={styles.inputIcon}>
                            <Building size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                        </View>
                        <TextInput
                            style={[styles.input, { fontSize, color: isDark ? '#64748B' : '#94A3B8' }]}
                            value={hostelName}
                            onChangeText={setHostelName}
                            placeholder={t('settings.hostelName')}
                            placeholderTextColor={isDark ? '#64748B' : '#A0AEC0'}
                            editable={false}
                        />

                    </View>
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                        onPress={handleSaveProfile}
                        disabled={profileSaving}
                    >
                        {profileSaving ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.saveBtnText}>{t('settings.saveChanges')}</Text>
                        )}

                    </TouchableOpacity>
                </Card>

                {/* ── SECURITY / PASSWORD SECTION ── */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('settings.security')}</Text>

                <Card style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <View style={styles.inputRow}>
                        <View style={styles.inputIcon}>
                            <Lock size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                        </View>
                        <TextInput
                            style={[styles.input, { fontSize, color: theme.textPrimary }]}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder={t('settings.currentPassword')}
                            secureTextEntry
                            placeholderTextColor={isDark ? '#64748B' : '#A0AEC0'}
                        />

                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                    <View style={styles.inputRow}>
                        <View style={styles.inputIcon}>
                            <Lock size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                        </View>
                        <TextInput
                            style={[styles.input, { fontSize, color: theme.textPrimary }]}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder={t('settings.newPassword')}
                            secureTextEntry
                            placeholderTextColor={isDark ? '#64748B' : '#A0AEC0'}
                        />

                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                    <View style={styles.inputRow}>
                        <View style={styles.inputIcon}>
                            <Lock size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                        </View>
                        <TextInput
                            style={[styles.input, { fontSize, color: theme.textPrimary }]}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder={t('settings.confirmNewPassword')}
                            secureTextEntry
                            placeholderTextColor={isDark ? '#64748B' : '#A0AEC0'}
                        />

                    </View>
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                        onPress={handleChangePassword}
                        disabled={passwordLoading}
                    >
                        {passwordLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.saveBtnText}>{t('settings.updatePassword')}</Text>
                        )}

                    </TouchableOpacity>
                </Card>

                {/* ── APPEARANCE SECTION ── */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('settings.appearance')}</Text>

                <Card style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SettingRow
                        icon={<Palette size={20} color={theme.primary} />}
                        label={t('settings.themeColor')}

                        type="custom"
                        rightElement={
                            <View style={styles.themeGrid}>
                                {Object.values(themes).map((tItem: any) => (
                                    <TouchableOpacity
                                        key={tItem.id}
                                        style={[
                                            styles.themeCircle,
                                            { backgroundColor: tItem.primary },
                                            themeId === tItem.id && { borderWidth: 2, borderColor: isDark ? '#FFF' : '#1E293B' }
                                        ]}
                                        onPress={() => setThemeId(tItem.id)}
                                        activeOpacity={0.7}
                                    />
                                ))}
                            </View>
                        }
                    />
                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                    <SettingRow
                        icon={<Type size={20} color={theme.primary} />}
                        label={t('settings.fontSize')}

                        type="custom"
                        rightElement={
                            <View style={[styles.fontControls, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                <TouchableOpacity
                                    style={styles.fontBtn}
                                    onPress={() => setFontSize(Math.max(10, fontSize - 1))}
                                >
                                    <Text style={[styles.fontBtnText, { color: theme.textSecondary }]}>A-</Text>
                                </TouchableOpacity>
                                <Text style={[styles.fontValue, { color: theme.textPrimary }]}>{fontSize}</Text>
                                <TouchableOpacity
                                    style={styles.fontBtn}
                                    onPress={() => setFontSize(Math.min(24, fontSize + 1))}
                                >
                                    <Text style={[styles.fontBtnText, { color: theme.textSecondary }]}>A+</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                    <SettingRow
                        icon={<Moon size={20} color={theme.primary} />}
                        label={t('settings.darkMode')}

                        type="switch"
                        value={isDark}
                        onPress={toggleTheme}
                    />
                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                    <LanguageSelector
                        trigger={(open) => (
                            <SettingRow
                                icon={<Globe size={20} color={theme.primary} />}
                                label={t('profile.language')}
                                value={i18n.language?.toUpperCase() || 'EN'}
                                onPress={open}
                            />
                        )}
                    />
                </Card>

                {/* ── PREFERENCES SECTION ── */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('settings.appPreferences')}</Text>

                <Card style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SettingRow
                        icon={<Bell size={20} color={theme.primary} />}
                        label={t('settings.pushNotifications')}

                        type="switch"
                        value={notifications}
                        onPress={() => setNotifications(!notifications)}
                    />
                </Card>

                {/* ── SECURITY & UPDATES SECTION ── */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('settings.securityUpdates')}</Text>

                <Card style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SettingRow
                        icon={<Shield size={20} color={theme.primary} />}
                        label={t('settings.privacyPolicy')}

                    />
                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                    <TouchableOpacity style={styles.row}>
                        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#334155' : theme.lightBg }]}>
                            <Bell size={20} color={theme.primary} />
                        </View>
                        <Text style={[styles.label, { fontSize: fontSize, color: theme.textPrimary }]}>{t('settings.checkUpdates')}</Text>

                        <Text style={[styles.version, { color: theme.textSecondary }]}>v1.0.0</Text>
                    </TouchableOpacity>
                </Card>

                <View style={styles.bottomSpacing} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: 20 },
    sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 10 },
    card: { padding: 0, marginBottom: 24, overflow: 'hidden', borderRadius: 16, elevation: 2 },
    row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    iconContainer: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    label: { fontWeight: '600', flex: 1 },
    rightSide: { flexDirection: 'row', alignItems: 'center' },
    value: { marginRight: 8 },
    version: { fontSize: 12 },
    divider: { height: 1, marginLeft: 64 },
    bottomSpacing: { height: 40 },

    // Font Controls
    fontControls: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 2 },
    fontBtn: { paddingHorizontal: 10, paddingVertical: 4 },
    fontBtnText: { fontWeight: '700' },
    fontValue: { paddingHorizontal: 8, fontWeight: '600' },

    // Input Styles
    inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    inputIcon: { width: 30, alignItems: 'center' },
    input: { flex: 1, marginLeft: 10, fontWeight: '500' },
    saveBtn: { margin: 16, padding: 12, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: '700' },

    // Theme Color Picker Grid
    themeGrid: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    themeCircle: { width: 22, height: 22, borderRadius: 11 },
});

export default SettingsScreen;
