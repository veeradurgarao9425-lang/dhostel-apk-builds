import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
  Animated,
  ScrollView,
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

  // Press animation values for subtle interactive spring feedback
  const ownerScale = useRef(new Animated.Value(1)).current;
  const tenantScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Pre-warm backend connection matching LoginScreen
    api.get('/health').catch(() => {});
  }, []);

  const handlePressIn = (target: Animated.Value) => {
    Animated.spring(target, {
      toValue: 0.975,
      friction: 8,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (target: Animated.Value) => {
    Animated.spring(target, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const handleSelectOwner = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    navigation.navigate('Login', { role: 'OWNER' });
  };

  const handleSelectTenant = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    navigation.navigate('TenantHostelKey', { role: 'TENANT' });
  };

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (navigation?.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Onboarding');
    }
  };

  const headerHeight = Math.max(
    Math.min(height * 0.36 + (insets.top > 0 ? insets.top : 0), height * 0.38),
    isSmall ? 185 : 220
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Outer Full-Page ScrollView for Small & All Mobile Devices ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 36) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
        nestedScrollEnabled={true}
      >
        {/* ── Exact Purple Gradient Header Matching LoginScreen ── */}
        <View style={[styles.topSection, { height: headerHeight }]}>
          <LinearGradient
            colors={['#7C3AED', '#5F2EEA']}
            style={[
              StyleSheet.absoluteFillObject,
              styles.topSectionContent,
              { paddingTop: insets.top > 0 ? insets.top + 10 : 28 },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Back Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleGoBack}
              style={[styles.backBtn, { top: insets.top > 0 ? insets.top + 10 : 20 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Decorative Background Circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            {/* Hostix Logo & Branding */}
            <View style={styles.logoWrapper}>
              <View
                style={[
                  styles.logoImageContainer,
                  isSmall && { width: 68, height: 68, borderRadius: 16, marginBottom: 8 },
                ]}
              >
                <Image
                  source={require('../../assets/HostixNew.png')}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={[styles.appName, isSmall && { fontSize: 26, marginBottom: 2 }]}>
                Host<Text style={{ color: '#FCD34D' }}>ix</Text>
              </Text>
              {!isTiny && (
                <Text style={[styles.tagline, isSmall && { fontSize: 12 }]}>
                  Smart PG & Hostel Management
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* ── Clean White Portal Selection Canvas ── */}
        <View style={styles.contentSection}>
          {/* Welcome Title (Adjusted spacing) */}
          <View style={styles.titleWrapper}>
            <Text style={[styles.mainTitle, isSmall && { fontSize: 21 }]}>
              Welcome to Hostix 👋
            </Text>
            <Text style={[styles.subtitle, isSmall && { fontSize: 13 }]}>
              Please choose your role to continue
            </Text>
          </View>

          {/* ── The Two Role Bridges ── */}
          <View style={styles.bridgeContainer}>

            {/* 1. PG & HOSTEL OWNER BRIDGE */}
            <Animated.View style={{ transform: [{ scale: ownerScale }] }}>
              <TouchableOpacity
                activeOpacity={0.92}
                onPressIn={() => handlePressIn(ownerScale)}
                onPressOut={() => handlePressOut(ownerScale)}
                onPress={handleSelectOwner}
                style={styles.roleCard}
              >
                {/* Meaningful 3D Owner Illustration */}
                <View style={styles.iconCircleOwner}>
                  <Image
                    source={require('../../assets/owner_role_3d.jpg')}
                    style={styles.roleIconImage}
                    resizeMode="cover"
                  />
                </View>

                {/* Center Info */}
                <View style={styles.roleInfoCol}>
                  <View style={styles.badgeOwner}>
                    <Text style={styles.badgeOwnerText}>MANAGEMENT</Text>
                  </View>
                  <Text style={[styles.roleTitle, isSmall && { fontSize: 16 }]}>
                    PG & Hostel Owner
                  </Text>
                  <Text style={styles.roleSubtitle}>
                    Manage rooms, beds, rent dues & tenants
                  </Text>
                </View>

                {/* Right Arrow Action */}
                <View style={styles.arrowCircleOwner}>
                  <Ionicons name="arrow-forward" size={16} color="#7C3AED" />
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Subtle Bridge Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 2. TENANT & RESIDENT BRIDGE */}
            <Animated.View style={{ transform: [{ scale: tenantScale }] }}>
              <TouchableOpacity
                activeOpacity={0.92}
                onPressIn={() => handlePressIn(tenantScale)}
                onPressOut={() => handlePressOut(tenantScale)}
                onPress={handleSelectTenant}
                style={styles.roleCard}
              >
                {/* Meaningful 3D Tenant Illustration */}
                <View style={styles.iconCircleTenant}>
                  <Image
                    source={require('../../assets/tenant_role_3d.jpg')}
                    style={styles.roleIconImage}
                    resizeMode="cover"
                  />
                </View>

                {/* Center Info */}
                <View style={styles.roleInfoCol}>
                  <View style={styles.badgeTenant}>
                    <Text style={styles.badgeTenantText}>RESIDENT</Text>
                  </View>
                  <Text style={[styles.roleTitle, isSmall && { fontSize: 16 }]}>
                    Tenant & Resident
                  </Text>
                  <Text style={styles.roleSubtitle}>
                    Pay rent online, view food menu & notices
                  </Text>
                </View>

                {/* Right Arrow Action */}
                <View style={styles.arrowCircleTenant}>
                  <Ionicons name="arrow-forward" size={16} color="#059669" />
                </View>
              </TouchableOpacity>
            </Animated.View>

          </View>

          {/* ── Matching Bottom Branding ── */}
          <View style={styles.bottomBranding}>
            <Text style={styles.bottomBrandingText}>
              Powered by Host<Text style={{ color: '#FCD34D' }}>ix</Text> • PG OS
            </Text>
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
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#7C3AED',
  },
  topSectionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 10,
  },
  decorCircle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    top: -60,
    right: -50,
  },
  decorCircle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    bottom: -40,
    left: -30,
  },
  logoWrapper: {
    alignItems: 'center',
  },
  logoImageContainer: {
    width: 82,
    height: 82,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  contentSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: isSmall ? 14 : 20,
    width: '100%',
  },
  titleWrapper: {
    marginBottom: isSmall ? 10 : 14,
  },
  mainTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
  },
  bridgeContainer: {
    gap: 8,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  iconCircleOwner: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    overflow: 'hidden',
  },
  iconCircleTenant: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    overflow: 'hidden',
  },
  roleIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  roleInfoCol: {
    flex: 1,
  },
  badgeOwner: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 3.5,
  },
  badgeOwnerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  badgeTenant: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 3.5,
  },
  badgeTenantText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  roleTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  roleSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  arrowCircleOwner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  arrowCircleTenant: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    paddingHorizontal: 12,
    textTransform: 'uppercase',
  },
  bottomBranding: {
    alignItems: 'center',
    marginTop: 22,
  },
  bottomBrandingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
