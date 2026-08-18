import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Platform,
    StatusBar,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    Keyboard,
    TouchableWithoutFeedback,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardInset } from '../hooks/useKeyboardInset';

const { width, height } = Dimensions.get('window');
const isSmall = height < 700;
const isTiny = height < 600;

export default function LoginScreen({ navigation }: any) {
    const { signIn } = useAuth();
    const insets = useSafeAreaInsets();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Dynamic field validation states
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const scrollRef = useRef<ScrollView>(null);
    const passwordRef = useRef<TextInput>(null);

    // Keyboard handling. Replaces KeyboardAvoidingView(behavior="height"), whose
    // stale container height was leaving a grey band along the bottom of this
    // screen after you typed into a field. See useKeyboardInset for the details.
    const { keyboardHeight, keyboardInset, onContainerLayout } = useKeyboardInset();

    const validateField = (name: string, value: string) => {
        let err = '';
        if (name === 'identifier') {
            if (!value.trim()) {
                err = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
                err = 'Please enter a valid email address';
            }
        } else if (name === 'password') {
            if (!value) err = 'Password is required';
        }
        setFieldErrors(prev => ({ ...prev, [name]: err }));
        return err;
    };

    const getFieldError = (name: string) => {
        if (touched[name]) return fieldErrors[name];
        return '';
    };

    const markTouched = (name: string) => {
        setTouched(prev => ({ ...prev, [name]: true }));
        if (name === 'identifier') validateField('identifier', identifier);
        if (name === 'password') validateField('password', password);
    };

    const handleLogin = async () => {
        Keyboard.dismiss();

        // Mark fields touched
        setTouched({ identifier: true, password: true });

        const e1 = validateField('identifier', identifier);
        const e2 = validateField('password', password);

        if (e1 || e2) return;

        setIsLoading(true);
        setSubmitError(null);
        setErrorMessage(null);
        try {
            console.log('[LOGIN_SCREEN] Attempting login with identifier:', identifier.trim());
            const { error, user } = await signIn(identifier.trim(), password);
            if (!error && user) {
                console.log('[LOGIN_SCREEN] Login success!');
                navigation.navigate('Main');
            } else {
                const errMsg = typeof error === 'string' ? error : JSON.stringify(error) || 'Invalid credentials';
                console.warn('[LOGIN_SCREEN] Login failed with error:', errMsg);
                setSubmitError(errMsg);
            }
        } catch (err: any) {
            console.error('[LOGIN_SCREEN] Exception during login:', err);
            setSubmitError(`Login error: ${err.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View
            style={[
                { flex: 1, backgroundColor: '#FFFFFF' },
                keyboardInset > 0 && { paddingBottom: keyboardInset },
            ]}
            onLayout={onContainerLayout}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── Purple gradient header ── */}
            <View style={[
                styles.topSection,
                {
                    // Never let the header take more than 38% and min 200px — prevents overflow on small phones
                    height: Math.max(Math.min(height * 0.36 + (insets.top > 0 ? insets.top : 0), height * 0.38), isSmall ? 185 : 220),
                }
            ]}>
                <LinearGradient
                    colors={['#7C3AED', '#5F2EEA']}
                    style={[StyleSheet.absoluteFillObject, styles.topSectionContent, { paddingTop: insets.top > 0 ? insets.top + 10 : 28 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {/* Back Button */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('RoleSelect')}
                        style={[styles.backBtn, { top: insets.top > 0 ? insets.top + 10 : 20 }]}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    {/* Decorative background circles */}
                    <View style={styles.decorCircle1} />
                    <View style={styles.decorCircle2} />

                    <View style={styles.logoWrapper}>
                        <View style={[styles.logoImageContainer, isSmall && { width: 68, height: 68, borderRadius: 16, marginBottom: 8 }]}>
                            <Image
                                source={require('../../assets/HostixNew.png')}
                                style={styles.logoImage}
                                resizeMode="cover"
                            />
                        </View>
                        <Text style={[styles.appName, isSmall && { fontSize: 26, marginBottom: 2 }]}>Host<Text style={{ color: '#FCD34D' }}>ix</Text></Text>
                        {!isTiny && <Text style={[styles.tagline, isSmall && { fontSize: 12 }]}>Smart PG Management</Text>}
                    </View>
                </LinearGradient>
            </View>

            {/* ── Scrollable Form section ── */}
            <ScrollView
                ref={scrollRef}
                style={styles.formSection}
                contentContainerStyle={[styles.formContent, { paddingBottom: keyboardHeight > 0 ? 5 : 20 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
            >
                <Text style={[styles.signInTitle, isSmall && { fontSize: 20, marginBottom: 2 }]}>Welcome back 👋</Text>
                <Text style={[styles.signInSubtitle, isSmall && { fontSize: 13, marginBottom: 16 }]}>Sign in to continue managing your PG</Text>

                {/* Email */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <View style={[styles.inputContainer, getFieldError('identifier') ? { borderColor: '#EF4444' } : null]}>
                        <Ionicons name="mail-outline" size={18} color="#7C3AED" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor="#B8B8B8"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={identifier}
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                            blurOnSubmit={false}
                            onBlur={() => markTouched('identifier')}
                            onChangeText={(text) => {
                                setIdentifier(text);
                                validateField('identifier', text);
                                setSubmitError(null);
                            }}
                        />
                    </View>
                    {getFieldError('identifier') ? (
                        <Text style={styles.fieldErrorText}>{getFieldError('identifier')}</Text>
                    ) : null}
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={[styles.inputContainer, getFieldError('password') ? { borderColor: '#EF4444' } : null]}>
                        <Ionicons name="lock-closed-outline" size={18} color="#7C3AED" style={styles.inputIcon} />
                        <TextInput
                            ref={passwordRef}
                            style={styles.input}
                            placeholder="Enter your password"
                            placeholderTextColor="#B8B8B8"
                            value={password}
                            secureTextEntry={!showPassword}
                            returnKeyType="done"
                            onSubmitEditing={handleLogin}
                            onBlur={() => markTouched('password')}
                            onChangeText={(text) => {
                                setPassword(text);
                                validateField('password', text);
                                setSubmitError(null);
                            }}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#94A3B8"
                            />
                        </TouchableOpacity>
                    </View>
                    {getFieldError('password') ? (
                        <Text style={styles.fieldErrorText}>{getFieldError('password')}</Text>
                    ) : null}
                </View>

                {/* Forgot Password */}
                <TouchableOpacity
                    style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 }}
                    onPress={() => navigation.navigate('ForgotPassword')}
                >
                    <Text style={{ color: '#7C3AED', fontSize: 13, fontWeight: '600' }}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Submit level error alert */}
                {submitError && (
                    <View style={styles.alertBox}>
                        <Ionicons name="warning-outline" size={20} color="#EF4444" />
                        <Text style={styles.alertText}>{submitError}</Text>
                    </View>
                )}

                {/* Login button */}
                <TouchableOpacity
                    style={[styles.loginButton, isLoading && { opacity: 0.8 }]}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={['#7C3AED', '#5F2EEA']}
                        style={styles.loginGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Create account */}
                <View style={styles.signupRow}>
                    <Text style={styles.signupText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
                        <Text style={styles.signupLink}>Create Account</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom branding */}
                <View style={[styles.bottomBranding, { flex: 1, justifyContent: 'flex-end', paddingBottom: Math.max(insets.bottom, 10) }]}>
                    <Text style={styles.bottomBrandingText}>Powered by Hostix • PG OS</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    topSection: {
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        overflow: 'hidden',
        backgroundColor: '#7C3AED',
    },
    topSectionContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    decorCircle1: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.07)',
        top: -60,
        right: -50,
    },
    decorCircle2: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.07)',
        bottom: -40,
        left: -30,
    },
    logoWrapper: {
        alignItems: 'center',
    },
    logoImageContainer: {
        width: 90,
        height: 90,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    logoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    appName: {
        fontSize: 34,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    tagline: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    formSection: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    formContent: {
        paddingHorizontal: 28,
        paddingTop: isSmall ? 18 : 30,
        paddingBottom: 16,
        flexGrow: 1,
    },
    signInTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 4,
    },
    signInSubtitle: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 24,
    },
    alertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3EEFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#7C3AED',
        gap: 10,
    },
    alertText: {
        fontSize: 13,
        color: '#5F2EEA',
        flex: 1,
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 18,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E8E8F0',
        paddingHorizontal: 14,
        height: 54,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#1E293B',
        fontWeight: '500',
        paddingVertical: 12,
        borderWidth: 0,
        ...Platform.select({
            web: {
                outlineWidth: 0,
                outlineStyle: 'none',
                boxShadow: 'none',
            } as any,
        }),
    },
    eyeButton: {
        padding: 4,
    },
    loginButton: {
        height: 56,
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 6,
        marginBottom: 20,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    loginGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    signupRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
        marginBottom: 16,
    },
    signupText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    signupLink: {
        fontSize: 14,
        color: '#5F2EEA',
        fontWeight: '800',
    },
    bottomBranding: {
        alignItems: 'center',
        marginTop: 4,
    },
    bottomBrandingText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    fieldErrorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
        marginLeft: 4,
        fontWeight: '600',
    },
    backBtn: {
        position: 'absolute',
        left: 16,
        padding: 8,
        zIndex: 50,
    },
});
