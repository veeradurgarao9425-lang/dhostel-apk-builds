import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getCategoryTheme } from '../../constants/categoryTheme';

interface CategoryHeroArtProps {
  category: string;
  width: number;
  height: number;
}

const BLOB_PATH = 'M120 20C160 10 200 40 210 80C220 120 200 160 160 175C120 190 70 180 45 145C20 110 20 65 55 40C75 25 95 28 120 20Z';

function hashStr(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function Sparkle({ delay, left, top, size }: { delay: number; left: number; top: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const opacity = anim.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.5, 0] });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.6] });
  return (
    <Animated.View
      style={{
        position: 'absolute', left, top, width: size, height: size, borderRadius: size / 2,
        backgroundColor: '#FFFFFF', opacity, transform: [{ translateY }, { scale }],
      }}
    />
  );
}

/** Soft ambient scene behind a category hero: a hand-drawn blob, ghost icon "print" motif, and drifting sparkle dust. */
export default function CategoryHeroArt({ category, width, height }: CategoryHeroArtProps) {
  const theme = getCategoryTheme(category);
  const Icon = theme.Icon;
  const seed = useMemo(() => hashStr(category), [category]);

  const sparkleCount = theme.premium ? 8 : 5;
  const sparkles = useMemo(() => Array.from({ length: sparkleCount }, (_, i) => {
    const s = (seed + i * 977) % 1000;
    return {
      left: 12 + (s % Math.max(width - 24, 1)),
      top: 18 + ((s * 3) % Math.max(height - 40, 1)),
      size: 4 + (s % 5),
      delay: (i * 260) % 2200,
    };
  }), [seed, sparkleCount, width, height]);

  const iconGhosts = [
    { top: -24, left: width - 88, size: theme.premium ? 140 : 118, rotate: '-14deg', opacity: 0.12 },
    { top: height - 46, left: -18, size: 68, rotate: '10deg', opacity: 0.1 },
  ];

  return (
    <View pointerEvents="none" style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path
          d={BLOB_PATH}
          fill="rgba(255,255,255,0.07)"
          transform={`translate(${width - 190}, -20) scale(${theme.premium ? 1.15 : 0.95})`}
        />
      </Svg>
      {iconGhosts.map((g, i) => (
        <View key={i} style={{ position: 'absolute', top: g.top, left: g.left, opacity: g.opacity, transform: [{ rotate: g.rotate }] }}>
          <Icon size={g.size} color="#FFFFFF" strokeWidth={1.5} />
        </View>
      ))}
      {sparkles.map((sp, i) => (
        <Sparkle key={i} delay={sp.delay} left={sp.left} top={sp.top} size={sp.size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, overflow: 'hidden' },
});
