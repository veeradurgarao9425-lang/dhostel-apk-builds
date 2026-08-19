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
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { developerService } from '../../services/developerService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

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
  const devInitials = 'DG';

  const QUICK_MANAGEMENT_ITEMS = [
    { label: 'All Hostels', icon: 'business' as const, color: '#EA580C', bg: '#FFF7ED', route: 'DevHostelsTab' },
    { label: 'Hostel Owners', icon: 'people' as const, color: '#7C3AED', bg: '#F3E8FF', route: 'DevOwnersTab' },
    { label: 'All Students', icon: 'school' as const, color: '#059669', bg: '#ECFDF5', route: 'DevStudentsTab' },
    { label: 'Rooms & Beds', icon: 'bed' as const, color: '#D97706', bg: '#FEF3C7', route: 'DeveloperRoomsBeds' },
    { label: 'Payments Ledger', icon: 'card' as const, color: '#2563EB', bg: '#EFF6FF', route: 'DeveloperPayments' },
    { label: 'Audit Logs', icon: 'time' as const, color: '#4F46E5', bg: '#EEF2FF', route: 'DeveloperAuditLogs' },
    { label: 'Diagnostics', icon: 'hardware-chip' as const, color: '#0D9488', bg: '#F0FDFA', route: 'DeveloperSystem' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Top Header Bar with Proper Safe Margin */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + (Platform.OS === 'android' ? 14 : 10),
          },
        ]}
      >
        <View style={styles.topBarLeft}>
          <View style={styles.masterBadge}>
            <View style={styles.badgeIndicator} />
            <Text style={styles.masterBadgeText}>HOSTIX MASTER ADMIN</Text>
          </View>
          <Text style={styles.devGreeting} numberOfLines={1}>
            Hello, <Text style={{ color: '#C2410C' }}>{devName}</Text>
          </Text>
        </View>

        {/* Top Right Action Icons: Notification Bell & Profile Avatar */}
        <View style={styles.topBarActions}>
          <TouchableOpacity
            onPress={() => setShowNotificationModal(true)}
            style={styles.actionIconButton}
            activeOpacity={0.75}
            accessibilityLabel="System notifications"
          >
            <Ionicons name="notifications-outline" size={19} color="#1C1917" />
            <View style={styles.notifBadgeDot} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('DeveloperProfile')}
            style={styles.profileAvatarBtn}
            activeOpacity={0.8}
            accessibilityLabel="Developer Profile Menu"
          >
            <Text style={styles.profileAvatarText}>{devInitials}</Text>
            <View style={styles.onlineDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C2410C" />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#C2410C" />
            <Text style={styles.loadingText}>Connecting to platform database...</Text>
          </View>
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
                <Ionicons name="chevron-forward" size={12} color="#C2410C" />
              </TouchableOpacity>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE7DC',
    backgroundColor: '#FAF6F0',
  },
  topBarLeft: {
    flex: 1,
    paddingRight: 8,
  },
  masterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  badgeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C2410C',
  },
  masterBadgeText: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  devGreeting: {
    color: '#1C1917',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7DC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notifBadgeDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EA580C',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  profileAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  profileAvatarText: {
    color: '#C2410C',
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
    borderColor: '#FFFFFF',
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
