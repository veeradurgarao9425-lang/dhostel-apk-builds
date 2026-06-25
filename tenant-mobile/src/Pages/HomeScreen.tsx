import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Bell,
  ChevronRight,
  Wrench,
  BedDouble,
  FileText,
  Coffee,
  Soup,
  Moon,
  Clock,
  Megaphone,
  MessageCircle,
  AlertCircle,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, font, shadow } from '../theme';
import { formatCurrency } from '../utils/format';
import { todayMenu, sampleNotifications, sampleNotices } from '../data/tenantContent';

// ── Time-based greeting ───────────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const greetingEmoji = () => {
  const h = new Date().getHours();
  if (h < 12) return '☀️';
  if (h < 17) return '👋';
  return '🌙';
};

// ── Meal slot config ──────────────────────────────────────────────────────────
const mealConfig = {
  Breakfast: { icon: Coffee, color: '#F59E0B', bg: '#FEF3C7', emoji: '☕', time: '7:30–9:30 AM' },
  Lunch:     { icon: Soup,   color: '#22C55E', bg: '#DCFCE7', emoji: '🍛', time: '12:30–2:30 PM' },
  Dinner:    { icon: Moon,   color: '#5B4CF0', bg: '#EEF2FF', emoji: '🌙', time: '7:30–9:30 PM' },
};

