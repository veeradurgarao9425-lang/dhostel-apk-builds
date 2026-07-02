import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChefHat, Info } from 'lucide-react-native';
import { colors, radius, spacing, shadow } from '../theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BLUE = '#2245D4';
const BLUE_DARK = '#1A36A8';

// ── Types ─────────────────────────────────────────────────────────────────────
type MealSlot = { items: string; time: string };
type DayMenu = { breakfast: MealSlot; lunch: MealSlot; dinner: MealSlot };
type WeekMenu = Record<string, DayMenu>;

// Map full day names from the API to the 3-letter keys used in the UI
const DAY_NAME_TO_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

// Default meal times (API does not provide times)
const MEAL_TIMES = {
  breakfast: '8:00 AM – 10:00 AM',
  lunch: '12:00 PM – 2:00 PM',
  dinner: '8:00 PM – 11:00 PM',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DATES: Record<string, string> = {
  Mon: '09', Tue: '10', Wed: '11', Thu: '12', Fri: '13', Sat: '14', Sun: '15',
};
const DAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

const MEALS = [
  { key: 'breakfast' as const, label: 'Breakfast', emoji: '☀️', color: '#F59E0B', bg: '#FFF4E5' },
  { key: 'lunch' as const, label: 'Lunch', emoji: '🍛', color: '#10B981', bg: '#E9FBF3' },
  { key: 'dinner' as const, label: 'Dinner', emoji: '🌙', color: colors.primary, bg: colors.primarySoft },
];

export default function FullMenuScreen({ navigation }: any) {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<string>('Mon');
  const [weekMenu, setWeekMenu] = useState<WeekMenu>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await api.get(`/mess-menu/${user?.hostel_id}`);
        const rows: any[] = res.data?.menu ?? [];
        const mapped: WeekMenu = {};
        rows.forEach((row) => {
          const shortKey = DAY_NAME_TO_SHORT[row.day_of_week];
          if (!shortKey) return;
          if (!mapped[shortKey]) {
            mapped[shortKey] = {
              breakfast: { items: '', time: MEAL_TIMES.breakfast },
              lunch:     { items: '', time: MEAL_TIMES.lunch     },
              dinner:    { items: '', time: MEAL_TIMES.dinner    },
            };
          }
          const mealType = row.meal_type?.toLowerCase();
          if (mealType === 'breakfast') mapped[shortKey].breakfast.items = row.items ?? '';
          if (mealType === 'lunch')     mapped[shortKey].lunch.items     = row.items ?? '';
          if (mealType === 'dinner')    mapped[shortKey].dinner.items    = row.items ?? '';
        });
        setWeekMenu(mapped);
      } catch {
        setWeekMenu({});
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [user?.hostel_id]);

  const dayMenu: DayMenu | null = weekMenu[selectedDay] ?? null;
  const hasMenu = Object.keys(weekMenu).length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={[BLUE, BLUE_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.hCircle1} />
        <View style={styles.hCircle2} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.headerEyebrow}>Mess Schedule</Text>
            <Text style={styles.headerTitle}>Weekly Menu</Text>
          </View>
          <View style={styles.chefIconWrap}>
            <ChefHat size={20} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.dayTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabsScroll}>
          {DAYS.map((day) => {
            const isSelected = day === selectedDay;
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayTab, isSelected && styles.dayTabActive]}
                onPress={() => setSelectedDay(day)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayTabDay, isSelected && styles.dayTabDayActive]}>{day}</Text>
                <Text style={[styles.dayTabDate, isSelected && styles.dayTabDateActive]}>{DATES[day]}</Text>
                {day === 'Mon' && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.dayTitleRow}>
          <Text style={styles.dayFullName}>{DAY_FULL[selectedDay]}</Text>
          <Text style={styles.dayDate}>June 2025</Text>
        </View>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !hasMenu || !dayMenu ? (
          <View style={styles.centeredState}>
            <ChefHat size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>Menu not set by hostel</Text>
          </View>
        ) : (
          MEALS.map((meal) => {
            const slot = dayMenu[meal.key];
            const itemsText = slot.items
              ? slot.items.split(',').map((s: string) => s.trim()).join('  •  ')
              : '—';
            return (
              <View key={meal.key} style={styles.mealCard}>
                <View style={[styles.mealHeader, { backgroundColor: meal.bg }]}>
                  <View style={styles.mealHeaderLeft}>
                    <Text style={styles.mealEmoji}>{meal.emoji}</Text>
                    <Text style={[styles.mealLabel, { color: meal.color }]}>{meal.label}</Text>
                  </View>
                  <Text style={[styles.mealTime, { color: meal.color }]}>{slot.time}</Text>
                </View>
                <View style={styles.mealBody}>
                  <Text style={styles.mealItems}>{itemsText}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.noteCard}>
          <Info size={16} color={colors.textMuted} />
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
  header: { paddingHorizontal: spacing.xl, paddingTop: Platform.OS === 'ios' ? 12 : 20, paddingBottom: 24, overflow: 'hidden' },
  hCircle1: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.07)', top: -40, right: -20 },
  hCircle2: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, right: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerEyebrow: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  chefIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  dayTabsWrapper: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayTabsScroll: { paddingHorizontal: spacing.xl, paddingVertical: 14, gap: spacing.md },
  dayTab: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.xl, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, minWidth: 58, position: 'relative' },
  dayTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayTabDay: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  dayTabDayActive: { color: 'rgba(255,255,255,0.9)' },
  dayTabDate: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 4 },
  dayTabDateActive: { color: '#fff' },
  todayDot: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },

  scrollContent: { padding: spacing.xl, paddingBottom: 100 },
  dayTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  dayFullName: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  dayDate: { fontSize: 14, fontWeight: '600', color: colors.textMuted },

  mealCard: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, overflow: 'hidden', ...shadow.card },
  mealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  mealHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealEmoji: { fontSize: 16 },
  mealLabel: { fontSize: 15, fontWeight: '800' },
  mealTime: { fontSize: 13, fontWeight: '700' },
  mealBody: { padding: 16 },
  mealItems: { fontSize: 15, color: colors.text, lineHeight: 24, fontWeight: '500' },

  noteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: 16, marginTop: spacing.md },
  noteText: { flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 20, fontWeight: '500' },

  centeredState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
});
