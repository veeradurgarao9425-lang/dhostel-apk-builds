import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar, Bell, TrendingDown, Utensils, Car, ShoppingBag,
  Film, MoreHorizontal, Plus, ChevronDown, FileText, ArrowLeft,
  Clock, Wallet, Smartphone, CreditCard, Landmark, CheckCircle, SlidersHorizontal,
  PieChart, BarChart2, Coffee
} from 'lucide-react-native';
import { colors, spacing, radius, font, shadow } from '../theme';
import { sampleExpenses, ExpenseRecord, ExpenseCategory } from '../data/tenantContent';

// ── Category config ───────────────────────────────────────────────────────────
const CAT: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  Food: { icon: Utensils, color: '#6366F1', bg: '#EEF2FF', label: 'Food' },
  Travel: { icon: Car, color: '#F59E0B', bg: '#FEF3C7', label: 'Travel' },
  Shopping: { icon: ShoppingBag, color: '#EC4899', bg: '#FCE7F3', label: 'Shopping' },
  'Tea/Coffee': { icon: Coffee, color: '#10B981', bg: '#D1FAE5', label: 'Tea / Coffee' },
  Entertainment: { icon: Film, color: '#8B5CF6', bg: '#EDE9FE', label: 'Entertainment' },
  Other: { icon: MoreHorizontal, color: '#64748B', bg: '#F1F5F9', label: 'More' },
};

const QUICK_ADD_CATEGORIES = ['Food', 'Travel', 'Shopping', 'Tea/Coffee', 'Entertainment', 'Other'];

const PAYMENT_METHODS = [
  { id: 'Cash', icon: Wallet, color: '#6366F1', bg: '#EEF2FF' },
  { id: 'UPI', icon: Smartphone, color: '#8B5CF6', bg: '#EDE9FE' },
  { id: 'Card', icon: CreditCard, color: '#0EA5E9', bg: '#E0F2FE' },
  { id: 'Bank', icon: Landmark, color: '#10B981', bg: '#D1FAE5' },
];

const TODAY = '2025-06-09';
const TODAY_LABEL = '09 Jun 2025';
const DAILY_AVG = 1000;

// ── Donut ring ─────────────────────────────────────────────
function DonutRing({ pct }: { pct: number }) {
  return (
    <View style={donut.outer}>
      <View style={donut.ring}>
        <View style={donut.inner}>
          <Text style={donut.pctText}>{pct}%</Text>
        </View>
      </View>
    </View>
  );
}
const donut = StyleSheet.create({
  outer: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#F59E0B', borderRightColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-45deg' }],
  },
  inner: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }],
  },
  pctText: { color: '#F59E0B', fontWeight: '800', fontSize: 12 },
});

