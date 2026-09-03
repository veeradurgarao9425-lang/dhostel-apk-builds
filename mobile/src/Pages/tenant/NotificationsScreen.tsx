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
} from 'react-native';
import {
  ArrowLeft,
  Wallet,
  Megaphone,
  Wrench,
  BellRing,
  KeyRound,
  UserCheck,
  Receipt,
  Compass,
  CheckCheck,
  Filter,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { Phase3EmptyState, Phase3ErrorState } from '../../components/tenant/UIComponents';
import { useToast } from '../../../contexts/ToastContext';
import api from '../../services/api';
import { notificationService } from '../../services/notificationService';

// ── Stayvix Theme Tokens ─────────────────────────────────────────────────────
const RUST = '#C2410C';
const RUST_DARK = '#9A3412';
const RUST_SOFT = '#FFEDD5';
const BROWN = '#78350F';
const BROWN_DARK = '#451A03';
const CREAM = '#FFFDF8';
const CREAM_ALT = '#FFFBEB';
const BORDER = '#FDE68A';
const TEXT_MUTED = '#92400E';

const TABS = [
  'All',
  'Dues',
  'Notices',
  'Complaints',
  'Gate Pass',
  'Account',
  'Expenses',
  'Growth',
];

const typeMeta: Record<string, { icon: any; tint: string; soft: string }> = {
  due: { icon: Wallet, tint: '#B45309', soft: '#FEF3C7' },
  payment: { icon: Wallet, tint: '#15803D', soft: '#DCFCE7' },
  notice: { icon: Megaphone, tint: '#C2410C', soft: '#FFEDD5' },
  complaint: { icon: Wrench, tint: '#B45309', soft: '#FEF3C7' },
  gate_pass: { icon: KeyRound, tint: '#0284C7', soft: '#E0F2FE' },
  account: { icon: UserCheck, tint: '#7C3AED', soft: '#EDE9FE' },
  expense: { icon: Receipt, tint: '#0D9488', soft: '#CCFBF1' },
  growth: { icon: Compass, tint: '#D97706', soft: '#FEF3C7' },
  system: { icon: BellRing, tint: '#92400E', soft: '#FFFBEB' },
};

export default function NotificationsScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('All');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showError } = useToast();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        const formatted = res.data.data.map((n: any) => {
          let parsedParams = null;
          try {
            if (n.params) {
              parsedParams = typeof n.params === 'string' ? JSON.parse(n.params) : n.params;
            }
          } catch {}

          let cat = (n.notification_type || n.type || '').toLowerCase();
          const title = (n.title || '').toLowerCase();
          if (title.includes('due') || title.includes('payment') || title.includes('rent')) cat = 'due';
          else if (title.includes('notice') || title.includes('broadcast') || title.includes('mess')) cat = 'notice';
          else if (title.includes('complaint') || title.includes('maintenance')) cat = 'complaint';
          else if (title.includes('gate') || title.includes('pass')) cat = 'gate_pass';
          else if (title.includes('room') || title.includes('allocat') || title.includes('account')) cat = 'account';
          else if (title.includes('expense') || title.includes('spend')) cat = 'expense';
          else if (title.includes('growth') || title.includes('story')) cat = 'growth';

          return {
            id: n.notification_id,
            title: n.title,
            body: n.message,
            type: cat || 'system',
            date: n.created_at,
            read: !!n.is_read,
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
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

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
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      await api.put('/notifications/read-all');
      DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
    } catch (_) {}
  };

  const markOneRead = async (id: string | number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
    try {
      await api.put(`/notifications/${id}/read`);
      DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
    } catch (_) {}
  };

  const handleItemPress = (item: any) => {
    markOneRead(item.id);
    const { screen, params } = notificationService.resolveDeepLink(item, 'TENANT');
    if (screen) {
      navigation.navigate(screen, params);
    }
  };

  const filteredItems = items.filter((item) => {
    if (unreadOnly && item.read) return false;
    if (activeTab === 'All') return true;
    if (activeTab === 'Dues') return item.type === 'due' || item.type === 'payment';
    if (activeTab === 'Notices') return item.type === 'notice' || item.type === 'system';
    if (activeTab === 'Complaints') return item.type === 'complaint';
    if (activeTab === 'Gate Pass') return item.type === 'gate_pass';
    if (activeTab === 'Account') return item.type === 'account';
    if (activeTab === 'Expenses') return item.type === 'expense';
    if (activeTab === 'Growth') return item.type === 'growth';
    return true;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    let groupName = 'Earlier';
    if (item.date) {
      const itemDate = new Date(item.date);
      const today = new Date();
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);

      const itemDateStr = itemDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      const yestStr = yest.toISOString().split('T')[0];

      if (itemDateStr === todayStr) groupName = 'Today';
      else if (itemDateStr === yestStr) groupName = 'Yesterday';
      else groupName = itemDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }

    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const formatTime = (dateStr: string) => {
    try {
      if (dateStr.length <= 10) return 'Yesterday';
      return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '09:00 AM';
    }
  };

  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top App Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={BROWN_DARK} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={markAllRead}
            style={styles.markAllBtn}
            activeOpacity={0.7}
          >
            <CheckCheck size={16} color={RUST} />
            <Text style={styles.markAllText}>Read All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Category Tabs & Filter Chips */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          <TouchableOpacity
            onPress={() => setUnreadOnly(!unreadOnly)}
            style={[styles.unreadToggle, unreadOnly && styles.unreadToggleActive]}
            activeOpacity={0.7}
          >
            <Filter size={12} color={unreadOnly ? '#FFFFFF' : RUST} />
            <Text
              style={[
                styles.unreadToggleText,
                unreadOnly && styles.unreadToggleTextActive,
              ]}
            >
              Unread
            </Text>
          </TouchableOpacity>

          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={RUST}
            colors={[RUST]}
          />
        }
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={RUST} />
          </View>
        ) : error ? (
          <View style={{ marginTop: 40 }}>
            <Phase3ErrorState variant="server" onAction={fetchNotifications} />
          </View>
        ) : Object.keys(groupedItems).length === 0 ? (
          <View style={{ marginTop: 60 }}>
            <Phase3EmptyState variant="notices" />
          </View>
        ) : (
          Object.entries(groupedItems).map(([groupDate, groupData]) => {
            const itemsInGroup = groupData as any[];
            return (
              <View key={groupDate} style={styles.groupContainer}>
                <Text style={styles.groupTitle}>{groupDate}</Text>
                <View style={styles.groupList}>
                  {itemsInGroup.map((n: any, idx: number) => {
                    const meta = typeMeta[n.type] || typeMeta['system'];
                    const Icon = meta.icon;
                    const displayTime = n.time || formatTime(n.date);

                    return (
                      <TouchableOpacity
                        key={n.id}
                        style={[
                          styles.card,
                          !n.read && styles.unreadCard,
                          idx !== itemsInGroup.length - 1 && styles.cardBorder,
                        ]}
                        onPress={() => handleItemPress(n)}
                        activeOpacity={0.7}
                      >
                      <View
                        style={[
                          styles.iconWrap,
                          { backgroundColor: meta.soft },
                        ]}
                      >
                        <Icon size={20} color={meta.tint} />
                      </View>
                      <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                          <Text
                            style={[
                              styles.title,
                              !n.read && styles.unreadTitle,
                            ]}
                            numberOfLines={1}
                          >
                            {n.title}
                          </Text>
                          <Text style={styles.time}>{displayTime}</Text>
                        </View>
                        <View style={styles.cardBodyRow}>
                          <Text style={styles.body} numberOfLines={2}>
                            {n.body}
                          </Text>
                          {!n.read && <View style={styles.unreadDot} />}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CREAM,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CREAM_ALT,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BROWN_DARK,
    letterSpacing: -0.3,
  },
  unreadBadge: {
    backgroundColor: RUST,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: RUST,
  },
  tabsContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CREAM,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  unreadToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: CREAM_ALT,
    borderWidth: 1,
    borderColor: RUST,
  },
  unreadToggleActive: {
    backgroundColor: RUST,
  },
  unreadToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: RUST,
  },
  unreadToggleTextActive: {
    color: '#FFFFFF',
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: CREAM_ALT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabBtnActive: {
    backgroundColor: RUST,
    borderColor: RUST,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: BROWN,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingLeft: 4,
  },
  groupList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'flex-start',
  },
  unreadCard: {
    backgroundColor: '#FFFDF5',
  },
  cardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: BROWN_DARK,
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
    color: BROWN,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RUST,
    marginLeft: 8,
  },
});
