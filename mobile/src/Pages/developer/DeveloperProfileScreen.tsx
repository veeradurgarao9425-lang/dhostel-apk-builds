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

export default function DeveloperProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { developer, logout } = useDeveloper();

  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    developerService.getDashboardMetrics().then((res) => {
      if (res?.success && res.data) {
        setMetrics(res.data.metrics);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out Master Admin', 'Are you sure you want to end your developer session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const devName = developer?.full_name || 'Durgarao Goriparthi';
  const devEmail = developer?.email || 'durgarao9425@hostix.app';
  const devRole = 'SUPER_DEVELOPER (CEO)';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#1C1917" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Master Profile & Security</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutMiniBtn} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* CEO Identity Card */}
        <LinearGradient
          colors={['#8C3A00', '#C2410C', '#EA580C']}
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
          <Ionicons name="log-out" size={18} color="#DC2626" />
          <Text style={styles.logoutFullBtnText}>Sign Out Master Admin</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE7DC',
    backgroundColor: '#FAF6F0',
  },
  backBtn: {
    padding: 6,
  },
  topTitle: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '900',
  },
  logoutMiniBtn: {
    padding: 6,
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
