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
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Svg,
  Path,
  Rect,
  Circle,
  Line,
  Polyline,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const PURPLE      = '#7C3AED';       
const PURPLE_DARK = '#5F2EEA';   
const PURPLE_SOFT = '#F4F1FF';   
const WHITE       = '#FFFFFF';
const TEXT_DARK   = '#0D1B3E';
const TEXT_MID    = '#4A5568';
const BORDER      = '#E2E8F0';
const INPUT_HINT  = '#A0AEC0';

const HostixLogo = () => (
  <Svg width={90} height={90} viewBox="0 0 90 90" fill="none">
    <Path
      d="M10 42 L45 8 L80 42"
      stroke={WHITE}
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
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

const KeyIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx={8} cy={8} r={5} stroke={PURPLE} strokeWidth={2} fill="none" />
    <Line x1="11.5" y1="11.5" x2="20" y2="20" stroke={PURPLE} strokeWidth={2} strokeLinecap="round" />
    <Line x1="17" y1="18" x2="19" y2="16" stroke={PURPLE} strokeWidth={2} strokeLinecap="round" />
    <Line x1="15" y1="20" x2="17" y2="18" stroke={PURPLE} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

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

const HeadphoneIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M3 18V12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12V18" stroke={WHITE} strokeWidth={2} strokeLinecap="round" />
    <Rect x={2} y={16} width={4} height={6} rx={2} fill={WHITE} />
    <Rect x={18} y={16} width={4} height={6} rx={2} fill={WHITE} />
  </Svg>
);

const ArrowRightIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Line x1="5" y1="12" x2="19" y2="12" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" />
    <Polyline points="13,6 19,12 13,18" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

export function TenantHostelKeyScreen() {
  const insets = useSafeAreaInsets();
  const [key, setKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigation = useNavigation<any>();
  const { connectHostel } = useAuth();

  useFocusEffect(
    useCallback(() => {
      setKey('');
      setErrorMessage(null);
    }, [])
  );

  const handleConnect = async () => {
    if (key.length < 3) {
      setErrorMessage('Please enter a valid Portal Key.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    const { error, data } = await connectHostel(key.toUpperCase());
    setIsLoading(false);
    if (error) {
      setErrorMessage(error);
    } else {
      navigation.navigate('TenantLogin');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Purple Gradient Header Matching Login / Brand ── */}
      <View
        style={[
          styles.topSection,
          {
            height: Math.max(Math.min(Dimensions.get('window').height * 0.32 + (insets.top > 0 ? insets.top : 0), Dimensions.get('window').height * 0.35), 180),
          },
        ]}
      >
        <LinearGradient
          colors={['#7C3AED', '#5F2EEA']}
          style={[
            StyleSheet.absoluteFillObject,
            styles.topSectionContent,
            { paddingTop: insets.top > 0 ? insets.top + 8 : 24 },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Back Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { top: insets.top > 0 ? insets.top + 10 : 20 }]}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Decorative background circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <View style={styles.logoWrapper}>
            <View style={styles.logoImageContainer}>
              <Image
                source={require('../../../assets/HostixNew.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.appName}>
              Host<Text style={{ color: '#FCD34D' }}>ix</Text>
            </Text>
            <Text style={styles.tagline}>Tenant Portal</Text>
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.bodyFlex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeDot} />
            <Text style={styles.welcomeBack}>Welcome Resident! 👋</Text>
          </View>

          <Text style={styles.bigTitle}>Connect to your Hostel!</Text>
          <Text style={styles.subtitle}>Enter your Portal Key provided by your hostel owner.</Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

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

          <View style={styles.secureCard}>
            <View style={styles.shieldCircle}>
              <ShieldCheck size={26} color={PURPLE} />
            </View>
            <View style={styles.secureTexts}>
              <Text style={styles.secureTitle}>Secure & Private</Text>
              <Text style={styles.secureDesc}>Your data is 100% encrypted and safe.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  bodyFlex: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, marginTop: 4 },
  welcomeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PURPLE },
  welcomeBack: { color: PURPLE, fontSize: 14, fontWeight: '700' },
  bigTitle: { color: TEXT_DARK, fontSize: 26, fontWeight: '800', lineHeight: 34, marginBottom: 8 },
  subtitle: { color: TEXT_MID, fontSize: 14, lineHeight: 22, marginBottom: 24 },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },
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
  inputCardFocused: { borderColor: PURPLE },
  inputField: { flex: 1, fontSize: 16, color: TEXT_DARK, fontWeight: '600', letterSpacing: 1 },
  connectBtnWrap: { borderRadius: 16, marginBottom: 16 },
  connectBtn: { borderRadius: 16, height: 58, justifyContent: 'center', alignItems: 'center' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: { color: WHITE, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  secureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE_SOFT,
    borderWidth: 1,
    borderColor: '#E2D9FF',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  shieldCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: WHITE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secureTexts: { flex: 1 },
  secureTitle: { color: PURPLE, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  secureDesc: { color: TEXT_MID, fontSize: 12, lineHeight: 18 },
});
