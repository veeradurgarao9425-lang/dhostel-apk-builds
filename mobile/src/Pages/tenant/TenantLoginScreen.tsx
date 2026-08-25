import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const PURPLE       = '#7C3AED';       
const PURPLE_DARK  = '#5F2EEA';   
const PURPLE_SOFT  = '#F4F1FF';   
const WHITE        = '#FFFFFF';
const TEXT_DARK    = '#0D1B3E';
const TEXT_MID     = '#4A5568';
const BORDER       = '#E2E8F0';
const HINT_COLOR   = '#A0AEC0';
const GREEN        = '#22C55E';
const GREEN_BG     = '#F0FDF4';
const GREEN_BORDER = '#BBF7D0';

const HostixLogo = () => (
  <Svg width={90} height={90} viewBox="0 0 90 90" fill="none">
    <Path d="M10 42 L45 8 L80 42" stroke={WHITE} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Rect x={28} y={14} width={10} height={14} rx={2} fill={WHITE} />
    <Rect x={15} y={40} width={60} height={40} rx={3} fill={WHITE} />
    <Rect x={20} y={46} width={14} height={12} rx={2} fill={PURPLE} />
    <Line x1="27" y1="46" x2="27" y2="58" stroke={WHITE} strokeWidth={1.5} />
    <Line x1="20" y1="52" x2="34" y2="52" stroke={WHITE} strokeWidth={1.5} />
    <Rect x={56} y={46} width={14} height={12} rx={2} fill={PURPLE} />
    <Line x1="63" y1="46" x2="63" y2="58" stroke={WHITE} strokeWidth={1.5} />
    <Line x1="56" y1="52" x2="70" y2="52" stroke={WHITE} strokeWidth={1.5} />
    <Rect x={37} y={56} width={16} height={24} rx={0} fill={PURPLE} />
    <Circle cx={45} cy={64} r={5} fill={WHITE} />
    <Path d="M43 68 L43 74 L47 74 L47 68" fill={WHITE} />
  </Svg>
);

const HeadphoneIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M3 18V12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12V18" stroke={WHITE} strokeWidth={2} strokeLinecap="round" />
    <Rect x={2} y={16} width={4} height={6} rx={2} fill={WHITE} />
    <Rect x={18} y={16} width={4} height={6} rx={2} fill={WHITE} />
  </Svg>
);

const MapPinIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={TEXT_MID} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
    <Circle cx={12} cy={10} r={3} stroke={TEXT_MID} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const VerifiedBadge = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GREEN_BG, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: GREEN_BORDER }}>
    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={6} height={6} viewBox="0 0 24 24" fill="none">
        <Path d="M20 6L9 17L4 12" stroke={WHITE} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
    <Text style={{ color: GREEN, fontSize: 10, fontWeight: '700' }}>Verified Hostel</Text>
  </View>
);

const MailIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={5} width={18} height={14} rx={2} stroke={HINT_COLOR} strokeWidth={1.8} fill="none" />
    <Path d="M3 8 L12 13 L21 8" stroke={HINT_COLOR} strokeWidth={1.8} strokeLinecap="round" fill="none" />
  </Svg>
);

