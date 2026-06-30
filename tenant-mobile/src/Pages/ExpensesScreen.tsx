import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  BarChart2, ChevronDown, Plus, TrendingUp,
  Utensils, Car, ShoppingBag, MoreHorizontal,
  Receipt, Film, Stethoscope, Coffee,
} from 'lucide-react-native';
import { colors, spacing, radius, shadow } from '../theme';

type TabKey = 'Overview' | 'Categories' | 'Analytics';

// ── Donut chart constants ─────────────────────────────────────────────────────
const CHART_R = 62;
const CHART_SW = 24;
const CHART_SZ = (CHART_R + CHART_SW / 2 + 8) * 2; // 164
const CHART_CX = CHART_SZ / 2;
const CHART_CY = CHART_SZ / 2;
const CIRC = 2 * Math.PI * CHART_R;
const SEG_GAP = 6;

// ── Mock data ─────────────────────────────────────────────────────────────────
const BREAKDOWN = [
  { name: 'Food',      pct: 57, color: '#EF4444', amount: 2081, Icon: Utensils,     bg: '#FEE2E2' },
  { name: 'Transport', pct: 23, color: '#3B82F6', amount: 840,  Icon: Car,          bg: '#EFF6FF' },
  { name: 'Shopping',  pct: 12, color: '#10B981', amount: 438,  Icon: ShoppingBag,  bg: '#D1FAE5' },
  { name: 'Others',    pct: 8,  color: '#9CA3AF', amount: 291,  Icon: MoreHorizontal, bg: '#F3F4F6' },
];

const RECENT = [
  { id: '1', title: 'Breakfast',   time: 'Today, 08:30 AM', cat: 'Food',      amt: 120, color: '#EF4444', bg: '#FEE2E2', Icon: Utensils },
  { id: '2', title: 'Auto Ride',   time: 'Today, 09:15 AM', cat: 'Transport', amt: 80,  color: '#3B82F6', bg: '#EFF6FF', Icon: Car },
  { id: '3', title: 'Groceries',   time: 'Today, 11:45 AM', cat: 'Shopping',  amt: 150, color: '#10B981', bg: '#D1FAE5', Icon: ShoppingBag },
  { id: '4', title: 'Evening Tea', time: 'Today, 04:20 PM', cat: 'Food',      amt: 50,  color: '#EF4444', bg: '#FEE2E2', Icon: Utensils },
];

// monthly bar chart data
const MONTHLY = [
  { month: 'Jan', amt: 2800 }, { month: 'Feb', amt: 3200 }, { month: 'Mar', amt: 2600 },
  { month: 'Apr', amt: 3800 }, { month: 'May', amt: 3100 }, { month: 'Jun', amt: 3650 },
];
const MAX_AMT = Math.max(...MONTHLY.map(m => m.amt));
const BAR_H = 100;

const TOTAL = 3650;

