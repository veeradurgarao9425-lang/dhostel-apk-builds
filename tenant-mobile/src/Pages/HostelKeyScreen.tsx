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
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  Svg,
  Path,
  Rect,
  Circle,
  Line,
  Polyline,
  G,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useToast } from '../context/ToastContext';
import { colors } from '../theme';

const { width, height } = Dimensions.get('window');

const PURPLE      = colors.primary;       // #6D4AFF
const PURPLE_DARK = colors.primaryDark;   // #5B39E0
const PURPLE_SOFT = colors.primarySoft;   // #F4F1FF
const WHITE       = '#FFFFFF';
const TEXT_DARK   = '#0D1B3E';
const TEXT_MID    = '#4A5568';
const BORDER      = '#E2E8F0';
const INPUT_HINT  = '#A0AEC0';
const SHIELD_BG   = '#EDE9FF';

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
    {/* Chimney */}
    <Rect x={28} y={14} width={10} height={14} rx={2} fill={WHITE} />
    {/* House body */}
    <Rect x={15} y={40} width={60} height={40} rx={3} fill={WHITE} />
    {/* Left window */}
    <Rect x={20} y={46} width={14} height={12} rx={2} fill={PURPLE} />
    <Line x1="27" y1="46" x2="27" y2="58" stroke={WHITE} strokeWidth={1.5} />
    <Line x1="20" y1="52" x2="34" y2="52" stroke={WHITE} strokeWidth={1.5} />
    {/* Right window */}
    <Rect x={56} y={46} width={14} height={12} rx={2} fill={PURPLE} />
    <Line x1="63" y1="46" x2="63" y2="58" stroke={WHITE} strokeWidth={1.5} />
    <Line x1="56" y1="52" x2="70" y2="52" stroke={WHITE} strokeWidth={1.5} />
    {/* Door */}
    <Rect x={37} y={56} width={16} height={24} rx={0} fill={PURPLE} />
    {/* Keyhole circle */}
    <Circle cx={45} cy={64} r={5} fill={WHITE} />
    {/* Keyhole stem */}
    <Path d="M43 68 L43 74 L47 74 L47 68" fill={WHITE} />
  </Svg>
);

// ─── Key icon ─────────────────────────────────────────────────────────────────
const KeyIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx={8} cy={8} r={5} stroke={PURPLE} strokeWidth={2} fill="none" />
    <Line x1="11.5" y1="11.5" x2="20" y2="20" stroke={PURPLE} strokeWidth={2} strokeLinecap="round" />
    <Line x1="17" y1="18" x2="19" y2="16" stroke={PURPLE} strokeWidth={2} strokeLinecap="round" />
    <Line x1="15" y1="20" x2="17" y2="18" stroke={PURPLE} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ─── Shield check ─────────────────────────────────────────────────────────────
const ShieldCheck = ({ size = 24, color = PURPLE }: { size?: number; color?: string }) => (
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

// ─── Headphone icon ────────────────────────────────────────────────────────────
const HeadphoneIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M3 18V12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12V18" stroke={WHITE} strokeWidth={2} strokeLinecap="round" />
    <Rect x={2} y={16} width={4} height={6} rx={2} fill={WHITE} />
    <Rect x={18} y={16} width={4} height={6} rx={2} fill={WHITE} />
  </Svg>
);

// ─── Arrow right ──────────────────────────────────────────────────────────────
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
  const [inputFocused, setInputFocused] = useState(false);
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
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={[PURPLE, PURPLE_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerSection}
      >
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
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
          {/* Glow ring behind logo */}
          <View style={styles.logoGlowRing}>
            <HostixLogo />
          </View>
          <Text style={styles.brandName}>HOSTIX</Text>
          <View style={styles.taglineRow}>
            <View style={styles.taglineLine} />
            <Text style={styles.tagline}>SMART HOSTEL LIVING</Text>
            <View style={styles.taglineLine} />
          </View>
        </View>

        {/* Curved bottom wave */}
        <View style={styles.waveContainer}>
          <Svg width={width} height={54} viewBox={`0 0 ${width} 54`} preserveAspectRatio="none">
            <Path d={`M0,0 Q${width / 2},54 ${width},0 L${width},54 L0,54 Z`} fill={WHITE} />
          </Svg>
        </View>
      </LinearGradient>

      {/* ── WHITE BODY ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.bodyFlex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome label */}
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeDot} />
            <Text style={styles.welcomeBack}>Welcome back! 👋</Text>
          </View>

          <Text style={styles.bigTitle}>Let's get you{' '}connected!</Text>
          <Text style={styles.subtitle}>Enter your Portal Key provided by your hostel owner.</Text>

          {/* Input field */}
          <View style={[styles.inputCard, inputFocused && styles.inputCardFocused]}>
            <KeyIcon />
            <TextInput
              style={styles.inputField}
              placeholder="Enter Portal Key  (e.g. HX9A2B)"
              placeholderTextColor={INPUT_HINT}
              value={key}
              onChangeText={(t) => setKey(t.toUpperCase())}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
          </View>

          {/* Connect button — gradient */}
          <TouchableOpacity
            style={[styles.connectBtnWrap, (key.length < 3 || isLoading) && { opacity: 0.72 }]}
            onPress={handleConnect}
            disabled={key.length < 3 || isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[PURPLE, PURPLE_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.connectBtn}
            >
              {isLoading ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <View style={styles.btnInner}>
                  <Text style={styles.btnText}>Connect to Portal</Text>
                  <ArrowRightIcon />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Secure & Private card */}
          <View style={styles.secureCard}>
            <View style={styles.shieldCircle}>
              <ShieldCheck size={26} color={PURPLE} />
            </View>
            <View style={styles.secureTexts}>
              <Text style={styles.secureTitle}>Secure & Private</Text>
              <Text style={styles.secureDesc}>Your data is 100% encrypted and safe.</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            <Text style={styles.footerVersion}>Version 1.0.0</Text>
            <View style={styles.footerLinks}>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <View style={styles.footerDot} />
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.footerLink}>Terms & Conditions</Text>
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
    paddingBottom: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  helpText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Logo ──
  logoSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 28,
  },
  logoGlowRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brandName: {
    color: WHITE,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 8,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed',
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  taglineLine: {
    width: 28,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.5,
  },

  // ── Wave ──
  waveContainer: { marginTop: 0 },

  // ── Body ──
  bodyFlex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },

  // ── Text content ──
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    marginTop: 4,
  },
  welcomeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PURPLE,
  },
  welcomeBack: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '700',
  },
  bigTitle: {
    color: TEXT_DARK,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: TEXT_MID,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },

  // ── Input ──
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    gap: 12,
  },
  inputCardFocused: {
    borderColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: TEXT_DARK,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // ── Connect button ──
  connectBtnWrap: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  connectBtn: {
    borderRadius: 16,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: PURPLE_SOFT,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
    gap: 14,
  },
  shieldCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  secureTexts: { flex: 1 },
  secureTitle: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  secureDesc: {
    color: TEXT_MID,
    fontSize: 12,
    lineHeight: 18,
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    marginTop: 24,
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
    color: PURPLE,
    fontSize: 12,
    fontWeight: '700',
  },
  poweredEx: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
});
