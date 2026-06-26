import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Check, Calendar, ChevronDown, FileText, ChevronRight,
  Utensils, Car, ShoppingBag, Receipt, Film, Cross, Target, MoreHorizontal,
} from 'lucide-react-native';
import { colors, spacing, radius, shadow } from '../theme';

const QUICK_AMOUNTS = [50, 100, 200, 500];

// The 7 categories in the design
const CATEGORIES = [
  { id: 'Food', icon: Utensils, color: '#EF4444', bg: '#FEE2E2' },
  { id: 'Transport', icon: Car, color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'Shopping', icon: ShoppingBag, color: '#10B981', bg: '#D1FAE5' },
  { id: 'Bills', icon: Receipt, color: '#F59E0B', bg: '#FEF3C7' },
  { id: 'Entertainment', icon: Film, color: '#8B5CF6', bg: '#EDE9FE' },
  { id: 'Medical', icon: Cross, color: '#E11D48', bg: '#FFE4E6' },
  { id: 'Others', icon: Target, color: '#B91C1C', bg: '#FEE2E2' },
];

export default function AddExpenseScreen({ navigation }: any) {
  const [amount, setAmount] = useState('250');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const [dateTime, setDateTime] = useState('');

  useEffect(() => {
    // Auto-set date and time when form opens
    const now = new Date();
    const options = { day: 'numeric' as const, month: 'short' as const, year: 'numeric' as const, hour: 'numeric' as const, minute: '2-digit' as const, hour12: true };
    setDateTime(now.toLocaleString('en-IN', options));
  }, []);

  const handleSave = () => {
    // In a real app, save logic goes here
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleSave} activeOpacity={0.75}>
          <Check size={20} color="#7B3A2A" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Amount ───────────────────────────────────────────────────────── */}
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountWrap}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textSubtle}
          />
        </View>

        {/* Quick Amounts */}
        <View style={styles.quickAmountsRow}>
          {QUICK_AMOUNTS.map((q) => (
            <TouchableOpacity key={q} style={styles.quickChip} onPress={() => setAmount(String(q))}>
              <Text style={styles.quickChipText}>₹ {q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Category ─────────────────────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 24 }]}>Category</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const isActive = category === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={styles.catItem}
                onPress={() => setCategory(c.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.catIconWrap, { backgroundColor: c.bg }]}>
                  <Icon size={22} color={c.color} strokeWidth={isActive ? 2.5 : 1.5} />
                </View>
                <Text style={[styles.catLabel, isActive && styles.catLabelActive]}>{c.id}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Date & Time ──────────────────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 24 }]}>Date & Time</Text>
        <View style={styles.inputBox}>
          <Text style={styles.inputText}>{dateTime}</Text>
          <Calendar size={18} color={colors.textMuted} />
        </View>

        {/* ── Payment Method ───────────────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 16 }]}>Payment Method</Text>
        <View style={styles.inputBox}>
          <Text style={styles.inputText}>Online</Text>
          <ChevronDown size={18} color={colors.textMuted} />
        </View>

        {/* ── Note ─────────────────────────────────────────────────────────── */}
        <Text style={[styles.label, { marginTop: 16 }]}>Note (Optional)</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.textInput}
            placeholder="Add a note..."
            placeholderTextColor={colors.textSubtle}
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* ── Add Receipt ──────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.receiptBox} activeOpacity={0.75}>
          <View style={styles.receiptIconWrap}>
            <FileText size={20} color="#7B3A2A" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.receiptTitle}>Add Receipt (Optional)</Text>
            <Text style={styles.receiptSub}>Upload receipt image</Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.xl, paddingBottom: 60 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: 14,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },

  // Forms
  label: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 12 },

  // Amount
  amountWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  currencySymbol: { fontSize: 32, fontWeight: '800', color: colors.text, marginRight: 8 },
  amountInput: { fontSize: 32, fontWeight: '800', color: colors.text, flex: 1, padding: 0 },

  quickAmountsRow: { flexDirection: 'row', gap: 12 },
  quickChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    ...shadow.subtle,
  },
  quickChipText: { fontSize: 13, fontWeight: '700', color: colors.text },

  // Categories
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, rowGap: 20 },
  catItem: {
    width: '22%', // approx 4 items per row
    alignItems: 'center',
    gap: 8,
  },
  catIconWrap: {
    width: 60, height: 60,
    borderRadius: 20, // soft square
    alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { fontSize: 11, fontWeight: '600', color: colors.text },
  catLabelActive: { fontWeight: '800' },

  // Inputs
  inputBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16, paddingVertical: 14,
    ...shadow.subtle,
  },
  inputText: { fontSize: 14, fontWeight: '600', color: colors.text },
  textInput: { fontSize: 14, color: colors.text, flex: 1, padding: 0 },

  // Receipt
  receiptBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5EDE9', // soft brown background
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 24,
  },
  receiptIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  receiptTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  receiptSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
