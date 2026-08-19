import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { developerService } from '../../services/developerService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeveloperLogoutModal } from '../../components/developer/DeveloperLogoutModal';

export default function DeveloperProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { developer } = useDeveloper();

  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  useEffect(() => {
    developerService.getDashboardMetrics().then((res) => {
      if (res?.success && res.data) {
        setMetrics(res.data.metrics);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const devName = developer?.full_name || 'Durgarao Goriparthi';
  const devEmail = developer?.email || 'durgarao9425@hostix.app';
  const devRole = 'SUPER_DEVELOPER (CEO)';

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

        <View style={styles.topBarRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.masterBadgeText}>👑 MASTER SECURITY</Text>
            <Text style={styles.topTitle}>Profile & Credentials</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutMiniBtn} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={17} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* CEO Identity Card */}
        <LinearGradient
          colors={['#18181B', '#27272A', '#18181B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHero}
        >
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>DG</Text>
            <View style={styles.onlineBadge} />
          </View>
          <Text style={styles.ceoName}>{devName}</Text>
          <Text style={styles.ceoRoleTag}>{devRole}</Text>
          <Text style={styles.ceoEmail}>{devEmail}</Text>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNum}>{metrics?.total_hostels || 3}</Text>
              <Text style={styles.heroStatLabel}>Hostels</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNum}>{metrics?.total_owners || 3}</Text>
              <Text style={styles.heroStatLabel}>Owners</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNum}>{metrics?.total_students || 25}</Text>
              <Text style={styles.heroStatLabel}>Students</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Master Governance Tools Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Master Governance & Control</Text>
        </View>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('DeveloperSystem')}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="speedometer" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuItemTitle}>System Diagnostics & DB Pool</Text>
              <Text style={styles.menuItemSub}>Real-time latency test and memory health</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#B5A496" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('DeveloperAuditLogs')}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="time" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuItemTitle}>Developer Audit Logs</Text>
              <Text style={styles.menuItemSub}>Immutable privileged activity trail</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#B5A496" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('DeveloperPayments')}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="card" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuItemTitle}>Payments & Revenue Ledger</Text>
              <Text style={styles.menuItemSub}>Financial audit across all hostels</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#B5A496" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('DeveloperRoomsBeds')}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="bed" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuItemTitle}>Room & Bed Capacity</Text>
              <Text style={styles.menuItemSub}>Platform occupancy and vacant beds</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#B5A496" />
          </TouchableOpacity>
        </View>

        {/* Security & Access Protocols */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Security & Authority</Text>
        </View>

        <View style={styles.securityCard}>
          <View style={styles.securityRow}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Full Super Admin Privileges</Text>
              <Text style={styles.securitySub}>
                Authorized for cross-tenant impersonation, hostel activation, and master password management.
              </Text>
            </View>
          </View>
        </View>

        {/* Big Sign Out Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutFullBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out" size={18} color="#EF4444" />
          <Text style={styles.logoutFullBtnText}>Sign Out Master Admin</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Developer Logout Confirmation Modal */}
      <DeveloperLogoutModal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  masterBadgeText: {
    color: '#FB923C',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutMiniBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  profileHero: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    color: '#C2410C',
    fontSize: 22,
    fontWeight: '900',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  ceoName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  ceoRoleTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#FED7AA',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    letterSpacing: 0.6,
  },
  ceoEmail: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 4,
  },
  heroDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  heroStatItem: {
    alignItems: 'center',
  },
  heroStatNum: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#1C1917',
    fontSize: 14,
    fontWeight: '900',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    color: '#1C1917',
    fontSize: 13.5,
    fontWeight: '800',
  },
  menuItemSub: {
    color: '#78716C',
    fontSize: 11,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F5EFE6',
  },
  securityCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 24,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  securityTitle: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '800',
  },
  securitySub: {
    color: '#047857',
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  logoutFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutFullBtnText: {
    color: '#DC2626',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
