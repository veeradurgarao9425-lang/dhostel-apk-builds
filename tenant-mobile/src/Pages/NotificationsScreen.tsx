import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { ArrowLeft, Wallet, Megaphone, Wrench, BellRing, Bell, Search, Filter } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, EmptyState } from '../components/ui';
import { colors, radius, spacing, font } from '../theme';
import { sampleNotifications, NotificationItem } from '../data/tenantContent';
import api from '../services/api';

const BLUE = "#2245D4";
const BLUE_SOFT = "#EEF2FF";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#1A1A1A";
const TEXT_MID = "#666666";

const TABS = ['All', 'Announcements', 'Payments', 'Others'];

const typeMeta: Record<string, { icon: any; tint: string; soft: string }> = {
  'due': { icon: Wallet, tint: '#E11D48', soft: '#FFE4E6' },
  'payment': { icon: Wallet, tint: '#10B981', soft: '#D1FAE5' },
  'notice': { icon: Megaphone, tint: BLUE, soft: BLUE_SOFT },
  'complaint': { icon: Wrench, tint: '#F59E0B', soft: '#FEF3C7' },
  'system': { icon: BellRing, tint: TEXT_MID, soft: '#F1F5F9' },
};

export default function NotificationsScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('All');

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        const formatted = res.data.data.map((n: any) => ({
          id: n.notification_id,
          title: n.title,
          body: n.message,
          type: n.notification_type || 'system',
          date: n.created_at,
          read: !!n.is_read
        }));
        setItems(formatted);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
      const samplesWithTime = sampleNotifications.map((n, i) => ({
        ...n,
        time: i === 0 ? "10:30 AM" : i === 1 ? "08:45 AM" : i === 2 ? "06:15 AM" : "Yesterday"
      }));
      setItems(samplesWithTime as any);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      await api.put('/notifications/read-all');
    } catch (err) {
      console.error('Mark all read error:', err);
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
  }, {} as Record<string, any[]>);

  const formatTime = (dateStr: string) => {
    try {
      if (dateStr.length <= 10) return "Yesterday";
      return new Date(dateStr).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "09:00 AM";
    }
  };

  const unreadCount = items.filter(i => !i.read).length;

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
            <TouchableOpacity style={styles.filterBtn}>
              <Filter size={20} color={WHITE} strokeWidth={2.5} />
            </TouchableOpacity>
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
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {Object.keys(groupedItems).length === 0 ? (
          <View style={{ marginTop: 60 }}>
            <EmptyState
              icon={Bell}
              title="You're all caught up"
              message="No notifications match this filter."
            />
          </View>
        ) : (
          Object.entries(groupedItems).map(([groupDate, groupData]) => (
            <View key={groupDate} style={styles.groupContainer}>
              <Text style={styles.groupTitle}>{groupDate}</Text>
              <View style={styles.groupList}>
                {groupData.map((n, idx) => {
                  const meta = typeMeta[n.type] || typeMeta['system'];
                  const Icon = meta.icon;
                  const displayTime = n.time || formatTime(n.date);

                  return (
                    <View key={n.id} style={[styles.card, idx !== groupData.length - 1 && styles.cardBorder]}>
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
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {Object.keys(groupedItems).length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.markReadBtn} onPress={markAllRead}>
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

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF9F6',
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  markReadBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  markReadText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A0522D', // Using brown for this link as seen in the image
  },
});
