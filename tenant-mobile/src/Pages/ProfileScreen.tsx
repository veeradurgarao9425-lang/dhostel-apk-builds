import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User2, Lock, Bell, HelpCircle, MessageSquare, Info,
  LogOut, ChevronRight, CreditCard, Building2, BedDouble,
  Users, Settings, Shield, ChevronLeft,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, font, shadow } from '../theme';
import { formatCurrency } from '../utils/format';

// ── Settings Row ──────────────────────────────────────────────────────────────
type SettingsRowProps = {
  icon: any;
  label: string;
  value?: string;
  onPress?: () => void;
  iconColor?: string;
  iconBg?: string;
  isDanger?: boolean;
  isLast?: boolean;
};

function SettingsRow({
  icon: Icon,
  label,
  value,
  onPress,
  iconColor = colors.primary,
  iconBg = colors.primarySoft,
  isDanger = false,
  isLast = false,
}: SettingsRowProps) {
  return (
    <>
      <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7} onPress={onPress}>
        <View style={[styles.settingsIconWrap, { backgroundColor: iconBg }]}>
          <Icon size={17} color={iconColor} strokeWidth={1.5} />
        </View>
        <View style={styles.settingsContent}>
          <Text style={[styles.settingsLabel, isDanger && { color: colors.danger }]}>{label}</Text>
          {!!value && <Text style={styles.settingsValue}>{value}</Text>}
        </View>
        <ChevronRight size={16} color={colors.textSubtle} />
      </TouchableOpacity>
      {!isLast && <View style={styles.rowDivider} />}
    </>
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
      {/* ── Gradient Header with Avatar ────────────────────────────────── */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Abstract circles */}
        <View style={styles.hCircle1} />
        <View style={styles.hCircle2} />
        <View style={styles.hCircle3} />

        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.75}>
            <Settings size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{name}</Text>
          {user?.email && <Text style={styles.profileEmail}>{user.email}</Text>}
          {user?.is_allocated && (
            <View style={styles.roomPill}>
              <BedDouble size={12} color="rgba(255,255,255,0.9)" />
              <Text style={styles.roomPillText}>
                Room {user.room_number} · {connectedHostel?.hostel_name || 'D Hostel'}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Room Details ────────────────────────────────────────────────── */}
        {user?.is_allocated && (
          <>
            <SectionTitle title="Room Details" />
            <View style={styles.card}>
              {[
                { icon: BedDouble,  label: 'Room Number',  value: user?.room_number },
                { icon: Building2,  label: 'Hostel',       value: connectedHostel?.hostel_name || 'D Hostel' },
                { icon: Users,      label: 'Location',     value: 'Building A, First Floor' },
                { icon: CreditCard, label: 'Monthly Rent', value: formatCurrency(user?.monthly_rent) },
              ].map(({ icon: Icon, label, value }, i, arr) => (
                <View key={label} style={[styles.detailRow, i > 0 && styles.detailDivider]}>
                  <View style={styles.detailIconWrap}>
                    <Icon size={16} color={colors.primary} strokeWidth={1.5} />
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

        {/* ── Account ─────────────────────────────────────────────────────── */}
        <SectionTitle title="Account" />
        <View style={styles.card}>
          <SettingsRow
            icon={User2}
            label="Personal Information"
            iconColor={colors.primary}
            iconBg={colors.primarySoft}
          />
          <SettingsRow
            icon={Lock}
            label="Change Password"
            iconColor="#8B5CF6"
            iconBg="#EDE9FE"
          />
          <SettingsRow
            icon={CreditCard}
            label="Payment Methods"
            iconColor={colors.success}
            iconBg={colors.successSoft}
          />
          <SettingsRow
            icon={Bell}
            label="Notifications"
            iconColor={colors.warning}
            iconBg={colors.warningSoft}
            isLast
          />
        </View>

        {/* ── Support ─────────────────────────────────────────────────────── */}
        <SectionTitle title="Support" />
        <View style={styles.card}>
          <SettingsRow
            icon={HelpCircle}
            label="Help & FAQ"
            iconColor={colors.info}
            iconBg={colors.infoSoft}
          />
          <SettingsRow
            icon={MessageSquare}
            label="Contact Support"
            iconColor={colors.success}
            iconBg={colors.successSoft}
            onPress={() => navigation.navigate('Messages')}
          />
          <SettingsRow
            icon={Shield}
            label="Privacy Policy"
            iconColor={colors.textMuted}
            iconBg={colors.surfaceAlt}
          />
          <SettingsRow
            icon={Info}
            label="About App"
            iconColor={colors.textMuted}
            iconBg={colors.surfaceAlt}
            value="v1.0.0"
            isLast
          />
        </View>

        {/* ── Logout ──────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={confirmLogout}
          disabled={logoutLoading}
          activeOpacity={0.8}
        >
          <LogOut size={18} color={colors.danger} />
          <Text style={styles.logoutText}>
            {logoutLoading ? 'Logging out…' : 'Log Out'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.version}>Stayvix · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 120 },

  // ── Gradient Header ───────────────────────────────────────────────────────
  header: {
    paddingBottom: 28,
    overflow: 'hidden',
  },
  hCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -40,
  },
  hCircle2: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)', top: 30, right: 60,
  },
  hCircle3: {
    position: 'absolute', width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.07)', bottom: 20, left: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    marginBottom: spacing.xl,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 28 },
  profileName: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.3, marginBottom: 4 },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 12 },
  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  roomPillText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },

  // ── Section titles ────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSubtle,
    paddingHorizontal: spacing.xl,
    marginTop: 24,
    marginBottom: spacing.sm,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },

  // ── Settings rows ─────────────────────────────────────────────────────────
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  settingsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingsContent: { flex: 1 },
  settingsLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  settingsValue: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 78,
  },

  // ── Detail rows ───────────────────────────────────────────────────────────
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  detailDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  detailIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  detailLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '700', color: colors.text },

  // ── Logout ────────────────────────────────────────────────────────────────
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: 28,
    height: 54,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSoft,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  version: {
    textAlign: 'center',
    color: colors.textSubtle,
    fontSize: 12,
    marginTop: spacing.xl,
  },
});
