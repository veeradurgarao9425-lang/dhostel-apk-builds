/**
 * OwnerAssistant.tsx  (v2 — redesigned)
 *
 * Layout:
 *  ┌──────────────────────────────────┐
 *  │  Header (HOSTIX + close)         │
 *  ├──────────────────────────────────┤
 *  │                                  │
 *  │   Greeting / Snapshot cards      │
 *  │   Quick question chips           │
 *  │   ── OR ──                       │
 *  │   Bot response blocks            │
 *  │                                  │
 *  ├──────────────────────────────────┤
 *  │ [≡]  Ask me anything...    [➤]  │
 *  └──────────────────────────────────┘
 *
 *  Tapping [≡] slides in a narrow left drawer with categories.
 *  Every tap on a category / question resolves an intent and
 *  renders the response in the main scroll area.
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Platform, KeyboardAvoidingView, TextInput,
  Animated, Image, DeviceEventEmitter, Dimensions, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../contexts/AuthContext';
import * as RootNavigation from '../../navigation/navigationRef';
import { AssistantResponse, ContentBlock } from './AssistantResponse';
import {
  resolveIntent, AssistantIntent, QUICK_QUESTIONS,
  HOW_TO_STEPS,
} from './intentEngine';
import {
  fetchDashboardSnapshot, fetchDuesSummary, fetchFinancialOverview,
  fetchOccupancy, fetchStudents, fetchExpenseSummary,
  DashboardSnapshot,
} from './assistantApi';

const INR = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

// ─── Time greeting ─────────────────────────────────────────────────────────
function getGreeting(name?: string) {
  const h = new Date().getHours();
  const first = name?.split(' ')[0] || '';
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return first ? `${g}, ${first} 👋` : `${g} 👋`;
}

// ─── Bouncing dots (typing indicator) ─────────────────────────────────────
const BouncingDots = () => {
  const anims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    anims.forEach((a, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(a, { toValue: -5, duration: 260, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 260, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: '#94A3B8', marginHorizontal: 3,
            transform: [{ translateY: a }],
          }}
        />
      ))}
    </View>
  );
};

// ─── Message type ──────────────────────────────────────────────────────────
interface Msg {
  id: string;
  sender: 'bot' | 'user';
  text?: string;
  blocks?: ContentBlock[];
}

// ─── Home content (greeting + snapshot + questions) ────────────────────────
interface HomeProps {
  snap: DashboardSnapshot | null;
  loading: boolean;
  onQuestion: (q: string) => void;
  onIntent: (i: AssistantIntent) => void;
}
const HomeContent: React.FC<HomeProps> = ({ snap, loading, onQuestion, onIntent }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[hc.scroll, { paddingBottom: 24 + Math.max(insets.bottom, 10) }]}
    >
      {/* Greeting */}
      <Text style={hc.greeting}>{getGreeting(user?.full_name || user?.name)}</Text>
      <Text style={hc.sub}>{user?.hostel_name || 'Your Hostel'} · How can I help you today?</Text>

      {/* Rounded outline guide options */}
      <View style={{ gap: 10, marginBottom: 12 }}>
        <TouchableOpacity 
          style={hc.outlinePillBtn}
          onPress={() => onQuestion("How do I collect rent?")}
          activeOpacity={0.7}
        >
          <Text style={hc.outlinePillBtnText}>How to collect rent?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={hc.outlinePillBtn}
          onPress={() => onQuestion("How do I add a student?")}
          activeOpacity={0.7}
        >
          <Text style={hc.outlinePillBtnText}>How to add a student?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={hc.outlinePillBtn}
          onPress={() => onQuestion("How do I create a room?")}
          activeOpacity={0.7}
        >
          <Text style={hc.outlinePillBtnText}>How to create a room?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={hc.outlinePillBtn}
          onPress={() => onQuestion("How do I vacate a bed?")}
          activeOpacity={0.7}
        >
          <Text style={hc.outlinePillBtnText}>How to vacate a bed?</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const hc = StyleSheet.create({
  scroll: { padding: 16, gap: 16, paddingBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3, marginBottom: 4 },
  sub: { fontSize: 13, color: '#94A3B8', fontWeight: '500', marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 10 },
  qChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  qText: { flex: 1, fontSize: 13, color: '#334155', fontWeight: '500' },
  
  horizontalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 4,
  },
  horizontalChipText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },
  welcomeCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  welcomeBanner: {
    paddingVertical: 12,
  },
  welcomeTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  welcomeSubtitle: {
    color: '#E0E7FF',
    fontSize: 12,
    marginTop: 2,
  },
  welcomeBotImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  welcomeContent: {
    padding: 16,
    backgroundColor: '#FCFCFD',
  },
  welcomeContentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 6,
  },
  welcomeInstructionText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  welcomeButtonsContainer: {
    gap: 8,
  },
  outlinePillBtn: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#4F46E5',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinePillBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
});

