import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StatusBar,
  Dimensions,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  FileSignature,
  CheckCircle2,
  User2,
  Home as HomeIcon,
  FileText,
  ChevronRight,
  Clock,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  XCircle,
  RefreshCw,
} from "lucide-react-native";
import { useAuth } from '../../../contexts/AuthContext';
import IconGlowBadge from '../../components/tenant/ui/IconGlowBadge';
import { TenantHeaderNotification } from '../../components/tenant/TenantHeaderNotification';

const { width } = Dimensions.get("window");

const BRAND = "#4F46E5";
const BRAND_DARK = "#3730A3";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#0F172A";
const TEXT_MID = "#64748B";
const PAGE_BG = "#F8FAFC";

export default function PendingApprovalScreen({ navigation }: any) {
  const { user, refreshUser, disconnectHostel } = useAuth();
  const insets = useSafeAreaInsets();
  const firstName = (user?.name || "Tenant").split(" ")[0];
  const [refreshing, setRefreshing] = useState(false);
  const isRejected = Number(user?.status) === 4;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  const handleRegisterAgain = async () => {
    try {
      await disconnectHostel();
      navigation?.reset({
        index: 0,
        routes: [{ name: 'RoleSelect' }],
      });
    } catch (e) {
      console.error('Failed to reset registration', e);
    }
  };

  const helpShortcuts = [
    { id: 'features', name: 'How it works', icon: Sparkles, nav: 'HowItWorksScreen', bg: '#FEF3C7', color: '#D97706', gradient: ['#D97706', '#F59E0B'] as [string, string] },
    { id: 'documents', name: 'My\nDocuments', icon: FileText, nav: 'Documents', bg: '#EDE9FE', color: '#8B5CF6', gradient: ['#7C3AED', '#A78BFA'] as [string, string] },
    { id: 'help', name: 'Need help', icon: HelpCircle, nav: 'HelpScreen', bg: '#E0F2FE', color: '#0EA5E9', gradient: ['#0284C7', '#38BDF8'] as [string, string] },
    { id: 'security', name: 'Security\n& Policy', icon: ShieldCheck, nav: 'PrivacyPolicyScreen', bg: '#DCFCE7', color: '#22C55E', gradient: ['#16A34A', '#4ADE80'] as [string, string] },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_DARK} />

      {/* ── Top Header ── */}
      <SafeAreaView edges={["top"]} style={styles.safeHeader}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
            <Text style={styles.subLabel}>Application Status</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TenantHeaderNotification navigation={navigation} />
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => navigation?.navigate?.("Profile")}
            >
              <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Scrollable content area ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND]} />
        }
      >
        {/* ── Illustration / Status Pill ── */}
        <View style={[styles.card, styles.illustrationCard]}>
          <View style={[styles.pillContent, isRejected && { backgroundColor: '#FEE2E2' }]}>
            <View style={[styles.pillDotContent, isRejected && { backgroundColor: '#DC2626' }]} />
            <Text style={[styles.pillTextContent, isRejected && { color: '#DC2626' }]}>
              {isRejected ? 'Application Not Approved' : 'Application Under Review'}
            </Text>
          </View>
          <Image
            source={require('../../../assets/house_hourglass_3d.jpg')}
            style={styles.buildingImage}
            resizeMode="contain"
          />
        </View>

        {/* Title & subtitle */}
        <View style={styles.sectionGap}>
          <Text style={[styles.title, isRejected && { color: '#B91C1C' }]}>
            {isRejected ? "Registration Not Approved" : "We're reviewing your application"}
          </Text>
          <Text style={styles.subtitle}>
            {isRejected
              ? "Your application was not approved by the hostel owner. You can register again with updated details or connect with another hostel."
              : "Your application is pending owner approval. Once approved and a room is assigned, you'll get full access."}
          </Text>
        </View>

        {/* Re-apply CTA Button if rejected */}
        {isRejected && (
          <TouchableOpacity
            style={styles.reapplyBtn}
            onPress={handleRegisterAgain}
            activeOpacity={0.85}
          >
            <RefreshCw size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.reapplyBtnText}>Register Again / Connect Hostel</Text>
          </TouchableOpacity>
        )}

        {/* ── Timeline / What happens next ── */}
        <View style={[styles.card, styles.sectionGap]}>
          <Text style={styles.cardTitle}>{isRejected ? "Application Timeline" : "What happens next?"}</Text>
          <View style={styles.stepsRow}>
            {/* Step 1 — done */}
            <View style={styles.step}>
              <View style={[styles.stepCircle, { backgroundColor: BRAND }]}>
                <FileSignature size={18} color={WHITE} strokeWidth={2} />
              </View>
              <Text style={styles.stepLabel}>Application{"\n"}Submitted</Text>
              <View style={styles.stepDone}>
                <CheckCircle2 size={11} color="#22C55E" strokeWidth={2.5} />
              </View>
            </View>

            <View style={styles.connector} />

            {/* Step 2 — active/rejected */}
            <View style={styles.step}>
              <View style={[styles.stepCircle, isRejected ? { backgroundColor: '#EF4444' } : styles.stepCircleActive]}>
                <User2 size={18} color={WHITE} strokeWidth={2} />
              </View>
              <Text style={[styles.stepLabel, { color: isRejected ? '#DC2626' : BRAND, fontWeight: "700" }]}>
                {isRejected ? "Owner\nRejected" : "Owner\nReview"}
              </Text>
              <View style={[styles.stepActive, isRejected && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                {isRejected ? (
                  <XCircle size={10} color="#DC2626" strokeWidth={2.5} />
                ) : (
                  <Clock size={10} color={BRAND} strokeWidth={2.5} />
                )}
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
        <View style={[styles.notifBanner, styles.sectionGap, isRejected && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <View style={[styles.notifIcon, isRejected && { backgroundColor: '#FEE2E2' }]}>
            {isRejected ? (
              <XCircle size={16} color="#DC2626" strokeWidth={2} />
            ) : (
              <Bell size={16} color="#D97706" strokeWidth={2} />
            )}
          </View>
          <Text style={[styles.notifText, isRejected && { color: '#991B1B' }]}>
            {isRejected
              ? "If you believe this was a mistake, please reach out to the hostel owner or tap the button above to start a fresh registration."
              : "You'll receive a notification as soon as your application is approved."}
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

      {/* ── Fixed Bottom Tab Bar (Home & Growth Journey) ── */}
      <SafeAreaView edges={['bottom']} style={styles.bottomTabBarWrap}>
        <View style={styles.bottomTabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            activeOpacity={0.8}
            onPress={() => { }}
          >
            <View style={[styles.iconWrap, styles.iconWrapActive]}>
              <HomeIcon size={22} color={BRAND} strokeWidth={2.5} />
            </View>
            <Text style={[styles.tabLabel, styles.tabLabelActive]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate?.("GrowthHome")}
          >
            <View style={styles.iconWrap}>
              <Sparkles size={22} color={TEXT_MID} strokeWidth={2} />
            </View>
            <Text style={styles.tabLabel}>Growth</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const CARD_SHADOW = {
  elevation: 3,
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },

  safeHeader: { backgroundColor: BRAND },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  greeting: { fontSize: 18, fontWeight: "800", color: WHITE },
  subLabel: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: WHITE, fontWeight: "700", fontSize: 15 },

  illustrationCard: {
    alignItems: "center",
    paddingVertical: 20,
  },
  buildingImage: {
    width: 170,
    height: 145,
    marginTop: 20,
    marginBottom: 6,
  },

  sheet: { flex: 1 },
  sheetContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

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

  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...CARD_SHADOW,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: BRAND,
    textAlign: "center",
    marginBottom: 16,
  },

  // ── Budget ───────────────────────────────────────────────────
  budgetCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...CARD_SHADOW,
  },
  budgetCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  state1Title: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  state1Sub: { fontSize: 12, color: TEXT_MID, marginTop: 2 },

  state2LabelLeft: { fontSize: 13, fontWeight: '800', color: TEXT_DARK },
  state2LabelRight: { fontSize: 12, fontWeight: '600', color: TEXT_MID },
  barTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
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
    backgroundColor: BRAND,
    borderWidth: 2, borderColor: "#C7D2FE",
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
    backgroundColor: "#EEF2FF", borderWidth: 2, borderColor: "#A5B4FC",
    alignItems: "center", justifyContent: "center", marginTop: 6,
  },
  stepPending: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: "#CBD5E1", marginTop: 6,
  },
  connector: {
    flex: 1, height: 0,
    borderTopWidth: 1.5, borderColor: BRAND,
    borderStyle: "dashed",
    marginTop: 22, marginHorizontal: 2,
  },

  // ── Re-apply Button ──────────────────────────────────────────
  reapplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 16,
    ...CARD_SHADOW,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.25,
  },
  reapplyBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '700',
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
  bottomTabBarWrap: {
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  bottomTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 56,
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
    backgroundColor: '#EEF2FF',
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
    color: TEXT_MID,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '800',
    color: BRAND,
  },
});
