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
  StatusBar,
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
  HOW_TO_STEPS, INFO_QUESTIONS, GUIDE_QUESTIONS,
} from './intentEngine';
import {
  fetchDashboardSnapshot, fetchDuesSummary, fetchFinancialOverview,
  fetchOccupancy, fetchStudents, fetchExpenseSummary, fetchMyHostels,
  switchActiveHostel, fetchStaffList, fetchGuestsList, fetchStudentStats,
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
      <Text style={hc.sub}>{user?.hostel_name || 'Your Hostel'}</Text>

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

      {/* Suggested Topics / Shortcuts Section */}
      <Text style={hc.sectionLabel}>Suggested Shortcuts</Text>
      <View style={{ gap: 10 }}>
        <TouchableOpacity
          style={hc.shortcutCard}
          onPress={() => onQuestion("What is my hostel occupancy?")}
          activeOpacity={0.7}
        >
          <View style={[hc.shortcutIconBg, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="business-outline" size={16} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={hc.shortcutTitle}>Check Hostel Occupancy</Text>
            <Text style={hc.shortcutDesc}>See how many beds are occupied or available</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={hc.shortcutCard}
          onPress={() => onQuestion("What are my this month's expenses?")}
          activeOpacity={0.7}
        >
          <View style={[hc.shortcutIconBg, { backgroundColor: '#FDF2F8' }]}>
            <Ionicons name="receipt-outline" size={16} color="#DB2777" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={hc.shortcutTitle}>Analyze Expenses</Text>
            <Text style={hc.shortcutDesc}>View total spent and expense categories this month</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={hc.shortcutCard}
          onPress={() => onQuestion("Who hasn't paid this month?")}
          activeOpacity={0.7}
        >
          <View style={[hc.shortcutIconBg, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={hc.shortcutTitle}>Review Pending Payments</Text>
            <Text style={hc.shortcutDesc}>See which students still owe monthly rent</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
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
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 8,
  },
  profileCardHeader: {
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
  },
  profileImg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#EEF2FF',
    marginBottom: 8,
  },
  profileAppName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  profileAppSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  profileCardContent: {
    width: '100%',
  },
  profileContentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  profileInstructionText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    textAlign: 'center',
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
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 12,
  },
  shortcutIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  shortcutDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});

