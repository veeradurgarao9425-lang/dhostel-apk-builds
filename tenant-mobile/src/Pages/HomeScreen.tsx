import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  Bell,
  ChevronRight,
  Wrench,
  FileText,
  Coffee,
  Soup,
  Moon,
  Clock,
  Megaphone,
  MessageCircle,
  AlertCircle,
  BedDouble,
  PieChart,
  CreditCard,
  User,
  HelpCircle,
  MoreHorizontal,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, font, shadow } from '../theme';
import { formatCurrency } from '../utils/format';
import { todayMenu, sampleNotifications, sampleNotices, samplePayments } from '../data/tenantContent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Time-based greeting ───────────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// ── Meal config — left border colors only, no heavy gradients ─────────────────
const mealConfig = {
  Breakfast: { borderColor: '#F59E0B', iconColor: '#F59E0B', iconBg: '#FFF8EC', emoji: '☀️', time: '7:30–9:30 AM' },
  Lunch:     { borderColor: '#16A34A', iconColor: '#16A34A', iconBg: '#EDFBF3', emoji: '🍛', time: '12:30–2:30 PM' },
  Dinner:    { borderColor: colors.primary, iconColor: colors.primary, iconBg: colors.primarySoft, emoji: '🌙', time: '7:30–9:30 PM' },
};

// ── Meal Row ─────────────────────────────────────────────────────────────────
function MealRow({ meal, items, isLast }: { meal: string; items: string; isLast: boolean }) {
  const cfg = mealConfig[meal as keyof typeof mealConfig] || mealConfig.Breakfast;
  const itemArray = items.split(',').map((s) => s.trim());

  return (
    <View style={[mealStyles.row, !isLast && mealStyles.rowDivider]}>
      {/* Left accent bar */}
      <View style={[mealStyles.accentBar, { backgroundColor: cfg.borderColor }]} />

      <View style={mealStyles.rowContent}>
        {/* Header */}
        <View style={mealStyles.rowHeader}>
          <View style={[mealStyles.emojiWrap, { backgroundColor: cfg.iconBg }]}>
            <Text style={mealStyles.emoji}>{cfg.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[mealStyles.mealName, { color: cfg.iconColor }]}>{meal}</Text>
            <Text style={mealStyles.mealTime}>{cfg.time}</Text>
          </View>
        </View>
        {/* Items */}
        <Text style={mealStyles.itemsText}>{itemArray.join(' · ')}</Text>
      </View>
    </View>
  );
}

const mealStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  accentBar: {
    width: 4,
    minHeight: 80,
  },
  rowContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  emojiWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 15 },
  mealName: { fontSize: 14, fontWeight: '700' },
  mealTime: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  itemsText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    paddingLeft: 42,
  },
});

