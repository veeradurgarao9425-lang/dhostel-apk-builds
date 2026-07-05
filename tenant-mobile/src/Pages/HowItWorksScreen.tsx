import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CreditCard, Utensils, BellRing, MessageSquareWarning, PieChart } from 'lucide-react-native';
import IconGlowBadge from '../components/ui/IconGlowBadge';

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
      desc: 'Set monthly budgets, track spending, view due splits, and easily categorize transactions.',
      icon: PieChart,
      color: '#3B82F6',
      bg: '#DBEAFE',
      gradient: ['#2563EB', '#60A5FA'] as [string, string],
    },
    {
      id: 2,
      title: 'Digital Payments',
      desc: 'Pay your monthly rent and dues instantly right from your phone. No more cash hassles.',
      icon: CreditCard,
      color: '#10B981',
      bg: '#D1FAE5',
      gradient: ['#059669', '#34D399'] as [string, string],
    },
    {
      id: 3,
      title: 'Smart Meal Tracking',
      desc: 'Skip a meal with one tap in the app to notify the kitchen and save on your food expenses.',
      icon: Utensils,
      color: '#F59E0B',
      bg: '#FEF3C7',
      gradient: ['#D97706', '#FBBF24'] as [string, string],
    },
    {
      id: 4,
      title: 'Instant Complaints',
      desc: 'Raise maintenance issues directly. Management will be notified instantly for quick resolution.',
      icon: MessageSquareWarning,
      color: '#EF4444',
      bg: '#FEE2E2',
      gradient: ['#DC2626', '#F87171'] as [string, string],
    },
    {
      id: 5,
      title: 'Live Notifications',
      desc: 'Receive real-time alerts for hostel notices, payment receipts, and manager approvals.',
      icon: BellRing,
      color: '#8B5CF6',
      bg: '#EDE9FE',
      gradient: ['#7C3AED', '#A78BFA'] as [string, string],
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
                source={require('../../assets/HostixNew.jpeg')} 
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
