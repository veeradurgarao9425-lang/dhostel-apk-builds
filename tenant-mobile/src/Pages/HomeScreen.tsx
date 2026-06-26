import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  Bell,
  AlignLeft,
  ChevronRight,
  Sun, Moon, Utensils,
  FileText, PieChart, Megaphone, Users, MoreHorizontal, Wallet, MapPin, Wrench
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, shadow } from '../theme';
import { sampleNotifications } from '../data/tenantContent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Quick Access config ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: FileText,       label: 'Due',       screen: 'Dues',       iconBg: '#FEE2E2', iconColor: '#EF4444' },
  { icon: PieChart,       label: 'Expenses',  screen: 'Expenses',   iconBg: '#DCFCE7', iconColor: '#16A34A' },
  { icon: Megaphone,      label: 'Notices',   screen: 'Notices',    iconBg: '#EFF6FF', iconColor: '#3B82F6' },
  { icon: Wrench,         label: 'Complaints',screen: 'Complaints', iconBg: '#FEF3C7', iconColor: '#F59E0B' },
  { icon: MoreHorizontal, label: 'More',      screen: 'More',       iconBg: colors.primarySoft, iconColor: colors.primary },
];

export default function HomeScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  const unread = sampleNotifications.filter((n) => !n.read).length;
  const initials = (user?.name || 'A').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const dueAmount = Number(user?.outstanding_due || 8450);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Top Header Bar ────────────────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('More')}>
            <AlignLeft size={22} color="#7B3A2A" />
          </TouchableOpacity>
          <View style={styles.greetingBox}>
            <Text style={styles.greetingText}>Good Morning,</Text>
            <Text style={styles.nameText}>{user?.name || 'Aarav Mehta'}</Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Messages')}>
            <Bell size={20} color="#7B3A2A" fill="#7B3A2A" />
            {unread > 0 && <View style={styles.badge} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Total Due Card ────────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#A3543A', '#632B1E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.dueCard}
        >
          <View style={styles.dueLeft}>
            <Text style={styles.dueLabel}>Total Due</Text>
            <Text style={styles.dueAmount}>₹ {dueAmount.toLocaleString('en-IN')}</Text>
            
            <View style={styles.pendingRow}>
              <MapPin size={12} color="#FDE68A" />
              <Text style={styles.pendingText}>2 Months Pending</Text>
            </View>

            <TouchableOpacity style={styles.viewBtn} onPress={() => navigation.navigate('Dues')}>
              <Text style={styles.viewBtnText}>View Details</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.dueRight}>
            <Text style={{ fontSize: 72 }}>👛</Text> 
          </View>
        </LinearGradient>

        {/* ── Today's Menu ─────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Menu</Text>
          <TouchableOpacity onPress={() => navigation.navigate('FullMenu')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Morning */}
        <View style={[styles.mealCard, { backgroundColor: '#FFF5EB' }]}>
          <View style={styles.mealTop}>
            <Sun size={24} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.mealName}>Morning</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.mealTime}>08:00 AM</Text>
          </View>
          <Text style={styles.mealDesc}>Idli, Sambar, Chutney</Text>
        </View>

        {/* Lunch */}
        <View style={[styles.mealCard, { backgroundColor: '#FFF0EA' }]}>
          <View style={styles.mealTop}>
            <Utensils size={24} color="#EA580C" />
            <Text style={styles.mealName}>Lunch</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.mealTime}>01:00 PM</Text>
          </View>
          <Text style={styles.mealDesc}>Rice, Dal, Sambar, Curd</Text>
        </View>

        {/* Dinner */}
        <View style={[styles.mealCard, { backgroundColor: '#F0F5F1' }]}>
          <View style={styles.mealTop}>
            <Moon size={24} color="#166534" fill="#166534" />
            <Text style={styles.mealName}>Dinner</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.mealTime}>08:00 PM</Text>
          </View>
          <Text style={styles.mealDesc}>Roti, Mix Veg, Salad</Text>
        </View>

        {/* ── Quick Access ─────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.xl, marginTop: spacing['2xl'], marginBottom: 14 }]}>
          Quick Access
        </Text>
        
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <TouchableOpacity
                key={action.label}
                style={styles.quickItem}
                onPress={() => navigation.navigate(action.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: action.iconBg }]}>
                  <Icon size={22} color={action.iconColor} strokeWidth={1.5} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 120 },

  // Top Bar
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5EDE9',
    alignItems: 'center', justifyContent: 'center',
  },
  greetingBox: { justifyContent: 'center' },
  greetingText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  nameText: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 2 },
  
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5EDE9',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1, borderColor: '#F5EDE9',
  },
  avatarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Total Due Card
  dueCard: {
    marginHorizontal: spacing.xl,
    marginTop: 12,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    ...shadow.card,
  },
  dueLeft: { flex: 1 },
  dueLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  dueAmount: { fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 4, marginBottom: 8 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  pendingText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  viewBtn: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  viewBtnText: { color: '#7B3A2A', fontWeight: '800', fontSize: 13 },
  dueRight: { justifyContent: 'center', paddingLeft: 10 },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: 32, marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  seeAllText: { fontSize: 14, color: '#7B3A2A', fontWeight: '700' },

  // Meal Cards
  mealCard: {
    marginHorizontal: spacing.xl,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  mealTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  mealName: { fontSize: 16, fontWeight: '800', color: colors.text },
  mealTime: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  mealDesc: { fontSize: 13, color: '#4B5563', paddingLeft: 36, fontWeight: '500' },

  // Quick Access
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: 0,
    marginBottom: 4,
  },
  quickItem: {
    width: `${100 / 5}%`,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  quickIconWrap: {
    width: 50, height: 50,
    borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 10, fontWeight: '600', color: colors.textMuted, textAlign: 'center',
  },
});
