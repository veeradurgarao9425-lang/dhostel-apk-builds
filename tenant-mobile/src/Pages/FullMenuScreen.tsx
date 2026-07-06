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
import { ArrowLeft, ChefHat, Info, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Sun, Utensils, ConciergeBell } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { CustomMonthYearPicker } from '../components/pickers/CustomMonthYearPicker';
import { colors, radius, spacing, shadow } from '../theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BLUE = '#2245D4';
const BLUE_DARK = '#1A36A8';

// ── Types ─────────────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
type MealSlot = { items: string; time: string };
type DayMenu = { breakfast: MealSlot; lunch: MealSlot; dinner: MealSlot };
type WeekMenu = Record<string, DayMenu>;

const DAY_NAME_TO_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const MEAL_TIMES = {
  breakfast: '8:00 AM – 10:00 AM',
  lunch: '12:00 PM – 2:00 PM',
  dinner: '8:00 PM – 11:00 PM',
};

const DAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

function getDaysInMonth(year: number, month: number) {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function formatDateToYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', time: '08:00 AM - 10:00 AM', Icon: Sun, color: '#EA580C', bg: '#FFFAF0', iconBg: '#FFE6C6' },
  { key: 'lunch', label: 'Lunch', time: '12:30 PM - 02:30 PM', Icon: Utensils, color: '#10B981', bg: '#ECFDF5', iconBg: '#D1FAE5' },
  { key: 'dinner', label: 'Dinner', time: '07:30 PM - 09:30 PM', Icon: ConciergeBell, color: '#7C3AED', bg: '#F5F3FF', iconBg: '#EDE9FE' },
];

