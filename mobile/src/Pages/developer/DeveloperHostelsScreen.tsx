import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { developerService } from '../../services/developerService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperHostelsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [hostels, setHostels] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Extend Trial Modal State
  const [trialModalVisible, setTrialModalVisible] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState<any>(null);
  const [trialDays, setTrialDays] = useState('30');
  const [extendingTrial, setExtendingTrial] = useState(false);

  // Fetch owners list for top tabs
  useEffect(() => {
    developerService.getOwners({ page: 1, limit: 50 }).then((res) => {
      if (res?.success && res.data) {
        setOwners(res.data);
      }
    }).catch(() => {});
  }, []);

  const fetchHostels = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else if (pageNum === 1) setLoading(true);

        const statusParam = statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
        const res = await developerService.getHostels({
          page: pageNum,
          limit: 20,
          search: search.trim() || undefined,
          status: statusParam,
          owner_id: selectedOwnerId || undefined,
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
    [search, statusFilter, selectedOwnerId]
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

  const handleToggleStatus = async (hostel: any) => {
    const isCurrentlyActive = !!hostel.is_active;
    const nextStatus = !isCurrentlyActive;

    Alert.alert(
      isCurrentlyActive ? 'Deactivate Hostel' : 'Activate Hostel',
      `Are you sure you want to ${nextStatus ? 'activate' : 'deactivate'} ${hostel.hostel_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextStatus ? 'Activate' : 'Deactivate',
          style: nextStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await developerService.updateHostelStatus(hostel.hostel_id, nextStatus);
              setHostels((prev) =>
                prev.map((h) =>
                  h.hostel_id === hostel.hostel_id ? { ...h, is_active: nextStatus ? 1 : 0 } : h
                )
              );
              Alert.alert('Status Updated', `${hostel.hostel_name} is now ${nextStatus ? 'ACTIVE' : 'INACTIVE'}.`);
            } catch (err: any) {
              Alert.alert('Update Failed', err.message || 'Could not update hostel status.');
            }
          },
        },
      ]
    );
  };

  const handleOpenExtendTrial = (hostel: any) => {
    setSelectedHostel(hostel);
    setTrialDays('30');
    setTrialModalVisible(true);
  };

  const handleConfirmExtendTrial = async () => {
    const days = parseInt(trialDays, 10);
    if (isNaN(days) || days <= 0) {
      Alert.alert('Invalid Days', 'Please enter a valid number of days.');
      return;
    }

    try {
      setExtendingTrial(true);
      await developerService.extendHostelTrial(selectedHostel.hostel_id, days);
      setTrialModalVisible(false);
      setHostels((prev) =>
        prev.map((h) =>
          h.hostel_id === selectedHostel.hostel_id ? { ...h, is_active: 1 } : h
        )
      );
      Alert.alert(
        'Subscription / Trial Extended! 🎉',
        `Added ${days} days to ${selectedHostel.hostel_name}. Account is ACTIVE.`
      );
    } catch (err: any) {
      Alert.alert('Action Failed', err.message || 'Could not extend trial.');
    } finally {
      setExtendingTrial(false);
    }
  };

  const renderHostelCard = ({ item }: { item: any }) => {
    const occupancyRate =
      item.total_beds > 0
        ? Math.round((Number(item.occupied_beds || 0) / Number(item.total_beds)) * 100)
        : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.hostelAvatar}>
            <Ionicons name="business" size={18} color="#C2410C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.hostel_name}</Text>
            <Text style={styles.cardSubtitle}>
              {item.city || 'Unknown City'}{item.state ? `, ${item.state}` : ''} • Owner: <Text style={{ fontWeight: '800', color: '#7C3AED' }}>{item.owner_name || 'N/A'}</Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleToggleStatus(item)}
            style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}
            activeOpacity={0.75}
          >
            <Text style={[styles.statusBadgeText, { color: item.is_active ? '#059669' : '#DC2626' }]}>
              {item.is_active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </TouchableOpacity>
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

        {/* CEO Actions Toolbar */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleOpenExtendTrial(item)}
            style={styles.trialBtn}
          >
            <Ionicons name="gift-outline" size={13} color="#C2410C" />
            <Text style={styles.trialBtnText}>+ Free Trial</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('DeveloperHostelDetails', { hostelId: item.hostel_id })}
            style={styles.inspectBtn}
          >
            <Ionicons name="eye-outline" size={13} color="#FFFFFF" />
            <Text style={styles.inspectBtnText}>Inspect Details</Text>
          </TouchableOpacity>
        </View>
      </View>
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
          <Text style={styles.countBadgeText}>{hostels.length} Hostels</Text>
        </View>
      </View>

      {/* Search Bar */}
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
      </View>

      {/* TOP TABS ROW 1: OWNERS LIST SEGREGATION */}
      <View style={styles.ownerTabsSection}>
        <View style={styles.tabSectionHeader}>
          <Ionicons name="people" size={13} color="#7C3AED" />
          <Text style={styles.tabSectionTitle}>FILTER BY OWNER</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          <TouchableOpacity
            onPress={() => setSelectedOwnerId(null)}
            style={[styles.ownerTabChip, selectedOwnerId === null && styles.ownerTabChipActive]}
          >
            <Text style={[styles.ownerTabChipText, selectedOwnerId === null && styles.ownerTabChipTextActive]}>
              👑 All Owners ({owners.length})
            </Text>
          </TouchableOpacity>
          {owners.map((owner) => {
            const isSelected = selectedOwnerId === owner.user_id;
            return (
              <TouchableOpacity
                key={owner.user_id}
                onPress={() => setSelectedOwnerId(isSelected ? null : owner.user_id)}
                style={[styles.ownerTabChip, isSelected && styles.ownerTabChipActive]}
              >
                <Text style={[styles.ownerTabChipText, isSelected && styles.ownerTabChipTextActive]}>
                  👤 {owner.full_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* TOP TABS ROW 2: STATUS SEGREGATION */}
      <View style={styles.statusTabsSection}>
        <View style={styles.filterRow}>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
            <TouchableOpacity
              key={st}
              onPress={() => setStatusFilter(st)}
              style={[styles.statusFilterChip, statusFilter === st && styles.statusFilterChipActive]}
            >
              <Text style={[styles.statusFilterChipText, statusFilter === st && styles.statusFilterChipTextActive]}>
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
              <Text style={styles.emptySub}>No hostels match the selected owner or status filter.</Text>
            </View>
          }
        />
      )}

      {/* Extend Trial Modal */}
      <Modal
        visible={trialModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTrialModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="gift" size={20} color="#C2410C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Extend Free Trial / Access</Text>
                <Text style={styles.modalSub}>{selectedHostel?.hostel_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setTrialModalVisible(false)}>
                <Ionicons name="close" size={22} color="#78716C" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Select or Enter Days to Extend</Text>
            <View style={styles.presetDaysRow}>
              {['15', '30', '60', '90'].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setTrialDays(d)}
                  style={[styles.presetDayChip, trialDays === d && styles.presetDayChipActive]}
                >
                  <Text style={[styles.presetDayText, trialDays === d && styles.presetDayTextActive]}>
                    +{d} Days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Custom days count"
              placeholderTextColor="#A89687"
              value={trialDays}
              onChangeText={setTrialDays}
              keyboardType="number-pad"
              style={styles.daysTextInput}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setTrialModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmExtendTrial}
                disabled={extendingTrial}
                style={styles.confirmExtendBtn}
              >
                {extendingTrial ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmExtendBtnText}>Confirm +{trialDays} Days</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderColor: '#FED7AA',
  },
  countBadgeText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
  },
  searchBoxWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FAF6F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  ownerTabsSection: {
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#FAF6F0',
  },
  tabSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  tabSectionTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.6,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  ownerTabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  ownerTabChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  ownerTabChipText: {
    color: '#6D28D9',
    fontSize: 11,
    fontWeight: '700',
  },
  ownerTabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statusTabsSection: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: '#FAF6F0',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusFilterChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  statusFilterChipActive: {
    backgroundColor: '#C2410C',
    borderColor: '#C2410C',
  },
  statusFilterChipText: {
    color: '#78716C',
    fontSize: 11,
    fontWeight: '700',
  },
  statusFilterChipTextActive: {
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
    alignItems: 'flex-start',
    gap: 10,
  },
  hostelAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#1C1917',
    fontSize: 14.5,
    fontWeight: '900',
  },
  cardSubtitle: {
    color: '#78716C',
    fontSize: 11,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 9.5,
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
    backgroundColor: '#FAF6F0',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    color: '#1C1917',
    fontSize: 13,
    fontWeight: '800',
  },
  statLbl: {
    color: '#78716C',
    fontSize: 10,
    marginTop: 1,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  trialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  trialBtnText: {
    color: '#C2410C',
    fontSize: 11.5,
    fontWeight: '800',
  },
  inspectBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#C2410C',
    paddingVertical: 9,
    borderRadius: 10,
  },
  inspectBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#1C1917',
    fontSize: 15,
    fontWeight: '900',
  },
  modalSub: {
    color: '#78716C',
    fontSize: 11.5,
    marginTop: 2,
  },
  inputLabel: {
    color: '#44403C',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  presetDaysRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetDayChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#EFE7DC',
    alignItems: 'center',
  },
  presetDayChipActive: {
    backgroundColor: '#C2410C',
    borderColor: '#C2410C',
  },
  presetDayText: {
    color: '#78716C',
    fontSize: 11,
    fontWeight: '700',
  },
  presetDayTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  daysTextInput: {
    backgroundColor: '#FAF6F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C1917',
    borderWidth: 1,
    borderColor: '#EFE7DC',
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#78716C',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmExtendBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#C2410C',
    alignItems: 'center',
  },
  confirmExtendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
