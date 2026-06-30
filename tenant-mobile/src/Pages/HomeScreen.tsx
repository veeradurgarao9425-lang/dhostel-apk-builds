import React, { useCallback, useState } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View,
  ScrollView, RefreshControl, StatusBar, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Bell, Sun, Moon, Utensils, ChevronRight, Wrench, Bell as BellIcon, DoorOpen, 
  Wallet, CreditCard, Receipt, AlertCircle, CheckCircle2
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const { width } = Dimensions.get('window');

// ── Theme Colors ─────────────────────────────────────────────────────────────
const BG_COLOR   = '#FFFFFF'; // Pure white
const WHITE      = '#FFFFFF';
const TEXT_DARK  = '#1A1A1A';
const TEXT_MID   = '#666666';
const BORDER     = '#F1F5F9'; // Soft cool grey
const PRIMARY    = '#2245D4'; 

function getDueStatus(dueDate: string | null, balance: number) {
  if (balance <= 0) return { label: 'All Paid', sub: 'No dues pending', color: '#10B981', bg: '#D1FAE5', icon: CheckCircle2 };
  if (!dueDate)     return { label: `₹ ${balance.toLocaleString('en-IN')}`, sub: 'Rent pending', color: '#EF4444', bg: '#FEE2E2', icon: AlertCircle };
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: `₹ ${balance.toLocaleString('en-IN')}`, sub: `Overdue by ${Math.abs(diff)} day(s)`, color: '#EF4444', bg: '#FEE2E2', icon: AlertCircle };
  if (diff === 0) return { label: `₹ ${balance.toLocaleString('en-IN')}`, sub: 'Due today!', color: '#F97316', bg: '#FFEDD5', icon: AlertCircle };
  if (diff <= 7)  return { label: `₹ ${balance.toLocaleString('en-IN')}`, sub: `Due in ${diff} day(s)`, color: '#F97316', bg: '#FFEDD5', icon: AlertCircle };
  return { label: `₹ ${balance.toLocaleString('en-IN')}`, sub: `Due in ${diff} days`, color: PRIMARY, bg: '#EEF3FF', icon: AlertCircle };
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

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG_COLOR} />
      
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>{greeting()}</Text>
            <Text style={styles.headerGreeting}>{firstName} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.hBtn} onPress={() => navigation.navigate('Notifications')}>
              <Bell size={22} color={TEXT_DARK} strokeWidth={1.5} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.hAvatar} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.hAvatarText}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />}
        >
          {/* ── Financial Snapshot Card ─────────────────────────────────────── */}
          <View style={styles.section}>
            {(() => {
              const isAllocated = !!user?.is_allocated;
              if (!isAllocated) {
                return (
                  <View style={[styles.financeCard, { backgroundColor: WHITE }]}>
                    <Text style={[styles.rentLabel, { color: TEXT_DARK }]}>Not Assigned</Text>
                    <Text style={styles.rentSub}>Dues will appear once your room is allocated.</Text>
                  </View>
                );
              }
              
              const s = getDueStatus(rentDueDate, dueAmount);
              const Icon = s.icon;
              
              return (
                <View style={[styles.financeCard, { backgroundColor: s.bg, borderColor: s.bg }]}>
                  <View style={styles.financeTopRow}>
                    <View style={styles.financeIconBox}>
                      <Icon size={24} color={s.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.financeSubText}>{s.sub}</Text>
                      <Text style={[styles.financeAmountText, { color: s.color }]}>{s.label}</Text>
                    </View>
                  </View>
                  
                  {dueAmount > 0 && (
                    <TouchableOpacity 
                      style={[styles.payNowBtn, { backgroundColor: s.color }]}
                      onPress={() => navigation.navigate('Dues')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.payNowText}>Pay Now</Text>
                      <ChevronRight size={18} color={WHITE} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}
          </View>

          {/* ── Quick Actions Grid ────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Quick Actions</Text>
            <View style={styles.quickGrid}>
              {[
                { icon: Wallet,      label: 'Add Expense', screen: 'AddExpense', bg: '#EEF3FF', color: PRIMARY },
                { icon: CreditCard,  label: 'Pay Rent',    screen: 'Dues',       bg: '#FEE2E2', color: '#EF4444' },
                { icon: Wrench,      label: 'Complaints',  screen: 'Complaints', bg: '#FEF3C7', color: '#F59E0B' },
                { icon: DoorOpen,    label: 'Room Info',   screen: 'RoomInfo',   bg: '#EBF7EE', color: '#34A853' },
              ].map(({ icon: Icon, label, screen, bg, color }) => (
                <TouchableOpacity
                  key={label}
                  style={styles.quickItem}
                  onPress={() => navigation.navigate(screen)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickIconWrap, { backgroundColor: bg }]}>
                    <Icon size={26} color={color} strokeWidth={1.5} />
                  </View>
                  <Text style={styles.quickLabel}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Today's Mess Menu ─────────────────────────────────────────── */}
          {menuItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Today's Menu</Text>
                <TouchableOpacity onPress={() => navigation.navigate('FullMenuScreen')}>
                  <Text style={styles.seeAllText}>Full Menu</Text>
                </TouchableOpacity>
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

          {/* ── Recent Notices ────────────────────────────────────────────── */}
          {recentNotices.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Notice Board</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Notices')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.noticesWrapper}>
                {recentNotices.map((notice) => (
                  <TouchableOpacity key={notice.id} style={styles.noticeCard} activeOpacity={0.7} onPress={() => navigation.navigate('Notices')}>
                    <View style={styles.noticeIconWrap}>
                      <Receipt size={22} color={PRIMARY} strokeWidth={1.5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>
                      <Text style={styles.noticeBody} numberOfLines={1}>{notice.body}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Empty State ───────────────────────────────────────────────── */}
          {menuItems.length === 0 && recentNotices.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <CheckCircle2 size={32} color={PRIMARY} />
              </View>
              <Text style={styles.emptyStateTitle}>You're all caught up!</Text>
              <Text style={styles.emptyStateSub}>
                There are no new notices or mess menu items for today.
              </Text>
            </View>
          )}
          
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_COLOR },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16,
  },
  headerSub: { color: TEXT_MID, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  headerGreeting: { color: TEXT_DARK, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  hBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: WHITE,
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute', top: 10, right: 12,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: WHITE
  },
  hAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  hAvatarText: { color: WHITE, fontWeight: '800', fontSize: 16 },

  // Global Section layout
  section: { marginTop: 24, paddingHorizontal: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, marginBottom: 16 },
  seeAllText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },

  // Financial Snapshot Card
  financeCard: {
    borderRadius: 20, padding: 20,
    borderWidth: 1.5,
  },
  financeTopRow: { flexDirection: 'row', alignItems: 'center' },
  financeIconBox: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1
  },
  financeSubText: { fontSize: 14, fontWeight: '600', color: TEXT_MID, marginBottom: 4 },
  financeAmountText: { fontSize: 32, fontWeight: '800', letterSpacing: -1, includeFontPadding: false },
  
  payNowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 20, height: 50, borderRadius: 12,
  },
  payNowText: { color: WHITE, fontSize: 16, fontWeight: '700' },

  // Rent legacy fallbacks
  rentLabel: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  rentSub: { fontSize: 14, color: TEXT_MID, marginTop: 4, fontWeight: '500' },

  // Quick Actions Grid
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickItem: { alignItems: 'center', gap: 10, width: '23%' },
  quickIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { fontSize: 12, fontWeight: '600', color: TEXT_DARK, textAlign: 'center' },

  // Standard Card container
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    paddingHorizontal: 20,
    borderWidth: 1, borderColor: BORDER
  },

  // Meal Row
  mealRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 18, gap: 16,
  },
  mealRowBorder: {
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  mealIconBox: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  mealInfo: { flex: 1 },
  mealNameText: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  mealTimeText: { fontSize: 12, color: TEXT_MID, fontWeight: '600' },
  mealItemsText: { fontSize: 14, color: TEXT_MID, lineHeight: 20 },

  // Notices
  noticesWrapper: { gap: 12 },
  noticeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER
  },
  noticeIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#EEF3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  noticeBody: { fontSize: 14, color: TEXT_MID },

  // Empty State
  emptyState: { marginTop: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyStateIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF3FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20
  },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
  emptyStateSub: { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 20 },
});
