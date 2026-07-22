import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type GlowBadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero';

export const GLOW_BADGE_SIZES: Record<GlowBadgeSize, { box: number; icon: number; halo: number }> = {
  xs:   { box: 20, icon: 11, halo: 28 },
  sm:   { box: 28, icon: 14, halo: 44 },
  md:   { box: 44, icon: 20, halo: 66 },
  lg:   { box: 56, icon: 26, halo: 84 },
  hero: { box: 84, icon: 38, halo: 124 },
};

interface IconGlowBadgeProps {
  Icon: any;
  gradient: [string, string] | [string, string, string];
  glowColor: string;
  flatColor?: string;
  flatBg?: string;
  premium?: boolean;
  size?: GlowBadgeSize;
  active?: boolean;
  pulse?: boolean;
  entrance?: boolean;
  style?: ViewStyle;
}

/** Reusable gradient-fill icon badge with cross-platform halo glow and entrance/pulse animation. */
export default function IconGlowBadge({
  Icon, gradient, glowColor, flatColor = '#546E7A', flatBg = '#ECEFF1', premium = false,
  size = 'md', active = true, pulse = false, entrance = false, style,
}: IconGlowBadgeProps) {
  const dims = GLOW_BADGE_SIZES[size];

  const entranceScale = useRef(new Animated.Value(entrance ? 0 : 1)).current;
  const entranceOpacity = useRef(new Animated.Value(entrance ? 0 : 1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (entrance) {
      Animated.parallel([
        Animated.spring(entranceScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
        Animated.timing(entranceOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [entrance]);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (pulse) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 1400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        ])
      );
      loop.start();
    }
    return () => { loop?.stop(); };
  }, [pulse]);

  const glowOpacity = premium ? { outer: 0.28, inner: 0.16 } : { outer: 0.18, inner: 0.1 };
  const shadow = active ? (Platform.select({
    ios: {
      shadowColor: glowColor,
      shadowOpacity: premium ? 0.5 : 0.32,
      shadowRadius: premium ? 18 : 12,
      shadowOffset: { width: 0, height: premium ? 8 : 4 },
    },
    default: {},
  }) as ViewStyle) : {};

  return (
    <Animated.View
      style={[
        { width: dims.halo, height: dims.halo, alignItems: 'center', justifyContent: 'center' },
        { opacity: entranceOpacity, transform: [{ scale: Animated.multiply(entranceScale, pulseAnim) }] },
        style,
      ]}
    >
      {active && (
        <>
          <View style={[styles.halo, { width: dims.halo, height: dims.halo, borderRadius: dims.halo / 2, backgroundColor: glowColor, opacity: glowOpacity.outer }]} />
          <View style={[styles.halo, { width: dims.halo * 0.72, height: dims.halo * 0.72, borderRadius: (dims.halo * 0.72) / 2, backgroundColor: glowColor, opacity: glowOpacity.inner }]} />
        </>
      )}
      <View style={[styles.badgeWrap, { width: dims.box, height: dims.box, borderRadius: dims.box / 2 }, shadow]}>
        <LinearGradient
          colors={active ? gradient : [flatBg, flatBg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { width: dims.box, height: dims.box, borderRadius: dims.box / 2 }]}
        >
          <Icon size={dims.icon} color={active ? '#FFFFFF' : flatColor} strokeWidth={2} />
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  halo: { position: 'absolute' },
  badgeWrap: { alignItems: 'center', justifyContent: 'center' },
  gradient: { alignItems: 'center', justifyContent: 'center' },
});
