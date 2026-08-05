import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

// Hand-built SVG illustrations standing in for commissioned art — no
// external asset/image-generation dependency. Keyed by story/path category.
const CATEGORY_STYLES: Record<string, { colors: [string, string]; icon: keyof typeof Ionicons.glyphMap }> = {
  'daily-life': { colors: ['#FDE68A', '#F59E0B'], icon: 'sunny' },
  friends: { colors: ['#C7D2FE', '#6366F1'], icon: 'people' },
  family: { colors: ['#FBCFE8', '#DB2777'], icon: 'home' },
  hostel: { colors: ['#BFDBFE', '#2563EB'], icon: 'bed' },
  travel: { colors: ['#BAE6FD', '#0EA5E9'], icon: 'airplane' },
  technology: { colors: ['#DDD6FE', '#7C3AED'], icon: 'hardware-chip' },
  business: { colors: ['#BBF7D0', '#16A34A'], icon: 'briefcase' },
  success: { colors: ['#FBCFE8', '#EC4899'], icon: 'trophy' },
  general: { colors: ['#E2D9FF', '#6D4AFF'], icon: 'book' },
};

function resolveStyle(key?: string | null) {
  if (!key) return CATEGORY_STYLES.general;
  const base = key.split('-')[0];
  return CATEGORY_STYLES[key] || CATEGORY_STYLES[base] || CATEGORY_STYLES.general;
}

function getIllustrationSource(key?: string | null) {
  if (!key) return require('../../../../assets/growth/general_cover.png');
  const k = key.toLowerCase();
  if (k.includes('cook') || k.includes('disaster') || k.includes('kitchen') || k.includes('pasta')) {
    return require('../../../../assets/growth/cooking_disaster.png');
  }
  if (k.includes('bus') || k.includes('missed') || k.includes('run')) {
    return require('../../../../assets/growth/missed_bus.png');
  }
  return require('../../../../assets/growth/general_cover.png');
}

interface Props {
  illustrationKey?: string | null;
  size?: number;
  style?: any;
}

export function GrowthIllustration({ illustrationKey, size = 160, style }: Props) {
  const source = getIllustrationSource(illustrationKey);
  if (source) {
    return (
      <View style={[{ width: size, height: size, borderRadius: 12, overflow: 'hidden' }, style]}>
        <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }

  const { colors, icon } = resolveStyle(illustrationKey);
  const gradId = `grad-${colors[0].replace('#', '')}`;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 160 160">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Path
          d="M80 12c37 0 64 24 66 58 2 32-24 60-66 62-42 2-68-26-66-60C16 40 43 12 80 12z"
          fill={`url(#${gradId})`}
        />
        <Circle cx="128" cy="34" r="7" fill="#FFFFFF" opacity={0.5} />
        <Circle cx="30" cy="122" r="5" fill="#FFFFFF" opacity={0.4} />
      </Svg>
      <View style={styles.iconOverlay} pointerEvents="none">
        <Ionicons name={icon} size={size * 0.34} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GrowthIllustration;
