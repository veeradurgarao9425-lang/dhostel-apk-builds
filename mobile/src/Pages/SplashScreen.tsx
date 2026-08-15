import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONT } from '../theme/index';
import { ONBOARDING_KEY } from './OnboardingScreen';

// While developing, always show the intro on a cold start so you don't have to
// reinstall to see it. In production builds (__DEV__ === false) this has no
// effect — the intro stays "once per device". Flip to false to test the
// once-per-device behavior inside a dev build too.
const ALWAYS_SHOW_INTRO_IN_DEV = true;



// ─── Component ────────────────────────────────────────────────────────────────
export default function SplashScreen({ navigation }: any) {
  const { user, loading } = useAuth();

  // Animated dots pulse effect
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createPulse = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createPulse(dot1, 0);
    const anim2 = createPulse(dot2, 200);
    const anim3 = createPulse(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      if (user) {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        return;
      }

      if (__DEV__ && ALWAYS_SHOW_INTRO_IN_DEV) {
        try { await AsyncStorage.removeItem(ONBOARDING_KEY); } catch { /* ignore */ }
      }

      let seenIntro = false;
      try {
        seenIntro = (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
      } catch {
        /* treat as not-seen on read failure */
      }
      if (cancelled) return;
      navigation.replace(seenIntro ? 'Login' : 'Onboarding');
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigation, user, loading]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd, COLORS.primaryDark]}
        style={styles.gradient}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      >
        <View style={styles.content}>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
                source={require('../../assets/HostixNew.jpeg')}
                style={{ width: '100%', height: '100%', borderRadius: 28 }}
                resizeMode="cover"
            />
          </View>

          {/* App name */}
          <Text style={styles.appName}>Host<Text style={{ color: '#FCD34D' }}>ix</Text></Text>
          <Text style={styles.tagline}>Smart PG Management</Text>

          {/* Animated dots */}
          <View style={styles.dotsContainer}>
            {[dot1, dot2, dot3].map((dotAnim, i) => (
              <Animated.View
                key={i}
                style={[styles.dot, { opacity: dotAnim, transform: [{ scale: dotAnim }] }]}
              />
            ))}
          </View>

        </View>

        {/* Footer */}
        <Text style={styles.footer}>Powered by Hostix</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    // Glass effect border
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  appName: {
    fontSize: FONT.xxxl + 4,
    fontWeight: FONT.black,
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: FONT.md,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FONT.medium,
    letterSpacing: 0.5,
    marginBottom: 60,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    textAlign: 'center',
    fontSize: FONT.sm,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: FONT.medium,
  },
});
