import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User2, Lock, Bell, HelpCircle, MessageSquare, Info,
  LogOut, ChevronRight, CreditCard, Building2, BedDouble, Users,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, font, shadow } from '../theme';
import { formatCurrency } from '../utils/format';

type SettingsRowProps = {
  icon: any;
  label: string;
  value?: string;
  onPress?: () => void;
  iconColor?: string;
  iconBg?: string;
  isDanger?: boolean;
};

function SettingsRow({ icon: Icon, label, value, onPress, iconColor = colors.primary, iconBg = colors.primarySoft, isDanger = false }: SettingsRowProps) {
  return (
    <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.settingsIconWrap, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} />
      </View>
      <View style={styles.settingsContent}>
        <Text style={[styles.settingsLabel, isDanger && { color: colors.danger }]}>{label}</Text>
        {!!value && <Text style={styles.settingsValue}>{value}</Text>}
      </View>
      <ChevronRight size={16} color={colors.textSubtle} />
    </TouchableOpacity>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export default function ProfileScreen({ navigation }: any) {
  const { user, connectedHostel, signOut, logoutLoading } = useAuth();

  const name = user?.name || 'Tenant';
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── White Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ── Profile Card ───────────────────────────────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{name}</Text>
          {user?.email && <Text style={styles.profileEmail}>{user.email}</Text>}
          {user?.phone && <Text style={styles.profilePhone}>{user.phone}</Text>}

          {user?.is_allocated && (
            <View style={styles.roomBadge}>
              <BedDouble size={12} color={colors.primary} />
              <Text style={styles.roomBadgeText}>
                Room {user.room_number} · {connectedHostel?.hostel_name || 'D Hostel'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Room Details Card ──────────────────────────────────────────────────── */}
        {user?.is_allocated && (
          <>
            <SectionTitle title="Room Details" />
            <View style={styles.card}>
              {[
                { icon: BedDouble, label: 'Room Number', value: user?.room_number },
                { icon: Building2, label: 'Hostel', value: connectedHostel?.hostel_name || 'D Hostel' },
                { icon: Users, label: 'Floor', value: 'Building A, First Floor' },
                { icon: CreditCard, label: 'Monthly Rent', value: formatCurrency(user?.monthly_rent) },
              ].map(({ icon: Icon, label, value }, i) => (
                <View key={label} style={[styles.detailRow, i > 0 && styles.detailDivider]}>
                  <View style={styles.detailIconWrap}>
                    <Icon size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={styles.detailValue}>{value || '—'}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Account Section ────────────────────────────────────────────────────── */}
        <SectionTitle title="Account" />
        <View style={styles.card}>
          <SettingsRow icon={User2} label="Personal Information" iconColor={colors.primary} iconBg={colors.primarySoft} />
          <View style={styles.rowDivider} />
          <SettingsRow icon={Lock} label="Change Password" iconColor="#8B5CF6" iconBg="#EDE9FE" />
          <View style={styles.rowDivider} />
          <SettingsRow icon={CreditCard} label="Payment Methods" iconColor="#10B981" iconBg="#D1FAE5" />
          <View style={styles.rowDivider} />
          <SettingsRow icon={Bell} label="Notification Settings" iconColor="#F59E0B" iconBg="#FEF3C7" />
        </View>

        {/* ── Support Section ────────────────────────────────────────────────────── */}
        <SectionTitle title="Support" />
        <View style={styles.card}>
          <SettingsRow icon={HelpCircle} label="Help & FAQ" iconColor={colors.info} iconBg={colors.infoSoft} />
          <View style={styles.rowDivider} />
          <SettingsRow icon={MessageSquare} label="Contact Support" iconColor="#10B981" iconBg="#D1FAE5" />
          <View style={styles.rowDivider} />
          <SettingsRow icon={Info} label="About App" iconColor={colors.textMuted} iconBg={colors.surfaceAlt} />
        </View>

        {/* ── Logout ─────────────────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} disabled={logoutLoading} activeOpacity={0.8}>
          <LogOut size={18} color={colors.danger} />
          <Text style={styles.logoutText}>{logoutLoading ? 'Logging out…' : 'Logout'}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Stayvix Tenant App · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 120 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 64,
  },
  headerTitle: { fontSize: font.h2, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },

  // ── Profile Card ────────────────────────────────────────────────────────────
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing['2xl'],
    marginTop: spacing.xl,
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: font.pageTitle },
  profileName: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  profileEmail: { color: colors.textMuted, fontSize: 13, marginBottom: 2 },
  profilePhone: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  roomBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  // ── Sections & Cards ────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSubtle,
    paddingHorizontal: spacing['2xl'],
    marginTop: spacing['2xl'],
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing['2xl'],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },

  // ── Settings row ────────────────────────────────────────────────────────────
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  settingsIconWrap: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  settingsContent: { flex: 1 },
  settingsLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  settingsValue: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 76 },

  // ── Detail rows (room info) ─────────────────────────────────────────────────
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  detailDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  detailIconWrap: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '700', color: colors.text },

  // ── Logout ──────────────────────────────────────────────────────────────────
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing['2xl'],
    marginTop: spacing['3xl'],
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSoft,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
  version: { textAlign: 'center', color: colors.textSubtle, fontSize: 12, marginTop: spacing.xl },
});
