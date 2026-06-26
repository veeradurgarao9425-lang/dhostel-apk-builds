import React, { useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert, Dimensions,
  Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar, Bell, TrendingDown, Utensils, Car, ShoppingBag,
  Film, MoreHorizontal, Plus, ChevronDown, FileText, ArrowLeft,
  Clock, Wallet, Smartphone, CreditCard, Landmark, CheckCircle,
  PieChart, BarChart2, Coffee, Search, Filter,
  X, Receipt, Home, User, Pill, AlertCircle,
} from 'lucide-react-native';
import { colors, spacing, radius, font, shadow } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Category config ───────────────────────────────────────────────────────────
const CAT = {
  Food: { icon: Utensils, color: '#EF4444', bg: '#FEE2E2', label: 'Food' },
  Transport: { icon: Car, color: '#3B82F6', bg: '#EFF6FF', label: 'Transport' },
  Shopping: { icon: ShoppingBag, color: '#10B981', bg: '#D1FAE5', label: 'Shopping' },
  Bills: { icon: Receipt, color: '#F59E0B', bg: '#FEF3C7', label: 'Bills' },
  Entertainment: { icon: Film, color: '#8B5CF6', bg: '#EDE9FE', label: 'Entertainment' },
  Medical: { icon: AlertCircle, color: '#E11D48', bg: '#FFE4E6', label: 'Medical' },
  Others: { icon: MoreHorizontal, color: '#64748B', bg: '#F8FAFC', label: 'Others' },
};

const SAMPLE_EXPENSES = [
  { id: '1', title: 'Breakfast', amount: 120, category: 'Food', time: '08:30 AM', date: '2025-06-09' },
  { id: '2', title: 'Auto Ride', amount: 80, category: 'Transport', time: '09:15 AM', date: '2025-06-09' },
  { id: '3', title: 'Groceries', amount: 150, category: 'Shopping', time: '11:45 AM', date: '2025-06-09' },
  { id: '4', title: 'Evening Tea', amount: 50, category: 'Food', time: '04:20 PM', date: '2025-06-09' },
];

