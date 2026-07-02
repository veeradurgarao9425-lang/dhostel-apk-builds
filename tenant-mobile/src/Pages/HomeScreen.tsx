import React, { useCallback, useState, useEffect } from "react";
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
  User2
} from "lucide-react-native";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

import { Phase3EmptyState } from '../components/UIComponents';

const { width } = Dimensions.get("window");

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
        setRecentPayments(payments.slice(0, 3)); // keep top 3
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


    const [todaysMeals, setTodaysMeals] = useState<any>({
    breakfast: { items: 'Menu not updated' },
    lunch: { items: 'Menu not updated' },
    dinner: { items: 'Menu not updated' }
  });

  useEffect(() => {
    if (!user?.hostel_id) return;
    const fetchMenu = async () => {
      try {
        const res = await api.get('/mess-menu/' + user.hostel_id);
        if (res.data && res.data.success) {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const today = days[new Date().getDay()];
          const todayMenu = res.data.data.find((m: any) => m.day_of_week === today);
          if (todayMenu) {
            setTodaysMeals({
              breakfast: { items: todayMenu.breakfast_items || 'No breakfast items' },
              lunch: { items: todayMenu.lunch_items || 'No lunch items' },
              dinner: { items: todayMenu.dinner_items || 'No dinner items' }
            });
          }
        }
      } catch (err) {
        console.error('Error fetching mess menu:', err);
      }
    };
    fetchMenu();
  }, [user]);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDay = days[new Date().getDay()];
  const todayMenu = todaysMeals;

  const meals: { key: "morning" | "lunch" | "dinner"; title: string; sub: string; time: string; Icon: any; bg: string; iconBg: string; color: string }[] = [
    { key: "morning", title: "Morning", sub: todayMenu.breakfast.items, time: "8:00 AM - 10:00 AM", Icon: Sun, bg: "#FFFBF5", iconBg: "#FFEDD5", color: "#F97316" },
    { key: "lunch", title: "Lunch", sub: todayMenu.lunch.items, time: "12:00 PM - 2:00 PM", Icon: Utensils, bg: "#FFF1F2", iconBg: "#FFE4E6", color: "#E11D48" },
    { key: "dinner", title: "Dinner", sub: todayMenu.dinner.items, time: "8:00 PM - 11:00 PM", Icon: ConciergeBell, bg: "#ECFDF5", iconBg: "#D1FAE5", color: "#059669" },
  ];

  const shortcuts = [
    { id: 'mess', name: 'Mess', icon: Utensils, nav: 'FullMenu', bg: '#DCFCE7', color: '#22C55E' },
    { id: 'rent', name: 'Pay Rent', icon: Wallet, nav: 'Payments', bg: '#FFEDD5', color: '#F97316' },
    { id: 'complaints', name: 'Complaints', icon: AlertCircle, nav: 'Complaints', bg: '#FEE2E2', color: '#EF4444' },

    { id: 'documents', name: 'Documents', icon: FileSignature, nav: 'Documents', bg: '#F3E8FF', color: '#9333EA' },
    { id: 'notes', name: 'Notes', icon: FileText, nav: 'Notes', bg: '#FEF3C7', color: '#D97706' },
    { id: 'room', name: 'Room Info', icon: HomeIcon, nav: 'RoomInfo', bg: '#E0E7FF', color: '#4F46E5' },
    { id: 'gatepass', name: 'Gate Pass', icon: QrCode, nav: 'GatePass', bg: '#E0F2FE', color: '#0EA5E9' },
    { id: 'splits', name: 'Splits', icon: Briefcase, nav: 'Splits', bg: '#FFE4E6', color: '#E11D48' },
    { id: 'visitor', name: 'Visitor Pass', icon: User2, nav: 'VisitorPass', bg: '#E0E7FF', color: '#4F46E5' },
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
                onPress={() => navigation.navigate("UIShowcase")}
              >
                <Layers size={22} color={WHITE} strokeWidth={2} />
              </TouchableOpacity>
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

        {/* ── Total Due Overview Card ──────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.overviewCard}>
            <View style={styles.overviewLeft}>
              <Text style={styles.overviewLabel}>
                {dueAmount > 0 ? "Total Due" : "Monthly Rent"}
              </Text>
              <Text style={[styles.overviewAmount, dueAmount === 0 && { color: "#22C55E" }]}>
                ₹ {dueAmount > 0 ? dueAmount.toLocaleString("en-IN") : (totalRentAmount || 5500).toLocaleString("en-IN")}
              </Text>
              {dueAmount > 0 ? (
                <Text style={styles.overviewDate}>
                  Due Date: {rentDueDate ? formatDate(rentDueDate) : "N/A"}
                </Text>
              ) : (
                <Text style={styles.overviewDate}>
                  Status: All clear this month!
                </Text>
              )}
              {dueAmount > 0 ? (
                <TouchableOpacity
                  style={styles.overviewBtn}
                  onPress={() => navigation.navigate("Payments")}
                >
                  <Text style={styles.overviewBtnText}>Pay Now</Text>
                  <ArrowRight size={16} color={WHITE} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.overviewBtn, { backgroundColor: "#DCFCE7" }]}>
                  <Check size={16} color="#22C55E" strokeWidth={3} />
                  <Text style={[styles.overviewBtnText, { color: "#22C55E" }]}>Paid</Text>
                </View>
              )}
            </View>
            <View style={styles.overviewRight}>
              <Image
                source={require("../../assets/wallet_3d.png")}
                style={styles.walletImg}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* ── Next Meal ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Next Meal</Text>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              onPress={() => navigation.navigate("FullMenu")}
            >
              <Text style={styles.viewAllText}>Full Menu</Text>
              <ArrowRight size={14} color="#A0522D" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {(() => {
            const activeMeal = meals[currentMealIdx];
            const isSkipped = skipped[activeMeal.key];
            const MealIcon = activeMeal.Icon;
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleNextMeal}
                style={[styles.nextMealCard, { backgroundColor: activeMeal.bg }, isSkipped && { opacity: 0.8, backgroundColor: "#F1F5F9" }]}
              >
                <View style={styles.nmHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                    <View style={[styles.menuIconWrap, { backgroundColor: isSkipped ? "#E2E8F0" : activeMeal.iconBg }]}>
                      <MealIcon size={24} color={isSkipped ? "#94A3B8" : activeMeal.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.menuTitle, isSkipped && { color: "#94A3B8", textDecorationLine: "line-through" }]}>
                        {activeMeal.title}
                      </Text>
                      <Text style={[styles.menuSub, isSkipped && { color: "#94A3B8" }]} numberOfLines={2}>{activeMeal.sub}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.skipTickBtn, 
                      isSkipped && { borderColor: activeMeal.color, backgroundColor: activeMeal.iconBg }
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleMessSkip(activeMeal.key);
                    }}
                    activeOpacity={0.7}
                  >
                    {isSkipped ? (
                      <Check size={18} color={activeMeal.color} strokeWidth={4} />
                    ) : (
                      <Check size={18} color="#D1D5DB" strokeWidth={3} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={[styles.nmFooter, isSkipped && { borderTopColor: "#E2E8F0" }]}>
                  <View style={styles.timeNav}>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); handlePrevMeal(); }} style={styles.arrowBtn}>
                      <ChevronLeft size={20} color={isSkipped ? "#94A3B8" : TEXT_DARK} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <Text style={[styles.timeNavText, isSkipped && { color: "#94A3B8" }]}>{activeMeal.time}</Text>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleNextMeal(); }} style={styles.arrowBtn}>
                      <ChevronRight size={20} color={isSkipped ? "#94A3B8" : TEXT_DARK} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>

                  {isSkipped && (
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); navigation.navigate("AddExpense", { defaultCategory: "Food" }); }}>
                      <Text style={styles.orderOutsideText}>Order outside instead?</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* ── Today's Message ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Message</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Notices")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.messageCard}
            onPress={() => navigation.navigate("Notices")}
          >
            <View style={styles.messageIconWrap}>
              <Mail size={20} color={WHITE} />
            </View>
            <View style={styles.messageContent}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Text style={styles.messageTitle} numberOfLines={1}>
                    {recentNotices[0]?.title || "Welcome!"}
                  </Text>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeTxt}>New</Text>
                  </View>
                </View>
                <Text style={styles.messageTime}>
                  {recentNotices[0]?.date ? formatTime(recentNotices[0].date) : "09:00 AM"}
                </Text>
              </View>
              <Text style={styles.messageBody} numberOfLines={2}>
                {recentNotices[0]?.body || "Welcome to the hostel app. Check here for daily updates."}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Shortcuts ────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shortcuts</Text>
          <View style={styles.shortcutGrid}>
            {shortcuts.map((sc) => {
              const ShortcutIcon = sc.icon;
              return (
                <TouchableOpacity key={sc.id} style={styles.shortcutItem} onPress={() => navigation.navigate(sc.nav)}>
                  <View style={[styles.shortcutIconBox, { backgroundColor: sc.bg }]}>
                    <ShortcutIcon size={22} color={sc.color} />
                  </View>
                  <Text style={styles.shortcutText}>{sc.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Recent Activity ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Expenses")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            {recentPayments.length > 0 ? (
              recentPayments.map((p, index) => (
                <View key={p.id} style={[styles.activityItem, index > 0 && { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 16 }]}>
                  <View style={[styles.activityIconWrap, { backgroundColor: "#DCFCE7" }]}>
                    <CheckCircle2 size={18} color="#22C55E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityTitle}>Payment received ({p.mode})</Text>
                    <Text style={styles.activityDate}>{formatDate(p.date)}</Text>
                  </View>
                  <Text style={[styles.activityAmount, { color: "#22C55E" }]}>₹ {p.amount}</Text>
                </View>
              ))
            ) : (
              <View style={{ paddingTop: 20 }}>
                <Phase3EmptyState variant="activity" />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  headerSection: { backgroundColor: BLUE, paddingBottom: 16 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 12,
  },
  hAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center", marginLeft: 12,
  },
  hAvatarText: { color: WHITE, fontWeight: "700", fontSize: 16 },
  headerGreeting: { fontSize: 18, fontWeight: "700", color: WHITE },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center" },
  hBtn: { padding: 8, position: "relative" },
  notificationDot: {
    position: "absolute", top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5, borderColor: BLUE,
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
  overviewLeft: { width: '60%' },
  overviewLabel: { fontSize: 14, color: TEXT_MID, fontWeight: "700", marginBottom: 6 },
  overviewAmount: { fontSize: 28, fontWeight: "900", color: "#E11D48", marginBottom: 6 },
  overviewDate: { fontSize: 13, color: TEXT_MID, marginBottom: 16, fontWeight: "700" },
  overviewBtn: {
    backgroundColor: BLUE, alignSelf: "flex-start",
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  overviewBtnText: { color: WHITE, fontSize: 13, fontWeight: "700" },
  overviewRight: { width: '40%', height: 110, justifyContent: "center", alignItems: "center" },
  walletImg: { width: 115, height: 115, position: "absolute", right: -5, bottom: -10 },

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
