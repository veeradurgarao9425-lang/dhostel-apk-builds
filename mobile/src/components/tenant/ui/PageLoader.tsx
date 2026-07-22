import React from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, shadow } from '../../../theme/tenantTheme';
import Loader from './Loader';

// ── Full-page centered loader ──────────────────────────────────────────────────
export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={s.page}>
      <Loader size="lg" label={label} />
    </View>
  );
}

// ── Modal overlay for async operations (save / submit / upload) ───────────────
export function LoaderOverlay({ visible, label = 'Please wait…' }: { visible: boolean; label?: string }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Loader size="md" />
          <Text style={s.label}>{label}</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(14,20,44,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius['3xl'],
    paddingVertical: 44,
    paddingHorizontal: 52,
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      ios: shadow.raised,
      android: { elevation: 12 },
      default: {},
    }),
  },
  label: {
    fontSize: font.body,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.2,
    textAlign: 'center',
    maxWidth: 180,
  },
});
