import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, ActivityIndicator, Image } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppHeader } from '../components/AppHeader';
import { Card } from '../components/Card';
import { Bell, Shield, ChevronRight, ChevronDown, Lock, Eye, EyeOff, MessageSquare, RefreshCw, CheckCircle2, Smartphone, Copy, QrCode, KeyRound, Fingerprint } from 'lucide-react-native';
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

    // WhatsApp Automation state
    const [waStatus, setWaStatus] = useState<{ isReady: boolean; isInitializing: boolean; qrCodeDataUrl: string | null; pairingCode?: string | null } | null>(null);
    const [waLoading, setWaLoading] = useState(false);
    const [showWaDetails, setShowWaDetails] = useState(false);

    // WhatsApp 8-Digit Pairing Code state for Single Phone Linking
    const [linkMode, setLinkMode] = useState<'code' | 'qr'>('code');
    const [ownerPhone, setOwnerPhone] = useState('');
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [codeLoading, setCodeLoading] = useState(false);

    const handleGeneratePairingCode = async () => {
        if (!ownerPhone.trim()) {
            showError('Please enter your WhatsApp mobile number');
            return;
        }
        try {
            setCodeLoading(true);
            const res = await api.post('/monthly-fees/whatsapp-pairing-code', { phoneNumber: ownerPhone.trim() });
            if (res.data?.success && res.data.data?.pairingCode) {
                setPairingCode(res.data.data.pairingCode);
                showSuccess('8-Digit Pairing Code Generated!');
            } else {
                showError(res.data?.error || 'Failed to generate pairing code');
            }
        } catch (err) {
            showApiError(err, 'Failed to generate pairing code');
        } finally {
            setCodeLoading(false);
        }
    };

    const handleCopyCode = async () => {
        if (!pairingCode) return;
        const cleanCode = pairingCode.replace(/[^A-Z0-9]/gi, '');
        await Clipboard.setStringAsync(cleanCode);
        showSuccess('Pairing code copied to clipboard!');
    };

    const fetchWaStatus = async (isSilent = false) => {
        try {
            if (!isSilent) setWaLoading(true);
            const res = await api.get('/monthly-fees/whatsapp-status');
            if (res.data.success) {
                const data = res.data.data;
                setWaStatus(data);
                return data;
            }
        } catch (err) {
            console.error('WhatsApp status fetch error:', err);
        } finally {
            if (!isSilent) setWaLoading(false);
        }
        return null;
    };

    const handleRestartWa = async () => {
        try {
            setWaLoading(true);
            setWaStatus(null);
            await api.post('/monthly-fees/whatsapp-restart');
            let attempts = 0;
            const poll = setInterval(async () => {
                attempts++;
                const status = await fetchWaStatus(true);
                if (status?.qrCodeDataUrl || status?.isReady || attempts >= 15) {
                    clearInterval(poll);
                    setWaLoading(false);
                }
            }, 1500);
        } catch (err) {
            console.error('WhatsApp restart error:', err);
            setWaLoading(false);
        }
    };

    const renderWaContent = () => {
        if (waLoading || codeLoading) {
            return (
                <View style={{ alignItems: 'center', gap: 8, paddingVertical: 16 }}>
                    <ActivityIndicator size="large" color="#25D366" />
                    <Text style={{ fontSize: 13, color: theme.textPrimary, fontWeight: '700', textAlign: 'center' }}>
                        Connecting to WhatsApp Service...
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
                        Please wait a moment while we set up your linkage...
                    </Text>
                </View>
            );
        }
        if (waStatus?.isReady) {
            return (
                <View style={{ alignItems: 'center', gap: 8, paddingVertical: 10 }}>
                    <CheckCircle2 size={36} color="#16A34A" />
                    <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#F8FAFC' : '#1E293B', textAlign: 'center' }}>
                        WhatsApp Bot is Linked & Active! 🎉
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', lineHeight: 18 }}>
                        You can now send direct 1-click background reminders to all unpaid students without opening WhatsApp app manually.
                    </Text>
                </View>
            );
        }

        return (
            <View style={{ width: '100%', alignItems: 'center' }}>
                {/* Mode Selector Tabs */}
                <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderRadius: 12, padding: 3, marginBottom: 14, width: '100%' }}>
                    <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: linkMode === 'code' ? '#25D366' : 'transparent' }}
                        onPress={() => setLinkMode('code')}
                        activeOpacity={0.8}
                    >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: linkMode === 'code' ? '#FFF' : (isDark ? '#94A3B8' : '#64748B') }}>
                            🔑 8-Digit Code (Same Phone)
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: linkMode === 'qr' ? '#25D366' : 'transparent' }}
                        onPress={() => setLinkMode('qr')}
                        activeOpacity={0.8}
                    >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: linkMode === 'qr' ? '#FFF' : (isDark ? '#94A3B8' : '#64748B') }}>
                            📷 QR Code (Scan)
                        </Text>
                    </TouchableOpacity>
                </View>

                {linkMode === 'code' ? (
                    <View style={{ width: '100%', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F8FAFC' : '#1E293B', textAlign: 'center' }}>
                            Single Phone Linking (No Camera Needed)
                        </Text>
                        <View style={{ width: '100%' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 }}>
                                Your WhatsApp Mobile Number
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                    borderWidth: 1.5,
                                    borderColor: isDark ? '#334155' : '#E2E8F0',
                                    borderRadius: 12,
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    fontSize: 14,
                                    color: theme.textPrimary,
                                }}
                                value={ownerPhone}
                                onChangeText={setOwnerPhone}
                                keyboardType="phone-pad"
                                placeholder="Enter 10-digit WhatsApp phone number"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleGeneratePairingCode}
                            disabled={codeLoading}
                            activeOpacity={0.85}
                            style={{
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                                paddingVertical: 12, paddingHorizontal: 20,
                                backgroundColor: '#25D366', borderRadius: 12, width: '100%',
                                shadowColor: '#25D366', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4
                            }}
                        >
                            <KeyRound size={18} color="#FFF" />
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>
                                {codeLoading ? 'Generating Code...' : 'Get 8-Digit Pairing Code'}
                            </Text>
                        </TouchableOpacity>

                        {pairingCode && (
                            <View style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC', padding: 14, borderRadius: 16, width: '100%', alignItems: 'center', borderWidth: 1.5, borderColor: '#25D366', marginTop: 4 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 }}>
                                    YOUR WHATSAPP PAIRING CODE
                                </Text>
                                <Text style={{ fontSize: 28, fontWeight: '900', color: '#25D366', letterSpacing: 4, marginVertical: 6 }}>
                                    {pairingCode}
                                </Text>
                                <TouchableOpacity
                                    onPress={handleCopyCode}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#25D36615', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginTop: 4 }}
                                    activeOpacity={0.7}
                                >
                                    <Copy size={14} color="#25D366" />
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#25D366' }}>Copy Code</Text>
                                </TouchableOpacity>

                                <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#E2E8F0', width: '100%' }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }}>
                                        3 Easy Steps to Link:
                                    </Text>
                                    <Text style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 18 }}>
                                        1. Open WhatsApp ➔ Tap Settings ⚙️ (or 3 Dots) ➔ <Text style={{ fontWeight: '700' }}>Linked Devices</Text>.{'\n'}
                                        2. Tap <Text style={{ fontWeight: '700' }}>Link a Device</Text> ➔ Tap <Text style={{ fontWeight: '700' }}>"Link with phone number instead"</Text> at the bottom.{'\n'}
                                        3. Paste code <Text style={{ fontWeight: '800', color: '#25D366' }}>{pairingCode}</Text> and hit Submit!
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={{ width: '100%', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#F8FAFC' : '#1E293B', textAlign: 'center' }}>
                            Scan QR Code with your Hostel WhatsApp
                        </Text>
                        {waStatus?.qrCodeDataUrl ? (
                            <View style={{ backgroundColor: '#FFF', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                <Image source={{ uri: waStatus.qrCodeDataUrl }} style={{ width: 200, height: 200 }} resizeMode="contain" />
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={handleRestartWa}
                                activeOpacity={0.85}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12,
                                    paddingVertical: 12, paddingHorizontal: 20,
                                    backgroundColor: '#25D366', borderRadius: 12
                                }}
                            >
                                <QrCode size={18} color="#FFF" />
                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>
                                    {waLoading ? 'Generating QR Code...' : 'Generate Pairing QR Code'}
                                </Text>
                            </TouchableOpacity>
                        )}
                        <View style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC', padding: 12, borderRadius: 12, width: '100%' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 }}>
                                How to Link via Camera:
                            </Text>
                            <Text style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 16 }}>
                                1. Open WhatsApp on your phone.{'\n'}
                                2. Tap Settings ➔ Linked Devices ➔ Link a Device.{'\n'}
                                3. Point camera at this QR code to complete pairing.
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    useEffect(() => {
        let interval: any;
        if (showWaDetails && waStatus && !waStatus.isReady) {
            interval = setInterval(() => {
                fetchWaStatus(true);
            }, 3000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [showWaDetails, waStatus]);

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
                            {/* Current Password Field */}
                            <View style={{ marginBottom: 12 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#94A3B8' : '#475569', marginBottom: 4 }}>
                                    Current Password <Text style={{ color: '#EF4444' }}>*</Text>
                                </Text>
                                <View style={styles.inputRow}>
                                    <View style={styles.inputIcon}>
                                        <Lock size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                                    </View>
                                    <TextInput
                                        style={[styles.input, { fontSize, color: theme.textPrimary }]}
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        placeholder={t('settings.currentPassword', 'Enter current password')}
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
                            </View>

                            {/* New Password Field */}
                            <View style={{ marginBottom: 12 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#94A3B8' : '#475569', marginBottom: 4 }}>
                                    New Password <Text style={{ color: '#EF4444' }}>*</Text>
                                </Text>
                                <View style={styles.inputRow}>
                                    <View style={styles.inputIcon}>
                                        <Lock size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                                    </View>
                                    <TextInput
                                        style={[styles.input, { fontSize, color: theme.textPrimary }]}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        placeholder={t('settings.newPassword', 'Enter new password (min. 6 characters)')}
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
                            </View>

                            {/* Re-enter Password Field */}
                            <View style={{ marginBottom: 14 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#94A3B8' : '#475569', marginBottom: 4 }}>
                                    Re-enter Password <Text style={{ color: '#EF4444' }}>*</Text>
                                </Text>
                                <View style={styles.inputRow}>
                                    <View style={styles.inputIcon}>
                                        <Lock size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                                    </View>
                                    <TextInput
                                        style={[styles.input, { fontSize, color: theme.textPrimary }]}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder={t('settings.confirmNewPassword', 'Re-enter your new password')}
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
                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                    <SettingRow
                        icon={<Smartphone size={20} color={theme.primary} />}
                        label="Send Test Notification"
                        onPress={async () => {
                            try {
                                const res = await api.post('/notifications/test', { type: 'General' });
                                if (res.data?.success) {
                                    showSuccess('Firebase notification sent to your device!');
                                }
                            } catch (e: any) {
                                showError(e?.response?.data?.error || e?.message || 'Failed to send test push');
                            }
                        }}
                    />
                </Card>




                {/* ── SECURITY & UPDATES SECTION ── */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('settings.securityUpdates', 'Security & Info')}</Text>

                <Card style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SettingRow
                        icon={<MessageSquare size={20} color={theme.primary} />}
                        label="Send Feedback & Support"
                        onPress={() => navigation.navigate('Feedback')}
                    />
                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
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
                        <Text style={[styles.version, { color: theme.textSecondary }]}>v1.0.4</Text>
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
