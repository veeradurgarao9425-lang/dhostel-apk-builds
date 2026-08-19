import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { developerService } from '../../services/developerService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperMessScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [hostels, setHostels] = useState<any[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('Today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const DAYS = ['Today', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchHostels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await developerService.getHostels({ page: 1, limit: 50 });
      if (res?.success && res.data) {
        setHostels(res.data);
        if (res.data.length > 0 && selectedHostelId === null) {
          setSelectedHostelId(res.data[0].hostel_id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching mess hostels:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedHostelId]);

  useEffect(() => {
    fetchHostels();
  }, [fetchHostels]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHostels();
  };

  const selectedHostel = hostels.find((h) => h.hostel_id === selectedHostelId) || hostels[0];

  const SAMPLE_MEALS = [
    {
      type: 'BREAKFAST',
      time: '7:30 AM - 9:30 AM',
      items: 'Idli & Vada with Sambar, Coconut Chutney, Tea / Coffee / Milk',
      icon: 'cafe-outline' as const,
      color: '#EA580C',
    },
    {
      type: 'LUNCH',
      time: '12:30 PM - 2:30 PM',
      items: 'Steamed Basmati Rice, Dal Tadka, Paneer Butter Masala / Chicken Curry, Curd, Papad',
      icon: 'restaurant-outline' as const,
      color: '#059669',
    },
    {
      type: 'EVENING SNACKS',
      time: '5:00 PM - 6:30 PM',
      items: 'Veg Cutlet / Samosa, Ginger Chai',
      icon: 'fast-food-outline' as const,
      color: '#D97706',
    },
    {
      type: 'DINNER',
      time: '7:30 PM - 9:30 PM',
      items: 'Phulka Roti, Jeera Rice, Mixed Vegetable Curry, Rasam, Gulab Jamun',
      icon: 'moon-outline' as const,
      color: '#7C3AED',
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
        <View style={styles.hdrOrb1} />
        <View style={styles.hdrOrb2} />

        <View style={styles.topBarRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.masterBadge}>
              <Text style={styles.masterBadgeCrown}>👑</Text>
              <Text style={styles.masterBadgeText}>FOOD & MESS</Text>
            </View>
            <Text style={styles.topTitle}>Mess Menu Governance</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (selectedHostel?.hostel_id) {
                navigation.navigate('DeveloperHostelDetails', { hostelId: selectedHostel.hostel_id });
              }
            }}
            style={styles.inspectBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="business" size={14} color="#FB923C" />
            <Text style={styles.inspectBtnText}>Hostel</Text>
          </TouchableOpacity>
        </View>

        {/* Hostel Selector Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hostelScroll}
        >
          {hostels.map((h) => {
            const isSel = selectedHostelId === h.hostel_id;
            return (
              <TouchableOpacity
                key={h.hostel_id}
                onPress={() => setSelectedHostelId(h.hostel_id)}
                style={[styles.hostelChip, isSel && styles.hostelChipActive]}
              >
                <Text style={[styles.hostelChipText, isSel && styles.hostelChipTextActive]}>
                  🏠 {h.hostel_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* Days Selector */}
      <View style={styles.daysRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {DAYS.map((d) => {
            const isSel = selectedDay === d;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setSelectedDay(d)}
                style={[styles.dayChip, isSel && styles.dayChipActive]}
              >
                <Text style={[styles.dayChipText, isSel && styles.dayChipTextActive]}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading mess menu schedules...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
        >
          <View style={styles.hostelMetaCard}>
            <View style={styles.hostelIconBox}>
              <Ionicons name="restaurant" size={22} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hostelNameText}>{selectedHostel?.hostel_name || 'Selected Property'}</Text>
              <Text style={styles.hostelSubText}>
                Active Menu Plan • {selectedDay}'s Daily Catering Schedule
              </Text>
            </View>
          </View>

          {SAMPLE_MEALS.map((meal, idx) => (
            <View key={idx} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={[styles.mealIconWrap, { backgroundColor: `${meal.color}15` }]}>
                  <Ionicons name={meal.icon} size={18} color={meal.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealType}>{meal.type}</Text>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>

              <View style={styles.mealDivider} />

              <Text style={styles.mealItemsText}>{meal.items}</Text>
            </View>
          ))}
        </ScrollView>
      )}
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
    paddingBottom: 16,
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
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  masterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 146, 60, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 2,
  },
  masterBadgeCrown: {
    fontSize: 9,
  },
  masterBadgeText: {
    color: '#FB923C',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 146, 60, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.35)',
  },
  inspectBtnText: {
    color: '#FB923C',
    fontSize: 11.5,
    fontWeight: '800',
  },
  hostelScroll: {
    gap: 6,
    paddingTop: 2,
  },
  hostelChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  hostelChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#FB923C',
  },
  hostelChipText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '700',
  },
  hostelChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  daysRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
  },
  daysScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  dayChipText: {
    color: '#6B7280',
    fontSize: 11.5,
    fontWeight: '700',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  hostelMetaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  hostelIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  hostelNameText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  hostelSubText: {
    color: '#6B7280',
    fontSize: 11.5,
    marginTop: 2,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealType: {
    color: '#111827',
    fontSize: 13.5,
    fontWeight: '900',
  },
  mealTime: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 1,
  },
  activeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#059669',
    fontSize: 9.5,
    fontWeight: '900',
  },
  mealDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  mealItemsText: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
