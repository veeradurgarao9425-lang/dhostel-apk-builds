import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
  Dimensions, Modal, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Check, CalendarDays, ChevronDown, FileImage,
  ChevronRight, Utensils, Car, ShoppingBag, Receipt,
  Film, HeartPulse, MoreHorizontal, Coffee, Home,
  Plane, Zap, Gift, BookOpen, Dumbbell, Dog, Plus,
} from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Svg, { Circle, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

const BLUE      = '#2245D4';
const BLUE_SOFT = '#EEF3FF';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#0D1B3E';
const TEXT_MID  = '#4A5568';
const TEXT_LIGHT= '#9CA3AF';
const BG        = '#F8FAFD';
const BORDER    = '#E8EDF5';
const SUCCESS   = '#16A34A';

const CATEGORIES = [
  { id: 'Food',          color: '#EF5350', bg: '#FDEAEA', Icon: Utensils },
  { id: 'Rent',          color: '#546E7A', bg: '#ECEFF1', Icon: Home },
  { id: 'Transport',     color: BLUE,      bg: BLUE_SOFT, Icon: Car },
  { id: 'Shopping',      color: '#43A047', bg: '#EAF5EA', Icon: ShoppingBag },
  { id: 'Health',        color: '#E53935', bg: '#FDEAEA', Icon: HeartPulse },
  { id: 'Entertainment', color: '#8E24AA', bg: '#F4E5FA', Icon: Film },
  { id: 'Travel',        color: '#0288D1', bg: '#E1F5FE', Icon: Plane },
  { id: 'Education',     color: '#3949AB', bg: '#E8EAF6', Icon: BookOpen },
  { id: 'Coffee',        color: '#795548', bg: '#EFEBE9', Icon: Coffee },
  { id: 'Gym',           color: '#F4511E', bg: '#FBE9E7', Icon: Dumbbell },
  { id: 'Utilities',     color: '#F9A825', bg: '#FFFDE7', Icon: Zap },
  { id: 'Gifts',         color: '#EC407A', bg: '#FCE4EC', Icon: Gift },
  { id: 'Pets',          color: '#6D4C41', bg: '#EFEBE9', Icon: Dog },
  { id: 'Bills',         color: '#FB8C00', bg: '#FFF3E0', Icon: Receipt },
  { id: 'Others',        color: '#546E7A', bg: '#ECEFF1', Icon: MoreHorizontal },
];

const RECENT_CATS = ['Food', 'Transport', 'Shopping'];
const QUICK_AMOUNTS = [50, 100, 200, 500];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Net Banking', 'Wallet'];

// ── Bottom Sheet ──────────────────────────────────────────────────────────────
function BottomPicker({ visible, data, selected, onSelect, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1}>
            <View style={p.sheet}>
              <View style={p.handle} />
              <Text style={p.sheetTitle}>Payment Method</Text>
              {data.map((item: string) => (
                <TouchableOpacity
                  key={item}
                  style={[p.sheetRow, selected === item && p.sheetRowActive]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <Text style={[p.sheetRowText, selected === item && p.sheetRowTextActive]}>{item}</Text>
                  {selected === item && <Check size={18} color={BLUE} strokeWidth={2.5} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Success Modal ─────────────────────────────────────────────────────────────
function SuccessModal({ visible, amount, category, onDone }: any) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0); opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[suc.overlay, { opacity }]}>
        <Animated.View style={[suc.card, { transform: [{ scale }] }]}>
          <View style={suc.iconWrap}>
            <Svg width={60} height={60} viewBox="0 0 60 60" fill="none">
              <Circle cx={30} cy={30} r={30} fill={SUCCESS} opacity={0.1} />
              <Circle cx={30} cy={30} r={22} fill={SUCCESS} />
              <Path d="M18 31l8 8 16-16" stroke={WHITE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={suc.title}>Expense Added!</Text>
          <Text style={suc.subtitle}>
            ₹{amount} added to {category}
          </Text>
          <TouchableOpacity style={suc.btn} onPress={onDone} activeOpacity={0.85}>
            <Text style={suc.btnText}>Great! 🎉</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Animated Category Item ────────────────────────────────────────────────────
function CategoryItem({ cat, selected, onPress }: { cat: typeof CATEGORIES[0]; selected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const Icon  = cat.Icon;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.82, useNativeDriver: true, friction: 4, tension: 200 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 4, tension: 200 }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity style={s.catItem} onPress={handlePress} activeOpacity={0.9}>
      <Animated.View style={[
        s.catIconWrap,
        { backgroundColor: cat.bg, transform: [{ scale }] },
        selected && { borderWidth: 2.5, borderColor: cat.color },
      ]}>
        <Icon size={26} color={cat.color} strokeWidth={1.8} />
        {selected && (
          <View style={[s.catCheckBadge, { backgroundColor: cat.color }]}>
            <Check size={8} color={WHITE} strokeWidth={3} />
          </View>
        )}
      </Animated.View>
      <Text style={[s.catLabel, selected && { color: cat.color, fontWeight: '700' }]}>{cat.id}</Text>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function AddExpenseScreen({ navigation }: any) {
  const [amount, setAmount]           = useState('');
  const [category, setCategory]       = useState('Food');
  const [note, setNote]               = useState('');
  const [dateTime, setDateTime]       = useState('');
  const [payMethod, setPayMethod]     = useState('Cash');
  const [showPayPicker, setShowPayPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const d = new Date();
    setDateTime(d.toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).replace(',', ','));
  }, []);

  const handleSave = () => {
    if (!amount || Number(amount) <= 0) return;
    setShowSuccess(true);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={TEXT_DARK} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Expense</Text>
        <TouchableOpacity onPress={handleSave} style={[s.headerBtn, s.checkBtn]} activeOpacity={0.7}>
          <Check size={18} color={BLUE} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Amount */}
          <View style={s.amountCard}>
            <Text style={s.amountHint}>Enter amount</Text>
            <View style={s.amountRow}>
              <Text style={s.rupee}>₹</Text>
              <TextInput
                style={s.amountInput}
                value={amount}
                onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric" placeholder="0"
                placeholderTextColor="#CBD5E0" autoFocus
              />
            </View>
            {/* Quick chips */}
            <View style={s.chipsRow}>
              {QUICK_AMOUNTS.map(q => (
                <TouchableOpacity
                  key={q}
                  style={[s.chip, amount === String(q) && s.chipActive]}
                  onPress={() => setAmount(String(q))} activeOpacity={0.7}
                >
                  <Text style={[s.chipText, amount === String(q) && s.chipTextActive]}>₹{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Categories quick row */}
          <View style={s.recentRow}>
            <Text style={s.sectionLabel}>Recent</Text>
            <View style={s.recentCats}>
              {RECENT_CATS.map(cid => {
                const meta = CATEGORIES.find(c => c.id === cid)!;
                const Icon = meta.Icon;
                const active = category === cid;
                return (
                  <TouchableOpacity
                    key={cid}
                    style={[s.recentCatBtn, active && { borderColor: meta.color, backgroundColor: meta.bg }]}
                    onPress={() => setCategory(cid)} activeOpacity={0.7}
                  >
                    <Icon size={16} color={meta.color} strokeWidth={2} />
                    <Text style={[s.recentCatText, active && { color: meta.color }]}>{cid}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Category Grid */}
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionLabel}>Category</Text>
          </View>
          <View style={s.catGrid}>
            {CATEGORIES.map(cat => (
              <CategoryItem
                key={cat.id} cat={cat}
                selected={category === cat.id}
                onPress={() => setCategory(cat.id)}
              />
            ))}
            {/* Add custom category */}
            <TouchableOpacity style={s.catItem} activeOpacity={0.7}>
              <View style={[s.catIconWrap, { backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed' }]}>
                <Plus size={22} color={TEXT_LIGHT} strokeWidth={2} />
              </View>
              <Text style={s.catLabel}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Date & Time */}
          <Text style={[s.sectionLabel, { marginTop: 20 }]}>Date & Time</Text>
          <TouchableOpacity style={s.inputCard} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
            <CalendarDays size={18} color={BLUE} strokeWidth={2} />
            <Text style={s.inputCardText}>{dateTime}</Text>
            <ChevronDown size={16} color={TEXT_LIGHT} strokeWidth={2} />
          </TouchableOpacity>

          <DateTimePickerModal
            isVisible={showDatePicker} mode="datetime" maximumDate={new Date()}
            onConfirm={date => {
              setDateTime(date.toLocaleString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true,
              }).replace(',', ','));
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />

          {/* Payment */}
          <Text style={[s.sectionLabel, { marginTop: 16 }]}>Payment Method</Text>
          <TouchableOpacity style={s.inputCard} onPress={() => setShowPayPicker(true)} activeOpacity={0.7}>
            <Text style={s.inputCardText}>{payMethod}</Text>
            <ChevronDown size={16} color={TEXT_LIGHT} strokeWidth={2} />
          </TouchableOpacity>
          <BottomPicker visible={showPayPicker} data={PAYMENT_METHODS} selected={payMethod}
            onSelect={setPayMethod} onClose={() => setShowPayPicker(false)} />

          {/* Note */}
          <Text style={[s.sectionLabel, { marginTop: 16 }]}>Note (Optional)</Text>
          <View style={[s.inputCard, { height: 'auto', paddingVertical: 14, alignItems: 'flex-start' }]}>
            <TextInput
              style={[s.inputCardText, { minHeight: 36 }]}
              placeholder="Add a note..." placeholderTextColor={TEXT_LIGHT}
              value={note} onChangeText={setNote} multiline
            />
          </View>

          {/* Receipt */}
          <TouchableOpacity style={s.receiptRow} activeOpacity={0.7}>
            <View style={s.receiptIconWrap}>
              <FileImage size={18} color={TEXT_MID} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.receiptTitle}>Add Receipt</Text>
              <Text style={s.receiptSub}>Optional · Upload an image</Text>
            </View>
            <ChevronRight size={16} color={TEXT_LIGHT} strokeWidth={2} />
          </TouchableOpacity>

          {/* Save */}
          <TouchableOpacity
            style={[s.saveBtn, (!amount || Number(amount) <= 0) && s.saveBtnOff]}
            onPress={handleSave} activeOpacity={0.85}
          >
            <Text style={s.saveBtnText}>Save Expense</Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal visible={showSuccess} amount={amount} category={category}
        onDone={() => { setShowSuccess(false); navigation.goBack(); }} />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const ICON_WRAP = (width - 40 - 14 * 3) / 4; // 4 columns with gap 14

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: WHITE,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  checkBtn:    { borderRadius: 10, backgroundColor: BLUE_SOFT },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_DARK },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  // Amount card
  amountCard: {
    backgroundColor: WHITE, borderRadius: 20, padding: 18,
    borderWidth: 1.5, borderColor: BLUE,
    marginBottom: 16,
    shadowColor: BLUE, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  amountHint:  { fontSize: 11, color: TEXT_LIGHT, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rupee:       { fontSize: 32, fontWeight: '800', color: TEXT_DARK, marginRight: 6 },
  amountInput: { fontSize: 44, fontWeight: '900', color: TEXT_DARK, flex: 1, padding: 0, includeFontPadding: false },
  chipsRow:    { flexDirection: 'row', gap: 10 },
  chip:        { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  chipActive:  { borderColor: BLUE, backgroundColor: BLUE_SOFT },
  chipText:    { fontSize: 13, fontWeight: '600', color: TEXT_MID },
  chipTextActive: { color: BLUE, fontWeight: '700' },

  // Recent cats
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: TEXT_DARK, textTransform: 'uppercase', letterSpacing: 0.5 },
  recentCats: { flex: 1, flexDirection: 'row', gap: 8 },
  recentCatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: WHITE,
    borderWidth: 1, borderColor: BORDER,
  },
  recentCatText: { fontSize: 12, fontWeight: '600', color: TEXT_MID },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  // Category grid
  catGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 4 },
  catItem:   { alignItems: 'center', gap: 6, width: ICON_WRAP },
  catIconWrap: {
    width: ICON_WRAP, height: ICON_WRAP, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  catCheckBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: WHITE,
  },
  catLabel: { fontSize: 11, fontWeight: '600', color: TEXT_MID, textAlign: 'center' },

  // Input cards
  inputCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER,
    borderRadius: 13, paddingHorizontal: 14, height: 52,
  },
  inputCardText: { flex: 1, fontSize: 14, color: TEXT_DARK, fontWeight: '600' },

  // Receipt row
  receiptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER,
    borderRadius: 13, padding: 14, marginTop: 16,
  },
  receiptIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  receiptTitle:    { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  receiptSub:      { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500', marginTop: 2 },

  // Save button
  saveBtn: {
    backgroundColor: BLUE, borderRadius: 16, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  saveBtnOff:  { backgroundColor: '#A0B4E8', shadowOpacity: 0 },
  saveBtnText: { color: WHITE, fontSize: 16, fontWeight: '800' },
});

// Bottom sheet
const p = StyleSheet.create({
  sheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 44,
  },
  handle:        { width: 36, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:    { fontSize: 16, fontWeight: '800', color: TEXT_DARK, marginBottom: 12 },
  sheetRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  sheetRowActive:{ backgroundColor: BLUE_SOFT, paddingHorizontal: 10, borderRadius: 10, borderBottomWidth: 0, marginBottom: 1 },
  sheetRowText:  { fontSize: 15, color: TEXT_DARK, fontWeight: '600' },
  sheetRowTextActive: { color: BLUE, fontWeight: '700' },
});

// Success modal
const suc = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(13,27,62,0.6)', alignItems: 'center', justifyContent: 'center' },
  card:     { backgroundColor: WHITE, borderRadius: 28, padding: 36, width: width * 0.82, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  iconWrap: { marginBottom: 20 },
  title:    { fontSize: 22, fontWeight: '800', color: TEXT_DARK, marginBottom: 8 },
  subtitle: { fontSize: 14, color: TEXT_MID, fontWeight: '500', marginBottom: 32, textAlign: 'center' },
  btn:      { backgroundColor: SUCCESS, borderRadius: 16, paddingHorizontal: 48, paddingVertical: 14, shadowColor: SUCCESS, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText:  { color: WHITE, fontSize: 16, fontWeight: '800' },
});
