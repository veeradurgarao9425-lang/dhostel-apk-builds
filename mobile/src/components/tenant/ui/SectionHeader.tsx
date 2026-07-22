import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, font } from '../../../theme/tenantTheme';

export default function SectionHeader({
  title,
  actionLabel,
  onPressAction,
}: {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {!!actionLabel && (
        <TouchableOpacity onPress={onPressAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing['2xl'],
    marginBottom: spacing.md,
  },
  title: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  action: { fontSize: font.small, fontWeight: '700', color: colors.primary },
});
