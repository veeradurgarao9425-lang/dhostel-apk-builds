import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  Dimensions, Animated, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  BarChart2, Plus, TrendingUp, TrendingDown,
  Utensils, Car, ShoppingBag, Receipt,
  Film, HeartPulse, MoreHorizontal, ChevronDown,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// ── Theme ─────────────────────────────────────────────────────────────────────
const BLUE       = '#2245D4';
const BLUE_SOFT  = '#EEF3FF';
const WHITE      = '#FFFFFF';
const TEXT_DARK  = '#0D1B3E';
const TEXT_MID   = '#4A5568';
const TEXT_LIGHT = '#9CA3AF';
const BG         = '#F8FAFD';
const BORDER     = '#E8EDF5';

type TabKey = 'Overview' | 'Categories' | 'Analytics';

// ── Data ───────────────────────────────────────────────────────────────────────
const BREAKDOWN = [
  { name: 'Food',      pct: 43, color: '#EF5350', bg: '#FDEAEA', amount: 1570, Icon: Utensils },
  { name: 'Transport', pct: 23, color: BLUE,       bg: BLUE_SOFT, amount: 840,  Icon: Car },
  { name: 'Shopping',  pct: 17, color: '#43A047',  bg: '#EAF5EA', amount: 620,  Icon: ShoppingBag },
  { name: 'Others',    pct: 17, color: '#FB8C00',  bg: '#FFF3E0', amount: 620,  Icon: MoreHorizontal },
];

const RECENT_DATA = [
  { id: '1', title: 'Breakfast',   time: 'Today, 08:30 AM', cat: 'Food',      amt: 120, color: '#EF5350', bg: '#FDEAEA', Icon: Utensils },
  { id: '2', title: 'Auto Ride',   time: 'Today, 09:15 AM', cat: 'Transport', amt: 80,  color: BLUE,      bg: BLUE_SOFT, Icon: Car },
  { id: '3', title: 'Groceries',   time: 'Today, 11:45 AM', cat: 'Shopping',  amt: 150, color: '#43A047', bg: '#EAF5EA', Icon: ShoppingBag },
  { id: '4', title: 'Evening Tea', time: 'Today, 04:20 PM', cat: 'Food',      amt: 50,  color: '#EF5350', bg: '#FDEAEA', Icon: Utensils },
];

const MONTHLY = [
  { month: 'Jan', amt: 2800 }, { month: 'Feb', amt: 3200 }, { month: 'Mar', amt: 2600 },
  { month: 'Apr', amt: 3800 }, { month: 'May', amt: 3100 }, { month: 'Jun', amt: 3650 },
];
const MAX_AMT = Math.max(...MONTHLY.map(m => m.amt));
const MONTH_TOTAL = 3650;

// ── Donut Chart ────────────────────────────────────────────────────────────────
const R = 48; const SW = 20; const SZ = (R + SW / 2 + 4) * 2; const CIRC = 2 * Math.PI * R;

