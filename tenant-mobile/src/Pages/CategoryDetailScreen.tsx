import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowLeft, ChevronRight, ChevronDown, Utensils, Car, ShoppingBag, Receipt,
  Film, HeartPulse, MoreHorizontal, Coffee, Home,
  Plane, Zap, Gift, BookOpen, Dumbbell, Dog
} from 'lucide-react-native';
import { MonthYearPickerSheet } from '../components/UIComponents';
import api from '../services/api';

const { width } = Dimensions.get('window');

const BLUE       = '#2245D4';
const BLUE_SOFT  = '#EEF3FF';
const WHITE      = '#FFFFFF';
const TEXT_DARK  = '#0D1B3E';
const TEXT_MID   = '#4A5568';
const TEXT_LIGHT = '#9CA3AF';
const BG         = '#F8FAFD';
const BORDER     = '#E8EDF5';

const CATS: Record<string, { color: string; bg: string; Icon: any }> = {
  Food:          { color: '#EF5350', bg: '#FDEAEA', Icon: Utensils },
  Rent:          { color: '#546E7A', bg: '#ECEFF1', Icon: Home },
  Transport:     { color: BLUE,      bg: BLUE_SOFT, Icon: Car },
  Shopping:      { color: '#43A047', bg: '#EAF5EA', Icon: ShoppingBag },
  Health:        { color: '#E53935', bg: '#FDEAEA', Icon: HeartPulse },
  Entertainment: { color: '#8E24AA', bg: '#F4E5FA', Icon: Film },
  Travel:        { color: '#0288D1', bg: '#E1F5FE', Icon: Plane },
  Education:     { color: '#3949AB', bg: '#E8EAF6', Icon: BookOpen },
  Coffee:        { color: '#795548', bg: '#EFEBE9', Icon: Coffee },
  Gym:           { color: '#F4511E', bg: '#FBE9E7', Icon: Dumbbell },
  Utilities:     { color: '#F9A825', bg: '#FFFDE7', Icon: Zap },
  Gifts:         { color: '#EC407A', bg: '#FCE4EC', Icon: Gift },
  Pets:          { color: '#6D4C41', bg: '#EFEBE9', Icon: Dog },
  Bills:         { color: '#FB8C00', bg: '#FFF3E0', Icon: Receipt },
  Others:        { color: '#546E7A', bg: '#ECEFF1', Icon: MoreHorizontal },
};

const DONUT_R = 36;
const DONUT_SW = 12;
const DONUT_SZ = (DONUT_R + DONUT_SW / 2 + 2) * 2;
const CIRC = 2 * Math.PI * DONUT_R;

