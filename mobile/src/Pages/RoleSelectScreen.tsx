import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const isSmall = height < 700;
const isTiny = height < 600;

export default function RoleSelectScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<'OWNER' | 'TENANT' | null>(null);

  const handleSelectRole = (role: 'OWNER' | 'TENANT') => {
    setSelectedRole(role);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTimeout(() => {
      if (role === 'OWNER') {
        navigation.navigate('Login', { role: 'OWNER' });
      } else {
        navigation.navigate('TenantHostelKey', { role: 'TENANT' });
      }
    }, 150);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Purple Gradient Header Matching Login / Brand ── */}
      <View
        style={[
          styles.topSection,
          {
            height: Math.max(Math.min(height * 0.30 + (insets.top > 0 ? insets.top : 0), height * 0.33), isSmall ? 160 : 190),
          },
        ]}
      >
        <LinearGradient
          colors={['#7C3AED', '#5F2EEA']}
          style={[
            StyleSheet.absoluteFillObject,
            styles.topSectionContent,
            { paddingTop: insets.top > 0 ? insets.top + 8 : 24 },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative background circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <View style={styles.logoWrapper}>
            <View style={[styles.logoImageContainer, isSmall && { width: 52, height: 52, borderRadius: 14, marginBottom: 4 }]}>
              <Image
                source={require('../../assets/HostixNew.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.appName, isSmall && { fontSize: 24, marginBottom: 2 }]}>
              Host<Text style={{ color: '#FCD34D' }}>ix</Text>
            </Text>
            {!isTiny && <Text style={[styles.tagline, isSmall && { fontSize: 12 }]}>Smart PG Management</Text>}
          </View>
        </LinearGradient>
      </View>

      {/* ── Main Sheet Section ── */}
      <View style={[styles.sheetSection, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
        
        {/* Top Title & 256-Bit Security Badge */}
        <View style={styles.titleArea}>
          <View style={styles.trustBadgeTop}>
            <Ionicons name="shield-checkmark" size={12} color="#7C3AED" />
            <Text style={styles.trustTextTop}>256-Bit SSL Encrypted Workspace</Text>
          </View>

          <Text style={[styles.sheetTitle, isSmall && { fontSize: 20 }]}>Choose Your Portal</Text>
          <Text style={[styles.sheetSubtitle, isSmall && { fontSize: 12 }]}>
            Select your account type to access your dedicated features
          </Text>
        </View>

        {/* ── Expanded Portal Cards ── */}
        <View style={styles.cardsContainer}>

          {/* 1. PG & HOSTEL OWNER CARD */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => handleSelectRole('OWNER')}
            style={[
              styles.card,
              selectedRole === 'OWNER' && styles.cardActiveOwner,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                <Image
                  source={require('../../assets/hostel_only_3d.png')}
                  style={styles.card3dImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.cardTitleCol}>
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>OWNER / ADMIN</Text>
                </View>
                <Text style={styles.cardTitle}>PG & Hostel Owner</Text>
                <Text style={styles.cardDesc}>
                  Manage rooms & beds, track tenants, collect rent & monitor expenses
                </Text>
              </View>

              <View style={[styles.arrowBtn, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#6366F1"
                />
              </View>
            </View>

            {/* Feature Pills */}
            <View style={styles.tagsRow}>
              <View style={styles.tagPill}>
                <Ionicons name="business" size={11} color="#6366F1" />
                <Text style={styles.tagText}>Rooms</Text>
              </View>
              <View style={styles.tagPill}>
                <Ionicons name="people" size={11} color="#6366F1" />
                <Text style={styles.tagText}>Tenants</Text>
              </View>
              <View style={styles.tagPill}>
                <Ionicons name="wallet" size={11} color="#6366F1" />
                <Text style={styles.tagText}>Rent Dues</Text>
              </View>
              <View style={styles.tagPill}>
                <Ionicons name="receipt" size={11} color="#6366F1" />
                <Text style={styles.tagText}>Expenses</Text>
              </View>
            </View>

            {/* Bottom Continue Bar */}
            <View style={styles.cardFooterOwner}>
              <Text style={styles.cardFooterOwnerText}>Continue to Owner Dashboard</Text>
              <Ionicons name="arrow-forward" size={14} color="#4F46E5" />
            </View>
          </TouchableOpacity>

          {/* 2. TENANT & RESIDENT CARD */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => handleSelectRole('TENANT')}
            style={[
              styles.card,
              selectedRole === 'TENANT' && styles.cardActiveTenant,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                <Image
                  source={require('../../assets/tenant_3d.png')}
                  style={styles.card3dImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.cardTitleCol}>
                <View style={styles.tenantBadge}>
                  <Text style={styles.tenantBadgeText}>TENANT / RESIDENT</Text>
                </View>
                <Text style={styles.cardTitle}>Tenant & Resident</Text>
                <Text style={styles.cardDesc}>
                  Pay rent dues, download receipts, view mess menu & raise complaints
                </Text>
              </View>

              <View style={[styles.arrowBtn, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#10B981"
                />
              </View>
            </View>

            {/* Feature Pills */}
            <View style={styles.tagsRow}>
              <View style={styles.tagPillTenant}>
                <Ionicons name="card" size={11} color="#059669" />
                <Text style={styles.tagTextTenant}>Pay Rent</Text>
              </View>
              <View style={styles.tagPillTenant}>
                <Ionicons name="receipt" size={11} color="#059669" />
                <Text style={styles.tagTextTenant}>Receipts</Text>
              </View>
              <View style={styles.tagPillTenant}>
                <Ionicons name="restaurant" size={11} color="#059669" />
                <Text style={styles.tagTextTenant}>Mess Menu</Text>
              </View>
              <View style={styles.tagPillTenant}>
                <Ionicons name="construct" size={11} color="#059669" />
                <Text style={styles.tagTextTenant}>Complaints</Text>
              </View>
            </View>

            {/* Bottom Continue Bar */}
            <View style={styles.cardFooterTenant}>
              <Text style={styles.cardFooterTenantText}>Continue to Resident Portal</Text>
              <Ionicons name="arrow-forward" size={14} color="#059669" />
            </View>
          </TouchableOpacity>

        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topSection: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  topSectionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorCircle1: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -width * 0.25,
    right: -width * 0.2,
  },
  decorCircle2: {
    position: 'absolute',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -width * 0.15,
    left: -width * 0.1,
  },
  logoWrapper: {
    alignItems: 'center',
  },
  logoImageContainer: {
    width: 58,
    height: 58,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginTop: 2,
  },
  sheetSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 18,
    paddingTop: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  titleArea: {
    alignItems: 'center',
    marginBottom: 10,
  },
  trustBadgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    marginBottom: 6,
  },
  trustTextTop: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 0.2,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  sheetSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: 17,
  },
  cardsContainer: {
    gap: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.4,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardActiveOwner: {
    borderColor: '#6366F1',
    borderWidth: 2,
    shadowColor: '#6366F1',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  cardActiveTenant: {
    borderColor: '#10B981',
    borderWidth: 2,
    shadowColor: '#10B981',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  card3dImage: {
    width: 42,
    height: 42,
  },
  cardTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  ownerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    marginBottom: 3,
  },
  ownerBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  tenantBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    marginBottom: 3,
  },
  tenantBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },
  tagPillTenant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  tagTextTenant: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#166534',
  },
  cardFooterOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2FF',
  },
  cardFooterOwnerText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: -0.1,
  },
  cardFooterTenant: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ECFDF5',
  },
  cardFooterTenantText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: -0.1,
  },
});