function Donut({ total }: { total: number }) {
  let cum = CIRC / 4;
  const segs = BREAKDOWN.map(seg => {
    const full = (seg.pct / 100) * CIRC;
    const vis = full - 5;
    const item = { ...seg, dl: vis, dg: CIRC - vis, off: cum };
    cum -= full;
    return item;
  });
  return (
    <View style={{ position: 'relative', width: SZ, height: SZ }}>
      <Svg width={SZ} height={SZ}>
        <Circle cx={SZ / 2} cy={SZ / 2} r={R} fill="none" stroke={BORDER} strokeWidth={SW} />
        {segs.map((s, i) => (
          <Circle key={i} cx={SZ / 2} cy={SZ / 2} r={R} fill="none"
            stroke={s.color} strokeWidth={SW}
            strokeDasharray={`${s.dl} ${s.dg}`}
            strokeDashoffset={s.off} strokeLinecap="butt"
          />
        ))}
      </Svg>
      <View style={st.donutCenter}>
        <Text style={st.donutAmt}>₹{(total / 1000).toFixed(1)}k</Text>
        <Text style={st.donutLbl}>Total</Text>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ExpensesScreen({ navigation }: any) {
  const [tab, setTab] = useState<TabKey>('Overview');

  const tabKeys: TabKey[] = ['Overview', 'Categories', 'Analytics'];
  const tabAnim = useRef(new Animated.Value(0)).current;

  const handleTab = (t: TabKey) => {
    const idx = tabKeys.indexOf(t);
    Animated.spring(tabAnim, { toValue: idx, useNativeDriver: false, friction: 8 }).start();
    setTab(t);
  };

  const tabW = (width - 32 - 12) / 3;
  const indicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [6, 6 + tabW, 6 + tabW * 2],
  });

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Header */}
      <View style={st.header}>
        <Text style={st.headerTitle}>Expenses</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={st.monthPill} activeOpacity={0.7}>
            <Text style={st.monthPillText}>Jun '25</Text>
            <ChevronDown size={13} color={BLUE} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity style={st.headerIcon} activeOpacity={0.7}>
            <BarChart2 size={20} color={BLUE} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Animated Tabs */}
      <View style={st.tabsOuter}>
        <View style={st.tabsTrack}>
          <Animated.View style={[st.tabIndicator, { left: indicatorLeft, width: tabW }]} />
          {tabKeys.map(t => (
            <TouchableOpacity key={t} style={[st.tabBtn, { width: tabW }]} onPress={() => handleTab(t)} activeOpacity={0.7}>
              <Text style={[st.tabText, tab === t && st.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
        {tab === 'Overview'   && <OverviewTab navigation={navigation} />}
        {tab === 'Categories' && <CategoriesTab navigation={navigation} />}
        {tab === 'Analytics'  && <AnalyticsTab />}
      </ScrollView>

      {/* FAB — raised well above tab bar */}
      <TouchableOpacity style={st.fab} onPress={() => navigation.navigate('AddExpense')} activeOpacity={0.85}>
        <Plus size={28} color={WHITE} strokeWidth={3} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab({ navigation }: { navigation: any }) {
  const total = MONTH_TOTAL;

  return (
    <>
      {/* ── Summary card */}
      <View style={st.card}>

        {/* Total spent row — left: label+amount+trend | right: donut */}
        <View style={st.summaryTopRow}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={st.summaryLabel}>Total Spent</Text>
            <Text style={st.summaryAmt}>₹{total.toLocaleString('en-IN')}</Text>
            {/* Trend badge */}
            <View style={st.trendBadge}>
              <TrendingUp size={13} color="#EF4444" strokeWidth={2.5} />
              <Text style={st.trendUp}>↑ 12%</Text>
              <Text style={st.trendVs}>vs Last Month</Text>
            </View>
          </View>

          {/* Donut on right */}
          <Donut total={total} />
        </View>

        {/* Divider */}
        <View style={st.cardDivider} />

        {/* Legend — color dot | name | flexible spacer | amount | pct pill */}
        <View style={st.legendWrap}>
          {BREAKDOWN.map(s => (
            <View key={s.name} style={st.legendRow}>
              <View style={[st.legendDot, { backgroundColor: s.color }]} />
              <Text style={st.legendName}>{s.name}</Text>
              <Text style={st.legendAmt}>₹{s.amount.toLocaleString('en-IN')}</Text>
              <View style={[st.legendPctPill, { backgroundColor: s.bg }]}>
                <Text style={[st.legendPctText, { color: s.color }]}>{s.pct}%</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Recent Transactions */}
      <View style={st.sectionHeader}>
        <Text style={st.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AllExpenses')} activeOpacity={0.7}>
          <Text style={st.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={st.listCard}>
        {RECENT_DATA.map((item, i) => {
          const Icon = item.Icon;
          return (
            <View key={item.id} style={[st.listRow, i < RECENT_DATA.length - 1 && st.rowDivider]}>
              <View style={[st.rowIcon, { backgroundColor: item.bg }]}>
                <Icon size={18} color={item.color} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.rowTitle}>{item.title}</Text>
                <Text style={st.rowTime}>{item.time}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.rowAmt}>₹ {item.amt}</Text>
                <View style={[st.catTag, { backgroundColor: item.bg }]}>
                  <Text style={[st.catTagText, { color: item.color }]}>{item.cat}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}

// ── Categories Tab ─────────────────────────────────────────────────────────────
function CategoriesTab({ navigation }: { navigation: any }) {
  return (
    <>
      <View style={st.sectionHeader}>
        <Text style={st.sectionTitle}>By Category</Text>
      </View>

      {/* 3-stat summary strip */}
      <View style={st.statStrip}>
        <View style={st.statItem}>
          <Text style={st.statVal}>₹3,650</Text>
          <Text style={st.statLbl}>This Month</Text>
        </View>
        <View style={st.statDivider} />
        <View style={st.statItem}>
          <Text style={st.statVal}>{BREAKDOWN.length}</Text>
          <Text style={st.statLbl}>Categories</Text>
        </View>
        <View style={st.statDivider} />
        <View style={st.statItem}>
          <Text style={[st.statVal, { color: '#EF5350' }]}>Food</Text>
          <Text style={st.statLbl}>Top Spend</Text>
        </View>
      </View>

      <View style={st.listCard}>
        {BREAKDOWN.map((seg, i) => {
          const Icon = seg.Icon;
          return (
            <TouchableOpacity 
              key={seg.name} 
              style={[st.catDetailRow, i < BREAKDOWN.length - 1 && st.rowDivider]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('CategoryDetail', {
                categoryName: seg.name,
                spent: seg.amount,
                totalPct: seg.pct,
                color: seg.color,
                bg: seg.bg
              })}
            >
              <View style={[st.rowIcon, { backgroundColor: seg.bg }]}>
                <Icon size={18} color={seg.color} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={st.catDetailTop}>
                  <Text style={st.rowTitle}>{seg.name}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={st.rowAmt}>₹{seg.amount.toLocaleString('en-IN')}</Text>
                    <Text style={[st.catPctText, { color: seg.color }]}>{seg.pct}%</Text>
                  </View>
                </View>
                <View style={st.barTrack}>
                  <View style={[st.barFill, { width: `${seg.pct}%` as any, backgroundColor: seg.color }]} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const months = MONTHLY.map(m => ({ ...m, h: Math.round((m.amt / MAX_AMT) * 100) }));

  return (
    <>
      {/* Top insight Hero Card */}
      <View style={st.heroAnalyticsCard}>
        {/* Top: This Month */}
        <View style={st.heroTop}>
          <View>
            <Text style={st.heroLabel}>Total Spend This Month</Text>
            <Text style={st.heroAmount}>₹3,650</Text>
          </View>
          <View style={st.heroTrend}>
            <TrendingUp size={16} color={WHITE} strokeWidth={3} />
            <Text style={st.heroTrendText}>12%</Text>
          </View>
        </View>
        
        <View style={st.heroDivider} />
        
        {/* Bottom: Daily & 6M */}
        <View style={st.heroBottom}>
          <View style={st.heroStatCol}>
            <Text style={st.heroStatLabel}>Daily Average</Text>
            <Text style={st.heroStatVal}>₹118</Text>
          </View>
          <View style={st.heroStatLine} />
          <View style={st.heroStatCol}>
            <Text style={st.heroStatLabel}>Total (6 Months)</Text>
            <Text style={st.heroStatVal}>₹22,150</Text>
          </View>
        </View>
      </View>

      {/* Monthly bar chart */}
      <View style={st.sectionHeader}>
        <Text style={st.sectionTitle}>6-Month Overview</Text>
      </View>
      <View style={st.analyticsCard}>
        <View style={st.barChart}>
          {months.map(m => {
            const isLast = m.month === 'Jun';
            return (
              <View key={m.month} style={st.barCol}>
                {isLast && <Text style={[st.barAmt, { color: BLUE }]}>
                  ₹{(m.amt / 1000).toFixed(1)}k
                </Text>}
                {!isLast && <Text style={st.barAmt}>
                  {(m.amt / 1000).toFixed(1)}k
                </Text>}
                <View style={[st.barFillV, {
                  height: m.h,
                  backgroundColor: isLast ? BLUE : BLUE_SOFT,
                  borderRadius: 8,
                }]} />
                <Text style={[st.barLabel, isLast && { color: BLUE, fontWeight: '800' }]}>{m.month}</Text>
              </View>
            );
          })}
        </View>
        <View style={st.chartLegendRow}>
          <View style={st.chartLegendItem}>
            <View style={[st.chartLegendDot, { backgroundColor: BLUE }]} />
            <Text style={st.chartLegendText}>Current month</Text>
          </View>
          <View style={st.chartLegendItem}>
            <View style={[st.chartLegendDot, { backgroundColor: BLUE_SOFT, borderWidth: 1, borderColor: '#C5D3FF' }]} />
            <Text style={st.chartLegendText}>Previous months</Text>
          </View>
        </View>
      </View>

      {/* This week horizontal bars */}
      <View style={st.sectionHeader}>
        <Text style={st.sectionTitle}>This Week</Text>
        <Text style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: '600' }}>₹1,480 total</Text>
      </View>
      <View style={st.listCard}>
        {[
          { day: 'Mon', amt: 210, fill: 0.55 }, { day: 'Tue', amt: 85,  fill: 0.22 },
          { day: 'Wed', amt: 320, fill: 0.84 }, { day: 'Thu', amt: 150, fill: 0.39 },
          { day: 'Fri', amt: 95,  fill: 0.25 }, { day: 'Sat', amt: 270, fill: 0.71 },
          { day: 'Sun', amt: 350, fill: 0.92 },
        ].map((d, i, arr) => (
          <View key={d.day} style={[st.weekRow, i < arr.length - 1 && st.rowDivider]}>
            <Text style={st.weekDay}>{d.day}</Text>
            <View style={st.weekBarTrack}>
              <View style={[st.weekBarFill, { width: `${d.fill * 100}%` as any,
                backgroundColor: d.fill > 0.8 ? '#EF5350' : d.fill > 0.6 ? BLUE : BLUE_SOFT,
              }]} />
            </View>
            <Text style={[st.weekAmt, d.fill > 0.8 && { color: '#EF5350' }]}>₹{d.amt}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: WHITE },
  scroll: { paddingHorizontal: 16, paddingBottom: 140, paddingTop: 8 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.4 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: BLUE_SOFT, alignItems: 'center', justifyContent: 'center',
  },
  monthPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: BLUE,
    backgroundColor: BLUE_SOFT,
  },
  monthPillText: { fontSize: 13, fontWeight: '700', color: BLUE },

  // Tabs
  tabsOuter: { paddingHorizontal: 16, marginBottom: 14 },
  tabsTrack: {
    flexDirection: 'row', backgroundColor: '#F0F4FF',
    borderRadius: 14, padding: 6, position: 'relative', height: 44,
  },
  tabIndicator: {
    position: 'absolute', top: 6, bottom: 6,
    backgroundColor: WHITE, borderRadius: 10,
    shadowColor: BLUE, shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabBtn:         { alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tabText:        { fontSize: 13, fontWeight: '600', color: TEXT_MID },
  tabTextActive:  { color: BLUE, fontWeight: '800' },

  // Card
  card: {
    backgroundColor: WHITE, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: BORDER, marginBottom: 16,
    shadowColor: BLUE, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },

  // Summary — top row: text left, donut right
  summaryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  summaryLabel:  { fontSize: 12, fontWeight: '600', color: TEXT_LIGHT, marginBottom: 4 },
  summaryAmt:    { fontSize: 30, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.8, marginBottom: 8 },
  trendBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendUp:       { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  trendVs:       { fontSize: 12, color: TEXT_LIGHT, fontWeight: '500' },

  // Donut center text
  donutCenter: {
    position: 'absolute', top: 0, left: 0, width: SZ, height: SZ,
    alignItems: 'center', justifyContent: 'center',
  },
  donutAmt: { fontSize: 14, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.3 },
  donutLbl: { fontSize: 10, color: TEXT_LIGHT, fontWeight: '600', marginTop: 1 },

  cardDivider: { height: 1, backgroundColor: BORDER, marginBottom: 12 },

  // Legend — full width rows with amount + pct pill on right
  legendWrap: { gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: 13, fontWeight: '600', color: TEXT_DARK },
  legendAmt:  { fontSize: 13, fontWeight: '700', color: TEXT_MID, marginRight: 6 },
  legendPctPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, minWidth: 38, alignItems: 'center' },
  legendPctText: { fontSize: 11, fontWeight: '800' },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  viewAll:      { fontSize: 13, fontWeight: '700', color: BLUE },

  // Stat strip
  statStrip: {
    flexDirection: 'row', backgroundColor: BLUE_SOFT,
    borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#D4E0FF',
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: 15, fontWeight: '800', color: TEXT_DARK, marginBottom: 3 },
  statLbl:     { fontSize: 11, color: TEXT_MID, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#C7D6FF', marginVertical: 2 },

  // Analytics Hero Card
  heroAnalyticsCard: {
    backgroundColor: BLUE,
    borderRadius: 24, padding: 22, marginBottom: 24,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 6 },
  heroAmount: { fontSize: 38, color: WHITE, fontWeight: '900', letterSpacing: -1 },
  heroTrend: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4, marginTop: 4 },
  heroTrendText: { fontSize: 13, color: WHITE, fontWeight: '700' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 20 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStatCol: { flex: 1 },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 4 },
  heroStatVal: { fontSize: 18, color: WHITE, fontWeight: '700' },
  heroStatLine: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 20 },

  chartLegendRow:  { flexDirection: 'row', gap: 16, marginTop: 12 },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chartLegendDot:  { width: 10, height: 10, borderRadius: 5 },
  chartLegendText: { fontSize: 11, color: TEXT_MID, fontWeight: '600' },

  // List card
  listCard: {
    backgroundColor: WHITE, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, marginBottom: 16, overflow: 'hidden',
    shadowColor: BLUE, shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  listRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: BORDER },
  rowIcon:    { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowTitle:   { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  rowTime:    { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500' },
  rowAmt:     { fontSize: 15, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.3, marginBottom: 3 },
  catTag:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  catTagText: { fontSize: 10, fontWeight: '700' },

  // Categories tab
  catDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  catDetailTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  barTrack:     { height: 7, backgroundColor: BG, borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: 7, borderRadius: 4 },
  catPctText:   { fontSize: 11, fontWeight: '700', marginTop: 2 },

  // Analytics
  analyticsCard: {
    backgroundColor: WHITE, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: BORDER, marginBottom: 16,
    shadowColor: BLUE, shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  barChart:  { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140 },
  barCol:    { flex: 1, alignItems: 'center', gap: 6 },
  barAmt:    { fontSize: 9, color: TEXT_LIGHT, fontWeight: '700', textAlign: 'center' },
  barFillV:  { width: 28, borderRadius: 7 },
  barLabel:  { fontSize: 11, color: TEXT_MID, fontWeight: '600' },

  weekRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  weekDay:      { fontSize: 12, fontWeight: '700', color: TEXT_MID, width: 28 },
  weekBarTrack: { flex: 1, height: 8, backgroundColor: BG, borderRadius: 4, overflow: 'hidden' },
  weekBarFill:  { height: 8, borderRadius: 4, backgroundColor: BLUE, opacity: 0.75 },
  weekAmt:      { fontSize: 13, fontWeight: '700', color: TEXT_DARK, width: 50, textAlign: 'right' },

  // FAB — sits well above bottom tab bar (tab bar ~65px + safe area)
  fab: {
    position: 'absolute', bottom: 120, right: 20,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BLUE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
});
