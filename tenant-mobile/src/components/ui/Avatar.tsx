import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

const palette = ['#6366F1', '#0EA5E9', '#16A34A', '#D97706', '#DB2777', '#7C3AED'];

const initials = (name?: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
};

const colorFor = (name?: string) => {
  if (!name) return colors.primary;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
};

export default function Avatar({ name, size = 40 }: { name?: string; size?: number }) {
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(name) },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFFFFF', fontWeight: '700' },
});
