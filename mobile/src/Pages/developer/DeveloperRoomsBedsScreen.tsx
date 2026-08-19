import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { developerService } from '../../services/developerService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperRoomsBedsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoomsBeds = useCallback(async () => {
    try {
      const res = await developerService.getRoomsBeds();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching rooms & beds summary:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRoomsBeds();
  }, [fetchRoomsBeds]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRoomsBeds();
  };

  const summary = data?.summary || {};
  const roomTypes = data?.by_room_type || [];
  const hostelBreakdown = data?.by_hostel || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1C1917" />
        </TouchableOpacity>
        <View>
          <Text style={styles.topTag}>INVENTORY BREAKDOWN</Text>
          <Text style={styles.screenTitle}>Rooms & Beds Platform Inventory</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C2410C" />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#C2410C" />
            <Text style={styles.loadingText}>Analyzing inventory data...</Text>
          </View>
        ) : (
          <>
            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>TOTAL ROOMS</Text>
                <Text style={styles.kpiValue}>{summary.total_rooms || 0}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>TOTAL BEDS</Text>
                <Text style={styles.kpiValue}>{summary.total_beds || 0}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>OCCUPIED</Text>
                <Text style={[styles.kpiValue, { color: '#059669' }]}>{summary.occupied_beds || 0}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>AVAILABLE</Text>
                <Text style={[styles.kpiValue, { color: '#C2410C' }]}>{summary.available_beds || 0}</Text>
              </View>
            </View>

            {/* Room Types Distribution */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>SHARING & ROOM TYPES</Text>
              {roomTypes.length === 0 ? (
                <Text style={styles.emptyText}>No room type data recorded.</Text>
              ) : (
                roomTypes.map((rt: any, i: number) => (
                  <View key={i} style={styles.typeRow}>
                    <View style={styles.typeLeft}>
                      <View style={styles.typeDot} />
                      <Text style={styles.typeName}>{rt.room_type || 'Standard'}</Text>
                    </View>
                    <Text style={styles.typeCount}>
                      {rt.room_count} Rooms ({rt.total_beds} Beds)
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Hostels Breakdown */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>HOSTEL-WISE OCCUPANCY BREAKDOWN</Text>
              {hostelBreakdown.length === 0 ? (
                <Text style={styles.emptyText}>No hostel breakdown available.</Text>
              ) : (
                hostelBreakdown.map((h: any) => {
                  const occ = h.total_beds > 0 ? Math.round((h.occupied_beds / h.total_beds) * 100) : 0;
                  return (
                    <TouchableOpacity
                      key={h.hostel_id}
                      activeOpacity={0.75}
                      onPress={() => navigation.navigate('DeveloperHostelDetails', { hostelId: h.hostel_id })}
                      style={styles.hostelBreakdownRow}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.hName}>{h.hostel_name}</Text>
                        <Text style={styles.hRooms}>{h.total_rooms} Rooms • {h.total_beds} Beds</Text>
                      </View>
                      <View style={styles.hRight}>
                        <Text style={[styles.hOcc, { color: occ > 80 ? '#059669' : '#C2410C' }]}>{occ}%</Text>
                        <Ionicons name="chevron-forward" size={14} color="#B5A496" />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE7DC',
    backgroundColor: '#FAF6F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  topTag: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  screenTitle: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#78716C',
    marginTop: 12,
    fontSize: 13,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiLabel: {
    color: '#A89687',
    fontSize: 10,
    fontWeight: '800',
  },
  kpiValue: {
    color: '#1C1917',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeading: {
    color: '#8C7A6B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE6',
  },
  typeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C2410C',
  },
  typeName: {
    color: '#1C1917',
    fontSize: 13,
    fontWeight: '700',
  },
  typeCount: {
    color: '#78716C',
    fontSize: 12,
  },
  hostelBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE6',
  },
  hName: {
    color: '#1C1917',
    fontSize: 13,
    fontWeight: '800',
  },
  hRooms: {
    color: '#78716C',
    fontSize: 11,
    marginTop: 1,
  },
  hRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hOcc: {
    fontSize: 14,
    fontWeight: '900',
  },
  emptyText: {
    color: '#78716C',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
