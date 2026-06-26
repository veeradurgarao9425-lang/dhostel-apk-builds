import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert, Dimensions,
  Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar, Bell, TrendingDown, Utensils, Car, ShoppingBag,
  Film, MoreHorizontal, Plus, ChevronDown, FileText, ArrowLeft,
  Clock, Wallet, Smartphone, CreditCard, Landmark, CheckCircle,
  PieChart, BarChart2, Coffee, Search, Filter,
  X, Receipt
} from 'lucide-react-native';
import { colors, spacing, radius, font, shadow } from '../theme';
import { sampleExpenses, ExpenseRecord, ExpenseCategory } from '../data/tenantContent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Category config ───────────────────────────────────────────────────────────
const CAT: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  Food: { icon: Utensils, color: '#FF2D8F', bg: '#FFEAF4', label: 'Food' },
  Travel: { icon: Car, color: '#2563EB', bg: '#EAF1FF', label: 'Transport' },
  Shopping: { icon: ShoppingBag, color: '#10B981', bg: '#E9FBF3', label: 'Shopping' },
  'Tea/Coffee': { icon: Coffee, color: '#F59E0B', bg: '#FFF4DB', label: 'Tea / Coffee' },
  Entertainment: { icon: Film, color: '#7C3AED', bg: '#F1EAFF', label: 'Entertainment' },
  Other: { icon: MoreHorizontal, color: '#64748B', bg: '#F3F4F6', label: 'Others' },
};

const QUICK_ADD_CATEGORIES = ['Food', 'Travel', 'Shopping', 'Tea/Coffee', 'Entertainment', 'Other'];

const PAYMENT_METHODS = [
  { id: 'Cash', icon: Wallet, color: '#6366F1', bg: '#EEF2FF' },
  { id: 'UPI', icon: Smartphone, color: '#8B5CF6', bg: '#EDE9FE' },
  { id: 'Card', icon: CreditCard, color: '#0EA5E9', bg: '#E0F2FE' },
  { id: 'Bank', icon: Landmark, color: '#10B981', bg: '#D1FAE5' },
];

const FILTER_CHIPS = ['All', 'Food', 'Transport', 'Shopping', 'Bills'];

const TODAY = '2025-06-09';
const TODAY_LABEL = '09 Jun 2025';
const DAILY_AVG = 1000;

// ── Donut ring ─────────────────────────────────────────────
function DonutRing({ pct }: { pct: number }) {
  return (
    <View style={donut.outer}>
      <View style={donut.ring}>
        <View style={donut.inner} />
      </View>
    </View>
  );
}
const donut = StyleSheet.create({
  outer: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 14,
    borderColor: '#E5E7EB',
    borderTopColor: '#FF2D8F',
    borderRightColor: '#7C3AED',
    borderBottomColor: '#10B981',
    borderLeftColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '28deg' }],
  },
  inner: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: '#FFFFFF',
  },
});

// ── Success Modal with Animation ─────────────────────────────────────────────
function SuccessModal({ visible, amount, category, onClose }: any) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          speed: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={successModal.overlay}>
        <Animated.View
          style={[
            successModal.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={successModal.checkCircle}>
            <CheckCircle size={64} color="#22C55E" strokeWidth={2.5} />
          </View>
          <Text style={successModal.title}>Expense Added!</Text>
          <Text style={successModal.message}>₹{amount} added to {category}</Text>
          <Text style={successModal.feedback}>Great!</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const successModal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  container: {
    backgroundColor: colors.surface, borderRadius: radius['2xl'], padding: spacing['3xl'],
    alignItems: 'center', width: SCREEN_WIDTH * 0.8, ...shadow.raised,
  },
  checkCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#D1FAE5',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl,
  },
  title: {
    fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm,
  },
  message: {
    fontSize: 14, color: colors.textMuted, marginBottom: spacing.md, textAlign: 'center',
  },
  feedback: {
    fontSize: 14, color: '#22C55E', fontWeight: '700',
  },
});

