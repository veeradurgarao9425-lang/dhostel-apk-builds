import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, StatusBar, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Search, X } from 'lucide-react-native';
import { MonthYearPickerSheet } from '../../components/tenant/UIComponents';
// import CategoryGlowBadge from '../../components/tenant/ui/CategoryGlowBadge';
import CategoryHeroArt from '../../components/tenant/ui/CategoryHeroArt';
import { SkeletonListRow } from '../../components/tenant/ui/SkeletonLoader';
import { getCategoryTheme, getCategoryHeroImage } from '../../constants/categoryTheme';
import api from '../../services/api';

const { width } = Dimensions.get('window');


const BLUE = '#2245D4';
const BLUE_SOFT = '#EEF3FF';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#0D1B3E';
const TEXT_MID = '#4A5568';
const TEXT_LIGHT = '#9CA3AF';
const BG = '#F8FAFD';
const BORDER = '#E8EDF5';

const DONUT_R = 28;
const DONUT_SW = 12; // slightly thicker
const DONUT_SZ = (DONUT_R + DONUT_SW / 2 + 2) * 2;
const CIRC = 2 * Math.PI * DONUT_R;

export default function CategoryDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();

  const {
    categoryName = 'Food',
    spent = 0,
    totalPct = 0,
    selectedDateStr,
  } = route.params || {};

  const [selectedDate, setSelectedDate] = useState(selectedDateStr ? new Date(selectedDateStr) : new Date());
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState<any[]>([]);
  const [categoryTotal, setCategoryTotal] = useState(spent);
  const [categoryPct, setCategoryPct] = useState(totalPct);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/tenant-expenses');
      if (res.data && res.data.success) {
        const fetched = res.data.data;
        const formatted = fetched.map((e: any) => ({
          id: e.expense_id.toString(),
          title: e.title,
          time: (() => {
            try {
              const d = new Date(e.date);
              if (isNaN(d.getTime())) return e.date;
              const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
              const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              return `${dateStr} • ${timeStr}`;
            } catch {
              return String(e.date);
            }
          })(),
          cat: e.category,
          amt: Number(e.amount),
          date_raw: e.date,
          payment_mode: e.payment_mode,
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

        // Calculate percentage as before

        // Get all transactions in this category for the month, sorted by date
        const catMeta = getCategoryTheme(categoryName);
        const sortedRecent = [...categoryExpenses].sort((a, b) => {
          return new Date(b.date_raw).getTime() - new Date(a.date_raw).getTime();
        });

        const computedRecent = sortedRecent.map(e => {
          let displayTitle = e.title;
          if (!displayTitle || displayTitle.toLowerCase() === categoryName.toLowerCase()) {
            displayTitle = `${categoryName} expense`;
          }
          return {
            id: e.id,
            title: displayTitle,
            time: e.time,
            amt: e.amt,
            Icon: catMeta.Icon,
            payment_mode: e.payment_mode,
          };
        });
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
  const heroImage = getCategoryHeroImage(categoryName);
  const hasHeroImage = !!heroImage;
  const filteredRecent = recent.filter(item => item.title.toLowerCase().includes(searchQ.toLowerCase()));

  const strokeDashoffset = CIRC - (categoryPct / 100) * CIRC;

  return (
    <View style={s.safe}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Small Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 20) + 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={TEXT_DARK} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ marginLeft: 4 }}>
            <Text style={s.headerTitle}>{categoryName}</Text>
            <Text style={s.headerSubTitle}>Expense breakdown</Text>
          </View>
        </View>
        <TouchableOpacity style={s.headerMonthBtn} onPress={() => setShowMonthPicker(true)}>
          <Text style={s.headerMonthTxt}>{selectedDate.toLocaleString('en-US', { month: 'short', year: '2-digit' })}</Text>
          <ChevronDown size={14} color={TEXT_MID} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={[s.hero, { height: 200, marginTop: 16, marginHorizontal: 16, borderRadius: 24, marginBottom: 0 }]}>
        {hasHeroImage ? (
          <Image
            source={heroImage}
            style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', borderRadius: 24 }]}
            resizeMode="cover"
          />
        ) : (
          <>
            <LinearGradient colors={catMeta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
            <CategoryHeroArt category={categoryName} width={width} height={200} />
          </>
        )}

        {!hasHeroImage && (
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.22)']}
            style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
            pointerEvents="none"
          />
        )}

        {!hasHeroImage && (
          <View style={[s.heroInner, { flex: 1, justifyContent: 'center' }]}>
            <View style={s.heroContent}>
              <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: catMeta.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <catMeta.Icon size={38} color={catMeta.color} />
              </View>
              <Text style={s.heroTitle}>{categoryName}</Text>
              <Text style={s.heroSub}>{`All ${categoryName} expenses`}</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView 
        style={{ 
          backgroundColor: WHITE, 
          flex: 1 
        }}
        contentContainerStyle={s.scroll} 
        showsVerticalScrollIndicator={false}
      >
        {/* Total Overview */}
        <View style={s.overviewCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.overviewLabel}>Total Spent in {selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text>
            <Text style={s.overviewAmt}>₹ {categoryTotal.toLocaleString('en-IN')}</Text>
          </View>
          <View style={s.donutWrap}>
            <Svg width={DONUT_SZ} height={DONUT_SZ}>
              <Circle cx={DONUT_SZ / 2} cy={DONUT_SZ / 2} r={DONUT_R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={DONUT_SW} />
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
        ) : recent.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTxt}>No transactions recorded</Text>
          </View>
        ) : (
          <>
            {/* Search */}
            <View style={s.searchBox}>
              <Search size={15} color={TEXT_LIGHT} strokeWidth={2} />
              <TextInput
                style={s.searchInput}
                value={searchQ}
                onChangeText={setSearchQ}
                placeholder="Search transactions..."
                placeholderTextColor={TEXT_LIGHT}
              />
              {searchQ.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQ('')}>
                  <X size={14} color={TEXT_LIGHT} strokeWidth={3} />
                </TouchableOpacity>
              )}
            </View>

            {/* Transactions */}
            <Text style={s.sectionTitle}>Transactions</Text>
            <View style={s.listCard}>
              {filteredRecent.length === 0 ? (
                <View style={[s.empty, { paddingVertical: 20 }]}>
                  <Text style={s.emptyTxt}>No results found</Text>
                </View>
              ) : (
                filteredRecent.map((item, i) => {
                  return (
                    <View key={item.id} style={[s.row, i < filteredRecent.length - 1 && s.rowBorder]}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: catMeta.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <catMeta.Icon size={20} color={catMeta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rowTitle}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <Text style={s.rowSub}>{item.time}</Text>
                          {item.payment_mode && (
                            <View style={s.paymentBadge}>
                              <Text style={s.paymentText}>{item.payment_mode}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={s.rowAmt}>₹ {item.amt.toLocaleString('en-IN')}</Text>
                    </View>
                  );
                })
              )}
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
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WHITE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  headerSubTitle: { fontSize: 11, color: TEXT_MID, fontWeight: '600', marginTop: 2 },
  headerMonthBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, backgroundColor: BG,
    borderWidth: 1, borderColor: BORDER,
  },
  headerMonthTxt: { fontSize: 12, fontWeight: '700', color: TEXT_MID },

  hero: {
    overflow: 'hidden', position: 'relative',
  },
  heroInner: { paddingHorizontal: 16, paddingBottom: 0 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  monthPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
  },
  monthPillText: { fontSize: 12, fontWeight: '700', color: WHITE },
  heroContent: { alignItems: 'center', marginTop: 0 },
  heroTitle: {
    fontSize: 22, fontWeight: '800', color: WHITE, letterSpacing: -0.3, marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  heroSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.92)', fontWeight: '600', marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },

  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },

  overviewCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 20, marginBottom: 16,
  },
  overviewLabel: { fontSize: 11, fontWeight: '600', color: TEXT_MID, marginBottom: 4 },
  overviewAmt: { fontSize: 24, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.5, marginBottom: 8 },
  overviewSubBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: BLUE_SOFT },
  overviewSubText: { fontSize: 10, fontWeight: '700', color: BLUE },

  donutWrap: { position: 'relative', width: DONUT_SZ, height: DONUT_SZ, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  donutPctText: { fontSize: 14, fontWeight: '800', color: TEXT_DARK },
  donutLbl: { fontSize: 8, color: TEXT_LIGHT, fontWeight: '600' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 12, marginLeft: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', marginBottom: 20, paddingHorizontal: 12, borderRadius: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_DARK },

  listCard: {
    marginBottom: 24,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  rowTitle: { fontSize: 13, fontWeight: '600', color: TEXT_DARK, marginBottom: 2 },
  rowSub: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500' },
  rowAmt: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  rowPct: { fontSize: 11, fontWeight: '700', textAlign: 'right', marginTop: 2 },
  paymentBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  paymentText: { fontSize: 10, color: TEXT_MID, fontWeight: '600' },
  empty: { padding: 32, alignItems: 'center' },
  emptyTxt: { fontSize: 13, color: TEXT_MID, fontWeight: '600' },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER,
  },
  viewAllText: { fontSize: 14, fontWeight: '700' },
});