export default function FullMenuScreen({ navigation }: any) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'menu' | 'calendar'>('menu');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showPicker, setShowPicker] = useState(false);
  const [weekMenu, setWeekMenu] = useState<WeekMenu>({});
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [skipsRaw, setSkipsRaw] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/mess-menu/${user?.hostel_id}`);
        const rows: any[] = res.data?.menu ?? [];
        const mapped: WeekMenu = {};
        rows.forEach((row) => {
          const rawDay = (row.day_of_week || '').trim();
          let shortKey = '';
          Object.keys(DAY_NAME_TO_SHORT).forEach(full => {
            if (
              rawDay.toLowerCase() === full.toLowerCase() || 
              rawDay.toLowerCase() === DAY_NAME_TO_SHORT[full].toLowerCase()
            ) {
              shortKey = DAY_NAME_TO_SHORT[full];
            }
          });

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
      }

      // Fetch skipped meals history
      try {
        const skipRes = await api.get('/mess/my-skips');
        const skips = skipRes.data?.data || [];
        setSkipsRaw(skips);
        const grouped: Record<string, number> = {};
        skips.forEach((s: any) => {
          if (s.skipped) {
            const dateStr = typeof s.meal_date === 'string' ? s.meal_date.split('T')[0] : '';
            if (dateStr) {
              grouped[dateStr] = (grouped[dateStr] || 0) + 1;
            }
          }
        });

        const marks: any = {};
        const todayStr = formatDateToYMD(new Date());
        
        Object.keys(grouped).forEach(date => {
          const skipsCount = grouped[date];
          let color = '#EAB308'; // Yellow for partial
          if (skipsCount >= 3) color = '#EF4444'; // Red for all skipped
          
          marks[date] = {
            customStyles: {
              container: {
                backgroundColor: color,
                borderRadius: 8
              },
              text: {
                color: 'white',
                fontWeight: 'bold'
              }
            }
          };
        });

        // Mark today
        if (!marks[todayStr]) {
          marks[todayStr] = {
            customStyles: {
              container: { borderWidth: 1, borderColor: BLUE, borderRadius: 8 },
              text: { color: BLUE, fontWeight: 'bold' }
            }
          };
        } else {
          marks[todayStr].customStyles.container.borderWidth = 2;
          marks[todayStr].customStyles.container.borderColor = BLUE;
        }

        setMarkedDates(marks);
      } catch {
        console.error("Failed to load skips");
      }

      setLoading(false);
    };
    fetchData();
  }, [user?.hostel_id]);

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const selectedDayName = DAYS[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1]; // map to Mon, Tue...
  const dayMenu: DayMenu | null = weekMenu[selectedDayName] ?? null;
  const hasMenu = Object.keys(weekMenu).length > 0;
  
  const selectedDateYMD = formatDateToYMD(selectedDate);
  const skipsForSelected = skipsRaw.filter(s => {
    const dStr = typeof s.meal_date === 'string' ? s.meal_date.split('T')[0] : '';
    return dStr === selectedDateYMD && s.skipped;
  });
  const skipTypes = skipsForSelected.map(s => s.meal_type.toLowerCase());

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, { backgroundColor: BLUE }]}>
        <View style={styles.hCircle1} />
        <View style={styles.hCircle2} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <ChevronLeft size={24} color="#fff" strokeWidth={3} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.headerTitle}>My Meals</Text>
            <Text style={styles.headerSub}>Check your daily mess schedule here</Text>
          </View>
        </View>
      </View>

      {/* Toggle View Below Header */}
      <View style={{ padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 }}>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'menu' && styles.toggleBtnActive]} 
            onPress={() => setViewMode('menu')}
          >
            <List size={16} color={viewMode === 'menu' ? BLUE : '#64748B'} />
            <Text style={[styles.toggleText, { color: viewMode === 'menu' ? BLUE : '#64748B' }]}>Weekly Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleBtnActive]} 
            onPress={() => setViewMode('calendar')}
          >
            <CalendarIcon size={16} color={viewMode === 'calendar' ? BLUE : '#64748B'} />
            <Text style={[styles.toggleText, { color: viewMode === 'calendar' ? BLUE : '#64748B' }]}>Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'menu' ? (
        <>
          <View style={styles.monthHeaderRow}>
            <TouchableOpacity onPress={() => {
              const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
              setCurrentMonth(d);
              setSelectedDate(d);
            }}>
              <ChevronLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthHeaderText}>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
            {(() => {
              const now = new Date();
              const isFutureMonth = currentMonth.getFullYear() > now.getFullYear() || (currentMonth.getFullYear() === now.getFullYear() && currentMonth.getMonth() >= now.getMonth());
              return (
                <TouchableOpacity 
                  disabled={isFutureMonth}
                  style={{ opacity: isFutureMonth ? 0.3 : 1 }}
                  onPress={() => {
                    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
                    setCurrentMonth(d);
                    setSelectedDate(d);
                  }}
                >
                  <ChevronRight size={20} color={colors.text} />
                </TouchableOpacity>
              );
            })()}
          </View>
          <View style={styles.dayTabsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabsScroll}>
              {daysInMonth.map((day) => {
                const isSelected = formatDateToYMD(day) === formatDateToYMD(selectedDate);
                const dayNameShort = DAYS[day.getDay() === 0 ? 6 : day.getDay() - 1];
                const isToday = formatDateToYMD(day) === formatDateToYMD(new Date());
                const dayMarks = markedDates[formatDateToYMD(day)];
                const hasSkips = !!dayMarks;
                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    style={[styles.dayTab, isSelected && styles.dayTabActive]}
                    onPress={() => setSelectedDate(day)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dayTabDay, isSelected && styles.dayTabDayActive]}>{dayNameShort}</Text>
                    <Text style={[styles.dayTabDate, isSelected && styles.dayTabDateActive]}>{String(day.getDate()).padStart(2, '0')}</Text>
                    {isToday && <View style={styles.todayDot} />}
                    {hasSkips && !isToday && <View style={[styles.todayDot, { backgroundColor: dayMarks?.customStyles?.container?.backgroundColor || '#EAB308' }]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

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
                const itemsArr = slot.items ? slot.items.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) : [];
                const isSkipped = skipTypes.includes(meal.key);
                return (
                  <View key={meal.key} style={[styles.mealCard, isSkipped && { opacity: 0.6 }]}>
                    <View style={[styles.mealHeader, { backgroundColor: isSkipped ? '#F9FAFB' : meal.bg }]}>
                      <View style={styles.mealHeaderLeft}>
                        <View style={{ backgroundColor: isSkipped ? '#F3F4F6' : meal.iconBg, borderRadius: 12, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                          <meal.Icon size={18} color={isSkipped ? '#9CA3AF' : meal.color} strokeWidth={2.5} />
                        </View>
                        <Text style={[styles.mealLabel, { color: isSkipped ? '#9CA3AF' : meal.color }]}>{meal.label}</Text>
                      </View>
                      <Text style={[styles.mealTime, { color: isSkipped ? '#9CA3AF' : meal.color }]}>{slot.time}</Text>
                    </View>
                    <View style={styles.mealBody}>
                      {itemsArr.length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {itemsArr.map((item, idx) => {
                            const colorTheme = isSkipped ? { bg: '#F1F5F9', text: '#94A3B8' } : { bg: meal.bg, text: meal.color };
                            return (
                              <View key={idx} style={{ backgroundColor: colorTheme.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                                <Text style={[{ fontSize: 13, fontWeight: '700', color: colorTheme.text }, isSkipped && { textDecorationLine: 'line-through' }]}>{item}</Text>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.mealItems}>—</Text>
                      )}
                      {isSkipped && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <XCircle size={14} color="#EF4444" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Marked as Skipped</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.calendarCard}>
            <Calendar
              markingType={'custom'}
              markedDates={markedDates}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: BLUE,
                selectedDayTextColor: '#ffffff',
                todayTextColor: BLUE,
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                arrowColor: BLUE,
                monthTextColor: colors.text,
                indicatorColor: BLUE,
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '500',
              }}
            />
          </View>
          
          <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Meal History Legend</Text>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
              <Text style={styles.legendText}>Skipped 1 or 2 meals</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Skipped all meals</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#F1F5F9' }]} />
              <Text style={styles.legendText}>Ate all meals (No skips)</Text>
            </View>
          </View>
        </ScrollView>
      )}

      <CustomMonthYearPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onConfirm={(d) => {
          setCurrentMonth(d);
          setSelectedDate(new Date(d.getFullYear(), d.getMonth(), 1));
        }}
        initialDate={currentMonth}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: Platform.OS === 'ios' ? 12 : 20, paddingBottom: 12, overflow: 'hidden' },
  hCircle1: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.07)', top: -40, right: -20 },
  hCircle2: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, right: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  chefIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  
  toggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#fff' },
  toggleText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  toggleTextActive: { color: BLUE },

  monthHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  monthHeaderText: { fontSize: 16, fontWeight: '700', color: colors.text },

  dayTabsWrapper: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayTabsScroll: { paddingHorizontal: spacing.xl, paddingVertical: 14, gap: spacing.md },
  dayTab: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.xl, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, minWidth: 58, position: 'relative' },
  dayTabActive: { backgroundColor: BLUE, borderColor: BLUE },
  dayTabDay: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  dayTabDayActive: { color: 'rgba(255,255,255,0.9)' },
  dayTabDate: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 4 },
  dayTabDateActive: { color: '#fff' },
  todayDot: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },

  scrollContent: { padding: spacing.xl, paddingBottom: 100 },
  dayTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  dayFullName: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },

  mealCard: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, overflow: 'hidden', ...shadow.card },
  mealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  mealHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealEmoji: { fontSize: 16 },
  mealLabel: { fontSize: 15, fontWeight: '800' },
  mealTime: { fontSize: 13, fontWeight: '700' },
  mealBody: { padding: 16 },
  mealItems: { fontSize: 15, color: colors.text, lineHeight: 24, fontWeight: '500' },

  centeredState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  
  calendarCard: { backgroundColor: '#fff', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: colors.border, ...shadow.card, marginBottom: 20 },
  legendContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
  legendTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' }
});