// ── Meal Section ────────────────────────────────────────────────────────────────
function MealSection({ meal, items, time, isLast }: { meal: string; items: string; time: string; isLast: boolean }) {
  const cfg = mealConfig[meal as keyof typeof mealConfig] || mealConfig.Breakfast;
  const Icon = cfg.icon;
  const itemArray = items.split(',').map(s => s.trim());

  return (
    <View style={[mealStyles.section, !isLast && mealStyles.sectionDivider]}>
      <View style={mealStyles.sectionHeader}>
        <View style={mealStyles.headerLeft}>
          <View style={[mealStyles.iconWrap, { backgroundColor: cfg.bg }]}>
            <Icon size={16} color={cfg.color} />
          </View>
          <Text style={[mealStyles.mealName, { color: cfg.color }]}>{meal}</Text>
        </View>
        <Text style={mealStyles.time}>{time}</Text>
      </View>
      <View style={mealStyles.chipsRow}>
        {itemArray.map((item, idx) => (
          <View key={idx} style={[mealStyles.chip, { backgroundColor: cfg.bg }]}>
            <Text style={[mealStyles.chipText, { color: cfg.color }]}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const mealStyles = StyleSheet.create({
  section: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealName: { fontSize: 15, fontWeight: '700' },
  time: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 36, // Align with text
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const { user, refreshUser, connectedHostel } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  const isAllocated = !!user?.is_allocated;
  const hasDue = Number(user?.outstanding_due || 0) > 0;
  const unread = sampleNotifications.filter((n) => !n.read).length;
  const initials = (user?.name || 'T').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  // Recent notices (latest 2)
  const recentNotices = sampleNotices.slice(0, 2);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── White Sticky Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingText}>
            {greeting()} {greetingEmoji()}
          </Text>
          <Text style={styles.nameText} numberOfLines={1}>
            {user?.name || 'Welcome back'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Notification bell */}
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Messages')}
            activeOpacity={0.7}
          >
            <Bell size={20} color={colors.text} />
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Profile avatar */}
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >

        {/* ── Hostel badge ────────────────────────────────────────── */}
        <View style={styles.hostelBadge}>
          <BedDouble size={12} color={colors.primary} />
          <Text style={styles.hostelBadgeText}>
            {connectedHostel?.hostel_name || 'D Hostel'}
            {user?.room_number ? ` · Room ${user.room_number}` : ''}
          </Text>
        </View>

        {/* ── Rent Status Card ─────────────────────────────────────── */}
        {isAllocated && hasDue && (
          <View style={styles.rentCard}>
            {/* Left purple accent bar */}
            <View style={styles.rentAccentBar} />
            <View style={styles.rentCardInner}>
              <View style={styles.rentCardLeft}>
                <View style={styles.rentDueChip}>
                  <AlertCircle size={10} color={colors.danger} />
                  <Text style={styles.rentDueChipText}>Payment Due</Text>
                </View>
                <Text style={styles.rentAmount}>
                  {formatCurrency(user?.outstanding_due || 6500)}
                </Text>
                <Text style={styles.rentSub}>Due on 05 Jun, 2025 · Rent</Text>
              </View>
              <TouchableOpacity
                style={styles.payNowBtn}
                onPress={() => navigation.navigate('Payments')}
                activeOpacity={0.85}
              >
                <Text style={styles.payNowText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Paid state */}
        {isAllocated && !hasDue && (
          <View style={styles.rentCard}>
            <View style={[styles.rentAccentBar, { backgroundColor: colors.success }]} />
            <View style={styles.rentCardInner}>
              <View style={styles.rentCardLeft}>
                <View style={[styles.rentDueChip, { backgroundColor: colors.successSoft }]}>
                  <Text style={[styles.rentDueChipText, { color: colors.success }]}>✓ All Paid</Text>
                </View>
                <Text style={styles.rentAmount}>
                  {formatCurrency(user?.monthly_rent || 6500)}
                </Text>
                <Text style={[styles.rentSub, { color: colors.success }]}>Paid for June 2025</Text>
              </View>
              <View style={styles.paidBadge}>
                <Text style={styles.paidBadgeText}>Clear</Text>
              </View>
            </View>
          </View>
        )}

        {/* Not allocated */}
        {!isAllocated && (
          <View style={styles.pendingCard}>
            <Clock size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingTitle}>Room not assigned yet</Text>
              <Text style={styles.pendingBody}>Pull down to refresh once the owner assigns your room.</Text>
            </View>
          </View>
        )}

        {/* ── Today's Menu ─────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Menu</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('FullMenu')}
            style={styles.seeAllBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See all</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.menuCard}>
          {todayMenu.map((item, i) => (
            <MealSection
              key={item.meal}
              meal={item.meal}
              items={item.items}
              time={item.time}
              isLast={i === todayMenu.length - 1}
            />
          ))}
        </View>

        {/* ── Recent Notices ────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Notices</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notices')}
            style={styles.seeAllBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>View all</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.noticesCard}>
          {recentNotices.map((notice, i) => {
            const isLast = i === recentNotices.length - 1;
            const isImportant = notice.category === 'Important';
            return (
              <TouchableOpacity
                key={notice.id}
                style={[styles.noticeRow, !isLast && styles.noticeDivider]}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.noticeDotWrap,
                  { backgroundColor: isImportant ? colors.dangerSoft : colors.primarySoft }
                ]}>
                  <Megaphone size={14} color={isImportant ? colors.danger : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                  <Text style={styles.noticeBody} numberOfLines={1}>{notice.body}</Text>
                </View>
                <ChevronRight size={14} color={colors.textSubtle} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Quick Actions ─────────────────────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: spacing['2xl'] }]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.shortcutGrid}>
          {[
            {
              icon: Wrench,
              label: 'Maintenance',
              desc: 'Report issue',
              color: '#F59E0B',
              bg: '#FEF3C7',
              onPress: () => navigation.navigate('Complaints'),
            },
            {
              icon: BedDouble,
              label: 'Room Info',
              desc: 'View details',
              color: '#5B4CF0',
              bg: '#EEF2FF',
              onPress: () => navigation.navigate('RoomInfo'),
            },
            {
              icon: FileText,
              label: 'Documents',
              desc: 'My files',
              color: '#3B82F6',
              bg: '#EFF6FF',
              onPress: () => navigation.navigate('Documents'),
            },
            {
              icon: MessageCircle,
              label: 'Messages',
              desc: 'Chat support',
              color: '#22C55E',
              bg: '#DCFCE7',
              onPress: () => navigation.navigate('Messages'),
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <TouchableOpacity
                key={s.label}
                style={styles.shortcutCard}
                activeOpacity={0.8}
                onPress={s.onPress}
              >
                <View style={[styles.shortcutIcon, { backgroundColor: s.bg }]}>
                  <Icon size={22} color={s.color} />
                </View>
                <Text style={styles.shortcutLabel}>{s.label}</Text>
                <Text style={styles.shortcutDesc}>{s.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['2xl'],
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 64,
  },
  headerLeft: { flex: 1, paddingRight: spacing.md },
  greetingText: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: 1 },
  nameText: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Scroll content ────────────────────────────────────────────────────────
  scrollContent: { paddingBottom: 120, paddingTop: 12 },

  // ── Hostel badge ──────────────────────────────────────────────────────────
  hostelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: spacing['2xl'],
    marginBottom: 16,
    backgroundColor: colors.primarySoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  hostelBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  // ── Rent card ─────────────────────────────────────────────────────────────
  rentCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing['2xl'],
    marginBottom: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  rentAccentBar: {
    width: 4,
    backgroundColor: colors.primary,
  },
  rentCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  rentCardLeft: { flex: 1 },
  rentDueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dangerSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  rentDueChipText: { fontSize: 11, fontWeight: '700', color: colors.danger },
  rentAmount: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: 3 },
  rentSub: { fontSize: 12, color: colors.textMuted },

  payNowBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.md,
    ...shadow.raised,
  },
  payNowText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  paidBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  paidBadgeText: { color: colors.success, fontWeight: '700', fontSize: 12 },

  // Pending card
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.xl,
    marginHorizontal: spacing['2xl'],
    marginBottom: spacing['2xl'],
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  pendingTitle: { fontSize: 14, fontWeight: '700', color: colors.warning, marginBottom: 2 },
  pendingBody: { fontSize: 12, color: colors.textMuted },

  // ── Section headers ───────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // ── Menu card ─────────────────────────────────────────────────────────────
  menuCard: {
    marginHorizontal: spacing['2xl'],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing['2xl'],
    overflow: 'hidden',
    ...shadow.card,
  },

  // ── Notices card ──────────────────────────────────────────────────────────
  noticesCard: {
    marginHorizontal: spacing['2xl'],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  noticeDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  noticeDotWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  noticeTitle: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 2 },
  noticeBody: { fontSize: 12, color: colors.textMuted },

  // ── Quick actions ─────────────────────────────────────────────────────────
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing['2xl'],
    gap: 12,
    marginBottom: 16,
  },
  shortcutCard: {
    width: '46.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  shortcutIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  shortcutLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  shortcutDesc: { fontSize: 12, color: colors.textMuted },
});