// ── Donut chart ───────────────────────────────────────────────────────────────
function DonutChart() {
  let cumOffset = CIRC / 4;
  const segments = BREAKDOWN.map(seg => {
    const full = (seg.pct / 100) * CIRC;
    const vis  = full - SEG_GAP;
    const item = { ...seg, dashLen: vis, dashGap: CIRC - vis, offset: cumOffset };
    cumOffset -= full;
    return item;
  });

  return (
    <View style={styles.chartWrap}>
      <Svg width={CHART_SZ} height={CHART_SZ}>
        <Circle cx={CHART_CX} cy={CHART_CY} r={CHART_R} fill="none" stroke={colors.border} strokeWidth={CHART_SW} />
        {segments.map((s, i) => (
          <Circle
            key={i}
            cx={CHART_CX} cy={CHART_CY} r={CHART_R}
            fill="none"
            stroke={s.color}
            strokeWidth={CHART_SW}
            strokeDasharray={`${s.dashLen} ${s.dashGap}`}
            strokeDashoffset={s.offset}
            strokeLinecap="butt"
          />
        ))}
      </Svg>
      <View style={styles.chartCenter} pointerEvents="none">
        <Text style={styles.chartCenterAmt}>₹{(TOTAL / 1000).toFixed(1)}k</Text>
        <Text style={styles.chartCenterLbl}>Total</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ExpensesScreen({ navigation }: any) {
  const [tab, setTab] = useState<TabKey>('Overview');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Expenses</Text>
        <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
          <BarChart2 size={22} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabsRow}>
          {(['Overview', 'Categories', 'Analytics'] as TabKey[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Time filter ──────────────────────────────────────────────────── */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterPill} activeOpacity={0.7}>
          <Text style={styles.filterText}>This Month</Text>
          <ChevronDown size={14} color={colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {tab === 'Overview' && <OverviewTab navigation={navigation} />}
        {tab === 'Categories' && <CategoriesTab />}
        {tab === 'Analytics' && <AnalyticsTab />}
      </ScrollView>

      {/* ── FAB ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense')}
        activeOpacity={0.85}
      >
        <Plus size={26} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ navigation }: any) {
  return (
    <>
      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={styles.summaryAmount}>₹ {TOTAL.toLocaleString('en-IN')}</Text>
            <Text style={styles.summaryCompare}>vs Last Month</Text>
          </View>
          <View style={styles.trendBadge}>
            <TrendingUp size={12} color={colors.danger} strokeWidth={2.5} />
            <Text style={styles.trendText}>12%</Text>
          </View>
        </View>

        {/* Chart + legend row */}
        <View style={styles.chartRow}>
          <DonutChart />
          <View style={styles.legend}>
            {BREAKDOWN.map(seg => (
              <View key={seg.name} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                <Text style={styles.legendName}>{seg.name}</Text>
                <Text style={styles.legendPct}>{seg.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Recent Expenses */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Expenses</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listCard}>
        {RECENT.map((item, i) => {
          const Icon = item.Icon;
          return (
            <View
              key={item.id}
              style={[styles.listRow, i < RECENT.length - 1 && styles.listRowDivider]}
            >
              <View style={[styles.listIcon, { backgroundColor: item.bg }]}>
                <Icon size={18} color={item.color} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.listTime}>{item.time}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.listAmt}>₹ {item.amt}</Text>
                <Text style={[styles.listCat, { color: item.color }]}>{item.cat}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}

// ── Categories tab ────────────────────────────────────────────────────────────
function CategoriesTab() {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>By Category</Text>
      </View>
      <View style={styles.listCard}>
        {BREAKDOWN.map((seg, i) => {
          const Icon = seg.Icon;
          const barW = `${seg.pct}%`;
          return (
            <View
              key={seg.name}
              style={[styles.catRow, i < BREAKDOWN.length - 1 && styles.listRowDivider]}
            >
              <View style={[styles.listIcon, { backgroundColor: seg.bg }]}>
                <Icon size={18} color={seg.color} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.catRowTop}>
                  <Text style={styles.listTitle}>{seg.name}</Text>
                  <Text style={styles.listAmt}>₹ {seg.amount.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: barW as any, backgroundColor: seg.color }]} />
                </View>
                <Text style={styles.catPct}>{seg.pct}% of total</Text>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}

// ── Analytics tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Monthly Trend</Text>
      </View>
      <View style={styles.analyticsCard}>
        <View style={styles.barChart}>
          {MONTHLY.map(m => {
            const h = Math.round((m.amt / MAX_AMT) * BAR_H);
            const isLast = m.month === 'Jun';
            return (
              <View key={m.month} style={styles.barCol}>
                <Text style={styles.barAmt}>
                  {m.amt >= 1000 ? `₹${(m.amt / 1000).toFixed(1)}k` : `₹${m.amt}`}
                </Text>
                <View style={[styles.barFillV, { height: h, backgroundColor: isLast ? colors.primary : colors.primarySoft }]} />
                <Text style={[styles.barLabel, isLast && { color: colors.primary, fontWeight: '700' }]}>{m.month}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.analyticsStats}>
          <View style={styles.analyticsStat}>
            <Text style={styles.analyticsStatVal}>₹3,650</Text>
            <Text style={styles.analyticsStatLbl}>This Month</Text>
          </View>
          <View style={styles.analyticsDivider} />
          <View style={styles.analyticsStat}>
            <Text style={styles.analyticsStatVal}>₹3,217</Text>
            <Text style={styles.analyticsStatLbl}>Monthly Avg</Text>
          </View>
          <View style={styles.analyticsDivider} />
          <View style={styles.analyticsStat}>
            <Text style={styles.analyticsStatVal}>₹19,300</Text>
            <Text style={styles.analyticsStatLbl}>6M Total</Text>
          </View>
        </View>
      </View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 120 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },

  // Tabs
  tabsWrap: { paddingHorizontal: spacing.xl, marginBottom: 12 },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: 4,
  },
  tabBtn: {
    flex: 1, paddingVertical: 9,
    alignItems: 'center', borderRadius: radius.md,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    ...StyleSheet.flatten({ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }),
  },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  tabBtnTextActive: { color: colors.primary, fontWeight: '800' },

  // Filter
  filterRow: { paddingHorizontal: spacing.xl, marginBottom: 16 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    ...shadow.subtle,
  },
  filterText: { fontSize: 13, fontWeight: '700', color: colors.text },

  // Summary card
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 20,
    ...shadow.card,
  },
  summaryTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  summaryLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
  summaryAmount: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -1, marginBottom: 2 },
  summaryCompare: { fontSize: 11, color: colors.textSubtle },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.pill,
  },
  trendText: { fontSize: 12, fontWeight: '800', color: colors.danger },

  // Chart
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chartWrap: { position: 'relative', width: CHART_SZ, height: CHART_SZ },
  chartCenter: {
    position: 'absolute', top: 0, left: 0,
    width: CHART_SZ, height: CHART_SZ,
    alignItems: 'center', justifyContent: 'center',
  },
  chartCenterAmt: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  chartCenterLbl: { fontSize: 10, color: colors.textSubtle, fontWeight: '600', marginTop: 2 },

  // Legend
  legend: { flex: 1, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  legendPct: { fontSize: 13, fontWeight: '800', color: colors.textMuted },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  seeAll: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // List card
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 20,
    ...shadow.card,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  listRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  listIcon: {
    width: 42, height: 42, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  listTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  listTime: { fontSize: 11, color: colors.textMuted },
  listAmt: { fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  listCat: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  // Categories tab
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  catRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  barTrack: {
    height: 6, backgroundColor: colors.surfaceAlt, borderRadius: 3, overflow: 'hidden', marginBottom: 4,
  },
  barFill: { height: 6, borderRadius: 3 },
  catPct: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  // Analytics tab
  analyticsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 20,
    ...shadow.card,
  },
  barChart: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', height: BAR_H + 48, marginBottom: 20,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barAmt: { fontSize: 9, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
  barFillV: { width: 28, borderRadius: 6 },
  barLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  analyticsStats: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg, padding: 16,
  },
  analyticsStat: { flex: 1, alignItems: 'center' },
  analyticsStatVal: { fontSize: 14, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  analyticsStatLbl: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 3 },
  analyticsDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 86,
    right: spacing.xl,
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.raised,
  },
});
