import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  SafeAreaView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
            paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8,
            paddingBottom: insets.bottom + 16,
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
            <Ionicons name="sparkles" size={10} color="#6366F1" style={{ marginRight: 3 }} />
            <Text style={styles.experienceTagText}>HOSTIX ECOSYSTEM</Text>
          </View>

          <Text style={styles.title}>Choose Your Portal</Text>
          <Text style={styles.subtitle}>
            Select your account type to access personalized features.
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
                  ? ['#F5F3FF', '#EEF2FF']
                  : ['#FFFFFF', '#FAF5FF']
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
                <View style={styles.iconAndBadgeRow}>
                  <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="business-sharp" size={18} color="#6366F1" />
                  </View>
                  <View style={[styles.badgePill, { backgroundColor: '#EEF2FF' }]}>
                    <Text style={[styles.badgePillText, { color: '#4F46E5' }]}>
                      OWNER / ADMIN
                    </Text>
                  </View>
                </View>

                {activeRole === 'OWNER' && (
                  <Ionicons name="checkmark-circle" size={20} color="#6366F1" />
                )}
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.cardTitle}>PG & Hostel Owner</Text>
              <Text style={styles.cardDesc}>
                Property management, tenant allocation, digital KYC, and automated rent collection.
              </Text>

              {/* Feature Pills */}
              <View style={styles.featuresRow}>
                <View style={styles.featureChip}>
                  <Ionicons name="pie-chart-sharp" size={10} color="#6366F1" />
                  <Text style={styles.featureChipText}>Analytics</Text>
                </View>

                <View style={styles.featureChip}>
                  <Ionicons name="people-sharp" size={10} color="#6366F1" />
                  <Text style={styles.featureChipText}>Tenants</Text>
                </View>

                <View style={styles.featureChip}>
                  <Ionicons name="shield-checkmark-sharp" size={10} color="#6366F1" />
                  <Text style={styles.featureChipText}>Expenses</Text>
                </View>
              </View>

              {/* Action Button */}
              <View style={styles.actionRow}>
                <Text style={[styles.actionText, { color: '#6366F1' }]}>
                  Continue as Owner
                </Text>
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={styles.arrowGlowCircle}
                >
                  <Ionicons name="arrow-forward" size={13} color="#FFF" />
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
                  ? ['#ECFDF5', '#E6F4EA']
                  : ['#FFFFFF', '#F0FDF4']
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
                <View style={styles.iconAndBadgeRow}>
                  <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="person-sharp" size={18} color="#10B981" />
                  </View>
                  <View style={[styles.badgePill, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[styles.badgePillText, { color: '#059669' }]}>
                      TENANT / RESIDENT
                    </Text>
                  </View>
                </View>

                {activeRole === 'TENANT' && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.cardTitle}>Tenant & Student</Text>
              <Text style={styles.cardDesc}>
                Online rent payments, digital receipts, meal schedules, and complaint tracking.
              </Text>

              {/* Feature Chips */}
              <View style={styles.featuresRow}>
                <View style={styles.featureChip}>
                  <Ionicons name="card-sharp" size={10} color="#10B981" />
                  <Text style={styles.featureChipText}>1-Tap Pay</Text>
                </View>

                <View style={styles.featureChip}>
                  <MaterialCommunityIcons name="food-fork-drink" size={10} color="#10B981" />
                  <Text style={styles.featureChipText}>Mess Menu</Text>
                </View>

                <View style={styles.featureChip}>
                  <Ionicons name="construct-sharp" size={10} color="#10B981" />
                  <Text style={styles.featureChipText}>Support & Dues</Text>
                </View>
              </View>

              {/* Action Button */}
              <View style={styles.actionRow}>
                <Text style={[styles.actionText, { color: '#10B981' }]}>
                  Continue as Resident
                </Text>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.arrowGlowCircle}
                >
                  <Ionicons name="arrow-forward" size={13} color="#FFF" />
                </LinearGradient>
              </View>
            </LinearGradient>
          </TouchableOpacity>

        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <View style={styles.footerBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#6366F1" />
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
    top: -80,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(99, 102, 241, 0.07)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -60,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(16, 185, 129, 0.07)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoWrapper: {
    marginBottom: 8,
  },
  logoGlowRing: {
    padding: 2,
    borderRadius: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  experienceTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 1.0,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  cardsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  cardTouchable: {
    borderRadius: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  card: {
    borderRadius: 18,
    padding: 14,
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
    borderWidth: 2,
    shadowColor: '#6366F1',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  cardActiveTenant: {
    borderColor: '#10B981',
    borderWidth: 2,
    shadowColor: '#10B981',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featureChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  arrowGlowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
});