// ── Add Expense Modal ─────────────────────────────────────────────────────────
function AddModal({ visible, defaultCat, onClose, onSave }: any) {
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState(defaultCat);
  const [payment, setPayment] = useState('Cash');
  const [note, setNote] = useState('');

  const handleSave = () => {
    if (!amount || Number(amount) <= 0) return Alert.alert('Enter amount', 'Valid amount needed.');
    onSave({
      id: `e${Date.now()}`, title: cat, category: cat as ExpenseCategory,
      amount: Number(amount), date: TODAY, time: 'Now', note
    });
    setAmount(''); setNote(''); onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
        {/* Modal Header */}
        <View style={modal.header}>
          <TouchableOpacity style={modal.iconBtnHeader} onPress={onClose}>
            <ArrowLeft color={colors.text} size={20} />
          </TouchableOpacity>
          <Text style={modal.headerTitle}>Add Expense</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modal.scrollContent}>

            <Text style={modal.label}>Amount</Text>
            <View style={modal.amountContainer}>
              <Text style={modal.rupeeSymbol}>₹</Text>
              <TextInput
                style={modal.amountInput} value={amount} onChangeText={setAmount}
                keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.textSubtle}
              />
            </View>

            <Text style={modal.label}>Category</Text>
            <View style={modal.gridRow}>
              {QUICK_ADD_CATEGORIES.map(c => {
                const m = CAT[c] || CAT['Other'];
                const active = cat === c;
                return (
                  <TouchableOpacity key={c} style={[modal.catChip, active && modal.catChipActive]} onPress={() => setCat(c)} activeOpacity={0.7}>
                    <View style={[modal.catIconCircle, { backgroundColor: active ? m.bg : colors.surfaceAlt }]}>
                      <m.icon size={18} color={active ? m.color : colors.textMuted} />
                    </View>
                    <Text style={[modal.catLabel, active && { color: m.color }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={modal.label}>Payment Method</Text>
            <View style={modal.gridRow}>
              {PAYMENT_METHODS.map(p => {
                const active = payment === p.id;
                return (
                  <TouchableOpacity key={p.id} style={[modal.methodChip, active && modal.methodChipActive]} onPress={() => setPayment(p.id)} activeOpacity={0.7}>
                    <p.icon size={16} color={active ? p.color : colors.textMuted} />
                    <Text style={[modal.methodLabel, active && { color: p.color }]}>{p.id}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={modal.label}>Note (Optional)</Text>
            <TextInput
              style={modal.descInput} value={note} onChangeText={setNote}
              placeholder="What was this for?" placeholderTextColor={colors.textSubtle}
            />

            <TouchableOpacity style={modal.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={modal.saveBtnText}>Save Expense</Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const modal = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtnHeader: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  scrollContent: { padding: spacing['2xl'], paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, marginTop: 16 },
  amountContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 16, height: 64, backgroundColor: colors.surfaceAlt },
  rupeeSymbol: { fontSize: 24, color: colors.textMuted, marginRight: 8, fontWeight: '500' },
  amountInput: { flex: 1, fontSize: 24, color: colors.text, fontWeight: '700' },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catChip: { width: '31%', height: 90, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  catChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft, borderWidth: 1.5 },
  catIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  catLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  methodChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  methodChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  methodLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  descInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, fontSize: 14, color: colors.text, backgroundColor: colors.surface, height: 56 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 32, ...shadow.raised },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ExpensesScreen({ navigation }: any) {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(sampleExpenses);
  const [showAdd, setShowAdd] = useState(false);
  const [addDefaultCat, setAddDefaultCat] = useState('Food');

  const todayExpenses = expenses.filter((e) => e.date === TODAY);
  const total = todayExpenses.reduce((s, e) => s + e.amount, 0);
  const pct = Math.min(Math.round((total / DAILY_AVG) * 100), 100);

  const foodTotal = todayExpenses.filter(e => e.category === 'Food').reduce((s, e) => s + e.amount, 0);
  const travelTotal = todayExpenses.filter(e => e.category === 'Travel').reduce((s, e) => s + e.amount, 0);
  const otherTotal = todayExpenses.filter(e => !['Food', 'Travel'].includes(e.category)).reduce((s, e) => s + e.amount, 0);

  const openAdd = (cat = 'Food') => { setAddDefaultCat(cat); setShowAdd(true); };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── White Sticky Header ───────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>My Expenses</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtnHeader} activeOpacity={0.7}>
            <Calendar size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtnHeader} activeOpacity={0.7}>
            <SlidersHorizontal size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── ONE Hero Gradient Card ─────────────────────────────────────── */}
        <LinearGradient
          colors={['#5B4CF0', '#4A3DD6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.heroMidRow}>
            <View>
              <Text style={s.heroLabel}>Today's Spending · {TODAY_LABEL}</Text>
              <Text style={s.heroAmount}>₹{total.toLocaleString('en-IN')}</Text>
              <View style={s.trendRow}>
                <TrendingDown size={12} color="#86EFAC" />
                <Text style={s.trendText}>₹40 less than yesterday</Text>
              </View>
            </View>
            <View style={s.donutSide}>
              <DonutRing pct={pct} />
              <Text style={s.donutSub}>avg ₹{DAILY_AVG}</Text>
            </View>
          </View>

          <View style={s.heroChipsRow}>
            <View style={s.heroChip}>
              <View style={[s.chipIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Utensils size={10} color="#fff" /></View>
              <View><Text style={s.chipCat}>Food</Text><Text style={s.chipAmt}>₹{foodTotal}</Text></View>
            </View>
            <View style={s.heroChipDivider} />
            <View style={s.heroChip}>
              <View style={[s.chipIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Car size={10} color="#fff" /></View>
              <View><Text style={s.chipCat}>Travel</Text><Text style={s.chipAmt}>₹{travelTotal}</Text></View>
            </View>
            <View style={s.heroChipDivider} />
            <View style={s.heroChip}>
              <View style={[s.chipIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><MoreHorizontal size={10} color="#fff" /></View>
              <View><Text style={s.chipCat}>Other</Text><Text style={s.chipAmt}>₹{otherTotal}</Text></View>
            </View>
          </View>
        </LinearGradient>

        {/* ── Quick Overview ──────────────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Quick Overview</Text>
          <TouchableOpacity style={s.headerDropdown}>
            <Text style={s.headerDropdownText}>June 2025</Text>
            <ChevronDown size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={s.overviewGrid}>
          <View style={s.overviewCard}>
            <View style={s.overviewCardTop}>
              <View style={[s.overviewIconBg, { backgroundColor: '#DCFCE7' }]}>
                <Calendar size={14} color="#22C55E" />
              </View>
              <Text style={s.overviewLabel}>Today</Text>
            </View>
            <Text style={s.overviewAmount}>₹320</Text>
            <View style={s.trendRowCard}>
              <TrendingDown size={10} color="#22C55E" />
              <Text style={[s.trendTextCard, { color: '#22C55E' }]}>12% vs yesterday</Text>
            </View>
          </View>

          <View style={s.overviewCard}>
            <View style={s.overviewCardTop}>
              <View style={[s.overviewIconBg, { backgroundColor: '#E0F2FE' }]}>
                <BarChart2 size={14} color="#0EA5E9" />
              </View>
              <Text style={s.overviewLabel}>This Week</Text>
            </View>
            <Text style={s.overviewAmount}>₹1,240</Text>
            <View style={s.trendRowCard}>
              <TrendingDown style={{ transform: [{ rotate: '180deg' }] }} size={10} color="#22C55E" />
              <Text style={[s.trendTextCard, { color: '#22C55E' }]}>8% vs last week</Text>
            </View>
          </View>

          <View style={s.overviewCard}>
            <View style={s.overviewCardTop}>
              <View style={[s.overviewIconBg, { backgroundColor: '#FEF3C7' }]}>
                <PieChart size={14} color="#F59E0B" />
              </View>
              <Text style={s.overviewLabel}>Daily Avg</Text>
            </View>
            <Text style={s.overviewAmount}>₹144</Text>
            <View style={s.trendRowCard}>
              <TrendingDown size={10} color="#22C55E" />
              <Text style={[s.trendTextCard, { color: '#22C55E' }]}>5% vs last month</Text>
            </View>
          </View>
        </View>

        {/* ── Quick Add Scroll ──────────────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Quick Add</Text>
          <TouchableOpacity><Text style={s.seeAllText}>Edit</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickAddScroll}>
          {QUICK_ADD_CATEGORIES.map((cat) => {
            const m = CAT[cat] || CAT['Other'];
            return (
              <TouchableOpacity key={cat} style={s.quickAddItemCard} activeOpacity={0.7} onPress={() => openAdd(cat)}>
                <View style={s.quickAddIconWrapCard}>
                  <m.icon size={22} color={m.color} />
                </View>
                <Text style={s.quickAddLabel}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Today's Transactions ──────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Today's Transactions</Text>
          <TouchableOpacity><Text style={s.seeAllText}>View All</Text></TouchableOpacity>
        </View>

        <View style={s.txnListContainer}>
          {todayExpenses.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>No transactions today.</Text></View>
          ) : (
            todayExpenses.map((exp, i) => {
              const m = CAT[exp.category] || CAT['Other'];
              return (
                <View key={exp.id} style={s.txnCard}>
                  <View style={[s.txnIconSquare, { backgroundColor: m.bg }]}><m.icon size={18} color={m.color} /></View>
                  <View style={s.txnMid}>
                    <Text style={s.txnTitle}>{exp.title}</Text>
                    <Text style={s.txnTime}>{exp.time}</Text>
                  </View>
                  <Text style={s.txnAmt}>₹{exp.amount}</Text>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <View style={s.fabContainer}>
        <TouchableOpacity style={s.fabBtn} onPress={() => openAdd('Food')} activeOpacity={0.9}>
          <Plus size={24} color="#fff" strokeWidth={3} />
        </TouchableOpacity>
      </View>

      <AddModal visible={showAdd} defaultCat={addDefaultCat} onClose={() => setShowAdd(false)} onSave={(e: ExpenseRecord) => setExpenses(prev => [e, ...prev])} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 120 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, paddingHorizontal: spacing['2xl'], paddingTop: 4, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, minHeight: 64 },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: font.h2, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtnHeader: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  // ── Hero Gradient ───────────────────────────────────────────────────────────
  heroCard: { borderRadius: radius.xl, padding: spacing.xl, marginHorizontal: spacing['2xl'], marginTop: spacing.xl, marginBottom: spacing['2xl'], ...shadow.raised },
  heroMidRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  heroAmount: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 4 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText: { color: '#86EFAC', fontSize: 11, fontWeight: '600' },
  donutSide: { alignItems: 'center', gap: 4 },
  donutSub: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '500' },

  heroChipsRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  heroChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  heroChipDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },
  chipIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipCat: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  chipAmt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Sections ────────────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['2xl'], marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  seeAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  headerDropdown: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerDropdownText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },

  // ── Quick Overview ──────────────────────────────────────────────────────────
  overviewGrid: { flexDirection: 'row', paddingHorizontal: spacing['2xl'], gap: spacing.sm, marginBottom: spacing['2xl'] },
  overviewCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.borderSoft, ...shadow.card },
  overviewCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  overviewIconBg: { width: 20, height: 20, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  overviewLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  overviewAmount: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  trendRowCard: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trendTextCard: { fontSize: 9, fontWeight: '600' },

  // ── Quick Add ───────────────────────────────────────────────────────────────
  quickAddScroll: { paddingHorizontal: spacing['2xl'], gap: 16, marginBottom: spacing['3xl'] },
  quickAddItemCard: { alignItems: 'center', gap: 6, width: 60 },
  quickAddIconWrapCard: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, ...shadow.header },
  quickAddLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },

  // ── Transactions ────────────────────────────────────────────────────────────
  txnListContainer: { paddingBottom: spacing.xl },
  txnCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: spacing['2xl'],
    marginBottom: spacing.md,
    ...shadow.card,
  },
  txnIconSquare: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txnMid: { flex: 1 },
  txnTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  txnTime: { fontSize: 11, color: colors.textMuted },
  txnAmt: { fontSize: 15, fontWeight: '800', color: colors.text },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13 },

  // ── FAB ─────────────────────────────────────────────────────────────────────
  fabContainer: { position: 'absolute', bottom: 100, right: 24, alignItems: 'center' },
  fabBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
});
