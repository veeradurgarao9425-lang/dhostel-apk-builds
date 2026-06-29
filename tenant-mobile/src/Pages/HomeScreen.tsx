import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import {
  Bell,
  AlignLeft,
  ChevronRight,
  Sun, Moon, Utensils,
  FileText, PieChart, Megaphone, Users, MoreHorizontal, Wallet, MapPin, Wrench,
  Calendar, CreditCard, Gift, ArrowRight
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, shadow } from '../theme';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Quick Access config ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: FileText, label: 'Due', screen: 'Dues', iconBg: '#FEE2E2', iconColor: '#EF4444' },
  { icon: PieChart, label: 'Expenses', screen: 'Expenses', iconBg: '#DCFCE7', iconColor: '#16A34A' },
  { icon: Megaphone, label: 'Notices', screen: 'Notices', iconBg: '#EFF6FF', iconColor: '#3B82F6' },
  { icon: Wrench, label: 'Complaints', screen: 'Complaints', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
  { icon: MoreHorizontal, label: 'More', screen: 'More', iconBg: colors.primarySoft, iconColor: colors.primary },
];

const MealRow = ({ meal, items, isLast }: { meal: string; items: string; isLast: boolean }) => {
  let icon = <Sun size={20} color="#F59E0B" />;
  let bgColor = '#FEF3C7';
  if (meal === 'Lunch') { icon = <Utensils size={20} color="#EF4444" />; bgColor = '#FEE2E2'; }
  if (meal === 'Snacks') { icon = <Utensils size={20} color="#8B5CF6" />; bgColor = '#EDE9FE'; }
  if (meal === 'Dinner') { icon = <Moon size={20} color="#10B981" />; bgColor = '#D1FAE5'; }

  return (
    <TouchableOpacity style={[styles.mealRow, isLast && { borderBottomWidth: 0 }]} activeOpacity={0.7}>
      <View style={styles.mealLeft}>
        <View style={[styles.mealIconBox, { backgroundColor: bgColor }]}>
          {icon}
        </View>
        <View style={styles.mealInfo}>
          <Text style={styles.mealNameText}>{meal}</Text>
          <Text style={styles.mealItemsText} numberOfLines={1}>{items}</Text>
        </View>
      </View>
      <View style={styles.mealRight}>
        <Text style={styles.mealTimeText}>
          {meal === 'Morning' ? '08:00 AM' : meal === 'Lunch' ? '01:00 PM' : meal === 'Snacks' ? '05:00 PM' : '08:00 PM'}
        </Text>
        <ChevronRight size={16} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
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
            date: item.created_at, // Maybe format it better later, e.g. "2h ago"
          })));
        }
      }

      if (feesRes.status === 'fulfilled' && feesRes.value.data?.success) {
        const fees = feesRes.value.data.data;
        let allPayments: any[] = [];
        let sum = 0;
        fees.forEach((f: any) => {
          sum += Number(f.total_amount || 0) - Number(f.paid_amount || 0);
          f.payments?.forEach((p: any) => {
            allPayments.push({
              id: p.payment_id,
              amount: p.amount,
              month: f.fee_month,
              paidOn: p.payment_date ? p.payment_date.slice(0, 10) : '',
              status: 'Paid'
            });
          });
        });
        setDueAmount(sum > 0 ? sum : 0);
        allPayments.sort((a, b) => new Date(b.paidOn).getTime() - new Date(a.paidOn).getTime());
        setRecentPayments(allPayments.slice(0, 3));
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
    }, [user?.hostel_id]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    await fetchData();
    setRefreshing(false);
  }, [refreshUser, user?.hostel_id]);

  const initials = (user?.name || 'V').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const unread = 3; // From image 3

  const lastPayment = recentPayments.length > 0 ? recentPayments[0] : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <SafeAreaView style={{ backgroundColor: '#2245D4' }} edges={['top']} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        {/* ── Blue Header Bar ──────────────────────────────────────── */}
        <View style={{ backgroundColor: '#2245D4', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 36 }}>
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <View style={styles.greetingBox}>
                <Text style={[styles.greetingText, { color: 'rgba(255,255,255,0.85)' }]}>Good Morning,</Text>
                <Text style={[styles.nameText, { color: '#fff' }]}>{user?.name || 'Veera Durgarao'}</Text>
                <Text style={[styles.welcomeText, { color: 'rgba(255,255,255,0.7)' }]}>Welcome back! Have a great day ahead.</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
                <Bell size={20} color="#2245D4" />
                {unread > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.avatarText}>{initials}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Total Due Card (Compact) ───────────────────────────────────────── */}
        <View style={styles.compactDueCard}>
          <View style={styles.compactDueRow}>
            <View style={styles.compactIconBox}>
              <Wallet size={22} color="#0346F2" />
            </View>
            <View style={styles.compactDueInfo}>
              <Text style={styles.compactDueLabel}>Total Due</Text>
              <Text style={styles.compactDueAmount}>₹ {dueAmount.toLocaleString('en-IN')}</Text>
            </View>
            <TouchableOpacity style={styles.compactViewBtn} onPress={() => navigation.navigate('Dues')}>
              <Text style={styles.compactViewText}>Pay Now</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.compactDueDivider} />
          
          <View style={styles.compactDueFooter}>
            <View style={styles.compactFooterItem}>
              <Calendar size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.compactFooterText}>2 Months Pending</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Dues')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.compactFooterLink}>View Details</Text>
              <ArrowRight size={14} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Today's Menu ─────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Menu</Text>
          <TouchableOpacity onPress={() => navigation.navigate('FullMenu')} style={styles.viewAllRow}>
            <Text style={styles.seeAllText}>View All</Text>
            <ArrowRight size={16} color="#1E3A8A" />
          </TouchableOpacity>
        </View>

        <View style={{ marginHorizontal: spacing.xl }}>
          {menuItems.length > 0 ? (
            menuItems.map((item, i) => (
              <View key={item.meal} style={styles.mealCardStandalone}>
                <MealRow meal={item.meal} items={item.items} isLast={true} />
              </View>
            ))
          ) : (
            <>
              <View style={styles.mealCardStandalone}><MealRow meal="Morning" items="Idli, Sambar, Chutney" isLast={true} /></View>
              <View style={styles.mealCardStandalone}><MealRow meal="Lunch" items="Rice, Dal, Sambar, Curd" isLast={true} /></View>
              <View style={styles.mealCardStandalone}><MealRow meal="Dinner" items="Roti, Mix Veg, Salad" isLast={true} /></View>
            </>
          )}
        </View>

        {/* ── Notices ──────────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notices</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Notices')} style={styles.viewAllRow}>
            <Text style={styles.seeAllText}>View All</Text>
            <ArrowRight size={16} color="#1E3A8A" />
          </TouchableOpacity>
        </View>

        <View style={styles.noticesContainer}>
           <TouchableOpacity style={styles.noticeItem} onPress={() => navigation.navigate('Notices')}>
             <View style={[styles.noticeIconWrap, {backgroundColor: '#EFF6FF'}]}>
               <Megaphone size={20} color="#3B82F6" />
             </View>
             <View style={styles.noticeInfo}>
               <Text style={styles.noticeTitle}>Rent Due Reminder</Text>
               <Text style={styles.noticeDesc} numberOfLines={1}>Your rent for May 2025 is due on 05 May 2025.</Text>
             </View>
             <View style={styles.noticeMeta}>
               <Text style={styles.noticeTime}>2h ago</Text>
               <View style={styles.unreadDot} />
             </View>
           </TouchableOpacity>

           <TouchableOpacity style={styles.noticeItem} onPress={() => navigation.navigate('Notices')}>
             <View style={[styles.noticeIconWrap, {backgroundColor: '#ECFDF5'}]}>
               <Gift size={20} color="#10B981" />
             </View>
             <View style={styles.noticeInfo}>
               <Text style={styles.noticeTitle}>New Notice</Text>
               <Text style={styles.noticeDesc} numberOfLines={1}>Water supply will be unavailable on Sunday from 9 AM to 1 PM.</Text>
             </View>
             <View style={styles.noticeMeta}>
               <Text style={styles.noticeTime}>1d ago</Text>
               <View style={styles.unreadDot} />
             </View>
           </TouchableOpacity>

           <TouchableOpacity style={[styles.noticeItem, {borderBottomWidth: 0, marginBottom: 0}]} onPress={() => navigation.navigate('Notices')}>
             <View style={[styles.noticeIconWrap, {backgroundColor: '#FFFBEB'}]}>
               <Utensils size={20} color="#F59E0B" />
             </View>
             <View style={styles.noticeInfo}>
               <Text style={styles.noticeTitle}>Mess Menu Updated</Text>
               <Text style={styles.noticeDesc} numberOfLines={1}>Check out this week's delicious mess menu.</Text>
             </View>
             <View style={styles.noticeMeta}>
               <Text style={styles.noticeTime}>2d ago</Text>
               <View style={styles.unreadDot} />
             </View>
           </TouchableOpacity>
        </View>

        {/* ── Quick Access ─────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.xl, marginTop: spacing['2xl'], marginBottom: 14 }]}>
          Quick Access
        </Text>

        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <TouchableOpacity
                key={action.label}
                style={styles.quickItem}
                onPress={() => navigation.navigate(action.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: action.iconBg }]}>
                  <Icon size={22} color={action.iconColor} strokeWidth={1.5} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 120 },

  // Top Bar
  headerBar: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  menuBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    ...shadow.subtle,
  },
  greetingBox: { justifyContent: 'center' },
  greetingText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  nameText: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  welcomeText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  bellBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    ...shadow.subtle,
  },
  badgeContainer: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F8FAFC',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    ...shadow.subtle,
  },
  avatarText: { color: '#2245D4', fontWeight: '800', fontSize: 15 },

  // Compact Blue Card
  compactDueCard: {
    marginHorizontal: spacing.xl,
    marginTop: -28,
    borderRadius: 16,
    backgroundColor: '#0346F2',
    padding: 16,
    ...shadow.card,
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.35,
    zIndex: 10,
  },
  compactDueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  compactDueInfo: {
    flex: 1,
    marginLeft: 14,
  },
  compactDueLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  compactDueAmount: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 2, letterSpacing: -0.5 },
  compactViewBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
  },
  compactViewText: { color: '#0346F2', fontWeight: '800', fontSize: 13 },
  compactDueDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 14,
  },
  compactDueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactFooterItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  compactFooterText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  compactFooterLink: { fontSize: 13, color: '#fff', fontWeight: '700' },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: 28, marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  viewAllRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 14, color: '#1E3A8A', fontWeight: '700' },

  // Meal Cards
  mealCardStandalone: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    ...shadow.subtle,
  },
  menuCard: {
    marginHorizontal: spacing.xl,
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    ...shadow.card,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  mealIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  mealInfo: { flex: 1 },
  mealNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  mealItemsText: {
    fontSize: 13,
    color: '#64748B',
  },
  mealRight: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  mealTimeText: { fontSize: 13, color: '#F59E0B', fontWeight: '600' },

  // Notices
  noticesContainer: {
    marginHorizontal: spacing.xl,
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    ...shadow.subtle,
  },
  noticeIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  noticeInfo: { flex: 1 },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  noticeDesc: { fontSize: 13, color: '#64748B' },
  noticeMeta: { alignItems: 'flex-end', justifyContent: 'center', gap: 6, marginLeft: 12 },
  noticeTime: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },

  // Quick Access
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  quickItem: {
    alignItems: 'center',
    gap: 8,
    width: (SCREEN_WIDTH - 48) / 5,
  },
  quickIconWrap: {
    width: 54, height: 54,
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 11, fontWeight: '600', color: '#64748B', textAlign: 'center',
  },
});