// ─── Main Component ────────────────────────────────────────────────────────
export const OwnerAssistant: React.FC = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<string | null>(null);

  // Content state
  const [view, setView] = useState<'home' | 'conversation'>('home');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Snapshot data for home screen
  const [snap, setSnap] = useState<DashboardSnapshot | null>(null);
  const [snapLoading, setSnapLoading] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const msgId = useRef(0);

  const menuItems = useMemo(() => {
    return [
      { label: 'Add Student', path: 'AddStudent', icon: 'person-add-outline', color: '#4F46E5', bg: '#EEF2FF' },
      { label: 'Add Room', path: 'AddRoom', icon: 'bed-outline', color: '#059669', bg: '#ECFDF5' },
      { label: 'Add Staff', path: 'AddStaff', icon: 'people-outline', color: '#DB2777', bg: '#FDF2F8' },
      { label: 'Add Expense', path: 'AddExpense', icon: 'receipt-outline', color: '#DC2626', bg: '#FEF2F2' },
      { label: 'Add Income', path: 'AddIncome', icon: 'cash-outline', color: '#16A34A', bg: '#F0FDF4' },
      { label: 'Add Notice', path: 'AddNotice', icon: 'megaphone-outline', color: '#EA580C', bg: '#FFF7ED' },
    ];
  }, []);

  const handleLinkClick = (path: string) => {
    RootNavigation.navigate(path);
    setIsOpen(false);
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('TOUR_STATE_CHANGE', setIsTourActive);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (RootNavigation.navigationRef.isReady()) {
        setCurrentRoute(RootNavigation.navigationRef.getCurrentRoute()?.name || null);
      }
    }, 500);
    const unsub = RootNavigation.navigationRef.addListener?.('state', () => {
      setCurrentRoute(RootNavigation.navigationRef.getCurrentRoute()?.name || null);
    });
    return () => { clearTimeout(t); unsub?.(); };
  }, []);

  useEffect(() => {
    if (isOpen && user?.role !== 'TENANT') {
      loadSnap();
    }
  }, [isOpen]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [messages, isTyping]);

  const loadSnap = async () => {
    setSnapLoading(true);
    try { setSnap(await fetchDashboardSnapshot()); }
    catch { }
    finally { setSnapLoading(false); }
  };

  // ── Position ───────────────────────────────────────────────────────────
  const isFormPage = useMemo(() => {
    if (!currentRoute) return false;
    return (
      currentRoute.startsWith('Add') ||
      currentRoute.includes('Details') ||
      currentRoute === 'Settings' ||
      currentRoute === 'Profile' ||
      currentRoute === 'QRSignup' ||
      currentRoute === 'PreBooking'
    );
  }, [currentRoute]);

  const fabPos = useMemo(() => {
    const listPages = ['Students', 'Rooms', 'Expenses', 'Staff', 'Guests',
      'StaffPayments', 'Reminders', 'IncomeDetails', 'Hostels', 'Notices',
      'NoticesManagement', 'InCome'];
    return currentRoute && listPages.includes(currentRoute)
      ? { bottom: 110, right: 24 } : { bottom: 140, right: 24 };
  }, [currentRoute]);

  // ── Message helpers ────────────────────────────────────────────────────
  const nid = () => `m${++msgId.current}`;

  const addUser = (text: string) =>
    setMessages(p => [...p.map(m => ({ ...m })), { id: nid(), sender: 'user' as const, text }]);

  const addBot = (blocks: ContentBlock[]) =>
    setMessages(p => [...p, { id: nid(), sender: 'bot' as const, blocks }]);

  const removeLoadingBlock = () =>
    setMessages(p => p.filter(m => !(m.blocks?.length === 1 && m.blocks[0].type === 'loading')));

  const typingThen = (blocks: ContentBlock[]) => {
    setIsTyping(true);
    setTimeout(() => { setIsTyping(false); addBot(blocks); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { }); }, 700);
  };

  // ── Intent handler ─────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleIntent = useCallback(async (intent: AssistantIntent) => {
    setView('conversation');

    switch (intent.type) {
      case 'SHOW_HOME':
        setMessages([]);
        setView('home');
        break;

      case 'SHOW_STUDENTS': {
        addBot([{ type: 'loading' }]);
        const students = await fetchStudents(10);
        removeLoadingBlock();
        if (!students.length) {
          addBot([{ type: 'empty_state', icon: 'people-outline', message: 'No Students Yet', subMessage: 'Add your first student to get started.', action: { label: 'Add Student', screen: 'AddStudent' } }]);
        } else {
          addBot([
            { type: 'text', text: `You have ${snap?.activeTenants ?? students.length} active students.` },
            {
              type: 'stat_cards', cards: [
                { label: 'Active', value: String(snap?.activeTenants ?? students.length), icon: 'people-outline', color: '#4F46E5', bg: '#EEF2FF' },
                { label: 'Available Beds', value: String(snap?.availableBeds ?? 0), icon: 'bed-outline', color: '#10B981', bg: '#ECFDF5' },
              ]
            },
            {
              type: 'action_buttons', buttons: [
                { label: 'View Students', icon: 'people-outline', screen: 'Students', variant: 'primary' },
                { label: 'Add Student', icon: 'person-add-outline', screen: 'AddStudent', variant: 'outline' },
                { label: 'Pending Dues', icon: 'alert-circle-outline', screen: 'PendingPayments', variant: 'outline' },
              ]
            },
          ]);
        }
        break;
      }

      case 'SHOW_DUES': {
        addBot([{ type: 'loading' }]);
        const dues = await fetchDuesSummary();
        removeLoadingBlock();
        if (!dues || dues.totalPending === 0) {
          addBot([{ type: 'empty_state', icon: 'checkmark-circle-outline', message: 'No Pending Dues 🎉', subMessage: 'All students are up to date.', action: { label: 'View Payment History', screen: 'CollectedPayments' } }]);
        } else {
          const list = intent.filter === 'overdue'
            ? dues.topDefaulters.filter(d => d.status === 'overdue')
            : dues.topDefaulters;
          addBot([
            {
              type: 'text', text: intent.filter === 'overdue'
                ? `${dues.overdueCount} overdue — ${INR(dues.overdueAmount)} total.`
                : `${dues.pendingStudents} students owe a total of ${INR(dues.totalPending)}.`
            },
            {
              type: 'stat_cards', cards: [
                { label: 'Total Pending', value: INR(dues.totalPending), icon: 'alert-circle-outline', color: '#EF4444', bg: '#FEF2F2' },
                { label: 'Students', value: String(dues.pendingStudents), icon: 'people-outline', color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Overdue', value: String(dues.overdueCount), icon: 'time-outline', color: '#DC2626', bg: '#FFF1F2' },
                { label: 'Paid', value: String(dues.paidCount), icon: 'checkmark-circle-outline', color: '#10B981', bg: '#ECFDF5' },
              ]
            },
            ...(list.length ? [{ type: 'due_list' as const, dues: list }] : []),
            {
              type: 'action_buttons', buttons: [
                { label: 'View All Dues', icon: 'list-outline', screen: 'PendingPayments', variant: 'primary' },
                { label: 'Collect Payment', icon: 'cash-outline', screen: 'FeeManagement', variant: 'outline' },
                { label: 'Send Reminders', icon: 'notifications-outline', screen: 'Reminders', variant: 'outline' },
              ]
            },
          ]);
        }
        break;
      }

      case 'SHOW_ROOMS': {
        addBot([{ type: 'loading' }]);
        const occ = await fetchOccupancy();
        removeLoadingBlock();
        if (!occ || occ.total === 0) {
          addBot([{ type: 'empty_state', icon: 'business-outline', message: 'No Rooms Found', subMessage: 'Add your first room.', action: { label: 'Add Room', screen: 'AddRoom' } }]);
        } else {
          addBot([
            { type: 'occupancy_bar', occupied: occ.occupied, available: occ.available, total: occ.total, rate: occ.rate },
            {
              type: 'stat_cards', cards: [
                { label: 'Occupied', value: String(occ.occupied), icon: 'people-outline', color: '#4F46E5', bg: '#EEF2FF' },
                { label: 'Available', value: String(occ.available), icon: 'bed-outline', color: '#10B981', bg: '#ECFDF5' },
                { label: 'Total Beds', value: String(occ.total), icon: 'grid-outline', color: '#64748B', bg: '#F8FAFC' },
              ]
            },
            {
              type: 'action_buttons', buttons: [
                { label: 'View Rooms', icon: 'business-outline', screen: 'Rooms', variant: 'primary' },
                { label: 'Add Room', icon: 'add-circle-outline', screen: 'AddRoom', variant: 'outline' },
              ]
            },
          ]);
        }
        break;
      }

      case 'SHOW_PAYMENTS':
        typingThen([
          {
            type: 'stat_cards', cards: [
              { label: 'This Month', value: INR(snap?.monthCollection ?? 0), icon: 'wallet-outline', color: '#4F46E5', bg: '#EEF2FF' },
              { label: 'Pending', value: INR(snap?.pendingDues ?? 0), icon: 'alert-circle-outline', color: '#EF4444', bg: '#FEF2F2' },
            ]
          },
          {
            type: 'action_buttons', buttons: [
              { label: 'Collected Payments', icon: 'checkmark-circle-outline', screen: 'CollectedPayments', variant: 'primary' },
              { label: 'Pending Dues', icon: 'time-outline', screen: 'PendingPayments', variant: 'outline' },
              { label: 'Download Receipts', icon: 'download-outline', screen: 'DownloadReceipts', variant: 'outline' },
            ]
          },
        ]);
        break;

      case 'SHOW_REPORTS': {
        addBot([{ type: 'loading' }]);
        const fin = await fetchFinancialOverview();
        removeLoadingBlock();
        if (!fin) {
          addBot([{ type: 'error_state', message: 'Could not load financial data.', onRetry: () => handleIntent(intent) }]);
        } else {
          addBot([
            { type: 'financial_summary', income: fin.income, expenses: fin.expenses, net: fin.net, pending: fin.pendingDues, collectionRate: fin.collectionRate },
            ...(fin.trend.length >= 2 ? [{ type: 'trend_chart' as const, data: fin.trend }] : []),
            {
              type: 'action_buttons', buttons: [
                { label: 'Full Reports', icon: 'bar-chart-outline', screen: 'Reports', variant: 'primary' },
                { label: 'Income', icon: 'trending-up-outline', screen: 'Income', variant: 'outline' },
                { label: 'Expenses', icon: 'card-outline', screen: 'Expenses', variant: 'outline' },
              ]
            },
          ]);
        }
        break;
      }

      case 'SHOW_EXPENSES': {
        addBot([{ type: 'loading' }]);
        const exp = await fetchExpenseSummary();
        removeLoadingBlock();
        if (!exp || exp.count === 0) {
          addBot([{ type: 'empty_state', icon: 'card-outline', message: 'No Expenses This Month', subMessage: 'Start recording your hostel expenses.', action: { label: 'Add Expense', screen: 'AddExpense' } }]);
        } else {
          addBot([
            {
              type: 'stat_cards', cards: [
                { label: 'Total Spent', value: INR(exp.totalThisMonth), icon: 'card-outline', color: '#EC4899', bg: '#FDF2F8' },
                { label: 'Entries', value: String(exp.count), icon: 'list-outline', color: '#64748B', bg: '#F8FAFC' },
              ]
            },
            {
              type: 'action_buttons', buttons: [
                { label: 'View Expenses', icon: 'card-outline', screen: 'Expenses', variant: 'primary' },
                { label: 'Add Expense', icon: 'add-circle-outline', screen: 'AddExpense', variant: 'outline' },
                { label: 'Bill Reminders', icon: 'document-text-outline', screen: 'BillReminders', variant: 'outline' },
              ]
            },
          ]);
        }
        break;
      }

      case 'SHOW_INCOME':
        typingThen([
          {
            type: 'action_buttons', buttons: [
              { label: 'View Income', icon: 'trending-up-outline', screen: 'Income', variant: 'primary' },
              { label: 'Add Income', icon: 'add-circle-outline', screen: 'AddIncome', variant: 'outline' },
            ]
          },
        ]);
        break;

      case 'SHOW_STAFF':
        typingThen([
          { type: 'text', text: 'Manage your hostel staff — wardens, cleaners, and security.' },
          {
            type: 'action_buttons', buttons: [
              { label: 'View Staff', icon: 'briefcase-outline', screen: 'Staff', variant: 'primary' },
              { label: 'Add Staff', icon: 'person-add-outline', screen: 'AddStaff', variant: 'outline' },
              { label: 'Staff Payments', icon: 'wallet-outline', screen: 'StaffPayments', variant: 'outline' },
            ]
          },
        ]);
        break;

      case 'SHOW_BILLS':
        typingThen([
          {
            type: 'action_buttons', buttons: [
              { label: 'Bill Reminders', icon: 'document-text-outline', screen: 'BillReminders', variant: 'primary' },
              { label: 'Add Expense', icon: 'add-outline', screen: 'AddExpense', variant: 'outline' },
            ]
          },
        ]);
        break;

      case 'SHOW_GUESTS':
        typingThen([
          {
            type: 'action_buttons', buttons: [
              { label: 'View Guests', icon: 'person-outline', screen: 'Guests', variant: 'primary' },
              { label: 'Add Guest', icon: 'person-add-outline', screen: 'AddGuest', variant: 'outline' },
            ]
          },
        ]);
        break;

      case 'SHOW_NOTICES':
        typingThen([
          {
            type: 'action_buttons', buttons: [
              { label: 'Manage Notices', icon: 'megaphone-outline', screen: 'NoticesManagement', variant: 'primary' },
              { label: 'Add Notice', icon: 'add-circle-outline', screen: 'AddNotice', variant: 'outline' },
            ]
          },
        ]);
        break;

      case 'SHOW_HOW_TO': {
        const guide = HOW_TO_STEPS[intent.action];
        if (guide) {
          typingThen([{ type: 'steps', title: guide.title, steps: guide.steps, screen: guide.screen, screenLabel: guide.screenLabel }]);
        }
        break;
      }

      case 'UNKNOWN':
        typingThen([
          { type: 'text', text: `I'm not sure about that. Try one of these:` },
          {
            type: 'action_buttons', buttons: [
              { label: 'Pending Dues', icon: 'alert-circle-outline', variant: 'outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'all' }) },
              { label: 'Students', icon: 'people-outline', variant: 'outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS' }) },
              { label: 'Reports', icon: 'bar-chart-outline', variant: 'outline', onPress: () => handleIntent({ type: 'SHOW_REPORTS' }) },
            ]
          },
        ]);
        break;
    }
  }, [snap]);

  // ── Query from input ───────────────────────────────────────────────────
  const handleQuery = useCallback((text: string) => {
    if (!text.trim()) return;
    inputRef.current?.blur();
    addUser(text);
    setInputText('');
    handleIntent(resolveIntent(text));
  }, [handleIntent]);

  // ── Reset ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    setMessages([]);
    setView('home');
    setInputText('');
    loadSnap();
  };

  // Only owners
  if (!user || user.role === 'TENANT' || isTourActive) return null;

  return (
    <>
      {/* FAB */}
      {!isOpen && !isFormPage && (
        <TouchableOpacity
          style={[s.fab, fabPos]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { }); setIsOpen(true); }}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#818CF8', '#4F46E5']} style={s.fabGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Modal visible={isOpen} transparent={false} animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <SafeAreaView style={s.safe} edges={['top']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

            {/* ── Header ── */}
            <LinearGradient colors={['#312E81', '#4338CA']} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={s.headerLeft}>
                <View style={s.avatarBox}>
                  <Image
                    source={require('../../../assets/durgarao-bot.jpeg')}
                    style={s.avatarImg}
                    resizeMode="cover"
                  />
                  <View style={s.onlineDot} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.headerTitle}>HOSTIX Assistant</Text>
                  <Text style={s.headerSub} numberOfLines={1}>{user?.hostel_name || 'Your Hostel'}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {view === 'conversation' && (
                  <TouchableOpacity style={s.iconBtn} onPress={handleReset}>
                    <Ionicons name="home-outline" size={20} color="#C7D2FE" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.iconBtn} onPress={() => setIsOpen(false)}>
                  <Ionicons name="close" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* ── Main content area ── */}
            <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
              {view === 'home' ? (
                <HomeContent
                  snap={snap}
                  loading={snapLoading}
                  onQuestion={handleQuery}
                  onIntent={(i) => { setMessages([]); handleIntent(i); }}
                />
              ) : (
                <ScrollView
                  ref={scrollRef}
                  style={{ flex: 1 }}
                  contentContainerStyle={[s.msgList, { paddingBottom: 20 + Math.max(insets.bottom, 10) }]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {messages.map(msg => (
                    <View key={msg.id}>
                      {msg.sender === 'user' ? (
                        <View style={s.userRow}>
                          <View style={s.userBubble}>
                            <Text style={s.userText}>{msg.text}</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={s.botRow}>
                          <View style={[s.botBubble, { flex: 1 }]}>
                            {msg.blocks && <AssistantResponse blocks={msg.blocks} />}
                          </View>
                        </View>
                      )}
                    </View>
                  ))}

                  {isTyping && (
                    <View style={s.botRow}>
                      <View style={s.botBubble}><BouncingDots /></View>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>

            {/* ── Quick questions scrolling tabs above input bar ── */}
            <View style={{ backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingVertical: 8 }}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12 }}
              >
                {QUICK_QUESTIONS.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.quickChipBtn}
                    onPress={() => { Haptics.selectionAsync().catch(() => { }); handleQuery(q); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="sparkles-outline" size={12} color="#4338CA" style={{ marginRight: 4 }} />
                    <Text style={s.quickChipBtnText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* ── Bottom input bar ── */}
            <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 10), gap: 8, borderTopWidth: 0 }]}>
              {/* Hamburger Menu Button */}
              <TouchableOpacity 
                onPress={() => setIsAddMenuOpen(true)}
                style={{ padding: 4 }}
                activeOpacity={0.7}
              >
                <Ionicons name="menu-outline" size={28} color="#4338CA" />
              </TouchableOpacity>

              {/* Search / input */}
              <View style={s.inputWrap}>
                <TextInput
                  ref={inputRef}
                  style={s.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask me anything..."
                  placeholderTextColor="#94A3B8"
                  returnKeyType="send"
                  onSubmitEditing={() => handleQuery(inputText)}
                  multiline={false}
                />
              </View>

              {/* Send button */}
              <TouchableOpacity
                style={[s.sendBtn, { opacity: inputText.trim() ? 1 : 0.4 }]}
                onPress={() => handleQuery(inputText)}
                activeOpacity={0.75}
                disabled={!inputText.trim()}
              >
                <Ionicons name="send" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>

          </KeyboardAvoidingView>

          {/* Add Menu Pop-up Overlay */}
          {isAddMenuOpen && (
            <TouchableOpacity
              style={s.overlayBackground}
              activeOpacity={1}
              onPress={() => setIsAddMenuOpen(false)}
            >
              <View style={s.popupMenuCard}>
                <Text style={s.popupMenuTitle}>Quick Actions</Text>
                <View style={s.popupMenuGrid}>
                  {menuItems.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={s.popupMenuItem}
                      onPress={() => {
                        setIsAddMenuOpen(false);
                        handleLinkClick(item.path);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[s.popupMenuIconContainer, { backgroundColor: item.bg }]}>
                        <Ionicons name={item.icon as any} size={22} color={item.color} />
                      </View>
                      <Text style={s.popupMenuItemText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={s.popupMenuCloseBtn}
                  onPress={() => setIsAddMenuOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={s.popupMenuCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

        </SafeAreaView>
      </Modal>
    </>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  /* FAB */
  fab: {
    position: 'absolute',
    width: 56, height: 56, borderRadius: 28,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#4F46E5', shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  fabGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Modal */
  safe: { flex: 1, backgroundColor: '#312E81' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: {
    width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#E0E7FF', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative',
  },
  avatarImg: { width: '100%', height: '100%', transform: [{ scale: 1.8 }, { translateY: 4 }] },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#4ADE80', borderWidth: 1.5, borderColor: '#FFF',
  },
  headerTitle: { color: '#FFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
  headerSub: { color: '#A5B4FC', fontSize: 11, fontWeight: '500' },
  iconBtn: { padding: 6, borderRadius: 8 },

  /* Messages */
  msgList: { padding: 14, gap: 14, paddingBottom: 20 },
  userRow: { alignItems: 'flex-end' },
  userBubble: {
    backgroundColor: '#4338CA', borderRadius: 18, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: '78%',
  },
  userText: { color: '#FFF', fontSize: 14, fontWeight: '500', lineHeight: 20 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  botAvatar: {
    width: 28, height: 28, borderRadius: 14, overflow: 'hidden',
    backgroundColor: '#E0E7FF', marginTop: 4, flexShrink: 0,
  },
  botBubble: {
    backgroundColor: '#FFF', borderRadius: 18, borderTopLeftRadius: 4,
    padding: 14,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },

  /* Bottom input bar */
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 22, paddingHorizontal: 14, minHeight: 42,
  },
  input: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '500', paddingVertical: Platform.OS === 'ios' ? 8 : 4 },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#4338CA', alignItems: 'center', justifyContent: 'center',
  },
  quickChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickChipBtnText: {
    fontSize: 12,
    color: '#4338CA',
    fontWeight: '600',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  popupMenuCard: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  popupMenuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  popupMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  popupMenuItem: {
    width: '47%',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  popupMenuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  popupMenuItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  popupMenuCloseBtn: {
    marginTop: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  popupMenuCloseText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
});

export default OwnerAssistant;
