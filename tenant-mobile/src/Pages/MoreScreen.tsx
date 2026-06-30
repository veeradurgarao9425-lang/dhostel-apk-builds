import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText, PieChart, Megaphone, Wrench, User, HelpCircle, Settings,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, shadow } from '../theme';

const GRID_ITEMS = [
  { icon: FileText,  label: 'Due',          screen: 'Dues',       iconBg: '#FEE2E2', iconColor: '#EF4444' },
  { icon: PieChart,  label: 'Expenses',     screen: 'Expenses',   iconBg: '#DCFCE7', iconColor: '#16A34A' },
  { icon: Megaphone, label: 'Notices',      screen: 'Notices',    iconBg: '#EFF6FF', iconColor: '#3B82F6' },
  { icon: Wrench,    label: 'Complaints',   screen: 'Complaints', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
  { icon: User,       label: 'Profile', screen: 'Profile',    iconBg: colors.primarySoft, iconColor: colors.primary },
  { icon: HelpCircle, label: 'Help',    screen: 'HelpScreen', iconBg: '#F3F4F6',           iconColor: '#6B7280' },
];

export default function MoreScreen({ navigation }: any) {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Tenant'}</Text>
          <Text style={styles.subGreeting}>What do you need today?</Text>
        </View>
        <Text style={{ fontSize: 28 }}>👋</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Icon Grid ────────────────────────────────────────────────────── */}
        <View style={styles.grid}>
          {GRID_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.label}
                style={styles.gridItem}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.gridIconWrap, { backgroundColor: item.iconBg }]}>
                  <Icon size={26} color={item.iconColor} strokeWidth={1.5} />
                </View>
                <Text style={styles.gridLabel}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Settings ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.75}
        >
          <View style={[styles.settingsIconWrap, { backgroundColor: colors.primarySoft }]}>
            <Settings size={22} color={colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={styles.settingsLabel}>Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 120 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {},
  greeting: { fontSize: 18, fontWeight: '700', color: colors.text },
  subGreeting: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // ── Grid ──────────────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.xl,
    gap: 12,
  },
  gridItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    ...shadow.card,
    flexGrow: 1,
  },
  gridIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },

  // ── Settings Row ──────────────────────────────────────────────────────────
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  settingsIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  settingsLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
});
