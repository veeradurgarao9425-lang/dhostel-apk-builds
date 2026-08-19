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

export default function DeveloperStudentsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { enterSupportMode } = useDeveloper();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  const fetchStudents = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else if (pageNum === 1) setLoading(true);

        const statusParam = statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE' ? 'active' : 'inactive';
        const res = await developerService.getStudents({
          page: pageNum,
          limit: 15,
          search: search.trim() || undefined,
          status: statusParam,
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
    [search, statusFilter]
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
          <View style={[styles.statusBadge, String(item.status).toLowerCase() === 'active' ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusBadgeText, { color: String(item.status).toLowerCase() === 'active' ? '#059669' : '#8C7A6B' }]}>
              {String(item.status || 'ACTIVE').toUpperCase()}
            </Text>
          </View>
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

        <View style={styles.cardActions}>
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
                <Ionicons name="shield-half-outline" size={14} color="#FFF" />
                <Text style={styles.impersonateBtnText}>Open as Student (Support)</Text>
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
          <Text style={styles.countBadgeText}>{students.length} Loaded</Text>
        </View>
      </View>

      {/* Search and Filters */}
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
          <Text style={styles.loadingText}>Loading students directory...</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.student_id)}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C2410C" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="school-outline" size={40} color="#C4B5A5" />
              <Text style={styles.emptyTitle}>No Students Found</Text>
              <Text style={styles.emptySub}>No students match the active filters or search query.</Text>
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
  },
  impersonateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#059669',
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
