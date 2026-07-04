import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bell,
  FileSignature,
  CheckCircle2,
  User2,
  Home as HomeIcon,
  MessageSquare,
  AlertCircle,
  FileText,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");

const BLUE = "#2245D4";
const WHITE = "#FFFFFF";
const TEXT_DARK = "#1A1A1A";
const TEXT_MID = "#666666";

export default function PendingApprovalScreen({ navigation }: any) {
  const { user } = useAuth();
  const firstName = (user?.name || "Tenant").split(" ")[0];

  return (
    <View style={{ flex: 1, backgroundColor: WHITE }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Blue Header */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: BLUE }}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: WHITE }}>
            Hi, {firstName} 👋
          </Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
            Application Status
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Application Status Badge */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, marginBottom: 16 }}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Application Under Review</Text>
          </View>
        </View>

        {/* 3D House Illustration */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Image
            source={require("../../assets/house_hourglass_3d.png")}
            style={{ width: 240, height: 200 }}
            resizeMode="contain"
          />
        </View>

        {/* Title & Description */}
        <View style={{ alignItems: "center", paddingHorizontal: 32, marginBottom: 24 }}>
          <Text style={styles.title}>We're reviewing your application</Text>
          <Text style={styles.subtitle}>
            Your application is currently pending owner approval. Once it's approved and a room is assigned, you'll get full access to all features.
          </Text>
        </View>

        {/* What happens next? Steps */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>What happens next?</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "center" }}>
            {/* Step 1 */}
            <View style={styles.step}>
              <View style={[styles.stepCircle, { backgroundColor: BLUE }]}>
                <FileSignature size={22} color={WHITE} strokeWidth={2} />
              </View>
              <Text style={styles.stepLabel}>Application{"\n"}Submitted</Text>
              <View style={[styles.stepBadge, { backgroundColor: "#DCFCE7" }]}>
                <CheckCircle2 size={13} color="#22C55E" strokeWidth={2.5} />
              </View>
            </View>

            {/* Connector 1 */}
            <View style={styles.connector} />

            {/* Step 2 - ACTIVE */}
            <View style={styles.step}>
              <View style={[styles.stepCircle, { backgroundColor: BLUE, borderWidth: 3, borderColor: "#BFDBFE" }]}>
                <User2 size={22} color={WHITE} strokeWidth={2} />
              </View>
              <Text style={[styles.stepLabel, { color: TEXT_DARK, fontWeight: "700" }]}>
                Under Owner{"\n"}Review
              </Text>
              <View style={[styles.stepBadge, { backgroundColor: "#EFF6FF", borderWidth: 1.5, borderColor: "#93C5FD" }]}>
                <Text style={{ fontSize: 9, color: BLUE, fontWeight: "800" }}>•••</Text>
              </View>
            </View>

            {/* Connector 2 */}
            <View style={[styles.connector, { borderColor: "#CBD5E1" }]} />

            {/* Step 3 - PENDING */}
            <View style={styles.step}>
              <View style={[styles.stepCircle, { backgroundColor: "#F1F5F9" }]}>
                <HomeIcon size={22} color="#94A3B8" strokeWidth={2} />
              </View>
              <Text style={[styles.stepLabel, { color: "#94A3B8" }]}>
                Room Assigned{"\n"}& Access Granted
              </Text>
              <View style={[styles.stepBadge, { borderWidth: 2, borderColor: "#CBD5E1" }]} />
            </View>
          </View>
        </View>

        {/* Notification Banner */}
        <View style={styles.notifBanner}>
          <View style={styles.notifIcon}>
            <Bell size={18} color="#D97706" strokeWidth={2} />
          </View>
          <Text style={styles.notifText}>
            You'll get a notification once your application is approved.
          </Text>
        </View>

        {/* While you wait */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={styles.waitTitle}>While you wait...</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {[
              { icon: FileText, label: "Learn\nHow it Works", bg: "#EFF6FF", color: "#2563EB" },
              { icon: MessageSquare, label: "Contact\nSupport", bg: "#F0FDF4", color: "#16A34A" },
              { icon: FileSignature, label: "Privacy &\nPolicy", bg: "#FDF4FF", color: "#9333EA" },
              { icon: AlertCircle, label: "Need\nHelp?", bg: "#FFF7ED", color: "#EA580C" },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.waitItem} activeOpacity={0.7}>
                <View style={[styles.waitIcon, { backgroundColor: item.bg }]}>
                  <item.icon size={22} color={item.color} strokeWidth={2} />
                </View>
                <Text style={styles.waitLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#DCFCE7", paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start",
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#16A34A" },
  title: {
    fontSize: 22, fontWeight: "800", color: TEXT_DARK,
    textAlign: "center", marginBottom: 10,
  },
  subtitle: { fontSize: 14, color: TEXT_MID, textAlign: "center", lineHeight: 22 },
  stepsCard: {
    marginHorizontal: 20, backgroundColor: "#FAFBFF",
    borderRadius: 18, borderWidth: 1, borderColor: "#E8EDF8",
    padding: 20, marginBottom: 16,
  },
  stepsTitle: {
    fontSize: 15, fontWeight: "700", color: "#1E3A8A",
    textAlign: "center", marginBottom: 20,
  },
  step: { alignItems: "center", width: 90 },
  stepCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  stepLabel: { fontSize: 11, color: "#475569", textAlign: "center", fontWeight: "600" },
  stepBadge: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center", marginTop: 6,
  },
  connector: {
    flex: 1, height: 2, borderWidth: 1,
    borderColor: "#2245D4", borderStyle: "dashed",
    marginTop: 24, marginHorizontal: 4,
  },
  notifBanner: {
    marginHorizontal: 20, backgroundColor: "#FFFBEB",
    borderRadius: 14, borderWidth: 1, borderColor: "#FDE68A",
    padding: 14, flexDirection: "row", alignItems: "center",
    gap: 12, marginBottom: 28,
  },
  notifIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center",
  },
  notifText: { flex: 1, fontSize: 13, color: "#92400E", fontWeight: "600", lineHeight: 20 },
  waitTitle: { fontSize: 15, fontWeight: "700", color: TEXT_DARK, marginBottom: 16 },
  waitItem: { alignItems: "center", width: "23%" },
  waitIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  waitLabel: { fontSize: 10, color: TEXT_MID, textAlign: "center", fontWeight: "600", lineHeight: 14 },
});
