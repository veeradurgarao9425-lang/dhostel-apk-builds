import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  Dimensions, Animated, StatusBar, TextInput, Modal,
  Share, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Path, Polyline, Polygon, Line, G } from 'react-native-svg';
import {
  BarChart2, Plus, TrendingUp, TrendingDown,
  Utensils, Car, ShoppingBag, Receipt,
  Film, MoreHorizontal, ChevronDown, ChevronRight,
  Users, Search, X, Download, RefreshCw,
  Image as ImageIcon, Lightbulb, Wallet,
  CheckCircle2, XCircle, ArrowUpRight, FileText, ArrowRight,
  AlertTriangle, Edit3, Target, Edit2, SlidersHorizontal,
} from 'lucide-react-native';

import { FilterSheet, BaseBottomSheet, ConfirmationDialog, Phase3EmptyState, MonthYearPickerSheet } from '../components/UIComponents';
import CategoryGlowBadge from '../components/ui/CategoryGlowBadge';
import { SkeletonStatCard, SkeletonExpenseCard } from '../components/ui/SkeletonLoader';
import { getCategoryTheme } from '../constants/categoryTheme';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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









// ── Donut ─────────────────────────────────────────────────────────────────────
const R = 46; const SW = 16; const SZ = (R + SW / 2 + 4) * 2; const CIRC = 2 * Math.PI * R;
function Donut({ activeCategory, breakdown }: { activeCategory: string | null; breakdown: any[] }) {
  let cum = CIRC / 4;
  const segs = breakdown.map(seg => {
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

  useEffect(() => {
    setVal(currentBudget > 0 ? String(currentBudget) : '5000');
  }, [currentBudget, visible]);

  return (
    <BaseBottomSheet visible={visible} onClose={onClose} height={480}>
      <View style={bm.iconRow}>
        <View style={bm.iconWrap}>
          <Target size={24} color={BLUE} strokeWidth={2} />
        </View>
        <View>
          <Text style={bm.title}>Set Monthly Budget</Text>
          <Text style={bm.sub}>How much do you plan to spend in {new Date().toLocaleString('en-US', { month: 'short' })}?</Text>
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
    </BaseBottomSheet>
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
    <BaseBottomSheet visible={visible} onClose={onClose} height={560}>
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
    </BaseBottomSheet>
  );
}

// ── Add Savings Modal ─────────────────────────────────────────────────────────
function AddSavingsModal({ visible, currentSaved, onSave, onClose }: {
  visible: boolean; currentSaved: number; onSave: (added: number) => void; onClose: () => void;
}) {
  const [val, setVal] = useState('');
  return (
    <BaseBottomSheet visible={visible} onClose={onClose} height={380}>
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
    </BaseBottomSheet>
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
function ExportModal({ visible, onClose, selectedDate, monthTotal, breakdown }: {
  visible: boolean; onClose: () => void; selectedDate: Date; monthTotal: number; breakdown: any[];
}) {
  const monthName = selectedDate.toLocaleString('en-US', { month: 'short' });
  const year = selectedDate.getFullYear();
  const summaryStr = breakdown.map(b => `${b.name}: ₹${b.amount.toLocaleString('en-IN')}`).join(' | ');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1}>
            <View style={sm.sheet}>
              <View style={sm.handle} />
              <Text style={sm.title}>Export {monthName} {year}</Text>
              <Text style={sm.sub}>Share your monthly expense summary</Text>
              <TouchableOpacity style={[sm.btn, { backgroundColor: BLUE }]}
                onPress={async () => {
                  await Share.share({
                    message: `Stayvix Expense Report – ${monthName} ${year}\n${summaryStr}\nTotal: ₹${monthTotal.toLocaleString('en-IN')}`
                  });
                  onClose();
                }} activeOpacity={0.85}>
                <FileText size={18} color={WHITE} strokeWidth={2.5} />
                <Text style={sm.btnTxt}>Share as Text / PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[sm.btn, { backgroundColor: '#16A34A' }]}
                onPress={async () => {
                  const csvHeader = 'Date,Category,Amount\n';
                  const csvRows = breakdown.map(b => `,${b.name},${b.amount}`).join('\n');
                  await Share.share({ message: csvHeader + csvRows });
                  onClose();
                }} activeOpacity={0.85}>
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
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const [monthTotal, setMonthTotal] = useState(0);
  const [todaySpent, setTodaySpent] = useState(0);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [maxAmt, setMaxAmt] = useState(0);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const fetchExpenses = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      try {
        const saved = await AsyncStorage.getItem('tenant_budget');
        if (saved) {
          setBudget(Number(saved));
        } else {
          setBudget(0);
        }
      } catch (e) {
        console.error('Failed to load budget', e);
      }
      const res = await api.get('/tenant-expenses');
      if (res.data && res.data.success) {
        const fetched = res.data.data;
        const formatted = fetched.map((e: any) => ({
          id: e.expense_id.toString(),
          title: e.title,
          time: (() => {
            try {
              const d = new Date(e.date);
              if (isNaN(d.getTime())) return e.date;
              const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
              const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              return `${dateStr} • ${timeStr}`;
            } catch (err) {
              return String(e.date);
            }
          })(),
          cat: e.category,
          amt: Number(e.amount),
          shared: false,
          recurring: false,
          hasReceipt: false,
          date_raw: e.date,
        }));

        // Filter expenses for selected month & year (Timezone-safe string splitting)
        const monthlyFiltered = formatted.filter((e: any) => {
          if (typeof e.date_raw === 'string') {
            const [y, m] = e.date_raw.split('-').map(Number);
            return (m - 1) === selectedDate.getMonth() && y === selectedDate.getFullYear();
          }
          const eDate = new Date(e.date_raw);
          return eDate.getMonth() === selectedDate.getMonth() && eDate.getFullYear() === selectedDate.getFullYear();
        });

        setExpenses(monthlyFiltered);

        let total = 0;
        const catMap: Record<string, number> = {};
        monthlyFiltered.forEach((e: any) => {
          total += e.amt;
          catMap[e.cat] = (catMap[e.cat] || 0) + e.amt;
        });
        setMonthTotal(total);

        // Calculate today's spent total (Timezone-safe checking)
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const todayUtcStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
        const tSpent = formatted
          .filter((e: any) => {
            if (!e.date_raw) return false;
            const cleanDate = typeof e.date_raw === 'string' ? e.date_raw.split('T')[0] : '';
            if (cleanDate === todayStr || cleanDate === todayUtcStr) return true;
            
            const eDate = new Date(e.date_raw);
            return eDate.getDate() === today.getDate() &&
                   eDate.getMonth() === today.getMonth() &&
                   eDate.getFullYear() === today.getFullYear();
          })
          .reduce((sum: number, e: any) => sum + e.amt, 0);
        setTodaySpent(tSpent);

        const brk = Object.keys(catMap).map(k => ({
          name: k,
          amount: catMap[k],
          pct: total > 0 ? Math.round((catMap[k] / total) * 100) : 0,
          color: CATS[k] ? CATS[k].color : CATS['Others'].color,
          bg: CATS[k] ? CATS[k].bg : CATS['Others'].bg,
          Icon: CATS[k] ? CATS[k].Icon : CATS['Others'].Icon,
        })).sort((a: any, b: any) => b.amount - a.amount);
        setBreakdown(brk);

        const now = selectedDate;
        const mData = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
          // Calculate total for this specific historical month (Timezone-safe splitting)
          const histTotal = formatted
            .filter((e: any) => {
              if (typeof e.date_raw === 'string') {
                const [y, m] = e.date_raw.split('-').map(Number);
                return (m - 1) === d.getMonth() && y === d.getFullYear();
              }
              const eDate = new Date(e.date_raw);
              return eDate.getMonth() === d.getMonth() && eDate.getFullYear() === d.getFullYear();
            })
            .reduce((sum: number, e: any) => sum + e.amt, 0);
          return { month: d.toLocaleString('en-US', { month: 'short' }), amt: histTotal };
        });
        setMonthlyData(mData);
        setMaxAmt(Math.max(...mData.map(m => m.amt), 1));
      }
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useFocusEffect(useCallback(() => { fetchExpenses(true); }, [fetchExpenses]));

  const [tab, setTab]                       = useState<TabKey>('Overview');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [budget, setBudget] = useState(0);
  const [showBudget, setShowBudget]         = useState(false);

  // Load budget from AsyncStorage on mount
  useEffect(() => {
    const loadBudget = async () => {
      try {
        const saved = await AsyncStorage.getItem('tenant_budget');
        if (saved) {
          setBudget(Number(saved));
        } else {
          // No budget set yet — set to 0 and trigger the setup prompt
          setBudget(0);
          setShowBudget(true);
        }
      } catch (e) {
        console.error('Failed to load budget', e);
      }
    };
    loadBudget();
  }, []);
  const [showGoal, setShowGoal]             = useState(false);
  const [showSettle, setShowSettle]         = useState(false);
  const [showExport, setShowExport]         = useState(false);
  const [receiptUri, setReceiptUri]         = useState<string | null>(null);
  
  // Savings Goal State
  const [goalName, setGoalName]             = useState('Set Goal');
  const [goalTarget, setGoalTarget]         = useState(0);
  const [goalSaved, setGoalSaved]           = useState(0);
  const [showAddSavings, setShowAddSavings] = useState(false);
  const [completedGoals, setCompletedGoals] = useState<{id: number; name: string; amt: number; date: string}[]>([]);
  const goalProgress = goalTarget > 0 ? Math.min(100, Math.round((goalSaved / goalTarget) * 100)) : 0;
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
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: WHITE }}>My Expenses</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                Track and manage your spending
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' }} onPress={() => setShowMonthPicker(true)} activeOpacity={0.7}>
                <ChevronDown size={14} color={WHITE} strokeWidth={2.5} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: WHITE }}>
                  {selectedDate.toLocaleString('en-US', { month: 'short' })}
                </Text>
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
        {loading ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 20 }}>
            <SkeletonStatCard />
            <SkeletonExpenseCard />
            <SkeletonExpenseCard />
            <SkeletonExpenseCard />
          </View>
        ) : (
          <>
            {tab === 'Overview' && (
              <OverviewTab expenses={expenses} monthTotal={monthTotal} breakdown={breakdown}
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
                completedGoals={completedGoals}
                selectedDate={selectedDate}
                todaySpent={todaySpent}
                monthlyData={monthlyData}
              />
            )}
            {tab === 'Categories' && <CategoriesTab expenses={expenses} monthTotal={monthTotal} breakdown={breakdown} navigation={navigation} selectedDate={selectedDate} />}
            {tab === 'Analytics'  && <AnalyticsTab expenses={expenses} monthTotal={monthTotal} monthlyData={monthlyData} maxAmt={maxAmt} breakdown={breakdown} />}
          </>
        )}
      </ScrollView>

      {tab !== 'Analytics' && (
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('AddExpense')} activeOpacity={0.85}>
          <Plus size={26} color={WHITE} strokeWidth={3} />
        </TouchableOpacity>
      )}

      <SetBudgetModal visible={showBudget} currentBudget={budget} onSave={async (val) => {
        setBudget(val);
        setShowBudget(false);
        try {
          await AsyncStorage.setItem('tenant_budget', String(val));
        } catch (e) {
          console.error('Failed to save budget', e);
        }
      }} onClose={() => setShowBudget(false)} />
      <SetGoalModal visible={showGoal} currentName={goalName} currentTarget={goalTarget} onSave={(name, target) => { setGoalName(name); setGoalTarget(target); setShowGoal(false); }} onClose={() => setShowGoal(false)} />
      <AddSavingsModal visible={showAddSavings} currentSaved={goalSaved} onSave={(val) => {
        const newSaved = goalSaved + val;
        setGoalSaved(newSaved);
        setShowAddSavings(false);
        if (goalTarget > 0 && newSaved >= goalTarget) {
          const achieved = { id: Date.now(), name: goalName, amt: goalTarget, date: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }) };
          setCompletedGoals(prev => [achieved, ...prev]);
          setGoalName('Set Goal');
          setGoalTarget(0);
          setGoalSaved(0);
          showSuccess('Goal achieved! 🎉 You saved ₹' + goalTarget.toLocaleString('en-IN'));
        }
      }} onClose={() => setShowAddSavings(false)} />
      <ConfirmationDialog
          visible={showSettle}
          onClose={() => setShowSettle(false)}
          type="info"
          title="Settle Balances"
          description="Are you sure you want to mark your balances as settled?"
          primaryAction={{ label: 'Confirm Settlement', onPress: () => setShowSettle(false) }}
          secondaryAction={{ label: 'Cancel', onPress: () => setShowSettle(false) }}
        />
      <ExportModal
        visible={showExport}
        onClose={() => setShowExport(false)}
        selectedDate={selectedDate}
        monthTotal={monthTotal}
        breakdown={breakdown}
      />
      {receiptUri && <ReceiptModal uri={receiptUri} onClose={() => setReceiptUri(null)} />}
      <MonthYearPickerSheet
        visible={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        initialDate={selectedDate}
        onConfirm={(date) => {
          setSelectedDate(date);
          setShowMonthPicker(false);
          // fetchExpenses(false) will happen automatically via dependency change, 
          // but we want to show loading when date changes.
          setLoading(true);
        }}
      />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════════════════════════════
function FadeSlideIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;
  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(28);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 480, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, friction: 7, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

function MiniSparkline({ data, color = BLUE, height = 40 }: { data: any[]; color?: string; height?: number }) {
  const vbW = 300;
  const amts = data.map((d: any) => d.amt);
  const max = Math.max(...amts, 1);
  const min = Math.min(...amts, 0);
  const range = Math.max(max - min, 1);
  const stepX = vbW / (data.length - 1);
  const pad = 4;
  const pts = data.map((d: any, i: number) => {
    const x = i * stepX;
    const y = pad + (height - pad * 2) * (1 - (d.amt - min) / range);
    return { x, y };
  });
  const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `0,${height} ${polyPoints} ${vbW},${height}`;
  const last = pts[pts.length - 1];

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${vbW} ${height}`} preserveAspectRatio="none">
      <Polygon points={areaPoints} fill={color} opacity={0.08} />
      <Polyline points={polyPoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last.x} cy={last.y} r={4} fill={WHITE} stroke={color} strokeWidth={2.5} />
    </Svg>
  );
}

function OverviewTab({
  expenses, monthTotal, breakdown, navigation, activeCategory, onToggleCategory, onSettleUp, onReceiptOpen, budget, onEditBudget,
  goalName, goalTarget, goalProgress, goalSaved, onEditGoal, onAddSavings, completedGoals, selectedDate, todaySpent = 0, monthlyData = []
}: any) {
  const prevMonthAmt = monthlyData[monthlyData.length - 2]?.amt || 0;
  const momPct = prevMonthAmt > 0 ? Math.round(((monthTotal - prevMonthAmt) / prevMonthAmt) * 100) : 0;
  const momUp = momPct >= 0;
  const [searchQ, setSearchQ]         = useState('');
  const [showSearch, setShowSearch]   = useState(false);
  const [showFilter, setShowFilter]   = useState(false);
  const [catFilter, setCatFilter]     = useState<string | null>(null);

  const budgetPct  = budget > 0 ? Math.round((monthTotal / budget) * 100) : 0;
  const isWarn     = budgetPct >= 80;
  const barColor   = budgetPct >= 100 ? DANGER : isWarn ? WARN_COLOR : BLUE;

  const filtered = useMemo(() => {
    let r = expenses;
    if (activeCategory) r = r.filter((x: any) => x.cat === activeCategory);
    if (catFilter)      r = r.filter((x: any) => x.cat === catFilter);
    if (searchQ.trim()) { const q = searchQ.toLowerCase(); r = r.filter((x: any) => x.title.toLowerCase().includes(q) || x.cat.toLowerCase().includes(q)); }
    return r;
  }, [activeCategory, catFilter, searchQ]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (budget === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [budget]);

  return (
    <>
      {/* ── 1. Total Spent Donut Chart ── */}
      <FadeSlideIn delay={0}>
      <View style={[s.overviewCard, { flexDirection: 'column', alignItems: 'center', position: 'relative' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 }}>
          <Text style={s.overviewLabel}>Total Spent ({selectedDate.toLocaleString('en-US', { month: 'short' })})</Text>
          {budget > 0 ? (
            <TouchableOpacity onPress={onEditBudget} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E0E7FF' }}>
              <Edit3 size={14} color="#2245D4" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2245D4' }}>Edit Budget</Text>
            </TouchableOpacity>
          ) : (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity onPress={onEditBudget} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <Plus size={14} color="#2563EB" strokeWidth={2.5} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>Add Budget</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
        
        <View style={{ width: 130, height: 130, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', position: 'relative' }}>
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
            <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT_DARK }}>₹{monthTotal}</Text>
            <Text style={{ fontSize: 10, color: TEXT_MID, marginTop: 2 }}>of ₹{budget > 0 ? budget : '—'}</Text>
          </View>
        </View>

        {monthlyData && monthlyData.length > 1 && (
          <View style={{ width: '100%', marginTop: 18 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
              6-Month Trend
            </Text>
            <MiniSparkline data={monthlyData} color={momUp ? '#E11D48' : '#2245D4'} />
          </View>
        )}

        <View style={{ flexDirection: 'column', gap: 10, marginTop: 16, alignSelf: 'stretch' }}>

          <View style={[s.trendRow, { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: budget > 0 ? (monthTotal > budget ? '#FEF2F2' : '#ECFDF5') : '#FFFBEB', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: budget > 0 ? (monthTotal > budget ? 1 : 0) : 1, borderColor: budget > 0 ? (monthTotal > budget ? '#FCA5A5' : 'transparent') : '#FDE68A' }]}>
            {budget > 0 ? (
              <>
                <Text style={{ fontSize: 13, color: monthTotal > budget ? '#DC2626' : '#059669', fontWeight: '800', flexShrink: 1 }}>
                  {monthTotal > budget ? (
                    "Over budget!"
                  ) : (
                    `₹${Math.round((budget - monthTotal) / (30 - new Date().getDate() + 1))} safe to spend today`
                  )}
                </Text>
                
                <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                  {prevMonthAmt > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      {momUp
                        ? <TrendingUp size={10} color="#E11D48" strokeWidth={2.5} />
                        : <TrendingDown size={10} color="#059669" strokeWidth={2.5} />}
                      <Text style={{ fontSize: 9, fontWeight: '700', color: momUp ? '#E11D48' : '#059669', marginLeft: 3 }}>
                        {Math.abs(momPct)}% vs last month
                      </Text>
                    </View>
                  )}
                  <View style={{ backgroundColor: monthTotal > budget ? '#FEE2E2' : '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: monthTotal > budget ? '#EF4444' : '#047857', fontWeight: '700' }}>
                      ₹{todaySpent} spent today
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={{ fontSize: 12, color: '#D97706', fontWeight: '700' }}>
                Set budget to calculate daily limit
              </Text>
            )}
          </View>
        </View>
      </View>
      </FadeSlideIn>

      {/* ── 2. Top Spending Category ── */}
      {breakdown.length > 0 && (() => {
        const topCat = CATS[breakdown[0].name] || CATS['Others'];
        const TopIcon = topCat.Icon;
        return (
          <FadeSlideIn delay={80}>
          <View style={[s.card, { backgroundColor: '#FFF0F2', borderColor: '#FFE4E6', padding: 14 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ backgroundColor: topCat.color, padding: 6, borderRadius: 10, shadowColor: topCat.color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 }}>
                  <TopIcon size={14} color={WHITE} strokeWidth={2.5} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: topCat.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>Highest Spend</Text>
              </View>
              <View style={{ backgroundColor: '#FFE4E6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#E11D48' }}>{breakdown[0].pct}% of Total</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT_DARK, marginBottom: 1 }}>{breakdown[0].name}</Text>
                <Text style={{ fontSize: 11, color: TEXT_MID }}>Most frequent expense</Text>
              </View>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#E11D48', letterSpacing: -0.5 }}>₹{breakdown[0].amount.toLocaleString('en-IN')}</Text>
            </View>
          </View>
          </FadeSlideIn>
        );
      })()}

      {/* ── 2.5 Savings Goal ── */}
      <FadeSlideIn delay={140}>
      {goalTarget === 0 ? (
        <TouchableOpacity
          style={[s.card, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', padding: 16 }]}
          activeOpacity={0.8}
          onPress={onEditGoal}
        >
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <View style={{ backgroundColor: '#22C55E', padding: 6, borderRadius: 10 }}>
              <Target size={14} color={WHITE} strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.5 }}>Savings Goal</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 }}>Set a savings goal</Text>
          <Text style={{ fontSize: 13, color: TEXT_MID }}>Track what you're saving towards — a gadget, trip, or anything!</Text>
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#16A34A' }}>Tap to create a goal →</Text>
          </View>
        </TouchableOpacity>
      ) : (
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
      )}
      </FadeSlideIn>

      {/* ── 3. Insight Card ── */}
      {breakdown.length > 0 && monthTotal > 0 && (
        <FadeSlideIn delay={200}>
        <TouchableOpacity
          style={s.insightCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CategoryDetail', { categoryName: breakdown[0].name, spent: breakdown[0].amount, totalPct: breakdown[0].pct, color: breakdown[0].color, bg: breakdown[0].bg, selectedDateStr: selectedDate.toISOString() })}
        >
          <View style={s.insightIcon}>
            <Lightbulb size={18} color={WARN_COLOR} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.insightLabel}>SMART INSIGHT · {selectedDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</Text>
            <Text style={s.insightTitle}>{breakdown[0].name} is your top spend this month at {breakdown[0].pct}% of total.</Text>
          </View>
          <ChevronRight size={16} color={WARN_COLOR} strokeWidth={2.5} />
        </TouchableOpacity>
        </FadeSlideIn>
      )}

      {/* ── 4. Bill Split Card ── */}
      <FadeSlideIn delay={260}>
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
            <Text style={s.splitAmtLabel}>To Pay</Text>
            <Text style={[s.splitAmtVal, { color: DANGER }]}>₹0</Text>
          </View>
          <View style={s.splitAmtDivider} />
          <View style={s.splitAmtBox}>
            <Text style={s.splitAmtLabel}>To Receive</Text>
            <Text style={[s.splitAmtVal, { color: SUCCESS }]}>₹0</Text>
          </View>
        </View>
      </View>
      </FadeSlideIn>

      {/* ── 5. Recent Transactions ── */}
      <FadeSlideIn delay={320}>
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
          return (
            <TouchableOpacity key={name} style={[s.chip, act && { backgroundColor: meta.bg, borderColor: meta.color }]} onPress={() => setCatFilter(act ? null : name)} activeOpacity={0.7}>
              <CategoryGlowBadge category={name} size="xs" active={act} />
              <Text style={[s.chipTxt, act && { color: meta.color, fontWeight: '700' }]}>{name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Transaction list */}
      {filtered.length > 0 ? (
        <View style={s.txnCard}>
          {filtered.slice(0, 5).map((item: any, i: number) => {
            const itemTheme = getCategoryTheme(item.cat);
            return (
              <View key={item.id} style={[s.txnRow, i < filtered.length - 1 && s.txnDivider, { borderLeftWidth: 3, borderLeftColor: itemTheme.color }]}>
                <CategoryGlowBadge category={item.cat} size="md" />
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
        <Phase3EmptyState variant="search" />
      )}
      </FadeSlideIn>

      {/* ── Completed Goals History ── */}
      <FadeSlideIn delay={380}>
      <View style={{ marginTop: 24, marginBottom: 16 }}>
        <Text style={[s.sectionTitle, { paddingHorizontal: 0, marginBottom: 12 }]}>Past Achievements</Text>
        {completedGoals.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <CheckCircle2 size={36} color="#CBD5E1" strokeWidth={1.5} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT_MID, marginTop: 12 }}>No completed goals yet</Text>
            <Text style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 4, textAlign: 'center' }}>Complete your first savings goal to unlock achievements!</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 90 }}>
            {completedGoals.map((goal: {id: number; name: string; amt: number; date: string}, index: number) => (
              <View key={goal.id} style={[s.card, { width: 140, padding: 12, backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ backgroundColor: '#10B981', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={14} color={WHITE} strokeWidth={3} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: TEXT_LIGHT }}>#{completedGoals.length - index}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 }} numberOfLines={1}>{goal.name}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981', marginBottom: 6 }}>₹{goal.amt.toLocaleString('en-IN')}</Text>
                <Text style={{ fontSize: 10, color: TEXT_LIGHT }}>{goal.date}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      </FadeSlideIn>
      <FilterSheet visible={showFilter} onClose={() => setShowFilter(false)} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ══════════════════════════════════════════════════════════════════════════════
function DonutChart({ breakdown, monthTotal }: { breakdown: any[]; monthTotal: number }) {
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  let startAngle = 0;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: size, marginVertical: 24 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size/2}, ${size/2}`}>
          {breakdown.map((cat, i) => {
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
        <Text style={{ fontSize: 24, fontWeight: '800', color: TEXT_DARK, marginTop: 2 }}>₹{monthTotal.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );
}

function CategoriesTab({ expenses, monthTotal, breakdown, navigation, selectedDate }: any) {
  const MAX = Math.max(...breakdown.map((c: any) => c.amount));
  return (
    <>
      <FadeSlideIn delay={0}>
      <View style={s.statRow}>
        <View style={s.statCell}><Text style={s.statVal}>₹{monthTotal.toLocaleString('en-IN')}</Text><Text style={s.statLbl}>Total</Text></View>
        <View style={s.statLine} />
        <View style={s.statCell}><Text style={s.statVal}>{breakdown.length}</Text><Text style={s.statLbl}>Categories</Text></View>
        <View style={s.statLine} />
        <View style={s.statCell}><Text style={[s.statVal, { color: breakdown.length > 0 ? (breakdown[0].color || '#EF5350') : '#EF5350' }]}>{breakdown.length > 0 ? breakdown[0].name : '--'}</Text><Text style={s.statLbl}>Top Spend</Text></View>
      </View>
      </FadeSlideIn>

      <FadeSlideIn delay={80}>
      <View style={s.card}>
        <Text style={s.cardTitle}>Spending Breakdown</Text>
        <DonutChart breakdown={breakdown} monthTotal={monthTotal} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8, marginBottom: 12 }}>
          {breakdown.map((cat: any) => (
            <View key={cat.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }} />
              <Text style={{ fontSize: 11, color: TEXT_MID, fontWeight: '600' }}>{cat.name}</Text>
            </View>
          ))}
        </View>
      </View>
      </FadeSlideIn>

      {breakdown.length > 0 && (
        <FadeSlideIn delay={160}>
        <View style={[s.card, { backgroundColor: WARN_BG, borderColor: WARN_BORDER, marginBottom: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Lightbulb size={16} color={WARN_COLOR} strokeWidth={2.5} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: WARN_COLOR }}>Smart Insight</Text>
          </View>
          <Text style={{ fontSize: 12, color: TEXT_DARK, lineHeight: 18, fontWeight: '500' }}>
            You spent <Text style={{ fontWeight: '800' }}>{breakdown[0].pct}%</Text> of your budget on <Text style={{ fontWeight: '800' }}>{breakdown[0].name}</Text> this month.
          </Text>
        </View>
        </FadeSlideIn>
      )}

      <FadeSlideIn delay={240}>
      <View style={s.txnCard}>
        {breakdown.map((cat: any, i: number) => {
          return (
            <TouchableOpacity key={cat.name} style={[s.txnRow, i < breakdown.length - 1 && s.txnDivider, { borderLeftWidth: 3, borderLeftColor: cat.color }]}
              onPress={() => navigation.navigate('CategoryDetail', { categoryName: cat.name, spent: cat.amount, totalPct: cat.pct, color: cat.color, bg: cat.bg, selectedDateStr: selectedDate.toISOString() })}
              activeOpacity={0.7}
            >
              <CategoryGlowBadge category={cat.name} size="md" entrance />
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
      </FadeSlideIn>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ══════════════════════════════════════════════════════════════════════════════
function TrendLine({ monthlyData }: { monthlyData: any[] }) {
  const max = Math.max(...monthlyData.map(d => d.amt), 1);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingTop: 20 }}>
      {monthlyData.map((d, i) => {
        const h = Math.max(12, (d.amt / max) * 110);
        const isCurrent = i === monthlyData.length - 1;
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

function WeeklyChart({ expenses }: { expenses: any[] }) {
  const weekData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, idx) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const offset = idx - (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Mon=0
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + offset);
    const dateStr = targetDate.toISOString().slice(0, 10);
    const amt = expenses.filter((e: any) => {
      try {
        const eDate = new Date(e.date_raw || '').toISOString().slice(0, 10);
        return eDate === dateStr;
      } catch { return false; }
    }).reduce((sum: number, e: any) => sum + e.amt, 0);
    const isToday = offset === 0;
    return { d, amt, isToday };
  });
  const max = Math.max(...weekData.map(d => d.amt), 1);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, paddingTop: 10 }}>
      {weekData.map((d, i) => {
        const h = Math.max(12, (d.amt / max) * 100);
        return (
          <View key={i} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: d.isToday ? BLUE : TEXT_LIGHT, fontWeight: '700', marginBottom: 6 }}>{d.amt > 0 ? d.amt : ''}</Text>
            <View style={{ width: 28, height: h, backgroundColor: d.isToday ? BLUE : BLUE_SOFT, borderRadius: 8 }} />
            <Text style={{ marginTop: 8, fontSize: 11, fontWeight: d.isToday ? '800' : '600', color: d.isToday ? BLUE : TEXT_MID }}>{d.d}</Text>
          </View>
        );
      })}
    </View>
  );
}

function AnalyticsTab({ expenses, monthTotal, monthlyData, maxAmt, breakdown }: any) {
  const prevAmt = monthlyData[4]?.amt || 0;
  const curAmt  = monthlyData[5]?.amt || 0;
  const mom = prevAmt > 0 ? ((curAmt - prevAmt) / prevAmt * 100).toFixed(1) : '0.0';
  const isUp = parseFloat(mom) > 0;
  const dailyAvg = Math.round(monthTotal / Math.max(new Date().getDate(), 1));
  const topThree = breakdown.slice(0, 3);

  return (
    <>
      <FadeSlideIn delay={0}>
      <View style={s.statRow}>
        <View style={s.statCell}><Text style={s.statVal}>₹{dailyAvg.toLocaleString('en-IN')}</Text><Text style={s.statLbl}>Daily Avg</Text></View>
        <View style={s.statLine} />
        <View style={s.statCell}><Text style={s.statVal}>₹{monthTotal > 0 ? (monthTotal / 1000).toFixed(1) + 'k' : '0'}</Text><Text style={s.statLbl}>This Month</Text></View>
        <View style={s.statLine} />
        <View style={s.statCell}><Text style={[s.statVal, { color: isUp ? DANGER : SUCCESS }]}>{isUp ? '↑' : '↓'} {Math.abs(parseFloat(mom))}%</Text><Text style={s.statLbl}>Trend</Text></View>
      </View>
      </FadeSlideIn>

      <FadeSlideIn delay={80}>
      <Text style={[s.sectionTitle, { marginBottom: 10 }]}>6-Month Trend</Text>
      <View style={[s.card, { marginBottom: 16 }]}>
        <TrendLine monthlyData={monthlyData} />
      </View>
      </FadeSlideIn>

      <FadeSlideIn delay={160}>
      <Text style={[s.sectionTitle, { marginBottom: 10 }]}>This Week's Activity</Text>
      <View style={[s.card, { marginBottom: 16 }]}>
        <WeeklyChart expenses={expenses} />
      </View>
      </FadeSlideIn>

      <FadeSlideIn delay={240}>
      <Text style={[s.sectionTitle, { marginBottom: 10 }]}>Where your money goes</Text>
      <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
        {topThree.length > 0 ? topThree.map((cat: any, i: number) => (
          <View key={cat.name} style={[s.txnRow, i < topThree.length - 1 && s.txnDivider, { padding: 16 }]}>
            <CategoryGlowBadge category={cat.name} size="sm" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT_DARK }}>{cat.name}</Text>
              <Text style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 2 }}>{cat.pct}% of total</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT_DARK }}>₹{cat.amount.toLocaleString('en-IN')}</Text>
          </View>
        )) : (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: TEXT_LIGHT, fontWeight: '500' }}>No spending data yet</Text>
          </View>
        )}
      </View>
      </FadeSlideIn>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 16, paddingBottom: 220, paddingTop: 4 },

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
  trendRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
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
  card: { backgroundColor: WHITE, borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
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
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER },
  chipActive: { backgroundColor: BLUE, borderColor: BLUE },
  chipTxt:    { fontSize: 12, fontWeight: '600', color: TEXT_LIGHT },
  chipTxtActive:{ color: WHITE, fontWeight: '700' },

  // Transaction card
  txnCard:    { backgroundColor: WHITE, borderRadius: 20, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: BORDER },
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
  statRow:  { flexDirection: 'row', backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
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

  momRow:   { flexDirection: 'row', backgroundColor: WHITE, borderRadius: 14, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  momCell:  { flex: 1, alignItems: 'center' },
  momMonth: { fontSize: 11, color: TEXT_MID, fontWeight: '600', marginBottom: 3 },
  momDelta: { fontSize: 13, fontWeight: '800' },

  // FAB
  fab: { position: 'absolute', bottom: 130, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', shadowColor: BLUE_DARK, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10 },

  // Overview Card style
  overviewCard: { backgroundColor: WHITE, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: BORDER },
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
