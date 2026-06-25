import React from 'react';
import { StyleSheet, ScrollView, View, RefreshControl, ScrollViewProps } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

type Props = ScrollViewProps & {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  padded?: boolean;
};

/**
 * Standard screen frame: safe-area aware, app background, optional scroll +
 * pull-to-refresh. Every tenant screen wraps its content in this so spacing
 * and background are identical everywhere.
 */
export default function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  edges = ['top'],
  padded = true,
  contentContainerStyle,
  ...rest
}: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[padded && styles.content, contentContainerStyle]}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
          {...rest}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padded && styles.content]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'] * 2, flexGrow: 1 },
});
