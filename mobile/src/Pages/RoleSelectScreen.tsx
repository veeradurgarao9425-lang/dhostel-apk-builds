import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  ScrollView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';

const { width, height } = Dimensions.get('window');
const isSmall = height < 720;
const isTiny = height < 600;

export default function RoleSelectScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<'OWNER' | 'TENANT' | null>(null);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;
  const ownerScale = useRef(new Animated.Value(1)).current;
  const tenantScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    api.get('/health').catch(() => {});

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (navigation?.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Onboarding');
    }
  };

  const handlePressIn = (role: 'OWNER' | 'TENANT') => {
    const target = role === 'OWNER' ? ownerScale : tenantScale;
    Animated.spring(target, {
      toValue: 0.97,
      friction: 7,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (role: 'OWNER' | 'TENANT') => {
    const target = role === 'OWNER' ? ownerScale : tenantScale;
    Animated.spring(target, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const handleSelectRole = (role: 'OWNER' | 'TENANT') => {
    setSelectedRole(role);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    setTimeout(() => {
      if (role === 'OWNER') {
        navigation.navigate('Login', { role: 'OWNER' });
      } else {
        navigation.navigate('TenantHostelKey', { role: 'TENANT' });
      }
    }, 180);
  };

  const headerHeight = (isTiny ? 150 : isSmall ? 180 : Math.min(height * 0.26, 220)) + (insets.top > 0 ? insets.top : 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom + 32, 40),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        overScrollMode="always"
      >
        {/* ─── Modern Purple Top Header (Matching Login Screen) ─── */}
        <View style={[styles.topHeader, { height: headerHeight }]}>
          <LinearGradient
            colors={['#7C3AED', '#5F2EEA']}
            style={[
              StyleSheet.absoluteFillObject,
              styles.headerGradientContent,
              { paddingTop: insets.top > 0 ? insets.top + (isSmall ? 8 : 14) : 22 },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Ambient Background Circles */}
            <View style={styles.headerOrb1} />
            <View style={styles.headerOrb2} />

            {/* Back Button */}
            <TouchableOpacity
              onPress={handleGoBack}
              style={[
                styles.backButton,
                { top: insets.top > 0 ? insets.top + (isSmall ? 10 : 16) : 22 },
              ]}
              activeOpacity={0.8}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Logo and Brand */}
            <View style={styles.logoWrapper}>
              <View style={[styles.logoImageContainer, isSmall && { width: 54, height: 54, borderRadius: 15, marginBottom: 4 }]}>
                <Image
                  source={require('../../assets/HostixNew.png')}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.brandRow}>
                <Text style={[styles.appName, isSmall && { fontSize: 24 }]}>
                  Host<Text style={{ color: '#FCD34D' }}>ix</Text>
                </Text>
                <View style={styles.osPill}>
                  <Text style={styles.osPillText}>PG OS</Text>
                </View>
              </View>

              {!isTiny && (
                <Text style={[styles.tagline, isSmall && { fontSize: 11 }]}>
                  Smart PG & Hostel Management
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* ─── Bottom Content Sheet ─── */}
        <Animated.View
          style={[
            styles.sheetSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header Title Section — Exactly 2 Clean Lines */}
          <View style={styles.titleArea}>
            <Text style={[styles.sheetTitle, isSmall && { fontSize: 20 }]}>
              Choose Your Portal
            </Text>
            <Text style={[styles.sheetSubtitle, isSmall && { fontSize: 13 }]}>
              Select your role below to access your workspace
            </Text>
          </View>

          {/* ─── Elevated Luxury Role Cards ─── */}
          <View style={styles.cardsWrapper}>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* 1. OWNER / ADMIN CARD                                   */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Animated.View style={{ transform: [{ scale: ownerScale }] }}>
              <TouchableOpacity
                activeOpacity={0.92}
                onPressIn={() => handlePressIn('OWNER')}
                onPressOut={() => handlePressOut('OWNER')}
                onPress={() => handleSelectRole('OWNER')}
                style={[
                  styles.card,
                  selectedRole === 'OWNER' && styles.cardSelectedOwner,
                ]}
              >
                {/* Top Info Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.iconBoxOwner}>
                    <Image
                      source={require('../../assets/hostel_only_3d.png')}
                      style={styles.card3dImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.cardTitleCol}>
                    <View style={styles.roleTagOwner}>
                      <View style={styles.dotOwner} />
                      <Text style={styles.roleTagOwnerText}>OWNER & MANAGER</Text>
                    </View>
                    <Text style={[styles.cardTitle, isSmall && { fontSize: 16.5 }]}>
                      PG & Hostel Owner
                    </Text>
                    <Text style={[styles.cardDesc, isSmall && { fontSize: 11.5 }]}>
                      Manage rooms, automate rent dues, tenant KYC & financials
                    </Text>
                  </View>
                </View>

                {/* Capability Chips — Tight Border Pills Wrapping Text */}
                <View style={styles.chipsRow}>
                  <View style={styles.inlineChip}>
                    <Ionicons name="business" size={11.5} color="#7C3AED" />
                    <Text style={styles.inlineChipText}>Rooms & Beds</Text>
                  </View>
                  <View style={styles.inlineChip}>
                    <Ionicons name="card" size={11.5} color="#7C3AED" />
                    <Text style={styles.inlineChipText}>Rent Dues</Text>
                  </View>
                  <View style={styles.inlineChip}>
                    <Ionicons name="people" size={11.5} color="#7C3AED" />
                    <Text style={styles.inlineChipText}>Tenant KYC</Text>
                  </View>
                  <View style={styles.inlineChip}>
                    <Ionicons name="pie-chart" size={11.5} color="#7C3AED" />
                    <Text style={styles.inlineChipText}>Reports</Text>
                  </View>
                </View>

                {/* Primary CTA Button */}
                <View style={styles.ctaButtonOwner}>
                  <LinearGradient
                    colors={['#7C3AED', '#5F2EEA']}
                    style={styles.ctaGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.ctaButtonText}>Continue as Owner</Text>
                    <View style={styles.ctaArrowCircle}>
                      <Ionicons name="arrow-forward" size={13} color="#7C3AED" />
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* 2. TENANT / RESIDENT CARD                               */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Animated.View style={{ transform: [{ scale: tenantScale }] }}>
              <TouchableOpacity
                activeOpacity={0.92}
                onPressIn={() => handlePressIn('TENANT')}
                onPressOut={() => handlePressOut('TENANT')}
                onPress={() => handleSelectRole('TENANT')}
                style={[
                  styles.card,
                  selectedRole === 'TENANT' && styles.cardSelectedTenant,
                ]}
              >
                {/* Top Info Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.iconBoxTenant}>
                    <Image
                      source={require('../../assets/tenant_3d.png')}
                      style={styles.card3dImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.cardTitleCol}>
                    <View style={styles.roleTagTenant}>
                      <View style={styles.dotTenant} />
                      <Text style={styles.roleTagTenantText}>TENANT & RESIDENT</Text>
                    </View>
                    <Text style={[styles.cardTitle, isSmall && { fontSize: 16.5 }]}>
                      Tenant & Resident
                    </Text>
                    <Text style={[styles.cardDesc, isSmall && { fontSize: 11.5 }]}>
                      Instant UPI payments, digital receipts, daily meals & tickets
                    </Text>
                  </View>
                </View>

                {/* Capability Chips — Tight Border Pills Wrapping Text */}
                <View style={styles.chipsRow}>
                  <View style={styles.inlineChip}>
                    <Ionicons name="flash" size={11.5} color="#059669" />
                    <Text style={styles.inlineChipText}>1-Tap Pay</Text>
                  </View>
                  <View style={styles.inlineChip}>
                    <Ionicons name="receipt" size={11.5} color="#059669" />
                    <Text style={styles.inlineChipText}>Receipts</Text>
                  </View>
                  <View style={styles.inlineChip}>
                    <Ionicons name="restaurant" size={11.5} color="#059669" />
                    <Text style={styles.inlineChipText}>Mess Menu</Text>
                  </View>
                  <View style={styles.inlineChip}>
                    <Ionicons name="construct" size={11.5} color="#059669" />
                    <Text style={styles.inlineChipText}>Complaints</Text>
                  </View>
                </View>

                {/* Primary CTA Button */}
                <View style={styles.ctaButtonTenant}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.ctaGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.ctaButtonText}>Continue as Resident</Text>
                    <View style={styles.ctaArrowCircle}>
                      <Ionicons name="arrow-forward" size={13} color="#059669" />
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </Animated.View>

          </View>

          {/* ─── Clean Security & Platform Footer ─── */}
          <View style={styles.footerWrap}>
            <View style={styles.securityPill}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#7C3AED" />
              <Text style={styles.securityText}>256-Bit SSL Encrypted • Fast Setup</Text>
            </View>
            <Text style={styles.bottomBrand}>
              Powered by Host<Text style={{ color: '#F59E0B', fontWeight: '800' }}>ix</Text> • Enterprise Platform
            </Text>
          </View>

        </Animated.View>
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
  topHeader: {
    width: '100%',
    position: 'relative',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
    backgroundColor: '#7C3AED',
  },
  headerGradientContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },
  headerOrb1: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -width * 0.25,
    right: -width * 0.2,
  },
  headerOrb2: {
    position: 'absolute',
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: width * 0.275,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: -width * 0.2,
    left: -width * 0.15,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImageContainer: {
    width: 62,
    height: 62,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoImage: {
    width: '80%',
    height: '80%',
    borderRadius: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  osPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  osPillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  tagline: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  sheetSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleArea: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  cardsWrapper: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  cardSelectedOwner: {
    borderColor: '#7C3AED',
    borderWidth: 1.8,
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6,
  },
  cardSelectedTenant: {
    borderColor: '#059669',
    borderWidth: 1.8,
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconBoxOwner: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  iconBoxTenant: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  card3dImage: {
    width: 42,
    height: 42,
  },
  cardTitleCol: {
    flex: 1,
  },
  roleTagOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginBottom: 3,
  },
  dotOwner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#7C3AED',
  },
  roleTagOwnerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  roleTagTenant: {
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
  dotTenant: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
  },
  roleTagTenantText: {
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
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 11.5,
    fontWeight: '400',
    color: '#64748B',
    lineHeight: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 2,
    marginBottom: 13,
  },
  inlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8.5,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inlineChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  ctaButtonOwner: {
    borderRadius: 13,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaButtonTenant: {
    borderRadius: 13,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  ctaArrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#7C3AED',
  },
  bottomBrand: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
