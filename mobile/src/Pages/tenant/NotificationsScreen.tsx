import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator, RefreshControl, DeviceEventEmitter } from 'react-native';
import { ArrowLeft, Wallet, Megaphone, Wrench, BellRing, Filter, CheckCheck } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Phase3EmptyState, Phase3ErrorState } from '../../components/tenant/UIComponents';
import { useToast } from '../../../contexts/ToastContext';
import api from '../../services/api';

const BLUE = "#2245D4";
const BLUE_SOFT = "#EEF2FF";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#1A1A1A";
const TEXT_MID = "#666666";

const TABS = ['All', 'Announcements', 'Payments', 'Others'];

const READ_IDS_KEY = 'tenant_read_notification_ids_v2';

export async function getLocalReadIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export async function saveLocalReadIds(ids: (string | number)[]): Promise<void> {
  try {
    const current = await getLocalReadIds();
    ids.forEach((id) => {
      if (id !== undefined && id !== null) current.add(String(id));
    });
    const arr = Array.from(current).slice(-500);
    await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(arr));
  } catch {}
}

const TENANT_ROUTE_MAP: Record<string, string> = {
  // Tenant direct routes
  TenantHome: 'TenantHome',
  TenantHomeScreen: 'TenantHome',
  Main: 'TenantHome',
  Dues: 'Dues',
  TenantDues: 'Dues',
  RentPayment: 'RentPayment',
  PaymentReceipt: 'PaymentReceipt',
  Expenses: 'Expenses',
  TenantExpenses: 'Expenses',
  Complaints: 'Complaints',
  TenantComplaints: 'Complaints',
  VisitorPass: 'VisitorPass',
  TenantVisitorPass: 'VisitorPass',
  GatePass: 'GatePass',
  TenantGatePass: 'GatePass',
  Notices: 'Notices',
  TenantNotices: 'Notices',
  NoticeDetails: 'Notices',
  TenantDocuments: 'TenantDocuments',
  Documents: 'TenantDocuments',
  TenantNotes: 'Notes',
  Notes: 'Notes',
  RoomInfo: 'RoomInfo',
  TenantRoomInfo: 'RoomInfo',
  MessMenu: 'FullMenu',
  FullMenu: 'FullMenu',
  Feedback: 'Feedback',
  Splits: 'Splits',
  TenantSplits: 'Splits',
  HelpScreen: 'HelpScreen',
  Profile: 'Profile',
  Settings: 'Settings',
  PrivacyPolicy: 'PrivacyPolicy',

  // Owner screens safely mapped to Tenant equivalents
  Payments: 'Dues',
  PendingPayments: 'Dues',
  PendingTab: 'Dues',
  OverviewTab: 'Dues',
  Overview: 'TenantHome',
  FeeManagement: 'Dues',
  Receipt: 'PaymentReceipt',
  DownloadReceipts: 'PaymentReceipt',
  PaymentDetails: 'PaymentReceipt',
  PaymentVerification: 'Dues',
  CollectedPayments: 'Dues',
  AllTransactions: 'Dues',
  TenantTransactions: 'Dues',
  Income: 'TenantHome',
  IncomeDetails: 'TenantHome',
  AddIncome: 'TenantHome',
  Visitors: 'VisitorPass',
  Guests: 'VisitorPass',
  GuestDetails: 'VisitorPass',
  AddGuest: 'VisitorPass',
  Leaves: 'GatePass',
  Students: 'TenantHome',
  StudentDetails: 'TenantHome',
  AddStudent: 'TenantHome',
  Rooms: 'RoomInfo',
  RoomDetails: 'RoomInfo',
  AddRoom: 'RoomInfo',
  BulkRoomSetup: 'RoomInfo',
  BulkDelete: 'TenantHome',
  Reports: 'Dues',
  Home: 'TenantHome',
  Dashboard: 'TenantHome',
  Hostels: 'TenantHome',
  HostelDetails: 'TenantHome',
  AddHostel: 'TenantHome',
  Staff: 'TenantHome',
  StaffDetails: 'TenantHome',
  StaffPayments: 'TenantHome',
  AddStaff: 'TenantHome',
  AddTeamMember: 'TenantHome',
  Subscription: 'TenantHome',
  PremiumSubscription: 'TenantHome',
  Reminders: 'Dues',
  BillReminders: 'Dues',
  ComplaintsManagement: 'Complaints',
  RequestsManagement: 'GatePass',
  MessMenuManagement: 'FullMenu',
  NoticesManagement: 'Notices',
  AddNotice: 'Notices',
  RatingsManagement: 'Feedback',
  DocumentsHub: 'TenantDocuments',
  PreBooking: 'TenantHome',
  QRSignup: 'TenantHome',
};

