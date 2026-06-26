import React, { useState } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell, Moon, Globe, Lock, Shield, FileText, Info, ChevronRight, ArrowLeft,
} from 'lucide-react-native';

import { colors, radius, spacing, shadow } from '../theme';

// ── Toggle Row ────────────────────────────────────────────────────────────────
function ToggleRow({
  label,
  value,
  onValueChange,
  isLast = false,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
          ios_backgroundColor={colors.border}
        />
      </View>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

// ── Chevron Row ───────────────────────────────────────────────────────────────
function ChevronRow({
  label,
  value,
  onPress,
  isLast = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {value && <Text style={styles.rowValue}>{value}</Text>}
          <ChevronRight size={16} color={colors.textSubtle} />
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

// ── Section Title ─────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SettingsScreen({ navigation }: any) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Preferences ──────────────────────────────────────────────────── */}
        <SectionLabel label="Preferences" />
        <View style={styles.card}>
          <ToggleRow
            label="Notifications"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
          <ToggleRow
            label="Dark Mode"
            value={darkMode}
            onValueChange={setDarkMode}
          />
          <ChevronRow
            label="Language"
            value="English"
            isLast
          />
        </View>

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <SectionLabel label="Account" />
        <View style={styles.card}>
          <ChevronRow label="Change Password" />
          <ChevronRow label="Privacy Policy" />
          <ChevronRow label="Terms & Conditions" isLast />
        </View>

        {/* ── About ────────────────────────────────────────────────────────── */}
        <SectionLabel label="About" />
        <View style={styles.card}>
          <ChevronRow label="App Version" value="1.0.0" isLast />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 120 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },

  // ── Section Label ─────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSubtle,
    paddingHorizontal: spacing.xl,
    marginTop: 24,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },

  // ── Row ───────────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: 16,
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowValue: { fontSize: 14, color: colors.textMuted },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },
});
