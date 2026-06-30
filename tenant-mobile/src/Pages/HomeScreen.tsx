import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Bell,
  Sun, Moon, Utensils,
  ChevronRight, Wrench, Bell as BellIcon, DoorOpen,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BLUE  = '#2245D4';
const WHITE = '#FFFFFF';

function getDueStatus(dueDate: string | null, balance: number) {
  if (balance <= 0) return { label: 'All Paid', sub: 'No dues pending', color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' };
  if (!dueDate)     return { label: `₹${balance.toLocaleString('en-IN')}`, sub: 'Rent pending', color: '#EF4444', bg: '#FEE2E2', border: '#FCA5A5' };
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: `₹${balance.toLocaleString('en-IN')}`, sub: `Overdue by ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''}`, color: '#EF4444', bg: '#FEE2E2', border: '#FCA5A5' };
  if (diff === 0) return { label: `₹${balance.toLocaleString('en-IN')}`, sub: 'Due today!', color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' };
  if (diff <= 7)  return { label: `₹${balance.toLocaleString('en-IN')}`, sub: `Due in ${diff} day${diff !== 1 ? 's' : ''}`, color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' };
  return { label: `₹${balance.toLocaleString('en-IN')}`, sub: `Due in ${diff} days`, color: BLUE, bg: '#EFF6FF', border: '#BFDBFE' };
}

const MealRow = ({ meal, items, isLast }: { meal: string; items: string; isLast: boolean }) => {
  let icon = <Sun size={20} color="#F59E0B" />;
  let bgColor = '#FEF3C7';
  if (meal === 'Lunch') { icon = <Utensils size={20} color="#EF4444" />; bgColor = '#FEE2E2'; }
  if (meal === 'Snacks') { icon = <Utensils size={20} color="#8B5CF6" />; bgColor = '#EDE9FE'; }
  if (meal === 'Dinner') { icon = <Moon size={20} color="#10B981" />; bgColor = '#D1FAE5'; }

  return (
    <View style={[styles.mealRow, !isLast && styles.mealRowBorder]}>
      <View style={[styles.mealIconBox, { backgroundColor: bgColor }]}>
        {icon}
      </View>
      <View style={styles.mealInfo}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.mealNameText}>{meal}</Text>
          <Text style={styles.mealTimeText}>
            {meal === 'Morning' ? '08:00 AM' : meal === 'Lunch' ? '01:00 PM' : meal === 'Snacks' ? '05:00 PM' : '08:00 PM'}
          </Text>
        </View>
        <Text style={styles.mealItemsText} numberOfLines={2}>{items}</Text>
      </View>
    </View>
  );
};

export default function HomeScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [dueAmount, setDueAmount] = useState<number>(0);
  const [rentDueDate, setRentDueDate] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [noticesRes, feesRes, menuRes] = await Promise.allSettled([
        api.get('/notices'),
        api.get('/fees/my-fees'),
        user?.hostel_id ? api.get(`/mess-menu/${user.hostel_id}`) : Promise.resolve({ data: { success: false } }),
      ]);

      if (noticesRes.status === 'fulfilled' && noticesRes.value.data?.success) {
        const n = noticesRes.value.data.data;
        if (n && n.length > 0) {
          setRecentNotices(n.slice(0, 3).map((item: any) => ({
            id: String(item.notice_id),
            title: item.title,
            body: item.content,
            category: item.notice_type || 'General',
            date: item.created_at,
          })));
        }
      }

      if (feesRes.status === 'fulfilled' && feesRes.value.data?.success) {
        const fees = feesRes.value.data.data;
        let sum = 0;
        let firstDueDate: string | null = null;
        fees.forEach((f: any) => {
          const bal = Number(f.total_amount || 0) - Number(f.paid_amount || 0);
          if (bal > 0) {
            sum += bal;
            if (!firstDueDate) firstDueDate = f.due_date || null;
          }
        });
        setDueAmount(sum > 0 ? sum : 0);
        setRentDueDate(firstDueDate);
      }

      if (menuRes.status === 'fulfilled' && menuRes.value.data?.success) {
        const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayStr = shortDays[new Date().getDay()];
        const menu = menuRes.value.data.menu || [];
        const todayItems = menu.filter((m: any) => m.day_of_week === todayStr);
        if (todayItems.length > 0) {
          const mapped = todayItems.map((m: any) => ({
            meal: m.meal_type,
            items: m.items,
          }));
          setMenuItems(mapped);
        }
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      fetchData();
    }, [user?.hostel_id])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    await fetchData();
    setRefreshing(false);
  }, [refreshUser, user?.hostel_id]);

  const initials = (user?.name || 'V').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const firstName = (user?.name || 'Tenant').split(' ')[0];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      
      {/* ── Blue Header (Greeting) ─────────────────────────────────────────────────── */}
      <View style={styles.headerWrap}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerGreeting}>Hello, {firstName} 👋</Text>
              <Text style={styles.headerSub}>Welcome back to your dashboard</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.hBtn} onPress={() => navigation.navigate('Notifications')}>
                <Bell size={20} color={WHITE} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.hAvatar} onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.hAvatarText}>{initials}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BLUE]} />}
      >
        {/* ── Rent Status Card ─────────────────────────────────────────────────── */}
        {(() => {
          const isAllocated = !!user?.is_allocated;
          if (!isAllocated) {
            return (
              <View style={[styles.rentCard, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <View style={[styles.rentDot, { backgroundColor: '#94A3B8' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rentLabel, { color: '#64748B' }]}>Room Not Assigned</Text>
                  <Text style={styles.rentSub}>Dues will appear once your room is allocated</Text>
                </View>
              </View>
            );
          }
          const s = getDueStatus(rentDueDate, dueAmount);
          return (
            <TouchableOpacity
              style={[styles.rentCard, { backgroundColor: s.bg, borderColor: s.border }]}
              onPress={() => navigation.navigate('Dues')}
              activeOpacity={0.85}
            >
              <View style={[styles.rentDot, { backgroundColor: s.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rentLabel, { color: s.color }]}>{s.label}</Text>
                <Text style={styles.rentSub}>{s.sub}</Text>
              </View>
              {dueAmount > 0 && (
                <View style={[styles.rentBadge, { backgroundColor: s.color }]}>
                  <Text style={styles.rentBadgeText}>Pay</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })()}

        {/* ── Quick Actions ─────────────────────────────────────────────────────── */}
        <View style={styles.quickRow}>
          {[
            { icon: Wrench,        label: 'Complaint', screen: 'Complaints', bg: '#FEF3C7', color: '#F59E0B' },
            { icon: DoorOpen,      label: 'Room Info',  screen: 'RoomInfo',   bg: '#EFF6FF', color: BLUE },
            { icon: BellIcon,      label: 'Alerts',      screen: 'Notifications', bg: '#DCFCE7', color: '#16A34A' },
          ].map(({ icon: Icon, label, screen, bg, color }) => (
            <TouchableOpacity
              key={label}
              style={styles.quickItem}
              onPress={() => navigation.navigate(screen)}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIcon, { backgroundColor: bg }]}>
                <Icon size={22} color={color} />
              </View>
              <Text style={styles.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Today's Mess Menu ──────────────────────────────────────────────────────── */}
        {menuItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Mess</Text>
            </View>
            <View style={styles.card}>
              {menuItems.map((item, index) => (
                <MealRow 
                  key={index} 
                  meal={item.meal} 
                  items={item.items} 
                  isLast={index === menuItems.length - 1} 
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Recent Notices ──────────────────────────────────────────────────────── */}
        {recentNotices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Notices</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Notices')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.noticesWrapper}>
              {recentNotices.map((notice, i) => (
                <TouchableOpacity key={notice.id} style={styles.noticeCard} activeOpacity={0.7} onPress={() => navigation.navigate('Notices')}>
                  <View style={styles.noticeDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                    <Text style={styles.noticeBody} numberOfLines={2}>{notice.body}</Text>
                  </View>
                  <ChevronRight size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Empty State ──────────────────────────────────────────────────────── */}
        {menuItems.length === 0 && recentNotices.length === 0 && (
          <View style={{ marginTop: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Sun size={32} color="#3B82F6" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>You're all caught up!</Text>
            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 }}>
              There are no new notices or mess menu items for today.
            </Text>
          </View>
        )}
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  headerWrap: { backgroundColor: BLUE, paddingBottom: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  headerGreeting: { color: WHITE, fontSize: 24, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4, fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  hAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  hAvatarText: { color: WHITE, fontWeight: '800', fontSize: 14 },

  // Rent Status Card
  rentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 16,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  rentDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  rentLabel: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  rentSub: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  rentBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10,
  },
  rentBadgeText: { color: WHITE, fontSize: 13, fontWeight: '700' },

  // Quick Actions
  quickRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 12, gap: 10,
  },
  quickItem: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: WHITE, borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  quickIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '600', color: '#334155' },

  // Section
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  seeAllText: { fontSize: 14, color: BLUE, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#F1F5F9'
  },

  // Meal Row
  mealRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 16, gap: 14,
  },
  mealRowBorder: {
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  mealIconBox: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  mealInfo: { flex: 1 },
  mealNameText: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  mealTimeText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  mealItemsText: { fontSize: 13, color: '#64748B', lineHeight: 20 },

  // Notices
  noticesWrapper: { gap: 10 },
  noticeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  noticeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  noticeBody: { fontSize: 13, color: '#64748B', lineHeight: 18 },
});
