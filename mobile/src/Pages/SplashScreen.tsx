import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useDeveloper } from '../../contexts/DeveloperContext';
import { COLORS, FONT } from '../theme/index';
import { ONBOARDING_KEY } from './OnboardingScreen';

const ALWAYS_SHOW_INTRO_IN_DEV = false;

// App name broken down into individual letters
const LETTERS = [
  { char: 'H', highlight: false },
  { char: 'o', highlight: false },
  { char: 's', highlight: false },
  { char: 't', highlight: false },
  { char: 'i', highlight: true },
  { char: 'x', highlight: true },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function SplashScreen({ navigation }: any) {
  const { user, loading: authLoading } = useAuth();
  const { developer, isDeveloperLoggedIn, loading: devLoading } = useDeveloper();
  const insets = useSafeAreaInsets();

  // Animation values for Logo & Container
  const logoAnim = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;

  // Individual animated values for each letter: [H, o, s, t, i, x]
  const letterAnims = useRef(LETTERS.map(() => new Animated.Value(0))).current;

  // Animated dots pulse effect
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  // Run the Netflix-style cinematic reveal
  useEffect(() => {
    // 1. Logo Scale & Fade-in
    Animated.timing(logoAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // 2. Letter animations:
    // 'H' (Letter 0) pops first with impactful spring (like Netflix 'N')
    const firstLetterAnim = Animated.spring(letterAnims[0], {
      toValue: 1,
      friction: 5,
      tension: 65,
      useNativeDriver: true,
    });

    // Remaining letters ('o', 's', 't', 'i', 'x') stagger sequentially
    const remainingLetterAnims = letterAnims.slice(1).map((anim) =>
      Animated.spring(anim, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      })
    );

    // Sequence: First letter -> stagger remaining -> tagline fade up
    Animated.sequence([
      Animated.delay(150),
      firstLetterAnim,
      Animated.stagger(90, remainingLetterAnims),
      Animated.timing(taglineAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Dots pulsating loop
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

  // Navigation redirection after animation
  useEffect(() => {
    if (authLoading || devLoading) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      // 1. Check Developer Session
      if (isDeveloperLoggedIn || developer || user?.role === 'DEVELOPER' || (user as any)?.is_developer) {
        navigation.reset({ index: 0, routes: [{ name: 'DeveloperMain' }] });
        return;
      }

      // 2. Check Standard User Session
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
      navigation.replace(seenIntro ? 'RoleSelect' : 'Onboarding');
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigation, user, developer, isDeveloperLoggedIn, authLoading, devLoading]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd, COLORS.primaryDark]}
        // Clear the gesture-nav bar, then add a fixed breathing gap on top of it
        // so the footer reads as placed rather than pinned to the screen edge.
        style={[styles.gradient, { paddingBottom: Math.max(insets.bottom, 12) + 28 }]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      >
        <View style={styles.content}>
          {/* Logo with scale & fade animation */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoAnim,
                transform: [
                  {
                    scale: logoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.75, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image
              source={require('../../assets/HostixNew.png')}
              style={{ width: '100%', height: '100%', borderRadius: 28 }}
              resizeMode="cover"
            />
          </Animated.View>

          {/* Staggered Letter-by-Letter Animated Name (Netflix Style) */}
          <View style={styles.nameRow}>
            {LETTERS.map((item, index) => {
              const animVal = letterAnims[index];

              // Fade in from transparent to full opacity
              const opacity = animVal;

              // Slide up: starts 22px below and pops into place
              const translateY = animVal.interpolate({
                inputRange: [0, 1],
                outputRange: [22, 0],
              });

              // Bouncy scale: pops slightly larger then settles to 1.0
              const scale = animVal.interpolate({
                inputRange: [0, 0.6, 1],
                outputRange: [index === 0 ? 0.3 : 0.5, 1.25, 1],
              });

              return (
                <Animated.Text
                  key={index}
                  style={[
                    styles.letter,
                    item.highlight && styles.highlightLetter,
                    {
                      opacity,
                      transform: [{ translateY }, { scale }],
                    },
                  ]}
                >
                  {item.char}
                </Animated.Text>
              );
            })}
          </View>

          {/* Tagline fading up */}
          <Animated.Text
            style={[
              styles.tagline,
              {
                opacity: taglineAnim,
                transform: [
                  {
                    translateY: taglineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            Smart PG Management
          </Animated.Text>

          {/* Animated dots (commented out) */}
          {/* <View style={styles.dotsContainer}>
            {[dot1, dot2, dot3].map((dotAnim, i) => (
              <Animated.View
                key={i}
                style={[styles.dot, { opacity: dotAnim, transform: [{ scale: dotAnim }] }]}
              />
            ))}
          </View> */}
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
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 104,
    height: 104,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    // Glass effect border
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  letter: {
    fontSize: FONT.xxxl + 6,
    fontWeight: FONT.black,
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  highlightLetter: {
    color: '#FCD34D', // Gold/Amber signature highlight for 'ix'
    textShadowColor: 'rgba(252, 211, 77, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: FONT.md,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: FONT.medium,
    letterSpacing: 0.5,
    marginBottom: 0,
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
    color: 'rgba(255,255,255,0.55)',
    fontWeight: FONT.medium,
    letterSpacing: 0.4,
  },
});
