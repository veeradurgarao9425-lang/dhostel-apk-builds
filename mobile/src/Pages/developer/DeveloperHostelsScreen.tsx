import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
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

export default function DeveloperHostelsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHostels = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else if (pageNum === 1) setLoading(true);

        const statusParam = statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE' ? 'active' : 'inactive';
        const res = await developerService.getHostels({
          page: pageNum,
          limit: 15,
          search: search.trim() || undefined,
          status: statusParam,
        });

        if (res.success && res.data) {
          if (pageNum === 1) {
            setHostels(res.data);
          } else {
            setHostels((prev) => [...prev, ...res.data]);
          }
          if (res.pagination) {
            setTotalPages(res.pagination.total_pages);
            setPage(res.pagination.page);
          }
        }
      } catch (err) {
        console.error('Error fetching hostels:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    fetchHostels(1);
  }, [fetchHostels]);

  const onRefresh = () => {
    setPage(1);
    fetchHostels(1, true);
  };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      fetchHostels(page + 1);
    }
  };

  const renderHostelCard = ({ item }: { item: any }) => {
    const occupancyRate =
      item.total_beds > 0
        ? Math.round((Number(item.occupied_beds || 0) / Number(item.total_beds)) * 100)
        : 0;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('DeveloperHostelDetails', { hostelId: item.hostel_id })}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <View style={styles.hostelAvatar}>
            <Ionicons name="business" size={18} color="#C2410C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.hostel_name}</Text>
            <Text style={styles.cardSubtitle}>
              {item.city || 'Unknown City'}{item.state ? `, ${item.state}` : ''} • Owner: {item.owner_name || 'N/A'}
            </Text>
          </View>
          <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusBadgeText, { color: item.is_active ? '#059669' : '#8C7A6B' }]}>
              {item.is_active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{item.total_rooms || 0}</Text>
            <Text style={styles.statLbl}>Rooms</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{item.total_beds || 0}</Text>
            <Text style={styles.statLbl}>Beds</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{item.total_students || 0}</Text>
            <Text style={styles.statLbl}>Students</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#C2410C' }]}>{occupancyRate}%</Text>
            <Text style={styles.statLbl}>Occupancy</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.codeText}>ID: #{item.hostel_id} • Code: {item.hostel_code || 'N/A'}</Text>
          <View style={styles.viewLink}>
            <Text style={styles.viewLinkText}>Inspect</Text>
            <Ionicons name="chevron-forward" size={14} color="#C2410C" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <View>
          <Text style={styles.topTag}>PLATFORM DIRECTORY</Text>
          <Text style={styles.screenTitle}>Hostels Management</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{hostels.length} Loaded</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchBoxWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#A89687" />
          <TextInput
            placeholder="Search by hostel name, city, code..."
            placeholderTextColor="#A89687"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchHostels(1)}
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); fetchHostels(1); }}>
              <Ionicons name="close-circle" size={18} color="#A89687" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
            <TouchableOpacity
              key={st}
              onPress={() => setStatusFilter(st)}
              style={[styles.filterChip, statusFilter === st && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, statusFilter === st && styles.filterChipTextActive]}>
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#C2410C" />
          <Text style={styles.loadingText}>Loading platform hostels...</Text>
        </View>
      ) : (
        <FlatList
          data={hostels}
          keyExtractor={(item) => String(item.hostel_id)}
          renderItem={renderHostelCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C2410C" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="business-outline" size={40} color="#C4B5A5" />
              <Text style={styles.emptyTitle}>No Hostels Found</Text>
              <Text style={styles.emptySub}>No hostels match the active filters or search criteria.</Text>
            </View>
          }
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE7DC',
    backgroundColor: '#FAF6F0',
  },
  topTag: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  screenTitle: {
    color: '#1C1917',
    fontSize: 18,
    fontWeight: '900',
  },
  countBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  countBadgeText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
  },
  searchBoxWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FAF6F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    gap: 8,
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1C1917',
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  filterChipActive: {
    backgroundColor: '#C2410C',
    borderColor: '#C2410C',
  },
  filterChipText: {
    color: '#78716C',
    fontSize: 11,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#78716C',
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hostelAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  cardTitle: {
    color: '#1C1917',
    fontSize: 14,
    fontWeight: '900',
  },
  cardSubtitle: {
    color: '#78716C',
    fontSize: 11,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusInactive: {
    backgroundColor: '#F5F5F4',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5EFE6',
    marginVertical: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    color: '#1C1917',
    fontSize: 14,
    fontWeight: '900',
  },
  statLbl: {
    color: '#A89687',
    fontSize: 10,
    marginTop: 1,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5EFE6',
  },
  codeText: {
    color: '#A89687',
    fontSize: 10,
    fontWeight: '600',
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewLinkText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFE7DC',
    marginTop: 20,
  },
  emptyTitle: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  emptySub: {
    color: '#78716C',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