export default function CategoryDetailScreen({ navigation, route }: any) {
  const { 
    categoryName = 'Food', 
    spent = 0, 
    totalPct = 0, 
    selectedDateStr,
  } = route.params || {};

  const [selectedDate, setSelectedDate] = useState(selectedDateStr ? new Date(selectedDateStr) : new Date());
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [categoryTotal, setCategoryTotal] = useState(spent);
  const [categoryPct, setCategoryPct] = useState(totalPct);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/tenant-expenses');
      if (res.data && res.data.success) {
        const fetched = res.data.data;
        const formatted = fetched.map((e: any) => ({
          id: e.expense_id.toString(),
          title: e.title,
          time: new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          cat: e.category,
          amt: Number(e.amount),
          date_raw: e.date,
        }));

        // Filter by month & year
        const monthlyExpenses = formatted.filter((e: any) => {
          const eDate = new Date(e.date_raw);
          return eDate.getMonth() === selectedDate.getMonth() && eDate.getFullYear() === selectedDate.getFullYear();
        });

        // Filter by category name
        const categoryExpenses = monthlyExpenses.filter((e: any) => e.cat === categoryName);

        // Compute total spent in this category
        const catSpent = categoryExpenses.reduce((sum: number, e: any) => sum + e.amt, 0);
        setCategoryTotal(catSpent);

        // Compute percentage of total spent
        const totalSpent = monthlyExpenses.reduce((sum: number, e: any) => sum + e.amt, 0);
        const pct = totalSpent > 0 ? Math.round((catSpent / totalSpent) * 100) : 0;
        setCategoryPct(pct);

        // Group categoryExpenses by title to construct the Breakdown data dynamically
        const catMeta = CATS[categoryName] || CATS.Others;
        const groupedMap: Record<string, number> = {};
        categoryExpenses.forEach((e: any) => {
          groupedMap[e.title] = (groupedMap[e.title] || 0) + e.amt;
        });

        const computedBreakdown = Object.keys(groupedMap).map((name, index) => {
          const amt = groupedMap[name];
          const itemPct = catSpent > 0 ? Math.round((amt / catSpent) * 100) : 0;
          return {
            id: String(index + 1),
            name,
            amt,
            pct: itemPct,
            Icon: catMeta.Icon,
          };
        }).sort((a, b) => b.amt - a.amt);
        setBreakdown(computedBreakdown);

        // Get 4 most recent transactions in this category
        const sortedRecent = [...categoryExpenses].sort((a, b) => {
          return new Date(b.date_raw).getTime() - new Date(a.date_raw).getTime();
        }).slice(0, 4);

        const computedRecent = sortedRecent.map(e => ({
          id: e.id,
          title: e.title,
          time: e.time,
          amt: e.amt,
          Icon: catMeta.Icon,
        }));
        setRecent(computedRecent);
      }
    } catch (err) {
      console.error('Failed to fetch category detail expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, categoryName]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const catMeta = CATS[categoryName] || CATS.Others;
  const CatIcon = catMeta.Icon;
  const color = catMeta.color;
  const bg = catMeta.bg;

  const strokeDashoffset = CIRC - (categoryPct / 100) * CIRC;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={TEXT_DARK} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={[s.headerIconWrap, { backgroundColor: bg }]}>
          <CatIcon size={18} color={color} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{categoryName}</Text>
          <Text style={s.headerSub}>{`All ${categoryName} expenses`}</Text>
        </View>
        <TouchableOpacity style={s.monthPill} onPress={() => setShowMonthPicker(true)}>
          <Text style={s.monthPillText}>{selectedDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })}</Text>
          <ChevronDown size={14} color={TEXT_MID} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Total Overview */}
        <View style={s.overviewCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.overviewLabel}>Total Spent</Text>
            <Text style={s.overviewAmt}>₹ {categoryTotal.toLocaleString('en-IN')}</Text>
            <View style={s.overviewSubBadge}>
              <Text style={s.overviewSubText}>{categoryPct}% of total expenses</Text>
            </View>
          </View>
          <View style={s.donutWrap}>
            <Svg width={DONUT_SZ} height={DONUT_SZ}>
              <Circle cx={DONUT_SZ / 2} cy={DONUT_SZ / 2} r={DONUT_R} fill="none" stroke={BORDER} strokeWidth={DONUT_SW} />
              <Circle cx={DONUT_SZ / 2} cy={DONUT_SZ / 2} r={DONUT_R} fill="none"
                stroke={color} strokeWidth={DONUT_SW} strokeLinecap="round"
                strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${DONUT_SZ/2} ${DONUT_SZ/2})`}
              />
            </Svg>
            <View style={s.donutCenter}>
              <Text style={s.donutPctText}>{categoryPct}%</Text>
              <Text style={s.donutLbl}>of total</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 80, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={BLUE} />
          </View>
        ) : breakdown.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTxt}>No transactions recorded</Text>
          </View>
        ) : (
          <>
            {/* Breakdown */}
            <Text style={s.sectionTitle}>Breakdown</Text>
            <View style={s.listCard}>
              {breakdown.map((item, i) => {
                const Icon = item.Icon;
                return (
                  <View key={item.id} style={[s.row, i < breakdown.length - 1 && s.rowBorder]}>
                    <View style={[s.iconBox, { backgroundColor: bg }]}>
                      <Icon size={16} color={color} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={s.rowTitle}>{item.name}</Text>
                      <Text style={s.rowSub}>Transactions</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 6 }}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.rowAmt}>₹ {item.amt.toLocaleString('en-IN')}</Text>
                        <Text style={[s.rowPct, { color }]}>{item.pct}%</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Recent Transactions */}
            <Text style={s.sectionTitle}>Recent Transactions</Text>
            <View style={s.listCard}>
              {recent.map((item, i) => {
                const Icon = item.Icon;
                return (
                  <View key={item.id} style={[s.row, i < recent.length - 1 && s.rowBorder]}>
                    <View style={[s.iconBox, { backgroundColor: bg }]}>
                      <Icon size={16} color={color} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>{item.title}</Text>
                      <Text style={s.rowSub}>{item.time}</Text>
                    </View>
                    <Text style={s.rowAmt}>₹ {item.amt.toLocaleString('en-IN')}</Text>
                  </View>
                );
              })}
            </View>

            {/* View All Button */}
            <TouchableOpacity 
              style={s.viewAllBtn} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('TransactionsList', { categoryName, spent: categoryTotal, selectedDateStr: selectedDate.toISOString() })}
            >
              <Text style={[s.viewAllText, { color }]}>View All Transactions</Text>
              <ChevronRight size={18} color={color} strokeWidth={2.5} />
            </TouchableOpacity>
          </>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      <MonthYearPickerSheet
        visible={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        initialDate={selectedDate}
        onConfirm={(date) => {
          setSelectedDate(date);
          setShowMonthPicker(false);
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8, marginRight: 4 },
  headerIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  headerSub: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500', marginTop: 1 },
  monthPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: WHITE,
  },
  monthPillText: { fontSize: 11, fontWeight: '600', color: TEXT_MID },

  scroll: { padding: 16 },
  
  overviewCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: WHITE, borderRadius: 20, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: BORDER,
  },
  overviewLabel: { fontSize: 12, fontWeight: '600', color: TEXT_MID, marginBottom: 4 },
  overviewAmt: { fontSize: 32, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.5, marginBottom: 12 },
  overviewSubBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: BLUE_SOFT },
  overviewSubText: { fontSize: 10, fontWeight: '700', color: BLUE },

  donutWrap: { position: 'relative', width: DONUT_SZ, height: DONUT_SZ, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  donutPctText: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  donutLbl: { fontSize: 9, color: TEXT_LIGHT, fontWeight: '600' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 12, marginLeft: 4 },
  
  listCard: {
    backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    marginBottom: 24, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: TEXT_DARK, marginBottom: 2 },
  rowSub: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500' },
  rowAmt: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  rowPct: { fontSize: 11, fontWeight: '700', textAlign: 'right', marginTop: 2 },
  empty: { padding: 32, alignItems: 'center', backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER },
  emptyTxt: { fontSize: 13, color: TEXT_MID, fontWeight: '600' },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER,
  },
  viewAllText: { fontSize: 14, fontWeight: '700' },
});
