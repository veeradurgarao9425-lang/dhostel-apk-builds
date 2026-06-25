import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing, font } from '../../theme';

export default function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Icon size={30} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing['3xl'], paddingHorizontal: spacing.xl },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: font.h3, fontWeight: '700', color: colors.text, textAlign: 'center' },
  message: {
    fontSize: font.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
});