// ── Quick Action Item ─────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: FileText,    label: 'Dues',     screen: 'Dues' },
  { icon: PieChart,    label: 'Expenses', screen: 'Expenses' },
  { icon: Megaphone,   label: 'Notices',  screen: 'Notices' },
  { icon: Wrench,      label: 'Complaints', screen: 'Complaints' },
  { icon: User,        label: 'Profile',  screen: 'Profile' },
  { icon: HelpCircle,  label: 'Support',  screen: 'Messages' },
  { icon: CreditCard,  label: 'Payments', screen: 'Payments' },
  { icon: MoreHorizontal, label: 'More',  screen: 'More' },
];

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const { user, refreshUser, connectedHostel } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [recentNotice, setRecentNotice] = useState<any>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>(todayMenu);

  const fetchData = async () => {
    try {
      const [noticesRes, feesRes, menuRes] = await Promise.allSettled([
        api.get('/notices'),
        api.get('/fees/my-fees'),
        user?.hostel_id ? api.get(`/mess-menu/${user.hostel_id}`) : Promise.resolve({ data: { success: false } }),
      ]);

      if (noticesRes.status === 'fulfilled' && noticesRes.value.data?.success) {
        const n = noticesRes.value.data.data;
        if (n && n.length > 0) {
          setRecentNotice({
            id: String(n[0].notice_id),
            title: n[0].title,
            body: n[0].content,
            category: n[0].notice_type || 'General',
            date: n[0].created_at.slice(0, 10),
            pinned: false,
          });
        }
      }

      if (feesRes.status === 'fulfilled' && feesRes.value.data?.success) {
        const fees = feesRes.value.data.data;
        // Flatten payments
        let allPayments: any[] = [];
        fees.forEach((f: any) => {
          f.payments?.forEach((p: any) => {
            allPayments.push({
              id: p.payment_id,
              amount: p.amount,
              month: f.fee_month,
              paidOn: p.payment_date ? p.payment_date.slice(0, 10) : '',
              status: 'Paid'
            });
          });
        });
        // Sort by paidOn desc
        allPayments.sort((a, b) => new Date(b.paidOn).getTime() - new Date(a.paidOn).getTime());
        setRecentPayments(allPayments.slice(0, 3));
      }

      if (menuRes.status === 'fulfilled' && menuRes.value.data?.success) {
        const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayStr = shortDays[new Date().getDay()];
        const menu = menuRes.value.data.menu || [];
        const todayItems = menu.filter((m: any) => m.day_of_week === todayStr);
        if (todayItems.length > 0) {
          const mapped = todayItems.map((m: any) => ({
            meal: m.meal_type,
            items: m.items,
          }));
          setMenuItems(mapped);
        }
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      fetchData();
    }, [user?.hostel_id]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    await fetchData();
    setRefreshing(false);
  }, [refreshUser, user?.hostel_id]);

  const isAllocated = !!user?.is_allocated;
  const hasDue = Number(user?.outstanding_due || 0) > 0;
  const unread = 0; // Replace with actual unread count if notifications API exists
  const initials = (user?.name || 'T').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
        {/* ── Premium Purple Header ───────────────────────────────────────── */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Floating circles */}
          <View style={styles.hCircle1} />
          <View style={styles.hCircle2} />
          <View style={styles.hCircle3} />

          {/* Header content */}
          <View style={styles.headerContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingText}>{greeting()} 👋</Text>
              <Text style={styles.nameText} numberOfLines={1}>
                {user?.name || 'Welcome'}
              </Text>
              {user?.room_number && (
                <View style={styles.roomPill}>
                  <BedDouble size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.roomPillText}>Room {user.room_number}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => navigation.navigate('Messages')}
                activeOpacity={0.75}
              >
                <Bell size={20} color="#fff" />
                {unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.8}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* ── Due Summary Card ─────────────────────────────────────────────── */}
        {isAllocated && hasDue && (
          <View style={styles.dueSummaryCard}>
            <View style={styles.dueSummaryLeft}>
              <Text style={styles.dueSummaryLabel}>Total Due</Text>
              <Text style={styles.dueSummaryAmount}>
                {formatCurrency(user?.outstanding_due || 0)}
              </Text>
              <View style={styles.duePendingRow}>
                <View style={styles.pendingDot} />
                <Text style={styles.pendingText}>2 months pending</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.payNowBtn}
              onPress={() => navigation.navigate('Payments')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.payNowGrad}
              >
                <Text style={styles.payNowText}>Pay Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {isAllocated && !hasDue && (
          <View style={[styles.dueSummaryCard, styles.dueSummaryCardGreen]}>
            <View style={styles.dueSummaryLeft}>
              <Text style={[styles.dueSummaryLabel, { color: colors.success }]}>Monthly Rent</Text>
              <Text style={[styles.dueSummaryAmount, { color: colors.success }]}>
                {formatCurrency(user?.monthly_rent || 0)}
              </Text>
              <Text style={styles.pendingText}>✓ Fully paid</Text>
            </View>
            <View style={styles.clearedBadge}>
              <Text style={styles.clearedBadgeText}>Clear</Text>
            </View>
          </View>
        )}

        {!isAllocated && (
          <View style={[styles.dueSummaryCard, styles.dueSummaryCardWarn]}>
            <Clock size={18} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warnTitle}>Room not assigned</Text>
              <Text style={styles.warnBody}>Pull to refresh after owner assigns your room.</Text>
            </View>
          </View>
        )}

        {/* ── Today's Menu ─────────────────────────────────────────────────── */}
        <View style={styles.sectionRow}>
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
          {menuItems.length > 0 ? (
            menuItems.map((item, i) => (
              <MealRow
                key={item.meal}
                meal={item.meal}
                items={item.items}
                isLast={i === menuItems.length - 1}
              />
            ))
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>No menu available for today.</Text>
            </View>
          )}
        </View>

        {/* ── Quick Actions ─────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <TouchableOpacity
                key={action.label}
                style={styles.quickItem}
                onPress={() => navigation.navigate(action.screen)}
                activeOpacity={0.75}
              >
                <View style={styles.quickIconWrap}>
                  <Icon size={22} color={colors.primary} strokeWidth={1.5} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Latest Notice ─────────────────────────────────────────────────── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Latest Notice</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notices')}
            style={styles.seeAllBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>View all</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {recentNotice && (
          <TouchableOpacity
            style={styles.noticeCard}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Notices')}
          >
            <View style={styles.noticeAccent} />
            <View style={styles.noticeBody}>
              <View style={styles.noticePill}>
                <Megaphone size={11} color={colors.primary} />
                <Text style={styles.noticePillText}>{recentNotice.category}</Text>
              </View>
              <Text style={styles.noticeTitle}>{recentNotice.title}</Text>
              <Text style={styles.noticeText} numberOfLines={2}>{recentNotice.body}</Text>
              <Text style={styles.noticeDate}>{recentNotice.date}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Recent Payments ───────────────────────────────────────────────── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Dues')}
            style={styles.seeAllBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>View all</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.paymentCard}>
          {recentPayments.map((p, i) => (
            <View
              key={p.id}
              style={[styles.paymentRow, i < recentPayments.length - 1 && styles.paymentRowDivider]}
            >
              <View style={styles.paymentIconWrap}>
                <CreditCard size={16} color={colors.primary} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentMonth}>{p.month}</Text>
                <Text style={styles.paymentDate}>Paid on {p.paidOn}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
                <View style={styles.paidPill}>
                  <Text style={styles.paidPillText}>Paid</Text>
                </View>
              </View>
            </View>
          ))}
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
    paddingHorizontal: spacing.xl,
    paddingTop: 16,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  hCircle1: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -50, right: -30,
  },
  hCircle2: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)', top: 20, right: 70,
  },
  hCircle3: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: 0, left: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greetingText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 3 },
  nameText: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.4, marginBottom: 8 },
  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  roomPillText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: 2 },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  avatarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Due Summary ───────────────────────────────────────────────────────────
  dueSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: 6,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 110,
    ...shadow.card,
  },
  dueSummaryCardGreen: {
    borderColor: colors.successBorder,
    backgroundColor: '#F0FDF4',
  },
  dueSummaryCardWarn: {
    gap: 12,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningSoft,
  },
  dueSummaryLeft: { flex: 1 },
  dueSummaryLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 },
  dueSummaryAmount: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: 6 },
  duePendingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  pendingText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  payNowBtn: {
    borderRadius: radius.lg,
    ...shadow.raised,
  },
  payNowGrad: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNowText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  clearedBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  clearedBadgeText: { color: colors.success, fontWeight: '700', fontSize: 13 },
  warnTitle: { fontSize: 13, fontWeight: '700', color: colors.warning, marginBottom: 2 },
  warnBody: { fontSize: 12, color: colors.textMuted },

  // ── Section ───────────────────────────────────────────────────────────────
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing['2xl'],
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
    paddingHorizontal: spacing.xl,
  },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // ── Menu Card ─────────────────────────────────────────────────────────────
  menuCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },

  // ── Quick Actions ─────────────────────────────────────────────────────────
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: 0,
    marginBottom: 4,
  },
  quickItem: {
    width: `${100 / 4}%`,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  quickIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },

  // ── Notice Card ───────────────────────────────────────────────────────────
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    marginHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  noticeAccent: {
    width: 4,
    backgroundColor: colors.primary,
  },
  noticeBody: { flex: 1, padding: spacing.xl },
  noticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginBottom: 8,
  },
  noticePillText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  noticeText: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 6 },
  noticeDate: { fontSize: 11, color: colors.textSubtle },

  // ── Payment Card ──────────────────────────────────────────────────────────
  paymentCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  paymentRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  paymentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMonth: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 2 },
  paymentDate: { fontSize: 11, color: colors.textMuted },
  paymentAmount: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  paidPill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  paidPillText: { color: colors.success, fontSize: 10, fontWeight: '700' },
});
