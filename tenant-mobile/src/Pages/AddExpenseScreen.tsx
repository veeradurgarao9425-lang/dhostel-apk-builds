import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
  Dimensions, Modal, Animated, Image, Switch,
} from 'react-native';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft, Check, CalendarDays, ChevronDown, FileImage,
  ChevronRight, MoreHorizontal,
  Plus, RefreshCw, X, ChevronLeft,
} from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { LoaderOverlay } from '../components/ui/PageLoader';
import { getCategoryTheme } from '../constants/categoryTheme';

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

const CATEGORY_IDS = [
  'Food', 'Rent', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Travel',
  'Education', 'Coffee', 'Gym', 'Utilities', 'Gifts', 'Pets', 'Bills', 'Family', 'Fuel', 'Others',
];
const CATEGORIES = CATEGORY_IDS.map(id => {
  const theme = getCategoryTheme(id);
  return { id, color: theme.color, bg: theme.bg, gradient: theme.gradient, glowColor: theme.glowColor, premium: theme.premium, Icon: theme.Icon };
});

const QUICK_AMOUNTS   = [50, 100, 200, 500];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Net Banking', 'Wallet'];

function BottomPicker({ visible, data, selected, onSelect, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1}>
            <View style={p.sheet}>
              <View style={p.handle} />
              <Text style={p.sheetTitle}>Payment Method</Text>
              {data.map((item: string) => (
                <TouchableOpacity key={item} style={[p.sheetRow, selected === item && p.sheetRowActive]} onPress={() => { onSelect(item); onClose(); }}>
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

function SuccessModal({ visible, amount, category, onDone }: any) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else { scale.setValue(0); opacity.setValue(0); }
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
          <Text style={suc.subtitle}>₹{amount} added to {category}</Text>
          <TouchableOpacity style={suc.btn} onPress={onDone} activeOpacity={0.85}>
            <Text style={suc.btnText}>Great! 🎉</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

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
        { transform: [{ scale }], overflow: 'hidden' },
        selected && {
          shadowColor: cat.glowColor, shadowOpacity: cat.premium ? 0.45 : 0.3,
          shadowRadius: cat.premium ? 14 : 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
        },
      ]}>
        {selected ? (
          <LinearGradient colors={cat.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.catIconFill}>
            <Icon size={24} color={WHITE} strokeWidth={2} />
          </LinearGradient>
        ) : (
          <View style={[s.catIconFill, { backgroundColor: cat.bg }]}>
            <Icon size={24} color={cat.color} strokeWidth={2} />
          </View>
        )}
        {selected && (
          <Animated.View style={[s.catCheckBadge, { backgroundColor: cat.glowColor }]}>
            <Check size={10} color={WHITE} strokeWidth={3} />
          </Animated.View>
        )}
      </Animated.View>
      <Text style={[s.catLabel, selected && { color: cat.color, fontWeight: '800' }]} numberOfLines={1}>{cat.id}</Text>
    </TouchableOpacity>
  );
}

