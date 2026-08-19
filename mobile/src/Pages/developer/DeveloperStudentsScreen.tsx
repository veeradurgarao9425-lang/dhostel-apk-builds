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
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperStudentsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { enterSupportMode } = useDeveloper();

  const [students, setStudents] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedHostelId, setSelectedHostelId] = useState<number | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  // Reset Password Modal State
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Load Hostels and Owners lists for top tabs
  useEffect(() => {
    developerService.getHostels({ page: 1, limit: 50 }).then((res) => {
      if (res?.success && res.data) setHostels(res.data);
    }).catch(() => {});

    developerService.getOwners({ page: 1, limit: 50 }).then((res) => {
      if (res?.success && res.data) setOwners(res.data);
    }).catch(() => {});
  }, []);

  // Cascading Visible Hostels based on Selected Owner
  const visibleHostels = selectedOwnerId
    ? hostels.filter((h) => h.owner_id === selectedOwnerId)
    : hostels;

  // Cascading Visible Owners based on Selected Hostel
  const selectedHostelObj = selectedHostelId ? hostels.find((h) => h.hostel_id === selectedHostelId) : null;
  const visibleOwners = selectedHostelObj
    ? owners.filter((o) => o.user_id === selectedHostelObj.owner_id || o.full_name === selectedHostelObj.owner_name)
    : owners;

  const handleSelectHostel = (hostelId: number | null) => {
    setSelectedHostelId(hostelId);
    if (hostelId) {
      const h = hostels.find((x) => x.hostel_id === hostelId);
      if (h?.owner_id) {
        setSelectedOwnerId(h.owner_id);
      }
    } else {
      setSelectedOwnerId(null);
    }
  };

  const handleSelectOwner = (ownerId: number | null) => {
    setSelectedOwnerId(ownerId);
    if (ownerId) {
      const ownerHostels = hostels.filter((x) => x.owner_id === ownerId);
      if (selectedHostelId && !ownerHostels.some((x) => x.hostel_id === selectedHostelId)) {
        setSelectedHostelId(null);
      }
    } else {
      setSelectedHostelId(null);
    }
  };

  const fetchStudents = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else if (pageNum === 1) setLoading(true);

        const statusParam = statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE' ? '1' : '0';
        const res = await developerService.getStudents({
          page: pageNum,
          limit: 20,
          search: search.trim() || undefined,
          status: statusParam,
          hostel_id: selectedHostelId || undefined,
        });

        if (res.success && res.data) {
          if (pageNum === 1) {
            setStudents(res.data);
          } else {
            setStudents((prev) => [...prev, ...res.data]);
          }
          if (res.pagination) {
            setTotalPages(res.pagination.total_pages);
            setPage(res.pagination.page);
          }
        }
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, selectedHostelId]
  );

  useEffect(() => {
    fetchStudents(1);
  }, [fetchStudents]);

  const onRefresh = () => {
    setPage(1);
    fetchStudents(1, true);
  };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      fetchStudents(page + 1);
    }
  };

  // Client-side owner filter filtering
  const filteredStudents = students.filter((s) => {
    if (selectedOwnerId !== null) {
      const matchedOwner = owners.find((o) => o.user_id === selectedOwnerId);
      if (matchedOwner && s.owner_name && !s.owner_name.toLowerCase().includes(matchedOwner.full_name.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const handleToggleStatus = async (student: any) => {
    const isCurrentlyActive = String(student.status).toLowerCase() === 'active' || student.status === 1 || student.status === true;
    const nextStatus = isCurrentlyActive ? 'inactive' : 'active';

    Alert.alert(
      isCurrentlyActive ? 'Deactivate / Vacate Student' : 'Activate Student',
      `Are you sure you want to mark ${student.first_name} as ${nextStatus.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isCurrentlyActive ? 'Deactivate' : 'Activate',
          style: isCurrentlyActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await developerService.updateStudentStatus(student.student_id, nextStatus);
              setStudents((prev) =>
                prev.map((s) =>
                  s.student_id === student.student_id
                    ? { ...s, status: nextStatus === 'active' ? 1 : 0 }
                    : s
                )
              );
              Alert.alert('Status Updated', `Student status is now ${nextStatus.toUpperCase()}.`);
            } catch (err: any) {
              Alert.alert('Update Failed', err.message || 'Could not update student status.');
            }
          },
        },
      ]
    );
  };

  const handleOpenResetPassword = (student: any) => {
    setSelectedStudent(student);
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
      await developerService.resetStudentPassword(selectedStudent.student_id, newPassword.trim());
      setPasswordModalVisible(false);
      Alert.alert(
        'Student Password Updated! 🔑',
        `New password for ${selectedStudent.first_name}:\n\n${newPassword.trim()}\n\nPlease share this with the tenant so they can log in.`
      );
    } catch (err: any) {
      Alert.alert('Reset Failed', err.message || 'Could not reset student password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleGenerateRandomPassword = () => {
    const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
    setNewPassword(randomPass);
  };

  const handleImpersonate = (student: any) => {
    if (!student.user_id) {
      Alert.alert('Cannot Impersonate', 'This student does not have an active login account linked.');
      return;
    }

    Alert.alert(
      'Enter Student Support Mode',
      `You are entering ${student.first_name} ${student.last_name || ''}'s tenant account in controlled support mode.\n\nA top support banner with a live countdown timer will be displayed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enter Student Mode',
          onPress: async () => {
            try {
              setImpersonatingId(student.student_id);
              await enterSupportMode({
                target_user_id: student.user_id,
                target_role: 'TENANT',
                hostel_id: student.hostel_id || undefined,
              });
            } catch (err: any) {
              Alert.alert('Support Mode Error', err.message || 'Failed to start student support session.');
            } finally {
              setImpersonatingId(null);
            }
          },
        },
      ]
    );
  };

  const renderStudentCard = ({ item }: { item: any }) => {
    const fullName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unnamed Student';
    const isActive = String(item.status).toLowerCase() === 'active' || item.status === 1 || item.status === true;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatarWrap}>
            <Ionicons name="school" size={20} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>{fullName}</Text>
            <Text style={styles.studentHostel}>🏠 {item.hostel_name || 'No Hostel Assigned'}</Text>
            <Text style={styles.studentPhone}>📞 {item.phone || item.email || 'No contact'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleToggleStatus(item)}
            style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}
            activeOpacity={0.75}
          >
            <Text style={[styles.statusBadgeText, { color: isActive ? '#059669' : '#DC2626' }]}>
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.roomMetaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="bed-outline" size={13} color="#C2410C" />
            <Text style={styles.metaChipText}>Room {item.room_number || 'N/A'}</Text>
          </View>
          {item.bed_number ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>Bed {item.bed_number}</Text>
            </View>
          ) : null}
          <Text style={styles.rentText}>Rent: ₹{Number(item.monthly_rent || 0).toLocaleString('en-IN')}/mo</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleOpenResetPassword(item)}
            style={styles.resetPassBtn}
          >
            <Ionicons name="key-outline" size={13} color="#D97706" />
            <Text style={styles.resetPassBtnText}>Reset Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleImpersonate(item)}
            disabled={impersonatingId === item.student_id}
            style={styles.impersonateBtn}
          >
            {impersonatingId === item.student_id ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="shield-half-outline" size={13} color="#FFF" />
                <Text style={styles.impersonateBtnText}>Support Mode</Text>
              </>
            )}
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
          <Text style={styles.topTag}>PLATFORM TENANTS</Text>
          <Text style={styles.screenTitle}>Students Directory</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{filteredStudents.length} Students</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBoxWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#A89687" />
          <TextInput
            placeholder="Search students by name, phone, room..."
            placeholderTextColor="#A89687"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchStudents(1)}
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); fetchStudents(1); }}>
              <Ionicons name="close-circle" size={18} color="#A89687" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* TOP TABS ROW 1: HOSTELS LIST TABS */}
      <View style={styles.tabSectionRow}>
        <View style={styles.tabSectionHeader}>
          <Ionicons name="business" size={13} color="#C2410C" />
          <Text style={styles.tabSectionTitle}>SELECT HOSTEL PROPERTY</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            onPress={() => handleSelectHostel(null)}
            style={[styles.hostelChip, selectedHostelId === null && styles.hostelChipActive]}
          >
            <Text style={[styles.hostelChipText, selectedHostelId === null && styles.hostelChipTextActive]}>
              🏠 All Properties ({hostels.length})
            </Text>
          </TouchableOpacity>
          {visibleHostels.map((h) => {
            const isSelected = selectedHostelId === h.hostel_id;
            return (
              <TouchableOpacity
                key={h.hostel_id}
                onPress={() => handleSelectHostel(isSelected ? null : h.hostel_id)}
                style={[styles.hostelChip, isSelected && styles.hostelChipActive]}
              >
                <Text style={[styles.hostelChipText, isSelected && styles.hostelChipTextActive]}>
                  {h.hostel_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* TOP TABS ROW 2: OWNERS LIST TABS (CONNECTED & CASCADING) */}
      <View style={styles.tabSectionRow}>
        <View style={styles.tabSectionHeader}>
          <Ionicons name="people" size={13} color="#7C3AED" />
          <Text style={[styles.tabSectionTitle, { color: '#7C3AED' }]}>
            {selectedHostelId ? 'HOSTEL OWNER (MATCHED)' : 'FILTER BY OWNER'}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            onPress={() => handleSelectOwner(null)}
            style={[styles.ownerChip, selectedOwnerId === null && styles.ownerChipActive]}
          >
            <Text style={[styles.ownerChipText, selectedOwnerId === null && styles.ownerChipTextActive]}>
              👑 All Owners ({visibleOwners.length})
            </Text>
          </TouchableOpacity>
          {visibleOwners.map((o) => {
            const isSelected = selectedOwnerId === o.user_id;
            return (
              <TouchableOpacity
                key={o.user_id}
                onPress={() => handleSelectOwner(isSelected ? null : o.user_id)}
                style={[styles.ownerChip, isSelected && styles.ownerChipActive]}
              >
                <Text style={[styles.ownerChipText, isSelected && styles.ownerChipTextActive]}>
                  👤 {o.full_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* TOP TABS ROW 3: STATUS SEGREGATION TABS */}
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
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading students directory...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => String(item.student_id)}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="school-outline" size={40} color="#C4B5A5" />
              <Text style={styles.emptyTitle}>No Students Found</Text>
              <Text style={styles.emptySub}>No students match the selected hostel property, owner, or status filter.</Text>
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
                <Text style={styles.modalTitle}>Set Student Password</Text>
                <Text style={styles.modalSub}>{selectedStudent?.first_name} {selectedStudent?.last_name || ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={22} color="#78716C" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Enter or Generate New Password</Text>
            <View style={styles.passInputRow}>
              <TextInput
                placeholder="e.g. 123456 or studentpass"
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
    color: '#059669',
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
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  countBadgeText: {
    color: '#059669',
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
  tabSectionRow: {
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: '#FAF6F0',
  },
  tabSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  tabSectionTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.6,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  hostelChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  hostelChipActive: {
    backgroundColor: '#C2410C',
    borderColor: '#C2410C',
  },
  hostelChipText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '700',
  },
  hostelChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  ownerChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  ownerChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  ownerChipText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '700',
  },
  ownerChipTextActive: {
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
    backgroundColor: '#059669',
    borderColor: '#059669',
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
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  studentName: {
    color: '#1C1917',
    fontSize: 15,
    fontWeight: '900',
  },
  studentHostel: {
    color: '#78716C',
    fontSize: 12,
    marginTop: 1,
  },
  studentPhone: {
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
  roomMetaRow: {
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
  rentText: {
    marginLeft: 'auto',
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
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
    backgroundColor: '#FEF3C7',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  resetPassBtnText: {
    color: '#B45309',
    fontSize: 11.5,
    fontWeight: '800',
  },
  impersonateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
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
    backgroundColor: '#FAF6F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C1917',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  generateBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  generateBtnText: {
    color: '#059669',
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
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  confirmSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
