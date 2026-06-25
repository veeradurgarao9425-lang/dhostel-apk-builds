import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, font } from '../../theme';

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const map: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: colors.primarySoft, fg: colors.primaryDark },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  neutral: { bg: '#F1F5F9', fg: colors.textMuted },
};

export default function Pill({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: Tone;
  icon?: React.ReactNode;
}) {
  const c = map[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      {icon}
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  text: { fontSize: font.tiny, fontWeight: '700', letterSpacing: 0.2 },
});
