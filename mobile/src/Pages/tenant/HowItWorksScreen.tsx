import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CreditCard, Utensils, BellRing, MessageSquareWarning, PieChart, Users, FileText, QrCode, BedDouble, Star } from 'lucide-react-native';
import IconGlowBadge from '../../components/tenant/ui/IconGlowBadge';

const BLUE = '#2245D4';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID = '#666666';
const BORDER = '#E2E8F0';
const BG = '#F8FAFC';

export default function HowItWorksScreen({ navigation }: any) {
  const allFeatures = [
    {
      id: 1,
      title: 'Expense Management',
      desc: 'Track your personal spending, view categorized charts, and manage your monthly budget.',
      icon: PieChart,
      color: '#3B82F6', bg: '#DBEAFE', gradient: ['#2563EB', '#60A5FA'] as [string, string],
    },
    {
      id: 2,
      title: 'Bill Splits',
      desc: 'Easily split bills and shared expenses with your roommates and friends in the hostel.',
      icon: Users,
      color: '#8B5CF6', bg: '#EDE9FE', gradient: ['#7C3AED', '#A78BFA'] as [string, string],
    },
    {
      id: 3,
      title: 'Rent & Payments',
      desc: 'Check your pending dues, monthly rent, and view your complete digital payment history.',
      icon: CreditCard,
      color: '#10B981', bg: '#D1FAE5', gradient: ['#059669', '#34D399'] as [string, string],
    },
    {
      id: 4,
      title: 'Mess Menu & Skip Meals',
      desc: 'Check the daily food menu and skip meals in advance to notify the kitchen and save on food bills.',
      icon: Utensils,
      color: '#F59E0B', bg: '#FEF3C7', gradient: ['#D97706', '#FBBF24'] as [string, string],
    },
    {
      id: 5,
      title: 'Gate Pass & Visitors',
      desc: 'Apply for digital gate passes for night outs and pre-register your visitors for easy entry.',
      icon: QrCode,
      color: '#EC4899', bg: '#FCE7F3', gradient: ['#DB2777', '#F472B6'] as [string, string],
    },
    {
      id: 6,
      title: 'Instant Complaints',
      desc: 'Raise maintenance issues instantly. The management is notified directly for quick resolution.',
      icon: MessageSquareWarning,
      color: '#EF4444', bg: '#FEE2E2', gradient: ['#DC2626', '#F87171'] as [string, string],
    },
    {
      id: 7,
      title: 'Hostel Notices',
      desc: 'Receive real-time push notifications for important announcements and circulars from the admin.',
      icon: BellRing,
      color: '#0EA5E9', bg: '#E0F2FE', gradient: ['#0284C7', '#38BDF8'] as [string, string],
    },
    {
      id: 8,
      title: 'Room Info',
      desc: 'View your room details, bed assignments, and connect with your roommates.',
      icon: BedDouble,
      color: '#6366F1', bg: '#E0E7FF', gradient: ['#4F46E5', '#818CF8'] as [string, string],
    },
    {
      id: 9,
      title: 'Document KYC',
      desc: 'Securely upload and manage your ID proofs and important verification documents.',
      icon: FileText,
      color: '#14B8A6', bg: '#CCFBF1', gradient: ['#0D9488', '#2DD4BF'] as [string, string],
    },
    {
      id: 10,
      title: 'Hostel Ratings',
      desc: 'Provide feedback and rate the hostel facilities to help improve the living experience.',
      icon: Star,
      color: '#EAB308', bg: '#FEF9C3', gradient: ['#CA8A04', '#FACC15'] as [string, string],
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={28} color={WHITE} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>How It Works</Text>
          <Text style={styles.headerSub}>Explore App Features</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {/* ── Intro Section ── */}
        <View style={styles.introBox}>
          <View style={styles.introContent}>
            <View style={styles.logoWrap}>
              <Image 
                source={require('../../../assets/HostixNew.png')} 
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.introTextCol}>
              <Text style={styles.introTitle}>Welcome to Hostix!</Text>
              <Text style={styles.introDesc}>
                Your digital companion for a hassle-free hostel experience.
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>App Features</Text>

        {/* ── Extremely Compact List ── */}
        <View style={styles.featureList}>
          {allFeatures.map((item) => (
            <View key={item.id} style={styles.featureCard}>
              <View style={styles.iconCol}>
                <IconGlowBadge
                  Icon={item.icon}
                  gradient={item.gradient}
                  glowColor={item.color}
                  flatColor={item.color}
                  flatBg={item.bg}
                  size="sm" // smaller badge
                  entrance
                />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BLUE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 12, backgroundColor: BLUE,
  },
  headerTitleWrap: { alignItems: 'flex-start', marginLeft: 8 },
  headerTitle: { color: WHITE, fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  backBtn: { padding: 8 },
  
  content: { flex: 1, backgroundColor: BG },
  contentContainer: { padding: 16, paddingTop: 20, paddingBottom: 60 },

  // Intro (Compact Row)
  introBox: {
    backgroundColor: WHITE,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  introContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrap: {
    width: 48, height: 48,
    borderRadius: 12,
    backgroundColor: WHITE,
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  logoImg: { width: '100%', height: '100%' },
  introTextCol: { flex: 1 },
  introTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK, marginBottom: 4 },
  introDesc: { fontSize: 13, color: TEXT_MID, lineHeight: 18 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: TEXT_DARK, marginBottom: 12, marginLeft: 4 },

  // Feature List (Compact)
  featureList: { gap: 10 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    padding: 12, // reduced padding
    borderRadius: 12, // softer radius
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconCol: {
    marginRight: 12, // closer to text
  },
  textCol: {
    flex: 1,
  },
  featureTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 }, // smaller text
  featureDesc: { fontSize: 12, color: TEXT_MID, lineHeight: 16 }, // tighter line height

  bottomSpacer: { height: 40 },
});