// ─── Main Component ────────────────────────────────────────────────────────
export const OwnerAssistant: React.FC = () => {
  const { user, updateTokenAndUser } = useAuth();
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
  const [isFocused, setIsFocused] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  // Snapshot data for home screen
  const [snap, setSnap] = useState<DashboardSnapshot | null>(null);
  const [snapLoading, setSnapLoading] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const msgId = useRef(0);

  const menuItems = useMemo(() => {
    return [
      { label: 'Pending Dues', intent: { type: 'SHOW_DUES', filter: 'pending' } as AssistantIntent, icon: 'alert-circle-outline', color: '#EF4444', bg: '#FEE2E2' },
      { label: 'Students', intent: { type: 'SHOW_STUDENTS' } as AssistantIntent, icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
      { label: 'Reports', intent: { type: 'SHOW_REPORTS' } as AssistantIntent, icon: 'bar-chart-outline', color: '#10B981', bg: '#ECFDF5' },
      { label: 'Expenses', intent: { type: 'SHOW_EXPENSES' } as AssistantIntent, icon: 'receipt-outline', color: '#F43F5E', bg: '#FFE4E6' },
      { label: 'Rooms', intent: { type: 'SHOW_ROOMS' } as AssistantIntent, icon: 'business-outline', color: '#F59E0B', bg: '#FEF3C7' },
      { label: 'Hostels', intent: { type: 'SHOW_HOSTELS' } as AssistantIntent, icon: 'swap-horizontal-outline', color: '#0EA5E9', bg: '#E0F2FE' },
      { label: 'Guests', intent: { type: 'SHOW_GUESTS' } as AssistantIntent, icon: 'walk-outline', color: '#8B5CF6', bg: '#F5F3FF' },
      { label: 'Staff', intent: { type: 'SHOW_STAFF' } as AssistantIntent, icon: 'briefcase-outline', color: '#14B8A6', bg: '#E6FFFA' },
    ];
  }, []);

  const handleLinkClick = (path: string) => {
    RootNavigation.navigate(path);
    setIsOpen(false);
  };

  const handleSwitchHostel = async (hostelId: number, hostelName: string) => {
    addBot([{ type: 'loading' }]);
    try {
      const data = await switchActiveHostel(hostelId);
      removeLoadingBlock();
      if (data?.success) {
        const { token } = data.data;
        await updateTokenAndUser(token, { hostel_id: hostelId, hostel_name: hostelName });
        addBot([
          { type: 'text', text: `Successfully switched active hostel PG to: **${hostelName}** 🎉` },
          {
            type: 'action_buttons', buttons: [
              { label: 'Check Occupancy', icon: 'business-outline', onPress: () => handleIntent({ type: 'SHOW_ROOMS' }), variant: 'primary' },
              { label: 'Check Dues', icon: 'alert-circle-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'all' }), variant: 'outline' },
            ]
          }
        ]);
      } else {
        addBot([{ type: 'text', text: `Failed to switch active hostel: ${data?.error || 'Unknown error'}` }]);
      }
    } catch (err) {
      removeLoadingBlock();
      addBot([{ type: 'text', text: 'Error switching active hostel context. Please try again.' }]);
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardActive(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardActive(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── Lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('TOUR_STATE_CHANGE', setIsTourActive);
    const closeSub = DeviceEventEmitter.addListener('CLOSE_ASSISTANT', () => {
      setIsOpen(false);
    });
    return () => {
      sub.remove();
      closeSub.remove();
    };
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
        try {
          const [stats, dues] = await Promise.all([
            fetchStudentStats(),
            fetchDuesSummary()
          ]);
          removeLoadingBlock();

          const filter = (intent as any).filter || 'all';
          const activeCount  = stats.active || snap?.activeTenants || 0;
          const leftCount    = stats.inactive || 0;
          const prebookedCount = stats.prebooked || 0;
          const qrCount      = stats.qrRegister || 0;
          const unallocated  = stats.unallocated || 0;
          const pendingAdm   = stats.pendingAdmissions || 0;
          const paidCount    = dues?.paidCount ?? 0;
          const unpaidCount  = dues?.pendingStudents ?? 0;

          // Shared follow-up chips for all filters
          const followUpChips = [
            { label: '✅ Active', icon: 'people-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS', filter: 'active' }) },
            { label: '🚪 Left', icon: 'exit-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS', filter: 'inactive' }) },
            { label: '📅 Pre-booked', icon: 'calendar-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS', filter: 'prebooked' }) },
            { label: '📷 QR Reg.', icon: 'qr-code-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS', filter: 'qr' }) },
            { label: '⏳ Pending', icon: 'hourglass-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS', filter: 'pending' }) },
            { label: '🛏️ Unallocated', icon: 'bed-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS', filter: 'unallocated' }) },
            { label: '💰 Dues', icon: 'alert-circle-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'all' }) },
          ];

          if (filter === 'active') {
            addBot([
              { type: 'info_tip', text: 'Students currently checked in and occupying a bed in your hostel.', icon: 'people-outline', color: '#6366F1' },
              { type: 'stat_cards', cards: [
                { label: 'Active Students', value: String(activeCount), icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
                { label: 'Paid Rent', value: String(paidCount), icon: 'checkmark-circle-outline', color: '#10B981', bg: '#ECFDF5' },
                { label: 'Unpaid Rent', value: String(unpaidCount), icon: 'alert-circle-outline', color: '#EF4444', bg: '#FEF2F2' },
              ]},
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
              { type: 'action_buttons', buttons: [
                { label: 'View Students', icon: 'list-outline', screen: 'Students', variant: 'primary' },
                { label: 'Pending Dues', icon: 'alert-circle-outline', screen: 'PendingPayments', variant: 'outline' },
              ]},
            ]);
          } else if (filter === 'inactive') {
            addBot([
              { type: 'info_tip', text: 'Students who have moved out or been marked as vacated.', icon: 'exit-outline', color: '#94A3B8' },
              { type: 'stat_cards', cards: [
                { label: 'Students Left', value: String(leftCount), icon: 'exit-outline', color: '#94A3B8', bg: '#F8FAFC' },
                { label: 'Still Active', value: String(activeCount), icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
              ]},
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
              { type: 'action_buttons', buttons: [
                { label: 'View Students', icon: 'list-outline', screen: 'Students', variant: 'primary' },
              ]},
            ]);
          } else if (filter === 'prebooked') {
            addBot([
              { type: 'info_tip', text: 'Upcoming students who pre-booked a bed but have not checked in yet.', icon: 'calendar-outline', color: '#F59E0B' },
              { type: 'stat_cards', cards: [
                { label: 'Pre-Booked', value: String(prebookedCount), icon: 'calendar-outline', color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Active Now', value: String(activeCount), icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
              ]},
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
              { type: 'action_buttons', buttons: [
                { label: 'Go to Pre-Booking', icon: 'calendar-outline', screen: 'PreBooking', variant: 'primary' },
              ]},
            ]);
          } else if (filter === 'qr') {
            addBot([
              { type: 'info_tip', text: 'Students who registered themselves using your hostel QR code link.', icon: 'qr-code-outline', color: '#10B981' },
              { type: 'stat_cards', cards: [
                { label: 'QR Registrations', value: String(qrCount), icon: 'qr-code-outline', color: '#10B981', bg: '#ECFDF5' },
                { label: 'Active Now', value: String(activeCount), icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
              ]},
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
              { type: 'action_buttons', buttons: [
                { label: 'QR Registration', icon: 'qr-code-outline', screen: 'QRSignup', variant: 'primary' },
              ]},
            ]);
          } else if (filter === 'pending') {
            addBot([
              { type: 'info_tip', text: 'Student registrations submitted but awaiting your approval or completion.', icon: 'hourglass-outline', color: '#8B5CF6' },
              { type: 'stat_cards', cards: [
                { label: 'Pending Admissions', value: String(pendingAdm), icon: 'hourglass-outline', color: '#8B5CF6', bg: '#F5F3FF' },
                { label: 'Active Now', value: String(activeCount), icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
              ]},
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
              { type: 'action_buttons', buttons: [
                { label: 'View Students', icon: 'list-outline', screen: 'Students', variant: 'primary' },
              ]},
            ]);
          } else if (filter === 'unallocated') {
            addBot([
              { type: 'info_tip', text: 'Students who are registered but have not been assigned a bed yet.', icon: 'bed-outline', color: '#F59E0B' },
              { type: 'stat_cards', cards: [
                { label: 'Unallocated', value: String(unallocated), icon: 'bed-outline', color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Active Now', value: String(activeCount), icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
                { label: 'Available Beds', value: String(snap?.availableBeds ?? 0), icon: 'business-outline', color: '#10B981', bg: '#ECFDF5' },
              ]},
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
              { type: 'action_buttons', buttons: [
                { label: 'View Students', icon: 'list-outline', screen: 'Students', variant: 'primary' },
                { label: 'View Rooms', icon: 'business-outline', screen: 'Rooms', variant: 'outline' },
              ]},
            ]);
          } else {
            // 'all' — full view
            addBot([
              { type: 'info_tip', text: 'Complete student distribution across all statuses in your hostel.', icon: 'people-outline', color: '#6366F1' },
              {
                type: 'student_stats_donut',
                active: activeCount,
                inactive: leftCount,
                prebooked: prebookedCount,
                qrRegister: qrCount
              },
              {
                type: 'stat_cards', cards: [
                  { label: 'Total Left', value: String(leftCount), icon: 'exit-outline', color: '#94A3B8', bg: '#F8FAFC' },
                  { label: 'Pre-Booked', value: String(prebookedCount), icon: 'calendar-outline', color: '#F59E0B', bg: '#FFFBEB' },
                  { label: 'Paid Rent', value: String(paidCount), icon: 'checkmark-circle-outline', color: '#10B981', bg: '#ECFDF5' },
                  { label: 'Unpaid Rent', value: String(unpaidCount), icon: 'alert-circle-outline', color: '#EF4444', bg: '#FEF2F2' },
                ]
              },
              { type: 'follow_up_chips', label: 'Dig deeper:', chips: followUpChips },
              {
                type: 'action_buttons', buttons: [
                  { label: 'View Students List', icon: 'list-outline', screen: 'Students', variant: 'primary' },
                  { label: 'Pending Dues', icon: 'alert-circle-outline', screen: 'PendingPayments', variant: 'outline' },
                ]
              },
            ]);
          }
        } catch (err) {
          removeLoadingBlock();
          addBot([{ type: 'text', text: 'Failed to load students statistics. Please try again.' }]);
        }
        break;
      }


      case 'SHOW_DUES': {
        addBot([{ type: 'loading' }]);
        const dues = await fetchDuesSummary();
        removeLoadingBlock();
        if (!dues || dues.totalPending === 0) {
          addBot([
            { type: 'info_tip', text: 'Great news! All students are up to date with their payments.', icon: 'checkmark-circle-outline', color: '#10B981' },
            { type: 'text', text: 'No pending dues found. All student payments are up to date! 🎉' },
            {
              type: 'action_buttons', buttons: [
                { label: 'View Payment History', icon: 'checkmark-circle-outline', screen: 'CollectedPayments', variant: 'primary' },
              ]
            }
          ]);
        } else {
          const dueFilter = (intent as any).filter;
          const filterLabel = dueFilter === 'overdue'
            ? 'Showing students whose payment due date has already passed.'
            : dueFilter === 'pending'
            ? 'Showing students who have not yet paid this month.'
            : 'Full payment status breakdown for all students this month.';
          addBot([
            { type: 'info_tip', text: filterLabel, icon: 'wallet-outline', color: '#EF4444' },
            {
              type: 'dues_donut',
              paidCount: dues.paidCount,
              partialCount: dues.partialCount,
              unpaidCount: dues.unpaidCount,
              totalPaidAmount: dues.totalPaidAmount,
              totalPending: dues.totalPending
            },
            {
              type: 'stat_cards', cards: [
                { label: 'Total Pending', value: INR(dues.totalPending), icon: 'alert-circle-outline', color: '#EF4444', bg: '#FEF2F2' },
                { label: 'Overdue', value: String(dues.overdueCount), icon: 'time-outline', color: '#DC2626', bg: '#FFF1F2' },
                { label: 'Paid Rent', value: INR(dues.totalPaidAmount), icon: 'cash-outline', color: '#10B981', bg: '#ECFDF5' },
                { label: 'Partial Paid', value: String(dues.partialCount), icon: 'cash-outline', color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Fully Paid', value: String(dues.paidCount), icon: 'checkmark-circle-outline', color: '#10B981', bg: '#ECFDF5' },
              ]
            },
            {
              type: 'follow_up_chips', label: 'Related:', chips: [
                { label: 'Overdue only', icon: 'time-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'overdue' }) },
                { label: 'Unpaid only', icon: 'alert-circle-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'pending' }) },
                { label: 'All dues', icon: 'wallet-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'all' }) },
                { label: 'Collection', icon: 'cash-outline', onPress: () => handleIntent({ type: 'SHOW_PAYMENTS' }) },
                { label: 'Reports', icon: 'bar-chart-outline', onPress: () => handleIntent({ type: 'SHOW_REPORTS' }) },
              ]
            },
            {
              type: 'action_buttons', buttons: [
                { label: 'Collect Payment', icon: 'cash-outline', screen: 'FeeManagement', variant: 'primary' },
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
          addBot([{ type: 'text', text: 'No rooms registered in this hostel yet.' }]);
        } else {
          const pct = occ.total > 0 ? Math.round((occ.occupied / occ.total) * 100) : 0;
          addBot([
            { type: 'info_tip', text: `Your hostel is ${pct}% occupied. ${occ.available} bed${occ.available !== 1 ? 's' : ''} available right now.`, icon: 'business-outline', color: '#4F46E5' },
            {
              type: 'occupancy_donut',
              occupied: occ.occupied,
              available: occ.available,
              total: occ.total
            },
            {
              type: 'stat_cards', cards: [
                { label: 'Occupied', value: String(occ.occupied), icon: 'people-outline', color: '#4F46E5', bg: '#EEF2FF' },
                { label: 'Available', value: String(occ.available), icon: 'bed-outline', color: '#10B981', bg: '#ECFDF5' },
                { label: 'Total Beds', value: String(occ.total), icon: 'grid-outline', color: '#64748B', bg: '#F8FAFC' },
              ]
            },
            {
              type: 'follow_up_chips', label: 'Explore:', chips: [
                { label: 'Available Beds', icon: 'bed-outline', onPress: () => handleQuery('how many vacant beds') },
                { label: 'Occupancy %', icon: 'stats-chart-outline', onPress: () => handleQuery('occupancy rate') },
                { label: 'Single Rooms', icon: 'person-outline', onPress: () => handleQuery('how many single sharing') },
                { label: 'Double Rooms', icon: 'people-outline', onPress: () => handleQuery('how many double sharing') },
                { label: 'Students', icon: 'people-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS' }) },
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
          addBot([
            { type: 'text', text: 'No expenses recorded for this month.' },
            {
              type: 'action_buttons', buttons: [
                { label: 'Add Expense', icon: 'add-circle-outline', screen: 'AddExpense', variant: 'primary' },
              ]
            }
          ]);
        } else {
          addBot([
            {
              type: 'expense_donut',
              totalThisMonth: exp.totalThisMonth,
              breakdown: exp.breakdown
            },
            {
              type: 'expense_list',
              items: exp.items
            },
            {
              type: 'stat_cards', cards: [
                { label: 'Total Spent', value: INR(exp.totalThisMonth), icon: 'card-outline', color: '#EC4899', bg: '#FDF2F8' },
                { label: 'Entries', value: String(exp.count), icon: 'list-outline', color: '#64748B', bg: '#F8FAFC' },
              ]
            },
            {
              type: 'action_buttons', buttons: [
                { label: 'Add Expense', icon: 'add-circle-outline', screen: 'AddExpense', variant: 'primary' },
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

      case 'SHOW_HOSTELS': {
        addBot([{ type: 'loading' }]);
        const hostelsList = await fetchMyHostels();
        removeLoadingBlock();
        if (!hostelsList || hostelsList.length === 0) {
          addBot([{ type: 'text', text: 'No hostels registered under your account.' }]);
        } else {
          addBot([
            {
              type: 'stat_cards', cards: [
                { label: 'Total Hostels', value: String(hostelsList.length), icon: 'business-outline', color: '#6366F1', bg: '#EEF2FF' },
                { label: 'Active PG Context', value: user?.hostel_name || 'Active PG', icon: 'checkmark-circle-outline', color: '#10B981', bg: '#ECFDF5' },
              ]
            },
            {
              type: 'hostel_list',
              hostels: hostelsList,
              activeHostelId: user?.hostel_id || 0,
              onSwitch: handleSwitchHostel
            }
          ]);
        }
        break;
      }

      case 'SHOW_STAFF': {
        addBot([{ type: 'loading' }]);
        const staff = await fetchStaffList();
        removeLoadingBlock();
        if (!staff || staff.length === 0) {
          addBot([
            { type: 'text', text: 'No staff members registered yet.' },
            {
              type: 'action_buttons', buttons: [
                { label: 'Add Staff Member', icon: 'person-add-outline', screen: 'AddStaff', variant: 'primary' },
              ]
            }
          ]);
        } else {
          const activeStaff = staff.filter((s: any) => s.status === 1);
          const totalSalary = activeStaff.reduce((sum: number, s: any) => sum + parseFloat(s.salary || 0), 0);
          
          addBot([
            {
              type: 'stat_cards', cards: [
                { label: 'Total Staff', value: String(staff.length), icon: 'briefcase-outline', color: '#4F46E5', bg: '#EEF2FF' },
                { label: 'Active Staff', value: String(activeStaff.length), icon: 'checkmark-circle-outline', color: '#10B981', bg: '#ECFDF5' },
                { label: 'Monthly Salary', value: INR(totalSalary), icon: 'wallet-outline', color: '#F59E0B', bg: '#FEF3C7' },
              ]
            },
            {
              type: 'staff_list',
              staff: staff
            },
            {
              type: 'action_buttons', buttons: [
                { label: 'View Staff Details', icon: 'briefcase-outline', screen: 'Staff', variant: 'primary' },
                { label: 'Add Staff Member', icon: 'person-add-outline', screen: 'AddStaff', variant: 'outline' },
              ]
            },
          ]);
        }
        break;
      }

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

      case 'SHOW_GUESTS': {
        addBot([{ type: 'loading' }]);
        const guestData = await fetchGuestsList();
        removeLoadingBlock();
        if (!guestData || !guestData.guests || guestData.guests.length === 0) {
          addBot([
            { type: 'text', text: 'No guests checked in recently.' },
            {
              type: 'action_buttons', buttons: [
                { label: 'Add Guest', icon: 'person-add-outline', screen: 'AddGuest', variant: 'primary' },
              ]
            }
          ]);
        } else {
          const activeGuests = guestData.guests.filter((g: any) => !g.checkout_time);
          addBot([
            {
              type: 'stat_cards', cards: [
                { label: 'Total Guests', value: String(guestData.guests.length), icon: 'person-outline', color: '#8B5CF6', bg: '#F5F3FF' },
                { label: 'Currently in PG', value: String(activeGuests.length), icon: 'home-outline', color: '#10B981', bg: '#ECFDF5' },
                { label: 'Collected Fee', value: INR(guestData.summary.totalCollected), icon: 'cash-outline', color: '#F59E0B', bg: '#FEF3C7' },
              ]
            },
            {
              type: 'guest_list',
              guests: guestData.guests
            },
            {
              type: 'action_buttons', buttons: [
                { label: 'View Guests List', icon: 'people-outline', screen: 'Guests', variant: 'primary' },
                { label: 'Add Guest', icon: 'person-add-outline', screen: 'AddGuest', variant: 'outline' },
              ]
            },
          ]);
        }
        break;
      }

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

  const triggerMenuAction = useCallback((label: string, intent: AssistantIntent) => {
    addUser(label);
    setInputText('');
    handleIntent(intent);
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
          <KeyboardAvoidingView 
            behavior={isKeyboardActive ? 'padding' : undefined} 
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24)}
            style={{ flex: 1, backgroundColor: '#FFF' }}
          >

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
                  <>
                    <TouchableOpacity style={s.iconBtn} onPress={() => setMessages([])}>
                      <Ionicons name="refresh-outline" size={20} color="#C7D2FE" />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.iconBtn} onPress={handleReset}>
                      <Ionicons name="home-outline" size={20} color="#C7D2FE" />
                    </TouchableOpacity>
                  </>
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

            {/* ── Quick stats chips ── */}
            <View style={{ backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8, paddingBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 5 }}>
                <Ionicons name="stats-chart-outline" size={11} color="#94A3B8" />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Quick Stats
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12 }}
              >
                {INFO_QUESTIONS.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.quickChipBtn}
                    onPress={() => { Haptics.selectionAsync().catch(() => { }); handleQuery(q); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="bar-chart-outline" size={11} color="#4338CA" style={{ marginRight: 4 }} />
                    <Text style={s.quickChipBtnText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* ── How-to guide chips ── */}
            <View style={{ backgroundColor: '#FFF', paddingTop: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 5 }}>
                <Ionicons name="help-circle-outline" size={11} color="#94A3B8" />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Guides
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12 }}
              >
                {GUIDE_QUESTIONS.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[s.quickChipBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                    onPress={() => { Haptics.selectionAsync().catch(() => { }); handleQuery(q); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="help-circle-outline" size={11} color="#16A34A" style={{ marginRight: 4 }} />
                    <Text style={[s.quickChipBtnText, { color: '#15803D' }]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>


            {/* ── Bottom input bar ── */}
            <View style={[s.inputBar, { 
              paddingBottom: (isAddMenuOpen || isFocused || isKeyboardActive) ? 8 : (Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 10), 
              gap: 8, 
              borderTopWidth: 1, 
              borderTopColor: '#E2E8F0' 
            }]}>
              {/* Hamburger Menu Button with Keyboard Dismiss handling */}
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setIsAddMenuOpen(!isAddMenuOpen);
                }}
                style={{ padding: 4 }}
                activeOpacity={0.7}
              >
                <Ionicons name={isAddMenuOpen ? "close-outline" : "menu-outline"} size={28} color="#4338CA" />
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
                  onFocus={() => {
                    setIsAddMenuOpen(false);
                    setIsFocused(true);
                  }}
                  onBlur={() => setIsFocused(false)}
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

            {/* Inline 4x2 Grid Menu below input bar */}
            {isAddMenuOpen && (
              <View style={[s.inlineMenuContainer, { 
                height: 160 + (Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 10), 
                paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 10 
              }]}>
                <View style={s.inlineMenuGrid}>
                  {menuItems.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={s.inlineMenuItem}
                      onPress={() => {
                        setIsAddMenuOpen(false);
                        if (item.intent) {
                          triggerMenuAction(item.label, item.intent);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[s.inlineMenuIconContainer, { backgroundColor: item.bg }]}>
                        <Ionicons name={item.icon as any} size={20} color={item.color} />
                      </View>
                      <Text style={s.inlineMenuItemText} numberOfLines={2}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

          </KeyboardAvoidingView>

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
  inlineMenuContainer: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  inlineMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  inlineMenuItem: {
    width: '25%',
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  inlineMenuIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  inlineMenuItemText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default OwnerAssistant;
