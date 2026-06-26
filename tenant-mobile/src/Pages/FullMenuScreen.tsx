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
import { ArrowLeft, Coffee, Soup, Moon, ChefHat } from 'lucide-react-native';
import { colors, radius, spacing, font, shadow } from '../theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// 7-day menu data
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

// Dates for the week starting Mon 09 Jun 2025
const DATES: Record<string, string> = {
  Mon: '09', Tue: '10', Wed: '11', Thu: '12', Fri: '13', Sat: '14', Sun: '15',
};

const mealSlotConfig = [
  {
    key: 'breakfast' as const,
    label: 'Breakfast',
    icon: Coffee,
    gradient: ['#F59E0B', '#F97316'] as const,
    emoji: '☕',
    time: '',
  },
  {
    key: 'lunch' as const,
    label: 'Lunch',
    icon: Soup,
    gradient: ['#10B981', '#059669'] as const,
    emoji: '🍛',
    time: '',
  },
  {
    key: 'dinner' as const,
    label: 'Dinner',
    icon: Moon,
    gradient: ['#6366F1', '#8B5CF6'] as const,
    emoji: '🌙',
    time: '',
  },
];

function MealCard({ cfg, slot }: { cfg: typeof mealSlotConfig[0]; slot: MealSlot }) {
  const Icon = cfg.icon;
  return (
    <LinearGradient
      colors={cfg.gradient}
      style={styles.mealCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.mealCardTop}>
        <View style={styles.mealIconCircle}>
          <Icon size={18} color="#fff" />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.mealSlotLabel}>{cfg.emoji} {cfg.label}</Text>
          <Text style={styles.mealSlotTime}>{slot.time}</Text>
        </View>
      </View>
      <Text style={styles.mealItems}>{slot.items}</Text>
    </LinearGradient>
  );
}

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
          const fetchedMenu = JSON.parse(JSON.stringify(DEFAULT_MENU)); // start with defaults or empty
          res.data.menu.forEach((m: any) => {
            const day = m.day_of_week;
            const type = m.meal_type.toLowerCase();
            if (fetchedMenu[day] && fetchedMenu[day][type]) {
              fetchedMenu[day][type].items = m.items;
              if (m.timing) {
                fetchedMenu[day][type].time = m.timing;
              }
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Today's Menu</Text>
          <Text style={styles.headerSub}>Week of 09 Jun, 2025</Text>
        </View>
        <View style={styles.chefIcon}>
          <ChefHat size={20} color={colors.primary} />
        </View>
      </View>

      {/* 7-day tab pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayTabsScroll}
        style={styles.dayTabsRow}
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
              {day === 'Mon' && (
                <View style={styles.todayDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Meals */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.dayTitleRow}>
          <Text style={styles.dayFullName}>
            {selectedDay === 'Mon' ? 'Monday' :
             selectedDay === 'Tue' ? 'Tuesday' :
             selectedDay === 'Wed' ? 'Wednesday' :
             selectedDay === 'Thu' ? 'Thursday' :
             selectedDay === 'Fri' ? 'Friday' :
             selectedDay === 'Sat' ? 'Saturday' : 'Sunday'}
          </Text>
          <Text style={styles.dayFullDate}>09 Jun 2025</Text>
        </View>

        {mealSlotConfig.map((cfg) => (
          <MealCard key={cfg.key} cfg={cfg} slot={dayMenu[cfg.key]} />
        ))}

        {/* Info note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            🕐 Meal timings may vary on public holidays. Sunday special breakfast starts 30 min late.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: font.h3, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: font.tiny, color: colors.textSubtle, marginTop: 1 },
  chefIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Day tabs
  dayTabsRow: { flexShrink: 0 },
  dayTabsScroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dayTab: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 52,
    position: 'relative',
  },
  dayTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  dayTabDay: { fontSize: font.small, fontWeight: '700', color: colors.textMuted },
  dayTabDayActive: { color: '#fff' },
  dayTabDate: { fontSize: font.tiny, color: colors.textSubtle, marginTop: 2 },
  dayTabDateActive: { color: 'rgba(255,255,255,0.8)' },
  todayDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },

  // Scroll content
  scrollContent: { padding: spacing.lg, paddingBottom: 120 },

  dayTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dayFullName: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  dayFullDate: { fontSize: font.small, color: colors.textSubtle },

  // Meal card
  mealCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadow.raised,
  },
  mealCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mealIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealSlotLabel: { color: '#fff', fontWeight: '800', fontSize: font.body },
  mealSlotTime: { color: 'rgba(255,255,255,0.7)', fontSize: font.tiny, marginTop: 2 },
  mealItems: {
    color: '#fff',
    fontSize: font.body,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: 0.1,
  },

  // Note
  noteCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteText: { fontSize: font.small, color: colors.textMuted, lineHeight: 20 },
});
