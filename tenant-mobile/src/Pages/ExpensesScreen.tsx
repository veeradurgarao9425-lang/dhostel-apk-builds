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
  CheckCircle2, XCircle, ArrowUpRight, FileText,
  AlertTriangle, Edit3, Target,
} from 'lucide-react-native';

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
];

const MONTHLY_DATA = [
  { month: 'Jan', amt: 2800 }, { month: 'Feb', amt: 3200 }, { month: 'Mar', amt: 2600 },
  { month: 'Apr', amt: 3800 }, { month: 'May', amt: 3100 }, { month: 'Jun', amt: 3650 },
];
const MAX_AMT = Math.max(...MONTHLY_DATA.map(m => m.amt));

const CAT_BAR_DATA = [
  { name: 'Food',      amount: 1570, pct: 43, color: '#EF5350', bg: '#FDEAEA' },
  { name: 'Transport', amount: 840,  pct: 23, color: BLUE,      bg: BLUE_SOFT },
  { name: 'Shopping',  amount: 620,  pct: 17, color: '#43A047', bg: '#EAF5EA' },
  { name: 'Bills',     amount: 380,  pct: 10, color: '#FB8C00', bg: '#FFF3E0' },
  { name: 'Others',    amount: 240,  pct: 7,  color: '#546E7A', bg: '#ECEFF1' },
];

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
      <View style={s.donutCenter}>
        <Text style={s.donutAmt}>₹{(MONTH_TOTAL / 1000).toFixed(1)}k</Text>
        <Text style={s.donutLbl}>{activeCategory ?? 'Total'}</Text>
      </View>
    </View>
  );
}

// ── Trend Line ────────────────────────────────────────────────────────────────
const TREND_PTS = MONTHLY_DATA.map((m, i) => ({
  x: i, y: 100 - Math.round((m.amt / MAX_AMT) * 80), raw: m.amt, label: m.month,
}));

function TrendLine() {
  const W = width - 64; const H = 120; const PAD = 16;
  const xStep = (W - PAD * 2) / (TREND_PTS.length - 1);
  const pts   = TREND_PTS.map((p, i) => ({ x: PAD + i * xStep, y: PAD + p.y * (H - PAD * 2) / 100 }));
  const poly  = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area  = `M${pts[0].x},${H} ${pts.map(p => `L${p.x},${p.y}`).join(' ')} L${pts[pts.length-1].x},${H} Z`;
  return (
    <View style={{ height: H + 28 }}>
      <Svg width={W} height={H}>
        <Path d={area} fill={BLUE_SOFT} opacity={0.7} />
        <Polyline points={poly} fill="none" stroke={BLUE} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <G key={i}><Circle cx={p.x} cy={p.y} r={4.5} fill={WHITE} stroke={BLUE} strokeWidth={2} /></G>)}
        {[0.25, 0.5, 0.75].map((f, i) => (
          <Line key={i} x1={PAD} y1={PAD + f * (H - PAD * 2)} x2={W - PAD} y2={PAD + f * (H - PAD * 2)}
            stroke={BORDER} strokeWidth={1} strokeDasharray="4 4" />
        ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { top: H, flexDirection: 'row', paddingHorizontal: PAD }]}>
        {TREND_PTS.map((p, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: TEXT_LIGHT, fontWeight: '600' }}>{p.label}</Text>
          </View>
        ))}
      </View>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(13,27,62,0.55)', justifyContent: 'flex-end' }}>
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

                {/* Amount input */}
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

                {/* Quick presets */}
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

