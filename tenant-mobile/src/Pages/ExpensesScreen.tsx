import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  Dimensions, Animated, StatusBar, TextInput, Modal,
  Share, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polyline, Line, G } from 'react-native-svg';
import {
  BarChart2, Plus, TrendingUp, TrendingDown,
  Utensils, Car, ShoppingBag, Receipt,
  Film, MoreHorizontal, ChevronDown, ChevronRight,
  Users, Search, X, Download, RefreshCw,
  Image as ImageIcon, Lightbulb, Wallet,
  CheckCircle2, XCircle, ArrowUpRight, FileText, ArrowRight,
  AlertTriangle, Edit3, Target, Edit2, SlidersHorizontal,
} from 'lucide-react-native';

import { FilterSheet } from '../components/UIComponents';

const { width } = Dimensions.get('window');

// ── Palette ───────────────────────────────────────────────────────────────────
const BLUE        = '#2245D4';
const BLUE_DARK   = '#1E3A8A';
const BLUE_SOFT   = '#EEF3FF';
const BLUE_BORDER = '#C5D3FF';
const WHITE       = '#FFFFFF';
const TEXT_DARK   = '#0D1B3E';
const TEXT_MID    = '#4A5568';
const TEXT_LIGHT  = '#9CA3AF';
const BG          = '#F4F7FE';
const BORDER      = '#E8EDF5';
const SUCCESS     = '#16A34A';
const SUCCESS_BG  = '#DCFCE7';
const WARN_COLOR  = '#D97706';
const WARN_BG     = '#FEF3C7';
const WARN_BORDER = '#FDE68A';
const DANGER      = '#EF4444';
const DANGER_BG   = '#FEE2E2';

const CATS: Record<string, { color: string; bg: string; Icon: any }> = {
  Food:          { color: '#EF5350', bg: '#FDEAEA', Icon: Utensils },
  Transport:     { color: BLUE,      bg: BLUE_SOFT,  Icon: Car },
  Shopping:      { color: '#43A047', bg: '#EAF5EA',  Icon: ShoppingBag },
  Bills:         { color: '#FB8C00', bg: '#FFF3E0',  Icon: Receipt },
  Entertainment: { color: '#8E24AA', bg: '#F4E5FA',  Icon: Film },
  Others:        { color: '#546E7A', bg: '#ECEFF1',  Icon: MoreHorizontal },
};

// ── Static data ───────────────────────────────────────────────────────────────
const BREAKDOWN = [
  { name: 'Food',      pct: 43, color: '#EF5350', bg: '#FDEAEA', amount: 1570, Icon: Utensils },
  { name: 'Transport', pct: 23, color: BLUE,      bg: BLUE_SOFT,  amount: 840,  Icon: Car },
  { name: 'Shopping',  pct: 17, color: '#43A047', bg: '#EAF5EA',  amount: 620,  Icon: ShoppingBag },
  { name: 'Others',    pct: 17, color: '#546E7A', bg: '#ECEFF1',  amount: 620,  Icon: MoreHorizontal },
];

const MONTH_TOTAL = 3650;

const ALL_RECENT = [
  { id: '1', title: 'Breakfast',    time: 'Today · 08:30 AM',    cat: 'Food',          amt: 120,  shared: false, recurring: false, hasReceipt: false },
  { id: '2', title: 'Auto Ride',    time: 'Today · 09:15 AM',    cat: 'Transport',     amt: 80,   shared: false, recurring: false, hasReceipt: false },
  { id: '3', title: 'Rent',         time: 'Today · 10:00 AM',    cat: 'Bills',         amt: 5000, shared: true,  recurring: true,  hasReceipt: true,  receiptUri: 'https://picsum.photos/400/600' },
  { id: '4', title: 'Groceries',    time: 'Today · 11:45 AM',    cat: 'Shopping',      amt: 150,  shared: true,  recurring: false, hasReceipt: true,  receiptUri: 'https://picsum.photos/400/601' },
  { id: '5', title: 'Mess Fee',     time: 'Yesterday · 04:20 PM',cat: 'Food',          amt: 2500, shared: false, recurring: true,  hasReceipt: false },
  { id: '6', title: 'Movie Ticket', time: 'Yesterday · 07:00 PM',cat: 'Entertainment', amt: 220,  shared: true,  recurring: false, hasReceipt: false },
  { id: '7', title: 'Laundry',      time: '18 Jun · 02:00 PM',   cat: 'Others',        amt: 100,  shared: false, recurring: true,  hasReceipt: false },
  { id: '8', title: 'Metro Pass',   time: '15 Jun · 08:00 AM',   cat: 'Transport',     amt: 500,  shared: false, recurring: true,  hasReceipt: true,  receiptUri: 'https://picsum.photos/400/602' },
  { id: '9', title: 'Dinner Pizza', time: '12 Jun · 09:30 PM',   cat: 'Food',          amt: 450,  shared: true,  recurring: false, hasReceipt: false },
  { id: '10',title: 'New Shoes',    time: '10 Jun · 04:15 PM',   cat: 'Shopping',      amt: 2100, shared: false, recurring: false, hasReceipt: true,  receiptUri: 'https://picsum.photos/400/603' },
  { id: '11',title: 'Phone Recharge',time:'05 Jun · 10:00 AM',   cat: 'Bills',         amt: 299,  shared: false, recurring: true,  hasReceipt: false },
];

const MONTHLY_DATA = [
  { month: 'Jan', amt: 2800 }, { month: 'Feb', amt: 3200 }, { month: 'Mar', amt: 2600 },
  { month: 'Apr', amt: 3800 }, { month: 'May', amt: 3100 }, { month: 'Jun', amt: 3650 },
];
const MAX_AMT = Math.max(...MONTHLY_DATA.map(m => m.amt));

// ── Donut ─────────────────────────────────────────────────────────────────────
const R = 46; const SW = 16; const SZ = (R + SW / 2 + 4) * 2; const CIRC = 2 * Math.PI * R;
function Donut({ activeCategory }: { activeCategory: string | null }) {
  let cum = CIRC / 4;
  const segs = BREAKDOWN.map(seg => {
    const full = (seg.pct / 100) * CIRC;
    const vis  = full - 4;
    const r = { ...seg, dl: vis, dg: CIRC - vis, off: cum, dimmed: activeCategory !== null && activeCategory !== seg.name };
    cum -= full; return r;
  });
  return (
    <View style={{ position: 'relative', width: SZ, height: SZ }}>
      <Svg width={SZ} height={SZ}>
        <Circle cx={SZ/2} cy={SZ/2} r={R} fill="none" stroke={BG} strokeWidth={SW} />
        {segs.map((s, i) => (
          <Circle key={i} cx={SZ/2} cy={SZ/2} r={R} fill="none"
            stroke={s.color} strokeWidth={SW}
            strokeDasharray={`${s.dl} ${s.dg}`}
            strokeDashoffset={s.off} strokeLinecap="butt"
            opacity={s.dimmed ? 0.15 : 1}
          />
        ))}
      </Svg>
    </View>
  );
}