const typeMeta: Record<string, { icon: any; tint: string; soft: string }> = {
  'due': { icon: Wallet, tint: '#E11D48', soft: '#FFE4E6' },
  'payment': { icon: Wallet, tint: '#10B981', soft: '#D1FAE5' },
  'notice': { icon: Megaphone, tint: BLUE, soft: BLUE_SOFT },
  'complaint': { icon: Wrench, tint: '#F59E0B', soft: '#FEF3C7' },
  'system': { icon: BellRing, tint: TEXT_MID, soft: '#F1F5F9' },
};

export default function NotificationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showError, showSuccess } = useToast();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, localReadSet] = await Promise.all([
        api.get('/notifications'),
        getLocalReadIds(),
      ]);
      if (res.data.success) {
        const formatted = res.data.data.map((n: any) => {
          let parsedParams = null;
          try {
            if (n.params) parsedParams = typeof n.params === 'string' ? JSON.parse(n.params) : n.params;
          } catch {}
          const isRead = !!n.is_read || localReadSet.has(String(n.notification_id));
          return {
            id: n.notification_id,
            title: n.title,
            body: n.message,
            type: n.notification_type || 'system',
            date: n.created_at,
            read: isRead,
            screen: n.screen,
            params: parsedParams,
            referenceType: n.reference_type,
            referenceId: n.reference_id,
          };
        });
        setItems(formatted);
      }
    } catch (err) {
      setError('Could not load notifications.');
      showError('Could not load notifications.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]));

  // Refresh live when a push notification arrives while this screen is mounted
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('REFRESH_NOTIFICATIONS', fetchNotifications);
    return () => sub.remove();
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      const allIds = items.map((i) => i.id);
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      await saveLocalReadIds(allIds);
      api.put('/notifications/read-all').catch(() => {});
      allIds.forEach(id => {
        api.put(`/notifications/${id}/read`).catch(() => {});
      });
      DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
      showSuccess('All notifications marked as read');
    } catch (err) {
      // silently ignore — optimistic update already applied
    }
  };

  const markOneRead = async (id: string | number) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, read: true } : i));
    await saveLocalReadIds([id]);
    try {
      await api.put(`/notifications/${id}/read`);
    } catch (_) {
      // silently ignore
    }
    DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
  };

  const handleItemPress = (item: any) => {
    markOneRead(item.id);

    // 1. Direct screen payload if present — strictly sanitized against owner screens
    if (item.screen) {
      const targetScreen = TENANT_ROUTE_MAP[item.screen] || 'TenantHome';
      try {
        navigation.navigate(targetScreen, item.params);
        return;
      } catch (navErr) {
        console.warn('Navigation error for screen:', targetScreen, navErr);
      }
    }

    // 2. Intelligent fallback based on referenceType / type / title
    const title = (item.title || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const ref = (item.referenceType || '').toLowerCase();

    if (ref === 'visitor' || type.includes('visitor') || title.includes('visitor')) {
      navigation.navigate('VisitorPass');
    } else if (ref === 'leave' || type.includes('leave') || type.includes('gate') || title.includes('gate') || title.includes('leave')) {
      navigation.navigate('GatePass');
    } else if (type.includes('due') || type.includes('payment') || title.includes('rent') || title.includes('due') || title.includes('fee')) {
      navigation.navigate('Dues', item.params || { feeId: item.referenceId });
    } else if (type.includes('expense') || type.includes('budget') || title.includes('expense') || title.includes('spend') || title.includes('budget')) {
      navigation.navigate('Expenses');
    } else if (type.includes('notice') || title.includes('notice') || title.includes('announcement')) {
      navigation.navigate('Notices');
    } else if (type.includes('complaint') || title.includes('complaint')) {
      navigation.navigate('Complaints');
    } else if (title.includes('menu') || title.includes('mess') || type.includes('food')) {
      navigation.navigate('FullMenu');
    } else if (type.includes('split') || title.includes('split')) {
      navigation.navigate('Splits');
    } else {
      navigation.navigate('TenantHome');
    }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Announcements') return item.type === 'notice' || item.type === 'system';
    if (activeTab === 'Payments') return item.type === 'due' || item.type === 'payment';
    if (activeTab === 'Others') return item.type === 'complaint';
    return true;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    let groupName = "Earlier";
    if (item.date) {
      const itemDate = new Date(item.date);
      const today = new Date();
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);

      const itemDateStr = itemDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      const yestStr = yest.toISOString().split('T')[0];

      if (itemDateStr === todayStr) groupName = "Today";
      else if (itemDateStr === yestStr) groupName = "Yesterday";
      else groupName = itemDate.toLocaleDateString("en-GB", { day: 'numeric', month: 'short' });
    }

    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(item);
    return acc;
  }, {} as Record<string, any[]>) as Record<string, any[]>;

  const formatTime = (dateStr: string) => {
    try {
      if (dateStr.length <= 10) return "Yesterday";
      return new Date(dateStr).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "09:00 AM";
    }
  };

  const unreadCount = items.filter(i => !i.read).length;

  const renderContent = () => {
    if (loading) {
      return (
        <View style={{ alignItems: 'center', paddingTop: 80 }}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={{ marginTop: 40 }}>
          <Phase3ErrorState variant="server" onAction={fetchNotifications} />
        </View>
      );
    }

    if (Object.keys(groupedItems).length === 0) {
      return (
        <View style={{ marginTop: 60 }}>
          <Phase3EmptyState variant="notices" />
        </View>
      );
    }

    return Object.entries(groupedItems).map(([groupDate, groupData]) => (
      <View key={groupDate} style={styles.groupContainer}>
        <Text style={styles.groupTitle}>{groupDate}</Text>
        <View style={styles.groupList}>
          {(groupData as any[]).map((n: any, idx: number) => {
            const meta = typeMeta[n.type] || typeMeta['system'];
            const Icon = meta.icon;
            const displayTime = n.time || formatTime(n.date);

            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, idx !== groupData.length - 1 && styles.cardBorder]}
                onPress={() => handleItemPress(n)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: meta.soft }]}>
                  <Icon size={20} color={meta.tint} />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.title} numberOfLines={1}>{n.title}</Text>
                    <Text style={styles.time}>{displayTime}</Text>
                  </View>
                  <View style={styles.cardBodyRow}>
                    <Text style={styles.body}>{n.body}</Text>
                    {!n.read && <View style={styles.unreadDot} />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    ));
  };

  return (
    <View style={styles.safe}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: BLUE }}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
                <ArrowLeft size={24} color={WHITE} strokeWidth={2.5} />
              </TouchableOpacity>
              <View>
                <Text style={styles.headerTitle}>Notifications</Text>
                <Text style={styles.headerSub}>You have {unreadCount} unread</Text>
              </View>
            </View>
            {unreadCount > 0 ? (
              <TouchableOpacity
                style={styles.markAllHeaderBtn}
                onPress={markAllRead}
                activeOpacity={0.8}
              >
                <CheckCheck size={16} color={WHITE} strokeWidth={2.5} />
                <Text style={styles.markAllHeaderTxt}>Mark all read</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 32 }} />
            )}
          </View>
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BLUE]} tintColor={BLUE} />}
      >
        {renderContent()}
      </ScrollView>

      {!loading && !error && Object.keys(groupedItems).length > 0 && unreadCount > 0 && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TouchableOpacity style={styles.markReadBtn} onPress={markAllRead} activeOpacity={0.7}>
            <CheckCheck size={16} color={BLUE} strokeWidth={2} style={{ marginRight: 6 }} />
            <Text style={styles.markReadText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F6' },
  headerSection: {
    backgroundColor: BLUE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { width: 32 },
  filterBtn: { width: 32, alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: WHITE },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  
  // Tabs
  tabContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  tabScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: BLUE,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MID,
  },
  tabTextActive: {
    color: '#FFF',
  },

  // Groups
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  groupContainer: {
    marginTop: 16,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_DARK,
    marginBottom: 12,
  },
  groupList: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },

  // Cards
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    gap: 12,
  },
  cardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_DARK,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_MID,
  },
  cardBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  body: {
    fontSize: 13,
    color: TEXT_MID,
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E11D48',
    marginTop: 6,
  },

  markAllHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  markAllHeaderTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: WHITE,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF9F6',
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '700',
    color: BLUE,
  },
});
