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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useToast } from '../context/ToastContext';
import { colors } from '../theme';

const { width } = Dimensions.get('window');

const PURPLE       = colors.primary;       // #6D4AFF
const PURPLE_DARK  = colors.primaryDark;   // #5B39E0
const PURPLE_SOFT  = colors.primarySoft;   // #F4F1FF
const WHITE        = '#FFFFFF';
const TEXT_DARK    = '#0D1B3E';
const TEXT_MID     = '#4A5568';
const BORDER       = '#E2E8F0';
const HINT_COLOR   = '#A0AEC0';
const GREEN        = '#22C55E';
const GREEN_BG     = '#F0FDF4';
const GREEN_BORDER = '#BBF7D0';

// ── Icons ─────────────────────────────────────────────────────────────────────
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

const EyeOffIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={TEXT_MID} strokeWidth={2} strokeLinecap="round" fill="none" />
    <Line x1="1" y1="1" x2="23" y2="23" stroke={TEXT_MID} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const EyeIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={TEXT_MID} strokeWidth={2} fill="none" />
    <Circle cx={12} cy={12} r={3} stroke={TEXT_MID} strokeWidth={2} fill="none" />
  </Svg>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }: any) {
  const { signInOtp, verifyOtp, connectedHostel, disconnectHostel } = useAuth();
  const { showError, showSuccess } = useToast();

  const [email, setEmail]               = useState('');
  const [sendLoading, setSendLoading]   = useState(false);
  const [otpSent, setOtpSent]           = useState(false);
  const [otp, setOtp]                   = useState<string[]>(['', '', '', '', '', '']);
  const [hideOtp, setHideOtp]           = useState(false);
  const [countdown, setCountdown]       = useState(120);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [emailError, setEmailError]     = useState('');
  const [otpError, setOtpError]         = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

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
    const isEmail = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(val);
    if (!isEmail) { setEmailError('Please enter a valid email address'); return; }
    setEmailError('');
    setSendLoading(true);
    const res = await signInOtp(val);
    setSendLoading(false);
    if (res.error) {
      showError(res.error);
    } else {
      showSuccess('OTP sent successfully!');
      setOtpSent(true);
      setCountdown(120);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    }
  };

  const handleOtpChange = (val: string, index: number) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
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
    const res = await signInOtp(email.trim());
    setSendLoading(false);
    if (!res.error) {
      showSuccess('OTP resent successfully!');
      setCountdown(120);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } else {
      showError(res.error);
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { showError('Please enter all 6 digits'); return; }
    setVerifyLoading(true);
    const res = await verifyOtp(email.trim(), code);
    setVerifyLoading(false);
    if (res.error) {
      showError(res.error);
      setOtpError(true);
    } else {
      setOtpError(false);
      showSuccess('Logged in successfully!');
      if (res.isNewUser) {
        navigation.replace('RegistrationScreen', { identifier: res.data?.identifier, hostel_id: res.data?.hostel_id });
      }
    }
  };

  const otpFilled = otp.every(d => d !== '');
  const countdownStr = `${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(countdown % 60).padStart(2, '0')}`;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={[PURPLE, PURPLE_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerSection}
      >
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={s.topRow}>
            <View />
            <TouchableOpacity style={s.helpBtn} activeOpacity={0.7} onPress={() => navigation.navigate('HelpScreen')}>
              <Text style={s.helpText}>Need help?</Text>
              <HeadphoneIcon />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={s.logoSection}>
          <View style={s.logoGlowRing}>
            <HostixLogo />
          </View>
          <Text style={s.brandName}>HOSTIX</Text>
          <View style={s.taglineRow}>
            <View style={s.taglineLine} />
            <Text style={s.tagline}>SMART HOSTEL LIVING</Text>
            <View style={s.taglineLine} />
          </View>
        </View>

        <View style={s.waveContainer}>
          <Svg width={width} height={54} viewBox={`0 0 ${width} 54`} preserveAspectRatio="none">
            <Path d={`M0,0 Q${width / 2},54 ${width},0 L${width},54 L0,54 Z`} fill={WHITE} />
          </Svg>
        </View>
      </LinearGradient>

      {/* ── WHITE BODY ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Greeting */}
          <View style={s.welcomeRow}>
            <View style={s.welcomeDot} />
            <Text style={s.welcomeBack}>Welcome back! 👋</Text>
          </View>
          <Text style={s.bigTitle}>Let's get you connected!</Text>

          {/* ── HOSTEL CARD ── */}
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
                  <Text style={s.changeText}>Change</Text>
                </TouchableOpacity>
                <VerifiedBadge />
              </View>
            </View>
          ) : null}

          <Text style={s.subtitle}>Enter your email to receive a 6-digit code.</Text>

          {/* ── Phase 1: Email Input ── */}
          {!otpSent ? (
            <>
              <View style={[s.emailCard, emailFocused && s.emailCardFocused, emailError ? { borderColor: '#EF4444' } : null]}>
                <MailIcon />
                <TextInput
                  style={s.emailInput}
                  placeholder="example@gmail.com"
                  placeholderTextColor={HINT_COLOR}
                  value={email}
                  onChangeText={t => { setEmail(t); setEmailError(''); }}
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
                      <Text style={s.btnText}>Send OTP</Text>
                      <ArrowRightIcon />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* ── Email confirmed card ── */}
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

              {/* ── OTP Header ── */}
              <View style={s.otpHeaderRow}>
                <Text style={s.otpLabel}>Enter 6-digit code</Text>
                <TouchableOpacity onPress={handleResend} disabled={countdown > 0} activeOpacity={0.7}>
                  <Text style={[s.resendText, countdown > 0 && s.resendDisabled]}>
                    {countdown > 0 ? `Resend (${countdownStr})` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── 6 OTP Boxes ── */}
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
                    value={hideOtp && digit ? '•' : digit}
                    onChangeText={val => handleOtpChange(val, i)}
                    onKeyPress={e => handleOtpKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                    caretHidden={false}
                  />
                ))}
              </View>

              {/* Hide OTP toggle */}
              <TouchableOpacity style={s.hideOtpRow} onPress={() => setHideOtp(h => !h)} activeOpacity={0.7}>
                {hideOtp ? <EyeIcon /> : <EyeOffIcon />}
                <Text style={s.hideOtpText}>{hideOtp ? 'Show OTP' : 'Hide OTP'}</Text>
              </TouchableOpacity>

              {/* Sent banner */}
              <View style={s.sentBanner}>
                <ShieldCheck size={20} color={PURPLE} />
                <View style={{ flex: 1 }}>
                  <Text style={s.sentBannerText}>Code sent to</Text>
                  <Text style={s.sentBannerEmail} numberOfLines={1} adjustsFontSizeToFit>{email}</Text>
                </View>
              </View>

              {/* Verify button */}
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

              {/* Secure card */}
              <View style={s.secureCard}>
                <View style={s.secureCircle}>
                  <ShieldCheck size={24} color={PURPLE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.secureTitle}>Secure & Private</Text>
                  <Text style={s.secureDesc}>100% safe & encrypted.</Text>
                </View>
              </View>
            </>
          )}

          <View style={s.homeBar} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },

  // Header
  headerSection: {},
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  helpBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  helpText: { color: WHITE, fontSize: 13, fontWeight: '600' },
  logoSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 28 },
  logoGlowRing: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  brandName: { color: WHITE, fontSize: 30, fontWeight: '900', letterSpacing: 8, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed' },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  taglineLine: { width: 28, height: 1.5, backgroundColor: 'rgba(255,255,255,0.45)' },
  tagline: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600', letterSpacing: 2.5 },
  waveContainer: { marginTop: 0 },

  // Body
  scrollContent: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16 },

  // Welcome
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, marginTop: 4 },
  welcomeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PURPLE },
  welcomeBack: { color: PURPLE, fontSize: 14, fontWeight: '700' },
  bigTitle: { color: TEXT_DARK, fontSize: 26, fontWeight: '800', lineHeight: 34, marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { color: TEXT_DARK, fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 18, opacity: 0.7 },

  // Hostel card
  hostelCard: { flexDirection: 'row', marginBottom: 16, borderWidth: 1, borderColor: BORDER, borderRadius: 14, backgroundColor: WHITE, overflow: 'hidden' },
  hostelAccentBar: { width: 4, backgroundColor: PURPLE },
  hostelInfo: { flex: 1, justifyContent: 'center', padding: 14, paddingLeft: 12 },
  hostelLabel: { color: TEXT_MID, fontSize: 11, fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  hostelName: { color: TEXT_DARK, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  locationText: { color: TEXT_MID, fontSize: 12 },
  hostelCardRight: { alignItems: 'flex-end', justifyContent: 'space-between', padding: 14 },
  changeBtnContainer: { marginBottom: 10 },
  changeText: { color: PURPLE, fontSize: 13, fontWeight: '900' },

  // Email card
  emailCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, paddingHorizontal: 16, height: 58, marginBottom: 14,
  },
  emailCardFocused: {
    borderColor: PURPLE,
  },
  emailInput: { flex: 1, height: '100%', fontSize: 15, color: TEXT_DARK, fontWeight: '500' },
  emailLabel: { fontSize: 11, color: HINT_COLOR, fontWeight: '500', marginBottom: 2 },
  emailValue: { fontSize: 15, color: TEXT_DARK, fontWeight: '600' },
  editLink: { color: PURPLE, fontSize: 14, fontWeight: '700' },

  // OTP section
  otpHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  otpLabel: { color: TEXT_DARK, fontSize: 14, fontWeight: '700' },
  resendText: { color: PURPLE, fontSize: 13, fontWeight: '700' },
  resendDisabled: { color: HINT_COLOR },

  otpBoxRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  otpBox: {
    flex: 1, height: 58, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 12, fontSize: 22, fontWeight: '700', color: TEXT_DARK,
    backgroundColor: '#FAFAFC',
  },
  otpBoxFilled: {
    borderColor: PURPLE,
    backgroundColor: PURPLE_SOFT,
    color: PURPLE,
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
    color: '#EF4444',
  },

  hideOtpRow: { flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginBottom: 14 },
  hideOtpText: { color: TEXT_MID, fontSize: 13, fontWeight: '500' },

  // Sent banner
  sentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: PURPLE_SOFT, borderRadius: 12,
    borderWidth: 1, borderColor: colors.primaryBorder,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  sentBannerText: { color: TEXT_DARK, fontSize: 12, lineHeight: 18 },
  sentBannerEmail: { color: PURPLE, fontWeight: '700', fontSize: 14, marginTop: 2 },

  // Button
  mainBtnWrap: {
    borderRadius: 16, marginBottom: 14,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  mainBtn: { borderRadius: 16, height: 58, justifyContent: 'center', alignItems: 'center' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: { color: WHITE, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  // Secure card
  secureCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: PURPLE_SOFT, borderWidth: 1, borderColor: colors.primaryBorder,
    borderRadius: 16, padding: 16, marginBottom: 0,
  },
  secureCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: WHITE,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  secureTitle: { color: PURPLE, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  secureDesc: { color: TEXT_MID, fontSize: 12 },

  homeBar: { width: 120, height: 4, borderRadius: 2, backgroundColor: TEXT_DARK, alignSelf: 'center', marginTop: 20, opacity: 0.18 },
});
