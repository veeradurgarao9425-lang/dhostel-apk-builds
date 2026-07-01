import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChefHat, Info } from 'lucide-react-native';
import { colors, radius, spacing, font, shadow } from '../theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BLUE = '#2245D4';
const BLUE_DARK = '#1A36A8';

// ── 7-day menu data ───────────────────────────────────────────────────────────
type MealSlot = { items: string; time: string };
type DayMenu = { breakfast: MealSlot; lunch: MealSlot; dinner: MealSlot };

const WEEK_MENU: Record<string, DayMenu> = {
  Mon: {
    breakfast: { items: 'Idli, Sambar, Chutney', time: '8:00 AM – 10:00 AM' },
    lunch: { items: 'Rice, Dal, Veg Curry, Salad', time: '12:00 PM – 2:00 PM' },
    dinner: { items: 'Chapathi, Paneer Curry, Pickle', time: '8:00 PM – 11:00 PM' },
  },
  Tue: {
    breakfast: { items: 'Poha, Boiled Eggs, Tea/Coffee', time: '8:00 AM – 10:00 AM' },
    lunch: { items: 'Curd Rice, Sambar, Papad', time: '12:00 PM – 2:00 PM' },
    dinner: { items: 'Roti, Dal Fry, Jeera Rice', time: '8:00 PM – 11:00 PM' },
  },
  Wed: {
    breakfast: { items: 'Upma, Coconut Chutney, Juice', time: '8:00 AM – 10:00 AM' },
    lunch: { items: 'Biryani, Raita, Papad', time: '12:00 PM – 2:00 PM' },
    dinner: { items: 'Puri, Aloo Sabzi, Dal', time: '8:00 PM – 11:00 PM' },
  },
  Thu: {
    breakfast: { items: 'Dosa, Sambar, Chutney', time: '8:00 AM – 10:00 AM' },
    lunch: { items: 'Rice, Rasam, Fry, Salad', time: '12:00 PM – 2:00 PM' },
    dinner: { items: 'Chapathi, Chana Masala, Rice', time: '8:00 PM – 11:00 PM' },
  },
  Fri: {
    breakfast: { items: 'Bread Toast, Omelette, Coffee', time: '8:00 AM – 10:00 AM' },
    lunch: { items: 'Pulao, Dal Tadka, Raita', time: '12:00 PM – 2:00 PM' },
    dinner: { items: 'Roti, Matar Paneer, Rice, Pickle', time: '8:00 PM – 11:00 PM' },
  },
  Sat: {
    breakfast: { items: 'Pongal, Vadai, Sambar', time: '8:00 AM – 10:00 AM' },
    lunch: { items: 'Chicken Curry, Rice, Raita', time: '12:00 PM – 2:00 PM' },
    dinner: { items: 'Naan, Butter Chicken / Paneer', time: '8:00 PM – 11:00 PM' },
  },
  Sun: {
    breakfast: { items: 'Aloo Paratha, Curd, Pickle', time: '8:00 AM – 10:00 AM' },
    lunch: { items: 'Special Biryani, Raita, Sweet', time: '12:00 PM – 2:00 PM' },
    dinner: { items: 'Chapathi, Dal Makhani, Rice', time: '8:00 PM – 11:00 PM' },
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

const MEALS = [
  { key: 'breakfast' as const, label: 'Breakfast', emoji: '☀️', color: '#F59E0B', bg: '#FFF4E5' },
  { key: 'lunch' as const, label: 'Lunch', emoji: '🍛', color: '#10B981', bg: '#E9FBF3' },
  { key: 'dinner' as const, label: 'Dinner', emoji: '🌙', color: colors.primary, bg: colors.primarySoft },
];

export default function FullMenuScreen({ navigation }: any) {
  const [selectedDay, setSelectedDay] = useState<string>('Mon');
  const dayMenu = WEEK_MENU[selectedDay];

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

        {MEALS.map((meal) => {
          const slot = dayMenu[meal.key];
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
                <Text style={styles.mealItems}>
                  {slot.items.split(',').map(s => s.trim()).join('  •  ')}
                </Text>
              </View>
            </View>
          );
        })}

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
});
