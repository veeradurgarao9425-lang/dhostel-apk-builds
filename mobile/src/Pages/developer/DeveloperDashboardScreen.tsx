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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { developerService } from '../../services/developerService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperDashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { developer, logout } = useDeveloper();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Top App Bar */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <View style={styles.topBarLeft}>
          <View style={styles.masterBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#3B82F6" />
            <Text style={styles.masterBadgeText}>HOSTIX MASTER ADMIN</Text>
          </View>
          <Text style={styles.devGreeting}>
            Hello, <Text style={{ color: '#60A5FA' }}>{developer?.username || 'Developer'}</Text>
          </Text>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Connecting to platform database...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Ionicons name="warning" size={24} color="#EF4444" />
            <Text style={styles.errorTitle}>Unable to load platform data</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <TouchableOpacity onPress={fetchMetrics} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* System Health Pill */}
            <View style={styles.healthBanner}>
              <View style={styles.healthLeft}>
                <View style={styles.pulseDot} />
                <Text style={styles.healthText}>SYSTEM STATUS: <Text style={{ color: '#10B981', fontWeight: '800' }}>ONLINE & HEALTHY</Text></Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('DeveloperSystem')}
                style={styles.systemDetailLink}
              >
                <Text style={styles.systemDetailLinkText}>Diagnostics</Text>
                <Ionicons name="chevron-forward" size={12} color="#60A5FA" />
              </TouchableOpacity>
            </View>

            {/* Platform Metrics Grid */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Platform Overview</Text>
              <Text style={styles.sectionSubtitle}>Live real-time aggregation across all hostels</Text>
            </View>

            <View style={styles.grid}>
              {/* Hostels Card */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => navigation.navigate('DeveloperHostels')}
                style={styles.metricCardTouchable}
              >
                <LinearGradient
                  colors={['#1E293B', '#111827']}
                  style={styles.metricCard}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <Ionicons name="business" size={20} color="#3B82F6" />
                    </View>
                    <Ionicons name="arrow-forward-circle-outline" size={18} color="#64748B" />
                  </View>
                  <Text style={styles.metricValue}>{metrics.total_hostels || 0}</Text>
                  <Text style={styles.metricLabel}>Total Hostels</Text>
                  <View style={styles.subStatRow}>
                    <Text style={styles.subStatGreen}>Active: {metrics.active_hostels || 0}</Text>
                    <Text style={styles.subStatMuted}>Inactive: {metrics.inactive_hostels || 0}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Owners Card */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => navigation.navigate('DeveloperOwners')}
                style={styles.metricCardTouchable}
              >
                <LinearGradient
                  colors={['#1E293B', '#111827']}
                  style={styles.metricCard}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                      <Ionicons name="people" size={20} color="#A855F7" />
                    </View>
                    <Ionicons name="arrow-forward-circle-outline" size={18} color="#64748B" />
                  </View>
                  <Text style={styles.metricValue}>{metrics.total_owners || 0}</Text>
                  <Text style={styles.metricLabel}>Hostel Owners</Text>
                  <View style={styles.subStatRow}>
                    <Text style={styles.subStatGreen}>Active: {metrics.active_owners || 0}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Students Card */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => navigation.navigate('DeveloperStudents')}
                style={styles.metricCardTouchable}
              >
                <LinearGradient
                  colors={['#1E293B', '#111827']}
                  style={styles.metricCard}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="school" size={20} color="#10B981" />
                    </View>
                    <Ionicons name="arrow-forward-circle-outline" size={18} color="#64748B" />
                  </View>
                  <Text style={styles.metricValue}>{metrics.total_students || 0}</Text>
                  <Text style={styles.metricLabel}>Total Students</Text>
                  <View style={styles.subStatRow}>
                    <Text style={styles.subStatGreen}>Active: {metrics.active_students || 0}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Beds & Occupancy Card */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => navigation.navigate('DeveloperRoomsBeds')}
                style={styles.metricCardTouchable}
              >
                <LinearGradient
                  colors={['#1E293B', '#111827']}
                  style={styles.metricCard}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Ionicons name="bed" size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.ratePill}>
                      <Text style={styles.ratePillText}>{metrics.occupancy_rate || 0}% Occ</Text>
                    </View>
                  </View>
                  <Text style={styles.metricValue}>{metrics.total_beds || 0}</Text>
                  <Text style={styles.metricLabel}>Total Capacity</Text>
                  <View style={styles.subStatRow}>
                    <Text style={styles.subStatGreen}>Occ: {metrics.occupied_beds || 0}</Text>
                    <Text style={styles.subStatMuted}>Avail: {metrics.available_beds || 0}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Financial Highlights */}
            <View style={styles.financialContainer}>
              <View style={styles.finBox}>
                <Text style={styles.finLabel}>Total Collections</Text>
                <Text style={styles.finValueGreen}>₹{Number(metrics.total_collected || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.finDivider} />
              <View style={styles.finBox}>
                <Text style={styles.finLabel}>Pending Dues</Text>
                <Text style={styles.finValueAmber}>₹{Number(metrics.pending_fees || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.finDivider} />
              <View style={styles.finBox}>
                <Text style={styles.finLabel}>Expenses</Text>
                <Text style={styles.finValueRed}>₹{Number(metrics.total_expenses || 0).toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Management Hub Shortcuts */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Master Control Modules</Text>
            </View>

            <View style={styles.hubGrid}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DeveloperHostels')}
                style={styles.hubBtn}
              >
                <Ionicons name="business-outline" size={22} color="#3B82F6" />
                <Text style={styles.hubBtnText}>All Hostels</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DeveloperOwners')}
                style={styles.hubBtn}
              >
                <Ionicons name="person-circle-outline" size={22} color="#A855F7" />
                <Text style={styles.hubBtnText}>All Owners</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DeveloperStudents')}
                style={styles.hubBtn}
              >
                <Ionicons name="people-outline" size={22} color="#10B981" />
                <Text style={styles.hubBtnText}>All Students</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DeveloperRoomsBeds')}
                style={styles.hubBtn}
              >
                <Ionicons name="grid-outline" size={22} color="#F59E0B" />
                <Text style={styles.hubBtnText}>Rooms & Beds</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DeveloperPayments')}
                style={styles.hubBtn}
              >
                <Ionicons name="card-outline" size={22} color="#06B6D4" />
                <Text style={styles.hubBtnText}>Payments</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DeveloperAuditLogs')}
                style={styles.hubBtn}
              >
                <Ionicons name="time-outline" size={22} color="#EC4899" />
                <Text style={styles.hubBtnText}>Audit Logs</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Hostels Activity */}
            {data?.recent_hostels && data.recent_hostels.length > 0 && (
              <View style={styles.recentSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recently Registered Hostels</Text>
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
                        <Ionicons name="business" size={16} color="#60A5FA" />
                      </View>
                      <View>
                        <Text style={styles.hostelName}>{h.hostel_name}</Text>
                        <Text style={styles.hostelLocation}>{h.city || 'City not set'}{h.state ? `, ${h.state}` : ''}</Text>
                      </View>
                    </View>
                    <View style={styles.recentItemRight}>
                      <View style={[styles.statusBadge, h.is_active ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusBadgeText, { color: h.is_active ? '#10B981' : '#94A3B8' }]}>
                          {h.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#64748B" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0B1120',
  },
  topBarLeft: {
    flex: 1,
  },
  masterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  masterBadgeText: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  devGreeting: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  errorSub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#2563EB',
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
    backgroundColor: '#131D31',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    backgroundColor: '#10B981',
  },
  healthText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  systemDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  systemDetailLinkText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCardTouchable: {
    width: '48%',
  },
  metricCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#24334C',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratePillText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
  },
  subStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 6,
  },
  subStatGreen: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  subStatMuted: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  financialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#131D31',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  finBox: {
    alignItems: 'center',
  },
  finLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  finValueGreen: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '900',
  },
  finValueAmber: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '900',
  },
  finValueRed: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '900',
  },
  finDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#1E293B',
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  hubBtn: {
    width: '31%',
    backgroundColor: '#131D31',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  hubBtnText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  recentSection: {
    marginTop: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131D31',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  hostelAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostelName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  hostelLocation: {
    color: '#64748B',
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusInactive: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
