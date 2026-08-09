import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, ActivityIndicator } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Card } from '../components/Card';
import { Bell, Shield, ChevronRight, ChevronDown, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

export const SettingsScreen = ({ navigation }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();
    const { showError, showSuccess, showApiError } = useToast();

    // Local state for toggles
    const [notifications, setNotifications] = useState(true);

    // Change Password visibility toggle (instead of modal)
    const [showPasswordFields, setShowPasswordFields] = useState(false);

    // Change Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Show/hide password states
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showError(t('settings.passwordRequired', 'Please fill in all fields'));
            return;
        }
        if (newPassword !== confirmPassword) {
            showError(t('settings.passwordMismatch', 'Passwords do not match'));
            return;
        }
        if (newPassword.length < 6) {
            showError(t('settings.passwordTooShort', 'Password must be at least 6 characters'));
            return;
        }
        try {
            setPasswordLoading(true);
            const response = await api.post('/auth/change-password', {
                currentPassword,
                newPassword,
            });
            if (response.data.success) {
                showSuccess(t('settings.passwordChanged', 'Password updated successfully'));
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setShowPasswordFields(false);
            } else {
                showError(response.data.error || t('common.error', 'Error updating password'));
            }
        } catch (error: any) {
            console.error('Change password error:', error);
            showApiError(error, 'Failed to update password');
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <AppHeader title={t('settings.title', 'Settings')} />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── SECURITY SECTION ── */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('settings.security', 'Security')}</Text>

                <Card style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SettingRow
                        icon={<Lock size={20} color={theme.primary} />}
                        label={t('settings.changePasswordTitle', 'Change Password')}
                        type="custom"
                        rightElement={
                            showPasswordFields ? (
                                <ChevronDown size={20} color={isDark ? '#475569' : '#CBD5E1'} />
                            ) : (
                                <ChevronRight size={20} color={isDark ? '#475569' : '#CBD5E1'} />
                            )
                        }
                        onPress={() => setShowPasswordFields(!showPasswordFields)}
                    />

                    {showPasswordFields && (
                        <View style={[styles.passwordForm, { borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <View style={styles.inputRow}>
                                <View style={styles.inputIcon}>
                                    <Lock size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                                </View>
                                <TextInput
                                    style={[styles.input, { fontSize, color: theme.textPrimary }]}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    placeholder={t('settings.currentPassword', 'Current Password')}
                                    secureTextEntry={!showCurrentPassword}
                                    placeholderTextColor={isDark ? '#64748B' : '#A0AEC0'}
                                    editable={!passwordLoading}
                                />
                                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={{ padding: 4 }}>
                                    {showCurrentPassword ? (
                                        <EyeOff size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                                    ) : (
                                        <Eye size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                                    )}
                                </TouchableOpacity>
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
                                    placeholder={t('settings.newPassword', 'New Password')}
                                    secureTextEntry={!showNewPassword}
                                    placeholderTextColor={isDark ? '#64748B' : '#A0AEC0'}
                                    editable={!passwordLoading}
                                />
                                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: 4 }}>
                                    {showNewPassword ? (
                                        <EyeOff size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                                    ) : (
                                        <Eye size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                                    )}
                                </TouchableOpacity>
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
                                    placeholder={t('settings.confirmNewPassword', 'Confirm New Password')}
                                    secureTextEntry={!showConfirmPassword}
                                    placeholderTextColor={isDark ? '#64748B' : '#A0AEC0'}
                                    editable={!passwordLoading}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                                    {showConfirmPassword ? (
                                        <EyeOff size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                                    ) : (
                                        <Eye size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                                    )}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                                onPress={handleChangePassword}
                                disabled={passwordLoading}
                            >
                                {passwordLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.saveBtnText}>{t('settings.updatePassword', 'Update Password')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </Card>

                {/* ── PREFERENCES SECTION ── */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('settings.appPreferences', 'Preferences')}</Text>

                <Card style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SettingRow
                        icon={<Bell size={20} color={theme.primary} />}
                        label={t('settings.pushNotifications', 'Push Notifications')}
                        type="switch"
                        value={notifications}
                        onPress={() => setNotifications(!notifications)}
                    />
                </Card>

                {/* ── SECURITY & UPDATES SECTION ── */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('settings.securityUpdates', 'Security & Info')}</Text>

                <Card style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SettingRow
                        icon={<Shield size={20} color={theme.primary} />}
                        label={t('settings.privacyPolicy', 'Privacy Policy')}
                        onPress={() => navigation.navigate('PrivacyPolicy')}
                    />
                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                    <TouchableOpacity style={styles.row}>
                        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#334155' : theme.lightBg }]}>
                            <Bell size={20} color={theme.primary} />
                        </View>
                        <Text style={[styles.label, { fontSize: fontSize, color: theme.textPrimary }]}>{t('settings.checkUpdates', 'Check for Updates')}</Text>
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

    // Password Form styling
    passwordForm: {
        paddingVertical: 12,
    },
    inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    inputIcon: { width: 30, alignItems: 'center' },
    input: { flex: 1, marginLeft: 10, fontWeight: '500' },
    saveBtn: { margin: 16, padding: 12, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: '700' },
});

export default SettingsScreen;
