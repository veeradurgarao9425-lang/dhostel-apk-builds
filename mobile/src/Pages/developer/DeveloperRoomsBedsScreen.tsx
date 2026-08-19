import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { developerService } from '../../services/developerService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperRoomsBedsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>({});
  const [rooms, setRooms] = useState<any[]>([]);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await developerService.getRoomsAndBeds();
      if (res?.success && res.data) {
        setSummary(res.data.summary || {});
        setRooms(res.data.rooms || []);
      }
    } catch (err) {
      console.error('Fetch rooms and beds error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const renderRoomItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Ionicons name="bed" size={18} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.roomTitle}>Room {item.room_number}</Text>
            <Text style={styles.hostelName}>{item.hostel_name} ({item.city || 'City'})</Text>
          </View>
        </View>

        <View style={styles.occPill}>
          <Text style={styles.occPillText}>
            {item.occupied_beds || 0} / {item.capacity || 1} Occupied
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Rooms & Bed Inventory</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.sumLabel}>Total Capacity</Text>
          <Text style={styles.sumVal}>{summary.total_beds || 0}</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#10B981' }]}>
          <Text style={[styles.sumLabel, { color: '#10B981' }]}>Occupied</Text>
          <Text style={[styles.sumVal, { color: '#10B981' }]}>{summary.occupied_beds || 0}</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#3B82F6' }]}>
          <Text style={[styles.sumLabel, { color: '#60A5FA' }]}>Available</Text>
          <Text style={[styles.sumVal, { color: '#60A5FA' }]}>{summary.available_beds || 0}</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#F59E0B' }]}>
          <Text style={[styles.sumLabel, { color: '#F59E0B' }]}>Occ Rate</Text>
          <Text style={[styles.sumVal, { color: '#F59E0B' }]}>{summary.occupancy_rate || 0}%</Text>
        </View>
      </View>

      {/* Rooms List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => String(item.room_id)}
          renderItem={renderRoomItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  topBarTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#131D31',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sumLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  sumVal: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
  },
  listContent: {
    padding: 14,
    paddingBottom: 30,
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 13,
  },
  card: {
    backgroundColor: '#131D31',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  hostelName: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  occPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  occPillText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
});
