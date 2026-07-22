import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, ChevronLeft } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

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
          <Text style={styles.headerTitle}>Security & Policy</Text>
          <Text style={styles.headerSub}>Terms of Service</Text>
        </View>
        {/* Placeholder to balance the back button exactly */}
        <View style={styles.rightBtn} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={36} color={BLUE} strokeWidth={2} />
          </View>
        </View>

        <Text style={styles.title}>Privacy & Security Policy</Text>
        <Text style={styles.lastUpdated}>Last updated: July 2026</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Data Collection</Text>
          <Text style={styles.paragraph}>
            We collect personal information such as your name, contact details, and identification documents solely for the purpose of managing your hostel accommodation and ensuring the safety of all residents.
          </Text>

          <Text style={styles.sectionTitle}>2. How We Use Your Data</Text>
          <Text style={styles.paragraph}>
            Your data is used to process rent payments, manage room allocations, and facilitate communication between you and the hostel management. We do not sell your personal data to third parties.
          </Text>

          <Text style={styles.sectionTitle}>3. Security Measures</Text>
          <Text style={styles.paragraph}>
            We implement industry-standard security measures to protect your personal information from unauthorized access, disclosure, or alteration. All digital payments and sensitive data are encrypted.
          </Text>

          <Text style={styles.sectionTitle}>4. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to request access to your personal data, ask for corrections, or request deletion of your account once your tenancy agreement has concluded and all dues are cleared.
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
  rightBtn: { padding: 8, width: 40 }, // matches backBtn size (24 + 16)
  
  content: { flex: 1, backgroundColor: BG },
  contentContainer: { padding: 20, paddingBottom: 60 },
  iconContainer: { alignItems: 'center', marginVertical: 24 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: TEXT_DARK, textAlign: 'center', marginBottom: 4 },
  lastUpdated: { fontSize: 13, color: TEXT_MID, textAlign: 'center', marginBottom: 24 },
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
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 8, marginTop: 16 },
  paragraph: { fontSize: 14, color: TEXT_MID, lineHeight: 22 },
});
