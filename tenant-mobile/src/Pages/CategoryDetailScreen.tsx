import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { ArrowLeft, ChevronRight, ChevronDown } from 'lucide-react-native';
import { MonthYearPickerSheet } from '../components/UIComponents';
import CategoryGlowBadge from '../components/ui/CategoryGlowBadge';
import CategoryHeroArt from '../components/ui/CategoryHeroArt';
import { SkeletonListRow } from '../components/ui/SkeletonLoader';
import { getCategoryTheme } from '../constants/categoryTheme';
import api from '../services/api';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 280;

const HERO_IMAGES: Record<string, any> = {
  Entertainment: require('../../assets/expenses/entertainment.jpeg'),
  Coffee: require('../../assets/expenses/cofee.jpeg'),
  Food: require('../../assets/expenses/food.jpeg'),
  Gym: require('../../assets/expenses/gym.jpeg'),
  Shopping: require('../../assets/expenses/shopping.jpeg'),
};

const BLUE = '#2245D4';
const BLUE_SOFT = '#EEF3FF';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#0D1B3E';
const TEXT_MID = '#4A5568';
const TEXT_LIGHT = '#9CA3AF';
const BG = '#F8FAFD';
const BORDER = '#E8EDF5';

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
        const catMeta = getCategoryTheme(categoryName);
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

  const catMeta = getCategoryTheme(categoryName);
  const color = catMeta.color;
  const heroImage = HERO_IMAGES[categoryName];
  const hasHeroImage = !!heroImage;

  const strokeDashoffset = CIRC - (categoryPct / 100) * CIRC;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Hero */}
      <View style={s.hero}>
        {hasHeroImage ? (
          <ImageBackground
            source={heroImage}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <>
            <LinearGradient colors={catMeta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <CategoryHeroArt category={categoryName} width={width} height={HERO_HEIGHT} />
          </>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0)', hasHeroImage ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.22)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={s.heroInner}>
          <View style={s.heroTopRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft size={22} color={WHITE} strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity style={s.monthPill} onPress={() => setShowMonthPicker(true)}>
              <Text style={s.monthPillText}>{selectedDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })}</Text>
              <ChevronDown size={14} color={WHITE} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {!hasHeroImage && (
            <View style={s.heroContent}>
              <CategoryGlowBadge category={categoryName} size="hero" pulse entrance />
              <Text style={s.heroTitle}>{categoryName}</Text>
              <Text style={s.heroSub}>{`All ${categoryName} expenses`}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Total Overview */}
        <View style={s.overviewCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.overviewLabel}>Total Spent in {selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text>
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
                transform={`rotate(-90 ${DONUT_SZ / 2} ${DONUT_SZ / 2})`}
              />
            </Svg>
            <View style={s.donutCenter}>
              <Text style={s.donutPctText}>{categoryPct}%</Text>
              <Text style={s.donutLbl}>of total</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={s.listCard}>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow last />
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
                return (
                  <View key={item.id} style={[s.row, i < breakdown.length - 1 && s.rowBorder]}>
                    <CategoryGlowBadge category={categoryName} size="md" style={{ marginRight: 12 }} />
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
                return (
                  <View key={item.id} style={[s.row, i < recent.length - 1 && s.rowBorder]}>
                    <CategoryGlowBadge category={categoryName} size="md" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>{item.title}</Text>
                      <Text style={s.rowSub}>{item.time}</Text>
                    </View>
                    <Text style={s.rowAmt}>₹ {item.amt.toLocaleString('en-IN')}</Text>
                  </View>
                );
              })}
            </View>
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
  hero: {
    minHeight: HERO_HEIGHT,
    overflow: 'hidden', position: 'relative',
  },
  heroInner: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  monthPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
  },
  monthPillText: { fontSize: 12, fontWeight: '700', color: WHITE },
  heroContent: { alignItems: 'center', marginTop: 8 },
  heroTitle: {
    fontSize: 22, fontWeight: '800', color: WHITE, letterSpacing: -0.3, marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  heroSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.92)', fontWeight: '600', marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },

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
