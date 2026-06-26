import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, font } from '../../theme';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple';

interface PillProps {
  label: string;
  tone?: Tone;
  icon?: React.ReactNode;
  small?: boolean;
}

const toneMap: Record<Tone, { bg: string; text: string; border: string }> = {
  success: { bg: colors.successSoft, text: colors.success, border: colors.successBorder },
  warning: { bg: colors.warningSoft, text: colors.warning, border: colors.warningBorder },
  danger:  { bg: colors.dangerSoft,  text: colors.danger,  border: colors.dangerBorder },
  info:    { bg: colors.infoSoft,    text: colors.info,    border: colors.infoBorder },
  purple:  { bg: colors.primarySoft, text: colors.primary, border: colors.primaryBorder },
  default: { bg: '#F3F4F6', text: colors.textMuted, border: '#E5E7EB' },
};

export default function Pill({ label, tone = 'default', icon, small }: PillProps) {
  const t = toneMap[tone];
  return (
    <View style={[
      styles.pill,
      { backgroundColor: t.bg, borderColor: t.border },
      small && styles.small,
    ]}>
      {icon}
      <Text style={[
        styles.text,
        { color: t.text },
        small && styles.smallText,
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: font.caption, fontWeight: '700' },
  small: { paddingHorizontal: 8, paddingVertical: 3 },
  smallText: { fontSize: 10 },
});
