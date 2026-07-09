import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
  RefreshControl,
  StatusBar,
  Dimensions,
  LayoutAnimation,
  Animated,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  Bell,
  Megaphone,
  Wallet,
  CheckCircle2,
  Zap,
  ArrowRight,
  FileSignature,
  Sun,
  Utensils,
  ChevronLeft,
  ChevronRight,
  Check,
  MessageSquare,
  AlertCircle,
  ConciergeBell,
  Mail,
  Home as HomeIcon,
  Briefcase,
  Ticket,
  Droplets,
  MapPin,
  Search,
  X,
  AlertTriangle,
  Layers,
  FileText,
  QrCode,
  User2,
  Clock,
  BedDouble,
  CreditCard,
  Wrench,
  BookOpen,
  LogOut,
  Users,
  UserPlus,
  PieChart
} from "lucide-react-native";

import { useAuth } from "../context/AuthContext";
import Svg, { Circle } from "react-native-svg";
import { Phase3EmptyState } from '../components/UIComponents';
import IconGlowBadge from '../components/ui/IconGlowBadge';
import CategoryGlowBadge from '../components/ui/CategoryGlowBadge';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from "../services/api";

import { BudgetOverview } from '../components/dashboard/BudgetOverview';

import { MessMenuCard } from '../components/dashboard/MessMenuCard';
import { QuickShortcuts } from '../components/dashboard/QuickShortcuts';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { theme } from '../theme';

const { width, height } = Dimensions.get("window");

function FadeSlideIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  return <View style={style}>{children}</View>;
}

// ── Ocean Blue Palette ────────────────────────────────────────────────────────
const BLUE = theme.colors.primary;
const BLUE_DARK = theme.colors.primaryDark;
const BLUE_SOFT = theme.colors.primarySoft;
const WHITE = "#FFFFFF";
const TEXT_DARK = "#0F172A";
const TEXT_MID = "#64748B";
const BORDER = "#E2E8F0";
const BG = "#F8FAFC";

