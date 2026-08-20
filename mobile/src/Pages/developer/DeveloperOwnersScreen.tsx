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
import { LinearGradient } from 'expo-linear-gradient';
import { developerService } from '../../services/developerService';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeveloperListSkeleton } from '../../components/ui/SkeletonCard';
import { DeveloperSupportModal } from '../../components/developer/DeveloperSupportModal';

export default function DeveloperOwnersScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { enterSupportMode } = useDeveloper();

  const [owners, setOwners] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedHostelId, setSelectedHostelId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  // Support Mode Modal State
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [selectedOwnerForSupport, setSelectedOwnerForSupport] = useState<any>(null);

  // Reset Password Modal State
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Load hostels list for top tabs
  useEffect(() => {
    developerService.getHostels({ page: 1, limit: 50 }).then((res) => {
      if (res?.success && res.data) {
        setHostels(res.data);
      }
    }).catch(() => {});
  }, []);

  const fetchOwners = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else if (pageNum === 1) setLoading(true);

        const res = await developerService.getOwners({
          page: pageNum,
          limit: 20,
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

  // Filter list by status tab, selected hostel tab, and live search query
  const filteredOwners = owners.filter((o) => {
    if (statusFilter === 'ACTIVE' && !o.is_active) return false;
    if (statusFilter === 'INACTIVE' && !!o.is_active) return false;

    if (selectedHostelId !== null) {
      // Check if this owner matches the selected hostel
      const matchedHostel = hostels.find((h) => h.hostel_id === selectedHostelId);
      if (matchedHostel && matchedHostel.owner_id !== o.user_id && matchedHostel.owner_name !== o.full_name) {
        return false;
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const name = (o.full_name || o.name || '').toLowerCase();
      const email = (o.email || '').toLowerCase();
      const phone = (o.phone || '').toLowerCase();
      const hostel = (o.hostel_name || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !phone.includes(q) && !hostel.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const handleToggleStatus = async (owner: any) => {
    const nextStatus = !owner.is_active;
    Alert.alert(
      nextStatus ? 'Activate Owner Account' : 'Deactivate Owner Account',
      `Are you sure you want to ${nextStatus ? 'activate' : 'deactivate'} ${owner.full_name}'s account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextStatus ? 'Activate' : 'Deactivate',
          style: nextStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await developerService.updateOwnerStatus(owner.user_id, nextStatus);
              setOwners((prev) =>
                prev.map((item) =>
                  item.user_id === owner.user_id ? { ...item, is_active: nextStatus ? 1 : 0 } : item
                )
              );
              Alert.alert('Success', `Owner account has been ${nextStatus ? 'activated' : 'deactivated'}.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update owner status.');
            }
          },
        },
      ]
    );
  };

  const handleOpenResetPassword = (owner: any) => {
    setSelectedOwner(owner);
    setNewPassword('');
    setPasswordModalVisible(true);
  };

  const handleSavePassword = async () => {
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      Alert.alert('Invalid Password', 'Please enter a password with at least 4 characters.');
      return;
    }

    try {
      setResettingPassword(true);
      await developerService.resetOwnerPassword(selectedOwner.user_id, newPassword.trim());
      setPasswordModalVisible(false);
      Alert.alert(
        'Password Updated Successfully! 🔑',
        `New password for ${selectedOwner.full_name}:\n\n${newPassword.trim()}\n\nPlease share this with the owner so they can log in.`
      );
    } catch (err: any) {
      Alert.alert('Reset Failed', err.message || 'Could not reset owner password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleGenerateRandomPassword = () => {
    const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
    setNewPassword(randomPass);
  };

  const handleImpersonate = (owner: any) => {
    setSelectedOwnerForSupport(owner);
    setSupportModalVisible(true);
  };

  const renderOwnerCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('DeveloperOwnerDetails', { ownerId: item.user_id, owner: item })}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatarWrap}>
          <Ionicons name="person" size={20} color="#EA580C" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ownerName}>{item.full_name || 'Unnamed Owner'}</Text>
          <Text style={styles.ownerEmail}>{item.email}</Text>
          {item.phone ? <Text style={styles.ownerPhone}>📞 {item.phone}</Text> : null}
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

      <View style={styles.ownerMetaRow}>
        <View style={styles.metaChip}>
          <Ionicons name="business-outline" size={13} color="#EA580C" />
          <Text style={styles.metaChipText}>{item.hostel_count || 0} Hostels</Text>
        </View>
        <View style={styles.metaChip}>
          <Ionicons name="people-outline" size={13} color="#2563EB" />
          <Text style={styles.metaChipText}>{item.total_students || 0} Students</Text>
        </View>
        <Text style={styles.ownerIdText}>User #{item.user_id}</Text>
      </View>

      {/* CEO Actions Toolbar */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('DeveloperOwnerDetails', { ownerId: item.user_id, owner: item })}
          style={styles.resetPassBtn}
        >
          <Ionicons name="document-text-outline" size={13} color="#EA580C" />
          <Text style={[styles.resetPassBtnText, { color: '#EA580C' }]}>View Dossier</Text>
        </TouchableOpacity>

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
              <Ionicons name="shield-half-outline" size={13} color="#FFF" />
              <Text style={styles.impersonateBtnText}>Support Mode</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─────────────────── CLEAN SIMPLE LIGHT HEADER ─────────────────── */}
      <View
        style={[
          styles.heroHeader,
          {
            paddingTop: insets.top + (Platform.OS === 'android' ? 10 : 6),
          },
        ]}
      >
        <View style={styles.topBarRow}>
          <View>
            <View style={styles.masterBadge}>
              <Text style={styles.masterBadgeCrown}>👑</Text>
              <Text style={styles.masterBadgeText}>PLATFORM GOVERNANCE</Text>
              <View style={styles.masterBadgeLiveDot} />
            </View>
            <Text style={styles.screenTitle}>Hostel Owners Directory</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredOwners.length} Owners</Text>
          </View>
        </View>

        {/* Floating Search Bar */}
        <View style={styles.heroSearchBar}>
          <Ionicons name="search" size={17} color="#64748B" />
          <TextInput
            placeholder="Search owners by name, email, phone..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchOwners(1)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.heroSearchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* INTEGRATED TAB ROW 1: HOSTELS LIST SEGREGATION */}
        <View style={styles.hdrTabSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hdrTabsScroll}
          >
            <TouchableOpacity
              onPress={() => setSelectedHostelId(null)}
              style={[styles.hdrHostelChip, selectedHostelId === null && styles.hdrHostelChipActive]}
            >
              <Text style={[styles.hdrHostelChipText, selectedHostelId === null && styles.hdrHostelChipTextActive]}>
                🏢 All Properties ({hostels.length})
              </Text>
            </TouchableOpacity>
            {hostels.map((hostel) => {
              const isSelected = selectedHostelId === hostel.hostel_id;
              return (
                <TouchableOpacity
                  key={hostel.hostel_id}
                  onPress={() => setSelectedHostelId(isSelected ? null : hostel.hostel_id)}
                  style={[styles.hdrHostelChip, isSelected && styles.hdrHostelChipActive]}
                >
                  <Text style={[styles.hdrHostelChipText, isSelected && styles.hdrHostelChipTextActive]}>
                    🏠 {hostel.hostel_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* STATUS SEGREGATION TABS OUTSIDE HEADER */}
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
        <DeveloperListSkeleton count={4} />
      ) : (
        <FlatList
          data={filteredOwners}
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
              <Text style={styles.emptySub}>No owners match the selected property or status filter.</Text>
            </View>
          }
        />
      )}

      {/* Reset Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="key" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Set New Owner Password</Text>
                <Text style={styles.modalSub}>{selectedOwner?.full_name} ({selectedOwner?.email})</Text>
              </View>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={22} color="#78716C" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Enter or Generate New Password</Text>
            <View style={styles.passInputRow}>
              <TextInput
                placeholder="e.g. 123456 or securepass"
                placeholderTextColor="#A89687"
                value={newPassword}
                onChangeText={setNewPassword}
                style={styles.passTextInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={handleGenerateRandomPassword}
                style={styles.generateBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.generateBtnText}>🎲 6-Digit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSavePassword}
                disabled={resettingPassword}
                style={styles.confirmSaveBtn}
              >
                {resettingPassword ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmSaveBtnText}>Save Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Executive Support Mode Modal */}
      <DeveloperSupportModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        targetUser={selectedOwnerForSupport}
        targetRole="OWNER"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topBarLeft: {
    flex: 1,
    paddingRight: 8,
  },
  masterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  masterBadgeCrown: {
    fontSize: 10,
  },
  masterBadgeLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  masterBadgeText: {
    color: '#475569',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  screenTitle: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  countBadgeText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
  },
  heroSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  heroSearchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    padding: 0,
  },
  hdrTabSection: {
    marginTop: 10,
  },
  hdrTabsScroll: {
    gap: 6,
  },
  hdrHostelChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hdrHostelChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#FB923C',
  },
  hdrHostelChipText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '700',
  },
  hdrHostelChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  hdrStatusRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  hdrStatusChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hdrStatusChipActive: {
    backgroundColor: '#EA580C',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  hdrStatusChipText: {
    color: '#9CA3AF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  hdrStatusChipTextActive: {
    color: '#FFFFFF',
  },
  hostelTabsSection: {
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
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
    color: '#C2410C',
    letterSpacing: 0.6,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  hostelTabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  hostelTabChipActive: {
    backgroundColor: '#C2410C',
    borderColor: '#C2410C',
  },
  hostelTabChipText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '700',
  },
  hostelTabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statusTabsSection: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
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
    backgroundColor: '#FFFFFF',
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
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  resetPassBtn: {
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
  resetPassBtnText: {
    color: '#EA580C',
    fontSize: 11.5,
    fontWeight: '800',
  },
  impersonateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingVertical: 9,
    borderRadius: 10,
  },
  impersonateBtnText: {
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
    backgroundColor: '#FEF3C7',
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
    marginBottom: 6,
  },
  passInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  passTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C1917',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  generateBtn: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  generateBtnText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '800',
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
  confirmSaveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#D97706',
    alignItems: 'center',
  },
  confirmSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
