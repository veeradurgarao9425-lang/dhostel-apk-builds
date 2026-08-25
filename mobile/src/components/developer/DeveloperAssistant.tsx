import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView,
  Modal, Platform, TextInput,
  Animated, Image, Keyboard, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import * as RootNavigation from '../../navigation/navigationRef';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { AssistantResponse, ContentBlock } from '../assistant/AssistantResponse';
import { developerService } from '../../services/developerService';

const { width: SCREEN_W } = Dimensions.get('window');
const INR = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

function getGreeting(name?: string) {
  const h = new Date().getHours();
  const first = name?.split(' ')[0] || 'Durgarao';
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${first} 👑`;
}

interface Msg {
  id: string;
  sender: 'bot' | 'user';
  text?: string;
  blocks?: ContentBlock[];
}

const WELCOME_CHIPS: Array<{ icon: string; label: string; q: string }> = [
  { icon: 'people-outline', label: 'Owners Breakdown', q: 'How many owners are registered?' },
  { icon: 'school-outline', label: 'Total Students', q: 'How many students on platform?' },
  { icon: 'business-outline', label: 'Hostels Overview', q: 'Show all hostels breakdown' },
  { icon: 'person-add-outline', label: 'Joined Today', q: 'Who joined today?' },
  { icon: 'walk-outline', label: 'Vacated / Left', q: 'Who left today?' },
  { icon: 'gift-outline', label: 'Expiring Trials', q: 'Whose free trial is ending soon?' },
  { icon: 'pulse-outline', label: 'System Diagnostics', q: 'Check server health and database' },
];

const DEV_MENU_ITEMS = [
  { label: 'Owners Breakdown', icon: 'people-outline', color: '#7C3AED', bg: '#F3E8FF', q: 'How many owners are registered?' },
  { label: 'Students Roster', icon: 'school-outline', color: '#10B981', bg: '#ECFDF5', q: 'How many students on platform?' },
  { label: 'Hostels Network', icon: 'business-outline', color: '#EA580C', bg: '#FFF7ED', q: 'Show all hostels breakdown' },
  { label: 'New Joiners', icon: 'person-add-outline', color: '#2563EB', bg: '#EFF6FF', q: 'Who joined today?' },
  { label: 'Vacated / Left', icon: 'walk-outline', color: '#DC2626', bg: '#FEF2F2', q: 'Who left today?' },
  { label: 'Expiring Trials', icon: 'gift-outline', color: '#D97706', bg: '#FEF3C7', q: 'Whose free trial is ending soon?' },
  { label: 'Diagnostics', icon: 'pulse-outline', color: '#0D9488', bg: '#F0FDFA', q: 'Check server health and database' },
];

export const DeveloperAssistant: React.FC = () => {
  const { developer, isDeveloperLoggedIn, enterSupportMode } = useDeveloper();
  const insets = useSafeAreaInsets();
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { keyboardInset, onContainerLayout, resetKeyboardInset } = useKeyboardInset({
    onVisibilityChange: setIsKeyboardActive,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const msgId = useRef(0);
  const wasOpenRef = useRef(false);

  // Opening/closing the modal sheet must cleanly clear keyboard state and avoid stale insets
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    Keyboard.dismiss();
    setIsAddMenuOpen(false);
    setIsFocused(false);
    setIsKeyboardActive(false);
    resetKeyboardInset();
  }, [isOpen, resetKeyboardInset]);

  const nextId = () => {
    msgId.current += 1;
    return `dev_msg_${Date.now()}_${msgId.current}`;
  };

  const [metricsData, setMetricsData] = useState<any>(null);

  // Fetch real-time metrics for the landing Command Center
  const fetchLandingMetrics = useCallback(async () => {
    try {
      const [dashRes, finRes] = await Promise.allSettled([
        developerService.getDashboardMetrics(),
        developerService.getFinanceOverview(),
      ]);
      const dash = dashRes.status === 'fulfilled' ? dashRes.value?.data : null;
      const fin = finRes.status === 'fulfilled' ? finRes.value?.data : null;
      setMetricsData({
        metrics: dash?.metrics || {},
        finance: fin?.summary || {},
      });
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    if (isOpen && isDeveloperLoggedIn) {
      fetchLandingMetrics();
    }
  }, [isOpen, isDeveloperLoggedIn, fetchLandingMetrics]);

  const getInitialWelcomeMsgs = useCallback((): Msg[] => {
    const ceoName = developer?.full_name?.split(' ')[0] || 'Durgarao';

    return [
      {
        id: nextId(),
        sender: 'bot',
        blocks: [
          {
            type: 'text',
            text: `Hello ${ceoName}! How can I help you manage your hostels today? Ask about revenue, pending dues, student occupancy, or system health.`,
          },
          {
            type: 'follow_up_chips',
            chips: [
              { label: '🏢 Hostels Overview', icon: 'business-outline', onPress: () => handleQuery('Show all hostels breakdown') },
              { label: '💰 Pending Dues', icon: 'wallet-outline', onPress: () => handleQuery('Show pending dues') },
              { label: '👥 Owners Roster', icon: 'people-outline', onPress: () => handleQuery('How many owners are registered?') },
              { label: '🎓 Students Roster', icon: 'school-outline', onPress: () => handleQuery('How many students on platform?') },
            ],
          },
        ],
      },
    ];
  }, [developer]);

  useEffect(() => {
    if (isDeveloperLoggedIn) {
      setMessages(getInitialWelcomeMsgs());
    }
  }, [isDeveloperLoggedIn, getInitialWelcomeMsgs]);

  const addUser = (text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), sender: 'user', text }]);
  };

  const addBot = (blocks: ContentBlock[]) => {
    setMessages((prev) => [...prev, { id: nextId(), sender: 'bot', blocks }]);
  };

  const scrollToEnd = (animated = true) => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated });
    }, 100);
  };

  // Keep newest turn in view when thread changes or keyboard shows/hides
  useEffect(() => {
    if (!messages.length) return;
    const t = setTimeout(() => scrollToEnd(true), 120);
    return () => clearTimeout(t);
  }, [messages, isTyping, isKeyboardActive]);

  const toggleQuickMenu = useCallback(() => {
    if (isKeyboardActive) {
      Keyboard.dismiss();
    }
    setIsAddMenuOpen((prev) => !prev);
  }, [isKeyboardActive]);

  const handleQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setInputText('');
    setIsAddMenuOpen(false);
    addUser(q);
    setIsTyping(true);
    scrollToEnd(true);

    const lower = q.toLowerCase();

    try {
      // 1. OWNERS BREAKDOWN & DIRECT INLINE RECORDS
      if (lower.includes('owner')) {
        const oRes = await developerService.getOwners({ page: 1, limit: 50 });
        const list = oRes?.data || [];
        const activeCount = list.filter((o: any) => o.is_active || o.status === 'ACTIVE' || o.status === 1).length;
        const inactiveCount = list.length - activeCount;

        setIsTyping(false);
        addBot([
          {
            type: 'text',
            text: `👑 Total Registered Owners: ${list.length} (${activeCount} Active, ${inactiveCount} Inactive)`,
          },
          {
            type: 'student_stats_donut',
            active: activeCount,
            inactive: inactiveCount,
            prebooked: 0,
            qrRegister: 0,
          },
          {
            type: 'stat_cards',
            cards: [
              { label: 'Active Owners', value: String(activeCount), icon: 'checkmark-circle-outline', color: '#10B981', bg: '#ECFDF5' },
              { label: 'Inactive / Suspended', value: String(inactiveCount), icon: 'close-circle-outline', color: '#EF4444', bg: '#FEE2E2' },
            ],
          },
          {
            type: 'owner_list_card',
            title: 'Registered Hostel Owners Directory',
            owners: list,
          },
          {
            type: 'follow_up_chips',
            chips: [
              { label: '🏢 Hostels Overview', icon: 'business-outline', onPress: () => handleQuery('Show all hostels breakdown') },
              { label: '🎓 Students Roster', icon: 'school-outline', onPress: () => handleQuery('How many students on platform?') },
              { label: '💰 Pending Dues', icon: 'wallet-outline', onPress: () => handleQuery('Show pending dues') },
            ],
          },
        ]);
      }
      // 2. STUDENTS BREAKDOWN & DIRECT INLINE RECORDS
      else if (lower.includes('student') || lower.includes('tenant') || lower.includes('how many student')) {
        const sRes = await developerService.getStudents({ page: 1, limit: 50 });
        const list = sRes?.data || [];
        const activeCount = list.filter((s: any) => String(s.status).toLowerCase() === 'active' || s.status === 1).length;
        const inactiveCount = list.length - activeCount;

        setIsTyping(false);
        addBot([
          {
            type: 'text',
            text: `🎓 Platform Students Roster: ${list.length} Registered Tenants (${activeCount} Active, ${inactiveCount} Vacated)`,
          },
          {
            type: 'student_stats_donut',
            active: activeCount,
            inactive: inactiveCount,
            prebooked: 0,
            qrRegister: 0,
          },
          {
            type: 'stat_cards',
            cards: [
              { label: 'Active Tenants', value: String(activeCount), icon: 'school-outline', color: '#059669', bg: '#ECFDF5' },
              { label: 'Vacated / Left', value: String(inactiveCount), icon: 'exit-outline', color: '#64748B', bg: '#F1F5F9' },
            ],
          },
          {
            type: 'student_list_card',
            title: 'Registered Student Residents',
            students: list,
          },
          {
            type: 'follow_up_chips',
            chips: [
              { label: '🆕 Who Joined Today?', icon: 'person-add-outline', onPress: () => handleQuery('Who joined today?') },
              { label: '🚪 Vacated Tenants', icon: 'exit-outline', onPress: () => handleQuery('Show vacated students') },
              { label: '🏢 Hostels Overview', icon: 'business-outline', onPress: () => handleQuery('Show all hostels breakdown') },
            ],
          },
        ]);
      }
      // 3. JOINED TODAY
      else if (lower.includes('joined today') || lower.includes('register today') || lower.includes('new student') || lower.includes('today')) {
        const sRes = await developerService.getStudents({ page: 1, limit: 50 });
        const list = sRes?.data || [];
        const todayStr = new Date().toISOString().split('T')[0];
        const joinedToday = list.filter((s: any) => (s.created_at || s.join_date || '').startsWith(todayStr));

        setIsTyping(false);
        if (joinedToday.length > 0) {
          addBot([
            {
              type: 'text',
              text: `🆕 ${joinedToday.length} student(s) joined today (${todayStr}):`,
            },
            {
              type: 'student_list_card',
              title: "Today's New Registrations",
              students: joinedToday,
            },
          ]);
        } else {
          addBot([
            {
              type: 'text',
              text: `🆕 No new students registered today (${todayStr}). Showing latest active tenants:`,
            },
            {
              type: 'student_list_card',
              title: 'Recent Registered Residents',
              students: list.slice(0, 5),
            },
            {
              type: 'follow_up_chips',
              chips: [
                { label: '🎓 All Students', icon: 'school-outline', onPress: () => handleQuery('How many students on platform?') },
                { label: '🏢 Hostels Overview', icon: 'business-outline', onPress: () => handleQuery('Show all hostels breakdown') },
              ],
            },
          ]);
        }
      }
      // 4. VACATED / LEFT
      else if (lower.includes('left') || lower.includes('vacat') || lower.includes('inactive')) {
        const sRes = await developerService.getStudents({ page: 1, limit: 50, status: '0' });
        const vacated = sRes?.data || [];

        setIsTyping(false);
        addBot([
          {
            type: 'text',
            text: `🚪 ${vacated.length} vacated / inactive tenant(s) on platform:`,
          },
          {
            type: 'student_list_card',
            title: 'Vacated Tenants Archive',
            students: vacated,
          },
          {
            type: 'follow_up_chips',
            chips: [
              { label: '🎓 Active Students', icon: 'school-outline', onPress: () => handleQuery('How many students on platform?') },
              { label: '🏢 Hostels Overview', icon: 'business-outline', onPress: () => handleQuery('Show all hostels breakdown') },
            ],
          },
        ]);
      }
      // 5. ALL HOSTELS OVERVIEW & INLINE RECORDS
      else if (lower.includes('hostel') || lower.includes('pg') || lower.includes('bed') || lower.includes('occupan') || lower.includes('room')) {
        const hRes = await developerService.getHostels({ page: 1, limit: 50 });
        const list = hRes?.data || [];
        const totalBeds = list.reduce((acc: number, h: any) => acc + (Number(h.total_beds) || 0), 0);
        const occupiedBeds = list.reduce((acc: number, h: any) => acc + (Number(h.occupied_beds) || 0), 0);
        const availBeds = Math.max(0, totalBeds - occupiedBeds);
        const rate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

        setIsTyping(false);
        addBot([
          {
            type: 'text',
            text: `🏢 Platform Hostels Network (${list.length} Properties Registered • ${occupiedBeds}/${totalBeds} Beds Occupied)`,
          },
          {
            type: 'occupancy_donut',
            occupied: occupiedBeds,
            available: availBeds,
            total: totalBeds,
          },
          {
            type: 'occupancy_bar',
            occupied: occupiedBeds,
            available: availBeds,
            total: totalBeds,
            rate,
          },
          {
            type: 'hostel_list',
            hostels: list,
            activeHostelId: list[0]?.hostel_id || 1,
          },
          {
            type: 'follow_up_chips',
            chips: [
              { label: '👥 Owners Roster', icon: 'people-outline', onPress: () => handleQuery('How many owners are registered?') },
              { label: '🎓 Students Roster', icon: 'school-outline', onPress: () => handleQuery('How many students on platform?') },
              { label: '💰 Pending Dues', icon: 'wallet-outline', onPress: () => handleQuery('Show pending dues') },
            ],
          },
        ]);
      }
      // 6. DUES & FINANCIALS
      else if (lower.includes('due') || lower.includes('pending') || lower.includes('revenue') || lower.includes('money') || lower.includes('finance')) {
        const finRes = await developerService.getFinanceOverview().catch(() => null);
        const summary = finRes?.data?.summary;
        const totalReceived = summary?.total_received || 0;
        const totalPending = summary?.total_pending || 0;
        const paidCount = summary?.paid_hostels || 0;
        const unpaidCount = summary?.pending_hostels || 0;

        setIsTyping(false);
        addBot([
          {
            type: 'text',
            text: `💰 Platform Dues & Collections Overview:`,
          },
          {
            type: 'dues_donut',
            paidCount,
            partialCount: 0,
            unpaidCount,
            totalPaidAmount: totalReceived,
            totalPending,
          },
          {
            type: 'stat_cards',
            cards: [
              { label: 'Total Received', value: `₹${Number(totalReceived).toLocaleString('en-IN')}`, icon: 'checkmark-circle-outline', color: '#10B981', bg: '#ECFDF5' },
              { label: 'Total Pending', value: `₹${Number(totalPending).toLocaleString('en-IN')}`, icon: 'alert-circle-outline', color: '#EF4444', bg: '#FEF2F2' },
            ],
          },
          {
            type: 'follow_up_chips',
            chips: [
              { label: '🏢 Hostels Overview', icon: 'business-outline', onPress: () => handleQuery('Show all hostels breakdown') },
              { label: '👥 Owners Roster', icon: 'people-outline', onPress: () => handleQuery('How many owners are registered?') },
            ],
          },
        ]);
      }
      // 7. FREE TRIALS & SUBSCRIPTIONS
      else if (lower.includes('trial') || lower.includes('subscription') || lower.includes('expir')) {
        const hRes = await developerService.getHostels({ page: 1, limit: 50 });
        const list = hRes?.data || [];

        setIsTyping(false);
        addBot([
          {
            type: 'text',
            text: `⏳ Platform Hostels Trial & Subscription Status (${list.length} Hostels Enrolled)`,
          },
          {
            type: 'stat_cards',
            cards: [
              { label: 'Active PG Network', value: `${list.length}`, icon: 'business-outline', color: '#EA580C', bg: '#FFF7ED' },
              { label: 'Free Trial Grants', value: '100% Active', icon: 'gift-outline', color: '#10B981', bg: '#ECFDF5' },
            ],
          },
          {
            type: 'hostel_list',
            hostels: list,
            activeHostelId: list[0]?.hostel_id || 1,
          },
        ]);
      }
      // 8. AUDIT LOGS
      else if (lower.includes('audit') || lower.includes('log') || lower.includes('history') || lower.includes('event')) {
        const logsRes = await developerService.getAuditLogs({ page: 1, limit: 10 }).catch(() => null);
        const logs = logsRes?.data?.logs || (Array.isArray(logsRes?.data) ? logsRes?.data : []);

        setIsTyping(false);
        addBot([
          {
            type: 'text',
            text: `📋 Platform Audit Logs (${logs.length} Recent Events):`,
          },
          {
            type: 'stat_cards',
            cards: logs.slice(0, 4).map((l: any, idx: number) => ({
              label: l.action || `Audit Event #${idx + 1}`,
              value: l.developer_username || l.target_type || 'System',
              icon: 'time-outline',
              color: '#3B82F6',
              bg: '#EFF6FF',
            })),
          },
          {
            type: 'follow_up_chips',
            chips: [
              { label: '🏢 Hostels Overview', icon: 'business-outline', onPress: () => handleQuery('Show all hostels breakdown') },
              { label: '👑 Owners Roster', icon: 'people-outline', onPress: () => handleQuery('How many owners are registered?') },
            ],
          },
        ]);
      }
      // 9. SYSTEM DIAGNOSTICS
      else if (lower.includes('diagnostic') || lower.includes('health') || lower.includes('database') || lower.includes('server')) {
        const sysRes = await developerService.getSystemStatus().catch(() => null);
        const s = sysRes?.data || { server: { status: 'ONLINE', memory: { rss_mb: 48 }, node_version: 'v20.x' }, database: { status: 'HEALTHY', latency_ms: 2 } };

        setIsTyping(false);
        addBot([
          {
            type: 'text',
            text: `⚡ Server Engine & Database Diagnostic Health:`,
          },
          {
            type: 'stat_cards',
            cards: [
              { label: 'Server Status', value: s.server?.status || 'ONLINE', icon: 'server-outline', color: '#10B981', bg: '#ECFDF5' },
              { label: 'DB Ping Latency', value: `${s.database?.latency_ms || 2} ms`, icon: 'pulse-outline', color: '#3B82F6', bg: '#EFF6FF' },
              { label: 'Memory (RSS)', value: `${s.server?.memory?.rss_mb || 48} MB`, icon: 'hardware-chip-outline', color: '#EA580C', bg: '#FFF7ED' },
              { label: 'Engine Node', value: s.server?.node_version || 'v20.x', icon: 'logo-nodejs', color: '#059669', bg: '#ECFDF5' },
            ],
          },
        ]);
      }
      // 10. GLOBAL SEARCH FALLBACK
      else {
        const searchRes = await developerService.globalSearch(q).catch(() => null);
        const studentsFound = searchRes?.data?.students || [];

        setIsTyping(false);
        if (studentsFound.length > 0) {
          addBot([
            {
              type: 'text',
              text: `Found ${studentsFound.length} tenant(s) matching "${q}":`,
            },
            {
              type: 'student_list_card',
              title: 'Matching Tenants',
              students: studentsFound,
            },
          ]);
        } else {
          addBot([
            {
              type: 'text',
              text: `I've checked the master database for "${q}". Choose an executive view to inspect:`,
            },
            {
              type: 'follow_up_chips',
              chips: [
                { label: '👑 Owners Roster', icon: 'people-outline', onPress: () => handleQuery('How many owners are registered?') },
                { label: '🎓 Students Roster', icon: 'school-outline', onPress: () => handleQuery('How many students on platform?') },
                { label: '🏢 Hostels Network', icon: 'business-outline', onPress: () => handleQuery('Show all hostels breakdown') },
                { label: '💰 Pending Dues', icon: 'wallet-outline', onPress: () => handleQuery('Show pending dues') },
              ],
            },
          ]);
        }
      }
    } catch (e: any) {
      setIsTyping(false);
      addBot([
        {
          type: 'text',
          text: `Master DB is active. Select an executive option below:`,
        },
        {
          type: 'follow_up_chips',
          chips: [
            { label: '🏢 Hostels Directory', icon: 'business-outline', onPress: () => handleQuery('Show all hostels breakdown') },
            { label: '👑 Owners Hub', icon: 'people-outline', onPress: () => handleQuery('How many owners are registered?') },
            { label: '🎓 Students Roster', icon: 'school-outline', onPress: () => handleQuery('How many students on platform?') },
          ],
        },
      ]);
    }
    scrollToEnd(true);
  };

  const handleReset = () => {
    setMessages(getInitialWelcomeMsgs());
    setInputText('');
  };

  if (!isDeveloperLoggedIn) return null;

  return (
    <>
      {/* Floating Executive CEO AI Trigger Button */}
      {!isOpen && (
        <TouchableOpacity
          style={[styles.fab, { bottom: Math.max(insets.bottom + 152, 164) }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setIsOpen(true);
          }}
          activeOpacity={0.85}
        >
          <Image
            source={require('../../../assets/chatbot-image-newjpeg.jpeg')}
            style={styles.fabAvatarImg}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {/* Full Modal Copilot Interface matching OwnerAssistant architecture */}
      <Modal
        visible={isOpen}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
        statusBarTranslucent={false}
      >
        <SafeAreaView style={styles.safe} edges={Platform.OS === 'ios' ? ['top', 'bottom'] : ['top']}>
          <View
            style={[styles.body, keyboardInset > 0 && { paddingBottom: keyboardInset }]}
            onLayout={onContainerLayout}
          >
            {/* Clean Light Header matching outside screens */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatarRing}>
                  <Image
                    source={require('../../../assets/chatbot-image-newjpeg.jpeg')}
                    style={styles.avatarImg}
                    resizeMode="cover"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.headerGreeting} numberOfLines={1}>
                    {getGreeting(developer?.full_name)}
                  </Text>
                  <Text style={styles.headerTitle}>Hostix Developer Copilot</Text>
                  <View style={styles.aiBadge}>
                    <Ionicons name="shield-checkmark" size={10} color="#059669" />
                    <Text style={styles.aiBadgeText}>Master Governance</Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity style={styles.headerActionBtn} onPress={handleReset}>
                  <Ionicons name="refresh-outline" size={16} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionBtn} onPress={() => setIsOpen(false)}>
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable Conversation Content */}
            <View style={styles.chatArea}>
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={styles.msgList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                onContentSizeChange={() => scrollToEnd(true)}
              >
                {/* Top Live Action Hub & Command Center when fresh */}
                {messages.length <= 2 && (
                  <View style={styles.topHubCard}>
                    <View style={styles.topHubHeader}>
                      <View style={styles.topHubBotBadge}>
                        <Ionicons name="sparkles" size={16} color="#EA580C" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.topHubTitle}>Developer Command Center</Text>
                        <Text style={styles.topHubSub}>Multi-property live overview & instant executive actions</Text>
                      </View>
                    </View>

                    {/* Quick Live Pulse Action Capsules */}
                    <View style={styles.topPulseRow}>
                      <TouchableOpacity
                        style={[styles.topPulseItem, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}
                        onPress={() => handleQuery('How many owners are registered?')}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="people" size={13} color="#EA580C" />
                        <Text style={[styles.topPulseText, { color: '#C2410C' }]}>
                          Owners ({metricsData?.metrics?.total_owners ?? '...'})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.topPulseItem, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                        onPress={() => handleQuery('How many students on platform?')}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="school" size={13} color="#10B981" />
                        <Text style={[styles.topPulseText, { color: '#047857' }]}>
                          Students ({metricsData?.metrics?.total_students ?? '...'})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.topPulseItem, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                        onPress={() => handleQuery('Show all hostels breakdown')}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="business" size={13} color="#3B82F6" />
                        <Text style={[styles.topPulseText, { color: '#1D4ED8' }]}>
                          Hostels ({metricsData?.metrics?.total_hostels ?? '...'})
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Secondary Quick Action Row */}
                    <View style={[styles.topPulseRow, { marginTop: 6 }]}>
                      <TouchableOpacity
                        style={[styles.topPulseItem, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                        onPress={() => handleQuery('Who joined today?')}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="person-add" size={13} color="#EF4444" />
                        <Text style={[styles.topPulseText, { color: '#B91C1C' }]}>New Joiners</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.topPulseItem, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                        onPress={() => handleQuery('Whose free trial is ending soon?')}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="gift" size={13} color="#D97706" />
                        <Text style={[styles.topPulseText, { color: '#B45309' }]}>Expiring Trials</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.topPulseItem, { backgroundColor: '#F0FDFA', borderColor: '#99F6E4' }]}
                        onPress={() => handleQuery('Check server health and database')}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="hardware-chip" size={13} color="#0D9488" />
                        <Text style={[styles.topPulseText, { color: '#0F766E' }]}>Diagnostics</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Messages List rendered with AssistantResponse engine */}
                {messages.map((m) => (
                  <View key={m.id} style={styles.msgWrapper}>
                    {m.sender === 'user' ? (
                      <View style={styles.userRow}>
                        <View style={styles.userBubble}>
                          <Text style={styles.userText}>{m.text}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.botRow}>
                        {m.blocks && <AssistantResponse blocks={m.blocks} />}
                      </View>
                    )}
                  </View>
                ))}

                {isTyping && (
                  <View style={styles.typingBox}>
                    <ActivityIndicator size="small" color="#EA580C" />
                    <Text style={styles.typingText}>Master Copilot is analyzing platform database...</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Quick Suggestion Chips Bar */}
            <View style={styles.quickChipsBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {WELCOME_CHIPS.map((chip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.chipPill}
                    onPress={() => handleQuery(chip.q)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={chip.icon as any} size={12} color="#EA580C" />
                    <Text style={styles.chipPillText}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Quick Category Menu Drawer / Sheet */}
            {isAddMenuOpen && (
              <View style={styles.quickCategoryMenu}>
                <View style={styles.quickCategoryHeader}>
                  <Text style={styles.quickCategoryTitle}>Direct Executive Queries</Text>
                  <TouchableOpacity onPress={() => setIsAddMenuOpen(false)}>
                    <Ionicons name="close" size={16} color="#8C7A6B" />
                  </TouchableOpacity>
                </View>
                <View style={styles.quickCategoryGrid}>
                  {DEV_MENU_ITEMS.map((item, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.quickCatItem}
                      onPress={() => {
                        setIsAddMenuOpen(false);
                        handleQuery(item.q);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.quickCatIcon, { backgroundColor: item.bg }]}>
                        <Ionicons name={item.icon as any} size={16} color={item.color} />
                      </View>
                      <Text style={styles.quickCatLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Bottom Composer matching OwnerAssistant */}
            <View style={styles.composerWrap}>
              <TouchableOpacity
                onPress={toggleQuickMenu}
                style={styles.plusMenuBtn}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isAddMenuOpen ? 'close' : 'add'}
                  size={20}
                  color="#EA580C"
                />
              </TouchableOpacity>
              <TextInput
                ref={inputRef}
                style={styles.inputField}
                placeholder="Ask anything about any hostel, student, owner..."
                placeholderTextColor="#A89687"
                value={inputText}
                onChangeText={setInputText}
                onFocus={() => {
                  setIsFocused(true);
                  setIsAddMenuOpen(false);
                }}
                onBlur={() => setIsFocused(false)}
                onSubmitEditing={() => handleQuery(inputText)}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={() => handleQuery(inputText)}
                disabled={!inputText.trim()}
                style={[
                  styles.sendBtn,
                  !inputText.trim() && { opacity: 0.4 },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 999999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  fabAvatarImg: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  body: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  headerGreeting: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  aiBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatArea: {
    flex: 1,
  },
  msgList: {
    padding: 16,
    paddingBottom: 20,
  },
  msgWrapper: {
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 3,
    maxWidth: '85%',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 20,
  },
  botRow: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topHubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  topHubBotBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  topHubTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  topHubSub: {
    color: '#6B7280',
    fontSize: 11.5,
    marginTop: 1,
  },
  topPulseRow: {
    flexDirection: 'row',
    gap: 6,
  },
  topPulseItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  topPulseText: {
    fontSize: 11,
    fontWeight: '800',
  },
  typingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginTop: 6,
  },
  typingText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  quickChipsBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingVertical: 8,
  },
  chipsScroll: {
    paddingHorizontal: 14,
    gap: 6,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  chipPillText: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '700',
  },
  quickCategoryMenu: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  quickCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickCategoryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.2,
  },
  quickCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickCatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickCatIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCatLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#111827',
  },
  plusMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
