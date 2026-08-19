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
 *
 *  Layout states — the column above never changes shape, only the size of
 *  the gap under the composer:
 *    1. idle              keyboardInset = 0, composer rests on the safe area
 *    2. input focused     keyboardInset = keyboard height not absorbed by the OS
 *    3. chatting w/ kbd   same as (2); only the message list's height changes
 *    4. keyboard dismissed  back to (1)
 *  See the "Keyboard handling" block in the component for how the inset is
 *  derived (and why KeyboardAvoidingView could not do it here).
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView,
  Modal, Platform, TextInput,
  Animated, Image, DeviceEventEmitter, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../../contexts/AuthContext';
import * as RootNavigation from '../../navigation/navigationRef';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { KeyboardInsetDebugOverlay } from '../KeyboardInsetDebugOverlay';
import { AssistantResponse, ContentBlock } from './AssistantResponse';
import {
  resolveIntent, AssistantIntent, QUICK_QUESTIONS,
  HOW_TO_STEPS, INFO_QUESTIONS, GUIDE_QUESTIONS,
} from './intentEngine';
import {
  fetchDashboardSnapshot, fetchDuesSummary, fetchFinancialOverview,
  fetchOccupancy, fetchStudents, fetchExpenseSummary, fetchMyHostels,
  switchActiveHostel, fetchStaffList, fetchGuestsList, fetchStudentStats,
  fetchStudentByName, fetchRoomByNumber, fetchRoomsByFloor, fetchPaidStudents,
  fetchStudentsJoinedThisMonth, fetchStudentsVacatedThisMonth, fetchDetailedIncomeBreakdown,
  fetchNoticesCount, fetchRooms, DashboardSnapshot,
} from './assistantApi';



const INR = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

// ─── Time greeting ─────────────────────────────────────────────────────────
function getGreeting(name?: string) {
  const h = new Date().getHours();
  const first = name?.split(' ')[0] || '';
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return first ? `${g}, ${first} 👋` : `${g} 👋`;
}