// ── Add Category Screen ────────────────────────────────────────────────────────
function AddCategoryScreen({ visible, onClose, onSave }: any) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366F1');
  const [selectedIcon, setSelectedIcon] = useState('Utensils');
  const [type, setType] = useState('Expense');
  const [isSubCategory, setIsSubCategory] = useState(false);
  const [parentCategory, setParentCategory] = useState('');

  const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EC4899', '#64748B', '#94A3B8'];
  const ICONS = [
    { name: 'Utensils', icon: Utensils },
    { name: 'Car', icon: Car },
    { name: 'ShoppingBag', icon: ShoppingBag },
    { name: 'Film', icon: Film },
    { name: 'Coffee', icon: Coffee },
    { name: 'MoreHorizontal', icon: MoreHorizontal },
  ];

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter category name');
      return;
    }
    onSave({ name, color: selectedColor, icon: selectedIcon });
    setName('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
        {/* Header */}
        <View style={addCat.header}>
          <TouchableOpacity style={addCat.iconBtn} onPress={onClose}>
            <ArrowLeft color={colors.text} size={20} />
          </TouchableOpacity>
          <Text style={addCat.headerTitle}>Add Category</Text>
          <TouchableOpacity style={addCat.saveBtn} onPress={handleSave}>
            <Text style={addCat.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={addCat.scrollContent}>
          {/* Icon Selection */}
          <Text style={addCat.label}>Icon</Text>
          <View style={addCat.iconGrid}>
            {ICONS.map(({ name, icon: Icon }) => (
              <TouchableOpacity
                key={name}
                style={[addCat.iconItem, selectedIcon === name && addCat.iconItemActive]}
                onPress={() => setSelectedIcon(name)}
              >
                <Icon size={20} color={selectedIcon === name ? colors.primary : colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Name */}
          <Text style={addCat.label}>Category Name</Text>
          <TextInput
            style={addCat.input}
            placeholder="Enter category name"
            placeholderTextColor={colors.textSubtle}
            value={name}
            onChangeText={setName}
          />
          <Text style={addCat.charCount}>{name.length}/25</Text>

          {/* Color Selection */}
          <Text style={addCat.label}>Color</Text>
          <View style={addCat.colorRow}>
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[addCat.colorCircle, { backgroundColor: color }, selectedColor === color && addCat.colorCircleActive]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && <CheckCircle size={20} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Type */}
          <Text style={addCat.label}>Type (Optional)</Text>
          <TouchableOpacity style={addCat.selectBox}>
            <Text style={addCat.selectText}>Select type</Text>
            <ChevronDown size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Set as Sub-Category */}
          <View style={addCat.toggleRow}>
            <Text style={addCat.label}>Set as Sub-Category</Text>
            <TouchableOpacity
              style={[addCat.toggle, isSubCategory && addCat.toggleActive]}
              onPress={() => setIsSubCategory(!isSubCategory)}
            >
              <View style={[addCat.toggleKnob, isSubCategory && addCat.toggleKnobActive]} />
            </TouchableOpacity>
          </View>

          {/* Parent Category */}
          {isSubCategory && (
            <>
              <Text style={addCat.label}>Parent Category (Optional)</Text>
              <TouchableOpacity style={addCat.selectBox}>
                <Text style={addCat.selectText}>Select parent category</Text>
                <ChevronDown size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}

          {/* Save Button */}
          <TouchableOpacity style={addCat.saveButton} onPress={handleSave}>
            <Text style={addCat.saveButtonText}>Save Category</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const addCat = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  saveBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md },
  saveBtnText: { color: '#fff', fontSize: font.caption, fontWeight: '700' },
  scrollContent: { padding: spacing['2xl'], paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, marginTop: 16 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  iconItem: {
    width: 56, height: 56, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  iconItemActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft, borderWidth: 1.5 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 16,
    paddingVertical: 12, fontSize: font.body, color: colors.text, backgroundColor: colors.surface,
  },
  charCount: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 4 },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  colorCircle: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorCircleActive: { borderColor: colors.text, borderWidth: 3 },
  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: colors.surface,
  },
  selectText: { fontSize: font.body, color: colors.textMuted },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  toggle: {
    width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 2,
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleKnob: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', shadowColor: '#000',
    shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  toggleKnobActive: { transform: [{ translateX: 20 }] },
  saveButton: {
    backgroundColor: colors.primary, borderRadius: radius.lg, height: 56, alignItems: 'center',
    justifyContent: 'center', marginTop: 32, ...shadow.raised,
  },
  saveButtonText: { color: '#fff', fontSize: font.cardTitle, fontWeight: '700' },
});

// ── Add Expense Modal ─────────────────────────────────────────────────────────
function AddModal({ visible, defaultCat, onClose, onSave }: any) {
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState(defaultCat);
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSaved, setLastSaved] = useState<any>(null);

  const handleSave = () => {
    if (!amount || Number(amount) <= 0) return Alert.alert('Enter amount', 'Valid amount needed.');
    const expenseData = {
      id: `e${Date.now()}`, title: cat, category: cat as ExpenseCategory,
      amount: Number(amount), date: TODAY, time: 'Now', note
    };
    setLastSaved(expenseData);
    onSave(expenseData);
    setAmount(''); setNote(''); setCat(defaultCat);
    setShowSuccess(true);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={modal.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={modal.backdrop} activeOpacity={1} onPress={onClose} />
        <SafeAreaView style={modal.sheet} edges={['bottom']}>
          <View style={modal.handle} />
          <View style={modal.header}>
            <TouchableOpacity style={modal.iconBtnHeader} onPress={onClose}>
              <X color="#111827" size={18} />
            </TouchableOpacity>
            <Text style={modal.headerTitle}>Add Expense</Text>
            <TouchableOpacity style={modal.checkBtn} onPress={handleSave}>
              <CheckCircle size={20} color="#5B2DFF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modal.scrollContent}>
            <Text style={modal.sectionLabel}>Amount</Text>
            <View style={modal.amountSection}>
              <Text style={modal.rupeeSymbol}>{'\u20B9'}</Text>
              <TextInput
                style={modal.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="250"
                placeholderTextColor="#CBD5E1"
              />
            </View>

            <View style={modal.chipsRow}>
              {[50, 100, 200, 500].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[modal.amountChip, amount === val.toString() && modal.amountChipActive]}
                  onPress={() => setAmount(val.toString())}
                >
                  <Text style={[modal.amountChipText, amount === val.toString() && modal.amountChipTextActive]}>{'\u20B9'}{val}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={modal.sectionLabel}>Category</Text>
            <View style={modal.categoryGrid}>
              {QUICK_ADD_CATEGORIES.slice(0, 4).map((c) => {
                const m = CAT[c] || CAT['Other'];
                const active = cat === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[modal.catPill, active && { backgroundColor: m.bg, borderColor: m.color }]}
                    onPress={() => setCat(c)}
                  >
                    <View style={[modal.catIconBg, { backgroundColor: active ? '#FFFFFF' : m.bg }]}> 
                      <m.icon size={16} color={m.color} />
                    </View>
                    <Text style={[modal.catLabel, active && { color: m.color }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={modal.sectionLabel}>Date & Time</Text>
            <TouchableOpacity style={modal.selectRow}>
              <Calendar size={17} color="#6B7280" />
              <Text style={modal.selectRowText}>Today, 09:30 AM</Text>
              <ChevronDown size={17} color="#6B7280" />
            </TouchableOpacity>

            <Text style={modal.sectionLabel}>Note</Text>
            <TextInput
              style={modal.noteInput}
              placeholder="Add a note..."
              placeholderTextColor="#9CA3AF"
              value={note}
              onChangeText={setNote}
              multiline
            />

            <TouchableOpacity style={modal.saveBtn} onPress={handleSave} activeOpacity={0.9}>
              <Plus size={18} color="#FFFFFF" strokeWidth={3} />
              <Text style={modal.saveText}>Add Expense</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>

        <SuccessModal
          visible={showSuccess}
          amount={lastSaved?.amount}
          category={lastSaved?.category}
          onClose={handleSuccessClose}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.34)' },
  sheet: {
    maxHeight: '88%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 10, shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 }, elevation: 18,
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#D8DCE8', marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 14 },
  iconBtnHeader: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EEF2F7' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  checkBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1ECFF', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 26 },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#111827', marginBottom: 8, marginTop: 12 },
  amountSection: {
    flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 14,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EEF2F7', paddingHorizontal: 16, marginBottom: 10,
  },
  rupeeSymbol: { fontSize: 24, color: '#4F46E5', marginRight: 8, fontWeight: '900' },
  amountInput: { flex: 1, fontSize: 24, color: '#111827', fontWeight: '900', paddingVertical: 0 },
  chipsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  amountChip: { flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E5F6' },
  amountChipActive: { backgroundColor: '#F1ECFF', borderColor: '#5B2DFF' },
  amountChipText: { fontSize: 11, fontWeight: '900', color: '#111827' },
  amountChipTextActive: { color: '#5B2DFF' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 2 },
  catPill: {
    width: '48%', flexDirection: 'row', alignItems: 'center', gap: 9, height: 44,
    borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F7', paddingHorizontal: 10,
  },
  catIconBg: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catLabel: { flex: 1, fontSize: 12, fontWeight: '900', color: '#111827' },
  selectRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 46,
    borderWidth: 1, borderColor: '#EEF2F7', borderRadius: 12, paddingHorizontal: 13, backgroundColor: '#FFFFFF',
  },
  selectRowText: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '800' },
  noteInput: {
    minHeight: 72, borderWidth: 1, borderColor: '#EEF2F7', borderRadius: 12,
    paddingHorizontal: 13, paddingVertical: 11, fontSize: 13, color: '#111827', backgroundColor: '#FFFFFF', textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: 18, height: 52, borderRadius: 16, backgroundColor: '#5B2DFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#5B2DFF', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 7,
  },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
// -- All Expenses Screen ───────────────────────────────────────────────────────
function AllExpensesScreen({ expenses, onBack }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e: ExpenseRecord) => {
      const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === 'All' || e.category === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [expenses, searchQuery, selectedFilter]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, ExpenseRecord[]> = {};
    filteredExpenses.forEach((exp: ExpenseRecord) => {
      if (!groups[exp.date]) groups[exp.date] = [];
      groups[exp.date].push(exp);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredExpenses]);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date(TODAY);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === TODAY) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={allExp.safe} edges={['top']}>
      {/* Header */}
      <View style={allExp.header}>
        <TouchableOpacity onPress={onBack} style={allExp.backBtn}>
          <ArrowLeft color={colors.text} size={20} />
        </TouchableOpacity>
        <Text style={allExp.headerTitle}>All Expenses</Text>
        <View style={allExp.spacer} />
      </View>

      {/* Search Bar */}
      <View style={allExp.searchContainer}>
        <Search size={16} color={colors.textMuted} style={allExp.searchIcon} />
        <TextInput
          style={allExp.searchInput}
          placeholder="Search expenses..."
          placeholderTextColor={colors.textSubtle}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={allExp.filterScroll}
      >
        {FILTER_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={[
              allExp.filterChip,
              selectedFilter === chip && allExp.filterChipActive
            ]}
            onPress={() => setSelectedFilter(chip)}
          >
            <Text style={[
              allExp.filterChipText,
              selectedFilter === chip && allExp.filterChipTextActive
            ]}>
              {chip}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Expenses List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={allExp.listContent}>
        {groupedExpenses.length > 0 ? (
          groupedExpenses.map(([date, dateExpenses]) => (
            <View key={date}>
              {/* Date Header */}
              <View style={allExp.dateHeader}>
                <Text style={allExp.dateLabel}>{formatDateLabel(date)}</Text>
                <Text style={allExp.dateTotal}>
                  ₹ {(dateExpenses as ExpenseRecord[]).reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}
                </Text>
              </View>

              {/* Expenses for this date */}
              {(dateExpenses as ExpenseRecord[]).map((exp) => {
                const m = CAT[exp.category] || CAT['Other'];
                return (
                  <View key={exp.id} style={allExp.expenseCard}>
                    <View style={[allExp.expenseIcon, { backgroundColor: m.bg }]}>
                      <m.icon size={20} color={m.color} />
                    </View>
                    <View style={allExp.expenseMid}>
                      <Text style={allExp.expenseTitle}>{exp.title}</Text>
                      <View style={allExp.expenseDetail}>
                        <Text style={allExp.expenseTime}>{exp.time}</Text>
                        <View style={[allExp.categoryBadge, { backgroundColor: m.bg }]}>
                          <Text style={[allExp.categoryBadgeText, { color: m.color }]}>{m.label}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={allExp.expenseAmt}>₹ {exp.amount}</Text>
                  </View>
                );
              })}
            </View>
          ))
        ) : (
          <View style={allExp.emptyState}>
            <Text style={allExp.emptyStateText}>No expenses found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const allExp = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  spacer: { width: 40 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing['2xl'], marginVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1, paddingVertical: 12, fontSize: font.body, color: colors.text,
  },
  filterScroll: { paddingHorizontal: spacing['2xl'], gap: 8, paddingBottom: spacing.md },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },
  listContent: { paddingHorizontal: spacing['2xl'], paddingBottom: spacing.xl },
  dateHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.lg, marginBottom: spacing.md,
  },
  dateLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  dateTotal: { fontSize: 14, fontWeight: '700', color: colors.text },
  expenseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg, backgroundColor: colors.surface, marginBottom: spacing.sm,
    borderRadius: radius.lg, ...shadow.card,
  },
  expenseIcon: {
    width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
  },
  expenseMid: { flex: 1 },
  expenseTitle: { fontSize: font.cardTitle, fontWeight: '700', color: colors.text, marginBottom: 4 },
  expenseDetail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expenseTime: { fontSize: font.caption, color: colors.textMuted },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm },
  categoryBadgeText: { fontSize: 10, fontWeight: '700' },
  expenseAmt: { fontSize: font.cardTitle, fontWeight: '800', color: colors.text },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 16, color: colors.textMuted },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ExpensesScreen({ navigation }: any) {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(sampleExpenses);
  const [showAdd, setShowAdd] = useState(false);
  const [addDefaultCat, setAddDefaultCat] = useState('Food');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Today');
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  const todayExpenses = expenses.filter((e) => e.date === TODAY);
  const total = 350;
  const pct = 43;
  const recentExpenses = todayExpenses.slice(0, 4);

  const openAdd = (cat = 'Food') => { setAddDefaultCat(cat); setShowAdd(true); };

  if (showAllExpenses) {
    return (
      <AllExpensesScreen 
        expenses={expenses} 
        onBack={() => setShowAllExpenses(false)}
      />
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Gradient Header ───────────────────────────────────────────────── */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.hCircle1} />
        <View style={s.hCircle2} />
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerEyebrow}>My Wallet</Text>
            <Text style={s.headerTitle}>Expenses</Text>
          </View>
          <TouchableOpacity style={s.headerIconBtn} activeOpacity={0.75}>
            <Bell size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Period Selector ───────────────────────────────────── */}
        <View style={s.periodSelector}>
          {['Today', 'Last 7 Days', 'This Month'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[s.periodTab, selectedPeriod === period && s.periodTabActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[s.periodTabText, selectedPeriod === period && s.periodTabTextActive]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Total Spent Card ──────────────────────────────────── */}
        <View style={s.totalCard}>
          <View style={s.totalCardHeader}>
            <Text style={s.totalLabel}>Total Spent Today</Text>
            <View style={s.trendBadge}>
              <Text style={s.trendArrow}>↑</Text>
              <Text style={s.trendText}>12%</Text>
            </View>
          </View>
          <Text style={s.totalAmount}>₹ {total.toLocaleString('en-IN')}</Text>
          <Text style={s.totalSubtext}>vs Yesterday</Text>
        </View>

        {/* ── Top Spending Category ─────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Top Spending Category</Text>
        </View>

        <View style={s.categoryCard}>
          <View style={s.categoryContent}>
            <View style={s.categoryLeft}>
              <View style={s.categoryHeaderRow}>
                <View style={[s.categoryIconBg, { backgroundColor: '#FFEAF4' }]}>
                  <Utensils size={15} color="#FF2D8F" />
                </View>
                <Text style={s.categoryHeaderText}>Food   ₹ 150 (43%)</Text>
              </View>
              <View style={s.categoryRow}>
                <View style={[s.categoryDot, { backgroundColor: '#FF2D8F' }]} />
                <Text style={s.categoryName}>Food</Text>
                <Text style={s.categoryPercent}>43%</Text>
              </View>
              <View style={s.categoryRow}>
                <View style={[s.categoryDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={s.categoryName}>Transport</Text>
                <Text style={s.categoryPercent}>23%</Text>
              </View>
              <View style={s.categoryRow}>
                <View style={[s.categoryDot, { backgroundColor: '#10B981' }]} />
                <Text style={s.categoryName}>Shopping</Text>
                <Text style={s.categoryPercent}>17%</Text>
              </View>
              <View style={s.categoryRow}>
                <View style={[s.categoryDot, { backgroundColor: '#64748B' }]} />
                <Text style={s.categoryName}>Others</Text>
                <Text style={s.categoryPercent}>17%</Text>
              </View>
            </View>
            <View style={s.donutContainer}>
              <DonutRing pct={pct} />
            </View>
          </View>
        </View>

        {/* ── Recent Expenses ───────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Expenses</Text>
          <TouchableOpacity onPress={() => setShowAllExpenses(true)}>
            <Text style={s.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={s.expenseList}>
          {recentExpenses.map((exp) => {
            const m = CAT[exp.category] || CAT['Other'];
            return (
              <View key={exp.id} style={s.expenseCard}>
                <View style={[s.expenseIcon, { backgroundColor: m.bg }]}>
                  <m.icon size={20} color={m.color} />
                </View>
                <View style={s.expenseMid}>
                  <Text style={s.expenseTitle}>{exp.title}</Text>
                  <Text style={s.expenseTime}>Today, {exp.time}</Text>
                </View>
                <Text style={s.expenseAmt}>₹ {exp.amount}</Text>
              </View>
            );
          })}
        </View>

      </ScrollView>

      {/* ── FAB ─────────────────────────────────────────────────── */}
      <View style={s.fabContainer}>
        <TouchableOpacity style={s.fabBtn} onPress={() => openAdd('Food')} activeOpacity={0.9}>
          <Plus size={24} color="#fff" strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* ── Modals ─────────────────────────────────────────────── */}
      <AddModal
        visible={showAdd}
        defaultCat={addDefaultCat}
        onClose={() => setShowAdd(false)}
        onSave={(e: ExpenseRecord) => setExpenses(prev => [e, ...prev])}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 120 },

  // ── Gradient Header ──────────────────────────────────────────────────────
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  hCircle1: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -40, right: -20,
  },
  hCircle2: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, right: 80,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerEyebrow: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 3 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Period selector ──────────────────────────────────────────────────────
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    gap: 8,
  },
  periodTab: {
    flex: 1, height: 36, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  periodTabActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  periodTabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  periodTabTextActive: { color: colors.primary, fontWeight: '700' },

  // ── Total card ──────────────────────────────────────────────────────────
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  totalCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  totalLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill,
  },
  trendArrow: { fontSize: 12, fontWeight: '700', color: colors.success },
  trendText: { fontSize: 11, fontWeight: '700', color: colors.success },
  totalAmount: {
    fontSize: 32, fontWeight: '800', color: colors.primary,
    letterSpacing: -1, marginBottom: 2,
  },
  totalSubtext: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },

  // ── Section header ───────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  seeAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // ── Category card ────────────────────────────────────────────────────────
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
    ...shadow.card,
  },
  categoryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryLeft: { flex: 1, gap: 8, paddingRight: 8 },
  categoryHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  categoryIconBg: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  categoryHeaderText: { fontSize: 13, fontWeight: '700', color: colors.text },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryDot: { width: 7, height: 7, borderRadius: 4 },
  categoryName: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  categoryPercent: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  donutContainer: { marginLeft: 4 },

  // ── Expense list ─────────────────────────────────────────────────────────
  expenseList: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  expenseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  expenseIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  expenseMid: { flex: 1 },
  expenseTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  expenseTime: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  expenseAmt: { fontSize: 14, fontWeight: '700', color: colors.text },

  // ── FAB ──────────────────────────────────────────────────────────────────
  fabContainer: { position: 'absolute', bottom: 88, right: 24, alignItems: 'center' },
  fabBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35, shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
});
export { AddModal, AddCategoryScreen, SuccessModal };



