import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  StatusBar,
  Animated,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from '../../../contexts/AuthContext';
import { LinearGradient } from "expo-linear-gradient";
import api from "../../services/api";

import { BudgetOverview } from "../../components/tenant/BudgetOverview";
import { MessMenuCard } from "../../components/tenant/MessMenuCard";
import { QuickShortcuts } from "../../components/tenant/QuickShortcuts";
import { RecentActivity } from "../../components/tenant/RecentActivity";
import { QuickTips } from "../../components/tenant/QuickTips";

const BRAND = '#7C3AED';      
const BRAND_DARK = '#5F2EEA'; 
const WHITE = "#FFFFFF";

function Shimmer({ style, light }: { style?: any; light?: boolean }) {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: light ? "rgba(255,255,255,0.18)" : "#ECEEF2",
          borderRadius: 12,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

export function TenantHomeScreen({ navigation }: any) {
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

  const enterAnims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(100, 
      enterAnims.map(a => Animated.spring(a, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }))
    ).start();
  }, []);

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

  const meals = [
    { key: "morning" as const, title: "Breakfast", sub: todaysMeals.breakfast.items, time: "8:00 AM - 10:00 AM", Icon: null, iconColor: "#EA580C", iconBg: "#FFEDD5" },
    { key: "lunch" as const, title: "Lunch", sub: todaysMeals.lunch.items, time: "12:00 PM - 2:00 PM", Icon: null, iconColor: "#10B981", iconBg: "#D1FAE5" },
    { key: "dinner" as const, title: "Dinner", sub: todaysMeals.dinner.items, time: "8:00 PM - 11:00 PM", Icon: null, iconColor: "#7C3AED", iconBg: "#EDE9FE" },
  ];

  const shortcuts = [
    { id: "rent", name: "Pay Rent", icon: "wallet" as const, nav: "Dues", bg: "#E0E7FF", color: "#6366F1" },
    { id: "splits", name: "Bill Splits", icon: "people" as const, nav: "Splits", bg: "#ECFDF5", color: "#10B981" },
    { id: "complaints", name: "Complaints", icon: "chatbubbles" as const, nav: "Complaints", bg: "#FEF2F2", color: "#EF4444" },
    { id: "room", name: "My Room", icon: "bed" as const, nav: "RoomInfo", bg: "#FEF3C7", color: "#D97706" },
    { id: "visitor", name: "Visitor Pass", icon: "person-add" as const, nav: "VisitorPass", bg: "#E0E7FF", color: "#6366F1" },
    { id: "gatepass", name: "Gate Pass", icon: "qr-code" as const, nav: "GatePass", bg: "#ECFDF5", color: "#10B981" },
    { id: "documents", name: "Documents", icon: "document-text" as const, nav: "Documents", bg: "#FEF2F2", color: "#EF4444" },
    { id: "notes", name: "My Notes", icon: "create" as const, nav: "Notes", bg: "#FEF3C7", color: "#D97706" },
  ];

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

  const initials = (user?.name || user?.full_name || "T")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const firstName = (user?.name || user?.full_name || "Tenant").split(" ")[0];

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

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: '#F8FAFC' }]}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND} />
        <LinearGradient colors={[BRAND, BRAND_DARK]} style={styles.headerSection}>
          <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Shimmer style={{ width: 160, height: 24, marginBottom: 8 }} light />
                <Shimmer style={{ width: 110, height: 13 }} light />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Shimmer style={{ width: 42, height: 42, borderRadius: 21 }} light />
                <Shimmer style={{ width: 42, height: 42, borderRadius: 21 }} light />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 18, paddingBottom: 12, paddingTop: 2 }}>
              <Shimmer style={{ width: 110, height: 26, borderRadius: 20 }} light />
              <Shimmer style={{ width: 80, height: 26, borderRadius: 20 }} light />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
          <Shimmer style={{ height: 76, borderRadius: 16 }} />
          <Shimmer style={{ height: 70, borderRadius: 16 }} />
          <Shimmer style={{ height: 160, borderRadius: 18 }} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[0, 1, 2, 3].map((i) => (
              <Shimmer key={i} style={{ flex: 1, height: 76, borderRadius: 14 }} />
            ))}
          </View>
          <Shimmer style={{ height: 200, borderRadius: 16 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      <LinearGradient
        colors={[BRAND, BRAND_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerSection}
      >
        <View style={styles.headerAccentCircle} />
        <View style={styles.headerAccentCircle2} />

        <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerGreeting} numberOfLines={1} ellipsizeMode="tail">
                {greeting}, {firstName}! 👋
              </Text>
              <View style={styles.hostelRow}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.hostelName} numberOfLines={1}>
                  {(user as any)?.hostel_name ?? "Welcome Back"}
                </Text>
              </View>
            </View>

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

          <View style={styles.headerDateStrip}>
            <View style={styles.datePill}>
              <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.8)" />
              <Text style={styles.datePillText}>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
            </View>
            {user?.room_number && (
              <View style={styles.roomPill}>
                <Ionicons name="bed-outline" size={11} color="rgba(255,255,255,0.8)" />
                <Text style={styles.datePillText}>Room {user.room_number}</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BRAND]}
            tintColor={BRAND}
          />
        }
      >
        <Animated.View style={{ opacity: enterAnims[0], transform: [{ translateY: enterAnims[0].interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
          <BudgetOverview
            budget={budget}
            spent={spent}
            progressAnim={progressAnim}
            dueAmount={dueAmount}
            totalRentAmount={totalRentAmount}
            rentDueDate={rentDueDate}
            formatDate={formatDate}
          />
        </Animated.View>

        <View style={styles.divider} />

        <Animated.View style={{ opacity: enterAnims[1], transform: [{ translateY: enterAnims[1].interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
          <MessMenuCard meals={meals} recentNotices={recentNotices} BLUE={BRAND} />
        </Animated.View>

        <View style={styles.divider} />

        <Animated.View style={{ opacity: enterAnims[2], transform: [{ translateY: enterAnims[2].interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
          <QuickShortcuts shortcuts={shortcuts} />
        </Animated.View>

        <View style={styles.divider} />

        <Animated.View style={{ opacity: enterAnims[3], transform: [{ translateY: enterAnims[3].interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Notices")}
            style={styles.noticeRow}
          >
            <View style={styles.noticeIconWrap}>
              <Ionicons name="megaphone" size={18} color="#D97706" />
            </View>
            {recentNotices.length > 0 ? (
              <View style={{ flex: 1 }}>
                <View style={styles.noticeTitleRow}>
                  <Text style={styles.noticeTitle} numberOfLines={1}>
                    {recentNotices[0]?.title || "New Notice"}
                  </Text>
                  <View style={styles.newChip}>
                    <Text style={styles.newChipText}>NEW</Text>
                  </View>
                </View>
                <Text style={styles.noticeBody} numberOfLines={1}>
                  {recentNotices[0]?.body || "Check here for hostel updates."}
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
        </Animated.View>

        <View style={styles.divider} />

        <Animated.View style={{ opacity: enterAnims[4], transform: [{ translateY: enterAnims[4].interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
          <QuickTips />
        </Animated.View>

        <View style={styles.divider} />

        <Animated.View style={{ opacity: enterAnims[5], transform: [{ translateY: enterAnims[5].interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
          <RecentActivity
            recentPayments={recentPayments}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerSection: {
    paddingBottom: 14,
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
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  hostelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hostelName: {
    fontSize: 12,
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
  headerDateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 12,
    paddingTop: 2,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  divider: {
    height: 14,
  },
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
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
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
