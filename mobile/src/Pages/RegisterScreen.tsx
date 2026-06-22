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
    ScrollView,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

export default function RegisterScreen({ navigation }: any) {
    const { signUp } = useAuth();
    const insets = useSafeAreaInsets();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [hostelName, setHostelName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const emailRef = useRef<TextInput>(null);
    const phoneRef = useRef<TextInput>(null);
    const hostelRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    const handleRegister = async () => {
        Keyboard.dismiss();
        if (!fullName.trim()) return setErrorMessage('Please enter your full name');
        if (!email.trim() && !phone.trim()) return setErrorMessage('Enter an email or phone number');
        if (password.length < 6) return setErrorMessage('Password must be at least 6 characters');

        setIsLoading(true);
        setErrorMessage(null);
        try {
            const { error } = await signUp({
                full_name: fullName.trim(),
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                password,
                hostel_name: hostelName.trim() || undefined,
            });
            if (!error) {
                navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
            } else {
                setErrorMessage(typeof error === 'string' ? error : 'Registration failed. Please try again.');
            }
        } catch {
            setErrorMessage('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const clearErr = () => errorMessage && setErrorMessage(null);

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#FFFFFF' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Compact purple header */}
            <LinearGradient
                colors={['#7C3AED', '#5F2EEA']}
                style={[styles.header, { paddingTop: insets.top + 16 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Account</Text>
                <Text style={styles.headerSubtitle}>Start managing your hostel in minutes</Text>
            </LinearGradient>

            <ScrollView
                style={styles.formSection}
                contentContainerStyle={styles.formContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
            >
                {errorMessage && (
                    <View style={styles.alertBox}>
                        <Ionicons name="warning" size={16} color="#5F2EEA" />
                        <Text style={styles.alertText}>{errorMessage}</Text>
                    </View>
                )}

                {/* Full name */}
                <Field label="Full Name">
                    <Ionicons name="person-outline" size={18} color="#7C3AED" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Ravi Kumar"
                        placeholderTextColor="#B8B8B8"
                        value={fullName}
                        returnKeyType="next"
                        onSubmitEditing={() => emailRef.current?.focus()}
                        blurOnSubmit={false}
                        onChangeText={(t) => { setFullName(t); clearErr(); }}
                    />
                </Field>

                {/* Email */}
                <Field label="Email">
                    <Ionicons name="mail-outline" size={18} color="#7C3AED" style={styles.icon} />
                    <TextInput
                        ref={emailRef}
                        style={styles.input}
                        placeholder="you@example.com"
                        placeholderTextColor="#B8B8B8"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        returnKeyType="next"
                        onSubmitEditing={() => phoneRef.current?.focus()}
                        blurOnSubmit={false}
                        onChangeText={(t) => { setEmail(t); clearErr(); }}
                    />
                </Field>

                {/* Phone */}
                <Field label="Mobile Number">
                    <Ionicons name="call-outline" size={18} color="#7C3AED" style={styles.icon} />
                    <TextInput
                        ref={phoneRef}
                        style={styles.input}
                        placeholder="10-digit mobile number"
                        placeholderTextColor="#B8B8B8"
                        keyboardType="phone-pad"
                        value={phone}
                        returnKeyType="next"
                        onSubmitEditing={() => hostelRef.current?.focus()}
                        blurOnSubmit={false}
                        onChangeText={(t) => { setPhone(t); clearErr(); }}
                    />
                </Field>

                {/* Hostel name */}
                <Field label="Hostel Name">
                    <Ionicons name="business-outline" size={18} color="#7C3AED" style={styles.icon} />
                    <TextInput
                        ref={hostelRef}
                        style={styles.input}
                        placeholder="Your hostel's name"
                        placeholderTextColor="#B8B8B8"
                        value={hostelName}
                        returnKeyType="next"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        blurOnSubmit={false}
                        onChangeText={(t) => { setHostelName(t); clearErr(); }}
                    />
                </Field>

                {/* Password */}
                <Field label="Password">
                    <Ionicons name="lock-closed-outline" size={18} color="#7C3AED" style={styles.icon} />
                    <TextInput
                        ref={passwordRef}
                        style={styles.input}
                        placeholder="At least 6 characters"
                        placeholderTextColor="#B8B8B8"
                        secureTextEntry={!showPassword}
                        value={password}
                        returnKeyType="done"
                        onSubmitEditing={handleRegister}
                        onChangeText={(t) => { setPassword(t); clearErr(); }}
                    />
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
                    </TouchableOpacity>
                </Field>

                <TouchableOpacity
                    style={[styles.submitBtn, isLoading && { opacity: 0.8 }]}
                    onPress={handleRegister}
                    disabled={isLoading}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={['#7C3AED', '#5F2EEA']}
                        style={styles.submitGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {isLoading
                            ? <ActivityIndicator color="#FFFFFF" size="small" />
                            : <Text style={styles.submitText}>Create Account</Text>}
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.loginRow}>
                    <Text style={styles.loginRowText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.loginLink}>Sign In</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// Small labelled input wrapper to keep the form consistent
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputContainer}>{children}</View>
    </View>
);

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginTop: 4 },
    formSection: { flex: 1 },
    formContent: { paddingHorizontal: 24, paddingTop: 22 },
    alertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3EEFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 18,
        borderLeftWidth: 4,
        borderLeftColor: '#5F2EEA',
        gap: 10,
    },
    alertText: { fontSize: 13, color: '#5F2EEA', flex: 1, fontWeight: '500' },
    inputGroup: { marginBottom: 16 },
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
    icon: { marginRight: 10 },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#1E293B',
        fontWeight: '500',
        paddingVertical: 12,
        borderWidth: 0,
        ...Platform.select({
            web: { outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none' } as any,
        }),
    },
    submitBtn: {
        height: 56,
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 10,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    submitGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    submitText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 22 },
    loginRowText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    loginLink: { fontSize: 14, color: '#5F2EEA', fontWeight: '800' },
});
