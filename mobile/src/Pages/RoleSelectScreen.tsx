import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';

const { width, height } = Dimensions.get('window');
const isSmall = height < 700;
const isTiny = height < 600;

export default function RoleSelectScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<'OWNER' | 'TENANT' | null>(null);

  React.useEffect(() => {
    // Proactively pre-warm backend connection & TLS handshake in the background
    api.get('/health').catch(() => {});
  }, []);

  const handleSelectRole = (role: 'OWNER' | 'TENANT') => {
    setSelectedRole(role);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTimeout(() => {
      if (role === 'OWNER') {
        navigation.navigate('Login', { role: 'OWNER' });
      } else {
        navigation.navigate('TenantHostelKey', { role: 'TENANT' });
      }
    }, 180);
  };

  const headerHeight = (isSmall ? 170 : Math.min(height * 0.26, 220)) + (insets.top > 0 ? insets.top : 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom + 40, 48),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        overScrollMode="always"
      >
        {/* ─── Curved Purple Hero Header Banner ─── */}
        <View style={[styles.topSection, { height: headerHeight }]}>
          <LinearGradient
            colors={['#7C3AED', '#5F2EEA']}
            style={[
              StyleSheet.absoluteFillObject,
              styles.topSectionContent,
              { paddingTop: insets.top > 0 ? insets.top + (isSmall ? 6 : 14) : 20 },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Ambient decorative glowing circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            {/* Brand Logo & Title */}
            <View style={styles.logoWrapper}>
              <View style={[styles.logoImageContainer, isSmall && { width: 54, height: 54, borderRadius: 15, marginBottom: 5 }]}>
                <Image
                  source={require('../../assets/HostixNew.png')}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>

              <Text style={[styles.appName, isSmall && { fontSize: 24 }]}>
                Host<Text style={{ color: '#FCD34D' }}>ix</Text>
              </Text>
              
              {!isTiny && (
                <Text style={[styles.tagline, isSmall && { fontSize: 11 }]}>
                  Smart PG & Hostel Management
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* ─── Bottom Content Sheet ─── */}
        <View style={styles.sheetSection}>
          
          {/* Header Title Section */}
          <View style={styles.titleArea}>
            <View style={styles.portalPill}>
              <Ionicons name="sparkles" size={12} color="#7C3AED" />
              <Text style={styles.portalPillText}>CHOOSE YOUR PORTAL</Text>
            </View>

            <Text style={[styles.sheetTitle, isSmall && { fontSize: 20 }]}>Select Account Type</Text>
            <Text style={[styles.sheetSubtitle, isSmall && { fontSize: 12, marginBottom: 14 }]}>
              Tap your role below to access your personalized portal
            </Text>
          </View>

          {/* ─── Elevated Interactive Cards ─── */}
          <View style={styles.cardsContainer}>

            {/* ════ 1. PG & HOSTEL OWNER CARD ════ */}
            <TouchableOpacity
              activeOpacity={0.90}
              onPress={() => handleSelectRole('OWNER')}
              style={[
                styles.card,
                styles.ownerCardShadow,
                selectedRole === 'OWNER' && styles.cardActiveOwner,
              ]}
            >
              <LinearGradient
                colors={selectedRole === 'OWNER' ? ['#F5F3FF', '#EEF2FF'] : ['#FFFFFF', '#FAF9FF']}
                style={styles.cardInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Header Row: 3D Artwork + Title + Status */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.iconBoxOwner}>
                    <Image
                      source={require('../../assets/hostel_only_3d.png')}
                      style={styles.card3dImg}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.cardTitleCol}>
                    <View style={styles.ownerBadge}>
                      <View style={styles.ownerDot} />
                      <Text style={styles.ownerBadgeText}>OWNER / ADMIN</Text>
                    </View>
                    <Text style={styles.cardTitle}>PG & Hostel Owner</Text>
                    <Text style={styles.cardDesc}>
                      Complete property control, rooms, KYC & finance
                    </Text>
                  </View>
                </View>

                {/* Capability Chips */}
                <View style={styles.chipsRow}>
                  <View style={styles.chipOwner}>
                    <Ionicons name="business" size={11} color="#4F46E5" />
                    <Text style={styles.chipTextOwner}>Rooms & Beds</Text>
                  </View>
                  <View style={styles.chipOwner}>
                    <Ionicons name="people" size={11} color="#4F46E5" />
                    <Text style={styles.chipTextOwner}>Tenant KYC</Text>
                  </View>
                  <View style={styles.chipOwner}>
                    <Ionicons name="wallet" size={11} color="#4F46E5" />
                    <Text style={styles.chipTextOwner}>Rent Dues</Text>
                  </View>
                  <View style={styles.chipOwner}>
                    <Ionicons name="pie-chart" size={11} color="#4F46E5" />
                    <Text style={styles.chipTextOwner}>Expenses</Text>
                  </View>
                </View>

                {/* Primary Action Button */}
                <View style={styles.ctaButtonOwner}>
                  <LinearGradient
                    colors={['#6366F1', '#4F46E5']}
                    style={styles.ctaGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.ctaButtonText}>Continue as Owner</Text>
                    <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                  </LinearGradient>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* ════ 2. TENANT & RESIDENT CARD ════ */}
            <TouchableOpacity
              activeOpacity={0.90}
              onPress={() => handleSelectRole('TENANT')}
              style={[
                styles.card,
                styles.tenantCardShadow,
                selectedRole === 'TENANT' && styles.cardActiveTenant,
              ]}
            >
              <LinearGradient
                colors={selectedRole === 'TENANT' ? ['#ECFDF5', '#E6F4EA'] : ['#FFFFFF', '#F6FEF9']}
                style={styles.cardInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Header Row: 3D Artwork + Title + Status */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.iconBoxTenant}>
                    <Image
                      source={require('../../assets/tenant_3d.png')}
                      style={styles.card3dImg}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.cardTitleCol}>
                    <View style={styles.tenantBadge}>
                      <View style={styles.tenantDot} />
                      <Text style={styles.tenantBadgeText}>TENANT / RESIDENT</Text>
                    </View>
                    <Text style={styles.cardTitle}>Tenant & Resident</Text>
                    <Text style={styles.cardDesc}>
                      Online payments, digital receipts, mess & support
                    </Text>
                  </View>
                </View>

                {/* Capability Chips */}
                <View style={styles.chipsRow}>
                  <View style={styles.chipTenant}>
                    <Ionicons name="card" size={11} color="#059669" />
                    <Text style={styles.chipTextTenant}>1-Tap Pay</Text>
                  </View>
                  <View style={styles.chipTenant}>
                    <Ionicons name="receipt" size={11} color="#059669" />
                    <Text style={styles.chipTextTenant}>Receipts</Text>
                  </View>
                  <View style={styles.chipTenant}>
                    <Ionicons name="restaurant" size={11} color="#059669" />
                    <Text style={styles.chipTextTenant}>Mess Menu</Text>
                  </View>
                  <View style={styles.chipTenant}>
                    <Ionicons name="construct" size={11} color="#059669" />
                    <Text style={styles.chipTextTenant}>Complaints</Text>
                  </View>
                </View>

                {/* Primary Action Button */}
                <View style={styles.ctaButtonTenant}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.ctaGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.ctaButtonText}>Continue as Resident</Text>
                    <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                  </LinearGradient>
                </View>
              </LinearGradient>
            </TouchableOpacity>

          </View>

          {/* ─── Footer Security Note ─── */}
          <View style={styles.footerWrap}>
            <View style={styles.securityPill}>
              <Ionicons name="shield-checkmark" size={13} color="#7C3AED" />
              <Text style={styles.securityText}>256-Bit SSL Encrypted • Switch Anytime</Text>
            </View>
            <Text style={styles.bottomBrand}>Powered by Host<Text style={{ color: '#F59E0B' }}>ix</Text> • PG OS</Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    width: '100%',
    position: 'relative',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#7C3AED',
  },
  topSectionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorCircle1: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -width * 0.25,
    right: -width * 0.2,
  },
  decorCircle2: {
    position: 'absolute',
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: width * 0.275,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: -width * 0.18,
    left: -width * 0.12,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  logoImage: {
    width: '82%',
    height: '82%',
    borderRadius: 12,
  },
  appName: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  sheetSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  titleArea: {
    alignItems: 'center',
    marginBottom: 4,
  },
  portalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    marginBottom: 6,
  },
  portalPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.6,
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
    marginBottom: 16,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  ownerCardShadow: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4,
    borderColor: '#E0E7FF',
  },
  tenantCardShadow: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4,
    borderColor: '#D1FAE5',
  },
  cardActiveOwner: {
    borderColor: '#4F46E5',
    borderWidth: 2,
    shadowOpacity: 0.22,
    elevation: 7,
  },
  cardActiveTenant: {
    borderColor: '#059669',
    borderWidth: 2,
    shadowOpacity: 0.22,
    elevation: 7,
  },
  cardInner: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBoxOwner: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginRight: 12,
  },
  iconBoxTenant: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginRight: 12,
  },
  card3dImg: {
    width: 42,
    height: 42,
  },
  cardTitleCol: {
    flex: 1,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginBottom: 3,
  },
  ownerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4F46E5',
  },
  ownerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  tenantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginBottom: 3,
  },
  tenantDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
  },
  tenantBadgeText: {
    fontSize: 9,
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
    fontSize: 11.5,
    fontWeight: '400',
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
    paddingBottom: 12,
  },
  chipOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  chipTextOwner: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#4F46E5',
  },
  chipTenant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  chipTextTenant: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#059669',
  },
  ctaButtonOwner: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaButtonTenant: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  footerWrap: {
    alignItems: 'center',
    marginTop: 18,
    gap: 6,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  securityText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6D28D9',
  },
  bottomBrand: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});






