import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChefHat } from 'lucide-react-native';
import { colors, radius, spacing, font, shadow } from '../theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ── 7-day menu data ───────────────────────────────────────────────────────────
type MealSlot = { items: string; time: string };
type DayMenu = { breakfast: MealSlot; lunch: MealSlot; dinner: MealSlot };

const WEEK_MENU: Record<string, DayMenu> = {
  Mon: {
    breakfast: { items: 'Idli, Sambar, Chutney', time: '7:30 – 9:30 AM' },
    lunch:     { items: 'Rice, Dal, Veg Curry, Salad', time: '12:30 – 2:30 PM' },
    dinner:    { items: 'Chapathi, Paneer Curry, Pickle', time: '7:30 – 9:30 PM' },
  },
  Tue: {
    breakfast: { items: 'Poha, Boiled Eggs, Tea/Coffee', time: '7:30 – 9:30 AM' },
    lunch:     { items: 'Curd Rice, Sambar, Papad', time: '12:30 – 2:30 PM' },
    dinner:    { items: 'Roti, Dal Fry, Jeera Rice', time: '7:30 – 9:30 PM' },
  },
  Wed: {
    breakfast: { items: 'Upma, Coconut Chutney, Juice', time: '7:30 – 9:30 AM' },
    lunch:     { items: 'Biryani, Raita, Papad', time: '12:30 – 2:30 PM' },
    dinner:    { items: 'Puri, Aloo Sabzi, Dal', time: '7:30 – 9:30 PM' },
  },
  Thu: {
    breakfast: { items: 'Dosa, Sambar, Chutney', time: '7:30 – 9:30 AM' },
    lunch:     { items: 'Rice, Rasam, Fry, Salad', time: '12:30 – 2:30 PM' },
    dinner:    { items: 'Chapathi, Chana Masala, Rice', time: '7:30 – 9:30 PM' },
  },
  Fri: {
    breakfast: { items: 'Bread Toast, Omelette, Coffee', time: '7:30 – 9:30 AM' },
    lunch:     { items: 'Pulao, Dal Tadka, Raita', time: '12:30 – 2:30 PM' },
    dinner:    { items: 'Roti, Matar Paneer, Rice, Pickle', time: '7:30 – 9:30 PM' },
  },
  Sat: {
    breakfast: { items: 'Pongal, Vadai, Sambar', time: '7:30 – 9:30 AM' },
    lunch:     { items: 'Chicken Curry, Rice, Raita', time: '12:30 – 2:30 PM' },
    dinner:    { items: 'Naan, Butter Chicken / Paneer', time: '7:30 – 9:30 PM' },
  },
  Sun: {
    breakfast: { items: 'Aloo Paratha, Curd, Pickle', time: '8:00 – 10:00 AM' },
    lunch:     { items: 'Special Biryani, Raita, Sweet', time: '12:30 – 2:30 PM' },
    dinner:    { items: 'Chapathi, Dal Makhani, Rice', time: '7:30 – 9:30 PM' },
  },
};

const DEFAULT_MENU: Record<string, DayMenu> = JSON.parse(JSON.stringify(WEEK_MENU));

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DATES: Record<string, string> = {
  Mon: '09', Tue: '10', Wed: '11', Thu: '12', Fri: '13', Sat: '14', Sun: '15',
};
const DAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

// ── Meal slot config ──────────────────────────────────────────────────────────
const MEALS = [
  {
    key: 'breakfast' as const,
    label: 'Breakfast',
    emoji: '☀️',
    borderColor: '#F59E0B',
    iconBg: '#FFF8EC',
    time: '',
  },
  {
    key: 'lunch' as const,
    label: 'Lunch',
    emoji: '🍛',
    borderColor: '#16A34A',
    iconBg: '#EDFBF3',
    time: '',
  },
  {
    key: 'dinner' as const,
    label: 'Dinner',
    emoji: '🌙',
    borderColor: colors.primary,
    iconBg: colors.primarySoft,
    time: '',
  },
];

