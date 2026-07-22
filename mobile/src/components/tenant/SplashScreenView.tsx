import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface Props {
  isReady: boolean;
  onPainted?: () => void;
}

export default function SplashScreenView({ isReady, onPainted }: Props) {
  /**
   * TWO-LAYER EXIT — fixes the skeleton-showing-through bug
   *
   * WRONG approach (what we had):
   *   Animate container opacity 1→0
   *   → At 0.5 opacity, the solid purple background becomes semi-transparent
   *   → Skeleton shows through — user sees logo + skeleton blended together
   *
   * CORRECT approach:
   *   1. Keep the purple BACKGROUND always at opacity 1 (no fade)
   *   2. Fade only the CONTENT (logo, text, bar) from 1→0 in 220ms
   *   3. When content is invisible, remove the ENTIRE overlay instantly
   *
   * Result: Purple → purple (no logo) → instant cut to app
   * The instant cut is imperceptible because background color matches.
   */
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const [unmounted, setUnmounted] = useState(false);
  const notifiedPainted = useRef(false);

  // BLINK FIX: double rAF ensures GPU frame is committed before hideAsync
  useEffect(() => {
    if (!notifiedPainted.current) {
      notifiedPainted.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          onPainted?.();
        });
      });
    }
  }, []);

  // EXIT: fade only content, background stays solid until removed
  useEffect(() => {
    if (isReady) {
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        // Content is invisible → remove entire overlay instantly
        // No background fade → no see-through effect
        setUnmounted(true);
      });
    }
  }, [isReady]);

  if (unmounted) return null;

  return (
    // This View (not Animated.View!) stays at full opacity always
    // Only the CONTENT inside fades
    <View style={styles.container} pointerEvents="none">
      {/* Solid purple — never becomes transparent */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#6D4AFF' }]} />

      {/* Decorative circles */}
      <View style={styles.glowRing1} />
      <View style={styles.glowRing2} />

      {/* CONTENT — this fades out cleanly */}
      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>Hostix</Text>
        <Text style={styles.tagline}>Your Hostel, Simplified</Text>
      </Animated.View>

      {/* Progress bar also fades with content */}
      <Animated.View style={[styles.progressWrap, { opacity: contentOpacity }]}>
        <ProgressBar />
      </Animated.View>
    </View>
  );
}

function ProgressBar() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: false,
    }).start();
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 0.6, 0.9, 1],
    outputRange: ['0%', '60%', '90%', '100%'],
  });

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width: barWidth }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -80,
    right: -60,
  },
  glowRing2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 80,
    left: -60,
  },
  content: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoWrap: {
    width: 104,
    height: 104,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  progressWrap: {
    position: 'absolute',
    bottom: 52,
    left: 48,
    right: 48,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 2,
  },
});
