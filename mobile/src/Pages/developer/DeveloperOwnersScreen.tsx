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
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 15 });

  const fetchOwners = useCallback(async (currentPage = 1, query = search) => {
    try {
      setLoading(true);
      const res = await developerService.getOwners({
        page: currentPage,
        limit: 15,
        search: query.trim(),
      });

      if (res?.success && res.data) {
        setOwners(res.data.owners || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1, limit: 15 });
        setPage(currentPage);
      }
    } catch (err) {
      console.error('Fetch owners error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchOwners(1, search);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOwners(1, search);
  };

  const handleOpenOwnerAccount = (owner: any) => {
    Alert.alert(
      'Enter Owner Support Mode',
      `Open and inspect account as: "${owner.full_name}"?\n\nThis delegated session will be recorded in audit logs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Account',
          style: 'default',
          onPress: async () => {
            try {
              const res = await enterSupportMode({
                target_user_id: owner.user_id,
                target_role: 'OWNER',
                reason: `Direct owner support session for #${owner.user_id}`,
              });
              if (!res.success) {
                Alert.alert('Support Mode Error', res.error || 'Failed to enter support mode');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const renderOwnerCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarBox}>
            <Ionicons name="person" size={20} color="#A855F7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ownerName} numberOfLines={1}>{item.full_name}</Text>
            <Text style={styles.ownerContact}>{item.email} • {item.phone || 'No phone'}</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.statusBadgeText, { color: item.is_active ? '#10B981' : '#94A3B8' }]}>
            {item.is_active ? 'ACTIVE' : 'SUSPENDED'}
          </Text>
        </View>
      </View>

      {/* Hostels Tag Row */}
      <View style={styles.hostelsRow}>
        <Ionicons name="business-outline" size={14} color="#60A5FA" />
        <Text style={styles.hostelsText} numberOfLines={1}>
          {item.hostels && item.hostels.length > 0
            ? item.hostels.map((h: any) => h.hostel_name).join(', ')
            : 'No hostels linked'}
        </Text>
      </View>

      {/* Stat Pills */}
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Hostels</Text>
          <Text style={styles.statVal}>{item.total_hostels || 0}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Students</Text>
          <Text style={styles.statVal}>{item.total_students || 0}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Rooms</Text>
          <Text style={styles.statVal}>{item.total_rooms || 0}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Beds</Text>
          <Text style={styles.statVal}>{item.total_beds || 0}</Text>
        </View>
      </View>

      {/* Footer Actions */}
      <View style={styles.cardFooter}>
        <Text style={styles.lastLoginText}>
          Last login: {item.last_login ? new Date(item.last_login).toLocaleDateString() : 'Never'}
        </Text>

        <View style={styles.actionsGroup}>
          <TouchableOpacity
            onPress={() => handleOpenOwnerAccount(item)}
            style={styles.openAccountBtn}
          >
            <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
            <Text style={styles.openAccountBtnText}>Open Account</Text>
          </TouchableOpacity>
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
        <Text style={styles.topBarTitle}>Platform Owners ({pagination.total})</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search owners by name, email, phone..."
            placeholderTextColor="#64748B"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchOwners(1, search)}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); fetchOwners(1, ''); }}>
              <Ionicons name="close-circle" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Owner List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>Loading owners...</Text>
        </View>
      ) : owners.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>No owners found</Text>
          <Text style={styles.emptySub}>Try searching with a different name or phone number.</Text>
        </View>
      ) : (
        <FlatList
          data={owners}
          keyExtractor={(item) => String(item.user_id)}
          renderItem={renderOwnerCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" />}
          ListFooterComponent={
            pagination.totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  disabled={page <= 1}
                  onPress={() => fetchOwners(page - 1)}
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                >
                  <Ionicons name="arrow-back" size={14} color={page <= 1 ? '#475569' : '#F8FAFC'} />
                  <Text style={[styles.pageBtnText, page <= 1 && { color: '#475569' }]}>Previous</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfo}>
                  Page <Text style={{ color: '#A855F7', fontWeight: '800' }}>{page}</Text> of {pagination.totalPages}
                </Text>

                <TouchableOpacity
                  disabled={page >= pagination.totalPages}
                  onPress={() => fetchOwners(page + 1)}
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
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
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
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  ownerContact: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
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
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  hostelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
  },
  hostelsText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  statsRow: {
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
  statLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 2,
  },
  statVal: {
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
  lastLoginText: {
    color: '#64748B',
    fontSize: 10,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  openAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
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
