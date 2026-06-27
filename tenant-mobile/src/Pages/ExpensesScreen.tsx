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
import { sampleExpenses, ExpenseRecord, ExpenseCategory } from '../data/tenantContent';
import api from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) return Alert.alert('Enter amount', 'Valid amount needed.');
    try {
      const res = await api.post('/tenant-expenses', {
        title: note.trim() || cat,
        amount: Number(amount),
        category: cat,
        date: new Date().toISOString().split('T')[0],
      });

      if (res.data?.success) {
        const e = res.data.data;
        const expenseData = {
          id: String(e.expense_id),
          title: e.title,
          category: e.category,
          amount: Number(e.amount),
          date: e.date.split('T')[0],
          time: 'Now',
          note: e.note || ''
        };
        setLastSaved(expenseData);
        onSave(expenseData);
        setAmount(''); setNote(''); setCat(defaultCat);
        setShowSuccess(true);
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to add expense');
      }
    } catch (err: any) {
      console.error('Error adding expense:', err);
      Alert.alert('Error', err.message || 'Network error');
    }
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
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addDefaultCat, setAddDefaultCat] = useState('Food');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Today');
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tenant-expenses');
      if (res.data?.success) {
        const formatted = res.data.data.map((e: any) => ({
          id: String(e.expense_id),
          title: e.title,
          category: e.category,
          amount: Number(e.amount),
          date: e.date.split('T')[0],
          time: new Date(e.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          note: e.note || ''
        }));
        setExpenses(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch expenses', err);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const total = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
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
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35, shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
});
export { AddModal, AddCategoryScreen, SuccessModal };



