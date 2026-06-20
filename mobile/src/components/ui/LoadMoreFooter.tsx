import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, FONT, SPACING } from '../../theme/index';

// ─── Props ────────────────────────────────────────────────────────────────────
interface LoadMoreFooterProps {
  loading: boolean;
  hasMore: boolean;
  total?: number;
  noun?: string; // e.g. "students", "rooms"
}

// ─── Component ────────────────────────────────────────────────────────────────
export const LoadMoreFooter: React.FC<LoadMoreFooterProps> = ({
  loading,
  hasMore,
  total,
  noun = 'items',
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (!hasMore && (total ?? 0) > 0) {
    return (
      <View style={styles.doneContainer}>
        <View style={styles.line} />
        <Text style={styles.doneText}>
          {total ? `All ${total} ${noun} loaded` : '— All caught up —'}
        </Text>
        <View style={styles.line} />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  doneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
    marginBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  doneText: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    fontWeight: FONT.medium,
  },
});

export default LoadMoreFooter;
