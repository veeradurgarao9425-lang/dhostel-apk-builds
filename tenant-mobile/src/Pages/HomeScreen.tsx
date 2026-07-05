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
  Clock
} from "lucide-react-native";

import { useAuth } from "../context/AuthContext";
import { Phase3EmptyState } from '../components/UIComponents';
import IconGlowBadge from '../components/ui/IconGlowBadge';
import CategoryGlowBadge from '../components/ui/CategoryGlowBadge';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from "../services/api";

const { width, height } = Dimensions.get("window");

function FadeSlideIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  return <View style={style}>{children}</View>;
}

// ── Ocean Blue Palette ────────────────────────────────────────────────────────
const BLUE = "#2245D4";
const BLUE_DARK = "#1E3A8A";
const BLUE_SOFT = "#EEF2FF";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#1A1A1A";
const TEXT_MID = "#666666";
const BORDER = "#F1F5F9";
const BG = "#F8FAFD";

export default function HomeScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [dueAmount, setDueAmount] = useState<number>(0);
  const [rentDueDate, setRentDueDate] = useState<string | null>(null);
  const [totalRentAmount, setTotalRentAmount] = useState<number>(0);
  const [budget, setBudget] = useState(0);
  const [spent, setSpent] = useState(0);
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

  const fetchData = async () => {
    try {
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
          if (f.payment_id && f.payment_amount) {
            payments.push({
              id: String(f.payment_id),
              amount: f.payment_amount,
              date: f.payment_date,
              mode: f.payment_mode_name || 'Online'
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
            id: 'pay_'+p.id,
            amount: p.amount,
            date: p.date,
            title: `Payment: ${p.mode}`,
            mode: 'Payment',
            cat: 'Payment',
          }));
          
          if (expRes.data && expRes.data.success) {
            const expList = expRes.data.data.map((e: any) => ({
              id: 'exp_'+e.expense_id,
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
           setRecentPayments(payments.slice(0, 4).map(p => ({...p, title: `Payment: ${p.mode}`, cat: 'Payment'})));
        }
      }
    } catch {
      // non-critical: dashboard still renders from cached user data
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
    lunch:     { items: 'Menu not updated' },
    dinner:    { items: 'Menu not updated' },
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
            lunch:     { items: find('lunch') },
            dinner:    { items: find('dinner') },
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

  const meals: { key: "morning" | "lunch" | "dinner"; title: string; sub: string; time: string; Icon: any; bg: string; iconBg: string; color: string; gradient: [string, string]; lightBg: string; lightIconBg: string; }[] = [
    { key: "morning", title: "Morning", sub: todayMenu.breakfast.items, time: "8:00 AM - 10:00 AM", Icon: Sun, bg: "#FFFFFF", iconBg: "#DBEAFE", color: "#EA580C", gradient: ["#3B82F6", "#60A5FA"], lightBg: "#FFFAF0", lightIconBg: "#FFE6C6" },
    { key: "lunch", title: "Lunch", sub: todayMenu.lunch.items, time: "12:00 PM - 2:00 PM", Icon: Utensils, bg: "#FFFFFF", iconBg: "#DBEAFE", color: "#4F46E5", gradient: ["#3B82F6", "#60A5FA"], lightBg: "#EEF2FF", lightIconBg: "#E0E7FF" },
    { key: "dinner", title: "Dinner", sub: todayMenu.dinner.items, time: "8:00 PM - 11:00 PM", Icon: ConciergeBell, bg: "#FFFFFF", iconBg: "#DBEAFE", color: "#7C3AED", gradient: ["#3B82F6", "#60A5FA"], lightBg: "#F5F3FF", lightIconBg: "#EDE9FE" },
  ];

  const shortcuts: { id: string; name: string; icon: any; nav: string; bg: string; color: string; gradient: [string, string] }[] = [
    { id: 'mess', name: 'Mess', icon: Utensils, nav: 'FullMenu', bg: '#DCFCE7', color: '#22C55E', gradient: ['#16A34A', '#4ADE80'] },
    { id: 'rent', name: 'Pay Rent', icon: Wallet, nav: 'Payments', bg: '#FFEDD5', color: '#F97316', gradient: ['#EA580C', '#FB923C'] },
    { id: 'complaints', name: 'Complaints', icon: AlertCircle, nav: 'Complaints', bg: '#FEE2E2', color: '#EF4444', gradient: ['#DC2626', '#F87171'] },
    { id: 'documents', name: 'Documents', icon: FileSignature, nav: 'Documents', bg: '#F3E8FF', color: '#9333EA', gradient: ['#7E22CE', '#C084FC'] },
    { id: 'notes', name: 'Notes', icon: FileText, nav: 'Notes', bg: '#FEF3C7', color: '#D97706', gradient: ['#B45309', '#FBBF24'] },
    { id: 'room', name: 'Room Info', icon: HomeIcon, nav: 'RoomInfo', bg: '#E0E7FF', color: '#4F46E5', gradient: ['#4338CA', '#818CF8'] },
    { id: 'gatepass', name: 'Gate Pass', icon: QrCode, nav: 'GatePass', bg: '#E0F2FE', color: '#0EA5E9', gradient: ['#0284C7', '#38BDF8'] },
    { id: 'splits', name: 'Splits', icon: Briefcase, nav: 'Splits', bg: '#FFE4E6', color: '#E11D48', gradient: ['#BE123C', '#FB7185'] },
    { id: 'visitor', name: 'Visitor Pass', icon: User2, nav: 'VisitorPass', bg: '#E0E7FF', color: '#4F46E5', gradient: ['#4338CA', '#818CF8'] },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── BLUE HEADER ── */}
      <View style={styles.headerSection}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.headerGreeting}>
                Hi, {firstName} <Text style={{ fontSize: 18 }}>👋</Text>
              </Text>
              <Text style={styles.headerSub}>Welcome Back!</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.hBtn}
                onPress={() => navigation.navigate("Notifications")}
              >
                <Bell size={24} color={WHITE} strokeWidth={1.5} />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.hAvatar}
                onPress={() => navigation.navigate("Profile")}
              >
                <Text style={styles.hAvatarText}>{initials}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160, paddingTop: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BLUE]}
            tintColor={BLUE}
          />
        }
      >
        {/* ── Budget Summary Banner ── */}
        <FadeSlideIn delay={0}>
        {budget === 0 ? (
          <TouchableOpacity 
            style={[styles.globalCard, { marginHorizontal: 20, marginTop: 10, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }]}
            onPress={() => navigation.navigate('Expenses')}
            activeOpacity={0.8}
          >
            <IconGlowBadge Icon={Wallet} gradient={['#3B82F6', '#60A5FA']} glowColor="#2563EB" flatColor="#2563EB" flatBg="#FFFFFF" size="sm" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK }}>Monthly Budget Not Set</Text>
              <Text style={{ fontSize: 11, color: TEXT_MID, marginTop: 2 }}>Tap to track personal expenses</Text>
            </View>
            <ChevronRight size={16} color="#2563EB" strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.globalCard, { marginHorizontal: 20, marginTop: 10, marginBottom: 16, padding: 0, overflow: 'hidden', borderWidth: 0 }]}
            onPress={() => navigation.navigate('Expenses')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={spent > budget ? ['#FEF2F2', '#FEE2E2'] : ['#FFF1F2', '#FFE4E6']} style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ backgroundColor: spent > budget ? '#FECACA' : '#FECDD3', width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} color={spent > budget ? '#DC2626' : '#E11D48'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: spent > budget ? '#DC2626' : '#E11D48', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 }}>
                    My Budget
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: spent > budget ? '#991B1B' : '#9F1239' }}>
                    ₹{spent} <Text style={{ fontSize: 11, color: spent > budget ? '#B91C1C' : '#BE123C', fontWeight: '600' }}>/ ₹{budget}</Text>
                  </Text>
                </View>
                <View style={{ backgroundColor: spent > budget ? '#DC2626' : '#E11D48', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
                    {spent > budget ? 'OVER' : `${Math.round((spent/budget)*100)}%`}
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 10, height: 4, backgroundColor: spent > budget ? '#FECACA' : '#FECDD3', borderRadius: 2, overflow: 'hidden' }}>
                <Animated.View style={{ height: '100%', width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: spent > budget ? '#DC2626' : '#E11D48', borderRadius: 2 }} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        </FadeSlideIn>

        {/* ── Total Due Overview Card ── */}
        <FadeSlideIn delay={80}>
        <View style={styles.section}>
          <View style={[styles.globalCard, {
            paddingVertical: 12, // Decreased height
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            overflow: 'hidden',
            backgroundColor: dueAmount === 0 ? '#F0FDF4' : (dueAmount < totalRentAmount ? '#FFF7ED' : '#FEF2F2'),
            borderColor: dueAmount === 0 ? '#BBF7D0' : (dueAmount < totalRentAmount ? '#FED7AA' : '#FECACA'),
          }]}>
            <View style={styles.overviewLeft}>
              {/* Label row with icon */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={[styles.cardIconWrap, {
                  backgroundColor: dueAmount === 0 ? '#D1FAE5' : (dueAmount < totalRentAmount ? '#FFEDD5' : '#FEE2E2'),
                  width: 32, height: 32, borderRadius: 10,
                }]}>
                  {dueAmount === 0 ? <CheckCircle2 size={16} color="#10B981" /> : <AlertCircle size={16} color={dueAmount < totalRentAmount ? '#EA580C' : '#EF4444'} />}
                </View>
                <Text style={[styles.overviewLabel, { marginBottom: 0 }]}>
                  {dueAmount > 0 ? "Total Due" : "Monthly Rent"}
                </Text>
              </View>

              {/* Amount */}
              <Text style={[styles.overviewAmount, dueAmount === 0 ? { color: "#16A34A" } : (dueAmount < totalRentAmount ? { color: "#EA580C" } : { color: "#E11D48" }), { fontSize: 28 }]}>
                ₹ {(dueAmount > 0 ? dueAmount : (totalRentAmount || 0)).toLocaleString("en-IN")}
              </Text>

              {/* Sub-label */}
              {dueAmount > 0 && (
                <Text style={[styles.overviewDate, { marginBottom: 12 }]}>
                  📅 Due: {rentDueDate ? formatDate(rentDueDate) : "Not scheduled"}
                </Text>
              )}

              {/* Action button */}
              {dueAmount > 0 ? (
                <TouchableOpacity style={[styles.overviewBtn, { paddingVertical: 8, paddingHorizontal: 12 }]} onPress={() => navigation.navigate("Payments")}>
                  <Text style={[styles.overviewBtnText, { fontSize: 12 }]}>Pay Now</Text>
                  <ArrowRight size={14} color={WHITE} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.overviewBtn, { backgroundColor: "#D1FAE5", paddingVertical: 8, paddingHorizontal: 12 }]}>
                  <Check size={14} color="#10B981" strokeWidth={3} />
                  <Text style={[styles.overviewBtnText, { color: "#10B981", fontSize: 12 }]}>Paid</Text>
                </View>
              )}
            </View>

            {/* Wallet illustration — larger */}
            <View style={styles.overviewRight}>
              <Image
                source={require("../../assets/wallet_3d.png")}
                style={{ width: 120, height: 120, position: "absolute", right: -10, bottom: -15 }} // Decreased size
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
        </FadeSlideIn>

        {/* ── Next Meal ──────────────────────────────────────────────── */}
        <FadeSlideIn delay={160}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Next Meal</Text>
            <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 4 }} onPress={() => navigation.navigate("FullMenu")}>
              <Text style={styles.viewAllText}>Full Menu</Text>
              <ArrowRight size={14} color={BLUE} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {(() => {
            const activeMeal = meals[currentMealIdx];
            const isSkipped = skipped[activeMeal.key];
            const MealIcon = activeMeal.Icon;
            const isPlaceholder = activeMeal.sub === 'Menu not updated';
            
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleNextMeal}
                style={[styles.globalCard, { padding: 16, backgroundColor: isSkipped ? '#F9FAFB' : activeMeal.lightBg, borderWidth: 0 }, isSkipped && { opacity: 0.8 }]}
              >
                <View style={styles.nmHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                    <View style={[styles.cardIconWrap, { backgroundColor: isSkipped ? '#F3F4F6' : activeMeal.lightIconBg, borderRadius: 12, width: 44, height: 44 }]}>
                      <MealIcon size={22} color={isSkipped ? TEXT_MID : activeMeal.color} strokeWidth={2.5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.menuTitle, { color: isSkipped ? TEXT_MID : TEXT_DARK, fontSize: 16, marginBottom: 2 }, isSkipped && { textDecorationLine: "line-through" }]}>
                        {activeMeal.title}
                      </Text>
                      <Text style={[styles.menuSub, { color: TEXT_MID, fontSize: 13 }, isSkipped && { textDecorationLine: "line-through" }, isPlaceholder && { fontStyle: 'italic' }]} numberOfLines={2}>
                        {activeMeal.sub}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'center', alignSelf: 'flex-start' }}>
                    <TouchableOpacity
                      style={[
                        styles.skipTickBtn, 
                        { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: isSkipped ? '#D1D5DB' : '#E5E7EB', backgroundColor: isSkipped ? '#F3F4F6' : WHITE }
                      ]}
                      onPress={(e) => { e.stopPropagation(); handleMessSkip(activeMeal.key); }}
                      activeOpacity={0.7}
                    >
                      <Check size={14} color={isSkipped ? TEXT_MID : '#D1D5DB'} strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={{ height: 1, backgroundColor: isSkipped ? '#E5E7EB' : 'rgba(0,0,0,0.04)', marginVertical: 14 }} />

                <View style={[styles.nmFooter, { marginTop: 0, paddingTop: 0, borderTopWidth: 0, justifyContent: 'flex-start', gap: 12 }]}>
                  <TouchableOpacity onPress={(e) => { e.stopPropagation(); handlePrevMeal(); }} style={[styles.arrowBtn, { backgroundColor: isSkipped ? '#F3F4F6' : 'rgba(0,0,0,0.03)', borderRadius: 8, padding: 6 }]}>
                    <ChevronLeft size={18} color={isSkipped ? TEXT_MID : TEXT_DARK} strokeWidth={3} />
                  </TouchableOpacity>
                  <Text style={[styles.timeNavText, { color: isSkipped ? TEXT_MID : TEXT_DARK, fontSize: 13, fontWeight: '700' }]}>{activeMeal.time}</Text>
                  <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleNextMeal(); }} style={[styles.arrowBtn, { backgroundColor: isSkipped ? '#F3F4F6' : 'rgba(0,0,0,0.03)', borderRadius: 8, padding: 6 }]}>
                    <ChevronRight size={18} color={isSkipped ? TEXT_MID : TEXT_DARK} strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>
        </FadeSlideIn>

        {/* ── Today's Message ───────────────────────────────────────────────── */}
        <FadeSlideIn delay={240}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Important Notice</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Notices")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.globalCard, { padding: 0, overflow: 'hidden', borderWidth: 0 }]}
            onPress={() => navigation.navigate("Notices")}
          >
            <LinearGradient colors={['#FEF2F2', '#FEE2E2']} style={{ padding: 16, flexDirection: "row", alignItems: "center" }}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#FECACA', marginRight: 16 }]}>
                <Megaphone size={20} color="#DC2626" />
              </View>
              <View style={styles.messageContent}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <Text style={[styles.messageTitle, { color: '#7F1D1D' }]} numberOfLines={1}>
                      {recentNotices[0]?.title || "Welcome!"}
                    </Text>
                    <View style={[styles.newBadge, { backgroundColor: '#EF4444' }]}>
                      <Text style={[styles.newBadgeTxt, { color: '#FFFFFF' }]}>New</Text>
                    </View>
                  </View>
                  <Text style={[styles.messageTime, { color: '#DC2626' }]}>
                    {recentNotices[0]?.date ? formatTime(recentNotices[0].date) : "09:00 AM"}
                  </Text>
                </View>
                <Text style={[styles.messageBody, { color: '#991B1B' }]} numberOfLines={2}>
                  {recentNotices[0]?.body || "Welcome to the hostel app. Check here for daily updates."}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        </FadeSlideIn>

        {/* ── Shortcuts ────────────────────────────────────────────────────── */}
        <FadeSlideIn delay={300}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shortcuts</Text>
          <View style={styles.shortcutGrid}>
            {shortcuts.map((sc) => {
              return (
                <TouchableOpacity key={sc.id} style={styles.shortcutItem} onPress={() => navigation.navigate(sc.nav)}>
                  <IconGlowBadge
                    Icon={sc.icon}
                    gradient={sc.gradient}
                    glowColor={sc.color}
                    flatColor={sc.color}
                    flatBg={sc.bg}
                    size="md"
                    entrance
                    style={{ marginBottom: 8 }}
                  />
                  <Text style={styles.shortcutText}>{sc.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        </FadeSlideIn>

        {/* ── Recent Activity ──────────────────────────────────────────────── */}
        <FadeSlideIn delay={360}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Expenses")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentPayments.length > 0 ? (
            <View style={{ gap: 12 }}>
              {recentPayments.map((p) => (
                <View key={p.id} style={[styles.globalCard, { paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, borderLeftColor: p.mode === 'Payment' ? '#10B981' : '#3B82F6', borderRadius: 14 }]}>
                  {p.mode === 'Payment' ? (
                     <View style={[styles.cardIconWrap, { width: 44, height: 44, borderRadius: 14, backgroundColor: '#D1FAE5' }]}>
                        <Wallet size={20} color="#10B981" />
                     </View>
                  ) : (
                     <CategoryGlowBadge category={p.cat} size="sm" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 }}>{p.title}</Text>
                    <Text style={{ fontSize: 11, color: TEXT_MID, fontWeight: '500' }}>{formatDate(p.date)} • {formatTime(p.date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.3 }}>
                      {p.mode === 'Payment' ? '+' : '-'}₹{p.amount.toLocaleString('en-IN')}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: p.mode === 'Payment' ? '#10B981' : '#EF4444' }}>
                      {p.mode === 'Payment' ? 'Paid' : 'Expense'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ paddingTop: 10 }}>
              <Phase3EmptyState variant="activity" />
            </View>
          )}
        </View>
        </FadeSlideIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  
  // ── Global Standardized Card ──
  globalCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    paddingHorizontal: 20, paddingTop: 12,
  },
  hAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  hAvatarText: { color: WHITE, fontWeight: "700", fontSize: 16 },
  headerGreeting: { fontSize: 18, fontWeight: "700", color: WHITE },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  hBtn: { padding: 4, position: "relative" },
  notificationDot: {
    position: "absolute", top: 4, right: 4,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 2, borderColor: WHITE,
  },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: TEXT_DARK, marginBottom: 12 },
  viewAllText: { fontSize: 13, color: BLUE, fontWeight: "600" },

  // Overview card
  overviewCard: {
    backgroundColor: WHITE, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 20,
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
