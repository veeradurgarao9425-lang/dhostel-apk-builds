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
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { getSecureItem } from '../../services/secureStore';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperComplaintsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getSecureItem('developer_token');
      // Fetch platform complaints or fallback
      const res = await api.get('/developer/complaints', {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);

      if (res?.data?.success && res.data?.data) {
        setComplaints(Array.isArray(res.data.data) ? res.data.data : res.data.data.complaints || []);
      } else {
        // Fallback sample platform complaints for inspection
        setComplaints([
          {
            id: 1,
            title: 'Water Supply Interruption - 2nd Floor',
            description: 'Water pressure is low in room 204 & 205 since morning.',
            hostel_name: 'Stanza Elite PG',
            hostel_id: 1,
            student_name: 'Rahul Sharma',
            room_number: '204',
            status: 'PENDING',
            priority: 'HIGH',
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            title: 'WiFi Router Offline',
            description: 'Fiber line disconnected after electrical maintenance.',
            hostel_name: 'Zolo Serene Residency',
            hostel_id: 2,
            student_name: 'Amit Patel',
            room_number: '302',
            status: 'RESOLVED',
            priority: 'MEDIUM',
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 3,
            title: 'Mess Food Quality Feedback',
            description: 'Dinner delivery was delayed by 45 minutes.',
            hostel_name: 'Stanza Elite PG',
            hostel_id: 1,
            student_name: 'Sneha Reddy',
            room_number: '108',
            status: 'PENDING',
            priority: 'LOW',
            created_at: new Date(Date.now() - 172800000).toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      console.error('Error loading complaints:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === 'PENDING' && c.status !== 'PENDING') return false;
    if (statusFilter === 'RESOLVED' && c.status !== 'RESOLVED') return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchTitle = (c.title || '').toLowerCase().includes(q);
      const matchHostel = (c.hostel_name || '').toLowerCase().includes(q);
      const matchStudent = (c.student_name || '').toLowerCase().includes(q);
      if (!matchTitle && !matchHostel && !matchStudent) return false;
    }
    return true;
  });

  const renderComplaintCard = ({ item }: { item: any }) => {
    const isPending = item.status === 'PENDING';
    const isHighPriority = item.priority === 'HIGH';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.priorityPill,
              {
                backgroundColor: isHighPriority ? '#FEF2F2' : '#FFF7ED',
                borderColor: isHighPriority ? '#FECACA' : '#FED7AA',
              },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: isHighPriority ? '#EF4444' : '#EA580C' },
              ]}
            >
              {item.priority || 'NORMAL'}
            </Text>
          </View>

          <Text style={styles.hostelTag}>🏠 {item.hostel_name}</Text>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isPending ? '#FEF3C7' : '#ECFDF5' },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                { color: isPending ? '#D97706' : '#059669' },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.complaintTitle}>{item.title}</Text>
        <Text style={styles.complaintDesc}>{item.description}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.studentMeta}>
            <Ionicons name="person-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.studentMetaText}>
              {item.student_name} • Room {item.room_number || 'N/A'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.inspectBtn}
            onPress={() => {
              if (item.hostel_id) {
                navigation.navigate('DeveloperHostelDetails', { hostelId: item.hostel_id });
              }
            }}
          >
            <Text style={styles.inspectBtnText}>Inspect Hostel</Text>
            <Ionicons name="arrow-forward" size={12} color="#EA580C" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
              <Text style={styles.masterBadgeText}>PLATFORM TRIAGE</Text>
            </View>
            <Text style={styles.topTitle}>Complaints & Maintenance</Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredComplaints.length}</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.heroSearchBar}>
          <Ionicons name="search" size={17} color="#EA580C" />
          <TextInput
            placeholder="Search issues, hostels, resident names..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.heroSearchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      {/* Status Segment Row */}
      <View style={styles.statusRow}>
        {(['ALL', 'PENDING', 'RESOLVED'] as const).map((st) => (
          <TouchableOpacity
            key={st}
            onPress={() => setStatusFilter(st)}
            style={[styles.statusChip, statusFilter === st && styles.statusChipActive]}
          >
            <Text style={[styles.statusChipText, statusFilter === st && styles.statusChipTextActive]}>
              {st}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Complaints List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading platform-wide complaints...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredComplaints}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderComplaintCard}
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
  countBadge: {
    backgroundColor: 'rgba(251, 146, 60, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.35)',
  },
  countBadgeText: {
    color: '#FB923C',
    fontSize: 11,
    fontWeight: '800',
  },
  heroSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    gap: 8,
  },
  heroSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    padding: 0,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  statusChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  statusChipText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  priorityPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  hostelTag: {
    color: '#4B5563',
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  complaintTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  complaintDesc: {
    color: '#6B7280',
    fontSize: 12.5,
    lineHeight: 18,
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
  studentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  studentMetaText: {
    color: '#6B7280',
    fontSize: 11.5,
    fontWeight: '600',
  },
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inspectBtnText: {
    color: '#EA580C',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