// ── Settle Up Modal ───────────────────────────────────────────────────────────
function SettleUpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [done, setDone] = useState<'paid' | 'received' | null>(null);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { setDone(null); onClose(); }}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { setDone(null); onClose(); }} activeOpacity={1}>
        <View style={{ flex: 1, backgroundColor: 'rgba(13,27,62,0.55)', justifyContent: 'flex-end' }}>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(13,27,62,0.5)', justifyContent: 'flex-end' }}>
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
  const [showSettle, setShowSettle]         = useState(false);
  const [showExport, setShowExport]         = useState(false);
  const [receiptUri, setReceiptUri]         = useState<string | null>(null);
  const tabAnim                             = useRef(new Animated.Value(0)).current;
  const tabKeys: TabKey[]                   = ['Overview', 'Categories', 'Analytics'];

  const handleTab = (t: TabKey) => {
    Animated.spring(tabAnim, { toValue: tabKeys.indexOf(t), useNativeDriver: false, friction: 8 }).start();
    setTab(t);
  };

  const tabW = (width - 32 - 12) / 3;
  const indicatorLeft = tabAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [6, 6 + tabW, 6 + tabW * 2] });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Expenses</Text>
          <Text style={s.headerSub}>Jun 2025</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity style={s.hBtn} onPress={() => setShowBudget(true)} activeOpacity={0.7}>
            <ChevronDown size={14} color={BLUE} strokeWidth={2.5} />
            <Text style={s.hBtnText}>Jun</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.hIcon} onPress={() => setShowExport(true)} activeOpacity={0.7}>
            <Download size={18} color={BLUE} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={s.hIcon} activeOpacity={0.7}>
            <BarChart2 size={18} color={BLUE} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
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
            onToggleCategory={name => setActiveCategory(p => p === name ? null : name)}
            onSettleUp={() => setShowSettle(true)}
            onReceiptOpen={setReceiptUri}
            budget={budget}
            onEditBudget={() => setShowBudget(true)}
          />
        )}
        {tab === 'Categories' && <CategoriesTab navigation={navigation} />}
        {tab === 'Analytics'  && <AnalyticsTab />}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('AddExpense')} activeOpacity={0.85}>
        <Plus size={26} color={WHITE} strokeWidth={3} />
      </TouchableOpacity>

      <SetBudgetModal visible={showBudget} currentBudget={budget} onSave={setBudget} onClose={() => setShowBudget(false)} />
      <SettleUpModal  visible={showSettle} onClose={() => setShowSettle(false)} />
      <ExportModal    visible={showExport} onClose={() => setShowExport(false)} />
      {receiptUri && <ReceiptModal uri={receiptUri} onClose={() => setReceiptUri(null)} />}
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ navigation, activeCategory, onToggleCategory, onSettleUp, onReceiptOpen, budget, onEditBudget }: any) {
  const [searchQ, setSearchQ]         = useState('');
  const [showSearch, setShowSearch]   = useState(false);
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
      {/* ── 1. Summary card — white, clean ── */}
      <View style={s.summaryCard}>
        {/* Top row: amount left, donut right */}
        <View style={s.summaryTop}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={s.summaryLabel}>Total Spent</Text>
            <Text style={s.summaryAmt}>₹{MONTH_TOTAL.toLocaleString('en-IN')}</Text>
            {/* Trend badge */}
            <View style={s.trendBadge}>
              <TrendingUp size={12} color={DANGER} strokeWidth={3} />
              <Text style={s.trendBadgeTxt}>↑ 12%</Text>
              <Text style={s.trendBadgeSub}> vs last month</Text>
            </View>
          </View>
          <Donut activeCategory={activeCategory} />
        </View>

        <View style={s.summaryDivider} />

        {/* Legend — 2-column grid */}
        <View style={s.legendGrid}>
          {BREAKDOWN.map(seg => {
            const isActive = activeCategory === seg.name;
            return (
              <TouchableOpacity
                key={seg.name}
                style={[s.legendItem, isActive && { backgroundColor: seg.bg, borderRadius: 10 }]}
                onPress={() => onToggleCategory(seg.name)} activeOpacity={0.7}
              >
                <View style={[s.legendDot, { backgroundColor: seg.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.legendName, isActive && { color: seg.color, fontWeight: '800' }]}>{seg.name}</Text>
                  <Text style={s.legendAmt}>₹{seg.amount.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={[s.legendPct, { color: isActive ? seg.color : TEXT_LIGHT }]}>{seg.pct}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeCategory && (
          <TouchableOpacity style={s.clearFilter} onPress={() => onToggleCategory(activeCategory)}>
            <X size={11} color={BLUE} strokeWidth={3} />
            <Text style={s.clearFilterTxt}>Clear filter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── 2. Budget Tracker ── */}
      <View style={s.card}>
        <View style={s.budgetTopRow}>
          <View style={[s.budgetIcon, { backgroundColor: isWarn ? WARN_BG : BLUE_SOFT }]}>
            <Target size={18} color={isWarn ? WARN_COLOR : BLUE} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Monthly Budget</Text>
            <Text style={s.cardSub}>
              ₹{MONTH_TOTAL.toLocaleString('en-IN')} of{' '}
              <Text style={{ color: BLUE, fontWeight: '700' }}>₹{budget.toLocaleString('en-IN')}</Text>
              {' '}spent
            </Text>
          </View>
          {/* Tap to edit budget */}
          <TouchableOpacity style={s.editBudgetBtn} onPress={onEditBudget} activeOpacity={0.7}>
            <Edit3 size={13} color={BLUE} strokeWidth={2} />
            <Text style={s.editBudgetTxt}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={s.progressTrack}>
          <View style={[s.progressFill, {
            width: `${Math.min(budgetPct, 100)}%` as any,
            backgroundColor: barColor,
          }]} />
          {/* 80% marker */}
          <View style={[s.progressMarker, { left: '80%' }]} />
        </View>

        <View style={s.budgetFooter}>
          <View style={[s.budgetBadge, { backgroundColor: isWarn ? WARN_BG : BLUE_SOFT }]}>
            {isWarn && <AlertTriangle size={11} color={WARN_COLOR} strokeWidth={2.5} />}
            <Text style={[s.budgetBadgeTxt, { color: isWarn ? WARN_COLOR : BLUE }]}>
              {budgetPct}% used
            </Text>
          </View>
          <Text style={s.budgetRemain}>
            ₹{Math.max(budget - MONTH_TOTAL, 0).toLocaleString('en-IN')} remaining
          </Text>
        </View>

        {isWarn && (
          <View style={s.warnRow}>
            <AlertTriangle size={13} color={WARN_COLOR} strokeWidth={2.5} />
            <Text style={s.warnTxt}>
              {budgetPct >= 100
                ? 'You have exceeded your budget!'
                : `You've used ${budgetPct}% — only ₹${(budget - MONTH_TOTAL).toLocaleString('en-IN')} left.`}
            </Text>
          </View>
        )}
      </View>

      {/* ── 3. Insight Card ── */}
      <TouchableOpacity style={s.insightCard} activeOpacity={0.85}>
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
          {filtered.map((item: any, i: number) => {
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
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ══════════════════════════════════════════════════════════════════════════════
function CategoriesTab({ navigation }: any) {
  const MAX = Math.max(...CAT_BAR_DATA.map(c => c.amount));
  return (
    <>
      <View style={s.statRow}>
        <View style={s.statCell}><Text style={s.statVal}>₹3,650</Text><Text style={s.statLbl}>Total</Text></View>
        <View style={s.statLine} />
        <View style={s.statCell}><Text style={s.statVal}>{CAT_BAR_DATA.length}</Text><Text style={s.statLbl}>Categories</Text></View>
        <View style={s.statLine} />
        <View style={s.statCell}><Text style={[s.statVal, { color: '#EF5350' }]}>Food</Text><Text style={s.statLbl}>Top Spend</Text></View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Spending Breakdown</Text>
        <View style={{ gap: 16, marginTop: 16 }}>
          {CAT_BAR_DATA.map(cat => {
            const barW = ((cat.amount / MAX) * (width - 64 - 80 - 24));
            return (
              <TouchableOpacity key={cat.name} style={s.catBarRow}
                onPress={() => navigation.navigate('CategoryDetail', { categoryName: cat.name, spent: cat.amount, totalPct: cat.pct, color: cat.color, bg: cat.bg })}
                activeOpacity={0.7}
              >
                <View style={{ width: 84 }}>
                  <Text style={s.catBarName}>{cat.name}</Text>
                  <Text style={s.catBarAmt}>₹{cat.amount.toLocaleString('en-IN')}</Text>
                </View>
                <View style={s.catBarBg}>
                  <View style={[s.catBarFill, { width: barW, backgroundColor: cat.color }]} />
                </View>
                <Text style={[s.catBarPct, { color: cat.color }]}>{cat.pct}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={s.txnCard}>
        {CAT_BAR_DATA.map((cat, i) => {
          const meta = CATS[cat.name] || CATS.Others;
          const Icon = meta.Icon;
          return (
            <TouchableOpacity key={cat.name} style={[s.txnRow, i < CAT_BAR_DATA.length - 1 && s.txnDivider]}
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
function AnalyticsTab() {
  const months = MONTHLY_DATA.map(m => ({ ...m, h: Math.round((m.amt / MAX_AMT) * 110) }));
  const mom = ((MONTHLY_DATA[5].amt - MONTHLY_DATA[4].amt) / MONTHLY_DATA[4].amt * 100).toFixed(1);
  const isUp = parseFloat(mom) > 0;

  return (
    <>
      {/* Hero */}
      <View style={s.analyticsHero}>
        <View style={{ marginBottom: 20 }}>
          <Text style={s.analyticsHeroLbl}>Jun 2025 Total</Text>
          <Text style={s.analyticsHeroAmt}>₹3,650</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <View style={[s.momBadge, { backgroundColor: isUp ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)' }]}>
              {isUp ? <TrendingUp size={13} color={WHITE} strokeWidth={3} /> : <TrendingDown size={13} color={WHITE} strokeWidth={3} />}
              <Text style={s.momBadgeTxt}>{isUp ? '↑' : '↓'} {Math.abs(parseFloat(mom))}% MoM</Text>
            </View>
          </View>
        </View>
        <View style={s.heroStatRow}>
          <View style={s.heroStat}><Text style={s.heroStatLbl}>Daily Avg</Text><Text style={s.heroStatVal}>₹118</Text></View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}><Text style={s.heroStatLbl}>6-Mo Total</Text><Text style={s.heroStatVal}>₹22.1k</Text></View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}><Text style={s.heroStatLbl}>Projected</Text><Text style={s.heroStatVal}>₹4.1k</Text></View>
        </View>
      </View>

      {/* Trend line */}
      <Text style={[s.sectionTitle, { marginBottom: 10 }]}>Month-over-Month Trend</Text>
      <View style={s.card}>
        <TrendLine />
      </View>

      {/* MoM deltas */}
      <View style={s.momRow}>
        {MONTHLY_DATA.slice(1).map((m, i) => {
          const prev = MONTHLY_DATA[i].amt;
          const delta = ((m.amt - prev) / prev * 100).toFixed(0);
          const up = m.amt > prev;
          return (
            <View key={m.month} style={s.momCell}>
              <Text style={s.momMonth}>{m.month}</Text>
              <Text style={[s.momDelta, { color: up ? DANGER : SUCCESS }]}>{up ? '↑' : '↓'}{Math.abs(Number(delta))}%</Text>
            </View>
          );
        })}
      </View>

      {/* Bar chart */}
      <Text style={[s.sectionTitle, { marginBottom: 10 }]}>6-Month Overview</Text>
      <View style={s.card}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130 }}>
          {months.map(m => {
            const isLast = m.month === 'Jun';
            return (
              <View key={m.month} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 9, color: isLast ? BLUE : TEXT_LIGHT, fontWeight: '700' }}>{(m.amt / 1000).toFixed(1)}k</Text>
                <View style={{ height: m.h, width: 26, backgroundColor: isLast ? BLUE : BLUE_SOFT, borderRadius: 8, borderWidth: isLast ? 0 : 1, borderColor: BLUE_BORDER }} />
                <Text style={{ fontSize: 11, color: isLast ? BLUE : TEXT_MID, fontWeight: isLast ? '800' : '600' }}>{m.month}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Week */}
      <Text style={[s.sectionTitle, { marginBottom: 10 }]}>This Week</Text>
      <View style={s.txnCard}>
        {[{ d: 'Mon', a: 210, f: 0.55 }, { d: 'Tue', a: 85, f: 0.22 }, { d: 'Wed', a: 320, f: 0.84 }, { d: 'Thu', a: 150, f: 0.39 }, { d: 'Fri', a: 95, f: 0.25 }, { d: 'Sat', a: 270, f: 0.71 }, { d: 'Sun', a: 350, f: 0.92 }].map((d, i, arr) => (
          <View key={d.d} style={[s.txnRow, i < arr.length - 1 && s.txnDivider, { alignItems: 'center' }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: TEXT_MID, width: 30 }}>{d.d}</Text>
            <View style={{ flex: 1, height: 8, backgroundColor: BG, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ height: 8, width: `${d.f * 100}%` as any, borderRadius: 4, backgroundColor: d.f > 0.8 ? DANGER : d.f > 0.6 ? BLUE : BLUE_SOFT }} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: d.f > 0.8 ? DANGER : TEXT_DARK, width: 52, textAlign: 'right' }}>₹{d.a}</Text>
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
  fab: { position: 'absolute', bottom: 100, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', shadowColor: BLUE_DARK, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10 },
});

// ── Set Budget modal styles ────────────────────────────────────────────────────
const bm = StyleSheet.create({
  sheet:   { backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 44 },
  handle:  { width: 36, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  iconWrap:{ width: 52, height: 52, borderRadius: 16, backgroundColor: BLUE_SOFT, alignItems: 'center', justifyContent: 'center' },
  title:   { fontSize: 20, fontWeight: '800', color: TEXT_DARK, marginBottom: 3 },
  sub:     { fontSize: 13, color: TEXT_LIGHT, fontWeight: '500' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 16, borderWidth: 1.5, borderColor: BLUE_BORDER, paddingHorizontal: 18, height: 64, marginBottom: 22 },
  rupee:   { fontSize: 32, fontWeight: '800', color: BLUE, marginRight: 6 },
  input:   { flex: 1, fontSize: 36, fontWeight: '900', color: TEXT_DARK, padding: 0 },
  presetLabel: { fontSize: 12, fontWeight: '700', color: TEXT_LIGHT, marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  preset:      { paddingHorizontal: 16, paddingVertical: 9, backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  presetActive:{ backgroundColor: BLUE_SOFT, borderColor: BLUE },
  presetText:  { fontSize: 14, fontWeight: '700', color: TEXT_MID },
  presetTextActive: { color: BLUE },
  saveBtn:   { backgroundColor: BLUE, borderRadius: 16, height: 54, alignItems: 'center', justifyContent: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  saveBtnOff:{ backgroundColor: '#A0B4E8', shadowOpacity: 0 },
  saveBtnText:{ color: WHITE, fontSize: 16, fontWeight: '800' },
});

// ── Settle Up + Export shared styles ─────────────────────────────────────────
const sm = StyleSheet.create({
  sheet:  { backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 48 },
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