const HEADER_COLOR = '#A85A42';
const TREND_COLOR = '#22C55E';

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ExpensesScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity>
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Expenses</Text>
          <TouchableOpacity>
            <BarChart2 size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Tabs ───────────────────────────────────── */}
        <View style={s.tabsContainer}>
          {['Overview', 'Categories', 'Analytics'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Month Filter ───────────────────────────────────── */}
        <View style={s.monthFilterContainer}>
          <TouchableOpacity style={s.monthFilterBtn}>
            <Text style={s.monthFilterText}>This Month</Text>
            <ChevronDown size={14} color={HEADER_COLOR} />
          </TouchableOpacity>
        </View>

        {/* ── Total Spent Card ──────────────────────────────────── */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>Total Spent</Text>
          <View style={s.totalAmountRow}>
            <Text style={s.totalAmount}>₹ 3,650</Text>
            <View style={s.trendBadge}>
              <Text style={s.trendText}>↑ 12%</Text>
              <Text style={s.trendSubText}>vs Last Month</Text>
            </View>
          </View>
        </View>

        {/* ── Donut Chart Section ─────────────────────────────── */}
        <View style={s.chartCard}>
          <View style={s.chartContent}>
            {/* Donut Chart */}
            <View style={s.donutContainer}>
              <View style={s.donutOuter}>
                <View style={s.donutRing}>
                  <View style={s.donutInner}>
                    <Text style={s.donutAmount}>₹ 3,650</Text>
                    <Text style={s.donutLabel}>Total</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Legend */}
            <View style={s.legend}>
              <View style={s.legendItem}>
                <View style={[s.dot, { backgroundColor: '#EF4444' }]} />
                <Text style={s.legendLabel}>Food</Text>
                <Text style={s.legendPercent}>57%</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.dot, { backgroundColor: '#F59E0B' }]} />
                <Text style={s.legendLabel}>Transport</Text>
                <Text style={s.legendPercent}>23%</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.dot, { backgroundColor: '#10B981' }]} />
                <Text style={s.legendLabel}>Shopping</Text>
                <Text style={s.legendPercent}>12%</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.dot, { backgroundColor: '#94A3B8' }]} />
                <Text style={s.legendLabel}>Others</Text>
                <Text style={s.legendPercent}>8%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Recent Expenses ───────────────────────────────────── */}
        <Text style={s.sectionTitle}>Recent Expenses</Text>

        <View style={s.expensesList}>
          {SAMPLE_EXPENSES.map((exp) => {
            const cat = CAT[exp.category as keyof typeof CAT] || CAT.Others;
            return (
              <View key={exp.id} style={s.expenseCard}>
                <View style={[s.expenseIconBg, { backgroundColor: cat.bg }]}>
                  <cat.icon size={20} color={cat.color} strokeWidth={2} />
                </View>
                <View style={s.expenseBody}>
                  <Text style={s.expenseTitle}>{exp.title}</Text>
                  <Text style={s.expenseTime}>Today, {exp.time}</Text>
                </View>
                <View style={s.expenseRight}>
                  <Text style={s.expenseAmount}>₹ {exp.amount}</Text>
                  <Text style={[s.expenseCategory, { color: cat.color }]}>{cat.label}</Text>
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>

      {/* ── FAB ─────────────────────────────────────────────────── */}
      <View style={s.fabContainer}>
        <TouchableOpacity
          style={s.fabBtn}
          onPress={() => navigation.navigate('AddExpense')}
          activeOpacity={0.85}
        >
          <Plus size={28} color="#fff" strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* ── Bottom Navigation ───────────────────────────────────── */}
      <View style={s.bottomNav}>
        {[
          { id: 'Home', icon: Home, label: 'Home' },
          { id: 'Due', icon: FileText, label: 'Due' },
          { id: 'Expenses', icon: Wallet, label: 'Expenses' },
          { id: 'Notices', icon: Bell, label: 'Notices' },
          { id: 'Profile', icon: User, label: 'Profile' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'Expenses';
          return (
            <TouchableOpacity
              key={item.id}
              style={s.navItem}
              activeOpacity={0.7}
            >
              <Icon
                size={20}
                color={isActive ? HEADER_COLOR : '#94A3B8'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text style={[s.navLabel, isActive && s.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { paddingBottom: 120 },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: HEADER_COLOR,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },

  // ── Tabs ──────────────────────────────────────────────────────
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  tabActive: {
    backgroundColor: HEADER_COLOR,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // ── Month Filter ──────────────────────────────────────────────
  monthFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  monthFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthFilterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },

  // ── Total card ──────────────────────────────────────────────────────────
  totalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  totalAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  trendBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  trendText: {
    fontSize: 13,
    fontWeight: '700',
    color: TREND_COLOR,
  },
  trendSubText: {
    fontSize: 10,
    fontWeight: '600',
    color: TREND_COLOR,
    marginTop: 2,
  },

  // ── Chart card ────────────────────────────────────────────────────────
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  chartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },

  // Donut chart
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutOuter: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 18,
    borderColor: '#E5E7EB',
    borderTopColor: '#EF4444',
    borderRightColor: '#F59E0B',
    borderBottomColor: '#10B981',
    borderLeftColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  donutInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  donutAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: HEADER_COLOR,
  },
  donutLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Legend
  legend: {
    flex: 1,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  legendPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },

  // ── Section header ───────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  // ── Expense list ─────────────────────────────────────────────────────────
  expensesList: {
    marginHorizontal: 16,
    gap: 8,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  expenseIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseBody: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  expenseTime: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── FAB ──────────────────────────────────────────────────────────────────
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
  },
  fabBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: HEADER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: HEADER_COLOR,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },

  // ── Bottom Navigation ───────────────────────────────────────────────────────
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  navLabelActive: {
    color: HEADER_COLOR,
    fontWeight: '700',
  },
});