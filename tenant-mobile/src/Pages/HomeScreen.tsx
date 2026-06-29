import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Bell,
  Sun, Moon, Utensils,
  ChevronRight, ArrowRight, Info, AlertCircle
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const { width: W } = Dimensions.get('window');
const BLUE  = '#2245D4';
const WHITE = '#FFFFFF';

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
        fees.forEach((f: any) => {
          sum += Number(f.total_amount || 0) - Number(f.paid_amount || 0);
        });
        setDueAmount(sum > 0 ? sum : 0);
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
        {/* ── Quick Stats Bar ──────────────────────────────────────────────────────── */}
        <View style={styles.statsBar}>
          <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('Dues')}>
            <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
              <AlertCircle size={20} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.statLabel}>Pending Dues</Text>
              <Text style={styles.statValue}>₹{dueAmount}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('Complaints')}>
            <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
              <Info size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.statLabel}>Quick Help</Text>
              <Text style={[styles.statValue, { fontSize: 15, color: '#3B82F6' }]}>Raise Issue</Text>
            </View>
          </TouchableOpacity>
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

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center'
  },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  statValue: { fontSize: 16, color: '#0F172A', fontWeight: '800', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 12 },

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
