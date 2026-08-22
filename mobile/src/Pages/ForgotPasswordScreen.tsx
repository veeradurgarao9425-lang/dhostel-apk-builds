import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function ForgotPasswordScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { showSuccess, showError } = useToast();
    
    // Steps: 'EMAIL' -> 'RESET'
    const [step, setStep] = useState<'EMAIL' | 'OTP' | 'RESET'>('EMAIL');
    
    // Form fields
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [resetToken, setResetToken] = useState<string | null>(null);

    const handleSendOTP = async () => {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            const msg = 'Please enter a valid email address';
            setErrorMsg(msg);
            showError(msg);
            return;
        }
        Keyboard.dismiss();
        setIsLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        setOtp(''); // Clear OTP input field on fresh request

        try {
            const response = await api.post('/auth/forgot-password', { email: email.trim() });
            if (response.data?.success || response.status === 200) {
                const msg = 'OTP sent successfully to your email.';
                setSuccessMsg(msg);
                showSuccess(msg);
                setStep('OTP');
            } else {
                const msg = response.data?.error || response.data?.message || 'Failed to send OTP.';
                setErrorMsg(msg);
                showError(msg);
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || 'Network error while sending OTP.';
            setErrorMsg(msg);
            showError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp.trim() || otp.trim().length !== 6) {
            const msg = 'Please enter a valid 6-digit OTP';
            setErrorMsg(msg);
            showError(msg);
            return;
        }
        Keyboard.dismiss();
        setIsLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const response = await api.post('/auth/verify-reset-otp', {
                email: email.trim(),
                otp: otp.trim()
            });

            if (response.data?.success || response.status === 200) {
                setResetToken(response.data.token);
                const msg = 'OTP verified successfully!';
                setSuccessMsg(msg);
                showSuccess(msg);
                setStep('RESET');
            } else {
                const msg = response.data?.error || 'Invalid OTP';
                setErrorMsg(msg);
                showError(msg);
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || 'Invalid OTP or verification error.';
            setErrorMsg(msg);
            showError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword.trim() || !confirmPassword.trim()) {
            const msg = 'Please enter and re-enter your new password.';
            setErrorMsg(msg);
            showError(msg);
            return;
        }
        if (newPassword !== confirmPassword) {
            const msg = 'Passwords do not match. Please re-check.';
            setErrorMsg(msg);
            showError(msg);
            return;
        }
        if (newPassword.length < 6) {
            const msg = 'Password must be at least 6 characters long.';
            setErrorMsg(msg);
            showError(msg);
            return;
        }

        Keyboard.dismiss();
        setIsLoading(true);
        setIsRedirecting(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const response = await api.post('/auth/reset-password', { 
                token: resetToken, 
                newPassword,
                confirmPassword
            });
            
            if (response.data?.success || response.status === 200) {
                const msg = 'Password reset successfully! Redirecting to login...';
                setSuccessMsg(msg);
                showSuccess(msg);
                setTimeout(() => {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    });
                }, 1000);
            } else {
                setIsRedirecting(false);
                setIsLoading(false);
                const msg = response.data?.error || response.data?.message || 'Failed to reset password.';
                setErrorMsg(msg);
                showError(msg);
            }
        } catch (err: any) {
            setIsRedirecting(false);
            setIsLoading(false);
            const msg = err.response?.data?.error || err.response?.data?.message || 'Error resetting password. Please try again.';
            setErrorMsg(msg);
            showError(msg);
        }
    };


    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#FFFFFF' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Forgot Password</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="lock-closed-outline" size={32} color="#7C3AED" />
                    </View>
                </View>

                {step === 'EMAIL' && (
                    <>
                        <Text style={styles.title}>Reset Your Password</Text>
                        <Text style={styles.subtitle}>Enter your registered email address and we will send you an OTP to reset your password.</Text>
                        
                        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
                        {successMsg && <Text style={styles.successText}>{successMsg}</Text>}

                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor="#94A3B8"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={(t) => { setEmail(t); setErrorMsg(null); }}
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.submitBtn, isLoading && { opacity: 0.8 }]} 
                            onPress={handleSendOTP} 
                            disabled={isLoading}
                            activeOpacity={0.85}
                        >
                            <LinearGradient colors={['#7C3AED', '#5F2EEA']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {isLoading ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                        <Text style={styles.submitTxt}>Sending OTP...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.submitTxt}>Send OTP</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </>
                )}

                {step === 'OTP' && (
                    <>
                        <Text style={styles.title}>Enter OTP</Text>
                        <Text style={styles.subtitle}>
                            Please enter the 6-digit code sent to {email}
                        </Text>
                        
                        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
                        {successMsg && <Text style={styles.successText}>{successMsg}</Text>}

                        <View style={styles.inputContainer}>
                            <Ionicons name="keypad-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 6-digit OTP"
                                placeholderTextColor="#94A3B8"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={otp}
                                onChangeText={(t) => { setOtp(t); setErrorMsg(null); }}
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.submitBtn, isLoading && { opacity: 0.8 }]} 
                            onPress={handleVerifyOTP} 
                            disabled={isLoading}
                            activeOpacity={0.85}
                        >
                            <LinearGradient colors={['#7C3AED', '#5F2EEA']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {isLoading ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                        <Text style={styles.submitTxt}>Verifying Code...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.submitTxt}>Verify Code</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setStep('EMAIL')} disabled={isLoading}>
                            <Text style={styles.resendTxt}>Didn't receive OTP? Try again</Text>
                        </TouchableOpacity>
                    </>
                )}

                {step === 'RESET' && (
                    <>
                        <Text style={styles.title}>New Password</Text>
                        <Text style={styles.subtitle}>
                            Please enter and confirm your new password.
                        </Text>
                        
                        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
                        {successMsg && <Text style={styles.successText}>{successMsg}</Text>}

                        <View style={{ marginBottom: 14 }}>
                            <Text style={styles.inputLabel}>
                                New Password <Text style={{ color: '#EF4444' }}>*</Text>
                            </Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter new password (min. 6 characters)"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry={!showNewPassword}
                                    value={newPassword}
                                    onChangeText={(t) => { setNewPassword(t); setErrorMsg(null); }}
                                />
                                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: 6 }}>
                                    <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={{ marginBottom: 14 }}>
                            <Text style={styles.inputLabel}>
                                Re-enter Password <Text style={{ color: '#EF4444' }}>*</Text>
                            </Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Re-enter your new password"
                                    placeholderTextColor="#94A3B8"
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={(t) => { setConfirmPassword(t); setErrorMsg(null); }}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 6 }}>
                                    <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[styles.submitBtn, isLoading && { opacity: 0.8 }]} 
                            onPress={handleResetPassword} 
                            disabled={isLoading}
                            activeOpacity={0.85}
                        >
                            <LinearGradient colors={['#7C3AED', '#5F2EEA']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {isLoading ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                        <Text style={styles.submitTxt}>Saving Password...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.submitTxt}>Save & Login</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setStep('OTP')} disabled={isLoading}>
                            <Text style={styles.resendTxt}>Back to OTP code</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Full-Screen Loading Overlay */}
            {isRedirecting && (
                <View style={styles.redirectOverlay}>
                    <View style={styles.redirectCard}>
                        <ActivityIndicator size="large" color="#7C3AED" />
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 24,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#F3EEFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
        width: '100%',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#1E293B',
        fontWeight: '500',
    },
    submitBtn: {
        width: '100%',
        height: 56,
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 8,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitTxt: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    resendTxt: {
        color: '#7C3AED',
        fontSize: 14,
        fontWeight: '600',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 16,
        textAlign: 'center',
    },
    successText: {
        color: '#10B981',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 16,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 6,
    },
    redirectOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
        elevation: 999,
        padding: 24,
    },
    redirectCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 10,
    },
});