// ── Meal Row — Apple Settings-style ──────────────────────────────────────────
function MealRow({
  meal,
  slot,
  isLast,
}: {
  meal: typeof MEALS[0];
  slot: MealSlot;
  isLast: boolean;
}) {
  return (
    <View style={[rowStyles.row, !isLast && rowStyles.divider]}>
      {/* Left accent bar */}
      <View style={[rowStyles.accent, { backgroundColor: meal.borderColor }]} />

      <View style={rowStyles.content}>
        {/* Header row */}
        <View style={rowStyles.header}>
          <View style={[rowStyles.emojiWrap, { backgroundColor: meal.iconBg }]}>
            <Text style={rowStyles.emoji}>{meal.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[rowStyles.label, { color: meal.borderColor }]}>{meal.label}</Text>
            <Text style={rowStyles.time}>{slot.time}</Text>
          </View>
        </View>
        {/* Items */}
        <Text style={rowStyles.items}>
          {slot.items.split(',').map((s) => s.trim()).join(' · ')}
        </Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row' },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  accent: { width: 4 },
  content: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  emojiWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 16 },
  label: { fontSize: 15, fontWeight: '700' },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  items: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    paddingLeft: 44,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function FullMenuScreen({ navigation }: any) {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState('Mon');
  const [menuData, setMenuData] = useState<Record<string, DayMenu>>(DEFAULT_MENU);

  useEffect(() => {
    const fetchMenu = async () => {
      if (!user?.hostel_id) return;
      try {
        const res = await api.get(`/mess-menu/${user.hostel_id}`);
        if (res.data.success && res.data.menu && res.data.menu.length > 0) {
          const fetchedMenu = JSON.parse(JSON.stringify(DEFAULT_MENU));
          res.data.menu.forEach((m: any) => {
            const day = m.day_of_week;
            const type = m.meal_type.toLowerCase();
            if (fetchedMenu[day] && fetchedMenu[day][type]) {
              fetchedMenu[day][type].items = m.items;
              if (m.timing) fetchedMenu[day][type].time = m.timing;
            }
          });
          setMenuData(fetchedMenu);
        }
      } catch (err) {
        console.error('Failed to fetch mess menu:', err);
      }
    };
    fetchMenu();
  }, [user?.hostel_id]);

  const dayMenu = menuData[selectedDay];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Gradient Header ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.hCircle1} />
        <View style={styles.hCircle2} />

        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>Mess Schedule</Text>
            <Text style={styles.headerTitle}>Weekly Menu</Text>
          </View>
          <View style={styles.chefIconWrap}>
            <ChefHat size={20} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      {/* ── 7-day pill selector ─────────────────────────────────────────── */}
      <View style={styles.dayTabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabsScroll}
        >
          {DAYS.map((day) => {
            const isSelected = day === selectedDay;
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayTab, isSelected && styles.dayTabActive]}
                onPress={() => setSelectedDay(day)}
                activeOpacity={0.75}
              >
                <Text style={[styles.dayTabDay, isSelected && styles.dayTabDayActive]}>{day}</Text>
                <Text style={[styles.dayTabDate, isSelected && styles.dayTabDateActive]}>
                  {DATES[day]}
                </Text>
                {day === 'Mon' && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Menu Content ────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Day title */}
        <View style={styles.dayTitleRow}>
          <Text style={styles.dayFullName}>{DAY_FULL[selectedDay]}</Text>
          <Text style={styles.dayDate}>09 Jun 2025</Text>
        </View>

        {/* Apple Settings-style meal list */}
        <View style={styles.menuCard}>
          {MEALS.map((meal, i) => (
            <MealRow
              key={meal.key}
              meal={meal}
              slot={dayMenu[meal.key]}
              isLast={i === MEALS.length - 1}
            />
          ))}
        </View>

        {/* Info note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteIcon}>🕐</Text>
          <Text style={styles.noteText}>
            Timings may vary on public holidays. Sunday breakfast starts 30 min late.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  hCircle1: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -30, right: -20,
  },
  hCircle2: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, right: 80,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerEyebrow: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  chefIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Day tabs ──────────────────────────────────────────────────────────────
  dayTabsWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayTabsScroll: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  dayTab: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 52,
    position: 'relative',
  },
  dayTabActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  dayTabDay: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  dayTabDayActive: { color: colors.primary },
  dayTabDate: { fontSize: 11, color: colors.textSubtle, marginTop: 2 },
  dayTabDateActive: { color: colors.primary },
  todayDot: {
    position: 'absolute', top: 4, right: 4,
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: colors.danger,
  },

  // ── Scroll Content ────────────────────────────────────────────────────────
  scrollContent: { padding: spacing.xl, paddingBottom: 120 },

  dayTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dayFullName: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  dayDate: { fontSize: 13, color: colors.textMuted },

  // ── Menu card ─────────────────────────────────────────────────────────────
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadow.card,
  },

  // ── Info note ─────────────────────────────────────────────────────────────
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteIcon: { fontSize: 16 },
  noteText: { flex: 1, fontSize: font.small, color: colors.textMuted, lineHeight: 20 },
});
