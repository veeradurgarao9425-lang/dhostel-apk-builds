import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
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

const { height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
    const { signIn } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const scrollRef = useRef<ScrollView>(null);
    const passwordRef = useRef<TextInput>(null);

    const handleLogin = async () => {
        Keyboard.dismiss();
        if (!identifier || !password) {
            setErrorMessage('Please enter both Email/Phone and Password');
            return;
        }
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const { error, user } = await signIn(identifier, password);
            if (!error && user) {
                navigation.navigate('Main');
            } else {
                setErrorMessage(error || 'Invalid credentials');
            }
        } catch (err: any) {
            setErrorMessage('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.container}>
                    <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

                    {/* ── Purple gradient header ── */}
                    <LinearGradient
                        colors={['#7C3AED', '#5F2EEA']}
                        style={styles.topSection}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {/* Decorative background circles */}
                        <View style={styles.decorCircle1} />
                        <View style={styles.decorCircle2} />

                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/stivologo.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                            <Text style={styles.appName}>Stivo</Text>
                            <Text style={styles.tagline}>Smart PG Management</Text>
                        </View>
                    </LinearGradient>

                    {/* ── Form section ── */}
                    <ScrollView
                        ref={scrollRef}
                        style={styles.formSection}
                        contentContainerStyle={styles.formContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                        scrollEnabled={true}
                    >
                        <Text style={styles.signInTitle}>Welcome back 👋</Text>
                        <Text style={styles.signInSubtitle}>Sign in to continue managing your PG</Text>

                        {/* Error alert */}
                        {errorMessage && (
                            <View style={styles.alertBox}>
                                <Ionicons name="warning" size={16} color="#7C3AED" />
                                <Text style={styles.alertText}>{errorMessage}</Text>
                            </View>
                        )}

                        {/* Email / Phone */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email or Phone</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={18} color="#7C3AED" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email or phone"
                                    placeholderTextColor="#B8B8B8"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={identifier}
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                    blurOnSubmit={false}
                                    onChangeText={(text) => {
                                        setIdentifier(text);
                                        if (errorMessage) setErrorMessage(null);
                                    }}
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputContainer}>
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
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (errorMessage) setErrorMessage(null);
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
                        </View>

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
                        <View style={styles.bottomBranding}>
                            <Text style={styles.bottomBrandingText}>Powered by Stivo • PG OS</Text>
                        </View>

                        <View style={styles.keyboardSpacer} />
                    </ScrollView>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    topSection: {
        height: height * 0.36,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 28,
        overflow: 'hidden',
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
    logoContainer: {
        alignItems: 'center',
    },
    logoImage: {
        width: 90,
        height: 90,
        marginBottom: 14,
        borderRadius: 22,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.25)',
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
    },
    formContent: {
        paddingHorizontal: 28,
        paddingTop: 30,
        paddingBottom: 20,
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
    keyboardSpacer: {
        height: 24,
    },
});
