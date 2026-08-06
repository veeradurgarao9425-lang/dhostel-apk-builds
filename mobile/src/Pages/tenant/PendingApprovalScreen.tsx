import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
  StatusBar,
  Dimensions,
  Animated,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  Bell,
  FileSignature,
  CheckCircle2,
  User2,
  Home as HomeIcon,
  MessageSquare,
  AlertCircle,
  FileText,
  Wallet,
  ChevronRight,
  TrendingUp,
  Clock,
  HelpCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../services/api';
import IconGlowBadge from '../../components/tenant/ui/IconGlowBadge';

const { width } = Dimensions.get("window");

const BLUE = "#2245D4";
const BLUE_DARK = "#1A35A8";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#1A1A1A";
const TEXT_MID = "#6B7280";
const PAGE_BG = "#F0F4FF";

export default function PendingApprovalScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const firstName = (user?.name || "Tenant").split(" ")[0];
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  // Fast auto-polling every 3 seconds so the redirect is nearly instant upon owner approval
  useEffect(() => {
    const interval = setInterval(() => {
      refreshUser();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshUser]);

  const helpShortcuts = [
    { id: 'features', name: 'How it works', icon: Sparkles, nav: 'HowItWorksScreen', bg: '#FEF3C7', color: '#D97706', gradient: ['#D97706', '#F59E0B'] as [string, string] },
    { id: 'documents', name: 'My\nDocuments', icon: FileText, nav: 'Documents', bg: '#EDE9FE', color: '#8B5CF6', gradient: ['#7C3AED', '#A78BFA'] as [string, string] },
    { id: 'help', name: 'Need help', icon: HelpCircle, nav: 'HelpScreen', bg: '#E0F2FE', color: '#0EA5E9', gradient: ['#0284C7', '#38BDF8'] as [string, string] },
    { id: 'security', name: 'Security\n& Policy', icon: ShieldCheck, nav: 'PrivacyPolicyScreen', bg: '#DCFCE7', color: '#22C55E', gradient: ['#16A34A', '#4ADE80'] as [string, string] },
  ];

  const [budget, setBudget] = useState(0);
  const [spent, setSpent] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOver = spent > budget && budget > 0;
  const remaining = budget - spent;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const budgetRes = await api.get("/tenant-expenses/budget");
          if (budgetRes.data?.success) setBudget(Number(budgetRes.data.data.amount));
        } catch { }
        try {
          const res = await api.get("/tenant-expenses");
          if (res.data?.success) {
            const now = new Date();
            const monthly = (res.data.data || []).filter((e: any) => {
              const d = new Date(e.date);
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            setSpent(monthly.reduce((s: number, e: any) => s + Number(e.amount), 0));
          }
        } catch { }
      };
      load();
    }, [])
  );

  const barColor = isOver ? "#EF4444" : percentage > 80 ? "#F59E0B" : "#22C55E";

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE_DARK} />

      {/* ── SafeAreaView: ONLY handles the top bar ── */}
      <SafeAreaView edges={["top"]} style={styles.safeHeader}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
            <Text style={styles.subLabel}>Application Status</Text>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => navigation?.navigate?.("Profile")}
          >
            <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Scrollable content area ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BLUE]} />
        }
      >

        {/* ── Budget Card ── */}
        <View>
          {budget === 0 ? (
            <TouchableOpacity style={styles.budgetCard} onPress={() => navigation?.navigate?.("Expenses")} activeOpacity={0.85}>
              <View style={styles.budgetCardInner}>
                <View style={styles.budgetIconWrap}>
                  <Wallet size={20} color={BLUE} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
                  <Text style={styles.state1Title}>Set Monthly Budget</Text>
                  <Text style={styles.state1Sub}>Track your personal spending this month</Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.budgetCard} onPress={() => navigation?.navigate?.("Expenses")} activeOpacity={0.85}>
              <View style={[styles.budgetCardInner, { alignItems: 'flex-start' }]}>
                <View style={styles.budgetIconWrap}>
                  <TrendingUp size={20} color={BLUE} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <Text style={styles.state2LabelLeft}>₹{spent.toLocaleString("en-IN")} of ₹{budget.toLocaleString("en-IN")} spent</Text>
                    <Text style={styles.state2LabelRight}>
                      {isOver ? "⚠️ Over" : `₹${remaining.toLocaleString("en-IN")} left`}
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <Animated.View
                      style={[
                        styles.barFill,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 100],
                            outputRange: ["0%", "100%"],
                          }),
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.state2Percent}>{Math.round(percentage)}%</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Illustration — enclosed in a white card to avoid background mixing ── */}
        <View style={[styles.card, styles.illustrationCard, styles.sectionGap]}>
          {/* Status pill — placed at top right corner */}
          <View style={styles.pillContent}>
            <View style={styles.pillDotContent} />
            <Text style={styles.pillTextContent}>Application Under Review</Text>
          </View>

          {/* 
          <Image
            source={require("../../../assets/house_hourglass_3d.png")}
            style={styles.heroImgLarge}
            resizeMode="contain"
          /> 
          */}
        </View>

        {/* Title & subtitle moved here */}
        <View style={styles.sectionGap}>
          <Text style={styles.title}>We're reviewing your application</Text>
          <Text style={styles.subtitle}>
            Your application is pending owner approval. Once approved and a room
            is assigned, you'll get full access.
          </Text>
        </View>

        {/* ── What happens next ── */}
        <View style={[styles.card, styles.sectionGap]}>
          <Text style={styles.cardTitle}>What happens next?</Text>
          <View style={styles.stepsRow}>
            {/* Step 1 — done */}
            <View style={styles.step}>
              <View style={[styles.stepCircle, { backgroundColor: BLUE }]}>
                <FileSignature size={18} color={WHITE} strokeWidth={2} />
              </View>
              <Text style={styles.stepLabel}>Application{"\n"}Submitted</Text>
              <View style={styles.stepDone}>
                <CheckCircle2 size={11} color="#22C55E" strokeWidth={2.5} />
              </View>
            </View>

            <View style={styles.connector} />

            {/* Step 2 — active */}
            <View style={styles.step}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                <User2 size={18} color={WHITE} strokeWidth={2} />
              </View>
              <Text style={[styles.stepLabel, { color: BLUE, fontWeight: "700" }]}>
                Owner{"\n"}Review
              </Text>
              <View style={styles.stepActive}>
                <Clock size={10} color={BLUE} strokeWidth={2.5} />
              </View>
            </View>

            <View style={[styles.connector, { borderColor: "#CBD5E1" }]} />

            {/* Step 3 — pending */}
            <View style={styles.step}>
              <View style={[styles.stepCircle, { backgroundColor: "#EEF2FF" }]}>
                <HomeIcon size={18} color="#94A3B8" strokeWidth={2} />
              </View>
              <Text style={[styles.stepLabel, { color: "#94A3B8" }]}>
                Room{"\n"}Assigned
              </Text>
              <View style={styles.stepPending} />
            </View>
          </View>
        </View>

        {/* ── Notification Banner ── */}
        <View style={[styles.notifBanner, styles.sectionGap]}>
          <View style={styles.notifIcon}>
            <Bell size={16} color="#D97706" strokeWidth={2} />
          </View>
          <Text style={styles.notifText}>
            You'll receive a notification as soon as your application is
            approved.
          </Text>
        </View>

        {/* ── Help & Security Shortcuts ── */}
        <View style={[styles.sectionGap, { marginTop: 32 }]}>
          <Text style={styles.sectionTitle}>Explore & Resources</Text>
          <View style={styles.shortcutGrid}>
            {helpShortcuts.map((sc) => (
              <TouchableOpacity key={sc.id} style={styles.shortcutItem} onPress={() => navigation?.navigate?.(sc.nav)}>
                <IconGlowBadge
                  Icon={sc.icon}
                  gradient={sc.gradient}
                  glowColor={sc.color}
                  flatColor={sc.color}
                  flatBg={sc.bg}
                  size="sm"
                  entrance
                  style={{ marginBottom: 8 }}
                />
                <Text style={styles.shortcutText}>{sc.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Fixed Bottom Tab Bar (Only Home and Expenses) ── */}
      <View
        style={[
          styles.bottomTabBar,
          { paddingBottom: Math.max(insets.bottom, 8) }
        ]}
      >
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.8}
          // Do nothing on tap because we are already on the PendingApproval "Home"
          onPress={() => { }}
        >
          <View style={[styles.iconWrap, styles.iconWrapActive]}>
            <HomeIcon size={24} color={BLUE} strokeWidth={2.5} />
          </View>
          <Text style={[styles.tabLabel, styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => navigation?.navigate?.("Expenses")}
        >
          <View style={styles.iconWrap}>
            <TrendingUp size={24} color={TEXT_MID} strokeWidth={2} />
          </View>
          <Text style={styles.tabLabel}>Expenses</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CARD_SHADOW = {
  elevation: 3,
  shadowColor: "#1A35A8",
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },

  // ── SafeAreaView — top bar only ───────────────────────
  safeHeader: { backgroundColor: BLUE },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  greeting: { fontSize: 18, fontWeight: "800", color: WHITE },
  subLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: WHITE, fontWeight: "700", fontSize: 15 },

  // Illustration inside white card
  illustrationCard: {
    alignItems: "center",
    paddingVertical: 24,
  },
  heroImgLarge: { width: 220, height: 195 },

  // ── Scroll area ──────────────────────────────────────────────
  sheet: { flex: 1 },
  sheetContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 120, // increased to ensure content is not hidden behind the absolute tab bar
  },

  // Pill content style
  pillContent: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  pillDotContent: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#16A34A" },
  pillTextContent: { fontSize: 10, fontWeight: "700", color: "#16A34A" },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT_DARK,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_MID,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  sectionGap: { marginTop: 16 },

  // ── Shared card ──────────────────────────────────────────────
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    ...CARD_SHADOW,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: BLUE_DARK,
    textAlign: "center",
    marginBottom: 16,
  },

  // ── Budget ───────────────────────────────────────────────────
  budgetCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0', // subtle 1px border as requested
  },
  budgetCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  state1Title: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  state1Sub: { fontSize: 12, color: TEXT_MID, marginTop: 2 },

  state2LabelLeft: { fontSize: 13, fontWeight: '800', color: TEXT_DARK },
  state2LabelRight: { fontSize: 12, fontWeight: '600', color: TEXT_MID },
  barTrack: {
    height: 8, backgroundColor: '#F1F5F9', // light neutral gray
    borderRadius: 4, overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: { height: '100%', borderRadius: 4 },
  state2Percent: { fontSize: 11, fontWeight: '600', color: '#94A3B8', textAlign: 'right' },

  // ── Stepper ──────────────────────────────────────────────────
  stepsRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center" },
  step: { alignItems: "center", width: 80 },
  stepCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: BLUE,
    borderWidth: 2, borderColor: "#BFDBFE",
    // optical compensation: border doesn't change outer size because we account for it
  },
  stepLabel: {
    fontSize: 10, color: "#64748B", textAlign: "center",
    fontWeight: "600", lineHeight: 14,
  },
  stepDone: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#DCFCE7",
    alignItems: "center", justifyContent: "center", marginTop: 6,
  },
  stepActive: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#EEF2FF", borderWidth: 2, borderColor: "#93C5FD",
    alignItems: "center", justifyContent: "center", marginTop: 6,
  },
  stepPending: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: "#CBD5E1", marginTop: 6,
  },
  // connector centers on circle: marginTop = circleHeight/2 = 44/2 = 22
  connector: {
    flex: 1, height: 0,
    borderTopWidth: 1.5, borderColor: BLUE,
    borderStyle: "dashed",
    marginTop: 22, marginHorizontal: 2,
  },

  // ── Notification ─────────────────────────────────────────────
  notifBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: 16, borderWidth: 1, borderColor: "#FDE68A",
    padding: 14,
    ...CARD_SHADOW,
    shadowColor: "#D97706",
    shadowOpacity: 0.1,
  },
  notifIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center",
  },
  notifText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },

  // ── Shortcuts UI ─────────────────────────────────────────────────────
  sectionTitle: { fontSize: 16, fontWeight: "700", color: TEXT_DARK, marginBottom: 16 },
  shortcutGrid: { flexDirection: "row", flexWrap: "wrap", gap: 24, justifyContent: "flex-start", paddingHorizontal: 4 },
  shortcutItem: { alignItems: "center", width: 70, marginBottom: 12 },
  shortcutText: { fontSize: 11, color: TEXT_DARK, fontWeight: "600", textAlign: "center", lineHeight: 14 },

  // ── Fixed Bottom Tab Bar ───────────────────────────────────────────
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    minHeight: 64,
    // Add shadow so it looks elevated above the scroll content
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    minHeight: 56,
  },
  iconWrap: {
    width: 52,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#EEF2FF', // primarySoft
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
    color: TEXT_MID,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '800',
    color: BLUE, // primary
  },
});
