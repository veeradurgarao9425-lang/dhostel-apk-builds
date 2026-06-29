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
import Svg, { Path, Rect, Circle, Line, Polyline, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

// ── Colors ───────────────────────────────────────────────────────────────────
const BLUE       = '#2245D4';
const WHITE      = '#FFFFFF';
const TEXT_DARK  = '#0D1B3E';
const TEXT_MID   = '#4A5568';
const TEXT_BLUE  = '#2245D4';
const BORDER     = '#E2E8F0';
const HINT_COLOR = '#A0AEC0';
const LIGHT_BLUE_BG = '#EEF4FF';
const GREEN      = '#22C55E';
const GREEN_BG   = '#F0FDF4';
const GREEN_BORDER = '#BBF7D0';

// ── Icons ─────────────────────────────────────────────────────────────────────
const HostixLogo = () => (
  <Svg width={90} height={90} viewBox="0 0 90 90" fill="none">
    <Path d="M10 42 L45 8 L80 42" stroke={WHITE} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <Rect x={28} y={14} width={10} height={14} rx={2} fill={WHITE} />
    <Rect x={15} y={40} width={60} height={40} rx={3} fill={WHITE} />
    <Rect x={20} y={46} width={14} height={12} rx={2} fill={BLUE} />
    <Line x1="27" y1="46" x2="27" y2="58" stroke={WHITE} strokeWidth={1.5} />
    <Line x1="20" y1="52" x2="34" y2="52" stroke={WHITE} strokeWidth={1.5} />
    <Rect x={56} y={46} width={14} height={12} rx={2} fill={BLUE} />
    <Line x1="63" y1="46" x2="63" y2="58" stroke={WHITE} strokeWidth={1.5} />
    <Line x1="56" y1="52" x2="70" y2="52" stroke={WHITE} strokeWidth={1.5} />
    <Rect x={37} y={56} width={16} height={24} rx={0} fill={BLUE} />
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

const BuildingIcon = () => (
  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: LIGHT_BLUE_BG, justifyContent: 'center', alignItems: 'center' }}>
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L3 7V22H21V7L12 2Z" stroke={BLUE} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M9 22V12H15V22" stroke={BLUE} strokeWidth={1.5} strokeLinejoin="round" />
      <Rect x={7} y={10} width={3} height={3} fill={BLUE} />
      <Rect x={14} y={10} width={3} height={3} fill={BLUE} />
      <Rect x={7} y={15} width={3} height={3} fill={BLUE} />
      <Rect x={14} y={15} width={3} height={3} fill={BLUE} />
      <Line x1="12" y1="2" x2="12" y2="7" stroke={BLUE} strokeWidth={1.5} />
    </Svg>
  </View>
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

const ShieldCheck = ({ size = 22, color = BLUE }: { size?: number; color?: string }) => (
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

  // Phase 1: email entry
  const [email, setEmail]         = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError]   = useState('');

  // Phase 2: OTP entry (shown below after OTP sent)
  const [otpSent, setOtpSent]       = useState(false);
  const [otp, setOtp]               = useState<string[]>(['', '', '', '', '', '']);
  const [hideOtp, setHideOtp]       = useState(false);
  const [countdown, setCountdown]   = useState(30);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError]     = useState('');

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // countdown timer
  useEffect(() => {
    if (!otpSent) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpSent, countdown]);

  // ── Send OTP ──────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!email.trim()) { setSendError('Please enter your email address'); return; }
    setSendLoading(true);
    setSendError('');
    const res = await signInOtp(email.trim());
    setSendLoading(false);
    if (res.error) {
      setSendError(res.error);
    } else {
      setOtpSent(true);
      setCountdown(30);
      setOtp(['', '', '', '', '', '']);
      setVerifyError('');
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    }
  };

  // ── OTP box input handler ─────────────────────────────────────────────────
  const handleOtpChange = (val: string, index: number) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0) return;
    setSendLoading(true);
    const res = await signInOtp(email.trim());
    setSendLoading(false);
    if (!res.error) {
      setCountdown(30);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setVerifyError('Please enter all 6 digits'); return; }
    setVerifyLoading(true);
    setVerifyError('');
    const res = await verifyOtp(email.trim(), code);
    setVerifyLoading(false);
    if (res.error) {
      setVerifyError(res.error);
    } else if (res.isNewUser) {
      navigation.replace('RegistrationScreen', { identifier: res.data?.identifier, hostel_id: res.data?.hostel_id });
    }
    // else: AuthContext swaps stack automatically
  };

  const otpFilled = otp.every(d => d !== '');
  const countdownStr = `${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(countdown % 60).padStart(2, '0')}`;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── BLUE HEADER ── */}
      <View style={s.headerSection}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={s.topRow}>
            <View />
            <TouchableOpacity style={s.helpBtn} activeOpacity={0.7}>
              <Text style={s.helpText}>Need help?</Text>
              <HeadphoneIcon />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={s.logoSection}>
          <HostixLogo />
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
      </View>

      {/* ── WHITE BODY ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Greeting */}
          <Text style={s.welcomeBack}>Welcome back! 👋</Text>
          <Text style={s.bigTitle}>Let's get you connected!</Text>
          
          {/* ── IMAGE-MATCHING HOSTEL CARD ── */}
          {connectedHostel?.hostel_name ? (
            <View style={s.hostelCard}>
              <View style={s.hostelInfo}>
                <Text style={s.hostelLabel}>Connected to</Text>
                <Text style={s.hostelName}>{connectedHostel.hostel_name}</Text>
                <Text style={s.locationText}>
                  {[connectedHostel.address, connectedHostel.city, connectedHostel.state].filter(Boolean).join(', ') || '-'}
                </Text>
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

          {/* ── Phase 1: Email Input (shown when OTP not sent yet) ── */}
          {!otpSent ? (
            <>
              <View style={s.emailCard}>
                <MailIcon />
                <TextInput
                  style={s.emailInput}
                  placeholder="example@gmail.com"
                  placeholderTextColor={HINT_COLOR}
                  value={email}
                  onChangeText={t => { setEmail(t); setSendError(''); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
              {sendError ? <Text style={s.errorText}>{sendError}</Text> : null}

              <TouchableOpacity
                style={[s.mainBtn, (!email.trim() || sendLoading) && { opacity: 0.7 }]}
                onPress={handleSendOtp}
                disabled={!email.trim() || sendLoading}
                activeOpacity={0.85}
              >
                {sendLoading ? (
                  <ActivityIndicator color={WHITE} />
                ) : (
                  <View style={s.btnInner}>
                    <Text style={s.btnText}>Send OTP</Text>
                    <ArrowRightIcon />
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* ── Email confirmed card with Edit ── */}
              <View style={s.emailCard}>
                <MailIcon />
                <View style={{ flex: 1 }}>
                  <Text style={s.emailLabel}>Email Address</Text>
                  <Text style={s.emailValue}>{email}</Text>
                </View>
                <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(['','','','','','']); setVerifyError(''); }} activeOpacity={0.7}>
                  <Text style={s.editLink}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* ── OTP Row header: label left, Resend + HideOTP right ── */}
              <View style={s.otpHeaderRow}>
                <Text style={s.otpLabel}>Enter 6-digit code</Text>
                <View style={s.otpHeaderRight}>
                  <TouchableOpacity onPress={handleResend} disabled={countdown > 0} activeOpacity={0.7}>
                    <Text style={[s.resendText, countdown > 0 && s.resendDisabled]}>
                      Resend OTP ({countdownStr})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── 6 OTP Boxes ── */}
              <View style={s.otpBoxRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={ref => { inputRefs.current[i] = ref; }}
                    style={[s.otpBox, digit ? s.otpBoxFilled : null, i === 0 && !digit ? s.otpBoxActive : null]}
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

              {/* Hide OTP — right aligned */}
              <TouchableOpacity style={s.hideOtpRow} onPress={() => setHideOtp(h => !h)} activeOpacity={0.7}>
                {hideOtp ? <EyeIcon /> : <EyeOffIcon />}
                <Text style={s.hideOtpText}>Hide OTP</Text>
              </TouchableOpacity>

              {/* Sent confirmation banner */}
              <View style={s.sentBanner}>
                <ShieldCheck size={20} color={BLUE} />
                <Text style={s.sentBannerText}>
                  We've sent a 6-digit code to{' '}
                  <Text style={s.sentBannerEmail}>{email}</Text>
                </Text>
              </View>

              {verifyError ? <Text style={s.errorText}>{verifyError}</Text> : null}

              {/* Verify button */}
              <TouchableOpacity
                style={[s.mainBtn, (!otpFilled || verifyLoading) && { opacity: 0.7 }]}
                onPress={handleVerify}
                disabled={!otpFilled || verifyLoading}
                activeOpacity={0.85}
              >
                {verifyLoading ? (
                  <ActivityIndicator color={WHITE} />
                ) : (
                  <View style={s.btnInner}>
                    <Text style={s.btnText}>Verify &amp; Continue</Text>
                    <ArrowRightIcon />
                  </View>
                )}
              </TouchableOpacity>

              {/* Secure card — same style as HostelKey screen */}
              <View style={s.secureCard}>
                <View style={s.secureCircle}>
                  <ShieldCheck size={24} color={BLUE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.secureTitle}>Secure &amp; Private</Text>
                  <Text style={s.secureDesc}>100% safe &amp; encrypted.</Text>
                </View>
              </View>
            </>
          )}

          {/* Home bar */}
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
  headerSection: { backgroundColor: BLUE },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  helpBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  helpText: { color: WHITE, fontSize: 14, fontWeight: '500' },
  logoSection: { alignItems: 'center', paddingTop: 18, paddingBottom: 28 },
  brandName: { color: WHITE, fontSize: 32, fontWeight: '900', letterSpacing: 8, marginTop: 10, fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed' },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  taglineLine: { width: 30, height: 1, backgroundColor: 'rgba(255,255,255,0.55)' },
  tagline: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '500', letterSpacing: 2.5 },
  waveContainer: { marginTop: 0 },

  // Body
  scrollContent: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 16 },

  welcomeBack: { color: BLUE, fontSize: 15, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  bigTitle: { color: TEXT_DARK, fontSize: 26, fontWeight: '800', lineHeight: 34, marginBottom: 10, letterSpacing: -0.5 },
  subtitle: { color: TEXT_MID, fontSize: 13, lineHeight: 20, marginBottom: 18 },

  // Hostel name card (matched to image)
  hostelCard: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, padding: 14, borderWidth: 1.2, borderColor: BORDER, borderRadius: 12, backgroundColor: WHITE },
  hostelInfo: { flex: 1, justifyContent: 'center' },
  hostelLabel: { color: TEXT_MID, fontSize: 12, marginBottom: 2 },
  hostelName: { color: TEXT_DARK, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  locationText: { color: TEXT_MID, fontSize: 12 },
  hostelCardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  changeBtnContainer: { marginBottom: 10 },
  changeText: { color: BLUE, fontSize: 13, fontWeight: '900' },

  // Email card (both phases)
  emailCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderWidth: 1.2, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, height: 58, marginBottom: 14,
  },
  emailInput: { flex: 1, fontSize: 15, color: TEXT_DARK, fontWeight: '500' },
  emailLabel: { fontSize: 11, color: HINT_COLOR, fontWeight: '500', marginBottom: 2 },
  emailValue: { fontSize: 15, color: TEXT_DARK, fontWeight: '600' },
  editLink: { color: BLUE, fontSize: 14, fontWeight: '700' },

  // OTP section
  otpHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  otpHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  otpLabel: { color: TEXT_DARK, fontSize: 14, fontWeight: '700' },
  resendText: { color: BLUE, fontSize: 13, fontWeight: '700' },
  resendDisabled: { color: HINT_COLOR },

  otpBoxRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  otpBox: {
    flex: 1, height: 52, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 10, fontSize: 20, fontWeight: '700', color: TEXT_DARK,
    backgroundColor: WHITE,
  },
  otpBoxFilled: { borderColor: BLUE },
  otpBoxActive: { borderColor: BLUE },

  // Hide OTP — right aligned
  hideOtpRow: { flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginBottom: 14 },
  hideOtpText: { color: TEXT_MID, fontSize: 13, fontWeight: '500' },

  // Sent banner
  sentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: LIGHT_BLUE_BG, borderRadius: 12,
    padding: 14, marginBottom: 16,
  },
  sentBannerText: { flex: 1, color: TEXT_DARK, fontSize: 13, lineHeight: 20 },
  sentBannerEmail: { color: BLUE, fontWeight: '700' },

  // Button
  mainBtn: {
    backgroundColor: BLUE, borderRadius: 14, height: 56,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: { color: WHITE, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  // Secure card (same as HostelKey)
  secureCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: WHITE, borderWidth: 1.2, borderColor: BORDER,
    borderRadius: 14, padding: 16, marginBottom: 0,
  },
  secureCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: LIGHT_BLUE_BG,
    justifyContent: 'center', alignItems: 'center',
  },
  secureTitle: { color: BLUE, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  secureDesc: { color: TEXT_MID, fontSize: 12 },

  // Errors
  errorText: { color: '#E53E3E', fontSize: 13, marginBottom: 10, fontWeight: '500' },

  // Home bar
  homeBar: { width: 120, height: 4, borderRadius: 2, backgroundColor: TEXT_DARK, alignSelf: 'center', marginTop: 16, opacity: 0.18 },
});
