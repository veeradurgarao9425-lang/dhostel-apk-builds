import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Check, Calendar, ChevronDown, ChevronRight, FileText,
  Utensils, Car, ShoppingBag, Receipt, Film, Stethoscope, MoreHorizontal, X,
} from 'lucide-react-native';
import { colors, spacing, radius, shadow } from '../theme';

const QUICK_AMOUNTS = [50, 100, 200, 500];

const CATEGORIES = [
  { id: 'Food',          Icon: Utensils,       color: '#EF4444', bg: '#FEE2E2' },
  { id: 'Transport',     Icon: Car,            color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'Shopping',      Icon: ShoppingBag,    color: '#10B981', bg: '#D1FAE5' },
  { id: 'Bills',         Icon: Receipt,        color: '#F59E0B', bg: '#FEF3C7' },
  { id: 'Entertainment', Icon: Film,           color: '#8B5CF6', bg: '#EDE9FE' },
  { id: 'Medical',       Icon: Stethoscope,    color: '#E11D48', bg: '#FFE4E6' },
  { id: 'Others',        Icon: MoreHorizontal, color: '#6B7280', bg: '#F3F4F6' },
  { id: 'More',          Icon: MoreHorizontal, color: '#9CA3AF', bg: '#F9FAFB' },
];

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Online'];

function formatNow(): string {
  const d = new Date();
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export default function AddExpenseScreen({ navigation }: any) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [showPayPicker, setShowPayPicker] = useState(false);

  useEffect(() => {
    setDateTime(formatNow());
  }, []);

  const handleSave = () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Enter Amount', 'Please enter a valid expense amount.');
      return;
    }
    // TODO: persist expense
    navigation.goBack();
  };

  const activeCat = CATEGORIES.find(c => c.id === category)!;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <TouchableOpacity style={[styles.iconBtn, styles.saveBtn]} onPress={handleSave} activeOpacity={0.75}>
          <Check size={18} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Amount ─────────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>Amount</Text>
        <View style={styles.amountRow}>
          <Text style={styles.rupeeSymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textSubtle}
            autoFocus
          />
          {amount.length > 0 && (
            <TouchableOpacity onPress={() => setAmount('')} style={styles.clearBtn} activeOpacity={0.7}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick chips */}
        <View style={styles.chipsRow}>
          {QUICK_AMOUNTS.map(q => (
            <TouchableOpacity
              key={q}
              style={[styles.chip, amount === String(q) && styles.chipActive]}
              onPress={() => setAmount(String(q))}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, amount === String(q) && styles.chipTextActive]}>
                ₹ {q}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Category ───────────────────────────────────────────────── */}
        <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Category</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map(c => {
            const Icon = c.Icon;
            const isActive = category === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={styles.catItem}
                onPress={() => setCategory(c.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.catIconWrap,
                    { backgroundColor: c.bg },
                    isActive && { borderWidth: 2.5, borderColor: c.color },
                  ]}
                >
                  <Icon size={22} color={c.color} strokeWidth={isActive ? 2.3 : 1.6} />
                </View>
                <Text style={[styles.catLabel, isActive && { color: c.color, fontWeight: '800' }]}>
                  {c.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Date & Time ─────────────────────────────────────────────── */}
        <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Date & Time</Text>
        <TouchableOpacity style={styles.inputBox} activeOpacity={0.7}>
          <Text style={styles.inputText}>{dateTime}</Text>
          <Calendar size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* ── Payment Method ──────────────────────────────────────────── */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Payment Method</Text>
        <TouchableOpacity
          style={styles.inputBox}
          activeOpacity={0.7}
          onPress={() => setShowPayPicker(p => !p)}
        >
          <Text style={styles.inputText}>{payMethod}</Text>
          <ChevronDown
            size={18}
            color={colors.textMuted}
            style={{ transform: [{ rotate: showPayPicker ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
        {showPayPicker && (
          <View style={styles.picker}>
            {PAYMENT_METHODS.map(pm => (
              <TouchableOpacity
                key={pm}
                style={[styles.pickerItem, payMethod === pm && styles.pickerItemActive]}
                onPress={() => { setPayMethod(pm); setShowPayPicker(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerItemText, payMethod === pm && styles.pickerItemTextActive]}>
                  {pm}
                </Text>
                {payMethod === pm && (
                  <Check size={14} color={colors.primary} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Note ───────────────────────────────────────────────────── */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Note (Optional)</Text>
        <View style={[styles.inputBox, { alignItems: 'flex-start', minHeight: 60 }]}>
          <TextInput
            style={[styles.inputText, { flex: 1, padding: 0 }]}
            placeholder="Add a note..."
            placeholderTextColor={colors.textSubtle}
            value={note}
            onChangeText={setNote}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* ── Add Receipt ─────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.receiptRow} activeOpacity={0.75}>
          <View style={styles.receiptIcon}>
            <FileText size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.receiptTitle}>Add Receipt (Optional)</Text>
            <Text style={styles.receiptSub}>Upload receipt image</Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* ── Save button ─────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.saveFullBtn} onPress={handleSave} activeOpacity={0.85}>
          <Check size={20} color="#fff" strokeWidth={2.5} />
          <Text style={styles.saveFullBtnText}>Save Expense</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40, paddingTop: 8 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  saveBtn: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },

  // Field label
  fieldLabel: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 12 },

  // Amount
  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rupeeSymbol: { fontSize: 36, fontWeight: '700', color: colors.text, marginRight: 6 },
  amountInput: { fontSize: 36, fontWeight: '800', color: colors.text, flex: 1, padding: 0 },
  clearBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },

  // Quick chips
  chipsRow: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: colors.primary },

  // Category grid — 4 columns
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, rowGap: 18 },
  catItem: { width: '22%', alignItems: 'center', gap: 6 },
  catIconWrap: {
    width: 58, height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },

  // Inputs
  inputBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16, paddingVertical: 14,
    ...shadow.subtle,
  },
  inputText: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },

  // Payment picker dropdown
  picker: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    marginTop: 4,
    overflow: 'hidden',
    ...shadow.card,
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  pickerItemActive: { backgroundColor: colors.primarySoft },
  pickerItemText: { fontSize: 14, fontWeight: '600', color: colors.text },
  pickerItemTextActive: { color: colors.primary, fontWeight: '800' },

  // Receipt
  receiptRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16, marginTop: 16,
    ...shadow.subtle,
  },
  receiptIcon: {
    width: 42, height: 42, borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  receiptTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  receiptSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Save button
  saveFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    marginTop: 28,
    ...shadow.raised,
  },
  saveFullBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
