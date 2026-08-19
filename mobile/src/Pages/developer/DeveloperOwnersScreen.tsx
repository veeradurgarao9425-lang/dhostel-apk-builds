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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { developerService } from '../../services/developerService';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperOwnersScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { enterSupportMode } = useDeveloper();

  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  const fetchOwners = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else if (pageNum === 1) setLoading(true);

        const res = await developerService.getOwners({
          page: pageNum,
          limit: 15,
          search: search.trim() || undefined,
        });

        if (res.success && res.data) {
          if (pageNum === 1) {
            setOwners(res.data);
          } else {
            setOwners((prev) => [...prev, ...res.data]);
          }
          if (res.pagination) {
            setTotalPages(res.pagination.total_pages);
            setPage(res.pagination.page);
          }
        }
      } catch (err) {
        console.error('Error fetching owners:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useEffect(() => {
    fetchOwners(1);
  }, [fetchOwners]);

  const onRefresh = () => {
    setPage(1);
    fetchOwners(1, true);
  };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      fetchOwners(page + 1);
    }
  };

  const handleImpersonate = (owner: any) => {
    Alert.alert(
      'Enter Support Impersonation',
      `You are entering ${owner.full_name}'s owner dashboard in controlled support mode.\n\nA top support banner with a live countdown timer will be displayed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enter Support Mode',
          onPress: async () => {
            try {
              setImpersonatingId(owner.user_id);
              await enterSupportMode({
                target_user_id: owner.user_id,
                target_role: 'OWNER',
                hostel_id: owner.primary_hostel_id || undefined,
              });
            } catch (err: any) {
              Alert.alert('Support Mode Error', err.message || 'Failed to start support session.');
            } finally {
              setImpersonatingId(null);
            }
          },
        },
      ]
    );
  };

  const renderOwnerCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatarWrap}>
          <Ionicons name="person" size={20} color="#7C3AED" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ownerName}>{item.full_name || 'Unnamed Owner'}</Text>
          <Text style={styles.ownerEmail}>{item.email}</Text>
          {item.phone ? <Text style={styles.ownerPhone}>📞 {item.phone}</Text> : null}
        </View>
        <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.statusBadgeText, { color: item.is_active ? '#059669' : '#8C7A6B' }]}>
            {item.is_active ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.ownerMetaRow}>
        <View style={styles.metaChip}>
          <Ionicons name="business-outline" size={13} color="#C2410C" />
          <Text style={styles.metaChipText}>{item.hostel_count || 0} Hostels</Text>
        </View>
        <View style={styles.metaChip}>
          <Ionicons name="people-outline" size={13} color="#2563EB" />
          <Text style={styles.metaChipText}>{item.total_students || 0} Students</Text>
        </View>
        <Text style={styles.ownerIdText}>User #{item.user_id}</Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleImpersonate(item)}
          disabled={impersonatingId === item.user_id}
          style={styles.impersonateBtn}
        >
          {impersonatingId === item.user_id ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="shield-half-outline" size={14} color="#FFF" />
              <Text style={styles.impersonateBtnText}>Open Account (Support)</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <View>
          <Text style={styles.topTag}>PLATFORM OWNERS</Text>
          <Text style={styles.screenTitle}>Hostel Owners Directory</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{owners.length} Loaded</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBoxWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#A89687" />
          <TextInput
            placeholder="Search owners by name, email, phone..."
            placeholderTextColor="#A89687"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchOwners(1)}
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); fetchOwners(1); }}>
              <Ionicons name="close-circle" size={18} color="#A89687" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#C2410C" />
          <Text style={styles.loadingText}>Loading owners directory...</Text>
        </View>
      ) : (
        <FlatList
          data={owners}
          keyExtractor={(item) => String(item.user_id)}
          renderItem={renderOwnerCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C2410C" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={40} color="#C4B5A5" />
              <Text style={styles.emptyTitle}>No Owners Found</Text>
              <Text style={styles.emptySub}>No owners match your search query.</Text>
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
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  countBadgeText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '800',
  },
  searchBoxWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  ownerName: {
    color: '#1C1917',
    fontSize: 15,
    fontWeight: '900',
  },
  ownerEmail: {
    color: '#78716C',
    fontSize: 12,
    marginTop: 1,
  },
  ownerPhone: {
    color: '#78716C',
    fontSize: 11,
    marginTop: 2,
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
  ownerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF6F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  metaChipText: {
    color: '#44403C',
    fontSize: 11,
    fontWeight: '700',
  },
  ownerIdText: {
    marginLeft: 'auto',
    color: '#A89687',
    fontSize: 10,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
  },
  impersonateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#C2410C',
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  impersonateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
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