const ShieldCheck = ({ size = 22, color = PURPLE }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L4 5V11C4 15.4 7.4 19.5 12 21C16.6 19.5 20 15.4 20 11V5L12 2Z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
    <Polyline points="9,12 11,14 15,10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

const ArrowRightIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Line x1="5" y1="12" x2="19" y2="12" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" />
    <Polyline points="13,6 19,12 13,18" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

export function TenantLoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { signInOtp, verifyOtp, connectedHostel, disconnectHostel } = useAuth();

  const [email, setEmail]               = useState('');
  const [sendLoading, setSendLoading]   = useState(false);
  const [otpSent, setOtpSent]           = useState(false);
  const [otp, setOtp]                   = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown]       = useState(120);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [emailError, setEmailError]     = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [otpError, setOtpError]         = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [isPhoneWarning, setIsPhoneWarning] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (!otpSent) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpSent, countdown]);

  const handleSendOtp = async () => {
    const val = email.trim();
    if (!val) { setEmailError('Please enter your email address'); return; }

    // Detect phone number input — SMS OTP is not yet available
    const isPhone = /^[6-9]\d{9}$/.test(val.replace(/\s/g, '')) || /^\+?\d{10,13}$/.test(val.replace(/\s/g, ''));
    if (isPhone) {
      setIsPhoneWarning(true);
      setEmailError('');
      return;
    }
    setIsPhoneWarning(false);

    const isEmail = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(val);
    if (!isEmail) { setEmailError('Please enter a valid email address'); return; }
    setEmailError('');
    setGeneralError(null);
    setSendLoading(true);
    const res = await signInOtp(val);
    setSendLoading(false);
    if (res.error) {
      setGeneralError(res.error);
    } else {
      setOtpSent(true);
      setCountdown(120);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    }
  };

  const handleOtpChange = (val: string, index: number) => {
    const digitsOnly = val.replace(/[^0-9]/g, '');
    if (digitsOnly.length > 1) {
      const next = [...otp];
      for (let i = 0; i < 6; i++) {
        if (digitsOnly[i]) next[i] = digitsOnly[i];
      }
      setOtp(next);
      setOtpError(false);
      const focusIndex = Math.min(digitsOnly.length, 5);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    const digit = digitsOnly.slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setOtpError(false);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setSendLoading(true);
    setGeneralError(null);
    const res = await signInOtp(email.trim());
    setSendLoading(false);
    if (!res.error) {
      setCountdown(120);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } else {
      setGeneralError(res.error);
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setGeneralError('Please enter all 6 digits'); return; }
    setVerifyLoading(true);
    setGeneralError(null);
    const res = await verifyOtp(email.trim(), code);
    setVerifyLoading(false);
    if (res.error) {
      setGeneralError(res.error);
      setOtpError(true);
    } else {
      setOtpError(false);
      if (res.isNewUser) {
        navigation.navigate('TenantRegister', { identifier: res.data?.identifier, hostel_id: res.data?.hostel_id });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    }
  };

  const otpFilled = otp.every(d => d !== '');
  const countdownStr = `${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(countdown % 60).padStart(2, '0')}`;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Purple Gradient Header Matching Login / Brand ── */}
      <View
        style={[
          s.topSection,
          {
            height: Math.max(Math.min(Dimensions.get('window').height * 0.32 + (insets.top > 0 ? insets.top : 0), Dimensions.get('window').height * 0.35), 180),
          },
        ]}
      >
        <LinearGradient
          colors={[PURPLE, PURPLE_DARK]}
          style={[
            StyleSheet.absoluteFillObject,
            s.topSectionContent,
            { paddingTop: insets.top > 0 ? insets.top + 8 : 24 },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Back Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            style={[s.backBtn, { top: insets.top > 0 ? insets.top + 10 : 20 }]}
          >
            <Ionicons name="arrow-back" size={22} color={WHITE} />
          </TouchableOpacity>

          {/* Decorative background circles */}
          <View style={s.decorCircle1} />
          <View style={s.decorCircle2} />

          <View style={s.logoWrapper}>
            <View style={s.logoImageContainer}>
              <Image
                source={require('../../../assets/HostixNew.png')}
                style={s.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={s.appName}>
              Host<Text style={{ color: '#FCD34D' }}>ix</Text>
            </Text>
            <Text style={s.tagline}>Tenant Login</Text>
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.welcomeRow}>
            <View style={s.welcomeDot} />
            <Text style={s.welcomeBack}>Welcome Resident! 👋</Text>
          </View>
          <Text style={s.bigTitle}>Let's log you in!</Text>

          {connectedHostel?.hostel_name ? (
            <View style={s.hostelCard}>
              <View style={s.hostelAccentBar} />
              <View style={s.hostelInfo}>
                <Text style={s.hostelLabel}>Connected to</Text>
                <Text style={s.hostelName}>{connectedHostel.hostel_name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <MapPinIcon />
                  <Text style={s.locationText}>
                    {[connectedHostel.address, connectedHostel.city, connectedHostel.state].filter(Boolean).join(', ') || 'NA'}
                  </Text>
                </View>
              </View>
              <View style={s.hostelCardRight}>
                <TouchableOpacity onPress={disconnectHostel} style={s.changeBtnContainer} activeOpacity={0.7}>
                  <Text style={s.changeText}>Change Key</Text>
                </TouchableOpacity>
                <VerifiedBadge />
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={s.connectKeyBanner} 
              onPress={() => navigation.navigate('TenantHostelKey')}
            >
              <Text style={s.connectKeyText}>🔑 Tap here to connect Hostel Key first</Text>
            </TouchableOpacity>
          )}

          <Text style={s.subtitle}>Enter your <Text style={{ fontWeight: '700', color: PURPLE }}>registered email</Text> to receive a 6-digit OTP verification code.</Text>

          {/* Phone number warning banner */}
          {isPhoneWarning && (
            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FCD34D', flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Text style={{ fontSize: 18 }}>📱</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 14, marginBottom: 3 }}>Phone Login Not Available Yet</Text>
                <Text style={{ color: '#92400E', fontSize: 13, lineHeight: 18 }}>
                  SMS OTP is coming soon! For now, please use your <Text style={{ fontWeight: '700' }}>registered email address</Text> to log in.{"\n"}Contact your hostel owner if you haven't registered an email.
                </Text>
              </View>
            </View>
          )}

          {generalError && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{generalError}</Text>
            </View>
          )}

          {!otpSent ? (
            <>
              <View style={[s.emailCard, emailFocused && s.emailCardFocused, emailError ? { borderColor: '#EF4444' } : null]}>
                <MailIcon />
                <TextInput
                  style={s.emailInput}
                  placeholder="example@gmail.com"
                  placeholderTextColor={HINT_COLOR}
                  value={email}
                  onChangeText={t => { setEmail(t); setEmailError(''); setIsPhoneWarning(false); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {emailError ? <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 14, marginLeft: 4 }}>{emailError}</Text> : null}

              <TouchableOpacity
                style={[s.mainBtnWrap, (!email.trim() || sendLoading) && { opacity: 0.7 }]}
                onPress={handleSendOtp}
                disabled={!email.trim() || sendLoading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[PURPLE, PURPLE_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.mainBtn}>
                  {sendLoading ? (
                    <ActivityIndicator color={WHITE} />
                  ) : (
                    <View style={s.btnInner}>
                      <Text style={s.btnText}>Send OTP Code</Text>
                      <ArrowRightIcon />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[s.emailCard, s.emailCardFocused]}>
                <MailIcon />
                <View style={{ flex: 1 }}>
                  <Text style={s.emailLabel}>Email Address</Text>
                  <Text style={s.emailValue}>{email}</Text>
                </View>
                <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(['','','','','','']); }} activeOpacity={0.7}>
                  <Text style={s.editLink}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={s.otpHeaderRow}>
                <Text style={s.otpLabel}>Enter 6-digit code</Text>
                <TouchableOpacity onPress={handleResend} disabled={countdown > 0} activeOpacity={0.7}>
                  <Text style={[s.resendText, countdown > 0 && s.resendDisabled]}>
                    {countdown > 0 ? `Resend (${countdownStr})` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={s.otpBoxRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={ref => { inputRefs.current[i] = ref; }}
                    style={[
                      s.otpBox,
                      digit ? s.otpBoxFilled : null,
                      otpError ? s.otpBoxError : null,
                    ]}
                    value={digit}
                    onChangeText={val => handleOtpChange(val, i)}
                    onKeyPress={e => handleOtpKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                  />
                ))}
              </View>

              <View style={s.sentBanner}>
                <ShieldCheck size={20} color={PURPLE} />
                <View style={{ flex: 1 }}>
                  <Text style={s.sentBannerText}>Code sent to</Text>
                  <Text style={s.sentBannerEmail} numberOfLines={1}>{email}</Text>
                </View>
              </View>

              {/* Delayed Spam/Junk hint (appears after 15s) */}
              {countdown <= 105 && (
                <View style={s.spamHintRow}>
                  <Ionicons name="information-circle-outline" size={15} color="#64748B" />
                  <Text style={s.spamHintText}>
                    Didn't receive email? Check your <Text style={{ fontWeight: '700', color: TEXT_MID }}>Spam</Text> or Junk folder.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[s.mainBtnWrap, (!otpFilled || verifyLoading) && { opacity: 0.7 }]}
                onPress={handleVerify}
                disabled={!otpFilled || verifyLoading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[PURPLE, PURPLE_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.mainBtn}>
                  {verifyLoading ? (
                    <ActivityIndicator color={WHITE} />
                  ) : (
                    <View style={s.btnInner}>
                      <Text style={s.btnText}>Verify & Continue</Text>
                      <ArrowRightIcon />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  topSection: {
    width: '100%',
    position: 'relative',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
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
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -50,
    right: -40,
  },
  decorCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: -30,
    left: -25,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
  },
  logoImageContainer: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  scrollContent: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 24 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, marginTop: 4 },
  welcomeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PURPLE },
  welcomeBack: { color: PURPLE, fontSize: 14, fontWeight: '700' },
  bigTitle: { color: TEXT_DARK, fontSize: 26, fontWeight: '800', lineHeight: 34, marginBottom: 12 },
  subtitle: { color: TEXT_DARK, fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 18, opacity: 0.7 },
  errorBox: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  errorText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },
  hostelCard: { flexDirection: 'row', marginBottom: 16, borderWidth: 1, borderColor: BORDER, borderRadius: 14, backgroundColor: WHITE, overflow: 'hidden' },
  hostelAccentBar: { width: 4, backgroundColor: PURPLE },
  hostelInfo: { flex: 1, justifyContent: 'center', padding: 14, paddingLeft: 12 },
  hostelLabel: { color: TEXT_MID, fontSize: 11, fontWeight: '600', marginBottom: 2, textTransform: 'uppercase' },
  hostelName: { color: TEXT_DARK, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  locationText: { color: TEXT_MID, fontSize: 12 },
  hostelCardRight: { alignItems: 'flex-end', justifyContent: 'space-between', padding: 14 },
  changeBtnContainer: { marginBottom: 10 },
  changeText: { color: PURPLE, fontSize: 13, fontWeight: '900' },
  connectKeyBanner: { backgroundColor: '#EEF2FF', padding: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#C7D2FE', alignItems: 'center' },
  connectKeyText: { color: PURPLE, fontWeight: '800', fontSize: 13 },
  emailCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, height: 58, marginBottom: 14 },
  emailCardFocused: { borderColor: PURPLE },
  emailInput: { flex: 1, height: '100%', fontSize: 15, color: TEXT_DARK, fontWeight: '500' },
  emailLabel: { fontSize: 11, color: HINT_COLOR, fontWeight: '500', marginBottom: 2 },
  emailValue: { fontSize: 15, color: TEXT_DARK, fontWeight: '600' },
  editLink: { color: PURPLE, fontSize: 14, fontWeight: '700' },
  otpHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  otpLabel: { color: TEXT_DARK, fontSize: 14, fontWeight: '700' },
  resendText: { color: PURPLE, fontSize: 13, fontWeight: '700' },
  resendDisabled: { color: HINT_COLOR },
  otpBoxRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  otpBox: { flex: 1, height: 58, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, fontSize: 22, fontWeight: '700', color: TEXT_DARK, backgroundColor: '#FAFAFC' },
  otpBoxFilled: { borderColor: PURPLE, backgroundColor: PURPLE_SOFT, color: PURPLE },
  otpBoxError: { borderColor: '#EF4444', backgroundColor: '#FEE2E2', color: '#EF4444' },
  sentBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: PURPLE_SOFT, borderRadius: 12, borderWidth: 1, borderColor: '#E2D9FF', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  sentBannerText: { color: TEXT_MID, fontSize: 12 },
  sentBannerEmail: { color: TEXT_DARK, fontSize: 13, fontWeight: '700' },
  spamHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  spamHintText: {
    fontSize: 12,
    color: '#64748B',
    flexShrink: 1,
  },
  mainBtnWrap: { borderRadius: 14, marginBottom: 14 },
  mainBtn: { borderRadius: 16, height: 58, justifyContent: 'center', alignItems: 'center' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: { color: WHITE, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