function getQuestionChipIcon(q: string): string {
  const l = q.toLowerCase();
  if (l.includes('student') || l.includes('tenants')) return 'people-outline';
  if (l.includes('room') || l.includes('floor')) return 'business-outline';
  if (l.includes('bed') || l.includes('vacant')) return 'bed-outline';
  if (l.includes('paid') || l.includes('collection') || l.includes('income')) return 'cash-outline';
  if (l.includes('due') || l.includes('overdue') || l.includes('unpaid')) return 'alert-circle-outline';
  if (l.includes('expense') || l.includes('spent')) return 'card-outline';
  if (l.includes('staff') || l.includes('warden')) return 'briefcase-outline';
  if (l.includes('guest')) return 'person-outline';
  if (l.includes('qr')) return 'qr-code-outline';
  if (l.includes('notice')) return 'notifications-outline';
  if (l.includes('add')) return 'add-circle-outline';
  return 'sparkles-outline';
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

interface HomeProps {
  snap: DashboardSnapshot | null;
  loading: boolean;
  onQuestion: (q: string) => void;
  onIntent: (i: AssistantIntent) => void;
}
// ─── Merged suggestion chips shown inline in the welcome area ─────────────────
const WELCOME_CHIPS: Array<{ icon: string; label: string; q: string }> = [
  { icon: 'alert-circle-outline', label: 'Pending Dues', q: "Who hasn't paid this month?" },
  { icon: 'bed-outline', label: 'Available Beds', q: 'How many beds available?' },
  { icon: 'cash-outline', label: 'Month Profit', q: 'Profit this month' },
  { icon: 'people-outline', label: 'Active Students', q: 'Total students count' },
  { icon: 'receipt-outline', label: 'Expense Summary', q: 'Expense breakdown' },
  { icon: 'briefcase-outline', label: 'Staff & Wages', q: 'Show staff list' },
];


// ─── Main Component ────────────────────────────────────────────────────────
export const OwnerAssistant: React.FC = () => {
  const { user, updateTokenAndUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isAssistantHidden, setIsAssistantHidden] = useState(false);
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
    addUser(`Switch to ${hostelName}`);
    setIsTyping(true);
    try {
      const data = await switchActiveHostel(hostelId);
      setIsTyping(false);
      if (data?.success) {
        const { token } = data.data;
        await updateTokenAndUser(token, { hostel_id: hostelId, hostel_name: hostelName });
        addBot([
          { type: 'text', text: `Successfully switched active hostel PG context to: ${hostelName} 🎉` },
          {
            type: 'action_buttons', buttons: [
              { label: 'Check Occupancy', icon: 'bed-outline', onPress: () => handleQuery("How many beds available?"), variant: 'primary' },
              { label: 'Check Dues', icon: 'alert-circle-outline', onPress: () => handleQuery("Who hasn't paid rent?"), variant: 'outline' },
            ]
          }
        ]);
      } else {
        addBot([{ type: 'text', text: `Failed to switch active hostel: ${data?.error || 'Unknown error'}` }]);
      }
    } catch (err) {
      setIsTyping(false);
      addBot([{ type: 'text', text: 'Error switching active hostel context. Please try again.' }]);
    }
  };

  const toggleQuickMenu = useCallback(() => {
    // NOTE: no LayoutAnimation here — on Android (Fabric) it races with the
    // keyboard-driven layout pass below and was a source of jank/crashes.
    if (isKeyboardActive) {
      Keyboard.dismiss();
    }
    setIsAddMenuOpen(prev => !prev);
  }, [isKeyboardActive]);

  // ── Keyboard handling ──────────────────────────────────────────────────
  //
  // All of the geometry lives in useKeyboardInset / keyboardInsetMath (pure and
  // unit-tested). The short version: RN's Android keyboard event reports
  // `ime.bottom − navigationBar.bottom`, but this Modal draws edge-to-edge (RN
  // forces navigationBarTranslucent on when the edge-to-edge flag is set), so
  // the column extends *behind* the nav bar. Padding it by the reported height
  // alone left it short by exactly the nav-bar height — which is why the input
  // pill sat under the keyboard. The hook adds that strip back and subtracts
  // anything a window resize already absorbed.
  //
  // KeyboardAvoidingView cannot do this: it compares its own frame (Modal
  // window coordinates) against the keyboard's screen coordinates, and
  // `behavior="height"` sets an explicit height that leaves a stale grey band
  // behind once the keyboard closes.
  //
  // TEMPORARY: long-press the header avatar/title to toggle an on-screen
  // readout of every term. Release builds strip console output and this only
  // reproduces on real hardware, so it is the only way to see the OS numbers
  // from an installed APK. Remove `showKbdDebug`, the `debug` option, and
  // KeyboardInsetDebugOverlay once confirmed on device.
  const [showKbdDebug, setShowKbdDebug] = useState(false);
  const {
    keyboardInset,
    onContainerLayout: handleBodyLayout,
    resetKeyboardInset,
    breakdown: kbdBreakdown,
  } = useKeyboardInset({
    onVisibilityChange: setIsKeyboardActive,
    debug: showKbdDebug,
  });

  // Opening/closing the sheet must never leave keyboard state behind. The Modal
  // is only hidden, not unmounted, so a stale inset from the previous session
  // would otherwise be the first thing painted on the next open (a grey band
  // under the composer), and a keyboard left up while the sheet closes would
  // sit over the screen underneath. One effect covers every close path —
  // header button, hardware back, and the CLOSE_ASSISTANT event.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen) { wasOpenRef.current = true; return; }
    // Skip the mount pass — the sheet starts closed, and dismissing then would
    // steal the keyboard from whatever screen is actually being typed into.
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    Keyboard.dismiss();
    setIsAddMenuOpen(false);
    setIsFocused(false);
    setIsKeyboardActive(false);
    resetKeyboardInset();
  }, [isOpen, resetKeyboardInset]);

  // ── Lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('TOUR_STATE_CHANGE', setIsTourActive);
    const hideSub = DeviceEventEmitter.addListener('SET_ASSISTANT_HIDDEN', (hidden: boolean) => {
      setIsAssistantHidden(!!hidden);
    });
    const closeSub = DeviceEventEmitter.addListener('CLOSE_ASSISTANT', () => {
      setIsOpen(false);
    });
    const openSub = DeviceEventEmitter.addListener('OPEN_ASSISTANT', () => {
      setIsOpen(true);
    });
    const routeSub = DeviceEventEmitter.addListener('ROUTE_CHANGED', (routeName: string) => {
      setCurrentRoute(routeName);
    });
    return () => {
      sub.remove();
      hideSub.remove();
      closeSub.remove();
      openSub.remove();
      routeSub.remove();
    };
  }, []);

  useEffect(() => {
    const updateRoute = () => {
      if (RootNavigation.navigationRef.isReady()) {
        const routeName = RootNavigation.navigationRef.getCurrentRoute()?.name || null;
        setCurrentRoute(routeName);
      }
    };
    updateRoute();
    const t1 = setTimeout(updateRoute, 100);
    const t2 = setTimeout(updateRoute, 400);
    const unsub = RootNavigation.navigationRef.addListener?.('state', updateRoute);
    return () => { clearTimeout(t1); clearTimeout(t2); unsub?.(); };
  }, []);

  const getInitialWelcomeMsgs = useCallback((): Msg[] => {
    const firstName = user?.full_name?.split(' ')[0] || user?.name || 'Owner';
    const now = Date.now();
    return [
      {
        id: 'welcome_card_1_' + now,
        sender: 'bot',
        blocks: [
          {
            type: 'text',
            text: `Welcome ${firstName}! 👋 Glad to assist you.\nI will show you information related to your hostel.`
          }
        ]
      }
    ];
  }, [user]);

  useEffect(() => {
    if (isOpen && user?.role !== 'TENANT') {
      loadSnap();
      if (messages.length === 0) {
        setMessages(getInitialWelcomeMsgs());
      }
    }
  }, [isOpen, messages.length, getInitialWelcomeMsgs, user?.role]);

  const scrollToEnd = useCallback((animated = true) => {
    scrollRef.current?.scrollToEnd({ animated });
  }, []);

  // Keep the newest turn in view when the thread changes or the keyboard opens.
  // (Content-growth scrolling is handled by the list's onContentSizeChange.)
  useEffect(() => {
    if (!messages.length) return;
    const t = setTimeout(() => scrollToEnd(true), 120);
    return () => clearTimeout(t);
  }, [messages, isTyping, isKeyboardActive, scrollToEnd]);

  const loadSnap = async () => {
    setSnapLoading(true);
    try { setSnap(await fetchDashboardSnapshot()); }
    catch { }
    finally { setSnapLoading(false); }
  };

  // ── Position & Screen Visibility ──
  const fabPos = useMemo(() => {
    const activeRoute = currentRoute || (RootNavigation.navigationRef.isReady() ? RootNavigation.navigationRef.getCurrentRoute()?.name : '') || '';

    // Screens with bottom tab bar
    const tabScreens = [
      'HomeTab', 'Home', 'Main',
      'PendingDuesTab', 'PendingPayments', 'PendingTab',
      'OverviewTab', 'Overview',
      'StudentsTab', 'Students'
    ];
    const isTabScreen = tabScreens.includes(activeRoute);

    // Screens that have their own '+' Add FAB button
    const pagesWithAddFab = [
      'Students', 'StudentsTab',
      'Staff', 'StaffTab',
      'Guests', 'GuestsTab',
      'Notices', 'NoticesTab', 'NoticesManagement',
      'Hostels', 'HostelsTab',
      'Reminders',
      'Expense', 'Expenses',
      'Income', 'InCome'
    ];
    const hasAddFab = pagesWithAddFab.includes(activeRoute);

    if (hasAddFab) {
      // Stack directly above the '+' FAB
      return { bottom: 204, right: 20 };
    }
    if (isTabScreen) {
      // Dashboard, Finance, Pending Dues: give generous clearance above the bottom tab bar
      return { bottom: Math.max(insets.bottom + 95, 120), right: 20 };
    }
    // Inside pages / detail / form screens without bottom tabs
    return { bottom: Math.max(insets.bottom + 30, 40), right: 20 };
  }, [currentRoute, insets.bottom]);

  // ── Message helpers ────────────────────────────────────────────────────
  const nid = () => `m${++msgId.current}`;

  const addUser = (text: string) =>
    setMessages(p => [...p.map(m => ({ ...m })), { id: nid(), sender: 'user' as const, text }]);

  const addBot = (blocks: ContentBlock[]) => {
    setIsTyping(false);
    setMessages(p => [...p, { id: nid(), sender: 'bot' as const, blocks }]);
  };

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

      case 'SMALL_TALK': {
        const subtype = (intent as any).subtype;
        const hour = new Date().getHours();
        const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

        if (subtype === 'greeting') {
          typingThen([
            { type: 'text', text: `${greeting}! 👋 I'm HOSTIX Assistant — your smart hostel management companion.\n\nAsk me about students, rooms, dues, finances, or anything about your hostel!` },
            {
              type: 'follow_up_chips', label: 'Try asking:', chips: [
                { label: 'Pending dues', icon: 'alert-circle-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'all' }) },
                { label: 'Occupancy', icon: 'business-outline', onPress: () => handleIntent({ type: 'SHOW_ROOMS' }) },
                { label: 'Students', icon: 'people-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS' }) },
              ]
            }
          ]);
        } else if (subtype === 'feeling') {
          typingThen([
            { type: 'text', text: `I'm doing great, always ready to help! 🚀\n\nI'm your HOSTIX Assistant — I can pull up student data, dues, room status, finances, and more in seconds. What do you need today?` },
            {
              type: 'follow_up_chips', label: 'Quick actions:', chips: [
                { label: 'Dashboard', icon: 'home-outline', onPress: () => handleIntent({ type: 'SHOW_HOME' }) },
                { label: 'Reports', icon: 'bar-chart-outline', onPress: () => handleIntent({ type: 'SHOW_REPORTS' }) },
                { label: 'Students', icon: 'people-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS' }) },
              ]
            }
          ]);
        } else if (subtype === 'time') {
          typingThen([
            { type: 'text', text: `🕐 Current time: **${timeStr}**\n📅 Today is **${dateStr}**\n\nAny hostel queries I can help with right now?` },
            {
              type: 'follow_up_chips', label: 'Check today\'s data:', chips: [
                { label: 'Pending dues today', icon: 'alert-circle-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'all' }) },
                { label: 'Today\'s collection', icon: 'cash-outline', onPress: () => handleIntent({ type: 'SHOW_PAYMENTS' }) },
              ]
            }
          ]);
        } else if (subtype === 'who_are_you') {
          typingThen([
            { type: 'app_info_card', topic: 'usage' },
            {
              type: 'follow_up_chips', label: 'Explore:', chips: [
                { label: 'App Owner', icon: 'person-outline', onPress: () => handleIntent({ type: 'SHOW_APP_INFO', topic: 'owner' }) },
                { label: 'App Goal', icon: 'rocket-outline', onPress: () => handleIntent({ type: 'SHOW_APP_INFO', topic: 'goal' }) },
              ]
            }
          ]);
        } else if (subtype === 'thanks') {
          typingThen([
            { type: 'text', text: `You're welcome! 😊 Happy to help anytime.\n\nAnything else about your hostel I can assist with?` },
            {
              type: 'follow_up_chips', label: 'More options:', chips: [
                { label: 'Students', icon: 'people-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS' }) },
                { label: 'Finances', icon: 'bar-chart-outline', onPress: () => handleIntent({ type: 'SHOW_REPORTS' }) },
              ]
            }
          ]);
        } else if (subtype === 'my_name') {
          const ownerName = user?.full_name || user?.name || 'the owner';
          typingThen([
            { type: 'text', text: `Your name is ${ownerName}.\n\nYou are the owner of ${user?.hostel_name || 'this hostel'}. You can view and update your profile in the Settings section.` },
            {
              type: 'follow_up_chips', label: 'App details:', chips: [
                { label: '🎯 App Goal', icon: 'rocket-outline', onPress: () => handleIntent({ type: 'SHOW_APP_INFO', topic: 'goal' }) },
                { label: '💡 How to Use', icon: 'help-circle-outline', onPress: () => handleIntent({ type: 'SHOW_APP_INFO', topic: 'usage' }) },
              ]
            }
          ]);
        } else if (subtype === 'app_developer') {
          typingThen([
            { type: 'text', text: `This app was created by Veeradurgarao Goriparthi (Hostix).\n\nThe goal is to provide a comprehensive and easy-to-use hostel management solution.` },
            {
              type: 'follow_up_chips', label: 'App details:', chips: [
                { label: '🎯 App Goal', icon: 'rocket-outline', onPress: () => handleIntent({ type: 'SHOW_APP_INFO', topic: 'goal' }) },
                { label: '💡 How to Use', icon: 'help-circle-outline', onPress: () => handleIntent({ type: 'SHOW_APP_INFO', topic: 'usage' }) },
              ]
            }
          ]);
        } else if (subtype === 'bye') {
          typingThen([
            { type: 'text', text: `Goodbye! 👋 Have a great day ahead.\n\nI'll be right here whenever you need hostel insights. Take care! 🙏` },
          ]);
        } else {
          typingThen([{ type: 'text', text: `Hello! 👋 How can I help you with your hostel today?` }]);
        }
        break;
      }


      case 'SHOW_STUDENTS': {
        setIsTyping(true);
        try {
          const [stats, dues] = await Promise.all([
            fetchStudentStats(),
            fetchDuesSummary()
          ]);

          const filter = (intent as any).filter || 'all';
          const activeCount = stats.active || snap?.activeTenants || 0;
          const leftCount = stats.inactive || 0;
          const prebookedCount = stats.prebooked || 0;
          const qrCount = stats.qrRegister || 0;
          const unallocated = stats.unallocated || 0;
          const pendingAdm = stats.pendingAdmissions || 0;
          const paidCount = dues?.paidCount ?? 0;
          const unpaidCount = dues?.pendingStudents ?? 0;

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
              {
                type: 'stat_cards', cards: [
                  { label: 'Active Students', value: String(activeCount), icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
                  { label: 'Paid Rent', value: String(paidCount), icon: 'checkmark-circle-outline', color: '#10B981', bg: '#ECFDF5' },
                  { label: 'Unpaid Rent', value: String(unpaidCount), icon: 'alert-circle-outline', color: '#EF4444', bg: '#FEF2F2' },
                ]
              },
              {
                type: 'follow_up_chips', label: `Do you want to see these ${activeCount} active students?`, chips: [
                  { label: `View ${activeCount} Students`, icon: 'list-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENT_LIST_INLINE', filter: 'active' }) },
                ]
              },
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
            ]);
          } else if (filter === 'inactive') {
            addBot([
              { type: 'info_tip', text: 'Students who have moved out or been marked as vacated.', icon: 'exit-outline', color: '#94A3B8' },
              {
                type: 'stat_cards', cards: [
                  { label: 'Students Left', value: String(leftCount), icon: 'exit-outline', color: '#94A3B8', bg: '#F8FAFC' },
                  { label: 'Still Active', value: String(activeCount), icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
                ]
              },
              {
                type: 'follow_up_chips', label: `Do you want to see these ${leftCount} vacated students?`, chips: [
                  { label: `View ${leftCount} Students`, icon: 'list-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENT_LIST_INLINE', filter: 'inactive' }) },
                ]
              },
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
            ]);
          } else if (filter === 'prebooked') {
            addBot([
              { type: 'info_tip', text: 'Upcoming students who pre-booked a bed but have not checked in yet.', icon: 'calendar-outline', color: '#F59E0B' },
              {
                type: 'stat_cards', cards: [
                  { label: 'Pre-Booked', value: String(prebookedCount), icon: 'calendar-outline', color: '#F59E0B', bg: '#FFFBEB' },
                  { label: 'Active Now', value: String(activeCount), icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
                ]
              },
              {
                type: 'follow_up_chips', label: `Do you want to see these ${prebookedCount} pre-booked students?`, chips: [
                  { label: `View ${prebookedCount} Students`, icon: 'list-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENT_LIST_INLINE', filter: 'prebooked' }) },
                ]
              },
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
            ]);
          } else if (filter === 'qr') {
            addBot([
              { type: 'info_tip', text: 'Students who registered themselves using your hostel QR code link.', icon: 'qr-code-outline', color: '#10B981' },
              {
                type: 'stat_cards', cards: [
                  { label: 'QR Registrations', value: String(qrCount), icon: 'qr-code-outline', color: '#10B981', bg: '#ECFDF5' },
                  { label: 'Active Now', value: String(activeCount), icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
                ]
              },
              {
                type: 'follow_up_chips', label: `Do you want to see these ${qrCount} QR registrations?`, chips: [
                  { label: `View ${qrCount} Students`, icon: 'list-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENT_LIST_INLINE', filter: 'qr' }) },
                ]
              },
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
            ]);
          } else if (filter === 'pending') {
            addBot([
              { type: 'info_tip', text: 'Student registrations submitted but awaiting your approval or completion.', icon: 'hourglass-outline', color: '#8B5CF6' },
              {
                type: 'stat_cards', cards: [
                  { label: 'Pending Admissions', value: String(pendingAdm), icon: 'hourglass-outline', color: '#8B5CF6', bg: '#F5F3FF' },
                  { label: 'Active Now', value: String(activeCount), icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
                ]
              },
              {
                type: 'follow_up_chips', label: `Do you want to see these ${pendingAdm} pending admissions?`, chips: [
                  { label: `View ${pendingAdm} Students`, icon: 'list-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENT_LIST_INLINE', filter: 'pending' }) },
                ]
              },
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
            ]);
          } else if (filter === 'unallocated') {
            addBot([
              { type: 'info_tip', text: 'Students who are registered but have not been assigned a bed yet.', icon: 'bed-outline', color: '#F59E0B' },
              {
                type: 'stat_cards', cards: [
                  { label: 'Unallocated', value: String(unallocated), icon: 'bed-outline', color: '#F59E0B', bg: '#FFFBEB' },
                  { label: 'Active Now', value: String(activeCount), icon: 'people-outline', color: '#6366F1', bg: '#EEF2FF' },
                  { label: 'Available Beds', value: String(snap?.availableBeds ?? 0), icon: 'business-outline', color: '#10B981', bg: '#ECFDF5' },
                ]
              },
              {
                type: 'follow_up_chips', label: `Do you want to see these ${unallocated} unallocated students?`, chips: [
                  { label: `View ${unallocated} Students`, icon: 'list-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENT_LIST_INLINE', filter: 'unallocated' }) },
                ]
              },
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
            ]);
          } else if (filter === 'joined_this_month') {
            const joinedList = await fetchStudentsJoinedThisMonth();
            addBot([
              { type: 'info_tip', text: `${joinedList.length} new student(s) joined your hostel this month.`, icon: 'calendar-outline', color: '#10B981' },
              {
                type: 'student_list_card', title: 'Students Joined This Month', students: joinedList.map((s: any) => ({
                  name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                  roomNumber: s.room_number || 'N/A',
                  phone: s.phone || '',
                  badgeText: 'New Admission',
                  badgeColor: '#ECFDF5',
                  badgeTextColor: '#10B981'
                }))
              },
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
            ]);
          } else if (filter === 'vacated_this_month') {
            const vacatedList = await fetchStudentsVacatedThisMonth();
            addBot([
              { type: 'info_tip', text: `${vacatedList.length} student(s) vacated or left your hostel this month.`, icon: 'exit-outline', color: '#64748B' },
              {
                type: 'student_list_card', title: 'Students Vacated This Month', students: vacatedList.map((s: any) => ({
                  name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                  roomNumber: s.room_number || 'N/A',
                  phone: s.phone || '',
                  badgeText: 'Vacated',
                  badgeColor: '#F8FAFC',
                  badgeTextColor: '#64748B'
                }))
              },
              { type: 'follow_up_chips', label: 'Explore more:', chips: followUpChips },
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
                type: 'follow_up_chips', label: `Do you want to see all ${stats.totalStudents || snap?.activeTenants || 0} students?`, chips: [
                  { label: `View All Students`, icon: 'list-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENT_LIST_INLINE', filter: 'all' }) },
                ]
              },
              { type: 'follow_up_chips', label: 'Dig deeper:', chips: followUpChips },
            ]);
          }
        } catch (err) {
          setIsTyping(false);
          addBot([{ type: 'text', text: 'Failed to load students statistics. Please try again.' }]);
        }
        break;
      }

      case 'SHOW_STUDENT_LIST_INLINE': {
        setIsTyping(true);
        try {
          const filter = (intent as any).filter;
          let params: any = {};
          let title = 'Students';
          if (filter === 'active') { params = { status: 1 }; title = 'Active Students'; }
          else if (filter === 'inactive') { params = { status: 0 }; title = 'Vacated Students'; }
          else if (filter === 'prebooked') { params = { prebooked: true }; title = 'Pre-booked Students'; }
          else if (filter === 'qr') { params = { qr_registered: true }; title = 'QR Registered Students'; }
          else if (filter === 'unallocated') { params = { unallocated: true }; title = 'Unallocated Students'; }
          else if (filter === 'pending') { params = { pending: true }; title = 'Pending Admissions'; }
          else if (filter === 'all') { params = {}; title = 'All Students'; }

          const list = await fetchStudents(params);

          if (!list || list.length === 0) {
            addBot([{ type: 'text', text: `You currently don't have any ${title.toLowerCase()}.` }]);
          } else {
            addBot([
              { type: 'info_tip', text: `Showing list of ${list.length} ${title.toLowerCase()}.`, icon: 'people-outline', color: '#4F46E5' },
              {
                type: 'student_list_card', title: title, students: list.map(s => ({
                  name: s.name,
                  roomNumber: s.roomNumber || 'N/A',
                  phone: s.phone || '',
                  badgeText: s.status === 1 ? 'Active' : 'Inactive',
                  badgeColor: s.status === 1 ? '#ECFDF5' : '#F1F5F9',
                  badgeTextColor: s.status === 1 ? '#10B981' : '#64748B'
                }))
              }
            ]);
          }
        } catch {
          setIsTyping(false);
          addBot([{ type: 'text', text: 'Error fetching the students list.' }]);
        }
        break;
      }

      case 'SHOW_STUDENT_SEARCH': {
        setIsTyping(true);
        try {
          const results = await fetchStudentByName((intent as any).name);
          if (!results || results.length === 0) {
            addBot([
              { type: 'info_tip', text: `I didn't quite catch that, or no student found matching "${(intent as any).name}".`, icon: 'help-circle-outline', color: '#EF4444' },
              { type: 'text', text: `Here is how you can search:\n\n👤 Find a student: Type their name (e.g., "Durgarao")\n🚪 Find a room: Type the room number (e.g., "201")\n❓ Ask questions: Try asking "who hasn't paid rent?"` },
              {
                type: 'follow_up_chips', label: 'Try:', chips: [
                  { label: 'View All Students', icon: 'list-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENT_LIST_INLINE', filter: 'all' }) }
                ]
              }
            ]);
          } else if (results.length === 1) {
            addBot([
              { type: 'info_tip', text: `Found student record for "${(intent as any).name}".`, icon: 'checkmark-circle-outline', color: '#10B981' },
              { type: 'student_detail_card', student: results[0] },
              {
                type: 'follow_up_chips', label: 'Explore:', chips: [
                  { label: 'All students', icon: 'list-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS' }) },
                  { label: 'Active students', icon: 'people-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS', filter: 'active' }) },
                ]
              }
            ]);
          } else {
            addBot([
              { type: 'info_tip', text: `Found ${results.length} students matching "${(intent as any).name}".`, icon: 'people-outline', color: '#4F46E5' },
              {
                type: 'student_list_card', title: `Search Results for "${(intent as any).name}"`, students: results.map(s => ({
                  student_id: s.student_id,
                  name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
                  roomNumber: s.room_number || 'N/A',
                  phone: s.phone || '',
                  badgeText: s.status === 1 ? 'Active' : 'Inactive',
                  badgeColor: s.status === 1 ? '#ECFDF5' : '#F1F5F9',
                  badgeTextColor: s.status === 1 ? '#10B981' : '#64748B'
                }))
              },
              {
                type: 'follow_up_chips', label: 'Explore:', chips: [
                  { label: 'All students', icon: 'list-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS' }) },
                  { label: 'Active students', icon: 'people-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS', filter: 'active' }) },
                  { label: 'Overdue students', icon: 'alert-circle-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'overdue' }) },
                ]
              }
            ]);
          }
        } catch {
          setIsTyping(false);
          addBot([{ type: 'text', text: 'Error searching for student.' }]);
        }
        break;
      }

      case 'SHOW_ROOM_DETAIL': {
        setIsTyping(true);
        try {
          const room = await fetchRoomByNumber((intent as any).roomNumber);
          if (!room) {
            addBot([
              { type: 'info_tip', text: `Room ${(intent as any).roomNumber} not found in this hostel.`, icon: 'business-outline', color: '#EF4444' },
              { type: 'text', text: `Room ${(intent as any).roomNumber} does not exist. Please check your room list.` },
              { type: 'action_buttons', buttons: [{ label: 'View All Rooms', icon: 'business-outline', screen: 'Rooms', variant: 'primary' }] }
            ]);
          } else {
            let floorChips: { label: string; icon: string; onPress: () => void }[] = [];
            try {
              const currentFloor = room.floor_number ?? room.floor;
              if (currentFloor !== undefined) {
                const floorData = await fetchRoomsByFloor(currentFloor);
                if (floorData && floorData.rooms) {
                  // Sort rooms by room number and include ALL rooms on this floor
                  const otherRooms = floorData.rooms
                    .map(r => r.room_number)
                    .filter(rn => rn)
                    .sort((a, b) => Number(a) - Number(b));

                  floorChips = otherRooms.map(rn => ({
                    label: `Room ${rn}`,
                    icon: 'home-outline',
                    onPress: () => handleIntent({ type: 'SHOW_ROOM_DETAIL', roomNumber: rn })
                  }));
                }
              }
            } catch (e) {
              // Ignore floor fetch errors silently
            }

            const responseBlocks: any[] = [
              { type: 'info_tip', text: `Room ${(intent as any).roomNumber} specifications & occupant details.`, icon: 'business-outline', color: '#4F46E5' },
              { type: 'room_detail_card', room }
            ];

            if (floorChips.length > 0) {
              const currentFloor = room.floor_number ?? room.floor;
              responseBlocks.push({ type: 'follow_up_chips', label: `Other rooms on Floor ${currentFloor}:`, chips: floorChips });
            } else {
              responseBlocks.push({
                type: 'follow_up_chips', label: `Explore:`, chips: [
                  { label: 'All Rooms', icon: 'business-outline', onPress: () => handleIntent({ type: 'SHOW_ROOMS' }) }
                ]
              });
            }

            addBot(responseBlocks);
          }
        } catch {
          setIsTyping(false);
          addBot([{ type: 'text', text: 'Error loading room details.' }]);
        }
        break;
      }

      case 'SHOW_FLOOR_DETAIL': {
        setIsTyping(true);
        try {
          const floor = await fetchRoomsByFloor((intent as any).floorNumber);
          if (!floor) {
            addBot([
              { type: 'info_tip', text: `Floor ${(intent as any).floorNumber} not found or has no rooms.`, icon: 'layers-outline', color: '#EF4444' },
              { type: 'text', text: `No rooms found on Floor ${(intent as any).floorNumber}.` }
            ]);
          } else {
            addBot([
              { type: 'info_tip', text: `Overview of all rooms on Floor ${(intent as any).floorNumber}.`, icon: 'layers-outline', color: '#D97706' },
              { type: 'floor_detail_card', floor }
            ]);
          }
        } catch {
          setIsTyping(false);
          addBot([{ type: 'text', text: 'Error loading floor details.' }]);
        }
        break;
      }

      case 'SHOW_PAID_STUDENTS': {
        setIsTyping(true);
        try {
          const list = await fetchPaidStudents();
          addBot([
            { type: 'info_tip', text: `Showing list of ${list.length} students who have completed their rent payment.`, icon: 'checkmark-circle-outline', color: '#10B981' },
            {
              type: 'student_list_card', title: 'Paid Students List', students: list.map(s => ({
                name: s.name,
                roomNumber: s.roomNumber,
                paidAmount: s.paidAmount,
                phone: s.phone,
                badgeText: 'Paid',
                badgeColor: '#ECFDF5',
                badgeTextColor: '#10B981'
              }))
            }
          ]);
        } catch {
          setIsTyping(false);
          addBot([{ type: 'text', text: 'Failed to load paid students list.' }]);
        }
        break;
      }

      case 'SHOW_APP_INFO': {
        const topic = (intent as any).topic || 'owner';
        addBot([
          { type: 'app_info_card', topic },
          {
            type: 'follow_up_chips', label: 'Explore app details:', chips: [
              { label: '👨‍💻 App Owner', icon: 'person-outline', onPress: () => handleIntent({ type: 'SHOW_APP_INFO', topic: 'owner' }) },
              { label: '🎯 Main Goal', icon: 'rocket-outline', onPress: () => handleIntent({ type: 'SHOW_APP_INFO', topic: 'goal' }) },
              { label: '💡 How to Use', icon: 'help-circle-outline', onPress: () => handleIntent({ type: 'SHOW_APP_INFO', topic: 'usage' }) },
            ]
          }
        ]);
        break;
      }




      case 'SHOW_DUES': {
        setIsTyping(true);
        const dues = await fetchDuesSummary();
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
          const dueFilter = (intent as any).filter || 'all';

          if (dueFilter === 'overdue' || dueFilter === 'pending') {
            const filteredList = dueFilter === 'overdue'
              ? dues.allDefaulters.filter(d => d.status === 'overdue')
              : dues.allDefaulters; // all pending fees

            const labelText = dueFilter === 'overdue'
              ? `Showing ${filteredList.length} students whose payment due date has already passed.`
              : `Showing ${filteredList.length} students who have not paid rent this month.`;

            addBot([
              { type: 'info_tip', text: labelText, icon: 'time-outline', color: '#EF4444' },
              {
                type: 'student_list_card', title: dueFilter === 'overdue' ? 'Overdue Students' : 'Pending Students', students: filteredList.map(s => ({
                  name: s.name,
                  roomNumber: s.roomNumber || 'N/A',
                  phone: String(s.amount), // Using phone prop for amount visualization in the card
                  badgeText: `₹${s.amount}`,
                  badgeColor: '#FEF2F2',
                  badgeTextColor: '#EF4444'
                }))
              },
              {
                type: 'follow_up_chips', label: 'Related:', chips: [
                  { label: 'All dues overview', icon: 'pie-chart-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'all' }) },
                  { label: 'Send Reminders', icon: 'notifications-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'send_reminder' }) },
                  { label: 'Collect Payment', icon: 'cash-outline', onPress: () => handleIntent({ type: 'SHOW_PAYMENTS' }) },
                ]
              },
              {
                type: 'action_buttons', buttons: [
                  { label: 'Send Reminders', icon: 'notifications-outline', screen: 'Reminders', variant: 'primary' },
                  { label: 'Collect Payment', icon: 'cash-outline', screen: 'PendingPayments', variant: 'outline' },
                ]
              },
            ]);
          } else {
            // 'all' filter — show donut breakdown
            addBot([
              { type: 'info_tip', text: 'Full payment status breakdown for all students this month.', icon: 'wallet-outline', color: '#EF4444' },
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
                type: 'follow_up_chips', label: 'Explore Details:', chips: [
                  { label: 'Overdue only', icon: 'time-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'overdue' }) },
                  { label: 'Unpaid only', icon: 'alert-circle-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'pending' }) },
                  { label: 'Collection', icon: 'cash-outline', onPress: () => handleIntent({ type: 'SHOW_PAYMENTS' }) },
                  { label: 'Reports', icon: 'bar-chart-outline', onPress: () => handleIntent({ type: 'SHOW_REPORTS' }) },
                ]
              },
              {
                type: 'action_buttons', buttons: [
                  { label: 'Collect Payment', icon: 'cash-outline', screen: 'PendingPayments', variant: 'primary' },
                  { label: 'Send Reminders', icon: 'notifications-outline', screen: 'Reminders', variant: 'outline' },
                ]
              },
            ]);
          }
        }
        break;
      }


      case 'SHOW_ROOMS': {
        setIsTyping(true);
        const [occ, allRooms] = await Promise.all([
          fetchOccupancy(),
          fetchRooms()
        ]);
        if (!occ || occ.total === 0) {
          addBot([
            { type: 'info_tip', text: 'As of now, no rooms or beds are registered in this hostel.', icon: 'business-outline', color: '#64748B' },
            { type: 'text', text: 'No room records found. Tap "Add Room" to create your first room and set bed capacities.' },
            { type: 'action_buttons', buttons: [{ label: 'Add Room Now', icon: 'add-circle-outline', screen: 'AddRoom', variant: 'primary' }] }
          ]);
        } else {
          // Build real room suggestion chips from the actual hostel database
          const realRoomChips = (allRooms || []).slice(0, 4).map((r: any) => ({
            label: `Room ${r.room_number}`,
            icon: 'home-outline',
            onPress: () => handleIntent({ type: 'SHOW_ROOM_DETAIL', roomNumber: r.room_number })
          }));

          addBot([
            { type: 'info_tip', text: `Rooms Overview: ${occ.totalRooms} Rooms, ${occ.totalFloors} Floors, ${occ.total} Total Beds (${occ.available} Available Beds).`, icon: 'business-outline', color: '#4F46E5' },
            {
              type: 'occupancy_donut',
              occupied: occ.occupied,
              available: occ.available,
              total: occ.total
            },
            {
              type: 'stat_cards', cards: [
                { label: 'Total Rooms', value: String(occ.totalRooms), icon: 'home-outline', color: '#4F46E5', bg: '#EEF2FF' },
                { label: 'Single Share', value: `${occ.singleRooms} Rooms`, icon: 'person-outline', color: '#0284C7', bg: '#E0F2FE' },
                { label: 'Double Share', value: `${occ.doubleRooms} Rooms`, icon: 'people-outline', color: '#7C3AED', bg: '#F3E8FF' },
                { label: 'Triple Share', value: `${occ.tripleRooms} Rooms`, icon: 'people-circle-outline', color: '#D97706', bg: '#FEF3C7' },
                { label: '4 Share', value: `${occ.fourRooms} Rooms`, icon: 'grid-outline', color: '#059669', bg: '#ECFDF5' },
                { label: 'Total Beds', value: String(occ.total), icon: 'business-outline', color: '#64748B', bg: '#F8FAFC' },
                { label: 'Occupied Beds', value: String(occ.occupied), icon: 'people-outline', color: '#8B5CF6', bg: '#F3E8FF' },
                { label: 'Available Beds', value: String(occ.available), icon: 'bed-outline', color: '#10B981', bg: '#ECFDF5' },
              ]
            },
            {
              type: 'follow_up_chips', label: 'Explore Your Hostel Rooms:', chips: [
                { label: 'Available Beds', icon: 'bed-outline', onPress: () => handleQuery('how many vacant beds') },
                ...realRoomChips,
                { label: 'View All Rooms', icon: 'list-outline', onPress: () => handleIntent({ type: 'SHOW_ROOM_LIST_INLINE' }) },
              ]
            },
            {
              type: 'action_buttons', buttons: [
                { label: 'Add Room (+)', icon: 'add-circle-outline', screen: 'AddRoom', variant: 'primary' },
              ]
            },
          ]);
        }
        break;
      }

      case 'SHOW_ROOM_LIST_INLINE': {
        addBot([{ type: 'loading' }]);
        try {
          const roomsRes = await fetchRooms();
          removeLoadingBlock();
          if (!roomsRes || roomsRes.length === 0) {
            addBot([{ type: 'text', text: 'You currently have no rooms.' }]);
          } else {
            addBot([
              { type: 'info_tip', text: `Showing all ${roomsRes.length} rooms in your hostel.`, icon: 'business-outline', color: '#4F46E5' },
              {
                type: 'follow_up_chips', label: 'Rooms:', chips: roomsRes.map((r: any) => ({
                  label: `Room ${r.room_number}`,
                  icon: 'home-outline',
                  onPress: () => handleIntent({ type: 'SHOW_ROOM_DETAIL', roomNumber: r.room_number })
                }))
              }
            ]);
          }
        } catch {
          removeLoadingBlock();
          addBot([{ type: 'text', text: 'Error fetching the rooms list.' }]);
        }
        break;
      }



      case 'SHOW_PAYMENTS': {
        setIsTyping(true);
        try {
          const fin = await fetchFinancialOverview();
          const collected = fin?.income ?? snap?.monthCollection ?? 0;
          const pending = fin?.pendingDues ?? snap?.pendingDues ?? 0;
          const totalTenants = snap?.activeTenants ?? 0;
          const paidCount = snap ? Math.round((collected / Math.max(collected + pending, 1)) * totalTenants) : 0;
          addBot([
            { type: 'info_tip', text: `Here's your rent collection summary for this month.`, icon: 'cash-outline', color: '#4F46E5' },
            {
              type: 'stat_cards', cards: [
                { label: '💰 Collected', value: INR(collected), icon: 'checkmark-circle-outline', color: '#10B981', bg: '#ECFDF5' },
                { label: '⚠️ Pending', value: INR(pending), icon: 'alert-circle-outline', color: '#EF4444', bg: '#FEF2F2' },
              ]
            },
            ...(fin?.trend && fin.trend.length >= 2 ? [{ type: 'trend_chart' as const, data: fin.trend }] : []),
            {
              type: 'follow_up_chips', label: 'Related:', chips: [
                { label: "Who hasn't paid?", icon: 'alert-circle-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'pending' }) },
                { label: 'Overdue students', icon: 'time-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'overdue' }) },
                { label: 'Paid students', icon: 'checkmark-circle-outline', onPress: () => handleIntent({ type: 'SHOW_PAID_STUDENTS' }) },
                { label: 'Full reports', icon: 'bar-chart-outline', onPress: () => handleIntent({ type: 'SHOW_REPORTS' }) },
              ]
            },
            {
              type: 'action_buttons', buttons: [
                { label: 'Collect Payment', icon: 'cash-outline', screen: 'PendingPayments', variant: 'primary' },
                { label: 'Payment History', icon: 'checkmark-circle-outline', screen: 'CollectedPayments', variant: 'outline' },
                { label: 'Download Receipts', icon: 'download-outline', screen: 'DownloadReceipts', variant: 'outline' },
              ]
            },
          ]);
        } catch {
          setIsTyping(false);
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
              ]
            },
          ]);
        }
        break;
      }

      case 'SHOW_REPORTS': {
        setIsTyping(true);
        const fin = await fetchFinancialOverview();
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
        setIsTyping(true);
        const exp = await fetchExpenseSummary();
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

      case 'SHOW_INCOME': {
        setIsTyping(true);
        try {
          const incData = await fetchDetailedIncomeBreakdown();
          addBot([
            { type: 'info_tip', text: 'Complete breakdown of all revenue sources for your hostel this month.', icon: 'trending-up-outline', color: '#10B981' },
            { type: 'income_breakdown_card', data: incData },
            {
              type: 'action_buttons', buttons: [
                { label: 'View Financial Report', icon: 'bar-chart-outline', screen: 'Reports', variant: 'primary' },
                { label: 'View Payments', icon: 'cash-outline', screen: 'CollectedPayments', variant: 'outline' }
              ]
            }
          ]);
        } catch {
          setIsTyping(false);
          addBot([{ type: 'text', text: 'Error loading income breakdown.' }]);
        }
        break;
      }


      case 'SHOW_HOSTELS': {
        setIsTyping(true);
        const hostelsList = await fetchMyHostels();
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
        setIsTyping(true);
        const staff = await fetchStaffList();
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
          const totalSalary = activeStaff.reduce((sum: number, s: any) => sum + parseFloat(s.monthly_salary ?? s.salary ?? 0), 0);

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
        setIsTyping(true);
        const guestData = await fetchGuestsList();
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

      case 'SHOW_NOTICES': {
        setIsTyping(true);
        try {
          const count = await fetchNoticesCount();
          if (count === 0) {
            addBot([
              { type: 'info_tip', text: 'No notices posted for your hostel as of now.', icon: 'megaphone-outline', color: '#64748B' },
              { type: 'text', text: 'As of now, no records/notices have been published. Tap "Add Notice" to post a new announcement for tenants.' },
              {
                type: 'action_buttons', buttons: [
                  { label: 'Add Notice Now', icon: 'add-circle-outline', screen: 'AddNotice', variant: 'primary' },
                  { label: 'Manage Notices', icon: 'megaphone-outline', screen: 'NoticesManagement', variant: 'outline' },
                ]
              }
            ]);
          } else {
            addBot([
              { type: 'info_tip', text: `Showing ${count} active notice(s) published for your hostel.`, icon: 'megaphone-outline', color: '#4F46E5' },
              {
                type: 'action_buttons', buttons: [
                  { label: 'Manage Notices', icon: 'megaphone-outline', screen: 'NoticesManagement', variant: 'primary' },
                  { label: 'Add Notice (+)', icon: 'add-circle-outline', screen: 'AddNotice', variant: 'outline' },
                ]
              }
            ]);
          }
        } catch {
          setIsTyping(false);
          addBot([
            { type: 'info_tip', text: 'As of now, no notice records are available.', icon: 'megaphone-outline', color: '#64748B' },
            {
              type: 'action_buttons', buttons: [
                { label: 'Post Notice Now', icon: 'add-circle-outline', screen: 'AddNotice', variant: 'primary' }
              ]
            }
          ]);
        }
        break;
      }



      case 'SHOW_HOW_TO': {
        const action = intent.action;
        const guide = HOW_TO_STEPS[action];
        if (guide) {
          // Related follow-up chips based on action type
          const relatedChips: Record<string, Array<{ label: string; icon: string; onPress: () => void }>> = {
            add_student: [
              { label: 'How to assign a bed?', icon: 'bed-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'assign_bed' }) },
              { label: 'How to collect rent?', icon: 'cash-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'collect_rent' }) },
              { label: 'How to deactivate?', icon: 'person-remove-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'deactivate_student' }) },
              { label: 'View all students', icon: 'people-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS' }) },
            ],
            collect_rent: [
              { label: 'Who hasn\'t paid?', icon: 'alert-circle-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'pending' }) },
              { label: 'How to download receipt?', icon: 'document-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'download_receipt' }) },
              { label: 'How to send reminder?', icon: 'notifications-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'send_reminder' }) },
              { label: 'Pending dues', icon: 'wallet-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'all' }) },
            ],
            add_room: [
              { label: 'How to assign a bed?', icon: 'bed-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'assign_bed' }) },
              { label: 'How to prebook a room?', icon: 'calendar-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'prebook_room' }) },
              { label: 'Room occupancy', icon: 'business-outline', onPress: () => handleIntent({ type: 'SHOW_ROOMS' }) },
            ],
            assign_bed: [
              { label: 'How to add student?', icon: 'person-add-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'add_student' }) },
              { label: 'How to vacate a bed?', icon: 'exit-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'vacate_bed' }) },
              { label: 'Available beds', icon: 'bed-outline', onPress: () => handleQuery('how many vacant beds') },
            ],
            vacate_bed: [
              { label: 'How to deactivate student?', icon: 'person-remove-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'deactivate_student' }) },
              { label: 'How to assign new bed?', icon: 'bed-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'assign_bed' }) },
              { label: 'View rooms', icon: 'business-outline', onPress: () => handleIntent({ type: 'SHOW_ROOMS' }) },
            ],
            deactivate_student: [
              { label: 'How to vacate bed?', icon: 'exit-outline', onPress: () => handleIntent({ type: 'SHOW_HOW_TO', action: 'vacate_bed' }) },
              { label: 'Students left this month', icon: 'exit-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS', filter: 'vacated_this_month' }) },
              { label: 'View students', icon: 'people-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS' }) },
            ],
            add_expense: [
              { label: 'Expenses this month', icon: 'receipt-outline', onPress: () => handleIntent({ type: 'SHOW_EXPENSES' }) },
              { label: 'Financial reports', icon: 'bar-chart-outline', onPress: () => handleIntent({ type: 'SHOW_REPORTS' }) },
            ],
            send_reminder: [
              { label: 'Pending dues', icon: 'alert-circle-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'all' }) },
              { label: 'Who hasn\'t paid?', icon: 'wallet-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'pending' }) },
            ],
          };

          const chips = relatedChips[action] ?? [
            { label: 'View Students', icon: 'people-outline', onPress: () => handleIntent({ type: 'SHOW_STUDENTS' }) },
            { label: 'Pending Dues', icon: 'alert-circle-outline', onPress: () => handleIntent({ type: 'SHOW_DUES', filter: 'all' }) },
          ];

          typingThen([
            { type: 'steps', title: guide.title, steps: guide.steps, screen: guide.screen, screenLabel: guide.screenLabel },
            { type: 'follow_up_chips', label: '🔗 Related topics:', chips },
          ]);
        }
        break;
      }

      case 'UNKNOWN':
        typingThen([
          { type: 'text', text: `I didn't quite catch that. Here is how you can search:\n\n👤 Find a student: Type their name (e.g., "Durgarao")\n🚪 Find a room: Type the room number (e.g., "201")\n❓ Ask questions: Try asking "who hasn't paid rent?" or "show total profit"` },
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
    setIsTyping(true);
    setInputText('');
    handleIntent(resolveIntent(text));
  }, [handleIntent]);

  const triggerMenuAction = useCallback((label: string, intent: AssistantIntent) => {
    addUser(label);
    setIsTyping(true);
    setInputText('');
    handleIntent(intent);
  }, [handleIntent]);

  // ── Reset ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    setMessages(getInitialWelcomeMsgs());
    setInputText('');
    loadSnap();
  };

  // Only owners (exclude tenants)
  const isTenant = user?.role?.toUpperCase() === 'TENANT' || user?.role_id === 3;
  if (!user || isTenant || isTourActive || isAssistantHidden) return null;

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <TouchableOpacity
          style={[s.fab, fabPos]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { }); setIsOpen(true); }}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#7C3AED', '#6D28D9']} style={s.fabGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Modal visible={isOpen} transparent={false} animationType="slide" onRequestClose={() => setIsOpen(false)} statusBarTranslucent={false}>
        {/* SafeAreaView handles top inset (status bar). Bottom inset is handled seamlessly inside inputBarWrapper */}
        {/* iOS: handle both top & bottom inset via SafeAreaView so the
            input bar clears the home indicator. Android: non-transparent
            Modal dialogs don't expose the gesture nav bar to SafeAreaView,
            so we only claim the top inset there and handle the bottom
            manually in inputBarWrapper. */}
        <SafeAreaView style={s.safe} edges={Platform.OS === 'ios' ? ['top', 'bottom'] : ['top']}>
          {/* Chat column: header (fixed) → message list (flex) → composer
              (bottom). The only thing the keyboard changes is this column's
              bottom padding, so the composer is always the last thing above
              the keyboard and the list absorbs the space change. See
              syncKeyboardInset() for why this replaces KeyboardAvoidingView. */}
          <View
            style={[s.body, keyboardInset > 0 && { paddingBottom: keyboardInset }]}
            onLayout={handleBodyLayout}
          >

            {/* ── Header ── */}
            <LinearGradient
              colors={['#6D28D9', '#7C3AED', '#8B5CF6']}
              style={s.header}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              {/* Decorative circles */}
              <View style={s.headerDecorCircle1} />
              <View style={s.headerDecorCircle2} />

              {/* TEMPORARY: long-press here toggles the keyboard debug overlay. */}
              <Pressable
                style={s.headerLeft}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => { });
                  setShowKbdDebug(v => !v);
                }}
                delayLongPress={900}
              >
                {/* Avatar with glowing ring */}
                <View style={s.avatarRing}>
                  <View style={s.avatarBox}>
                    <Image
                      source={require('../../../assets/chatbot.jpeg')}
                      style={s.avatarImg}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={s.onlineDot} />
                </View>

                <View style={{ flex: 1 }}>
                  {/* Greeting line */}
                  <Text style={s.headerGreeting} numberOfLines={1}>
                    {getGreeting(user?.full_name)}
                  </Text>
                  <Text style={s.headerTitle}>HOSTIX Assistant</Text>
                  {/* Welcome + hostel pill */}
                  <View style={s.aiBadge}>
                    <Text style={s.aiBadgeText}>Welcome</Text>
                    <Text style={s.aiBadgeSep}>·</Text>
                    <Ionicons name="business-outline" size={10} color="#C4B5FD" />
                    <Text style={s.aiBadgeText} numberOfLines={1}>{user?.hostel_name || 'Your Hostel'}</Text>
                  </View>
                </View>
              </Pressable>

              {/* Action buttons — side by side */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity style={s.headerActionBtn} onPress={handleReset}>
                  <Ionicons name="refresh-outline" size={16} color="#DDD6FE" />
                </TouchableOpacity>
                <TouchableOpacity style={s.headerActionBtn} onPress={() => setIsOpen(false)}>
                  <Ionicons name="close" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* TEMPORARY: keyboard diagnostics, long-press the header to toggle.
                Absolutely positioned + pointerEvents none, so it cannot affect
                the very layout it is measuring. */}
            <KeyboardInsetDebugOverlay
              breakdown={kbdBreakdown}
              appliedInset={keyboardInset}
              top={96}  // just under the header; s.body already starts below the status bar
            />

            {/* ── Main content area (flex:1 — fills all remaining space) ── */}
            <View style={s.chatArea}>
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={s.msgList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                onContentSizeChange={() => scrollToEnd(true)}
              >

                {/* ── AI Copilot Top Live Hub (replaces blank gap) ── */}
                {messages.length <= 2 && (
                  <View style={s.topHubCard}>
                    {/* Welcome Banner */}
                    <View style={s.topHubHeader}>
                      <View style={s.topHubBotBadge}>
                        <Ionicons name="chatbubble-ellipses" size={16} color="#7C3AED" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.topHubTitle}>Hostix AI</Text>
                        <Text style={s.topHubSub}>Ask any question or tap a quick action below</Text>
                      </View>
                    </View>

                    {/* Quick Live Pulse Action Capsules */}
                    <View style={s.topPulseRow}>
                      <TouchableOpacity
                        style={[s.topPulseItem, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                        onPress={() => handleQuery("Who hasn't paid this month?")}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="alert-circle" size={13} color="#EF4444" />
                        <Text style={[s.topPulseText, { color: '#B91C1C' }]}>Check Dues</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[s.topPulseItem, { backgroundColor: '#E0E7FF', borderColor: '#C7D2FE' }]}
                        onPress={() => handleQuery("How many beds available?")}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="bed" size={13} color="#6366F1" />
                        <Text style={[s.topPulseText, { color: '#4338CA' }]}>Available Beds</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[s.topPulseItem, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}
                        onPress={() => handleQuery("Profit this month")}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="trending-up" size={13} color="#16A34A" />
                        <Text style={[s.topPulseText, { color: '#15803D' }]}>Month Profit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Quick-ask chips — 2-col grid */}
                {messages.length <= 2 && (
                  <View style={s.chipsSection}>
                    <Text style={s.chipsSectionLabel}>💬 Frequently Asked</Text>
                    <View style={s.chipsGrid}>
                      {WELCOME_CHIPS.map((chip, i) => (
                        <TouchableOpacity
                          key={i}
                          style={s.chipsGridItem}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => { });
                            handleQuery(chip.q);
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={s.chipsGridIconBox}>
                            <Ionicons name={chip.icon as any} size={16} color="#6366F1" />
                          </View>
                          <Text style={s.chipsGridLabel} numberOfLines={1}>{chip.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Message thread */}
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
                        <View style={[s.botBubble, { flex: 1, width: '100%' }]}>
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
            </View>

            {/* ── Bottom input bar & Powered by HOSTIX branding ── */}
            {/* inputBarWrapper bottom padding — keyed off keyboardInset, not off
                isKeyboardActive. The two can disagree for a frame (the flag
                flips on the keyboard event, the inset lands with the layout
                pass), and keying off the flag meant the composer briefly lost
                its nav-bar clearance and dropped behind the gesture bar.
                - keyboard up: the column's keyboardInset already lifts the
                  composer clear of the IME, so only a hairline is left here.
                - iOS idle: SafeAreaView(edges=['top','bottom']) already handles
                  the home indicator.
                - Android idle: the Modal dialog window draws behind the gesture
                  nav bar, so we add insets.bottom ourselves (min 8). */}
            <View style={[
              s.inputBarWrapper,
              isFocused && s.inputBarWrapperFocused,
              {
                paddingBottom: keyboardInset > 0
                  ? 4
                  : (Platform.OS === 'ios'
                    ? 4  // iOS SafeAreaView(bottom) already handles home indicator
                    : Math.max(insets.bottom, 8))  // Android gesture-nav clearance
              }
            ]}>
              {/* Quick Actions Grid — 2 Rows Grid (All 8 items visible, no clipping) */}
              {isAddMenuOpen && (
                <View style={s.quickMenuWrapper}>
                  <ScrollView
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.quickMenuGrid}
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 150 }}
                  >
                    {menuItems.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[s.quickMenuItem, { backgroundColor: item.bg, borderColor: item.color + '40' }]}
                        onPress={() => {
                          setIsAddMenuOpen(false);
                          if (item.intent) {
                            triggerMenuAction(item.label, item.intent);
                          }
                        }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name={item.icon as any} size={15} color={item.color} />
                        <Text style={[s.quickMenuItemText, { color: '#1E293B' }]} numberOfLines={1}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={[s.inputBar, isFocused && s.inputBarFocused]}>
                {/* Quick-actions toggle — bolt icon, neutral resting, red when open */}
                <TouchableOpacity
                  onPress={toggleQuickMenu}
                  style={[
                    s.menuBtnWrap,
                    isAddMenuOpen && s.menuBtnWrapActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isAddMenuOpen ? 'close-outline' : 'flash-outline'}
                    size={20}
                    color={isAddMenuOpen ? '#DC2626' : '#64748B'}
                  />
                </TouchableOpacity>

                {/* Search / input pill */}
                <TouchableOpacity
                  activeOpacity={1}
                  style={[s.inputWrap, isFocused && s.inputWrapFocused]}
                  onPress={() => inputRef.current?.focus()}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={17} color={isFocused ? "#4F46E5" : "#94A3B8"} style={{ marginRight: 6 }} />
                  <TextInput
                    ref={inputRef}
                    style={s.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Ask me anything..."
                    placeholderTextColor="#94A3B8"
                    returnKeyType="send"
                    editable={true}
                    pointerEvents="auto"
                    onSubmitEditing={() => handleQuery(inputText)}
                    multiline={false}
                    maxFontSizeMultiplier={1.3}
                    underlineColorAndroid="transparent"
                    onFocus={() => {
                      if (isAddMenuOpen) {
                        setIsAddMenuOpen(false);
                      }
                      setIsFocused(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                  />
                  {inputText.length > 0 && (
                    <TouchableOpacity onPress={() => setInputText('')} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {/* Send button */}
                <TouchableOpacity
                  style={s.sendBtnTouch}
                  onPress={() => handleQuery(inputText)}
                  activeOpacity={0.8}
                  disabled={!inputText.trim()}
                >
                  {inputText.trim() ? (
                    <LinearGradient
                      colors={['#6366F1', '#4F46E5']}
                      style={s.sendBtnGrad}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="send" size={15} color="#FFF" style={{ marginLeft: 2 }} />
                    </LinearGradient>
                  ) : (
                    <View style={s.sendBtnDisabled}>
                      <Ionicons name="send" size={15} color="#CBD5E1" style={{ marginLeft: 2 }} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Powered by HOSTIX footer branding */}
              {!isKeyboardActive && !isAddMenuOpen && (
                <View style={s.footerBranding}>
                  <View style={s.footerRule} />
                  <Text style={s.footerBrandingText}>Powered by</Text>
                  <Text style={s.footerBrandingBold}>HOSTIX</Text>
                  <View style={s.footerRule} />
                </View>
              )}
            </View>

          </View>

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
    width: 52, height: 52, borderRadius: 26,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#7C3AED', shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    zIndex: 999999,
  },
  fabGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Modal */
  // Background must be white — the purple header colour is applied only to the
  // LinearGradient header element itself.  If this SafeAreaView keeps purple,
  // the bottom safe-area slot (edges={['top','bottom']}) shows a purple block
  // below the content when the keyboard is closed.
  safe: { flex: 1, backgroundColor: '#FFF' },
  // Chat column. Its bottom padding is the single knob the keyboard turns.
  body: { flex: 1, backgroundColor: '#FFF' },
  chatArea: { flex: 1, backgroundColor: '#F8FAFC' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  headerDecorCircle1: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -30, right: 60,
  },
  headerDecorCircle2: {
    position: 'absolute', width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -20, right: 10,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatarBox: {
    width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#E0E7FF',
  },
  avatarImg: { width: '100%', height: '100%', transform: [{ scale: 1.4 }, { translateY: 4 }] },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#4ADE80', borderWidth: 1.5, borderColor: '#FFF',
  },
  headerGreeting: { color: '#DDD6FE', fontSize: 11, fontWeight: '500', marginBottom: 1 },
  headerTitle: { color: '#FFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3,
  },
  aiBadgeDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80',
  },
  aiBadgeText: { color: '#C4B5FD', fontSize: 10, fontWeight: '500' },
  aiBadgeSep: { color: '#7C6FCD', fontSize: 10 },
  headerActionBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtn: { padding: 6, borderRadius: 8 },

  /* Session card */
  sessionCard: {
    alignSelf: 'center',
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sessionCardGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  sessionCardItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  sessionCardIcon: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sessionCardLabel: {
    fontSize: 11.5, fontWeight: '600', color: '#334155',
  },
  sessionCardDivider: {
    width: 1, height: 14, backgroundColor: '#C4B5FD', opacity: 0.5,
  },

  /* Messages */
  msgList: { padding: 16, gap: 16, paddingBottom: 12, flexGrow: 1 },
  topHubCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topHubBotBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHubTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  topHubSub: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  topPulseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topPulseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  topPulseText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  topSmallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  topSmallCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  topSmallCardDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 2,
  },
  topSearchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  topSearchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
  },
  topSearchSubmitBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  inputBarWrapper: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    zIndex: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFF',
  },
  inputBarFocused: {
    backgroundColor: '#FAFAFF',
  },
  inputBarWrapperFocused: {
    borderTopColor: '#E0E7FF',
  },
  /* Neutral resting state — no purple tint unless open */
  menuBtnWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuBtnWrapActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  inputWrapFocused: {
    backgroundColor: '#FFF',
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  sendBtnTouch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  sendBtnGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  sendBtnDisabled: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  footerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footerChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  /* Welcome bubble */
  welcomeBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    maxWidth: '88%',
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    lineHeight: 20,
  },
  /* Quick-ask chips grid */
  chipsSection: {
    marginTop: 4,
    marginBottom: 4,
  },
  chipsSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipsGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#6366F1',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  chipsGridIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsGridLabel: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  /* Legacy chip styles kept for reference */
  chipRowOuter: { position: 'relative', overflow: 'hidden' },
  chipRowContent: { flexDirection: 'row', gap: 8, paddingVertical: 2, alignItems: 'center' },
  welcomeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  welcomeChipText: { fontSize: 12.5, fontWeight: '600', color: '#334155' },
  chipRowFade: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 44 },
  /* Legacy chipPanel kept for any remaining reference */
  chipPanel: {
    display: 'none' as any, // no longer rendered — chips moved inline
  },
  /* Quick-actions 2-row grid */
  quickMenuWrapper: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  quickMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  quickMenuItem: {
    width: '23%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  quickMenuItemText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'android' ? 6 : 2,
    backgroundColor: '#FFF',
  },
  // Hairline on each side, so the wordmark reads as a signature rather than a
  // label. flexShrink lets the rules give way first on narrow screens.
  footerRule: {
    height: 1,
    width: 26,
    flexShrink: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
  },
  footerBrandingText: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#A8B3C4',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // The wordmark carries its own weight, colour and tracking — that contrast is
  // what makes it read as a brand instead of more body copy.
  footerBrandingBold: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 1.4,
  },
});




export default OwnerAssistant;
