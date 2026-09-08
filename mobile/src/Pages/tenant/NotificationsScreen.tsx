import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  DeviceEventEmitter,
  Image
} from 'react-native';
import { ArrowLeft, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Phase3EmptyState, Phase3ErrorState } from '../../components/tenant/UIComponents';
import { useToast } from '../../../contexts/ToastContext';
import api from '../../services/api';
import { getLocalTriggeredNotifications } from '../../services/notificationService';

const BRAND = "#7C3AED";
const BRAND_DARK = "#5F2EEA";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#0F172A";
const TEXT_MID = "#64748B";

const TABS = ['All', 'Food', 'Payments', 'Requests'];

const READ_IDS_KEY = 'tenant_read_notification_ids_v3';

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
  TenantHome: 'TenantHome',
  TenantHomeScreen: 'TenantHome',
  Main: 'TenantHome',
  Dues: 'Dues',
  TenantDues: 'Dues',
  RentPayment: 'Dues',
  Payments: 'Dues',
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
  Food: 'FullMenu',
  Breakfast: 'FullMenu',
  Lunch: 'FullMenu',
  Dinner: 'FullMenu',
  Feedback: 'Feedback',
  Rating: 'Feedback',
  TenantRating: 'Feedback',
  VacateNotice: 'VacateNotice',
  Vacate: 'VacateNotice',
  VacateRoom: 'VacateNotice',
  Splits: 'Splits',
  TenantSplits: 'Splits',
  GrowthHome: 'GrowthHome',
  GrowthRoadmap: 'GrowthRoadmap',
  HelpScreen: 'HelpScreen',
  Profile: 'Profile',
  Settings: 'Settings',
  PrivacyPolicy: 'PrivacyPolicy',
};

