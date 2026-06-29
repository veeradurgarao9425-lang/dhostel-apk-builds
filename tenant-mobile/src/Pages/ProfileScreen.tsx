import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User2, Lock, Bell, HelpCircle, MessageSquare, Info,
  LogOut, ChevronRight, CreditCard, Building2, BedDouble,
  Settings, ArrowLeft,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, font, shadow } from '../theme';
import { formatCurrency } from '../utils/format';

// ── Menu Row ──────────────────────────────────────────────────────────────────
type MenuRowProps = {
  label: string;
  onPress?: () => void;
  isLast?: boolean;
};

function MenuRow({ label, onPress, isLast = false }: MenuRowProps) {
  return (
    <>
      <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={onPress}>
        <Text style={styles.menuLabel}>{label}</Text>
        <ChevronRight size={16} color={colors.textSubtle} />
      </TouchableOpacity>
      {!isLast && <View style={styles.rowDivider} />}
    </>
  );
}

export default function ProfileScreen({ navigation }: any) {
  const { user, connectedHostel, signOut, logoutLoading } = useAuth();

  const name = user?.name || 'Guest';
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const roomNumber = user?.room_number ? `Room ${user.room_number}` : 'Not Assigned';
  const tenantId = user?.id ? `TN${user.id}` : 'N/A';

  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Dark Brown Header ────────────────────────────────────────────── */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Decorative circles */}
          <View style={styles.hCircle1} />
          <View style={styles.hCircle2} />

          {/* Avatar + Name + Room + Tenant ID */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profileSub}>{roomNumber}</Text>
            <View style={styles.tenantIdPill}>
              <Text style={styles.tenantIdText}>Tenant ID: {tenantId}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Menu Items ───────────────────────────────────────────────────── */}
        <View style={styles.menuCard}>
          <MenuRow
            label="Personal Information"
            onPress={() => {}}
          />
          <MenuRow
            label="Room & Stay Details"
            onPress={() => navigation.navigate('RoomInfo')}
          />
          <MenuRow
            label="Payment Methods"
            onPress={() => navigation.navigate('Payments')}
          />
          <MenuRow
            label="Help & Support"
            onPress={() => navigation.navigate('Messages')}
          />
          <MenuRow
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
            isLast
          />
        </View>

        {/* ── Log Out ──────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={confirmLogout}
          disabled={logoutLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>
            {logoutLoading ? 'Logging out…' : 'Log Out'}
          </Text>
        </TouchableOpacity>

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
    paddingBottom: 32,
    overflow: 'hidden',
  },
  hCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -60, right: -50,
  },
  hCircle2: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: 20, left: 30,
  },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: spacing.xl,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 26 },
  profileName: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3, marginBottom: 4 },
  profileSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 12 },
  tenantIdPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  tenantIdText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },

  // ── Menu Card ─────────────────────────────────────────────────────────────
  menuCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: 18,
  },
  menuLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xl,
    marginTop: 24,
    paddingVertical: 16,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
});
