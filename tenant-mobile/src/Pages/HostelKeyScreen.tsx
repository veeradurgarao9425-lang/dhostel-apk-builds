import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  Path,
  Rect,
  Circle,
  Line,
  Polyline,
  G,
} from 'react-native-svg';
import { useToast } from '../context/ToastContext';

const { width, height } = Dimensions.get('window');

// ─── Exact colors from reference image ───────────────────────────────────────
const BLUE = '#2245D4';        // main royal blue
const BLUE_DARK = '#1A35B0';   // darker blue for depth
const BLUE_LIGHT_BG = '#EEF3FF'; // light blue circle behind shield
const WHITE = '#FFFFFF';
const TEXT_DARK = '#0D1B3E';    // near-black heading
const TEXT_MID = '#4A5568';     // gray subtitle
const TEXT_BLUE = '#2245D4';    // blue "Welcome back!" text
const BORDER = '#E2E8F0';       // card border
const INPUT_HINT = '#A0AEC0';   // placeholder gray
const SHIELD_CIRCLE_BG = '#DDE8FF'; // blue tint circle behind shield in card

// ─── House + keyhole SVG logo ────────────────────────────────────────────────
const HostixLogo = () => (
  <Svg width={90} height={90} viewBox="0 0 90 90" fill="none">
    {/* Roof */}
    <Path
      d="M10 42 L45 8 L80 42"
      stroke={WHITE}
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Chimney left side */}
    <Rect x={28} y={14} width={10} height={14} rx={2} fill={WHITE} />
    {/* House body */}
    <Rect x={15} y={40} width={60} height={40} rx={3} fill={WHITE} />
    {/* Left window */}
    <Rect x={20} y={46} width={14} height={12} rx={2} fill={BLUE} />
    <Line x1="27" y1="46" x2="27" y2="58" stroke={WHITE} strokeWidth={1.5} />
    <Line x1="20" y1="52" x2="34" y2="52" stroke={WHITE} strokeWidth={1.5} />
    {/* Right window */}
    <Rect x={56} y={46} width={14} height={12} rx={2} fill={BLUE} />
    <Line x1="63" y1="46" x2="63" y2="58" stroke={WHITE} strokeWidth={1.5} />
    <Line x1="56" y1="52" x2="70" y2="52" stroke={WHITE} strokeWidth={1.5} />
    {/* Door arch area (H shape of HOSTIX) */}
    <Rect x={37} y={56} width={16} height={24} rx={0} fill={BLUE} />
    {/* Keyhole circle */}
    <Circle cx={45} cy={64} r={5} fill={WHITE} />
    {/* Keyhole stem */}
    <Path
      d="M43 68 L43 74 L47 74 L47 68"
      fill={WHITE}
    />
  </Svg>
);

// ─── Key icon for input field ─────────────────────────────────────────────────
const KeyIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx={8} cy={8} r={5} stroke={BLUE} strokeWidth={2} fill="none" />
    <Line x1="11.5" y1="11.5" x2="20" y2="20" stroke={BLUE} strokeWidth={2} strokeLinecap="round" />
    <Line x1="17" y1="18" x2="19" y2="16" stroke={BLUE} strokeWidth={2} strokeLinecap="round" />
    <Line x1="15" y1="20" x2="17" y2="18" stroke={BLUE} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ─── Shield with check icon ──────────────────────────────────────────────────
const ShieldCheck = ({ size = 24, color = BLUE }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L4 5V11C4 15.4 7.4 19.5 12 21C16.6 19.5 20 15.4 20 11V5L12 2Z"
      stroke={color}
      strokeWidth={1.8}
      fill="none"
      strokeLinejoin="round"
    />
    <Polyline
      points="9,12 11,14 15,10"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

// ─── Headphone icon ──────────────────────────────────────────────────────────
const HeadphoneIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 18V12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12V18"
      stroke={WHITE}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Rect x={2} y={16} width={4} height={6} rx={2} fill={WHITE} />
    <Rect x={18} y={16} width={4} height={6} rx={2} fill={WHITE} />
  </Svg>
);