export default function NotificationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());

  const { showError, showSuccess } = useToast();

  const toggleExpand = (id: string | number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const now = new Date();
      const d = new Date(dateStr);
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return 'Recently';
    }
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, localReadSet, localTriggered] = await Promise.all([
        api.get('/notifications').catch(() => ({ data: { success: true, data: [] } })),
        getLocalReadIds(),
        getLocalTriggeredNotifications(),
      ]);

      const dbList = res.data?.success && Array.isArray(res.data.data) ? res.data.data : [];
      const combined = [...localTriggered, ...dbList];
      const seenKeys = new Set<string>();
      const deduped: any[] = [];
      for (const n of combined) {
        const key = String(n.notification_id || `${n.title}_${n.message}_${n.created_at?.slice(0, 10)}`);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          deduped.push(n);
        }
      }
      deduped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const formatted = deduped.map((n: any) => {
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
    } catch (err) {}
  };

  const markOneRead = async (id: string | number) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, read: true } : i));
    await saveLocalReadIds([id]);
    try {
      await api.put(`/notifications/${id}/read`);
    } catch (_) {}
    DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
  };

  const TENANT_TAB_MAP: Record<string, string> = {
    Home: 'Home',
    TenantHome: 'Home',
    TenantHomeScreen: 'Home',
    Dashboard: 'Home',
    Main: 'Home',
    Dues: 'Dues',
    TenantDues: 'Dues',
    RentPayment: 'Dues',
    Payment: 'Dues',
    Payments: 'Dues',
    Expenses: 'Expenses',
    TenantExpenses: 'Expenses',
    Notices: 'Notices',
    TenantNotices: 'Notices',
    GatePass: 'GatePass',
    TenantGatePass: 'GatePass',
    Leaves: 'GatePass',
    VisitorPass: 'VisitorPass',
    TenantVisitorPass: 'VisitorPass',
    Visitors: 'VisitorPass',
    Complaints: 'Complaints',
    TenantComplaints: 'Complaints',
    RoomInfo: 'RoomInfo',
    TenantRoomInfo: 'RoomInfo',
    VacateNotice: 'VacateNotice',
    VacateRoom: 'VacateNotice',
    Feedback: 'Feedback',
    Rating: 'Feedback',
    FullMenu: 'FullMenu',
    MessMenu: 'FullMenu',
    Food: 'FullMenu',
    Documents: 'TenantDocuments',
    TenantDocuments: 'TenantDocuments',
    Notes: 'Notes',
    TenantNotes: 'Notes',
  };

  const navigateSafely = (targetScreen: string, params?: any) => {
    if (targetScreen === 'GrowthHome') {
      navigation.navigate('Main', { screen: 'Home' });
      setTimeout(() => {
        DeviceEventEmitter.emit('SWITCH_TENANT_PAGE', 1);
      }, 200);
      return;
    }
    const mapped = TENANT_TAB_MAP[targetScreen];
    if (mapped) {
      navigation.navigate('Main', { screen: mapped, params });
    } else {
      navigation.navigate(targetScreen, params);
    }
  };

  const handleItemPress = (item: any) => {
    markOneRead(item.id);

    // 1. Direct screen payload if present
    if (item.screen) {
      const targetScreen = TENANT_ROUTE_MAP[item.screen] || 'TenantHome';
      try {
        navigateSafely(targetScreen, item.params);
        return;
      } catch (navErr) {
        console.warn('Navigation error for screen:', targetScreen, navErr);
      }
    }

    // 2. Intelligent fallback matching user specification
    const title = (item.title || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const ref = (item.referenceType || '').toLowerCase();

    if (ref === 'food' || type.includes('food') || type.includes('mess') || title.includes('breakfast') || title.includes('lunch') || title.includes('dinner') || title.includes('menu')) {
      navigateSafely('FullMenu');
    } else if (ref === 'growth' || type.includes('growth') || title.includes('growth') || title.includes('streak') || title.includes('milestone')) {
      navigateSafely('GrowthHome');
    } else if (ref === 'vacate' || type.includes('vacate') || title.includes('vacate') || title.includes('move-out')) {
      navigateSafely('VacateNotice');
    } else if (ref === 'feedback' || type.includes('feedback') || title.includes('feedback') || title.includes('review') || title.includes('rate')) {
      navigateSafely('Feedback');
    } else if (type.includes('due') || type.includes('payment') || title.includes('rent') || title.includes('due') || title.includes('fee') || ref === 'payment' || ref === 'monthly_fee') {
      navigateSafely('Dues', item.params || { feeId: item.referenceId });
    } else if (type.includes('complaint') || title.includes('complaint') || ref === 'complaint') {
      navigateSafely('Complaints');
    } else if (type.includes('expense') || type.includes('budget') || title.includes('expense') || title.includes('spend') || title.includes('budget') || ref === 'expense' || ref === 'tenant_expenses') {
      navigateSafely('Expenses');
    } else if (type.includes('notice') || title.includes('notice') || title.includes('announcement') || ref === 'notice') {
      navigateSafely('Notices');
    } else if (type.includes('split') || title.includes('split') || ref === 'split') {
      navigateSafely('Splits');
    } else {
      navigateSafely('TenantHome');
    }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'All') return true;
    const t = (item.type || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const ref = (item.referenceType || '').toLowerCase();

    if (activeTab === 'Food') {
      return ref === 'food' || t.includes('food') || t.includes('mess') || title.includes('breakfast') || title.includes('lunch') || title.includes('dinner');
    }
    if (activeTab === 'Payments') {
      return ref === 'payment' || ref === 'monthly_fee' || t.includes('due') || t.includes('payment') || title.includes('rent') || title.includes('fee');
    }
    if (activeTab === 'Requests') {
      return ref === 'complaint' || ref === 'vacate' || ref === 'feedback' || ref === 'leave' || ref === 'visitor' ||
             t.includes('complaint') || t.includes('vacate') || t.includes('feedback');
    }
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

  const unreadCount = items.filter(i => !i.read).length;

  const renderContent = () => {
    if (loading) {
      return (
        <View style={{ alignItems: 'center', paddingTop: 80 }}>
          <ActivityIndicator size="large" color={BRAND} />
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
            const displayTime = formatRelativeTime(n.date);
            const isExpanded = expandedIds.has(n.id);

            return (
              <TouchableOpacity
                key={n.id}
                style={[
                  styles.rapidoCard,
                  !n.read && styles.unreadCardBg,
                  idx !== groupData.length - 1 && styles.cardBorder
                ]}
                onPress={() => handleItemPress(n)}
                activeOpacity={0.78}
              >
                {/* Left Side: Hostix Brand Logo Badge */}
                <View style={styles.logoBadgeWrap}>
                  <Image
                    source={require('../../../assets/HostixNew.png')}
                    style={styles.logoBadgeImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Center & Content Area */}
                <View style={styles.cardContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.title} numberOfLines={1}>
                      {n.title}
                    </Text>

                    <View style={styles.headerMetaRow}>
                      <Text style={styles.timeText}>{displayTime}</Text>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleExpand(n.id);
                        }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={styles.chevronBtn}
                      >
                        {isExpanded ? (
                          <ChevronUp size={15} color={TEXT_MID} />
                        ) : (
                          <ChevronDown size={15} color={TEXT_MID} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.bodyRow}>
                    <Text
                      style={styles.bodyText}
                      numberOfLines={isExpanded ? undefined : 2}
                      ellipsizeMode="tail"
                    >
                      {n.body}
                    </Text>

                    {/* Right Side: Small Hostix App Badge (Rapido style) */}
                    <View style={styles.smallBadgeWrap}>
                      <Image
                        source={require('../../../assets/HostixNew.png')}
                        style={styles.smallBadgeImage}
                        resizeMode="contain"
                      />
                    </View>
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
        <SafeAreaView edges={['top']} style={{ backgroundColor: BRAND }}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
                <ArrowLeft size={24} color={WHITE} strokeWidth={2.5} />
              </TouchableOpacity>
              <View>
                <Text style={styles.headerTitle}>Notifications</Text>
                <Text style={styles.headerSub}>
                  {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up!'}
                </Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND]} tintColor={BRAND} />}
      >
        {renderContent()}
      </ScrollView>

      {!loading && !error && Object.keys(groupedItems).length > 0 && unreadCount > 0 && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TouchableOpacity style={styles.markReadBtn} onPress={markAllRead} activeOpacity={0.7}>
            <CheckCheck size={16} color={BRAND} strokeWidth={2} style={{ marginRight: 6 }} />
            <Text style={styles.markReadText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  headerSection: {
    backgroundColor: BRAND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { width: 32, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: WHITE },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  // Tabs
  tabContainer: {
    marginTop: 14,
    marginBottom: 8,
  },
  tabScroll: {
    paddingHorizontal: 18,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
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
    paddingHorizontal: 16,
  },
  groupContainer: {
    marginTop: 16,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  groupList: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  // Rapido Card Layout
  rapidoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    gap: 12,
  },
  unreadCardBg: {
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  cardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  // Left Large Logo Badge
  logoBadgeWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  logoBadgeImage: {
    width: 32,
    height: 32,
  },

  // Center Content
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
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
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_MID,
  },
  chevronBtn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Body & Right Small Badge
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  bodyText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
  smallBadgeWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: '#E9D5FF',
    marginTop: 2,
  },
  smallBadgeImage: {
    width: 17,
    height: 17,
  },

  // Mark All Read Button in Header
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
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 22,
    backgroundColor: '#F3E8FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND,
  },
});
