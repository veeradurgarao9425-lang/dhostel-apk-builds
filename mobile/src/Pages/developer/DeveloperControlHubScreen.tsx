import React from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperControlHubScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { developer, logout } = useDeveloper();

  const handleLogout = () => {
    Alert.alert('Sign Out Master Admin', 'Are you sure you want to end your developer session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const SECTIONS = [
    {
      title: 'INVENTORY & OPERATIONS',
      items: [
        {
          title: 'Rooms & Bed Distribution',
          subtitle: 'Live platform-wide room types and vacancy breakdown',
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
      title: 'GOVERNANCE & SYSTEM',
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
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <View>
          <Text style={styles.headerTag}>HOSTIX MASTER CONTROL</Text>
          <Text style={styles.headerTitle}>System & Governance</Text>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={16} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Developer Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.avatarWrap}>
            <Ionicons name="shield-checkmark" size={24} color="#C2410C" />
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
                  <Ionicons name="chevron-forward" size={18} color="#B5A496" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footerNote}>
          <Ionicons name="lock-closed-outline" size={14} color="#A89687" />
          <Text style={styles.footerNoteText}>
            Protected under Hostix Multi-Tenant Master Administrator Protocol.
          </Text>
        </View>
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
  headerTag: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#292524',
    fontSize: 18,
    fontWeight: '900',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
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
    borderColor: '#EFE7DC',
    marginBottom: 20,
    shadowColor: '#8C3A00',
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
    borderColor: '#FFEDD5',
  },
  devName: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '900',
  },
  devEmail: {
    color: '#78716C',
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
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '800',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeading: {
    color: '#8C7A6B',
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
    borderColor: '#EFE7DC',
    overflow: 'hidden',
    shadowColor: '#8C3A00',
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
    borderBottomColor: '#F5EFE6',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    color: '#1C1917',
    fontSize: 14,
    fontWeight: '800',
  },
  itemSubtitle: {
    color: '#78716C',
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
    color: '#A89687',
    fontSize: 11,
    textAlign: 'center',
  },
});
