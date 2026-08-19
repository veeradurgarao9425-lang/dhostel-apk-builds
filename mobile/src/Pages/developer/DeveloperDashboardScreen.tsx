import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Platform,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { developerService } from '../../services/developerService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeveloperDashboardSkeleton } from '../../components/ui/SkeletonCard';

// ── SVG Donut Chart Component ────────────────────────────────────────────────
interface DonutChartProps {
  size?: number;
  strokeWidth?: number;
  segments: {
    percentage: number;
    color: string;
  }[];
  centerTitle: string;
  centerSubtitle: string;
}

const DonutChart: React.FC<DonutChartProps> = ({
  size = 132,
  strokeWidth = 14,
  segments,
  centerTitle,
  centerSubtitle,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Base Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Donut Segments */}
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {segments.map((seg, idx) => {
            const clampedPct = Math.max(0, Math.min(100, seg.percentage));
            const strokeDashoffset = circumference - (clampedPct / 100) * circumference;
            const currentRotation = accumulatedAngle;
            accumulatedAngle += (clampedPct / 100) * 360;

            if (clampedPct <= 0) return null;

            return (
              <Circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                rotation={currentRotation}
                origin={`${size / 2}, ${size / 2}`}
              />
            );
          })}
        </G>
      </Svg>

      {/* Center Label */}
      <View style={styles.donutCenterContent}>
        <Text style={styles.donutCenterTitle} numberOfLines={1}>
          {centerTitle}
        </Text>
        <Text style={styles.donutCenterSub}>{centerSubtitle}</Text>
      </View>
    </View>
  );
};

