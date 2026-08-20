import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, ChevronLeft, Lock, Trash2, Camera, Bell, FileText } from 'lucide-react-native';

const BLUE = '#2245D4';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID = '#666666';
const BORDER = '#E2E8F0';
const BG = '#F8FAFC';

export default function PrivacyPolicyScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={28} color={WHITE} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Privacy & Data Policy</Text>
          <Text style={styles.headerSub}>Hostix Security & Safety</Text>
        </View>
        <View style={styles.rightBtn} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={36} color={BLUE} strokeWidth={2} />
          </View>
        </View>

        <Text style={styles.title}>Privacy Policy & Data Safety</Text>
        <Text style={styles.lastUpdated}>Package: com.durgarao2.hostixmobile • Last updated: August 2026</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Personal & Tenancy Data Collection</Text>
          <Text style={styles.paragraph}>
            We collect personal information including your full name, phone number, emergency contacts, room allocation details, and KYC identity verification solely to administer your hostel stay and ensure resident safety.
          </Text>

          <Text style={styles.sectionTitle}>2. Device Permissions & Usage</Text>
          <Text style={styles.paragraph}>
            • <Text style={{ fontWeight: '700', color: TEXT_DARK }}>Camera & Storage:</Text> For KYC document verification, profile pictures, and maintenance complaint photos.{"\n"}
            • <Text style={{ fontWeight: '700', color: TEXT_DARK }}>Notifications:</Text> To deliver dues reminders, gate pass status, and notice board bulletins.{"\n"}
            • <Text style={{ fontWeight: '700', color: TEXT_DARK }}>Internet:</Text> Secure real-time synchronization with Hostix servers.
          </Text>

          <Text style={styles.sectionTitle}>3. Financial Records & Rent</Text>
          <Text style={styles.paragraph}>
            We track monthly rent payments, receipts, and dues balances. No raw credit/debit card numbers or netbanking passwords are saved on Hostix systems.
          </Text>

          <Text style={styles.sectionTitle}>4. Security Measures</Text>
          <Text style={styles.paragraph}>
            All network communication is secured with 256-bit TLS/SSL encryption. Account passwords are encrypted using industry-standard bcrypt hashing. We never sell your personal records to third parties.
          </Text>

          <Text style={styles.sectionTitle}>5. Account & Data Deletion</Text>
          <Text style={styles.paragraph}>
            You have the right to request permanent deletion of your account and personal records. You can request deletion directly in Settings or by contacting support@hostix.app / privacy@hostix.app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BLUE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: BLUE,
  },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { color: WHITE, fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  backBtn: { padding: 8 },
  rightBtn: { padding: 8, width: 40 },
  
  content: { flex: 1, backgroundColor: BG },
  contentContainer: { padding: 20, paddingBottom: 60 },
  iconContainer: { alignItems: 'center', marginVertical: 20 },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: TEXT_DARK, textAlign: 'center', marginBottom: 4 },
  lastUpdated: { fontSize: 12, color: TEXT_MID, textAlign: 'center', marginBottom: 20 },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 14.5, fontWeight: '700', color: TEXT_DARK, marginBottom: 6, marginTop: 14 },
  paragraph: { fontSize: 13.5, color: TEXT_MID, lineHeight: 21 },
});
