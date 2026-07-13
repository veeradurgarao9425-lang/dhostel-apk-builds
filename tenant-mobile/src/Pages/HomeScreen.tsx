import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  StatusBar,
  Dimensions,
  Animated,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import api from "../services/api";

import { BudgetOverview } from "../components/dashboard/BudgetOverview";
import { MessMenuCard } from "../components/dashboard/MessMenuCard";
import { QuickShortcuts } from "../components/dashboard/QuickShortcuts";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { QuickTips } from "../components/dashboard/QuickTips";
import { theme } from "../theme";

const { width } = Dimensions.get("window");

// ── Removed FadeSlideIn to prevent the "shaded" stuck look on Android ─────────
function FadeSlideIn({ children, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  return <View style={style}>{children}</View>;
}

function Shimmer({ style, light }: { style?: any, light?: boolean }) {
  return (
    <View
      style={[
        {
          backgroundColor: light ? "rgba(255,255,255,0.2)" : "#F1F5F9",
          borderRadius: 12,
        },
        style,
      ]}
    />
  );
}

const BLUE = theme.colors.primary;
const BLUE_DARK = theme.colors.primaryDark;
const WHITE = "#FFFFFF";

export default function HomeScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
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
  const scrollY = useRef(new Animated.Value(0)).current;

  // Header scroll animation
  const headerElevation = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 6],
    extrapolate: "clamp",
  });
  const headerShadowOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 0.12],
    extrapolate: "clamp",
  });

  // ── Budget Progress animation ─────────────────────────────────────────────
  useEffect(() => {
    if (budget > 0) {
      Animated.timing(progressAnim, {
        toValue: Math.min((spent / budget) * 100, 100),
        duration: 1200,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(0);
    }
  }, [spent, budget]);

  // ── Load budget + expenses on focus ──────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const budgetRes = await api.get("/tenant-expenses/budget");
          if (budgetRes.data?.success) {
            setBudget(Number(budgetRes.data.data.amount));
          }
        } catch { }

        try {
          const res = await api.get("/tenant-expenses");
          if (res.data?.success) {
            const now = new Date();
            const filtered = res.data.data.filter((e: any) => {
              if (!e.date) return false;
              const dateStr = typeof e.date === "string" ? e.date.split("T")[0] : "";
              if (dateStr) {
                const [y, m] = dateStr.split("-").map(Number);
                if ((m - 1) === now.getMonth() && y === now.getFullYear()) return true;
              }
              const eDate = new Date(e.date);
              return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear();
            });
            setSpent(filtered.reduce((sum: number, e: any) => sum + Number(e.amount), 0));
          }
        } catch { }
      };
      loadData();
    }, [])
  );

  // ── Mess skip state ───────────────────────────────────────────────────────
  const [skipped, setSkipped] = useState({ morning: false, lunch: false, dinner: false });
  const [currentMealIdx, setCurrentMealIdx] = useState(0);
  useEffect(() => {
    const h = new Date().getHours();
    setCurrentMealIdx(h < 11 ? 0 : h < 18 ? 1 : 2);
  }, []);

  // ── Mess menu ─────────────────────────────────────────────────────────────
  const [todaysMeals, setTodaysMeals] = useState<any>({
    breakfast: { items: "Menu not updated" },
    lunch: { items: "Menu not updated" },
    dinner: { items: "Menu not updated" },
  });
  useFocusEffect(
    useCallback(() => {
      if (!user?.hostel_id) return;
      const fetchMenu = async () => {
        try {
          const res = await api.get("/mess-menu/" + user.hostel_id);
          const rows: any[] = res.data?.menu || res.data?.data || [];
          if (!rows.length) return;
          const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const todayFull = dayNames[new Date().getDay()];
          const todayRows = rows.filter(
            (m: any) =>
              m.day_of_week?.trim().toLowerCase() === todayFull.toLowerCase() ||
              m.day_of_week?.trim().toLowerCase() === todayFull.substring(0, 3).toLowerCase()
          );
          const find = (type: string) =>
            todayRows.find((m: any) => m.meal_type?.trim().toLowerCase() === type.toLowerCase())?.items || "Menu not updated";
          setTodaysMeals({
            breakfast: { items: find("breakfast") },
            lunch: { items: find("lunch") },
            dinner: { items: find("dinner") },
          });
        } catch { }
      };
      fetchMenu();
    }, [user?.hostel_id])
  );

  const meals: {
    key: "morning" | "lunch" | "dinner";
    title: string;
    sub: string;
    time: string;
    Icon: any;
    iconColor: string;
    iconBg: string;
  }[] = [
      { key: "morning", title: "Breakfast", sub: todaysMeals.breakfast.items, time: "8:00 AM - 10:00 AM", Icon: null, iconColor: "#EA580C", iconBg: "#FFEDD5" },
      { key: "lunch", title: "Lunch", sub: todaysMeals.lunch.items, time: "12:00 PM - 2:00 PM", Icon: null, iconColor: "#10B981", iconBg: "#D1FAE5" },
      { key: "dinner", title: "Dinner", sub: todaysMeals.dinner.items, time: "8:00 PM - 11:00 PM", Icon: null, iconColor: "#7C3AED", iconBg: "#EDE9FE" },
    ];

  // ── Quick shortcuts (Ionicons to match owner app style) ──────────────────
  const shortcuts = [
    { id: "rent", name: "Pay Rent", icon: "cash" as const, nav: "Dues", bg: "#DCFCE7", color: "#16A34A" },
    { id: "complaints", name: "Complaints", icon: "chatbubble-ellipses" as const, nav: "Complaints", bg: "#FEE2E2", color: "#E11D48" },
    { id: "room", name: "Room Info", icon: "bed" as const, nav: "RoomInfo", bg: "#EDE9FE", color: "#7C3AED" },
    { id: "splits", name: "Splits", icon: "receipt" as const, nav: "Splits", bg: "#DCFCE7", color: "#16A34A" },
    { id: "visitor", name: "Visitor Pass", icon: "person-add" as const, nav: "VisitorPass", bg: "#E0F2FE", color: "#0284C7" },
    { id: "gatepass", name: "Gate Pass", icon: "qr-code" as const, nav: "GatePass", bg: "#E0F2FE", color: "#0284C7" },
    { id: "documents", name: "Documents", icon: "document-text" as const, nav: "Documents", bg: "#FFF7ED", color: "#EA580C" },
    { id: "notes", name: "Notes", icon: "create" as const, nav: "Notes", bg: "#F3E8FF", color: "#9333EA" },
  ];

  // ── Notif count ───────────────────────────────────────────────────────────
  const fetchUnreadNotifCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      if (res.data?.success) {
        setUnreadNotifCount(res.data.data.filter((n: any) => !n.is_read).length);
      }
    } catch { }
  }, []);

  useEffect(() => {
    fetchUnreadNotifCount();
    const sub = DeviceEventEmitter.addListener("REFRESH_NOTIFICATIONS", () => {
      fetchUnreadNotifCount();
      refreshUser();
      fetchData();
    });
    return () => sub.remove();
  }, [fetchUnreadNotifCount]);

  // ── Data fetch ────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      fetchUnreadNotifCount();
      const [noticesRes, feesRes] = await Promise.allSettled([
        api.get("/notices").catch(() => ({ data: { success: false } })),
        api.get("/fees/my-fees").catch(() => ({ data: { success: false } })),
      ]);

      if (noticesRes.status === "fulfilled" && noticesRes.value?.data?.success) {
        const n = noticesRes.value.data.data;
        if (n?.length > 0) {
          setRecentNotices(
            n.map((item: any) => ({
              id: String(item.notice_id),
              title: item.title,
              body: item.content,
              date: item.created_at,
            }))
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
                mode: p.payment_mode || "Online",
                status: p.verification_status,
              });
            });
          }
        });

        setDueAmount(sum > 0 ? sum : 0);
        setRentDueDate(firstDueDate);
        setTotalRentAmount(latestRent);

        try {
          const expRes = await api.get("/tenant-expenses");
          let combined = payments.map((p: any) => ({
            id: "pay_" + p.id,
            amount: p.amount,
            date: p.date,
            title: `Payment: ${p.mode}`,
            mode: "Payment",
            cat: "Payment",
          }));

          if (expRes.data?.success) {
            const expList = expRes.data.data.map((e: any) => ({
              id: "exp_" + e.expense_id,
              amount: e.amount,
              date: e.date,
              title: e.title || e.category,
              mode: "Expense",
              cat: e.category
                ? e.category.trim().charAt(0).toUpperCase() + e.category.trim().slice(1).toLowerCase()
                : "Others",
            }));
            combined = [...combined, ...expList];
          }
          combined.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setRecentPayments(combined.slice(0, 4));
        } catch {
          setRecentPayments(payments.slice(0, 4).map((p) => ({ ...p, title: `Payment: ${p.mode}`, cat: "Payment" })));
        }
      }
    } catch {
    } finally {
      setLoading(false);
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

  // ── Derived display values ────────────────────────────────────────────────
  const initials = (user?.name || "V")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const firstName = (user?.name || "Tenant").split(" ")[0];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const formatDate = (ds: string | null) => {
    if (!ds) return "--";
    return new Date(ds).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (ds: string | null) => {
    if (!ds) return "--";
    return new Date(ds).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };



  // ── Loading Skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: '#F8FAFC' }]}>
        <StatusBar barStyle="light-content" backgroundColor={BLUE} />
        <LinearGradient colors={[BLUE, BLUE_DARK]} style={styles.headerSection}>
          <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Shimmer style={{ width: 130, height: 22, marginBottom: 8 }} light />
                <Shimmer style={{ width: 90, height: 14 }} light />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Shimmer style={{ width: 40, height: 40, borderRadius: 20 }} light />
                <Shimmer style={{ width: 40, height: 40, borderRadius: 20 }} light />
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
          <Shimmer style={{ height: 60, borderRadius: 16 }} />
          <Shimmer style={{ height: 155, borderRadius: 24 }} />
          <Shimmer style={{ height: 44, borderRadius: 14 }} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <Shimmer key={i} style={{ flex: 1, height: 80, borderRadius: 16 }} />
            ))}
          </View>
          <Shimmer style={{ height: 120, borderRadius: 18 }} />
        </View>
      </View>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* ── PREMIUM HEADER ── */}
      <LinearGradient
        colors={[BLUE, BLUE_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerSection}
      >
        {/* Decorative accent */}
        <View style={styles.headerAccentCircle} />
        <View style={styles.headerAccentCircle2} />

        <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
          <View style={styles.headerRow}>
            {/* LEFT: Greeting */}
            <View style={{ flex: 1 }}>
              <Text style={styles.headerGreeting} numberOfLines={1} ellipsizeMode="tail">
                {greeting}, {firstName}!
              </Text>
              <View style={styles.hostelRow}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.hostelName} numberOfLines={1}>
                  {user?.hostel_name ?? "Welcome Back"}
                </Text>
              </View>
            </View>

            {/* RIGHT: Bell + Avatar */}
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => navigation.navigate("Notifications")}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications" size={20} color={WHITE} />
                {unreadNotifCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={() => navigation.navigate("Profile")}
                activeOpacity={0.8}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date pill */}
          <View style={styles.datePillRow}>
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
            {dueAmount > 0 && (
              <View style={styles.duePill}>
                <Ionicons name="alert-circle" size={11} color="#FFF" />
                <Text style={styles.duePillText}>Rent Due</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── SCROLLABLE BODY ── */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BLUE]}
            tintColor={BLUE}
          />
        }
      >
        {/* Rent card + Budget card */}
        <FadeSlideIn delay={0}>
          <BudgetOverview
            budget={budget}
            spent={spent}
            progressAnim={progressAnim}
            dueAmount={dueAmount}
            totalRentAmount={totalRentAmount}
            rentDueDate={rentDueDate}
            formatDate={formatDate}
          />
        </FadeSlideIn>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Mess menu + Notice board */}
        <FadeSlideIn delay={120}>
          <MessMenuCard meals={meals} recentNotices={recentNotices} BLUE={BLUE} />
        </FadeSlideIn>

        <View style={styles.divider} />

        {/* Quick shortcuts */}
        <FadeSlideIn delay={200}>
          <QuickShortcuts shortcuts={shortcuts} />
        </FadeSlideIn>

        <View style={styles.divider} />

        {/* Announcement / Notice Board */}
        <FadeSlideIn delay={250}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Notices')}
            style={[styles.noticeRow, { borderColor: '#FDE68A' }]}
          >
            <View style={styles.noticeIconWrap}>
              <Ionicons name="megaphone" size={18} color="#D97706" />
            </View>
            {recentNotices.length > 0 ? (
              <View style={{ flex: 1 }}>
                <View style={styles.noticeTitleRow}>
                  <Text style={styles.noticeTitle} numberOfLines={1}>
                    {recentNotices[0]?.title || 'New Notice'}
                  </Text>
                  <View style={styles.newChip}>
                    <Text style={styles.newChipText}>NEW</Text>
                  </View>
                </View>
                <Text style={styles.noticeBody} numberOfLines={1}>
                  {recentNotices[0]?.body || 'Check here for hostel updates.'}
                </Text>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>Announcements</Text>
                <Text style={styles.noticeBody}>No new notices from hostel</Text>
              </View>
            )}
            <View style={styles.noticeArrow}>
              <Ionicons name="chevron-forward" size={14} color="#B45309" />
            </View>
          </TouchableOpacity>
        </FadeSlideIn>

        <View style={styles.divider} />

        {/* Quick Tips Carousel */}
        <FadeSlideIn delay={280}>
          <QuickTips />
        </FadeSlideIn>

        <View style={styles.divider} />

        {/* Recent activity */}
        <FadeSlideIn delay={320}>
          <RecentActivity
            recentPayments={recentPayments}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        </FadeSlideIn>
      </Animated.ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },

  // ── HEADER
  headerSection: {
    paddingBottom: 18,
    overflow: "hidden",
  },
  headerAccentCircle: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -40,
    right: -30,
  },
  headerAccentCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: 10,
    left: 60,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerGreeting: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  hostelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hostelName: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    maxWidth: 200,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  datePillRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 8,
    paddingBottom: 4,
  },
  datePill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  duePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  duePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // ── BODY
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  divider: {
    height: 16,
  },

  // ── NOTICE ROW (inline in HomeScreen)
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    borderWidth: 1.5,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  noticeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  noticeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    flexShrink: 1,
  },
  noticeBody: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  noticeArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  newChip: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  newChipText: {
    color: "#92400E",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
