import React, { useState, useRef, useEffect } from 'react';
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
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import api from '../services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }: any) {
    const { signUp } = useAuth();
    const insets = useSafeAreaInsets();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [hostelName, setHostelName] = useState('');
    const [floors, setFloors] = useState('');
    const [address, setAddress] = useState('');
    const [admissionFee, setAdmissionFee] = useState('');
    const [defaultDeposit, setDefaultDeposit] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // New validation states
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Email verification (OTP) state
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const emailRef = useRef<TextInput>(null);
    const phoneRef = useRef<TextInput>(null);
    const hostelNameRef = useRef<TextInput>(null);
    const floorsRef = useRef<TextInput>(null);
    const addressRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const otpRef = useRef<TextInput>(null);

    const validateField = (name: string, value: string) => {
        let err = '';
        if (name === 'fullName') {
            if (!value.trim()) err = 'Full name is required';
        } else if (name === 'email') {
            if (!value.trim()) err = 'Email is required';
            else if (!EMAIL_REGEX.test(value.trim())) err = 'Enter a valid email address';
        } else if (name === 'phone') {
            if (!value.trim()) err = 'Mobile number is required';
            else if (!/^[6-9]/.test(value.trim())) err = 'Must start with 6, 7, 8, or 9';
            else if (value.trim().length !== 10) err = 'Must be exactly 10 digits';
        } else if (name === 'hostelName') {
            if (!value.trim()) err = 'PG Name is required';
            else if (value.trim().length < 3) err = 'Must be at least 3 characters';
        } else if (name === 'floors') {
            if (!value.trim()) err = 'Number of floors is required';
            else if (isNaN(Number(value)) || Number(value) < 1) err = 'Must be a valid number (min 1)';
        } else if (name === 'address') {
            if (!value.trim()) err = 'Address is required';
            else if (value.trim().length < 5) err = 'Must be at least 5 characters';
        } else if (name === 'password') {
            if (!value) err = 'Password is required';
            else if (value.length < 6) err = 'Must be at least 6 characters';
        } else if (name === 'otp') {
            if (!value.trim()) err = 'Verification code is required';
            else if (value.trim().length !== 6) err = 'Must be a 6-digit code';
        }
        setFieldErrors(prev => ({ ...prev, [name]: err }));
        return err;
    };

    const checkPhoneDatabase = async (number: string) => {
        if (!/^[6-9]\d{9}$/.test(number)) return;
        try {
            const { data } = await api.post('/auth/check-phone', { phone: number });
            if (data?.exists) {
                setFieldErrors(prev => ({ ...prev, phone: 'This mobile number is already registered' }));
            } else {
                setFieldErrors(prev => ({ ...prev, phone: '' }));
            }
        } catch (err: any) {
            console.warn('Live phone check failed:', err);
        }
    };

    const getFieldError = (name: string, value: string) => {
        const err = fieldErrors[name];
        if (!err) return '';
        // For phone, show if any text is typed OR if touched.
        if (name === 'phone') {
            if (value.length > 0 || touched[name]) return err;
        }
        // For other fields, show if touched.
        if (touched[name]) return err;
        return '';
    };

    const markTouched = (name: string) => {
        setTouched(prev => ({ ...prev, [name]: true }));
        // Run validation to update errors on touch/blur
        if (name === 'fullName') validateField('fullName', fullName);
        if (name === 'email') validateField('email', email);
        if (name === 'phone') validateField('phone', phone);
        if (name === 'hostelName') validateField('hostelName', hostelName);
        if (name === 'floors') validateField('floors', floors);
        if (name === 'address') validateField('address', address);
        if (name === 'password') validateField('password', password);
        if (name === 'otp') validateField('otp', otp);
    };

    const handleSendOtp = async () => {
        Keyboard.dismiss();
        const trimmed = email.trim();
        if (!EMAIL_REGEX.test(trimmed)) {
            setFieldErrors(prev => ({ ...prev, email: 'Enter a valid email to verify' }));
            setTouched(prev => ({ ...prev, email: true }));
            return;
        }

        setSendingOtp(true);
        setSubmitError(null);
        try {
            const { data } = await api.post('/auth/send-otp', { email: trimmed });
            if (data?.success) {
                setOtpSent(true);
                setOtp('');
                setFieldErrors(prev => ({ ...prev, otp: '', email: '' }));
                // Dev mode: backend returns the OTP directly — auto-fill for testing
                if (data?.dev_otp) {
                    setOtp(data.dev_otp);
                    setSubmitError(`[Dev] OTP auto-filled: ${data.dev_otp}`);
                }
                setResendTimer(120); // 2 minutes
                setTimeout(() => otpRef.current?.focus(), 100);
            } else {
                setFieldErrors(prev => ({ ...prev, email: data?.error || data?.message || 'Could not send verification code.' }));
            }
        } catch (err: any) {
            const serverMsg = err.response?.data?.error || err.response?.data?.message;
            if (serverMsg) {
                setFieldErrors(prev => ({ ...prev, email: serverMsg }));
                setTouched(prev => ({ ...prev, email: true }));
            } else {
                setSubmitError('Could not send OTP. Check your internet connection and try again.');
            }
        } finally {
            setSendingOtp(false);
        }
    };


    const handleVerifyOtp = async () => {
        Keyboard.dismiss();
        if (otp.trim().length !== 6) {
            setFieldErrors(prev => ({ ...prev, otp: 'Enter the 6-digit code sent to your email' }));
            setTouched(prev => ({ ...prev, otp: true }));
            return;
        }

        setVerifyingOtp(true);
        setSubmitError(null);
        try {
            const { data } = await api.post('/auth/verify-otp', { email: email.trim(), otp: otp.trim() });
            if (data?.success) {
                setEmailVerified(true);
                setOtpSent(false);
                setFieldErrors(prev => ({ ...prev, otp: '', email: '' }));
            } else {
                setFieldErrors(prev => ({ ...prev, otp: data?.error || data?.message || 'Invalid or expired code.' }));
            }
        } catch (err: any) {
            setFieldErrors(prev => ({ ...prev, otp: err.response?.data?.error || err.response?.data?.message || 'Invalid or expired code.' }));
        } finally {
            setVerifyingOtp(false);
        }
    };

    const getPasswordStrength = (pass: string) => {
        if (!pass) return { score: 0, label: '', color: '#CBD5E1' };
        let score = 0;
        if (pass.length >= 6) score += 1;
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;

        if (score <= 2) return { score, label: 'Weak', color: '#EF4444' };
        if (score <= 4) return { score, label: 'Medium', color: '#F97316' };
        return { score, label: 'Strong', color: '#22C55E' };
    };

    const handleRegister = async () => {
        Keyboard.dismiss();
        
        // Trim inputs
        const trimmedName = fullName.trim();
        const trimmedEmail = email.trim();
        const trimmedPhone = phone.trim();
        const trimmedHostelName = hostelName.trim();
        const trimmedFloors = floors.trim();
        const trimmedAddress = address.trim();
        const trimmedFee = admissionFee.trim();
        const trimmedDeposit = defaultDeposit.trim();

        // Mark all fields as touched
        const allTouched = {
            fullName: true,
            email: true,
            phone: true,
            hostelName: true,
            floors: true,
            address: true,
            password: true,
        };
        setTouched(allTouched);

        // Run validation for all fields
        const e1 = validateField('fullName', trimmedName);
        const e2 = validateField('email', trimmedEmail);
        const e3 = validateField('password', password);
        const e4 = validateField('hostelName', trimmedHostelName);
        const eFloors = validateField('floors', trimmedFloors);
        const eAddress = validateField('address', trimmedAddress);
        const e5 = validateField('password', password);

        // Additional email verification check
        let emailVerifyError = '';
        if (trimmedEmail && !emailVerified) {
            emailVerifyError = 'Please verify your email to receive OTP and continue';
            setFieldErrors(prev => ({ ...prev, email: emailVerifyError }));
        }

        if (e1 || e2 || e3 || e4 || eFloors || eAddress || e5 || emailVerifyError) {
            setSubmitError('Please fix the errors above.');
            return;
        }

        setIsLoading(true);
        setSubmitError(null);
        try {
            // First check if phone exists in DB
            const { data: phoneCheck } = await api.post('/auth/check-phone', { phone: trimmedPhone });
            if (phoneCheck?.exists) {
                setIsLoading(false);
                setFieldErrors(prev => ({ ...prev, phone: 'This mobile number is already registered' }));
                return;
            }

            const { error } = await signUp({
                full_name: trimmedName,
                email: trimmedEmail,
                phone: trimmedPhone,
                password,
                hostel_name: trimmedHostelName,
                total_floors: trimmedFloors,
                address: trimmedAddress,
                admission_fee: trimmedFee,
                default_refundable_deposit: trimmedDeposit,
            } as any);
            if (!error) {
                navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
            } else {
                const errMsg = typeof error === 'string' ? error : 'Registration failed. Please try again.';
                // Distribute error
                if (errMsg.toLowerCase().includes('email')) {
                    setFieldErrors(prev => ({ ...prev, email: errMsg }));
                } else if (errMsg.toLowerCase().includes('mobile') || errMsg.toLowerCase().includes('phone')) {
                    setFieldErrors(prev => ({ ...prev, phone: errMsg }));
                } else {
                    setSubmitError(errMsg);
                }
            }
        } catch (err: any) {
            const checkMsg = err.response?.data?.error || err.response?.data?.message || 'An unexpected error occurred. Please try again.';
            if (checkMsg.toLowerCase().includes('email')) {
                setFieldErrors(prev => ({ ...prev, email: checkMsg }));
            } else if (checkMsg.toLowerCase().includes('mobile') || checkMsg.toLowerCase().includes('phone')) {
                setFieldErrors(prev => ({ ...prev, phone: checkMsg }));
            } else {
                setSubmitError(checkMsg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const clearErr = () => {
        errorMessage && setErrorMessage(null);
        submitError && setSubmitError(null);
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#FFFFFF' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Compact purple header */}
            <LinearGradient
                colors={['#7C3AED', '#5F2EEA']}
                style={[styles.header, { paddingTop: insets.top + 16 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerTopRow}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.headerLogoContainer}>
                        <Image
                            source={require('../../assets/HostixNew.png')}
                            style={styles.headerLogo}
                            resizeMode="cover"
                        />
                    </View>
                </View>
                <Text style={styles.headerTitle}>Create Account</Text>
                <Text style={styles.headerSubtitle}>Start managing your PG in minutes</Text>
            </LinearGradient>

            <ScrollView
                style={styles.formSection}
                contentContainerStyle={styles.formContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
            >
                {/* Full name */}
                <Field label="Full Name" error={getFieldError('fullName', fullName)}>
                    <Ionicons name="person-outline" size={18} color="#7C3AED" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Ravi Kumar"
                        placeholderTextColor="#B8B8B8"
                        value={fullName}
                        returnKeyType="next"
                        onSubmitEditing={() => emailRef.current?.focus()}
                        blurOnSubmit={false}
                        onBlur={() => markTouched('fullName')}
                        onChangeText={(t) => { setFullName(t); validateField('fullName', t); clearErr(); }}
                    />
                </Field>

                {/* Email + verify */}
                <View style={styles.inputGroup}>
                    <Field 
                        label="Email" 
                        error={getFieldError('email', email)}
                        rightAction={otpSent ? (
                            <TouchableOpacity
                                onPress={() => {
                                    setOtpSent(false);
                                    setOtp('');
                                    clearErr();
                                }}
                            >
                                <Text style={{ color: '#5F2EEA', fontSize: 13, fontWeight: '700' }}>Change</Text>
                            </TouchableOpacity>
                        ) : undefined}
                    >
                        <Ionicons name="mail-outline" size={18} color="#7C3AED" style={styles.icon} />
                        <TextInput
                            ref={emailRef}
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor="#B8B8B8"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!otpSent && !emailVerified && !sendingOtp}
                            value={email}
                            returnKeyType="next"
                            onSubmitEditing={() => phoneRef.current?.focus()}
                            blurOnSubmit={false}
                            onBlur={() => markTouched('email')}
                            onChangeText={(t) => {
                                setEmail(t);
                                if (emailVerified) setEmailVerified(false);
                                if (otpSent) setOtpSent(false);
                                validateField('email', t);
                                clearErr();
                            }}
                        />
                        {emailVerified ? (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        ) : otpSent ? (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="lock-closed-outline" size={16} color="#16A34A" />
                                <Text style={[styles.verifiedText, { color: '#16A34A' }]}>OTP Sent</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.verifyBtn, (sendingOtp || !email.trim()) && { opacity: 0.6 }]}
                                onPress={handleSendOtp}
                                disabled={sendingOtp || !email.trim()}
                                activeOpacity={0.8}
                            >
                                {sendingOtp
                                    ? <ActivityIndicator color="#5F2EEA" size="small" />
                                    : <Text style={styles.verifyBtnText}>Verify</Text>}
                            </TouchableOpacity>
                        )}
                    </Field>
                    {!otpSent && (
                        <Text style={styles.helperText}>
                            Please enter your correct email; you will receive a verification OTP on this email.
                        </Text>
                    )}
                </View>

                {/* OTP entry — shown only after a code has been sent and not yet verified */}
                {otpSent && !emailVerified && (
                    <View style={{ marginTop: 10 }}>
                        <Field 
                            label="Enter Verification Code" 
                            error={getFieldError('otp', otp)}
                            rightAction={
                                <TouchableOpacity
                                    onPress={handleSendOtp}
                                    disabled={sendingOtp || resendTimer > 0}
                                    style={{ opacity: (sendingOtp || resendTimer > 0) ? 0.6 : 1 }}
                                >
                                    {sendingOtp ? (
                                        <ActivityIndicator color="#5F2EEA" size="small" />
                                    ) : (
                                        <Text style={{ color: '#5F2EEA', fontSize: 13, fontWeight: '700' }}>
                                            {resendTimer > 0 ? `Resend in ${Math.floor(resendTimer / 60)}:${String(resendTimer % 60).padStart(2, '0')}` : 'Resend OTP'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            }
                        >
                        <Ionicons name="key-outline" size={18} color="#7C3AED" style={styles.icon} />
                        <TextInput
                            ref={otpRef}
                            style={styles.input}
                            placeholder="6-digit code"
                            placeholderTextColor="#B8B8B8"
                            keyboardType="number-pad"
                            maxLength={6}
                            value={otp}
                            returnKeyType="done"
                            onSubmitEditing={handleVerifyOtp}
                            onBlur={() => markTouched('otp')}
                            onChangeText={(t) => {
                                const clean = t.replace(/[^0-9]/g, '');
                                setOtp(clean);
                                validateField('otp', clean);
                                clearErr();
                            }}
                        />
                        <TouchableOpacity
                            style={[styles.verifyBtn, (verifyingOtp || otp.length !== 6) && { opacity: 0.6 }]}
                            onPress={handleVerifyOtp}
                            disabled={verifyingOtp || otp.length !== 6}
                            activeOpacity={0.8}
                        >
                            {verifyingOtp
                                ? <ActivityIndicator color="#5F2EEA" size="small" />
                                : <Text style={styles.verifyBtnText}>Confirm</Text>}
                        </TouchableOpacity>
                        </Field>
                    </View>
                )}

                {/* Phone */}
                <Field label="Mobile Number" error={getFieldError('phone', phone)}>
                    <Ionicons name="call-outline" size={18} color="#7C3AED" style={styles.icon} />
                    <TextInput
                        ref={phoneRef}
                        style={styles.input}
                        placeholder="10-digit mobile number"
                        placeholderTextColor="#B8B8B8"
                        keyboardType="number-pad"
                        maxLength={10}
                        value={phone}
                        returnKeyType="next"
                        onSubmitEditing={() => hostelNameRef.current?.focus()}
                        blurOnSubmit={false}
                        onBlur={() => {
                            markTouched('phone');
                            checkPhoneDatabase(phone);
                        }}
                        onChangeText={(t) => {
                            const clean = t.replace(/[^0-9]/g, '');
                            setPhone(clean);
                            validateField('phone', clean);
                            if (clean.length === 10) {
                                checkPhoneDatabase(clean);
                            }
                            clearErr();
                        }}
                    />
                </Field>

                {/* PG Name */}
                <Field label="Hostel / PG Name" error={getFieldError('hostelName', hostelName)}>
                    <Ionicons name="business-outline" size={18} color="#7C3AED" style={styles.icon} />
                    <TextInput
                        ref={hostelNameRef}
                        style={styles.input}
                        placeholder="e.g. Sunrise PG"
                        placeholderTextColor="#B8B8B8"
                        value={hostelName}
                        returnKeyType="next"
                        onSubmitEditing={() => floorsRef.current?.focus()}
                        blurOnSubmit={false}
                        onBlur={() => markTouched('hostelName')}
                        onChangeText={(t) => { setHostelName(t); validateField('hostelName', t); clearErr(); }}
                    />
                </Field>

                {/* Floors */}
                <Field label="Total Floors" error={getFieldError('floors', floors)}>
                    <Ionicons name="layers-outline" size={18} color="#7C3AED" style={styles.icon} />
                    <TextInput
                        ref={floorsRef}
                        style={styles.input}
                        placeholder="e.g. 3"
                        placeholderTextColor="#B8B8B8"
                        keyboardType="numeric"
                        value={floors}
                        returnKeyType="next"
                        onSubmitEditing={() => addressRef.current?.focus()}
                        blurOnSubmit={false}
                        onBlur={() => markTouched('floors')}
                        onChangeText={(t) => { setFloors(t); validateField('floors', t); clearErr(); }}
                    />
                </Field>

                {/* Address */}
                <Field 
                    label="Address" 
                    error={getFieldError('address', address)}
                    containerStyle={{ height: 100, alignItems: 'flex-start', paddingTop: 14 }}
                >
                    <Ionicons name="location-outline" size={18} color="#7C3AED" style={[styles.icon, { marginTop: 2 }]} />
                    <TextInput
                        ref={addressRef}
                        style={[styles.input, { height: '100%', textAlignVertical: 'top', paddingTop: 0, paddingBottom: 0 }]}
                        placeholder="Enter full address"
                        placeholderTextColor="#B8B8B8"
                        value={address}
                        multiline
                        numberOfLines={3}
                        blurOnSubmit={false}
                        onBlur={() => markTouched('address')}
                        onChangeText={(t) => {
                            setAddress(t);
                            validateField('address', t);
                            clearErr();
                        }}
                    />
                </Field>

                {/* Joining Fee */}
                <Field label="Joining Fee" error={getFieldError('admissionFee', admissionFee)}>
                    <Ionicons name="card-outline" size={18} color="#7C3AED" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 3000"
                        placeholderTextColor="#B8B8B8"
                        keyboardType="numeric"
                        value={admissionFee}
                        returnKeyType="next"
                        onChangeText={(t) => { setAdmissionFee(t.replace(/\D/g, '')); clearErr(); }}
                    />
                </Field>

                {/* Refundable Deposit */}
                <Field label="Refundable Deposit (Refunded after deducting maintenance charges)" error={getFieldError('defaultDeposit', defaultDeposit)}>
                    <Ionicons name="cash-outline" size={18} color="#7C3AED" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 1000"
                        placeholderTextColor="#B8B8B8"
                        keyboardType="numeric"
                        value={defaultDeposit}
                        returnKeyType="next"
                        onChangeText={(t) => { setDefaultDeposit(t.replace(/\D/g, '')); clearErr(); }}
                    />
                </Field>

                {/* Password */}
                <View>
                    <Field label="Password" error={getFieldError('password', password)}>
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
                            onBlur={() => markTouched('password')}
                            onChangeText={(t) => { setPassword(t); validateField('password', t); clearErr(); }}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={showPassword ? '#7C3AED' : '#94A3B8'} />
                        </TouchableOpacity>
                    </Field>
                    {password.length > 0 && (
                        <View style={styles.strengthContainer}>
                            <View style={styles.strengthBarBackground}>
                                <View style={[styles.strengthBarActive, { width: `${(getPasswordStrength(password).score / 5) * 100}%`, backgroundColor: getPasswordStrength(password).color }]} />
                            </View>
                            <Text style={[styles.strengthText, { color: getPasswordStrength(password).color }]}>
                                Password Strength: {getPasswordStrength(password).label}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.securityNote}>
                        🔐 Passwords are encrypted at the storage level using strong bcrypt hashing to ensure your account security.
                    </Text>
                </View>

                {submitError && (
                    <View style={styles.alertBox}>
                        <Ionicons name="warning" size={16} color="#EF4444" />
                        <Text style={[styles.alertText, { color: '#EF4444' }]}>{submitError}</Text>
                    </View>
                )}

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
const Field = ({ label, error, rightAction, containerStyle, children }: { label: string; error?: string; rightAction?: React.ReactNode; containerStyle?: any; children: React.ReactNode }) => (
    <View style={styles.inputGroup}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
            <Text style={[styles.label, { marginBottom: 0 }]}>{label} <Text style={{ color: '#EF4444' }}>*</Text></Text>
            {rightAction}
        </View>
        <View style={[styles.inputContainer, error ? { borderColor: '#EF4444' } : null, containerStyle]}>
            {children}
        </View>
        {error ? (
            <Text style={styles.fieldErrorText}>{error}</Text>
        ) : null}
    </View>
);

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerLogoContainer: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    headerLogo: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
    },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginTop: 4 },
    formSection: { flex: 1 },
    formContent: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 150 },
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
    verifyBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#F3EEFF',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 64,
    },
    verifyBtnText: { fontSize: 13, fontWeight: '800', color: '#5F2EEA' },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
    },
    verifiedText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
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
    verifyBtnGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    changeEmailBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    changeEmailBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    helperText: {
        fontSize: 11,
        color: '#64748B',
        marginTop: -10,
        marginBottom: 14,
        marginLeft: 2,
        lineHeight: 15,
        fontWeight: '500',
    },
    eyeBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    strengthContainer: {
        marginTop: 6,
        marginBottom: 4,
        paddingHorizontal: 2,
    },
    strengthBarBackground: {
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 4,
    },
    strengthBarActive: {
        height: '100%',
        borderRadius: 2,
    },
    strengthText: {
        fontSize: 11,
        fontWeight: '700',
    },
    securityNote: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 6,
        marginLeft: 2,
        lineHeight: 15,
        fontWeight: '500',
    },
    fieldErrorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
        marginLeft: 4,
        fontWeight: '600',
    },
});