export default function DeveloperDashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { developer, logout } = useDeveloper();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [activePage, setActivePage] = useState(0);
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const horizontalScrollRef = React.useRef<ScrollView>(null);

  // Sheet modals
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      const res = await developerService.getDashboardMetrics();
      if (res?.success && res.data) {
        setData(res.data);
      } else {
        setError(res?.error || 'Failed to load platform metrics.');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  const handleLogout = () => {
    setShowProfileModal(false);
    Alert.alert('Sign Out Master Admin', 'Are you sure you want to end your developer session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const metrics = data?.metrics || {};

  // Community Counts
  const totalStudents = Number(metrics.total_students || 0);
  const activeStudents = Number(metrics.active_students || 0);
  const totalOwners = Number(metrics.total_owners || 0);
  const activeOwners = Number(metrics.active_owners || 0);
  const totalHostels = Number(metrics.total_hostels || 0);
  const activeHostels = Number(metrics.active_hostels || 0);
  const totalBeds = Number(metrics.total_beds || 0);
  const occupiedBeds = Number(metrics.occupied_beds || 0);
  const availableBeds = Number(metrics.available_beds || Math.max(0, totalBeds - occupiedBeds));
  const occupancyRate = Number(metrics.occupancy_rate || 0);

  // Total User Community Volume
  const totalUsers = totalStudents + totalOwners;
  const studentPct = totalUsers > 0 ? Math.round((totalStudents / totalUsers) * 100) : 80;
  const ownerPct = totalUsers > 0 ? Math.max(0, 100 - studentPct) : 20;

  // Developer initials & display name
  const devName = developer?.full_name || 'Durgarao Goriparthi';
  const devInitials = devName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const QUICK_MANAGEMENT_ITEMS = [
    { label: 'All Hostels', icon: 'business' as const, color: '#EA580C', bg: '#FFF7ED', route: 'DevHostelsTab' },
    { label: 'Hostel Owners', icon: 'people' as const, color: '#EA580C', bg: '#FFF7ED', route: 'DevOwnersTab' },
    { label: 'All Students', icon: 'school' as const, color: '#059669', bg: '#ECFDF5', route: 'DevStudentsTab' },
    { label: 'Rooms & Beds', icon: 'bed' as const, color: '#D97706', bg: '#FEF3C7', route: 'DeveloperRoomsBeds' },
    { label: 'Payments Ledger', icon: 'card' as const, color: '#2563EB', bg: '#EFF6FF', route: 'DeveloperPayments' },
    { label: 'Complaints', icon: 'alert-circle' as const, color: '#EF4444', bg: '#FEF2F2', route: 'DeveloperComplaints' },
    { label: 'Notices', icon: 'megaphone' as const, color: '#0284C7', bg: '#EFF6FF', route: 'DeveloperNotices' },
    { label: 'Audit Logs', icon: 'time' as const, color: '#4F46E5', bg: '#EEF2FF', route: 'DeveloperAuditLogs' },
    { label: 'Diagnostics', icon: 'hardware-chip' as const, color: '#0D9488', bg: '#F0FDFA', route: 'DeveloperSystem' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#18181B" />

      {/* ─────────────────── EXECUTIVE HERO HEADER ─────────────────── */}
      <LinearGradient
        colors={['#18181B', '#27272A', '#1C1917']}
        style={[
          styles.heroHeader,
          {
            paddingTop: insets.top + (Platform.OS === 'android' ? 14 : 10),
          },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative Ambient Glow Orbs */}
        <View style={styles.hdrOrb1} />
        <View style={styles.hdrOrb2} />

        {/* Top Action & Greeting Row */}
        <View style={styles.topBarRow}>
          <View style={styles.topBarLeft}>
            <View style={styles.masterBadge}>
              <Text style={styles.masterBadgeCrown}>👑</Text>
              <Text style={styles.masterBadgeText}>HOSTIX MASTER HQ</Text>
              <View style={styles.masterBadgeLiveDot} />
            </View>
            <Text style={styles.devGreeting} numberOfLines={1}>
              Hello, <Text style={{ color: '#FB923C' }}>{devName}</Text>
            </Text>
            <Text style={styles.devSubGreeting}>
              Executive Master Suite • Live Multi-tenant DB
            </Text>
          </View>

          {/* Top Right Action Icons */}
          <View style={styles.topBarActions}>
            <TouchableOpacity
              onPress={() => setShowNotificationModal(true)}
              style={styles.actionIconButton}
              activeOpacity={0.75}
            >
              <Ionicons name="notifications-outline" size={19} color="#FFFFFF" />
              <View style={styles.notifBadgeDot} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('DeveloperProfile')}
              style={styles.profileAvatarBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.profileAvatarText}>{devInitials}</Text>
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Minimal Subtle Swipe Indicator */}
        <View style={styles.swipeIndicatorRow}>
          <View style={[styles.swipeDot, activePage === 0 && styles.swipeDotActive]} />
          <View style={[styles.swipeDot, activePage === 1 && styles.swipeDotActive]} />
          <Text style={styles.swipeIndicatorLabel}>
            {activePage === 0 ? 'Platform Overview  (Swipe left for Live Ops ➔)' : 'Live Ops Desk  (Swipe right for Overview ➔)'}
          </Text>
        </View>
      </LinearGradient>

      {/* ─────────────────── HORIZONTAL 2-PAGE SWIPER ─────────────────── */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          if (page === 0 || page === 1) setActivePage(page);
        }}
        style={{ flex: 1 }}
      >
        {/* ════════════════ PAGE 1: PLATFORM OVERVIEW ════════════════ */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />
            }
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {loading ? (
              <DeveloperDashboardSkeleton />
            ) : error ? (
              <View style={styles.errorCard}>
                <Ionicons name="warning" size={24} color="#DC2626" />
                <Text style={styles.errorTitle}>Unable to load platform data</Text>
                <Text style={styles.errorSub}>{error}</Text>
                <TouchableOpacity onPress={fetchMetrics} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry Connection</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* System Health Live Banner */}
                <View style={styles.healthBanner}>
                  <View style={styles.healthLeft}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.healthText}>
                      SYSTEM STATUS: <Text style={{ color: '#059669', fontWeight: '800' }}>ONLINE & HEALTHY</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('DeveloperSystem')}
                    style={styles.systemDetailLink}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.systemDetailLinkText}>Diagnostics</Text>
                    <Ionicons name="chevron-forward" size={12} color="#EA580C" />
                  </TouchableOpacity>
                </View>

            {/* ── Executive Swipeable Metrics Deck ── */}
            <View style={styles.deckSection}>
              <View style={styles.sectionHeaderBetween}>
                <View>
                  <Text style={styles.deckSectionSub}>EXECUTIVE HIGHLIGHTS</Text>
                  <Text style={styles.deckSectionTitle}>Key Operations Deck</Text>
                </View>
                <View style={styles.swipeHintBadge}>
                  <Text style={styles.swipeHintText}>Swipe ➔</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.deckScroll}
                snapToInterval={250}
                decelerationRate="fast"
              >
                {/* Deck Card 1: Revenue & Financial Volume */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('DeveloperPayments')}
                  style={[styles.deckCard, { borderColor: '#FED7AA' }]}
                >
                  <View style={styles.deckCardTop}>
                    <View style={[styles.deckIconBox, { backgroundColor: '#FFF7ED' }]}>
                      <Ionicons name="cash" size={17} color="#EA580C" />
                    </View>
                    <View style={styles.deckBadgeGreen}>
                      <Text style={styles.deckBadgeGreenText}>98.4% Collection</Text>
                    </View>
                  </View>
                  <Text style={styles.deckCardValue}>₹{Number(data?.metrics?.total_revenue || 0).toLocaleString('en-IN')}</Text>
                  <Text style={styles.deckCardLabel}>Total Platform Collections</Text>
                  <View style={styles.deckCardFooter}>
                    <Text style={styles.deckFooterText}>Ledger & Payments</Text>
                    <Ionicons name="arrow-forward" size={12} color="#EA580C" />
                  </View>
                </TouchableOpacity>

                {/* Deck Card 2: Live Bed Allocation & Vacancy */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('DeveloperRoomsBeds')}
                  style={[styles.deckCard, { borderColor: '#E5E7EB' }]}
                >
                  <View style={styles.deckCardTop}>
                    <View style={[styles.deckIconBox, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="bed" size={17} color="#2563EB" />
                    </View>
                    <View style={styles.deckBadgeBlue}>
                      <Text style={styles.deckBadgeBlueText}>{occupancyRate}% Occupied</Text>
                    </View>
                  </View>
                  <Text style={styles.deckCardValue}>{occupiedBeds} / {totalBeds} Beds</Text>
                  <Text style={styles.deckCardLabel}>{availableBeds} Vacant & Ready</Text>
                  <View style={styles.deckCardFooter}>
                    <Text style={[styles.deckFooterText, { color: '#2563EB' }]}>Room Distribution</Text>
                    <Ionicons name="arrow-forward" size={12} color="#2563EB" />
                  </View>
                </TouchableOpacity>

                {/* Deck Card 3: Maintenance & Complaints SLA */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('DeveloperComplaints')}
                  style={[styles.deckCard, { borderColor: '#E5E7EB' }]}
                >
                  <View style={styles.deckCardTop}>
                    <View style={[styles.deckIconBox, { backgroundColor: '#FEF2F2' }]}>
                      <Ionicons name="alert-circle" size={17} color="#EF4444" />
                    </View>
                    <View style={styles.deckBadgeRed}>
                      <Text style={styles.deckBadgeRedText}>Active Triage</Text>
                    </View>
                  </View>
                  <Text style={styles.deckCardValue}>0 Critical</Text>
                  <Text style={styles.deckCardLabel}>Tenant Issues & SLA</Text>
                  <View style={styles.deckCardFooter}>
                    <Text style={[styles.deckFooterText, { color: '#EF4444' }]}>Complaints Hub</Text>
                    <Ionicons name="arrow-forward" size={12} color="#EF4444" />
                  </View>
                </TouchableOpacity>

                {/* Deck Card 4: Platform Broadcasts & Sentiment */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('DeveloperRatings')}
                  style={[styles.deckCard, { borderColor: '#E5E7EB' }]}
                >
                  <View style={styles.deckCardTop}>
                    <View style={[styles.deckIconBox, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="star" size={17} color="#F59E0B" />
                    </View>
                    <View style={styles.deckBadgeAmber}>
                      <Text style={styles.deckBadgeAmberText}>4.6 ★ Rating</Text>
                    </View>
                  </View>
                  <Text style={styles.deckCardValue}>94% Positive</Text>
                  <Text style={styles.deckCardLabel}>Resident Community Score</Text>
                  <View style={styles.deckCardFooter}>
                    <Text style={[styles.deckFooterText, { color: '#D97706' }]}>Ratings & Reviews</Text>
                    <Ionicons name="arrow-forward" size={12} color="#D97706" />
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* ── Visual Analytics: Platform Community Donut Chart ── */}
            <View style={styles.analyticsCard}>
              <View style={styles.analyticsHeader}>
                <View>
                  <Text style={styles.analyticsSubtitle}>PLATFORM ECOSYSTEM</Text>
                  <Text style={styles.analyticsTitle}>Community Distribution</Text>
                </View>

                <View style={styles.liveUsersPill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveUsersPillText}>Live Data</Text>
                </View>
              </View>

              {/* Donut Chart & User Breakdown */}
              <View style={styles.chartRow}>
                <View style={styles.donutWrap}>
                  <DonutChart
                    size={132}
                    strokeWidth={14}
                    segments={[
                      { percentage: Math.max(10, Math.round((totalStudents / (totalUsers + totalBeds || 1)) * 100)), color: '#10B981' }, // Students (Emerald Green)
                      { percentage: Math.max(8, Math.round((totalOwners / (totalUsers + totalBeds || 1)) * 100)), color: '#EA580C' },     // Owners (Rust Orange)
                      { percentage: Math.max(10, Math.round((occupiedBeds / (totalUsers + totalBeds || 1)) * 100)), color: '#3B82F6' },   // Occupied Beds (Royal Blue)
                      { percentage: Math.max(10, Math.round((availableBeds / (totalUsers + totalBeds || 1)) * 100)), color: '#F59E0B' },  // Available Beds (Amber Gold)
                    ]}
                    centerTitle={String(totalUsers)}
                    centerSubtitle="Community"
                  />
                </View>

                {/* Right Breakdown Items */}
                <View style={styles.legendContainer}>
                  {/* Students Item */}
                  <TouchableOpacity
                    style={styles.legendCard}
                    onPress={() => navigation.navigate('DevStudentsTab')}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.legendIconBox, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="school" size={14} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.legendRowBetween}>
                        <Text style={styles.legendLabel}>Students</Text>
                        <Text style={[styles.legendPct, { color: '#10B981' }]}>{studentPct}%</Text>
                      </View>
                      <Text style={styles.legendValue}>{totalStudents} Total</Text>
                      <Text style={styles.legendSubVal}>{activeStudents} Active</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Owners Item */}
                  <TouchableOpacity
                    style={styles.legendCard}
                    onPress={() => navigation.navigate('DevOwnersTab')}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.legendIconBox, { backgroundColor: '#FFF7ED' }]}>
                      <Ionicons name="people" size={14} color="#EA580C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.legendRowBetween}>
                        <Text style={styles.legendLabel}>Owners</Text>
                        <Text style={[styles.legendPct, { color: '#EA580C' }]}>{ownerPct}%</Text>
                      </View>
                      <Text style={styles.legendValue}>{totalOwners} Total</Text>
                      <Text style={styles.legendSubVal}>{activeOwners} Active</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Hostels Coverage Bar inside Donut Hub */}
              <TouchableOpacity
                style={styles.hostelCoverageRow}
                onPress={() => navigation.navigate('DevHostelsTab')}
                activeOpacity={0.75}
              >
                <View style={styles.hostelCoverageLeft}>
                  <View style={styles.hostelMiniIcon}>
                    <Ionicons name="business" size={13} color="#EA580C" />
                  </View>
                  <Text style={styles.hostelCoverageText} numberOfLines={1}>
                    <Text style={{ fontWeight: '900', color: '#1C1917' }}>{totalHostels} Hostels</Text> • {activeHostels} Active Network
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={13} color="#C2410C" />
              </TouchableOpacity>
            </View>

            {/* ── Scrollable Quick Management Action Chips ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Management</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionScrollContent}
              style={styles.actionScrollView}
            >
              {QUICK_MANAGEMENT_ITEMS.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate(item.route)}
                  style={styles.scrollActionChip}
                >
                  <View style={[styles.scrollChipIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={15} color={item.color} />
                  </View>
                  <Text style={styles.scrollChipText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ── Simple & Compact Platform Operations ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Platform Operations</Text>
            </View>

            <View style={styles.compactOpsRow}>
              {/* Hostels Simple Card */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DevHostelsTab')}
                style={styles.compactOpCard}
              >
                <View style={styles.compactOpTop}>
                  <View style={[styles.compactOpIcon, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="business" size={15} color="#EA580C" />
                  </View>
                  <View style={styles.compactBadgeGreen}>
                    <Text style={styles.compactBadgeText}>
                      {totalHostels > 0 ? Math.round((activeHostels / totalHostels) * 100) : 100}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.compactOpValue}>{totalHostels} Hostels</Text>
                <Text style={styles.compactOpSub}>{activeHostels} active on platform</Text>
              </TouchableOpacity>

              {/* Beds Simple Card */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DeveloperRoomsBeds')}
                style={styles.compactOpCard}
              >
                <View style={styles.compactOpTop}>
                  <View style={[styles.compactOpIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="bed" size={15} color="#D97706" />
                  </View>
                  <View style={styles.compactBadgeAmber}>
                    <Text style={styles.compactBadgeText}>{occupancyRate}%</Text>
                  </View>
                </View>
                <Text style={styles.compactOpValue}>{totalBeds} Beds</Text>
                <Text style={styles.compactOpSub}>{occupiedBeds} occ • {availableBeds} avail</Text>
              </TouchableOpacity>
            </View>

            {/* ── Recently Added Hostels ── */}
            {data?.recent_hostels && data.recent_hostels.length > 0 && (
              <View style={styles.recentSection}>
                <View style={styles.sectionHeaderBetween}>
                  <Text style={styles.sectionTitle}>Recently Added Hostels</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('DevHostelsTab')}>
                    <Text style={styles.seeAllText}>View All</Text>
                  </TouchableOpacity>
                </View>

                {data.recent_hostels.map((h: any) => (
                  <TouchableOpacity
                    key={h.hostel_id}
                    activeOpacity={0.75}
                    onPress={() => navigation.navigate('DeveloperHostelDetails', { hostelId: h.hostel_id })}
                    style={styles.recentItem}
                  >
                    <View style={styles.recentItemLeft}>
                      <View style={styles.hostelAvatar}>
                        <Ionicons name="business" size={16} color="#C2410C" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.hostelName} numberOfLines={1}>{h.hostel_name}</Text>
                        <Text style={styles.hostelLocation} numberOfLines={1}>
                          {h.city || 'City not set'}{h.state ? `, ${h.state}` : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.recentItemRight}>
                      <View style={[styles.statusBadge, h.is_active ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusBadgeText, { color: h.is_active ? '#059669' : '#8C7A6B' }]}>
                          {h.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={15} color="#B5A496" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
              </>
            )}
          </ScrollView>
        </View>

        {/* ════════════════ PAGE 2: LIVE OPS & CONTROL DESK (SWIPED RIGHT) ════════════════ */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* System Diagnostics Live Telemetry */}
            <View style={styles.liveDeskCard}>
              <View style={styles.liveDeskHeader}>
                <View style={styles.liveDeskIconWrap}>
                  <Ionicons name="hardware-chip" size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.liveDeskTitle}>System Telemetry & Health</Text>
                  <Text style={styles.liveDeskSub}>PostgreSQL Multitenant Active Bounds</Text>
                </View>
                <View style={styles.liveStatusPill}>
                  <View style={styles.liveStatusDot} />
                  <Text style={styles.liveStatusText}>ACTIVE</Text>
                </View>
              </View>

              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryNum}>42ms</Text>
                  <Text style={styles.telemetryLabel}>API Latency</Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryNum}>99.98%</Text>
                  <Text style={styles.telemetryLabel}>Platform Uptime</Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryNum}>24 MB</Text>
                  <Text style={styles.telemetryLabel}>Heap Memory</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('DeveloperSystem')}
                style={styles.liveDeskActionBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.liveDeskActionBtnText}>Run Database Diagnostics</Text>
                <Ionicons name="arrow-forward" size={13} color="#2563EB" />
              </TouchableOpacity>
            </View>

            {/* Quick Operations Matrix */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Master Control Matrix</Text>
            </View>

            <View style={styles.quickMatrixGrid}>
              <TouchableOpacity
                style={styles.matrixItem}
                onPress={() => navigation.navigate('DeveloperComplaints')}
                activeOpacity={0.8}
              >
                <View style={[styles.matrixIconBox, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="alert-circle" size={22} color="#EF4444" />
                </View>
                <Text style={styles.matrixItemTitle}>Complaints Hub</Text>
                <Text style={styles.matrixItemSub}>Triage issues</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.matrixItem}
                onPress={() => navigation.navigate('DeveloperNotices')}
                activeOpacity={0.8}
              >
                <View style={[styles.matrixIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="megaphone" size={22} color="#0284C7" />
                </View>
                <Text style={styles.matrixItemTitle}>Notices Broadcast</Text>
                <Text style={styles.matrixItemSub}>Send announcements</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.matrixItem}
                onPress={() => navigation.navigate('DeveloperMess')}
                activeOpacity={0.8}
              >
                <View style={[styles.matrixIconBox, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="restaurant" size={22} color="#D97706" />
                </View>
                <Text style={styles.matrixItemTitle}>Mess Governance</Text>
                <Text style={styles.matrixItemSub}>Food & meal logs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.matrixItem}
                onPress={() => navigation.navigate('DeveloperRatings')}
                activeOpacity={0.8}
              >
                <View style={[styles.matrixIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="star" size={22} color="#059669" />
                </View>
                <Text style={styles.matrixItemTitle}>Community Ratings</Text>
                <Text style={styles.matrixItemSub}>Review sentiment</Text>
              </TouchableOpacity>
            </View>

            {/* Privileged Audit Trail Stream */}
            <View style={styles.sectionHeaderBetween}>
              <Text style={styles.sectionTitle}>Privileged Audit Stream</Text>
              <TouchableOpacity onPress={() => navigation.navigate('DeveloperAuditLogs')}>
                <Text style={styles.seeAllText}>Full Audit Trail</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.auditStreamCard}>
              <View style={styles.auditItem}>
                <View style={styles.auditDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.auditActionText}>Developer Support Mode Session</Text>
                  <Text style={styles.auditMetaText}>Controlled multi-tenant access with timer</Text>
                </View>
                <Text style={styles.auditTimeText}>Active</Text>
              </View>

              <View style={styles.auditDivider} />

              <View style={styles.auditItem}>
                <View style={[styles.auditDot, { backgroundColor: '#3B82F6' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.auditActionText}>Password PIN Reset Generated</Text>
                  <Text style={styles.auditMetaText}>Random 6-digit credential dispatched</Text>
                </View>
                <Text style={styles.auditTimeText}>Recent</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* ── System Notifications Modal Sheet ── */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowNotificationModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheetContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="notifications" size={18} color="#C2410C" />
                    <Text style={styles.modalTitle}>System Notifications</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowNotificationModal(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#78716C" />
                  </TouchableOpacity>
                </View>

                {/* Notification Items */}
                <View style={styles.notifList}>
                  <View style={styles.notifItem}>
                    <View style={[styles.notifIconWrap, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="checkmark-circle" size={18} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifItemTitle}>Database Connection Live</Text>
                      <Text style={styles.notifItemSub}>Supabase multi-tenant database pool active & stable.</Text>
                      <Text style={styles.notifTime}>Real-time</Text>
                    </View>
                  </View>

                  <View style={styles.notifItem}>
                    <View style={[styles.notifIconWrap, { backgroundColor: '#FFF7ED' }]}>
                      <Ionicons name="shield-checkmark" size={18} color="#EA580C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifItemTitle}>Master Admin Session Active</Text>
                      <Text style={styles.notifItemSub}>Privileged master developer credentials authenticated.</Text>
                      <Text style={styles.notifTime}>Active</Text>
                    </View>
                  </View>

                  <View style={styles.notifItem}>
                    <View style={[styles.notifIconWrap, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="business" size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifItemTitle}>Platform Sync Up to Date</Text>
                      <Text style={styles.notifItemSub}>{totalHostels} hostels registered across all regions.</Text>
                      <Text style={styles.notifTime}>Just now</Text>
                    </View>
                  </View>
                </View>

                {/* Audit Logs Navigation Button */}
                <TouchableOpacity
                  onPress={() => {
                    setShowNotificationModal(false);
                    navigation.navigate('DeveloperAuditLogs');
                  }}
                  style={styles.modalActionBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalActionBtnText}>View Developer Audit Logs</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Developer Profile Modal Sheet ── */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowProfileModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheetContent}>
                {/* Profile Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="person-circle" size={20} color="#C2410C" />
                    <Text style={styles.modalTitle}>Developer Profile</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowProfileModal(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#78716C" />
                  </TouchableOpacity>
                </View>

                {/* Profile Info Card */}
                <View style={styles.profileInfoCard}>
                  <View style={styles.profileBigAvatar}>
                    <Text style={styles.profileBigAvatarText}>{devInitials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>{developer?.full_name || 'Master Super Admin'}</Text>
                    <Text style={styles.profileEmail}>{developer?.email || developer?.username || 'developer@hostix.app'}</Text>
                    <View style={styles.profileRoleTag}>
                      <Text style={styles.profileRoleTagText}>SUPER_DEVELOPER</Text>
                    </View>
                  </View>
                </View>

                {/* Quick Menu Links */}
                <View style={styles.profileLinks}>
                  <TouchableOpacity
                    style={styles.profileLinkItem}
                    onPress={() => {
                      setShowProfileModal(false);
                      navigation.navigate('DevControlTab');
                    }}
                  >
                    <View style={[styles.profileLinkIcon, { backgroundColor: '#FFF7ED' }]}>
                      <Ionicons name="construct" size={16} color="#EA580C" />
                    </View>
                    <Text style={styles.profileLinkText}>Developer Control Hub</Text>
                    <Ionicons name="chevron-forward" size={16} color="#B5A496" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.profileLinkItem}
                    onPress={() => {
                      setShowProfileModal(false);
                      navigation.navigate('DeveloperSystem');
                    }}
                  >
                    <View style={[styles.profileLinkIcon, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="speedometer" size={16} color="#2563EB" />
                    </View>
                    <Text style={styles.profileLinkText}>System Diagnostics</Text>
                    <Ionicons name="chevron-forward" size={16} color="#B5A496" />
                  </TouchableOpacity>
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity
                  onPress={handleLogout}
                  style={styles.profileLogoutBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                  <Text style={styles.profileLogoutBtnText}>Sign Out Developer Session</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  heroHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  hdrOrb1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    top: -80,
    right: -40,
  },
  hdrOrb2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    bottom: -50,
    left: -40,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  topBarLeft: {
    flex: 1,
    paddingRight: 8,
  },
  masterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 146, 60, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 5,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.25)',
  },
  masterBadgeCrown: {
    fontSize: 10,
  },
  masterBadgeLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  masterBadgeText: {
    color: '#FB923C',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  devGreeting: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  devSubGreeting: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#18181B',
  },
  profileAvatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(234, 88, 12, 0.2)',
    borderWidth: 1.5,
    borderColor: '#FB923C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#FB923C',
    fontSize: 13,
    fontWeight: '900',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#18181B',
  },
  swipeIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  swipeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  swipeDotActive: {
    width: 16,
    backgroundColor: '#EA580C',
  },
  swipeIndicatorLabel: {
    color: '#D1D5DB',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  liveDeskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  liveDeskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  liveDeskIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  liveDeskTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  liveDeskSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 1,
  },
  liveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveStatusText: {
    color: '#059669',
    fontSize: 9.5,
    fontWeight: '900',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  telemetryBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  telemetryNum: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  telemetryLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  liveDeskActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  liveDeskActionBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
  },
  quickMatrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  matrixItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  matrixIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  matrixItemTitle: {
    color: '#111827',
    fontSize: 13.5,
    fontWeight: '900',
  },
  matrixItemSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 1,
  },
  auditStreamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  auditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
  },
  auditActionText: {
    color: '#111827',
    fontSize: 12.5,
    fontWeight: '800',
  },
  auditMetaText: {
    color: '#6B7280',
    fontSize: 10.5,
    marginTop: 1,
  },
  auditTimeText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
  },
  auditDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  heroSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  heroSearchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  heroSearchPlaceholder: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  heroSearchAiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EA580C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroSearchAiText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#78716C',
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F87171',
    shadowColor: '#DC2626',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  errorTitle: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  errorSub: {
    color: '#78716C',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#C2410C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  healthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  deckSection: {
    marginBottom: 18,
  },
  deckSectionSub: {
    color: '#EA580C',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  deckSectionTitle: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 1,
  },
  swipeHintBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  swipeHintText: {
    color: '#EA580C',
    fontSize: 10,
    fontWeight: '800',
  },
  deckScroll: {
    paddingTop: 10,
    paddingBottom: 4,
    gap: 12,
  },
  deckCard: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  deckCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  deckIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckBadgeGreen: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deckBadgeGreenText: {
    color: '#059669',
    fontSize: 9.5,
    fontWeight: '900',
  },
  deckBadgeBlue: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deckBadgeBlueText: {
    color: '#2563EB',
    fontSize: 9.5,
    fontWeight: '900',
  },
  deckBadgeRed: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deckBadgeRedText: {
    color: '#EF4444',
    fontSize: 9.5,
    fontWeight: '900',
  },
  deckBadgeAmber: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deckBadgeAmberText: {
    color: '#D97706',
    fontSize: 9.5,
    fontWeight: '900',
  },
  deckCardValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  deckCardLabel: {
    color: '#6B7280',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 12,
  },
  deckCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  deckFooterText: {
    color: '#EA580C',
    fontSize: 11.5,
    fontWeight: '800',
  },
  healthLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  healthText: {
    color: '#57534E',
    fontSize: 11,
    fontWeight: '700',
  },
  systemDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  systemDetailLinkText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '700',
  },
  // ── Donut Chart Analytics Card ──
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE6',
  },
  analyticsSubtitle: {
    color: '#A89687',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  analyticsTitle: {
    color: '#1C1917',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  liveUsersPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  liveUsersPillText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  donutWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  donutCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterTitle: {
    color: '#1C1917',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  donutCenterSub: {
    color: '#78716C',
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
  },
  legendContainer: {
    flex: 1,
    paddingLeft: 16,
    gap: 8,
  },
  legendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAF6F0',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  legendIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendLabel: {
    color: '#78716C',
    fontSize: 10,
    fontWeight: '700',
  },
  legendPct: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '900',
  },
  legendValue: {
    color: '#1C1917',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 1,
  },
  legendSubVal: {
    color: '#059669',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 1,
  },
  hostelCoverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  hostelCoverageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 6,
  },
  hostelMiniIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostelCoverageText: {
    color: '#7C2D12',
    fontSize: 11,
    fontWeight: '600',
  },
  // ── Section Headers ──
  sectionHeader: {
    marginBottom: 10,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#1C1917',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  seeAllText: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '800',
  },
  // ── Horizontal Scrollable Quick Actions ──
  actionScrollView: {
    marginBottom: 20,
    marginHorizontal: -16,
  },
  actionScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  scrollActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  scrollChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollChipText: {
    color: '#1C1917',
    fontSize: 12,
    fontWeight: '800',
  },
  // ── Compact Simple Platform Operations ──
  compactOpsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  compactOpCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  compactOpTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  compactOpIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBadgeGreen: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  compactBadgeAmber: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  compactBadgeText: {
    color: '#1C1917',
    fontSize: 10,
    fontWeight: '800',
  },
  compactOpValue: {
    color: '#1C1917',
    fontSize: 15,
    fontWeight: '900',
  },
  compactOpSub: {
    color: '#78716C',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
  },
  // ── Recent Section ──
  recentSection: {
    marginTop: 4,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  hostelAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  hostelName: {
    color: '#1C1917',
    fontSize: 13,
    fontWeight: '800',
  },
  hostelLocation: {
    color: '#78716C',
    fontSize: 11,
    marginTop: 1,
  },
  recentItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusInactive: {
    backgroundColor: '#F5F5F4',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  // ── Modal Sheets ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE6',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#1C1917',
    fontSize: 17,
    fontWeight: '900',
  },
  modalCloseBtn: {
    padding: 4,
  },
  notifList: {
    gap: 12,
    marginBottom: 18,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  notifIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItemTitle: {
    color: '#1C1917',
    fontSize: 13,
    fontWeight: '800',
  },
  notifItemSub: {
    color: '#78716C',
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  notifTime: {
    color: '#A89687',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C2410C',
    paddingVertical: 13,
    borderRadius: 12,
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  // ── Profile Sheet ──
  profileInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FAF6F0',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    marginBottom: 16,
  },
  profileBigAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FDBA74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBigAvatarText: {
    color: '#C2410C',
    fontSize: 18,
    fontWeight: '900',
  },
  profileName: {
    color: '#1C1917',
    fontSize: 15,
    fontWeight: '900',
  },
  profileEmail: {
    color: '#78716C',
    fontSize: 12,
    marginTop: 2,
  },
  profileRoleTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  profileRoleTagText: {
    color: '#C2410C',
    fontSize: 9.5,
    fontWeight: '900',
  },
  profileLinks: {
    gap: 8,
    marginBottom: 18,
  },
  profileLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  profileLinkIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLinkText: {
    flex: 1,
    color: '#1C1917',
    fontSize: 13,
    fontWeight: '800',
  },
  profileLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  profileLogoutBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },
});
