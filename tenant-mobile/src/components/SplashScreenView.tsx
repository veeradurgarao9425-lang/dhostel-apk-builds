import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface Props {
  isReady: boolean;
}

export default function SplashScreenView({ isReady }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const [unmounted, setUnmounted] = useState(false);

  // Exit animation
  useEffect(() => {
    if (isReady) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setUnmounted(true);
      });
    }
  }, [isReady]);

  if (unmounted) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#6D4AFF' }]} />

      <Animated.View style={[styles.content, { transform: [{ scale }], opacity: logoOpacity }]}>
        <View style={styles.logoContainer}>
          <View style={styles.logoInnerWrap}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text style={styles.appName}>Hostix</Text>
        <Text style={styles.tagline}>Your Hostel, Simplified</Text>
      </Animated.View>

      <Animated.View style={[styles.loaderWrap, { opacity: logoOpacity }]}>
        <DotsLoader />
        <Text style={styles.loaderText}>Loading your space…</Text>
      </Animated.View>
    </Animated.View>
  );
}

function DotsLoader() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (anim: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.delay(400)
          ])
        )
      ]);
    };

    Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 200),
      animateDot(dot3, 400)
    ]).start();
  }, []);

  const getStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{
      translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] })
    }]
  });

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }, getStyle(dot1)]} />
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }, getStyle(dot2)]} />
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }, getStyle(dot3)]} />
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
  blob: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    opacity: 0.15,
  },
  blob1: {
    top: -width * 0.5,
    right: -width * 0.5,
    backgroundColor: '#3B82F6',
  },
  blob2: {
    bottom: -width * 0.5,
    left: -width * 0.5,
    backgroundColor: '#60A5FA',
  },
  content: {
    alignItems: 'center',
    marginBottom: 80,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  glowRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoInnerWrap: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  logo: {
    width: 76,
    height: 76,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  loaderWrap: {
    position: 'absolute',
    bottom: 80,
    left: 48,
    right: 48,
    alignItems: 'center',
    gap: 12,
  },
  loaderTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loaderBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  loaderText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
