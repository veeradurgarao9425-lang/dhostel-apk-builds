import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
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

export default function DeveloperHostelsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 15 });

  const fetchHostels = useCallback(
    async (currentPage = 1, query = search, status = statusFilter) => {
      try {
        setLoading(true);
        const res = await developerService.getHostels({
          page: currentPage,
          limit: 15,
          search: query.trim(),
          status: status === 'ALL' ? undefined : status,
        });

        if (res?.success && res.data) {
          setHostels(res.data.hostels || []);
          setPagination(res.data.pagination || { total: 0, totalPages: 1, limit: 15 });
          setPage(currentPage);
        }
      } catch (err) {
        console.error('Fetch hostels error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    fetchHostels(1, search, statusFilter);
  }, [statusFilter]);

  const handleSearchSubmit = () => {
    fetchHostels(1, search, statusFilter);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHostels(1, search, statusFilter);
  };

  const renderHostelCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => navigation.navigate('DeveloperHostelDetails', { hostelId: item.hostel_id })}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.hostelIcon}>
            <Ionicons name="business" size={18} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hostelName} numberOfLines={1}>
              {item.hostel_name}
            </Text>
            <Text style={styles.hostelIdText}>ID: #{item.hostel_id} {item.hostel_code ? `• Code: ${item.hostel_code}` : ''}</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.statusBadgeText, { color: item.is_active ? '#10B981' : '#94A3B8' }]}>
            {item.is_active ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>

      {/* Owner Info */}
      <View style={styles.ownerRow}>
        <Ionicons name="person-circle-outline" size={16} color="#A855F7" />
        <Text style={styles.ownerText}>
          Owner: <Text style={styles.ownerBold}>{item.owner_name || 'Unassigned'}</Text>
          {item.owner_phone ? ` (${item.owner_phone})` : ''}
        </Text>
      </View>

      {/* Location */}
      <View style={styles.locRow}>
        <Ionicons name="location-outline" size={15} color="#64748B" />
        <Text style={styles.locText} numberOfLines={1}>
          {item.city || 'Unknown City'}{item.state ? `, ${item.state}` : ''} {item.pincode ? `• ${item.pincode}` : ''}
        </Text>
      </View>

      {/* Capacity & Occupancy Pills */}
      <View style={styles.statsPillRow}>
        <View style={styles.statPill}>
          <Text style={styles.statPillLabel}>Rooms</Text>
          <Text style={styles.statPillVal}>{item.total_rooms || 0}</Text>
        </View>

        <View style={styles.statPill}>
          <Text style={styles.statPillLabel}>Total Beds</Text>
          <Text style={styles.statPillVal}>{item.total_beds || 0}</Text>
        </View>

        <View style={[styles.statPill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
          <Text style={[styles.statPillLabel, { color: '#10B981' }]}>Occupied</Text>
          <Text style={[styles.statPillVal, { color: '#10B981' }]}>{item.occupied_beds || 0}</Text>
        </View>

        <View style={[styles.statPill, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
          <Text style={[styles.statPillLabel, { color: '#60A5FA' }]}>Available</Text>
          <Text style={[styles.statPillVal, { color: '#60A5FA' }]}>{item.available_beds || 0}</Text>
        </View>
      </View>

      {/* Footer Action */}
      <View style={styles.cardFooter}>
        <Text style={styles.activeStudentsText}>
          <Ionicons name="school" size={12} color="#10B981" /> {item.active_students || 0} active students
        </Text>
        <View style={styles.inspectBtn}>
          <Text style={styles.inspectBtnText}>Inspect Details</Text>
          <Ionicons name="chevron-forward" size={13} color="#3B82F6" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>All Hostels ({pagination.total})</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, code, owner, city..."
            placeholderTextColor="#64748B"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); fetchHostels(1, '', statusFilter); }}>
              <Ionicons name="close-circle" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setStatusFilter(tab)}
              style={[styles.filterTab, statusFilter === tab && styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, statusFilter === tab && styles.filterTabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Hostel List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading platform hostels...</Text>
        </View>
      ) : hostels.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="business-outline" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>No hostels found</Text>
          <Text style={styles.emptySub}>Try adjusting your search query or status filter.</Text>
        </View>
      ) : (
        <FlatList
          data={hostels}
          keyExtractor={(item) => String(item.hostel_id)}
          renderItem={renderHostelCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />}
          ListFooterComponent={
            pagination.totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  disabled={page <= 1}
                  onPress={() => fetchHostels(page - 1)}
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                >
                  <Ionicons name="arrow-back" size={14} color={page <= 1 ? '#475569' : '#F8FAFC'} />
                  <Text style={[styles.pageBtnText, page <= 1 && { color: '#475569' }]}>Previous</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfo}>
                  Page <Text style={{ color: '#60A5FA', fontWeight: '800' }}>{page}</Text> of {pagination.totalPages}
                </Text>

                <TouchableOpacity
                  disabled={page >= pagination.totalPages}
                  onPress={() => fetchHostels(page + 1)}
                  style={[styles.pageBtn, page >= pagination.totalPages && styles.pageBtnDisabled]}
                >
                  <Text style={[styles.pageBtnText, page >= pagination.totalPages && { color: '#475569' }]}>Next</Text>
                  <Ionicons name="arrow-forward" size={14} color={page >= pagination.totalPages ? '#475569' : '#F8FAFC'} />
                </TouchableOpacity>
              </View>
            ) : null
          }
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
  searchSection: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1120',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#24334C',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  filterTabActive: {
    backgroundColor: '#2563EB',
  },
  filterTabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
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
  emptyBox: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#131D31',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  hostelIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostelName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  hostelIdText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusInactive: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ownerText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  ownerBold: {
    color: '#E2E8F0',
    fontWeight: '700',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locText: {
    color: '#64748B',
    fontSize: 11,
  },
  statsPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  statPill: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  statPillLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 2,
  },
  statPillVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
  },
  activeStudentsText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  inspectBtnText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '700',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginTop: 8,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  pageInfo: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
});