export default function HomeScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [dueAmount, setDueAmount] = useState<number>(0);
  const [rentDueDate, setRentDueDate] = useState<string | null>(null);
  const [totalRentAmount, setTotalRentAmount] = useState<number>(0);
  const [budget, setBudget] = useState(0);
  const [spent, setSpent] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Animate the budget bar when spent/budget values update
  useEffect(() => {
    if (budget > 0) {
      Animated.timing(progressAnim, {
        toValue: Math.min((spent / budget) * 100, 100),
        duration: 1000,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(0);
    }
  }, [spent, budget]);

  // Load budget and monthly spent total on focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const budgetRes = await api.get('/tenant-expenses/budget');
          if (budgetRes.data?.success) {
            setBudget(Number(budgetRes.data.data.amount));
          }
        } catch (e) {
          console.error('Failed to load budget on focus:', e);
        }

        try {
          const res = await api.get('/tenant-expenses');
          if (res.data && res.data.success) {
            const fetched = res.data.data;
            const now = new Date();
            const monthlyFiltered = fetched.filter((e: any) => {
              if (!e.date) return false;
              const dateStr = typeof e.date === 'string' ? e.date.split('T')[0] : '';
              if (dateStr) {
                const [y, m] = dateStr.split('-').map(Number);
                if ((m - 1) === now.getMonth() && y === now.getFullYear()) return true;
              }
              const eDate = new Date(e.date);
              return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear();
            });
            const total = monthlyFiltered.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
            setSpent(total);
          }
        } catch (e) {
          console.error('Failed to load expenses on focus:', e);
        }
      };
      loadData();
    }, [])
  );

  // Mess skip state
  const [skipped, setSkipped] = useState({ morning: false, lunch: false, dinner: false });
  const [currentMealIdx, setCurrentMealIdx] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) {
      setCurrentMealIdx(0); // Morning (Before 11 AM)
    } else if (hour < 18) {
      setCurrentMealIdx(1); // Lunch (11 AM to 6 PM)
    } else {
      setCurrentMealIdx(2); // Dinner (After 6 PM)
    }
  }, []);

  const fetchUnreadNotifCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setUnreadNotifCount(res.data.data.filter((n: any) => !n.is_read).length);
      }
    } catch {
      // non-critical: badge just won't update this cycle
    }
  }, []);

  useEffect(() => {
    fetchUnreadNotifCount();
    // A push notification arriving (e.g. room allocated, payment verified) means
    // something the owner did likely changed our own data too — refetch it live
    // instead of waiting for the tenant to leave this screen and come back.
    const sub = DeviceEventEmitter.addListener('REFRESH_NOTIFICATIONS', () => {
      fetchUnreadNotifCount();
      refreshUser();
      fetchData();
    });
    return () => sub.remove();
  }, [fetchUnreadNotifCount]);

  const fetchData = async () => {
    try {
      fetchUnreadNotifCount();
      const [noticesRes, feesRes] = await Promise.allSettled([
        api.get("/notices").catch(() => ({ data: { success: false } })),
        api.get("/fees/my-fees").catch(() => ({ data: { success: false } })),
      ]);

      if (noticesRes.status === "fulfilled" && noticesRes.value?.data?.success) {
        const n = noticesRes.value.data.data;
        if (n && n.length > 0) {
          setRecentNotices(
            n.map((item: any) => ({
              id: String(item.notice_id),
              title: item.title,
              body: item.content,
              date: item.created_at,
            })),
          );
        }
      }

      if (feesRes.status === "fulfilled" && feesRes.value?.data?.success) {
        const fees = feesRes.value.data.data;
        let sum = 0;
        let firstDueDate: string | null = null;
        let latestRent = 0;
        const payments: any[] = [];

        fees.forEach((f: any) => {
          if (latestRent === 0) latestRent = Number(f.total_amount || f.monthly_rent || 0);
          const bal = Number(f.total_due || f.total_amount || 0) - Number(f.paid_amount || 0);
          if (bal > 0) {
            sum += bal;
            if (!firstDueDate) firstDueDate = f.due_date || null;
          }
          if (f.payments && Array.isArray(f.payments)) {
            f.payments.forEach((p: any) => {
              payments.push({
                id: String(p.payment_id),
                amount: p.amount,
                date: p.payment_date,
                mode: p.payment_mode || 'Online',
                status: p.verification_status
              });
            });
          }
        });

        setDueAmount(sum > 0 ? sum : 0);
        setRentDueDate(firstDueDate);
        setTotalRentAmount(latestRent);
        // Using the recentPayments array to store expenses & payments for the recent activity UI
        try {
          const expRes = await api.get('/tenant-expenses');
          let combined = payments.map((p: any) => ({
            id: 'pay_' + p.id,
            amount: p.amount,
            date: p.date,
            title: `Payment: ${p.mode}`,
            mode: 'Payment',
            cat: 'Payment',
          }));

          if (expRes.data && expRes.data.success) {
            const expList = expRes.data.data.map((e: any) => ({
              id: 'exp_' + e.expense_id,
              amount: e.amount,
              date: e.date,
              title: e.title || e.category,
              mode: 'Expense',
              cat: e.category ? (e.category.trim().charAt(0).toUpperCase() + e.category.trim().slice(1).toLowerCase()) : 'Others',
            }));
            combined = [...combined, ...expList];
          }
          combined.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setRecentPayments(combined.slice(0, 4));
        } catch {
          setRecentPayments(payments.slice(0, 4).map(p => ({ ...p, title: `Payment: ${p.mode}`, cat: 'Payment' })));
        }
      }
    } catch {
      // non-critical: dashboard still renders from cached user data
    } finally {
      setLoading(false);
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

  const initials = (user?.name || "V")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const firstName = (user?.name || "Tenant").split(" ")[0];

  const formatDate = (ds: string | null) => {
    if (!ds) return "--";
    return new Date(ds).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const formatTime = (ds: string | null) => {
    if (!ds) return "--";
    return new Date(ds).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit",
    });
  };

  const handleMessSkip = (meal: "morning" | "lunch" | "dinner") => {
    const next = !skipped[meal];
    setSkipped(prev => ({ ...prev, [meal]: next }));
    const today = new Date().toISOString().split("T")[0];
    const mealTitle = meal.charAt(0).toUpperCase() + meal.slice(1);
    console.log({ mess_skip: next, meal: mealTitle, date: today });
    api.post("/mess/skip", { meal, skipped: next }).catch(() => { });
  };

  const handlePrevMeal = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setCurrentMealIdx((prev) => (prev === 0 ? meals.length - 1 : prev - 1));
  };

  const handleNextMeal = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setCurrentMealIdx((prev) => (prev === meals.length - 1 ? 0 : prev + 1));
  };


  // ── Mess menu: fetch on every screen focus so owner changes appear immediately ──
  const [todaysMeals, setTodaysMeals] = useState<any>({
    breakfast: { items: 'Menu not updated' },
    lunch: { items: 'Menu not updated' },
    dinner: { items: 'Menu not updated' },
  });

  useFocusEffect(
    useCallback(() => {
      if (!user?.hostel_id) return;
      const fetchMenu = async () => {
        try {
          const res = await api.get('/mess-menu/' + user.hostel_id);
          const rows: any[] = res.data?.menu || res.data?.data || [];
          if (rows.length === 0) return;

          // Map full weekday names → JS getDay() index
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const todayFull = dayNames[new Date().getDay()]; // e.g. 'Saturday'

          // Filter rows for today — map backend's days appropriately
          const todayRows = rows.filter(
            (m: any) => m.day_of_week?.trim().toLowerCase() === todayFull.toLowerCase() || m.day_of_week?.trim().toLowerCase() === todayFull.substring(0, 3).toLowerCase()
          );

          const find = (type: string) =>
            todayRows.find((m: any) => m.meal_type?.trim().toLowerCase() === type.toLowerCase())?.items || 'Menu not updated';

          setTodaysMeals({
            breakfast: { items: find('breakfast') },
            lunch: { items: find('lunch') },
            dinner: { items: find('dinner') },
          });
        } catch (err) {
          console.error('Error fetching mess menu:', err);
        }
      };
      fetchMenu();
    }, [user?.hostel_id])
  );

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDay = days[new Date().getDay()];
  const todayMenu = todaysMeals;

  const meals: { key: "morning" | "lunch" | "dinner"; title: string; sub: string; time: string; Icon: any; iconColor: string; iconBg: string }[] = [
    { key: "morning", title: "Breakfast", sub: todayMenu.breakfast.items, time: "8:00 AM - 10:00 AM", Icon: Sun, iconColor: "#EA580C", iconBg: "#FFEDD5" },
    { key: "lunch", title: "Lunch", sub: todayMenu.lunch.items, time: "12:00 PM - 2:00 PM", Icon: Utensils, iconColor: "#10B981", iconBg: "#D1FAE5" },
    { key: "dinner", title: "Dinner", sub: todayMenu.dinner.items, time: "8:00 PM - 11:00 PM", Icon: ConciergeBell, iconColor: "#7C3AED", iconBg: "#EDE9FE" },
  ];

  const shortcuts: { id: string; name: string; icon: any; nav: string; bg: string; color: string }[] = [
    { id: 'rent', name: 'Pay Rent', icon: Wallet, nav: 'Dues', bg: '#DCFCE7', color: '#16A34A' }, // Finance (Green)
    { id: 'mess', name: 'Mess', icon: Utensils, nav: 'FullMenu', bg: '#F3E8FF', color: '#9333EA' }, // Support (Purple)
    { id: 'complaints', name: 'Complaints', icon: AlertCircle, nav: 'Complaints', bg: '#F3E8FF', color: '#9333EA' }, // Support (Purple)
    { id: 'splits', name: 'Splits', icon: Briefcase, nav: 'Splits', bg: '#DCFCE7', color: '#16A34A' }, // Finance (Green)
    { id: 'visitor', name: 'Visitor Pass', icon: UserPlus, nav: 'VisitorPass', bg: '#E0F2FE', color: '#0EA5E9' }, // Access (Blue)
    { id: 'gatepass', name: 'Gate Pass', icon: QrCode, nav: 'GatePass', bg: '#E0F2FE', color: '#0EA5E9' }, // Access (Blue)
    { id: 'documents', name: 'Documents', icon: FileSignature, nav: 'Documents', bg: '#F3E8FF', color: '#9333EA' }, // Support (Purple)
    { id: 'notes', name: 'Notes', icon: FileText, nav: 'Notes', bg: '#F3E8FF', color: '#9333EA' }, // Support (Purple)
    { id: 'room', name: 'Room Info', icon: BedDouble, nav: 'RoomInfo', bg: '#E0F2FE', color: '#0EA5E9' }, // Access (Blue)
  ];

  const SkeletonBlock = ({ style }: { style: any }) => (
    <View style={[{ backgroundColor: '#E2E8F0', borderRadius: 8, opacity: 0.6 }, style]} />
  );

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: BG }]}>
        <StatusBar barStyle="light-content" backgroundColor={BLUE} />
        <LinearGradient colors={[BLUE, BLUE_DARK]} style={[styles.headerSection, { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }]}>
          <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <SkeletonBlock style={{ width: 120, height: 28, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.3)' }} />
                <SkeletonBlock style={{ width: 100, height: 16, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              </View>
              <SkeletonBlock style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 24 }}>
          <SkeletonBlock style={{ height: 140, borderRadius: 24 }} />
          <SkeletonBlock style={{ height: 120, borderRadius: 24 }} />
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <SkeletonBlock style={{ width: '30%', height: 80, borderRadius: 16 }} />
            <SkeletonBlock style={{ width: '30%', height: 80, borderRadius: 16 }} />
            <SkeletonBlock style={{ width: '30%', height: 80, borderRadius: 16 }} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── PREMIUM APP HEADER ── */}
      <LinearGradient colors={[BLUE, BLUE_DARK]} style={[styles.headerSection, { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }]}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.headerGreeting, { color: WHITE }]}>
                Hi, {firstName} <Text style={{ fontSize: 18 }}>👋</Text>
              </Text>
              <Text style={[styles.headerSub, { color: 'rgba(255,255,255,0.75)' }]}>
                {user?.hostel_name ? user.hostel_name : 'Welcome Back!'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={[styles.hBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                  onPress={() => navigation.navigate("Notifications")}
                >
                  <Bell size={22} color={WHITE} strokeWidth={1.5} />
                  {unreadNotifCount > 0 && (
                    <View style={styles.notifPill}>
                      <Text style={styles.notifPillText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.hAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                  onPress={() => navigation.navigate("Profile")}
                >
                  <Text style={[styles.hAvatarText, { color: WHITE }]}>{initials}</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', fontWeight: '700', letterSpacing: 0.5 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BLUE]}
            tintColor={BLUE}
          />
        }
      >

        <FadeSlideIn delay={40}>
            <BudgetOverview 
                budget={budget} spent={spent} progressAnim={progressAnim}
                dueAmount={dueAmount} totalRentAmount={totalRentAmount} rentDueDate={rentDueDate} formatDate={formatDate}
            />
        </FadeSlideIn>

        <FadeSlideIn delay={160}>
            <View style={styles.section}>
                <MessMenuCard meals={meals} recentNotices={recentNotices} BLUE={BLUE} />
            </View>
        </FadeSlideIn>

        <FadeSlideIn delay={300}>
            <QuickShortcuts shortcuts={shortcuts} />
        </FadeSlideIn>

        <FadeSlideIn delay={360}>
            <RecentActivity recentPayments={recentPayments} formatDate={formatDate} formatTime={formatTime} />
        </FadeSlideIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },

  // ── Global Standardized Card ──
  globalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius['3xl'],
    padding: theme.spacing.xl,
    borderWidth: 0,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerSection: {
    backgroundColor: BLUE,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 12,
  },
  hAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  hAvatarText: { color: WHITE, fontSize: 16, fontWeight: "700" },
  hBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  headerGreeting: { fontSize: 24, fontWeight: "800", color: WHITE, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: BLUE_SOFT, marginTop: 4, fontWeight: "500" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  notifPill: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: WHITE,
  },
  notifPillText: {
    color: WHITE,
    fontSize: 9,
    fontWeight: '800',
  },
  notificationDot: {
    position: "absolute", top: 4, right: 4,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 2, borderColor: WHITE,
  },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: TEXT_DARK, marginBottom: 12 },
  viewAllText: { fontSize: 14, color: "#2952F3", fontWeight: "500" },

  // Overview card
  overviewCard: {
    backgroundColor: WHITE, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: BORDER,
  },
  overviewLeft: { width: '58%' },
  overviewLabel: { fontSize: 13, color: TEXT_MID, fontWeight: "700", marginBottom: 6 },
  overviewAmount: { fontSize: 32, fontWeight: "900", color: "#E11D48", marginBottom: 6, letterSpacing: -1 },
  overviewDate: { fontSize: 12, color: TEXT_MID, marginBottom: 16, fontWeight: "600" },
  overviewBtn: {
    backgroundColor: BLUE, alignSelf: "flex-start",
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  overviewBtnText: { color: WHITE, fontSize: 13, fontWeight: "700" },
  overviewRight: { width: '42%', height: 130, justifyContent: "center", alignItems: "center" },
  walletImg: { width: 130, height: 130, position: "absolute", right: -8, bottom: -12 },

  // Message card
  messageCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: BORDER,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  messageIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: BLUE, justifyContent: "center",
    alignItems: "center", marginRight: 16,
  },
  messageContent: { flex: 1 },
  messageTitle: { fontSize: 14, fontWeight: "700", color: TEXT_DARK, flexShrink: 1 },
  newBadge: { backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  newBadgeTxt: { color: "#EF4444", fontSize: 10, fontWeight: "700" },
  messageTime: { fontSize: 11, color: TEXT_MID },
  messageBody: { fontSize: 13, color: TEXT_MID, lineHeight: 18 },

  // Shortcut grid
  shortcutGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  shortcutItem: { alignItems: "center", width: "22%", marginBottom: 12 },
  shortcutIconBox: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  shortcutText: { fontSize: 11, color: TEXT_DARK, fontWeight: "600", textAlign: "center" },

  // Activity card
  activityCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  activityItem: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  activityIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  activityTitle: { fontSize: 13, fontWeight: "600", color: TEXT_DARK, marginBottom: 2 },
  activityDate: { fontSize: 11, color: TEXT_MID },
  activityAmount: { fontSize: 14, fontWeight: "700", color: TEXT_DARK },

  // Menu row
  menuIconWrap: { width: 46, height: 46, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  menuTitle: { fontSize: 16, fontWeight: "800", color: TEXT_DARK, marginBottom: 3 },
  menuSub: { fontSize: 14, color: TEXT_DARK, fontWeight: "600", lineHeight: 20 },

  // Next Meal card
  nextMealCard: {
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  nmHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 16,
  },
  skipTickBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: "#E5E7EB",
    justifyContent: "center", alignItems: "center",
    backgroundColor: WHITE
  },
  skipTickBtnActive: {
    borderColor: "#F97316",
    backgroundColor: "#FFFBF5"
  },
  nmFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)"
  },
  timeNav: {
    flexDirection: "row", alignItems: "center", gap: 16,
  },
  arrowBtn: {
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
  },
  timeNavText: {
    fontSize: 14, fontWeight: "700", color: TEXT_DARK,
  },
  orderOutsideText: {
    fontSize: 12, fontWeight: "600", color: "#F97316",
  },
});
