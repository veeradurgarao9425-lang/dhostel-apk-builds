import React from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function RoleSelectScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const handleSelectRole = (role: 'OWNER' | 'TENANT') => {
    if (role === 'OWNER') {
      navigation.navigate('Login', { role: 'OWNER' });
    } else {
      navigation.navigate('TenantLogin', { role: 'TENANT' });
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top + 10 : 10 }]}>
        
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/HostixNew.jpeg')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.badgeTag}>HOSTIX EXPERIENCE</Text>
          <Text style={styles.title}>Choose Account Type</Text>
          <Text style={styles.subtitle}>
            Select how you will be using the app today to get a customized experience.
          </Text>
        </View>

        {/* Options Cards */}
        <View style={styles.cardsContainer}>
          
          {/* Hostel Owner Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.cardWrapper}
            onPress={() => handleSelectRole('OWNER')}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F5F3FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.card, styles.ownerCardBorder]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="business-sharp" size={22} color="#6366F1" />
                </View>
                <View style={styles.roleTagOwner}>
                  <Text style={styles.roleTagOwnerText}>OWNER / ADMIN</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>PG & Hostel Owner</Text>
              <Text style={styles.cardDescription}>
                Manage your properties, track tenant room allocations, and view analytics.
              </Text>

              <View style={styles.actionRow}>
                <Text style={[styles.actionText, { color: '#6366F1' }]}>Continue as Owner</Text>
                <View style={[styles.arrowCircle, { backgroundColor: '#6366F1' }]}>
                  <Ionicons name="arrow-forward" size={14} color="#FFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Tenant / Resident Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.cardWrapper}
            onPress={() => handleSelectRole('TENANT')}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F0FDF4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.card, styles.tenantCardBorder]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="person-sharp" size={22} color="#10B981" />
                </View>
                <View style={styles.roleTagTenant}>
                  <Text style={styles.roleTagTenantText}>TENANT / RESIDENT</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Tenant & Student</Text>
              <Text style={styles.cardDescription}>
                View room details, pay rent online, request passes, and check food menu.
              </Text>

              <View style={styles.actionRow}>
                <Text style={[styles.actionText, { color: '#10B981' }]}>Continue as Tenant</Text>
                <View style={[styles.arrowCircle, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="arrow-forward" size={14} color="#FFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={14} color="#94A3B8" />
          <Text style={styles.footerText}>You can switch accounts anytime later.</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  badgeTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
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
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 30,
  },
  cardWrapper: {
    borderRadius: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
  },
  ownerCardBorder: {
    borderColor: '#E0E7FF',
  },
  tenantCardBorder: {
    borderColor: '#D1FAE5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTagOwner: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  roleTagOwnerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.5,
  },
  roleTagTenant: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  roleTagTenantText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.6)',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
  },
});
