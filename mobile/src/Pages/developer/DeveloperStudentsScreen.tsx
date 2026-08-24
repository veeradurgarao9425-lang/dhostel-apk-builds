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
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { developerService } from '../../services/developerService';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeveloperListSkeleton } from '../../components/ui/SkeletonCard';
import { DeveloperSupportModal } from '../../components/developer/DeveloperSupportModal';

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

  // Support Mode Modal State
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [selectedStudentForSupport, setSelectedStudentForSupport] = useState<any>(null);

  // View Student Details Modal State
  const [viewDetailsModalVisible, setViewDetailsModalVisible] = useState(false);
  const [detailStudent, setDetailStudent] = useState<any>(null);

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

  const handleOpenDetails = (student: any) => {
    setDetailStudent(student);
    setViewDetailsModalVisible(true);
  };

  const handleImpersonate = (student: any) => {
    setSelectedStudentForSupport(student);
    setSupportModalVisible(true);
  };

  const renderStudentCard = ({ item }: { item: any }) => {
    const fullName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unnamed Student';
    const isActive = String(item.status).toLowerCase() === 'active' || item.status === 1 || item.status === true;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('DeveloperStudentDetails', { studentId: item.student_id, student: item })}
      >
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
            <Ionicons name="bed-outline" size={13} color="#059669" />
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
            onPress={() => navigation.navigate('DeveloperStudentDetails', { studentId: item.student_id, student: item })}
            style={styles.viewProfileBtn}
          >
            <Ionicons name="document-text-outline" size={13} color="#059669" />
            <Text style={styles.viewProfileBtnText}>View Dossier</Text>
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
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─────────────────── CLEAN SIMPLE LIGHT HEADER ─────────────────── */}
      <View
        style={[
          styles.heroHeader,
          {
            paddingTop: insets.top + (Platform.OS === 'android' ? 10 : 6),
            backgroundColor: '#FFFFFF',
          },
        ]}
      >
        <View style={styles.topBarRow}>
          <View>
            <View style={styles.masterBadge}>
              <Text style={styles.masterBadgeCrown}>👑</Text>
              <Text style={styles.masterBadgeText}>PLATFORM TENANTS</Text>
              <View style={styles.masterBadgeLiveDot} />
            </View>
            <Text style={styles.screenTitle}>Students Directory</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredStudents.length} Students</Text>
          </View>
        </View>

        {/* Floating Search Bar */}
        <View style={styles.heroSearchBar}>
          <Ionicons name="search" size={17} color="#64748B" />
          <TextInput
            placeholder="Search students by name, phone, room..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchStudents(1)}
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

        {/* INTEGRATED TAB ROW 1: HOSTELS LIST TABS */}
        <View style={styles.hdrTabSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hdrTabsScroll}>
            <TouchableOpacity
              onPress={() => handleSelectHostel(null)}
              style={[styles.hdrHostelChip, selectedHostelId === null && styles.hdrHostelChipActive]}
            >
              <Text style={[styles.hdrHostelChipText, selectedHostelId === null && styles.hdrHostelChipTextActive]}>
                🏢 All Hostels ({hostels.length})
              </Text>
            </TouchableOpacity>
            {visibleHostels.map((h) => {
              const isSelected = selectedHostelId === h.hostel_id;
              return (
                <TouchableOpacity
                  key={h.hostel_id}
                  onPress={() => handleSelectHostel(isSelected ? null : h.hostel_id)}
                  style={[styles.hdrHostelChip, isSelected && styles.hdrHostelChipActive]}
                >
                  <Text style={[styles.hdrHostelChipText, isSelected && styles.hdrHostelChipTextActive]}>
                    🏠 {h.hostel_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* STATUS FILTER ROW OUTSIDE HEADER */}
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

      {/* VIEW FULL STUDENT DETAILS MODAL */}
      <Modal
        visible={viewDetailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setViewDetailsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModalCard}>
            <View style={styles.detailModalHeader}>
              <View style={styles.detailAvatarWrap}>
                <Ionicons name="school" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailNameText}>{detailStudent?.first_name} {detailStudent?.last_name || ''}</Text>
                <Text style={styles.detailSubText}>Tenant ID: #{detailStudent?.student_id}</Text>
              </View>
              <TouchableOpacity onPress={() => setViewDetailsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#78716C" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>PROPERTY & ROOM DETAILS</Text>
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailItemLabel}>Hostel:</Text>
                  <Text style={styles.detailItemValue}>{detailStudent?.hostel_name || 'N/A'}</Text>
                </View>
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailItemLabel}>Room Number:</Text>
                  <Text style={styles.detailItemValue}>Room {detailStudent?.room_number || 'N/A'}</Text>
                </View>
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailItemLabel}>Bed Number:</Text>
                  <Text style={styles.detailItemValue}>{detailStudent?.bed_number || 'N/A'}</Text>
                </View>
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailItemLabel}>Monthly Rent:</Text>
                  <Text style={[styles.detailItemValue, { color: '#059669', fontWeight: '900' }]}>
                    ₹{Number(detailStudent?.monthly_rent || 0).toLocaleString('en-IN')}/mo
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>CONTACT & PERSONAL INFO</Text>
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailItemLabel}>Phone Number:</Text>
                  <Text style={styles.detailItemValue}>{detailStudent?.phone || 'Not provided'}</Text>
                </View>
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailItemLabel}>Email Address:</Text>
                  <Text style={styles.detailItemValue}>{detailStudent?.email || 'Not provided'}</Text>
                </View>
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailItemLabel}>Emergency Contact:</Text>
                  <Text style={styles.detailItemValue}>{detailStudent?.emergency_contact || detailStudent?.guardian_phone || 'N/A'}</Text>
                </View>
                <View style={styles.detailItemRow}>
                  <Text style={styles.detailItemLabel}>Join Date:</Text>
                  <Text style={styles.detailItemValue}>{detailStudent?.join_date ? new Date(detailStudent.join_date).toLocaleDateString() : 'N/A'}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.detailBtnRow, { marginTop: 12 }]}>
              <TouchableOpacity
                onPress={() => {
                  setViewDetailsModalVisible(false);
                  navigation.navigate('DeveloperStudentDetails', {
                    studentId: detailStudent?.student_id,
                    student: detailStudent,
                  });
                }}
                style={[styles.detailResetBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', flex: 1 }]}
              >
                <Ionicons name="document-text-outline" size={13} color="#059669" />
                <Text style={[styles.detailResetBtnText, { color: '#059669' }]}>Full Dossier</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setViewDetailsModalVisible(false);
                  handleImpersonate(detailStudent);
                }}
                style={[styles.detailSupportBtn, { flex: 1 }]}
              >
                <Ionicons name="shield-half-outline" size={13} color="#FFF" />
                <Text style={styles.detailSupportBtnText}>Support Mode</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Executive Support Mode Modal */}
      <DeveloperSupportModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        targetUser={selectedStudentForSupport}
        targetRole="TENANT"
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
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hdrHostelChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  hdrHostelChipText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  hdrHostelChipTextActive: {
    color: '#059669',
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
    backgroundColor: '#059669',
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
  tabSectionRow: {
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: '#FFFFFF',
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
    color: '#059669',
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
    borderColor: '#E2E8F0',
  },
  hostelChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  hostelChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  hostelChipTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  ownerChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ownerChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  ownerChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  ownerChipTextActive: {
    color: '#059669',
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
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusFilterChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusFilterChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  statusFilterChipTextActive: {
    color: '#059669',
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
  rentText: {
    marginLeft: 'auto',
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  viewProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  viewProfileBtnText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  resetPassBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  resetPassBtnText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
  },
  impersonateBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: 10,
  },
  impersonateBtnText: {
    color: '#FFFFFF',
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
  detailModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE6',
  },
  detailAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailNameText: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '900',
  },
  detailSubText: {
    color: '#78716C',
    fontSize: 11.5,
    marginTop: 2,
  },
  detailSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  detailSectionTitle: {
    color: '#A89687',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailItemLabel: {
    color: '#78716C',
    fontSize: 12,
  },
  detailItemValue: {
    color: '#1C1917',
    fontSize: 12,
    fontWeight: '700',
  },
  detailBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  detailResetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    borderRadius: 10,
  },
  detailResetBtnText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '800',
  },
  detailSupportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
  },
  detailSupportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