// ─── Arrow right ─────────────────────────────────────────────────────────────
const ArrowRightIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Line x1="5" y1="12" x2="19" y2="12" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" />
    <Polyline points="13,6 19,12 13,18" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const HostelKeyScreen = () => {
  const [key, setKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<any>();
  const { connectHostel } = useAuth();
  const { showError, showSuccess } = useToast();

  useFocusEffect(
    useCallback(() => {
      setKey('');
    }, [])
  );

  const handleConnect = async () => {
    if (key.length < 3) {
      showError('Please enter a valid Portal Key.');
      return;
    }
    setIsLoading(true);
    const { error, data } = await connectHostel(key.toUpperCase());
    setIsLoading(false);
    if (error) {
      showError(error);
    } else {
      showSuccess(`Successfully connected to ${data?.hostel_name}.`);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── BLUE HEADER SECTION ── */}
      <View style={styles.headerSection}>
        {/* Need help? — top right */}
        <SafeAreaView edges={['top']} style={styles.safeTop}>
          <View style={styles.topRow}>
            <View />
            <TouchableOpacity style={styles.helpBtn} activeOpacity={0.7} onPress={() => navigation.navigate('HelpScreen')}>
              <Text style={styles.helpText}>Need help?</Text>
              <HeadphoneIcon />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Logo + brand */}
        <View style={styles.logoSection}>
          <HostixLogo />
          <Text style={styles.brandName}>HOSTIX</Text>
          <View style={styles.taglineRow}>
            <View style={styles.taglineLine} />
            <Text style={styles.tagline}>SMART HOSTEL LIVING</Text>
            <View style={styles.taglineLine} />
          </View>
        </View>

        {/* Curved bottom wave */}
        <View style={styles.waveContainer}>
          <Svg
            width={width}
            height={54}
            viewBox={`0 0 ${width} 54`}
            preserveAspectRatio="none"
          >
            <Path
              d={`M0,0 Q${width / 2},54 ${width},0 L${width},54 L0,54 Z`}
              fill={WHITE}
            />
          </Svg>
        </View>
      </View>

      {/* ── WHITE BODY SECTION ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.bodyFlex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome back */}
          <Text style={styles.welcomeBack}>Welcome back! 👋</Text>

          {/* Big heading */}
          <Text style={styles.bigTitle}>Let's get you{' '}connected!</Text>

          {/* Subtitle — short */}
          <Text style={styles.subtitle}>Enter your Portal Key to continue.</Text>

          {/* Input field */}
          <View style={styles.inputCard}>
            <KeyIcon />
            <TextInput
              style={styles.inputField}
              placeholder="Enter Portal Key"
              placeholderTextColor={INPUT_HINT}
              value={key}
              onChangeText={(t) => setKey(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
            <Text style={styles.inputHint}>e.g. HX9A2B</Text>
          </View>

          {/* Connect button */}
          <TouchableOpacity
            style={[styles.connectBtn, (key.length < 3 || isLoading) && { opacity: 0.75 }]}
            onPress={handleConnect}
            disabled={key.length < 3 || isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <View style={styles.btnInner}>
                <Text style={styles.btnText}>Connect to Portal</Text>
                <ArrowRightIcon />
              </View>
            )}
          </TouchableOpacity>

          {/* Secure & Private card */}
          <View style={styles.secureCard}>
            <View style={styles.shieldCircle}>
              <ShieldCheck size={26} color={BLUE} />
            </View>
            <View style={styles.secureTexts}>
              <Text style={styles.secureTitle}>Secure &amp; Private</Text>
              <Text style={styles.secureDesc}>100% safe &amp; encrypted.</Text>
            </View>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            {/* Divider */}
            <View style={styles.footerDivider} />

            {/* Version */}
            <Text style={styles.footerVersion}>Version 1.0.0</Text>

            {/* Links */}
            <View style={styles.footerLinks}>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <View style={styles.footerDot} />
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.footerLink}>Terms &amp; Conditions</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.poweredRow}>
              <Text style={styles.poweredBy}>Powered by </Text>
              <Text style={styles.poweredHost}>Host</Text>
              <Text style={styles.poweredEx}>ex</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WHITE,
  },

  // ── Header ──
  headerSection: {
    backgroundColor: BLUE,
    paddingBottom: 0,
  },
  safeTop: {
    backgroundColor: 'transparent',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 4,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Logo ──
  logoSection: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 28,
  },
  brandName: {
    color: WHITE,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 8,
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed',
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  taglineLine: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 2.5,
  },

  // ── Wave ──
  waveContainer: {
    marginTop: 0,
  },

  // ── Body ──
  bodyFlex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },

  // ── Text content ──
  welcomeBack: {
    color: BLUE,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  bigTitle: {
    color: TEXT_DARK,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: TEXT_MID,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 22,
  },

  // ── Input ──
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderWidth: 1.2,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 54,
    marginBottom: 14,
    gap: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: TEXT_DARK,
    fontWeight: '500',
  },
  inputHint: {
    fontSize: 13,
    color: INPUT_HINT,
    fontWeight: '500',
  },

  // ── Connect button ──
  connectBtn: {
    backgroundColor: BLUE,
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Secure card ──
  secureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderWidth: 1.2,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 16,
    marginBottom: 0,
    gap: 14,
  },
  shieldCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: SHIELD_CIRCLE_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secureTexts: {
    flex: 1,
  },
  secureTitle: {
    color: BLUE,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  secureDesc: {
    color: TEXT_MID,
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 12,
    gap: 8,
  },
  footerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 4,
  },
  footerVersion: {
    color: '#B0BAC9',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerLink: {
    color: '#6B7A90',
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#B0BAC9',
  },
  // ── Powered by ──
  poweredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poweredBy: {
    color: '#9AA5B4',
    fontSize: 12,
    fontWeight: '400',
  },
  poweredHost: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '700',
  },
  poweredEx: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Trusted row ──
  trustedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 10,
  },
  trustedText: {
    color: TEXT_MID,
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Home bar ──
  homeBar: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: TEXT_DARK,
    alignSelf: 'center',
    marginTop: 12,
    opacity: 0.18,
  },
});
