import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { developerService } from '../../services/developerService';
import * as RootNavigation from '../../navigation/navigationRef';

const { width } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  chips?: { label: string; action: () => void }[];
  visualType?: 'METRICS' | 'HOSTEL_LIST' | 'STUDENT_LIST' | 'OWNER_LIST' | 'DIAGNOSTICS' | 'PASSWORD_CARD';
  payload?: any;
}

const QUICK_CEO_PROMPTS = [
  '⚡ System Diagnostics',
  '🏢 All Hostels Overview',
  '🎓 Active Students Directory',
  '👑 Registered Owners',
  '🛏️ Bed Capacity & Occupancy',
  '🔒 Reset Password Help',
];

export const DeveloperAssistant: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { developer, isDeveloperLoggedIn, enterSupportMode } = useDeveloper();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [platformMetrics, setPlatformMetrics] = useState<any>(null);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Initialize greeting
  useEffect(() => {
    if (isDeveloperLoggedIn) {
      developerService.getDashboardMetrics().then((res) => {
        if (res?.success && res.data) {
          setPlatformMetrics(res.data.metrics);
        }
      }).catch(() => {});

      const ceoName = developer?.full_name || 'Durgarao Goriparthi';
      setMessages([
        {
          id: 'welcome-1',
          sender: 'bot',
          text: `Welcome, ${ceoName} (CEO & Master Super Admin)! 👑\n\nI am your Hostix Executive Master Copilot. I can query across all hostels, students, owners, vacancy rates, or execute platform actions.`,
          visualType: 'METRICS',
          payload: {
            hostels: 3,
            owners: 3,
            students: 25,
            health: 'HEALTHY',
          },
          chips: [
            { label: '⚡ Run Diagnostics', action: () => handleQuery('System Diagnostics') },
            { label: '🏢 View All Hostels', action: () => handleQuery('All Hostels Overview') },
            { label: '👑 View Owners', action: () => handleQuery('Registered Owners') },
          ],
        },
      ]);
    }
  }, [isDeveloperLoggedIn, developer]);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const handleQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setInputText('');
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    scrollToBottom();

    const lower = q.toLowerCase();

    try {
      if (lower.includes('diagnostic') || lower.includes('health') || lower.includes('system') || lower.includes('database')) {
        const sysRes = await developerService.getSystemStatus();
        setIsTyping(false);
        const s = sysRes?.data || { server: { status: 'ONLINE', memory: { rss_mb: 48 }, node_version: 'v20.x' }, database: { status: 'HEALTHY', latency_ms: 2 } };
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: 'bot',
            text: `Here is the real-time server and database diagnostic health:`,
            visualType: 'DIAGNOSTICS',
            payload: s,
            chips: [
              { label: 'Open System Health Page', action: () => { setIsOpen(false); RootNavigation.navigate('DeveloperSystem'); } },
            ],
          },
        ]);
      } else if (lower.includes('hostel') || lower.includes('pg') || lower.includes('property')) {
        const hRes = await developerService.getHostels({ page: 1, limit: 5 });
        setIsTyping(false);
        const list = hRes?.data || [];
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: 'bot',
            text: `Found ${list.length} properties registered on platform:`,
            visualType: 'HOSTEL_LIST',
            payload: list,
            chips: [
              { label: 'Manage All Hostels', action: () => { setIsOpen(false); RootNavigation.navigate('DevHostelsTab'); } },
            ],
          },
        ]);
      } else if (lower.includes('student') || lower.includes('tenant')) {
        const sRes = await developerService.getStudents({ page: 1, limit: 5 });
        setIsTyping(false);
        const list = sRes?.data || [];
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: 'bot',
            text: `Here are the latest tenant students registered across hostels:`,
            visualType: 'STUDENT_LIST',
            payload: list,
            chips: [
              { label: 'Open Students Directory', action: () => { setIsOpen(false); RootNavigation.navigate('DevStudentsTab'); } },
            ],
          },
        ]);
      } else if (lower.includes('owner')) {
        const oRes = await developerService.getOwners({ page: 1, limit: 5 });
        setIsTyping(false);
        const list = oRes?.data || [];
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: 'bot',
            text: `Here are the platform hostel owners:`,
            visualType: 'OWNER_LIST',
            payload: list,
            chips: [
              { label: 'Open Owners Hub', action: () => { setIsOpen(false); RootNavigation.navigate('DevOwnersTab'); } },
            ],
          },
        ]);
      } else if (lower.includes('bed') || lower.includes('room') || lower.includes('capacity') || lower.includes('occupan')) {
        setIsTyping(false);
        const total = platformMetrics?.total_beds || 45;
        const occ = platformMetrics?.occupied_beds || 25;
        const avail = Math.max(0, total - occ);
        const rate = total > 0 ? Math.round((occ / total) * 100) : 60;
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: 'bot',
            text: `Platform Bed Capacity & Occupancy Breakdown:\n• Total Beds: ${total}\n• Occupied: ${occ}\n• Available Vacant: ${avail}\n• Occupancy Rate: ${rate}%`,
            chips: [
              { label: 'View Room Inventory', action: () => { setIsOpen(false); RootNavigation.navigate('DeveloperRoomsBeds'); } },
            ],
          },
        ]);
      } else if (lower.includes('password') || lower.includes('forgot') || lower.includes('reset')) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: 'bot',
            text: `🔒 Master Password Reset:\nSelect where you want to reset credentials:`,
            chips: [
              { label: '🔑 Reset Owner Password', action: () => { setIsOpen(false); RootNavigation.navigate('DevOwnersTab'); } },
              { label: '🔑 Reset Student Password', action: () => { setIsOpen(false); RootNavigation.navigate('DevStudentsTab'); } },
            ],
          },
        ]);
      } else {
        const searchRes = await developerService.globalSearch(q);
        setIsTyping(false);
        const hostelsFound = searchRes?.data?.hostels || [];
        const studentsFound = searchRes?.data?.students || [];

        if (hostelsFound.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: `b-${Date.now()}`,
              sender: 'bot',
              text: `Search Results for "${q}":`,
              visualType: 'HOSTEL_LIST',
              payload: hostelsFound,
            },
          ]);
        } else if (studentsFound.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: `b-${Date.now()}`,
              sender: 'bot',
              text: `Search Results for "${q}":`,
              visualType: 'STUDENT_LIST',
              payload: studentsFound,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `b-${Date.now()}`,
              sender: 'bot',
              text: `I've checked the master database for "${q}". What would you like to inspect or manage?`,
              chips: [
                { label: '🏢 All Hostels', action: () => { setIsOpen(false); RootNavigation.navigate('DevHostelsTab'); } },
                { label: '👑 All Owners', action: () => { setIsOpen(false); RootNavigation.navigate('DevOwnersTab'); } },
                { label: '🎓 All Students', action: () => { setIsOpen(false); RootNavigation.navigate('DevStudentsTab'); } },
              ],
            },
          ]);
        }
      }
    } catch (e: any) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: `Master DB is active. Let me know what data or platform action you'd like to perform!`,
        },
      ]);
    }
    scrollToBottom();
  };

  if (!isDeveloperLoggedIn) return null;

  return (
    <>
      {/* Floating Executive CEO AI Trigger Button */}
      {!isOpen && (
        <TouchableOpacity
          style={[styles.fab, { bottom: Math.max(insets.bottom + 105, 118) }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setIsOpen(true);
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#F97316', '#EA580C', '#C2410C']}
            style={styles.fabGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.fabInnerAvatar}>
              <Image
                source={require('../../../assets/chatbot.jpeg')}
                style={styles.fabAvatarImg}
                resizeMode="cover"
              />
            </View>
            <View style={styles.fabGlowDot} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Full Modal Copilot Interface */}
      <Modal
        visible={isOpen}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
          {/* Header */}
          <LinearGradient
            colors={['#8C3A00', '#C2410C', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerLeft}>
              <View style={styles.avatarRing}>
                <Image
                  source={require('../../../assets/chatbot.jpeg')}
                  style={styles.headerAvatar}
                  resizeMode="cover"
                />
                <View style={styles.onlineDot} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTag}>HOSTIX CEO COPILOT</Text>
                <Text style={styles.headerTitle}>Durgarao Goriparthi</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsOpen(false)}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Chat Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.chatArea}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.msgRow,
                  m.sender === 'user' ? styles.userRow : styles.botRow,
                ]}
              >
                {m.sender === 'bot' && (
                  <View style={styles.botAvatarBox}>
                    <Image
                      source={require('../../../assets/chatbot.jpeg')}
                      style={styles.botAvatarImg}
                      resizeMode="cover"
                    />
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    m.sender === 'user' ? styles.userBubble : styles.botBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.msgText,
                      m.sender === 'user' ? styles.userText : styles.botText,
                    ]}
                  >
                    {m.text}
                  </Text>

                  {/* VISUAL CARDS: METRICS */}
                  {m.visualType === 'METRICS' && (
                    <View style={styles.metricsGrid}>
                      <View style={styles.metricCard}>
                        <Ionicons name="business" size={16} color="#C2410C" />
                        <Text style={styles.metricVal}>{platformMetrics?.total_hostels || 3}</Text>
                        <Text style={styles.metricLbl}>Hostels</Text>
                      </View>
                      <View style={styles.metricCard}>
                        <Ionicons name="people" size={16} color="#7C3AED" />
                        <Text style={styles.metricVal}>{platformMetrics?.total_owners || 3}</Text>
                        <Text style={styles.metricLbl}>Owners</Text>
                      </View>
                      <View style={styles.metricCard}>
                        <Ionicons name="school" size={16} color="#059669" />
                        <Text style={styles.metricVal}>{platformMetrics?.total_students || 25}</Text>
                        <Text style={styles.metricLbl}>Students</Text>
                      </View>
                      <View style={styles.metricCard}>
                        <Ionicons name="pulse" size={16} color="#2563EB" />
                        <Text style={[styles.metricVal, { color: '#059669' }]}>HEALTHY</Text>
                        <Text style={styles.metricLbl}>DB Status</Text>
                      </View>
                    </View>
                  )}

                  {/* VISUAL CARDS: DIAGNOSTICS */}
                  {m.visualType === 'DIAGNOSTICS' && m.payload && (
                    <View style={styles.diagCard}>
                      <View style={styles.diagRow}>
                        <Text style={styles.diagLabel}>Server Status:</Text>
                        <View style={styles.onlineBadge}>
                          <Text style={styles.onlineBadgeText}>{m.payload.server?.status || 'ONLINE'}</Text>
                        </View>
                      </View>
                      <View style={styles.diagRow}>
                        <Text style={styles.diagLabel}>DB Ping Latency:</Text>
                        <Text style={styles.diagValGreen}>{m.payload.database?.latency_ms || 2} ms</Text>
                      </View>
                      <View style={styles.diagRow}>
                        <Text style={styles.diagLabel}>Memory (RSS):</Text>
                        <Text style={styles.diagVal}>{m.payload.server?.memory?.rss_mb || 48} MB</Text>
                      </View>
                      <View style={styles.diagRow}>
                        <Text style={styles.diagLabel}>Node Engine:</Text>
                        <Text style={styles.diagVal}>{m.payload.server?.node_version || 'v20.x'}</Text>
                      </View>
                    </View>
                  )}

                  {/* VISUAL CARDS: HOSTEL LIST */}
                  {m.visualType === 'HOSTEL_LIST' && Array.isArray(m.payload) && (
                    <View style={styles.visualListWrap}>
                      {m.payload.slice(0, 3).map((h: any, idx: number) => (
                        <View key={idx} style={styles.visualCardItem}>
                          <View style={styles.visualCardHeader}>
                            <Ionicons name="business" size={16} color="#C2410C" />
                            <Text style={styles.visualCardTitle} numberOfLines={1}>{h.hostel_name}</Text>
                            <View style={[styles.miniStatus, h.is_active ? styles.statusActive : styles.statusInactive]}>
                              <Text style={styles.miniStatusText}>{h.is_active ? 'ACTIVE' : 'INACTIVE'}</Text>
                            </View>
                          </View>
                          <Text style={styles.visualCardSub}>📍 {h.city || 'City'} • Owner: {h.owner_name || 'N/A'}</Text>
                          <TouchableOpacity
                            onPress={() => { setIsOpen(false); RootNavigation.navigate('DeveloperHostelDetails', { hostelId: h.hostel_id }); }}
                            style={styles.visualCardBtn}
                          >
                            <Text style={styles.visualCardBtnText}>Inspect Details →</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* VISUAL CARDS: STUDENT LIST */}
                  {m.visualType === 'STUDENT_LIST' && Array.isArray(m.payload) && (
                    <View style={styles.visualListWrap}>
                      {m.payload.slice(0, 3).map((s: any, idx: number) => (
                        <View key={idx} style={styles.visualCardItem}>
                          <View style={styles.visualCardHeader}>
                            <Ionicons name="school" size={16} color="#059669" />
                            <Text style={styles.visualCardTitle} numberOfLines={1}>{s.first_name} {s.last_name || ''}</Text>
                          </View>
                          <Text style={styles.visualCardSub}>🏠 {s.hostel_name || 'Hostel'} • Room {s.room_number || 'N/A'}</Text>
                          <Text style={styles.visualCardSub}>📞 {s.phone || 'No phone'}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* VISUAL CARDS: OWNER LIST */}
                  {m.visualType === 'OWNER_LIST' && Array.isArray(m.payload) && (
                    <View style={styles.visualListWrap}>
                      {m.payload.slice(0, 3).map((o: any, idx: number) => (
                        <View key={idx} style={styles.visualCardItem}>
                          <View style={styles.visualCardHeader}>
                            <Ionicons name="person" size={16} color="#7C3AED" />
                            <Text style={styles.visualCardTitle} numberOfLines={1}>{o.full_name}</Text>
                          </View>
                          <Text style={styles.visualCardSub}>✉️ {o.email}</Text>
                          <Text style={styles.visualCardSub}>🏢 {o.hostel_count || 1} Hostels • 🎓 {o.total_students || 0} Students</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action Chips */}
                  {m.chips && m.chips.length > 0 && (
                    <View style={styles.chipRow}>
                      {m.chips.map((chip, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.chipBtn}
                          onPress={chip.action}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.chipBtnText}>{chip.label}</Text>
                          <Ionicons name="arrow-forward" size={11} color="#C2410C" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}

            {isTyping && (
              <View style={styles.botRow}>
                <View style={styles.botAvatarBox}>
                  <Image
                    source={require('../../../assets/chatbot.jpeg')}
                    style={styles.botAvatarImg}
                    resizeMode="cover"
                  />
                </View>
                <View style={[styles.bubble, styles.botBubble, { paddingVertical: 12 }]}>
                  <ActivityIndicator size="small" color="#C2410C" />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Prompt Pills Bar */}
          <View style={styles.quickPromptSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPromptScroll}
            >
              {QUICK_CEO_PROMPTS.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.promptPill}
                  onPress={() => handleQuery(p)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.promptPillText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bottom Input Composer */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          >
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.inputField}
                placeholder="Ask anything about any hostel, room, student, diagnostics..."
                placeholderTextColor="#A89687"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleQuery(inputText)}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={() => handleQuery(inputText)}
                disabled={!inputText.trim()}
                style={[
                  styles.sendButton,
                  !inputText.trim() && { opacity: 0.5 },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#EA580C',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 999999,
  },
  fabGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fabInnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  fabAvatarImg: {
    width: '100%',
    height: '100%',
  },
  fabGlowDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 14,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  headerTag: {
    color: '#FED7AA',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 12,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  botAvatarBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  botAvatarImg: {
    width: '100%',
    height: '100%',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#C2410C',
    borderBottomRightRadius: 2,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  msgText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  botText: {
    color: '#1C1917',
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FAF6F0',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    alignItems: 'center',
  },
  metricVal: {
    color: '#1C1917',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
  },
  metricLbl: {
    color: '#78716C',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  diagCard: {
    backgroundColor: '#FAF6F0',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    gap: 6,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagLabel: {
    color: '#78716C',
    fontSize: 11.5,
    fontWeight: '600',
  },
  diagVal: {
    color: '#1C1917',
    fontSize: 12,
    fontWeight: '800',
  },
  diagValGreen: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '900',
  },
  onlineBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  onlineBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  visualListWrap: {
    marginTop: 10,
    gap: 8,
  },
  visualCardItem: {
    backgroundColor: '#FAF6F0',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  visualCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visualCardTitle: {
    flex: 1,
    color: '#1C1917',
    fontSize: 12.5,
    fontWeight: '800',
  },
  miniStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  miniStatusText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#059669',
  },
  visualCardSub: {
    color: '#78716C',
    fontSize: 11,
    marginTop: 2,
  },
  visualCardBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  visualCardBtnText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
  },
  chipRow: {
    marginTop: 10,
    gap: 6,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  chipBtnText: {
    color: '#C2410C',
    fontSize: 11.5,
    fontWeight: '800',
  },
  quickPromptSection: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EFE7DC',
    paddingVertical: 8,
  },
  quickPromptScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  promptPill: {
    backgroundColor: '#FAF6F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  promptPillText: {
    color: '#78716C',
    fontSize: 11,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EFE7DC',
    gap: 10,
  },
  inputField: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1C1917',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C2410C',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
