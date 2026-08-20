import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
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

export default function DeveloperRatingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      // Sample platform-wide reviews
      setReviews([
        {
          id: 1,
          hostel_name: 'Stanza Elite PG',
          hostel_id: 1,
          student_name: 'Rahul Sharma',
          rating: 4.8,
          comment: 'Very clean rooms, high-speed WiFi, and the warden is always helpful!',
          category: 'Facilities & Cleanliness',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          hostel_name: 'Zolo Serene Residency',
          hostel_id: 2,
          student_name: 'Priya Nair',
          rating: 4.5,
          comment: 'Food is tasty and nutritious. Security biometric at entrance gives great safety.',
          category: 'Food & Security',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 3,
          hostel_name: 'Stanza Elite PG',
          hostel_id: 1,
          student_name: 'Vikram Singh',
          rating: 4.2,
          comment: 'Good overall value. Power backup works reliably during cuts.',
          category: 'Power & Maintenance',
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const renderReviewCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.starsRow}>
          <Ionicons name="star" size={15} color="#F59E0B" />
          <Text style={styles.ratingNumText}>{item.rating}</Text>
          <Text style={styles.ratingMaxText}>/ 5.0</Text>
        </View>

        <Text style={styles.hostelNameText}>🏠 {item.hostel_name}</Text>
      </View>

      <Text style={styles.commentText}>"{item.comment}"</Text>

      <View style={styles.cardFooter}>
        <View style={styles.authorRow}>
          <Ionicons name="person-circle" size={16} color="#6B7280" />
          <Text style={styles.authorText}>{item.student_name}</Text>
        </View>
        <View style={styles.catPill}>
          <Text style={styles.catPillText}>{item.category}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#EA580C" />

      {/* ─────────────────── EXECUTIVE HERO HEADER ─────────────────── */}
      <LinearGradient
        colors={['#EA580C', '#D97706', '#B45309']}
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
              <Text style={styles.masterBadgeText}>COMMUNITY FEEDBACK</Text>
            </View>
            <Text style={styles.topTitle}>Ratings & Sentiment</Text>
          </View>

          <View style={styles.ratingSummaryBadge}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={styles.ratingSummaryText}>4.6 AVG</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Sentiment Overview Cards */}
      <View style={styles.sentimentRow}>
        <View style={styles.sentimentBox}>
          <Text style={[styles.sentimentNum, { color: '#10B981' }]}>94%</Text>
          <Text style={styles.sentimentLabel}>Positive Sentiment</Text>
        </View>
        <View style={styles.sentimentBox}>
          <Text style={[styles.sentimentNum, { color: '#F59E0B' }]}>4.6 / 5</Text>
          <Text style={styles.sentimentLabel}>Platform Score</Text>
        </View>
        <View style={styles.sentimentBox}>
          <Text style={[styles.sentimentNum, { color: '#3B82F6' }]}>128</Text>
          <Text style={styles.sentimentLabel}>Total Reviews</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading ratings & reviews...</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderReviewCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
        />
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
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  masterBadgeCrown: {
    fontSize: 10,
  },
  masterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  ratingSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  ratingSummaryText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '900',
  },
  sentimentRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sentimentBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sentimentNum: {
    fontSize: 16,
    fontWeight: '900',
  },
  sentimentLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
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
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingNumText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '900',
  },
  ratingMaxText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '700',
  },
  hostelNameText: {
    color: '#111827',
    fontSize: 12.5,
    fontWeight: '800',
  },
  commentText: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  authorText: {
    color: '#6B7280',
    fontSize: 11.5,
    fontWeight: '600',
  },
  catPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catPillText: {
    color: '#4B5563',
    fontSize: 10,
    fontWeight: '700',
  },
});