function AnimatedChip({ amount, selected, onPress }: { amount: string; selected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.85, useNativeDriver: true, friction: 5, tension: 200 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 5, tension: 200 }),
    ]).start();
    onPress();
  };
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={{ flex: 1 }}>
      <Animated.View style={[s.chip, selected && s.chipActive, { transform: [{ scale }] }]}>
        <Text style={[s.chipText, selected && s.chipTextActive]}>₹{amount}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function AddExpenseScreen({ navigation, route }: any) {
  const defaultCategory = route?.params?.defaultCategory || 'Food';
  const { showError } = useToast();
  const [amount, setAmount]               = useState('');
  const [category, setCategory]           = useState(defaultCategory);
  const [note, setNote]                   = useState('');
  const [dateTime, setDateTime]           = useState('');
  const [payMethod, setPayMethod]         = useState('Cash');
  const [showPayPicker, setShowPayPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuccess, setShowSuccess]     = useState(false);
  const [showAllCats, setShowAllCats]     = useState(false);
  const [receiptUri, setReceiptUri]       = useState<string | null>(null);
  const [isRecurring, setIsRecurring]     = useState(false);
  const [saving, setSaving]               = useState(false);
  const [showBudgetPrompt, setShowBudgetPrompt] = useState(false);
  const [budgetInput, setBudgetInput]     = useState('');
  const dateRef = useRef(new Date());

  useEffect(() => {
    const d = new Date();
    dateRef.current = d;
    setDateTime(d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ','));
  }, []);

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) return;
    try {
      const savedBudget = await AsyncStorage.getItem('tenant_budget');
      if (!savedBudget || Number(savedBudget) === 0) {
        setShowBudgetPrompt(true);
        return;
      }
    } catch {
      // proceed if fails
    }
    await executeSave();
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      const year = dateRef.current.getFullYear();
      const month = String(dateRef.current.getMonth() + 1).padStart(2, '0');
      const day = String(dateRef.current.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;

      await api.post('/tenant-expenses', {
        title: note.trim() || category,
        category,
        amount: Number(amount),
        date: localDateStr,
        payment_mode: payMethod,
      });
      setShowSuccess(true);
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      const errMsg = err?.response?.data?.error || err.message || 'Please try again.';
      showError(`Failed to save expense: ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBudgetAndExpense = async () => {
    const bAmt = Number(budgetInput);
    if (isNaN(bAmt) || bAmt < 100) {
      showError('Please enter a valid budget of at least ₹100.');
      return;
    }
    try {
      await AsyncStorage.setItem('tenant_budget', bAmt.toString());
      // Optionally sync to backend silently
      api.post('/tenant-expenses/goal', { amount: bAmt }).catch(() => {});
      
      setShowBudgetPrompt(false);
      await executeSave();
    } catch (err) {
      showError('Failed to save budget.');
    }
  };
  const handlePickReceipt = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setReceiptUri(result.assets[0].uri);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn} activeOpacity={0.7}>
          <ChevronLeft size={28} color={TEXT_DARK} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Expense</Text>
        <View style={s.headerBtn} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.amountContainer}>
            <Text style={[s.sectionLabel, { textTransform: 'none', fontSize: 15 }]}>Amount</Text>
            <View style={s.amountRow}>
              <Text style={s.rupee}>₹</Text>
              <TextInput style={s.amountInput} value={amount} onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))} keyboardType="numeric" placeholder="0" placeholderTextColor="#CBD5E0" autoFocus />
            </View>
          </View>

          <View style={s.chipsRow}>
            {QUICK_AMOUNTS.map(q => (
              <AnimatedChip key={q} amount={String(q)} selected={amount === String(q)} onPress={() => setAmount(String(q))} />
            ))}
          </View>

          <Text style={s.cardSectionLabel}>CATEGORY</Text>
          <View style={s.catCard}>
            <View style={s.catGrid}>
              {(showAllCats ? CATEGORIES : CATEGORIES.slice(0, 9)).map(cat => (
                <CategoryItem key={cat.id} cat={cat} selected={category === cat.id} onPress={() => setCategory(cat.id)} />
              ))}
              {!showAllCats ? (
                <TouchableOpacity style={s.catItem} activeOpacity={0.7} onPress={() => setShowAllCats(true)}>
                  <View style={[s.catIconWrap, { backgroundColor: BG }]}><MoreHorizontal size={24} color={TEXT_DARK} strokeWidth={2.5} /></View>
                  <Text style={s.catLabel} numberOfLines={1}>More</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.catItem} activeOpacity={0.7} onPress={() => navigation.navigate('AddCategory')}>
                  <View style={[s.catIconWrap, { backgroundColor: BG, borderWidth: 1, borderColor: '#D1D5DB' }]}><Plus size={24} color={TEXT_DARK} strokeWidth={2.5} /></View>
                  <Text style={s.catLabel} numberOfLines={1}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={[s.sectionLabel, { marginTop: 20 }]}>Date & Time</Text>
          <TouchableOpacity style={s.inputCard} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
            <CalendarDays size={18} color={BLUE} strokeWidth={2} />
            <Text style={s.inputCardText}>{dateTime}</Text>
            <ChevronDown size={16} color={TEXT_LIGHT} strokeWidth={2} />
          </TouchableOpacity>
          <DateTimePickerModal isVisible={showDatePicker} mode="datetime" maximumDate={new Date()}
            onConfirm={date => { dateRef.current = date; setDateTime(date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ',')); setShowDatePicker(false); }}
            onCancel={() => setShowDatePicker(false)} />

          <Text style={[s.sectionLabel, { marginTop: 16 }]}>Payment Method</Text>
          <TouchableOpacity style={s.inputCard} onPress={() => setShowPayPicker(true)} activeOpacity={0.7}>
            <Text style={s.inputCardText}>{payMethod}</Text>
            <ChevronDown size={16} color={TEXT_LIGHT} strokeWidth={2} />
          </TouchableOpacity>
          <BottomPicker visible={showPayPicker} data={PAYMENT_METHODS} selected={payMethod} onSelect={setPayMethod} onClose={() => setShowPayPicker(false)} />

          {/* ── Recurring Expense Toggle ── */}
          <View style={s.recurringRow}>
            <View style={[s.recurringIconWrap, { backgroundColor: isRecurring ? BLUE : BLUE_SOFT }]}>
              <RefreshCw size={18} color={isRecurring ? WHITE : BLUE} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.recurringTitle}>Repeat Monthly</Text>
              <Text style={s.recurringSub}>{isRecurring ? '🔁 Fixed monthly expense' : 'One-time expense'}</Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: BORDER, true: BLUE_SOFT }}
              thumbColor={isRecurring ? BLUE : '#C8D0E0'}
              ios_backgroundColor={BORDER}
            />
          </View>

          <Text style={[s.sectionLabel, { marginTop: 16 }]}>Note (Optional)</Text>
          <View style={s.noteCard}>
            <TextInput style={s.noteInput} placeholder="Add a note..." placeholderTextColor={TEXT_LIGHT} value={note} onChangeText={setNote} multiline />
          </View>

          <TouchableOpacity style={s.receiptRow} activeOpacity={0.7} onPress={handlePickReceipt}>
            <View style={s.receiptIconWrap}>
              {receiptUri ? (<Image source={{ uri: receiptUri }} style={{ width: 38, height: 38, borderRadius: 10 }} />) : (<FileImage size={18} color={TEXT_MID} strokeWidth={1.8} />)}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.receiptTitle}>{receiptUri ? 'Receipt Attached' : 'Add Receipt'}</Text>
              <Text style={s.receiptSub}>{receiptUri ? 'Click to change image' : 'Optional · Upload an image'}</Text>
            </View>
            <ChevronRight size={16} color={TEXT_LIGHT} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity style={[s.saveBtn, (saving || !amount || Number(amount) <= 0) && s.saveBtnOff]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Expense'}</Text>
          </TouchableOpacity>
          <Text style={s.bottomInfoText}>All added expenses are securely recorded in your monthly ledger.</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal visible={showSuccess} amount={amount} category={category} onDone={() => { setShowSuccess(false); navigation.goBack(); }} />
      
      {/* ── BUDGET PROMPT MODAL ── */}
      <Modal visible={showBudgetPrompt} transparent animationType="slide" onRequestClose={() => setShowBudgetPrompt(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(13,27,62,0.6)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowBudgetPrompt(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableOpacity activeOpacity={1} style={{ backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 }}>
              <View style={{ width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: BLUE_SOFT, alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarDays size={22} color={BLUE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT_DARK }}>Set Monthly Budget First</Text>
                  <Text style={{ fontSize: 12, color: TEXT_MID, marginTop: 2 }}>Please set a budget for this month before logging expenses.</Text>
                </View>
              </View>

              <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 }}>Enter Monthly Budget (₹)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, height: 54, marginBottom: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT_DARK }}>₹</Text>
                <TextInput
                  style={{ flex: 1, fontSize: 16, fontWeight: '700', color: TEXT_DARK }}
                  placeholder="e.g. 5000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={budgetInput}
                  onChangeText={v => setBudgetInput(v.replace(/[^0-9]/g, ''))}
                  autoFocus
                />
              </View>

              <TouchableOpacity style={{ backgroundColor: BLUE, borderRadius: 20, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }} onPress={handleSaveBudgetAndExpense}>
                <Text style={{ color: WHITE, fontSize: 15, fontWeight: '800' }}>Save Budget & Log Expense</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      <LoaderOverlay visible={saving} label="Adding Expense…" />
    </SafeAreaView>
  );
}

const COLS = 4; const COL_GAP = 12;
const TILE = (width - 40 - 32 - COL_GAP * (COLS - 1)) / COLS;

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK, flex: 1, textAlign: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, flexGrow: 1 },
  amountContainer: { marginBottom: 12 },
  amountRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  rupee:       { fontSize: 36, fontWeight: '800', color: TEXT_DARK, marginRight: 8 },
  amountInput: { fontSize: 44, fontWeight: '800', color: TEXT_DARK, flex: 1, padding: 0, includeFontPadding: false },
  chipsRow:    { flexDirection: 'row', gap: 10, marginBottom: 44 },
  chip:        { paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  chipActive:  { borderColor: BLUE, backgroundColor: BLUE_SOFT },
  chipText:    { fontSize: 13, fontWeight: '700', color: TEXT_MID },
  chipTextActive: { color: BLUE, fontWeight: '800' },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: TEXT_DARK, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardSectionLabel: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4, marginTop: 4 },
  catCard: { backgroundColor: WHITE, borderRadius: 24, paddingVertical: 24, paddingHorizontal: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: COL_GAP },
  catItem: { alignItems: 'center', width: TILE },
  catIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 8 },
  catIconFill: { width: '100%', height: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  catCheckBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: WHITE },
  catLabel: { fontSize: 12, fontWeight: '600', color: TEXT_DARK, textAlign: 'center' },
  inputCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 14, height: 52 },
  inputCardText: { flex: 1, fontSize: 14, color: TEXT_DARK, fontWeight: '600' },
  recurringRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, marginTop: 16 },
  recurringIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recurringTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  recurringSub:   { fontSize: 11, color: TEXT_MID, fontWeight: '500' },
  noteCard: { backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderRadius: 13, padding: 14, minHeight: 90, marginTop: 8 },
  noteInput: { fontSize: 14, color: TEXT_DARK, fontWeight: '500', flex: 1, textAlignVertical: 'top' },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderRadius: 13, padding: 14, marginTop: 16 },
  receiptIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  receiptTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  receiptSub:   { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500', marginTop: 2 },
  saveBtn: { backgroundColor: BLUE, borderRadius: 24, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginTop: 32, shadowColor: BLUE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  saveBtnOff:  { backgroundColor: '#A0B4E8', shadowOpacity: 0 },
  saveBtnText: { color: WHITE, fontSize: 16, fontWeight: '800' },
  bottomInfoText: { fontSize: 12, color: TEXT_LIGHT, textAlign: 'center', marginTop: 16, fontWeight: '500' },
});

const p = StyleSheet.create({
  sheet: { backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 44, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  handle: { width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: TEXT_DARK, marginBottom: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  sheetRowActive: { backgroundColor: BLUE_SOFT, paddingHorizontal: 10, borderRadius: 10, borderBottomWidth: 0, marginBottom: 1 },
  sheetRowText: { fontSize: 15, color: TEXT_DARK, fontWeight: '600' },
  sheetRowTextActive: { color: BLUE, fontWeight: '700' },
});

const suc = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(13,27,62,0.6)', alignItems: 'center', justifyContent: 'center' },
  card:     { backgroundColor: WHITE, borderRadius: 28, padding: 36, width: width * 0.82, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  iconWrap: { marginBottom: 20 },
  title:    { fontSize: 22, fontWeight: '800', color: TEXT_DARK, marginBottom: 8 },
  subtitle: { fontSize: 14, color: TEXT_MID, fontWeight: '500', marginBottom: 32, textAlign: 'center' },
  btn:      { backgroundColor: SUCCESS, borderRadius: 16, paddingHorizontal: 48, paddingVertical: 14, shadowColor: SUCCESS, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText:  { color: WHITE, fontSize: 16, fontWeight: '800' },
});
