import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeveloperLogoutModal } from '../../components/developer/DeveloperLogoutModal';

export default function DeveloperControlHubScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { developer } = useDeveloper();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const SECTIONS = [
    {
      title: 'INVENTORY & FINANCIAL LEDGER',
      items: [
        {
          title: 'Rooms & Bed Distribution',
          subtitle: 'Live platform-wide room types, capacity & vacancy breakdown',
          icon: 'bed' as const,
          color: '#EA580C',
          route: 'DeveloperRoomsBeds',
        },
        {
          title: 'Payments & Revenue Ledger',
          subtitle: 'Complete transaction history and revenue analytics',
          icon: 'cash' as const,
          color: '#059669',
          route: 'DeveloperPayments',
        },
      ],
    },
    {
      title: 'TENANT & HOSTEL ECOSYSTEM',
      items: [
        {
          title: 'Mess & Food Menu Governance',
          subtitle: 'Master daily food schedule & meal logs across all hostels',
          icon: 'restaurant' as const,
          color: '#D97706',
          route: 'DeveloperMess',
        },
        {
          title: 'Complaints & Maintenance Triage',
          subtitle: 'Platform-wide tenant issues, resolution SLA & triage',
          icon: 'alert-circle' as const,
          color: '#EF4444',
          route: 'DeveloperComplaints',
        },
        {
          title: 'Notices & Platform Broadcasts',
          subtitle: 'Dispatch emergency announcements to owners & residents',
          icon: 'megaphone' as const,
          color: '#0284C7',
          route: 'DeveloperNotices',
        },
        {
          title: 'Ratings & Feedback Moderation',
          subtitle: 'Hostel ratings breakdown, student sentiment & review logs',
          icon: 'star' as const,
          color: '#F59E0B',
          route: 'DeveloperRatings',
        },
      ],
    },
    {
      title: 'GOVERNANCE & SYSTEM SECURITY',
      items: [
        {
          title: 'Developer Audit Logs',
          subtitle: 'Immutable privileged action trail with timestamps & IPs',
          icon: 'time' as const,
          color: '#7C3AED',
          route: 'DeveloperAuditLogs',
        },
        {
          title: 'System & Database Diagnostics',
          subtitle: 'Latency test, memory health, uptime & pool bounds',
          icon: 'hardware-chip' as const,
          color: '#2563EB',
          route: 'DeveloperSystem',
        },
        {
          title: 'Master Profile & Credentials',
          subtitle: 'Root developer account, security tokens & active sessions',
          icon: 'person-circle' as const,
          color: '#EA580C',
          route: 'DeveloperProfile',
        },
      ],
    },
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

        <View style={styles.topBarRow}>
          <View>
            <View style={styles.masterBadge}>
              <Text style={styles.masterBadgeCrown}>👑</Text>
              <Text style={styles.masterBadgeText}>HOSTIX MASTER CONTROL</Text>
              <View style={styles.masterBadgeLiveDot} />
            </View>
            <Text style={styles.screenTitle}>System & Governance</Text>
          </View>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={15} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Developer Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.avatarWrap}>
            <Ionicons name="shield-checkmark" size={24} color="#EA580C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.devName}>{developer?.full_name || 'Master Super Admin'}</Text>
            <Text style={styles.devEmail}>{developer?.email || 'durgarao9425@hostix.com'}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>Privileged Developer Layer</Text>
            </View>
          </View>
        </View>

        {/* Modules Section */}
        {SECTIONS.map((sec, idx) => (
          <View key={idx} style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>{sec.title}</Text>
            <View style={styles.cardGroup}>
              {sec.items.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate(item.route)}
                  style={[
                    styles.menuItem,
                    i < sec.items.length - 1 && styles.menuItemBorder,
                  ]}
                >
                  <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footerNote}>
          <Ionicons name="lock-closed-outline" size={14} color="#9CA3AF" />
          <Text style={styles.footerNoteText}>
            Protected under Hostix Multi-Tenant Master Administrator Protocol.
          </Text>
        </View>
      </ScrollView>
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
    paddingBottom: 18,
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
  masterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 146, 60, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
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
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  devName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  devEmail: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 1,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  rolePillText: {
    color: '#EA580C',
    fontSize: 10,
    fontWeight: '800',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeading: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  itemSubtitle: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  footerNoteText: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
  },
});
