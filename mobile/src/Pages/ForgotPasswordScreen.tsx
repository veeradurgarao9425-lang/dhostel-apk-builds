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
import api from '../services/api';

export default function ForgotPasswordScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    
    // Steps: 'EMAIL' -> 'RESET'
    const [step, setStep] = useState<'EMAIL' | 'OTP' | 'RESET'>('EMAIL');
    
    // Form fields
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [resetToken, setResetToken] = useState<string | null>(null);

    const handleSendOTP = async () => {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setErrorMsg('Please enter a valid email address');
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
                setSuccessMsg('OTP sent successfully to your email.');
                setStep('OTP');
            } else {
                setErrorMsg(response.data?.error || response.data?.message || 'Failed to send OTP.');
            }
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || err.response?.data?.message || 'Network error while sending OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp.trim() || otp.trim().length !== 6) {
            setErrorMsg('Please enter a valid 6-digit OTP');
            return;
        }
        Keyboard.dismiss();
        setIsLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            // Verify OTP using verify-reset-token or a combined check, or we can use the backend reset token if it can be verified.
            // Wait, the backend has /verify-reset-token which checks the token. But the user has OTP.
            // Let's create or use verify OTP endpoint in backend or let the backend verify the OTP first.
            // Let's check how the backend verifies the reset token/otp. 
            // In backend, `/auth/forgot-password` generates a token and updates password_reset_token and password_reset_otp.
            // We can add a simple backend route or logic to verify the password reset OTP and return the token, 
            // OR we can make a call to a verification endpoint to check if the OTP matches, so the app knows it is correct.
            // Let's look at what endpoints we have in backend.
            const response = await api.post('/auth/verify-reset-otp', {
                email: email.trim(),
                otp: otp.trim()
            });

            if (response.data?.success || response.status === 200) {
                setResetToken(response.data.token);
                setSuccessMsg('OTP verified successfully.');
                setStep('RESET');
            } else {
                setErrorMsg(response.data?.error || 'Invalid OTP');
            }
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || err.response?.data?.message || 'Invalid OTP or verification error.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword.trim() || !confirmPassword.trim()) {
            setErrorMsg('Password fields are required');
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setErrorMsg('Password must be at least 6 characters long');
            return;
        }

        Keyboard.dismiss();
        setIsLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const response = await api.post('/auth/reset-password', { 
                token: resetToken, 
                newPassword,
                confirmPassword
            });
            
            if (response.data?.success || response.status === 200) {
                setSuccessMsg('Password reset successfully! You can now log in.');
                setTimeout(() => {
                    navigation.navigate('Login');
                }, 2000);
            } else {
                setErrorMsg(response.data?.error || response.data?.message || 'Failed to reset password.');
            }
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || err.response?.data?.message || 'Error resetting password.');
        } finally {
            setIsLoading(false);
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

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSendOTP} disabled={isLoading}>
                            <LinearGradient colors={['#7C3AED', '#5F2EEA']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitTxt}>Send OTP</Text>}
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
                            style={[styles.submitBtn, isLoading && { opacity: 0.7 }]} 
                            onPress={handleVerifyOTP} 
                            disabled={isLoading}
                        >
                            <LinearGradient colors={['#7C3AED', '#5F2EEA']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {isLoading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
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

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter new password"
                                placeholderTextColor="#94A3B8"
                                secureTextEntry
                                value={newPassword}
                                onChangeText={(t) => { setNewPassword(t); setErrorMsg(null); }}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm new password"
                                placeholderTextColor="#94A3B8"
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={(t) => { setConfirmPassword(t); setErrorMsg(null); }}
                            />
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleResetPassword} disabled={isLoading}>
                            <LinearGradient colors={['#7C3AED', '#5F2EEA']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitTxt}>Save & Login</Text>}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setStep('OTP')} disabled={isLoading}>
                            <Text style={styles.resendTxt}>Back to OTP code</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
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
    }
});
