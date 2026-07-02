import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { colors, font } from '../../theme';

export type LoaderSize = 'sm' | 'md' | 'lg';

const CORE_SIZE: Record<LoaderSize, number> = { sm: 48, md: 66, lg: 90 };

interface LoaderProps {
  size?: LoaderSize;
  label?: string;
  style?: ViewStyle;
}

export default function Loader({ size = 'md', label, style }: LoaderProps) {
  const core = CORE_SIZE[size];

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const dot1  = useRef(new Animated.Value(0)).current;
  const dot2  = useRef(new Animated.Value(0)).current;
  const dot3  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sonar ring: scale up + fade out over 1600ms total
    const sonar = (anim: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1100, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
          Animated.delay(500),
        ])
      );

    // Dot bounce wave
    const wave = (anim: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 260, useNativeDriver: true }),
          Animated.delay(780),
        ])
      );

    const r1 = sonar(ring1);
    const r2 = sonar(ring2);
    const d1 = wave(dot1);
    const d2 = wave(dot2);
    const d3 = wave(dot3);

    r1.start();
    const t1 = setTimeout(() => r2.start(), 800); // stagger rings by half cycle

    d1.start();
    const t2 = setTimeout(() => d2.start(), 160);
    const t3 = setTimeout(() => d3.start(), 320);

    return () => {
      r1.stop(); r2.stop(); d1.stop(); d2.stop(); d3.stop();
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, [ring1, ring2, dot1, dot2, dot3]);

  const iconSz     = core * 0.44;
  const containerSz = core * 2.2;

  return (
    <View style={[s.wrap, style]}>
      {/* Ring + core stack */}
      <View style={{ width: containerSz, height: containerSz }}>
        {/* Outer sonar ring */}
        <View style={[StyleSheet.absoluteFill, s.center]}>
          <Animated.View style={[
            s.ring,
            { width: core, height: core, borderRadius: core / 2 },
            {
              transform: [{ scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
              opacity:   ring1.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.55, 0.22, 0] }),
            },
          ]} />
        </View>

        {/* Inner sonar ring (staggered) */}
        <View style={[StyleSheet.absoluteFill, s.center]}>
          <Animated.View style={[
            s.ring,
            { width: core, height: core, borderRadius: core / 2 },
            {
              transform: [{ scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
              opacity:   ring2.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.55, 0.22, 0] }),
            },
          ]} />
        </View>

        {/* Core gradient circle with home icon */}
        <View style={[StyleSheet.absoluteFill, s.center]}>
          <LinearGradient
            colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: core, height: core, borderRadius: core / 2, alignItems: 'center', justifyContent: 'center' }}
          >
            <Svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none">
              {/* House body */}
              <Path
                d="M3 9.5L12 2L21 9.5V20C21 20.6 20.6 21 20 21H4C3.4 21 3 20.6 3 20V9.5Z"
                fill="rgba(255,255,255,0.18)"
                stroke="#FFFFFF"
                strokeWidth={1.7}
                strokeLinejoin="round"
              />
              {/* Door */}
              <Path
                d="M9.5 21V14.5H14.5V21"
                stroke="#FFFFFF"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </LinearGradient>
        </View>
      </View>

      {/* Bouncing wave dots */}
      <View style={s.dots}>
        {([dot1, dot2, dot3] as Animated.Value[]).map((d, i) => (
          <Animated.View key={i} style={[s.dot, {
            transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
            opacity:   d.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.28, 1, 0.28] }),
          }]} />
        ))}
      </View>

      {!!label && <Text style={s.label}>{label}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:   { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  ring:   { backgroundColor: colors.primary },
  dots:   { flexDirection: 'row', gap: 8, marginTop: 18 },
  dot:    { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.primary },
  label:  { fontSize: font.small, fontWeight: '500', color: colors.textMuted, marginTop: 12, letterSpacing: 0.3, textAlign: 'center' },
});
