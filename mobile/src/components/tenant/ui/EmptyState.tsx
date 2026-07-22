import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing, font } from '../../../theme/tenantTheme';

export default function EmptyState({
  icon: Icon,
  title,
  message,
  description,
  action,
}: {
  icon: any;
  title: string;
  message?: string;
  description?: string;
  action?: { label: string, onPress: () => void };
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Icon size={30} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!(message || description) && <Text style={styles.message}>{message || description}</Text>}
      {!!action && (
        <TouchableOpacity style={styles.actionBtn} onPress={action.onPress} activeOpacity={0.8}>
          <Text style={styles.actionBtnTxt}>{action.label}</Text>
        </TouchableOpacity>
      )}
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
  actionBtn: {
    marginTop: spacing.xl,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
  },
  actionBtnTxt: {
    color: colors.surface,
    fontSize: font.small,
    fontWeight: '700',
  }
});