// ── Set Budget Modal ──────────────────────────────────────────────────────────
function SetBudgetModal({ visible, currentBudget, onSave, onClose }: {
  visible: boolean; currentBudget: number;
  onSave: (val: number) => void; onClose: () => void;
}) {
  const [val, setVal] = useState(String(currentBudget));
  const quick = [2000, 3000, 5000, 8000, 10000];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity activeOpacity={1}>
              <View style={bm.sheet}>
                <View style={bm.handle} />
                <View style={bm.iconRow}>
                  <View style={bm.iconWrap}>
                    <Target size={24} color={BLUE} strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={bm.title}>Set Monthly Budget</Text>
                    <Text style={bm.sub}>How much do you plan to spend in Jun?</Text>
                  </View>
                </View>
                <View style={bm.inputWrap}>
                  <Text style={bm.rupee}>₹</Text>
                  <TextInput
                    style={bm.input}
                    value={val}
                    onChangeText={v => setVal(v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    placeholderTextColor={TEXT_LIGHT}
                    autoFocus
                    selectTextOnFocus
                  />
                </View>
                <Text style={bm.presetLabel}>Quick Select</Text>
                <View style={bm.presetRow}>
                  {quick.map(q => (
                    <TouchableOpacity
                      key={q}
                      style={[bm.preset, val === String(q) && bm.presetActive]}
                      onPress={() => setVal(String(q))} activeOpacity={0.7}
                    >
                      <Text style={[bm.presetText, val === String(q) && bm.presetTextActive]}>
                        ₹{(q / 1000).toFixed(0)}k
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[bm.saveBtn, (!val || Number(val) < 100) && bm.saveBtnOff]}
                  onPress={() => { if (val && Number(val) >= 100) { onSave(Number(val)); onClose(); } }}
                  activeOpacity={0.85}
                >
                  <Text style={bm.saveBtnText}>Save Budget</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={{ alignSelf: 'center', marginTop: 12, padding: 8 }}>
                  <Text style={{ color: TEXT_LIGHT, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Set Goal Modal ────────────────────────────────────────────────────────────
function SetGoalModal({ visible, currentName, currentTarget, onSave, onClose }: {
  visible: boolean; currentName: string; currentTarget: number;
  onSave: (name: string, target: number) => void; onClose: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [target, setTarget] = useState(String(currentTarget));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity activeOpacity={1}>
              <View style={bm.sheet}>
                <View style={bm.handle} />
                <View style={bm.iconRow}>
                  <View style={[bm.iconWrap, { backgroundColor: '#DCFCE7' }]}>
                    <Target size={24} color="#16A34A" strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={bm.title}>Set Savings Goal</Text>
                    <Text style={bm.sub}>What are you saving up for?</Text>
                  </View>
                </View>
                <View style={[bm.inputWrap, { marginBottom: 12 }]}>
                  <TextInput
                    style={[bm.input, { textAlign: 'left', paddingLeft: 16, fontSize: 20 }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. New Mobile"
                    placeholderTextColor="#CBD5E1"
                  />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {[
                    { label: '📱 Gadget' },
                    { label: '✈️ Travel' },
                    { label: '👟 Fashion' },
                    { label: '📚 Education' },
                    { label: '💰 Emergency' }
                  ].map(p => (
                    <TouchableOpacity 
                      key={p.label} 
                      style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: name === p.label ? '#DCFCE7' : '#F1F5F9', borderRadius: 12, borderWidth: 1, borderColor: name === p.label ? '#22C55E' : 'transparent' }}
                      onPress={() => setName(p.label)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: name === p.label ? '#16A34A' : TEXT_MID }}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={bm.inputWrap}>
                  <Text style={bm.rupee}>₹</Text>
                  <TextInput
                    style={bm.input}
                    value={target}
                    onChangeText={v => setTarget(v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    placeholder="15000"
                    placeholderTextColor="#CBD5E1"
                  />
                </View>
                <View style={{ marginTop: 24, paddingBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={[bm.saveBtn, { backgroundColor: '#F1F5F9', flex: 1 }]} onPress={onClose} activeOpacity={0.85}>
                      <Text style={[bm.saveBtnText, { color: TEXT_DARK }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[bm.saveBtn, { flex: 1, backgroundColor: '#16A34A' }]} onPress={() => onSave(name || 'My Goal', Number(target) || 1000)} activeOpacity={0.85}>
                      <Text style={bm.saveBtnText}>Save Goal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Add Savings Modal ─────────────────────────────────────────────────────────
function AddSavingsModal({ visible, currentSaved, onSave, onClose }: {
  visible: boolean; currentSaved: number; onSave: (added: number) => void; onClose: () => void;
}) {
  const [val, setVal] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity activeOpacity={1}>
              <View style={bm.sheet}>
                <View style={bm.handle} />
                <View style={bm.iconRow}>
                  <View style={[bm.iconWrap, { backgroundColor: '#DCFCE7' }]}>
                    <Plus size={24} color="#16A34A" strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text style={bm.title}>Add to Savings</Text>
                    <Text style={bm.sub}>Deposit money into your goal!</Text>
                  </View>
                </View>
                <View style={bm.inputWrap}>
                  <Text style={bm.rupee}>₹</Text>
                  <TextInput
                    style={bm.input}
                    value={val}
                    onChangeText={v => setVal(v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    placeholder="e.g. 500"
                    placeholderTextColor="#CBD5E1"
                    autoFocus
                  />
                </View>
                <View style={{ marginTop: 24, paddingBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={[bm.saveBtn, { backgroundColor: '#F1F5F9', flex: 1 }]} onPress={onClose} activeOpacity={0.85}>
                      <Text style={[bm.saveBtnText, { color: TEXT_DARK }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[bm.saveBtn, { flex: 1, backgroundColor: '#16A34A' }, (!val || Number(val) <= 0) && { backgroundColor: '#86EFAC', shadowOpacity: 0 }]} 
                      onPress={() => { if (val && Number(val) > 0) { onSave(Number(val)); setVal(''); } }} 
                      activeOpacity={0.85}
                    >
                      <Text style={bm.saveBtnText}>Add Funds</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Settle Up Modal ───────────────────────────────────────────────────────────
function SettleUpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [done, setDone] = useState<'paid' | 'received' | null>(null);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { setDone(null); onClose(); }}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { setDone(null); onClose(); }} activeOpacity={1}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1}>
            <View style={sm.sheet}>
              <View style={sm.handle} />
              {!done ? (
                <>
                  <Text style={sm.title}>Settle Up</Text>
                  <Text style={sm.sub}>Confirm payment with your roommates</Text>
                  <View style={sm.amtRow}>
                    <View style={[sm.amtBox, { backgroundColor: DANGER_BG }]}>
                      <Text style={sm.amtLabel}>You Owe</Text>
                      <Text style={[sm.amtVal, { color: DANGER }]}>₹ 350</Text>
                    </View>
                    <View style={[sm.amtBox, { backgroundColor: SUCCESS_BG }]}>
                      <Text style={sm.amtLabel}>Owed to You</Text>
                      <Text style={[sm.amtVal, { color: SUCCESS }]}>₹ 120</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[sm.btn, { backgroundColor: BLUE }]} onPress={() => setDone('paid')} activeOpacity={0.85}>
                    <ArrowUpRight size={18} color={WHITE} strokeWidth={2.5} />
                    <Text style={sm.btnTxt}>Mark ₹350 as Paid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[sm.btn, { backgroundColor: WHITE, borderWidth: 1.5, borderColor: BLUE_BORDER }]} onPress={() => setDone('received')} activeOpacity={0.85}>
                    <CheckCircle2 size={18} color={BLUE} strokeWidth={2.5} />
                    <Text style={[sm.btnTxt, { color: BLUE }]}>Confirm ₹120 Received</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <View style={sm.doneCircle}><CheckCircle2 size={36} color={SUCCESS} strokeWidth={1.5} /></View>
                  <Text style={sm.doneTitle}>{done === 'paid' ? 'Payment Sent! 🎉' : 'Receipt Confirmed!'}</Text>
                  <Text style={sm.doneSub}>{done === 'paid' ? 'Your roommates have been notified.' : 'Your balance has been updated.'}</Text>
                  <TouchableOpacity style={[sm.btn, { backgroundColor: SUCCESS, marginTop: 8 }]} onPress={() => { setDone(null); onClose(); }}>
                    <Text style={sm.btnTxt}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Receipt Viewer Modal ──────────────────────────────────────────────────────
function ReceiptModal({ uri, onClose }: { uri: string; onClose: () => void }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}>
        <TouchableOpacity style={{ position: 'absolute', top: 60, right: 20, zIndex: 10 }} onPress={onClose}>
          <XCircle size={32} color={WHITE} strokeWidth={1.5} />
        </TouchableOpacity>
        <Image source={{ uri }} style={{ width: width - 32, height: width - 32, borderRadius: 20 }} resizeMode="contain" />
      </View>
    </Modal>
  );
}

// ── Export Modal ──────────────────────────────────────────────────────────────
function ExportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1}>
            <View style={sm.sheet}>
              <View style={sm.handle} />
              <Text style={sm.title}>Export Jun 2025</Text>
              <Text style={sm.sub}>Share your monthly expense summary</Text>
              <TouchableOpacity style={[sm.btn, { backgroundColor: BLUE }]}
                onPress={async () => { await Share.share({ message: 'Stayvix Expense Report – Jun 2025\nFood: ₹1,570 | Transport: ₹840 | Shopping: ₹620 | Others: ₹620\nTotal: ₹3,650' }); onClose(); }} activeOpacity={0.85}>
                <FileText size={18} color={WHITE} strokeWidth={2.5} />
                <Text style={sm.btnTxt}>Share as Text / PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[sm.btn, { backgroundColor: '#16A34A' }]}
                onPress={async () => { await Share.share({ message: 'Date,Category,Amount\n2025-06-14,Food,120\n2025-06-14,Transport,80\n2025-06-14,Bills,5000' }); onClose(); }} activeOpacity={0.85}>
                <Download size={18} color={WHITE} strokeWidth={2.5} />
                <Text style={sm.btnTxt}>Export as CSV</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────
type TabKey = 'Overview' | 'Categories' | 'Analytics';

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function ExpensesScreen({ navigation }: any) {
  const [tab, setTab]                       = useState<TabKey>('Overview');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [budget, setBudget]                 = useState(5000);
  const [showBudget, setShowBudget]         = useState(false);
  const [showGoal, setShowGoal]             = useState(false);
  const [showSettle, setShowSettle]         = useState(false);
  const [showExport, setShowExport]         = useState(false);
  const [receiptUri, setReceiptUri]         = useState<string | null>(null);
  
  // Savings Goal State
  const [goalName, setGoalName]             = useState('New Sneakers');
  const [goalTarget, setGoalTarget]         = useState(3000);
  const [goalSaved, setGoalSaved]           = useState(1950);
  const [showAddSavings, setShowAddSavings] = useState(false);
  const goalProgress = Math.min(100, Math.round((goalSaved / goalTarget) * 100));
  const tabAnim                             = useRef(new Animated.Value(0)).current;
  const tabKeys: TabKey[]                   = ['Overview', 'Categories', 'Analytics'];

  const handleTab = (t: TabKey) => {
    Animated.spring(tabAnim, { toValue: tabKeys.indexOf(t), useNativeDriver: false, friction: 8 }).start();
    setTab(t);
  };

  const tabW = (width - 32 - 12) / 3;
  const indicatorLeft = tabAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [6, 6 + tabW, 6 + tabW * 2] });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      <View style={{ backgroundColor: BLUE, paddingBottom: 16 }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: WHITE }}>My Expenses</Text>
              <TouchableOpacity activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Jun 2025</Text>
                <ChevronDown size={14} color="rgba(255,255,255,0.8)" strokeWidth={3} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' }} onPress={() => setShowBudget(true)} activeOpacity={0.7}>
                <ChevronDown size={14} color={WHITE} strokeWidth={2.5} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: WHITE }}>Jun</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowExport(true)} activeOpacity={0.7}>
                <Download size={18} color={WHITE} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <View style={s.tabsOuter}>
        <View style={s.tabsTrack}>
          <Animated.View style={[s.tabIndicator, { left: indicatorLeft, width: tabW }]} />
          {tabKeys.map(t => (
            <TouchableOpacity key={t} style={[s.tabBtn, { width: tabW }]} onPress={() => handleTab(t)} activeOpacity={0.7}>
              <Text style={[s.tabText, tab === t && s.tabActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {tab === 'Overview' && (
          <OverviewTab
            navigation={navigation}
            activeCategory={activeCategory}
            onToggleCategory={(name: string) => setActiveCategory(p => p === name ? null : name)}
            onSettleUp={() => setShowSettle(true)}
            onReceiptOpen={setReceiptUri}
            budget={budget}
            onEditBudget={() => setShowBudget(true)}
            goalName={goalName}
            goalTarget={goalTarget}
            goalProgress={goalProgress}
            goalSaved={goalSaved}
            onEditGoal={() => setShowGoal(true)}
            onAddSavings={() => setShowAddSavings(true)}
          />
        )}
        {tab === 'Categories' && <CategoriesTab navigation={navigation} />}
        {tab === 'Analytics'  && <AnalyticsTab />}
      </ScrollView>

      {tab !== 'Analytics' && (
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('AddExpense')} activeOpacity={0.85}>
          <Plus size={26} color={WHITE} strokeWidth={3} />
        </TouchableOpacity>
      )}

      <SetBudgetModal visible={showBudget} currentBudget={budget} onSave={(val) => { setBudget(val); setShowBudget(false); }} onClose={() => setShowBudget(false)} />
      <SetGoalModal visible={showGoal} currentName={goalName} currentTarget={goalTarget} onSave={(name, target) => { setGoalName(name); setGoalTarget(target); setShowGoal(false); }} onClose={() => setShowGoal(false)} />
      <AddSavingsModal visible={showAddSavings} currentSaved={goalSaved} onSave={(val) => { setGoalSaved(goalSaved + val); setShowAddSavings(false); }} onClose={() => setShowAddSavings(false)} />
      <SettleUpModal  visible={showSettle} onClose={() => setShowSettle(false)} />
      <ExportModal    visible={showExport} onClose={() => setShowExport(false)} />
      {receiptUri && <ReceiptModal uri={receiptUri} onClose={() => setReceiptUri(null)} />}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ 
  navigation, activeCategory, onToggleCategory, onSettleUp, onReceiptOpen, budget, onEditBudget,
  goalName, goalTarget, goalProgress, goalSaved, onEditGoal, onAddSavings
}: any) {
  const [searchQ, setSearchQ]         = useState('');
  const [showSearch, setShowSearch]   = useState(false);
  const [showFilter, setShowFilter]   = useState(false);
  const [catFilter, setCatFilter]     = useState<string | null>(null);

  const budgetPct  = Math.round((MONTH_TOTAL / budget) * 100);
  const isWarn     = budgetPct >= 80;
  const barColor   = budgetPct >= 100 ? DANGER : isWarn ? WARN_COLOR : BLUE;

  const filtered = useMemo(() => {
    let r = ALL_RECENT;
    if (activeCategory) r = r.filter(x => x.cat === activeCategory);
    if (catFilter)      r = r.filter(x => x.cat === catFilter);
    if (searchQ.trim()) { const q = searchQ.toLowerCase(); r = r.filter(x => x.title.toLowerCase().includes(q) || x.cat.toLowerCase().includes(q)); }
    return r;
  }, [activeCategory, catFilter, searchQ]);

  return (
    <>
      {/* ── 1. Total Spent Donut Chart ── */}
      <View style={[s.overviewCard, { flexDirection: 'column', alignItems: 'center', position: 'relative' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 }}>
          <Text style={s.overviewLabel}>Total Spent (Jun)</Text>
          <TouchableOpacity onPress={onEditBudget} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E0E7FF' }}>
            <Edit3 size={14} color="#2245D4" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#2245D4' }}>Edit Budget</Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ width: 130, height: 130, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <Svg width="130" height="130" viewBox="0 0 100 100">
            {/* Background circle */}
            <Circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="10" fill="transparent" />
            {/* Progress circle */}
            <Circle 
              cx="50" cy="50" r="40" 
              stroke="#2245D4" strokeWidth="10" 
              fill="transparent" 
              strokeDasharray={`${Math.min(budgetPct, 100) * 2.51} 251.2`}
              strokeDashoffset="0"
              strokeLinecap="round"
              rotation="-90"
              origin="50, 50"
            />
          </Svg>
          {/* Inner Text */}
          <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT_DARK }}>₹{MONTH_TOTAL}</Text>
            <Text style={{ fontSize: 10, color: TEXT_MID, marginTop: 2 }}>of ₹{budget}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, alignSelf: 'stretch' }}>
          <View style={[s.trendRow, { flex: 1, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F8FAFD', borderRadius: 16 }]}>
            <TrendingUp size={14} color="#E11D48" strokeWidth={2.5} />
            <Text style={[s.heroTrendTxt, { color: '#E11D48', marginLeft: 6 }]}>12% vs last month</Text>
          </View>
          
          <View style={[s.trendRow, { flex: 1, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ECFDF5', borderRadius: 16, justifyContent: 'center' }]}>
            <Text style={[s.heroTrendTxt, { color: '#059669', fontWeight: '700' }]}>
              ₹{Math.round(Math.max(budget - MONTH_TOTAL, 0) / (30 - new Date().getDate() + 1))} safe to spend today
            </Text>
          </View>
        </View>
      </View>

      {/* ── 2. Top Spending Category ── */}
      <View style={[s.card, { backgroundColor: '#FFF0F2', borderColor: '#FFE4E6', padding: 14 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ backgroundColor: '#EF5350', padding: 6, borderRadius: 10, shadowColor: '#EF5350', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 }}>
              <Utensils size={14} color={WHITE} strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF5350', textTransform: 'uppercase', letterSpacing: 0.5 }}>Highest Spend</Text>
          </View>
          <View style={{ backgroundColor: '#FFE4E6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#E11D48' }}>43% of Total</Text>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT_DARK, marginBottom: 1 }}>Food</Text>
            <Text style={{ fontSize: 11, color: TEXT_MID }}>Most frequent expense</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#E11D48', letterSpacing: -0.5 }}>₹1,570</Text>
        </View>
      </View>

      {/* ── 2.5 Savings Goal ── */}
      <TouchableOpacity 
        style={[s.card, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', padding: 16 }]}
        activeOpacity={0.8}
        onPress={onEditGoal}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ backgroundColor: '#22C55E', padding: 6, borderRadius: 10 }}>
              <Target size={14} color={WHITE} strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.5 }}>Savings Goal</Text>
          </View>
          <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>{goalName}</Text>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT_DARK, marginBottom: 2 }}>You're {goalProgress}% there!</Text>
            <Text style={{ fontSize: 12, color: '#16A34A' }}>Saved ₹{goalSaved} out of ₹{goalTarget}.</Text>
          </View>
        </View>

        <View style={{ height: 8, backgroundColor: '#DCFCE7', borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${goalProgress}%`, backgroundColor: '#22C55E', borderRadius: 4 }} />
        </View>
      </TouchableOpacity>

      {/* ── 3. Insight Card ── */}
      <TouchableOpacity 
        style={s.insightCard} 
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CategoryDetail', { categoryName: 'Food', spent: 1570, totalPct: 43, color: '#EF5350', bg: '#FDEAEA' })}
      >
        <View style={s.insightIcon}>
          <Lightbulb size={18} color={WARN_COLOR} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.insightLabel}>JUN INSIGHT</Text>
          <Text style={s.insightTitle}>🔥 Highest spend: 13 Jun, ₹460</Text>
          <Text style={s.insightSub}>Top category · Food at 43% of total</Text>
        </View>
        <ChevronRight size={16} color={WARN_COLOR} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* ── 4. Bill Split Card ── */}
      <View style={s.card}>
        <View style={s.splitTop}>
          <View style={s.splitIconWrap}><Users size={18} color={WHITE} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Bill Split</Text>
            <Text style={s.cardSub}>Shared with 2 roommates</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.settleBtn} onPress={onSettleUp} activeOpacity={0.7}>
              <ArrowUpRight size={13} color={WHITE} strokeWidth={2.5} />
              <Text style={s.settleTxt}>Settle Up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.viewBtn} onPress={() => navigation.navigate('Splits')} activeOpacity={0.7}>
              <Text style={s.viewTxt}>View</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.splitAmtRow}>
          <View style={s.splitAmtBox}>
            <Text style={s.splitAmtLabel}>You Owe</Text>
            <Text style={[s.splitAmtVal, { color: DANGER }]}>₹ 350</Text>
          </View>
          <View style={s.splitAmtDivider} />
          <View style={s.splitAmtBox}>
            <Text style={s.splitAmtLabel}>Owed to You</Text>
            <Text style={[s.splitAmtVal, { color: SUCCESS }]}>₹ 120</Text>
          </View>
        </View>
      </View>

      {/* ── 5. Recent Transactions ── */}
      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>Recent</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity style={s.iconPill} onPress={() => setShowSearch(v => !v)} activeOpacity={0.7}>
            {showSearch ? <X size={14} color={BLUE} strokeWidth={3} /> : <Search size={14} color={BLUE} strokeWidth={2} />}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconPill} onPress={() => setShowFilter(true)} activeOpacity={0.7}>
            <SlidersHorizontal size={14} color={BLUE} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AllExpenses')} activeOpacity={0.7}>
            <Text style={s.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search input */}
      {showSearch && (
        <View style={s.searchBox}>
          <Search size={15} color={TEXT_LIGHT} strokeWidth={2} />
          <TextInput
            style={s.searchInput} value={searchQ} onChangeText={setSearchQ}
            placeholder="Search transactions…" placeholderTextColor={TEXT_LIGHT} autoFocus
          />
          {searchQ.length > 0 && <TouchableOpacity onPress={() => setSearchQ('')}><X size={14} color={TEXT_LIGHT} strokeWidth={3} /></TouchableOpacity>}
        </View>
      )}

      {/* Category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow} style={{ marginBottom: 12 }}>
        <TouchableOpacity style={[s.chip, !catFilter && s.chipActive]} onPress={() => setCatFilter(null)} activeOpacity={0.7}>
          <Text style={[s.chipTxt, !catFilter && s.chipTxtActive]}>All</Text>
        </TouchableOpacity>
        {Object.entries(CATS).map(([name, meta]) => {
          const act = catFilter === name;
          const Icon = meta.Icon;
          return (
            <TouchableOpacity key={name} style={[s.chip, act && { backgroundColor: meta.bg, borderColor: meta.color }]} onPress={() => setCatFilter(act ? null : name)} activeOpacity={0.7}>
              <Icon size={11} color={act ? meta.color : TEXT_LIGHT} strokeWidth={2} />
              <Text style={[s.chipTxt, act && { color: meta.color, fontWeight: '700' }]}>{name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Transaction list */}
      {filtered.length > 0 ? (
        <View style={s.txnCard}>
          {filtered.slice(0, 5).map((item: any, i: number) => {
            const meta = CATS[item.cat] || CATS.Others;
            const Icon = meta.Icon;
            return (
              <View key={item.id} style={[s.txnRow, i < filtered.length - 1 && s.txnDivider]}>
                <View style={[s.txnIcon, { backgroundColor: meta.bg }]}>
                  <Icon size={18} color={meta.color} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
                    <Text style={s.txnTitle}>{item.title}</Text>
                    {item.shared    && <View style={s.sharedBadge}><Users size={9} color={BLUE} strokeWidth={2.5} /><Text style={s.sharedTxt}>Shared</Text></View>}
                    {item.recurring && <View style={s.recurBadge}><RefreshCw size={9} color={SUCCESS} strokeWidth={2.5} /><Text style={s.recurTxt}>Monthly</Text></View>}
                  </View>
                  <Text style={s.txnTime}>{item.time}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.txnAmt}>₹ {item.amt.toLocaleString('en-IN')}</Text>
                  {item.hasReceipt && (
                    <TouchableOpacity style={s.receiptTag} onPress={() => item.receiptUri && onReceiptOpen(item.receiptUri)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <ImageIcon size={11} color={BLUE} strokeWidth={2} />
                      <Text style={s.receiptTxt}>Receipt</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={s.empty}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🔍</Text>
          <Text style={s.emptyTxt}>No matching transactions</Text>
        </View>
      )}

      {/* ── Completed Goals History ── */}
      <View style={{ marginTop: 24, marginBottom: 16 }}>
        <Text style={[s.sectionTitle, { paddingHorizontal: 0, marginBottom: 12 }]}>🏆 Past Achievements</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 24 }}>
          {[
            { id: 1, name: 'New Laptop', amt: '45,000', date: 'May 2025' },
            { id: 2, name: 'Goa Trip', amt: '12,000', date: 'Mar 2025' },
            { id: 3, name: 'Nike Shoes', amt: '6,500', date: 'Jan 2025' },
            { id: 4, name: 'Smartwatch', amt: '3,000', date: 'Nov 2024' },
            { id: 5, name: 'Headphones', amt: '2,500', date: 'Sep 2024' },
            { id: 6, name: 'Gym Specs', amt: '1,200', date: 'Aug 2024' },
            { id: 7, name: 'Concert Tix', amt: '4,000', date: 'Jul 2024' },
            { id: 8, name: 'New Bag', amt: '1,500', date: 'Jun 2024' },
            { id: 9, name: 'Jacket', amt: '2,000', date: 'Mar 2024' },
            { id: 10, name: 'PS5 Game', amt: '3,500', date: 'Jan 2024' },
          ].map((goal, index) => (
            <View key={goal.id} style={[s.card, { width: 140, padding: 12, backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <View style={{ backgroundColor: '#10B981', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={14} color={WHITE} strokeWidth={3} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: TEXT_LIGHT }}>#{10 - index}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 }} numberOfLines={1}>{goal.name}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981', marginBottom: 6 }}>₹{goal.amt}</Text>
              <Text style={{ fontSize: 10, color: TEXT_LIGHT }}>{goal.date}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
      <FilterSheet visible={showFilter} onClose={() => setShowFilter(false)} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ══════════════════════════════════════════════════════════════════════════════
function DonutChart() {
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  let startAngle = 0;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: size, marginVertical: 24 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size/2}, ${size/2}`}>
          {BREAKDOWN.map((cat, i) => {
            const strokeDashoffset = circumference - (cat.pct / 100) * circumference;
            const angle = (cat.pct / 100) * 360;
            const currentRotation = startAngle;
            startAngle += angle;

            return (
              <Circle
                key={cat.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={cat.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                rotation={currentRotation}
                origin={`${size/2}, ${size/2}`}
                strokeLinecap={cat.pct > 0 ? "round" : "butt"}
              />
            );
          })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: TEXT_LIGHT, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>Total</Text>
        <Text style={{ fontSize: 24, fontWeight: '800', color: TEXT_DARK, marginTop: 2 }}>₹3,650</Text>
      </View>
    </View>
  );
}

function CategoriesTab({ navigation }: any) {
  const MAX = Math.max(...BREAKDOWN.map(c => c.amount));
  return (
    <>
      <View style={s.statRow}>
        <View style={s.statCell}><Text style={s.statVal}>₹3,650</Text><Text style={s.statLbl}>Total</Text></View>
        <View style={s.statLine} />
        <View style={s.statCell}><Text style={s.statVal}>{BREAKDOWN.length}</Text><Text style={s.statLbl}>Categories</Text></View>
        <View style={s.statLine} />
        <View style={s.statCell}><Text style={[s.statVal, { color: '#EF5350' }]}>Food</Text><Text style={s.statLbl}>Top Spend</Text></View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Spending Breakdown</Text>
        <DonutChart />
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8, marginBottom: 12 }}>
          {BREAKDOWN.map(cat => (
            <View key={cat.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }} />
              <Text style={{ fontSize: 11, color: TEXT_MID, fontWeight: '600' }}>{cat.name}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[s.card, { backgroundColor: WARN_BG, borderColor: WARN_BORDER, marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Lightbulb size={16} color={WARN_COLOR} strokeWidth={2.5} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: WARN_COLOR }}>Smart Insight</Text>
        </View>
        <Text style={{ fontSize: 12, color: TEXT_DARK, lineHeight: 18, fontWeight: '500' }}>
          You spent <Text style={{ fontWeight: '800' }}>43%</Text> of your budget on <Text style={{ fontWeight: '800' }}>Food</Text> this month. Try cooking at the hostel twice a week to save up to ₹800!
        </Text>
      </View>

      <View style={s.txnCard}>
        {BREAKDOWN.map((cat, i) => {
          const meta = CATS[cat.name] || CATS.Others;
          const Icon = meta.Icon;
          return (
            <TouchableOpacity key={cat.name} style={[s.txnRow, i < BREAKDOWN.length - 1 && s.txnDivider]}
              onPress={() => navigation.navigate('CategoryDetail', { categoryName: cat.name, spent: cat.amount, totalPct: cat.pct, color: cat.color, bg: cat.bg })}
              activeOpacity={0.7}
            >
              <View style={[s.txnIcon, { backgroundColor: cat.bg }]}><Icon size={18} color={cat.color} strokeWidth={2} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.txnTitle}>{cat.name}</Text>
                <View style={[s.catDetailBar]}><View style={[s.catDetailFill, { width: `${cat.pct}%` as any, backgroundColor: cat.color }]} /></View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.txnAmt}>₹{cat.amount.toLocaleString('en-IN')}</Text>
                <Text style={[{ fontSize: 11, fontWeight: '700', color: cat.color }]}>{cat.pct}%</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ══════════════════════════════════════════════════════════════════════════════
function TrendLine() {
  const max = Math.max(...MONTHLY_DATA.map(d => d.amt));
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingTop: 20 }}>
      {MONTHLY_DATA.map((d, i) => {
        const h = Math.max(12, (d.amt / max) * 110);
        const isCurrent = i === MONTHLY_DATA.length - 1;
        return (
          <View key={i} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: isCurrent ? BLUE : TEXT_LIGHT, fontWeight: '700', marginBottom: 6 }}>
              {(d.amt / 1000).toFixed(1)}k
            </Text>
            <View style={{ width: 26, height: h, backgroundColor: isCurrent ? BLUE : BLUE_SOFT, borderRadius: 6 }} />
            <Text style={{ marginTop: 8, fontSize: 10, fontWeight: isCurrent ? '800' : '600', color: isCurrent ? BLUE : TEXT_MID }}>
              {d.month}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function WeeklyChart() {
  const weekData = [
    { d: 'Mon', amt: 210 }, { d: 'Tue', amt: 85 }, { d: 'Wed', amt: 320 },
    { d: 'Thu', amt: 150 }, { d: 'Fri', amt: 95 }, { d: 'Sat', amt: 270 }, { d: 'Sun', amt: 350 }
  ];
  const max = Math.max(...weekData.map(d => d.amt));
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, paddingTop: 10 }}>
      {weekData.map((d, i) => {
        const h = Math.max(12, (d.amt / max) * 100);
        const isToday = d.d === 'Wed'; 
        return (
          <View key={i} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: isToday ? BLUE : TEXT_LIGHT, fontWeight: '700', marginBottom: 6 }}>{d.amt}</Text>
            <View style={{ width: 28, height: h, backgroundColor: isToday ? BLUE : BLUE_SOFT, borderRadius: 8 }} />
            <Text style={{ marginTop: 8, fontSize: 11, fontWeight: isToday ? '800' : '600', color: isToday ? BLUE : TEXT_MID }}>{d.d}</Text>
          </View>
        );
      })}
    </View>
  );
}

function AnalyticsTab() {
  const mom = ((MONTHLY_DATA[5].amt - MONTHLY_DATA[4].amt) / MONTHLY_DATA[4].amt * 100).toFixed(1);
  const isUp = parseFloat(mom) > 0;

  return (
    <>
      <View style={s.statRow}>
        <View style={s.statCell}><Text style={s.statVal}>₹118</Text><Text style={s.statLbl}>Daily Avg</Text></View>
        <View style={s.statLine} />
        <View style={s.statCell}><Text style={s.statVal}>₹22.1k</Text><Text style={s.statLbl}>6-Mo Total</Text></View>
        <View style={s.statLine} />
        <View style={s.statCell}><Text style={[s.statVal, { color: isUp ? DANGER : SUCCESS }]}>{isUp ? '↑' : '↓'} {Math.abs(parseFloat(mom))}%</Text><Text style={s.statLbl}>Trend</Text></View>
      </View>

      <Text style={[s.sectionTitle, { marginBottom: 10 }]}>6-Month Trend</Text>
      <View style={[s.card, { marginBottom: 16 }]}>
        <TrendLine />
      </View>

      <Text style={[s.sectionTitle, { marginBottom: 10 }]}>This Week's Activity</Text>
      <View style={[s.card, { marginBottom: 16 }]}>
        <WeeklyChart />
      </View>

      <Text style={[s.sectionTitle, { marginBottom: 10 }]}>Where your money goes</Text>
      <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
        {[
          { title: 'Food & Dining', sub: 'Most frequent spending', amt: 1570, color: '#EF5350' },
          { title: 'Transportation', sub: 'Metro & Autos', amt: 840, color: BLUE },
          { title: 'Utilities & Bills', sub: 'Fixed monthly costs', amt: 620, color: '#43A047' },
        ].map((item, i, arr) => (
          <View key={i} style={[s.txnRow, i < arr.length - 1 && s.txnDivider, { padding: 16 }]}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT_DARK }}>{item.title}</Text>
              <Text style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 2 }}>{item.sub}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT_DARK }}>₹{item.amt}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 16, paddingBottom: 140, paddingTop: 4 },

  // Header
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, backgroundColor: WHITE },
  headerTitle:{ fontSize: 22, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.5 },
  headerSub:  { fontSize: 13, color: TEXT_LIGHT, fontWeight: '500', marginTop: 1 },
  hBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: BLUE_SOFT, borderWidth: 1, borderColor: BLUE_BORDER },
  hBtnText:   { fontSize: 13, fontWeight: '700', color: BLUE },
  hIcon:      { width: 36, height: 36, borderRadius: 10, backgroundColor: BLUE_SOFT, alignItems: 'center', justifyContent: 'center' },

  // Tabs
  tabsOuter:    { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: WHITE },
  tabsTrack:    { flexDirection: 'row', backgroundColor: BG, borderRadius: 14, padding: 5, position: 'relative', height: 42 },
  tabIndicator: { position: 'absolute', top: 5, bottom: 5, backgroundColor: WHITE, borderRadius: 10, shadowColor: BLUE, shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabBtn:       { alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tabText:      { fontSize: 13, fontWeight: '600', color: TEXT_LIGHT },
  tabActive:    { color: BLUE, fontWeight: '800' },

  // Hero card (donut)
  heroCard: {
    backgroundColor: BLUE, borderRadius: 24, padding: 20, marginBottom: 12,
    shadowColor: BLUE_DARK, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  heroTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  heroLabel:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginBottom: 6 },
  heroAmt:     { fontSize: 36, fontWeight: '900', color: WHITE, letterSpacing: -1.5, marginBottom: 6 },
  trendRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroTrendTxt:{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 14 },
  legendGrid:  { gap: 8 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, paddingHorizontal: 4 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendName:  { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginBottom: 1 },
  legendAmt:   { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  legendPct:   { fontSize: 13, fontWeight: '800', color: WHITE },
  clearFilter: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', marginTop: 12, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },
  clearFilterTxt:{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },

  // Donut
  donutCenter: { position: 'absolute', top: 0, left: 0, width: SZ, height: SZ, alignItems: 'center', justifyContent: 'center' },
  donutAmt:    { fontSize: 13, fontWeight: '800', color: WHITE, letterSpacing: -0.3 },
  donutLbl:    { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 1 },

  // Generic card
  card: { backgroundColor: WHITE, borderRadius: 20, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  cardSub:   { fontSize: 12, color: TEXT_LIGHT, fontWeight: '500' },

  // Budget
  budgetTopRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  budgetIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  editBudgetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: BLUE_SOFT, borderRadius: 10 },
  editBudgetTxt: { fontSize: 12, color: BLUE, fontWeight: '700' },
  progressTrack: { height: 10, backgroundColor: BG, borderRadius: 6, overflow: 'visible', position: 'relative', marginBottom: 10 },
  progressFill:  { height: '100%' as any, borderRadius: 6, position: 'absolute', left: 0, top: 0 },
  progressMarker:{ position: 'absolute', top: -3, width: 2, height: 16, backgroundColor: WARN_COLOR, borderRadius: 1 },
  budgetFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  budgetBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  budgetBadgeTxt:{ fontSize: 12, fontWeight: '700' },
  budgetRemain:  { fontSize: 12, color: TEXT_MID, fontWeight: '600' },
  warnRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: WARN_BG, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10, borderWidth: 1, borderColor: WARN_BORDER },
  warnTxt:       { fontSize: 12, color: WARN_COLOR, fontWeight: '600', flex: 1 },

  // Insight
  insightCard:  { backgroundColor: WARN_BG, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, borderWidth: 1, borderColor: WARN_BORDER },
  insightIcon:  { width: 38, height: 38, borderRadius: 12, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  insightLabel: { fontSize: 10, fontWeight: '800', color: WARN_COLOR, letterSpacing: 0.8, marginBottom: 2 },
  insightTitle: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  insightSub:   { fontSize: 11, color: TEXT_MID, fontWeight: '500' },

  // Bill Split
  splitTop:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  splitIconWrap:{ width: 40, height: 40, borderRadius: 12, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  settleBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: BLUE, borderRadius: 10 },
  settleTxt:    { fontSize: 12, fontWeight: '700', color: WHITE },
  viewBtn:      { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: BLUE_SOFT, borderRadius: 10 },
  viewTxt:      { fontSize: 12, fontWeight: '700', color: BLUE },
  splitAmtRow:  { flexDirection: 'row', backgroundColor: BG, borderRadius: 14, padding: 16 },
  splitAmtBox:  { flex: 1, alignItems: 'center' },
  splitAmtLabel:{ fontSize: 12, color: TEXT_LIGHT, fontWeight: '600', marginBottom: 4 },
  splitAmtVal:  { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  splitAmtDivider: { width: 1, backgroundColor: BORDER, marginVertical: 4 },

  // Section row
  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:{ fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  viewAll:     { fontSize: 13, fontWeight: '700', color: BLUE },
  iconPill:    { width: 30, height: 30, borderRadius: 10, backgroundColor: BLUE_SOFT, alignItems: 'center', justifyContent: 'center' },

  // Search
  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_DARK, fontWeight: '500' },

  // Filter chips
  chipRow: { paddingVertical: 2, paddingRight: 16, gap: 8, alignItems: 'center' },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  chipActive: { backgroundColor: BLUE, borderColor: BLUE },
  chipTxt:    { fontSize: 12, fontWeight: '600', color: TEXT_LIGHT },
  chipTxtActive:{ color: WHITE, fontWeight: '700' },

  // Transaction card
  txnCard:    { backgroundColor: WHITE, borderRadius: 20, overflow: 'hidden', marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  txnRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  txnDivider: { borderBottomWidth: 1, borderBottomColor: BORDER },
  txnIcon:    { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txnTitle:   { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  txnTime:    { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500' },
  txnAmt:     { fontSize: 15, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.3 },

  // Badges
  sharedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: BLUE_SOFT, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  sharedTxt:   { fontSize: 9, fontWeight: '700', color: BLUE },
  recurBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: SUCCESS_BG, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  recurTxt:    { fontSize: 9, fontWeight: '700', color: SUCCESS },
  receiptTag:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  receiptTxt:  { fontSize: 10, color: BLUE, fontWeight: '600' },

  // Empty
  empty:    { alignItems: 'center', paddingVertical: 40 },
  emptyTxt: { fontSize: 14, color: TEXT_MID, fontWeight: '500' },

  // Categories tab
  statRow:  { flexDirection: 'row', backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  statCell: { flex: 1, alignItems: 'center' },
  statVal:  { fontSize: 15, fontWeight: '800', color: TEXT_DARK, marginBottom: 2 },
  statLbl:  { fontSize: 11, color: TEXT_LIGHT, fontWeight: '600' },
  statLine: { width: 1, backgroundColor: BORDER, marginVertical: 4 },

  catBarRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catBarName: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  catBarAmt:  { fontSize: 11, color: TEXT_LIGHT, fontWeight: '500' },
  catBarBg:   { flex: 1, height: 10, backgroundColor: BG, borderRadius: 5, overflow: 'hidden' },
  catBarFill: { height: '100%' as any, borderRadius: 5 },
  catBarPct:  { fontSize: 12, fontWeight: '800', width: 36, textAlign: 'right' },

  catDetailBar:  { height: 6, backgroundColor: BG, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  catDetailFill: { height: 6, borderRadius: 3 },

  // Analytics
  analyticsHero: {
    backgroundColor: BLUE, borderRadius: 24, padding: 20, marginBottom: 16,
    shadowColor: BLUE_DARK, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  analyticsHeroLbl: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginBottom: 4 },
  analyticsHeroAmt: { fontSize: 40, fontWeight: '900', color: WHITE, letterSpacing: -1.5 },
  momBadge:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  momBadgeTxt:      { fontSize: 13, color: WHITE, fontWeight: '700' },
  heroStatRow:      { flexDirection: 'row', alignItems: 'center' },
  heroStat:         { flex: 1 },
  heroStatLbl:      { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginBottom: 4 },
  heroStatVal:      { fontSize: 16, color: WHITE, fontWeight: '700' },
  heroStatDivider:  { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 12 },

  momRow:   { flexDirection: 'row', backgroundColor: WHITE, borderRadius: 14, padding: 12, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  momCell:  { flex: 1, alignItems: 'center' },
  momMonth: { fontSize: 11, color: TEXT_MID, fontWeight: '600', marginBottom: 3 },
  momDelta: { fontSize: 13, fontWeight: '800' },

  // FAB
  fab: { position: 'absolute', bottom: 130, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', shadowColor: BLUE_DARK, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10 },

  // Overview Card style
  overviewCard: { backgroundColor: WHITE, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 16 },
  overviewLeft:   { flex: 1 },
  overviewLabel:  { fontSize: 13, color: TEXT_MID, fontWeight: '500', marginBottom: 8 },
  overviewAmt:    { fontSize: 28, fontWeight: '800', color: '#E11D48', marginBottom: 8 },
  overviewBtn:    { backgroundColor: BLUE, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  overviewBtnText:{ color: WHITE, fontSize: 13, fontWeight: '600' },
  overviewRight:  { width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  walletImg:      { width: 110, height: 110, position: 'absolute', right: -10, bottom: -10 },
});

// ── Set Budget modal styles ────────────────────────────────────────────────────
const bm = StyleSheet.create({
  sheet:   { backgroundColor: WHITE, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48, shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 12 },
  handle:  { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
  iconWrap:{ width: 56, height: 56, borderRadius: 18, backgroundColor: BLUE_SOFT, alignItems: 'center', justifyContent: 'center' },
  title:   { fontSize: 22, fontWeight: '900', color: TEXT_DARK, marginBottom: 4 },
  sub:     { fontSize: 14, color: TEXT_LIGHT, fontWeight: '600' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 20, height: 72, marginBottom: 24 },
  rupee:   { fontSize: 34, fontWeight: '800', color: BLUE, marginRight: 8 },
  input:   { flex: 1, fontSize: 40, fontWeight: '900', color: TEXT_DARK, padding: 0 },
  presetLabel: { fontSize: 12, fontWeight: '800', color: TEXT_LIGHT, marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  presetRow: { flexDirection: 'row', gap: 10, marginBottom: 28, flexWrap: 'wrap' },
  preset:      { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: BG, borderRadius: 14, borderWidth: 1, borderColor: BORDER },
  presetActive:{ backgroundColor: BLUE_SOFT, borderColor: BLUE },
  presetText:  { fontSize: 14, fontWeight: '700', color: TEXT_MID },
  presetTextActive: { color: BLUE },
  saveBtn:   { backgroundColor: BLUE, borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  saveBtnOff:{ backgroundColor: '#A0B4E8', shadowOpacity: 0 },
  saveBtnText:{ color: WHITE, fontSize: 16, fontWeight: '800' },
});

// ── Settle Up + Export shared styles ─────────────────────────────────────────
const sm = StyleSheet.create({
  sheet:  { backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 48, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  handle: { width: 36, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  title:  { fontSize: 20, fontWeight: '800', color: TEXT_DARK, marginBottom: 4 },
  sub:    { fontSize: 13, color: TEXT_LIGHT, fontWeight: '500', marginBottom: 20 },
  amtRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  amtBox: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 16 },
  amtLabel:{ fontSize: 12, color: TEXT_MID, fontWeight: '600', marginBottom: 6 },
  amtVal:  { fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  btn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, height: 52, marginBottom: 12 },
  btnTxt: { fontSize: 15, fontWeight: '700', color: WHITE },
  doneCircle:{ width: 72, height: 72, borderRadius: 36, backgroundColor: SUCCESS_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  doneTitle: { fontSize: 22, fontWeight: '800', color: TEXT_DARK, marginBottom: 6 },
  doneSub:   { fontSize: 14, color: TEXT_MID, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
});
