import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  SafeAreaView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function RoleSelectScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeRole, setActiveRole] = useState<'OWNER' | 'TENANT' | null>(null);

  const handleSelectRole = (role: 'OWNER' | 'TENANT') => {
    setActiveRole(role);
    setTimeout(() => {
      if (role === 'OWNER') {
        navigation.navigate('Login', { role: 'OWNER' });
      } else {
        navigation.navigate('TenantLogin', { role: 'TENANT' });
      }
    }, 150);
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Background Ambient Glow Accents */}
      <View style={styles.ambientGlowTop} pointerEvents="none" />
      <View style={styles.ambientGlowBottom} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Platform.OS === 'android' ? insets.top + 16 : 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Branding & Header */}
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={['#EEF2FF', '#E0E7FF']}
              style={styles.logoGlowRing}
            >
              <View style={styles.logoBadge}>
                <Image
                  source={require('../../assets/HostixNew.jpeg')}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>
            </LinearGradient>
          </View>

          <View style={styles.experienceTagContainer}>
            <Ionicons name="sparkles" size={12} color="#6366F1" style={{ marginRight: 4 }} />
            <Text style={styles.experienceTagText}>HOSTIX ECOSYSTEM</Text>
          </View>

          <Text style={styles.title}>Choose Your Portal</Text>
          <Text style={styles.subtitle}>
            Select your account type to access personalized dashboards and tailored features.
          </Text>
        </View>

        {/* Option Cards */}
        <View style={styles.cardsContainer}>
          
          {/* Hostel Owner Card */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => handleSelectRole('OWNER')}
            style={styles.cardTouchable}
          >
            <LinearGradient
              colors={
                activeRole === 'OWNER'
                  ? ['#1E1B4B', '#312E81']
                  : ['#FFFFFF', '#FAF5FF', '#F5F3FF']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.card,
                styles.ownerCardBorder,
                activeRole === 'OWNER' && styles.cardActiveOwner,
              ]}
            >
              {/* Top Banner Tag */}
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor:
                        activeRole === 'OWNER' ? 'rgba(255, 255, 255, 0.15)' : '#EEF2FF',
                    },
                  ]}
                >
                  <Ionicons
                    name="business-sharp"
                    size={24}
                    color={activeRole === 'OWNER' ? '#A5B4FC' : '#6366F1'}
                  />
                </View>
                <View
                  style={[
                    styles.badgePill,
                    {
                      backgroundColor:
                        activeRole === 'OWNER' ? 'rgba(99, 102, 241, 0.3)' : '#EEF2FF',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgePillText,
                      { color: activeRole === 'OWNER' ? '#C7D2FE' : '#4F46E5' },
                    ]}
                  >
                    OWNER / ADMIN
                  </Text>
                </View>
              </View>

              {/* Title & Subtitle */}
              <Text
                style={[
                  styles.cardTitle,
                  { color: activeRole === 'OWNER' ? '#FFFFFF' : '#0F172A' },
                ]}
              >
                PG & Hostel Owner
              </Text>
              <Text
                style={[
                  styles.cardDesc,
                  { color: activeRole === 'OWNER' ? '#C7D2FE' : '#64748B' },
                ]}
              >
                Complete property management, tenant allocation, digital KYC, and automated rent collection.
              </Text>

              {/* Feature Pills */}
              <View style={styles.featuresRow}>
                <View
                  style={[
                    styles.featureChip,
                    {
                      backgroundColor:
                        activeRole === 'OWNER' ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9',
                    },
                  ]}
                >
                  <Ionicons
                    name="pie-chart-sharp"
                    size={12}
                    color={activeRole === 'OWNER' ? '#A5B4FC' : '#6366F1'}
                  />
                  <Text
                    style={[
                      styles.featureChipText,
                      { color: activeRole === 'OWNER' ? '#E0E7FF' : '#334155' },
                    ]}
                  >
                    Revenue Analytics
                  </Text>
                </View>

                <View
                  style={[
                    styles.featureChip,
                    {
                      backgroundColor:
                        activeRole === 'OWNER' ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9',
                    },
                  ]}
                >
                  <Ionicons
                    name="people-sharp"
                    size={12}
                    color={activeRole === 'OWNER' ? '#A5B4FC' : '#6366F1'}
                  />
                  <Text
                    style={[
                      styles.featureChipText,
                      { color: activeRole === 'OWNER' ? '#E0E7FF' : '#334155' },
                    ]}
                  >
                    Tenant Directory
                  </Text>
                </View>

                <View
                  style={[
                    styles.featureChip,
                    {
                      backgroundColor:
                        activeRole === 'OWNER' ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9',
                    },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-sharp"
                    size={12}
                    color={activeRole === 'OWNER' ? '#A5B4FC' : '#6366F1'}
                  />
                  <Text
                    style={[
                      styles.featureChipText,
                      { color: activeRole === 'OWNER' ? '#E0E7FF' : '#334155' },
                    ]}
                  >
                    Staff & Expenses
                  </Text>
                </View>
              </View>

              {/* Action Button */}
              <View
                style={[
                  styles.actionRow,
                  {
                    borderTopColor:
                      activeRole === 'OWNER' ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: activeRole === 'OWNER' ? '#818CF8' : '#6366F1' },
                  ]}
                >
                  Continue as Owner
                </Text>
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={styles.arrowGlowCircle}
                >
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
                </LinearGradient>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Tenant / Resident Card */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => handleSelectRole('TENANT')}
            style={styles.cardTouchable}
          >
            <LinearGradient
              colors={
                activeRole === 'TENANT'
                  ? ['#064E3B', '#047857']
                  : ['#FFFFFF', '#F0FDF4', '#ECFDF5']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.card,
                styles.tenantCardBorder,
                activeRole === 'TENANT' && styles.cardActiveTenant,
              ]}
            >
              {/* Top Banner Tag */}
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor:
                        activeRole === 'TENANT' ? 'rgba(255, 255, 255, 0.15)' : '#ECFDF5',
                    },
                  ]}
                >
                  <Ionicons
                    name="person-sharp"
                    size={24}
                    color={activeRole === 'TENANT' ? '#6EE7B7' : '#10B981'}
                  />
                </View>
                <View
                  style={[
                    styles.badgePill,
                    {
                      backgroundColor:
                        activeRole === 'TENANT' ? 'rgba(16, 185, 129, 0.3)' : '#ECFDF5',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgePillText,
                      { color: activeRole === 'TENANT' ? '#A7F3D0' : '#059669' },
                    ]}
                  >
                    TENANT / RESIDENT
                  </Text>
                </View>
              </View>

              {/* Title & Subtitle */}
              <Text
                style={[
                  styles.cardTitle,
                  { color: activeRole === 'TENANT' ? '#FFFFFF' : '#0F172A' },
                ]}
              >
                Tenant & Student
              </Text>
              <Text
                style={[
                  styles.cardDesc,
                  { color: activeRole === 'TENANT' ? '#A7F3D0' : '#64748B' },
                ]}
              >
                Seamless online rent payments, digital receipts, meal schedules, and complaint tracking.
              </Text>

              {/* Feature Chips */}
              <View style={styles.featuresRow}>
                <View
                  style={[
                    styles.featureChip,
                    {
                      backgroundColor:
                        activeRole === 'TENANT' ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9',
                    },
                  ]}
                >
                  <Ionicons
                    name="card-sharp"
                    size={12}
                    color={activeRole === 'TENANT' ? '#6EE7B7' : '#10B981'}
                  />
                  <Text
                    style={[
                      styles.featureChipText,
                      { color: activeRole === 'TENANT' ? '#D1FAE5' : '#334155' },
                    ]}
                  >
                    1-Tap Rent Pay
                  </Text>
                </View>

                <View
                  style={[
                    styles.featureChip,
                    {
                      backgroundColor:
                        activeRole === 'TENANT' ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="food-fork-drink"
                    size={12}
                    color={activeRole === 'TENANT' ? '#6EE7B7' : '#10B981'}
                  />
                  <Text
                    style={[
                      styles.featureChipText,
                      { color: activeRole === 'TENANT' ? '#D1FAE5' : '#334155' },
                    ]}
                  >
                    Mess Food Menu
                  </Text>
                </View>

                <View
                  style={[
                    styles.featureChip,
                    {
                      backgroundColor:
                        activeRole === 'TENANT' ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9',
                    },
                  ]}
                >
                  <Ionicons
                    name="construct-sharp"
                    size={12}
                    color={activeRole === 'TENANT' ? '#6EE7B7' : '#10B981'}
                  />
                  <Text
                    style={[
                      styles.featureChipText,
                      { color: activeRole === 'TENANT' ? '#D1FAE5' : '#334155' },
                    ]}
                  >
                    Support & Dues
                  </Text>
                </View>
              </View>

              {/* Action Button */}
              <View
                style={[
                  styles.actionRow,
                  {
                    borderTopColor:
                      activeRole === 'TENANT' ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: activeRole === 'TENANT' ? '#34D399' : '#10B981' },
                  ]}
                >
                  Continue as Resident
                </Text>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.arrowGlowCircle}
                >
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
                </LinearGradient>
              </View>
            </LinearGradient>
          </TouchableOpacity>

        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <View style={styles.footerBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#6366F1" />
            <Text style={styles.footerText}>
              256-Bit Encrypted • Switch Roles Anytime
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWrapper: {
    marginBottom: 14,
  },
  logoGlowRing: {
    padding: 3,
    borderRadius: 22,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  experienceTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  experienceTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  cardsContainer: {
    gap: 18,
    marginBottom: 24,
  },
  cardTouchable: {
    borderRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
  },
  ownerCardBorder: {
    borderColor: '#E0E7FF',
  },
  tenantCardBorder: {
    borderColor: '#D1FAE5',
  },
  cardActiveOwner: {
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  cardActiveTenant: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
    marginBottom: 16,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  featureChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  arrowGlowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
});

