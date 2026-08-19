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

export default function DeveloperStudentsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { enterSupportMode } = useDeveloper();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | '1' | '0' | '3'>('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 15 });

  const fetchStudents = useCallback(
    async (currentPage = 1, query = search, status = statusFilter) => {
      try {
        setLoading(true);
        const res = await developerService.getStudents({
          page: currentPage,
          limit: 15,
          search: query.trim(),
          status: status === 'ALL' ? undefined : status,
        });

        if (res?.success && res.data) {
          setStudents(res.data.students || []);
          setPagination(res.data.pagination || { total: 0, totalPages: 1, limit: 15 });
          setPage(currentPage);
        }
      } catch (err) {
        console.error('Fetch students error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    fetchStudents(1, search, statusFilter);
  }, [statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents(1, search, statusFilter);
  };

  const handleOpenStudentAccount = (student: any) => {
    Alert.alert(
      'Enter Tenant Support Mode',
      `Open and troubleshoot account for Student: "${student.first_name} ${student.last_name || ''}"?\n\nThis delegated session will be recorded in audit logs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open as Student',
          style: 'default',
          onPress: async () => {
            try {
              const res = await enterSupportMode({
                target_user_id: student.student_id,
                target_role: 'TENANT',
                hostel_id: student.hostel_id,
                reason: `Troubleshooting student account #${student.student_id}`,
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

  const renderStudentCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarBox}>
            <Ionicons name="school" size={18} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName} numberOfLines={1}>
              {item.first_name} {item.last_name || ''}
            </Text>
            <Text style={styles.studentContact}>Phone: {item.phone} {item.email ? `• ${item.email}` : ''}</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, item.status === 1 ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.statusBadgeText, { color: item.status === 1 ? '#10B981' : '#94A3B8' }]}>
            {item.status === 1 ? 'ACTIVE' : item.status === 3 ? 'PENDING' : 'VACATED'}
          </Text>
        </View>
      </View>

      {/* Hostel & Room Tag */}
      <View style={styles.locationTagRow}>
        <View style={styles.locPill}>
          <Ionicons name="business" size={12} color="#60A5FA" />
          <Text style={styles.locPillText} numberOfLines={1}>{item.hostel_name || 'Unassigned Hostel'}</Text>
        </View>
        <View style={[styles.locPill, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
          <Ionicons name="bed" size={12} color="#F59E0B" />
          <Text style={[styles.locPillText, { color: '#F59E0B' }]}>Room {item.room_number || 'None'}</Text>
        </View>
      </View>

      {/* Footer Action */}
      <View style={styles.cardFooter}>
        <Text style={styles.rentText}>
          Rent: <Text style={styles.rentVal}>₹{item.monthly_rent || 0}/mo</Text>
        </Text>

        <TouchableOpacity
          onPress={() => handleOpenStudentAccount(item)}
          style={styles.openStudentBtn}
        >
          <Ionicons name="enter-outline" size={13} color="#FFFFFF" />
          <Text style={styles.openStudentBtnText}>Open as Student</Text>
        </TouchableOpacity>
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
        <Text style={styles.topBarTitle}>All Students ({pagination.total})</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search & Status Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students by name, phone, room, hostel..."
            placeholderTextColor="#64748B"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchStudents(1, search, statusFilter)}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); fetchStudents(1, '', statusFilter); }}>
              <Ionicons name="close-circle" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterTabs}>
          {[
            { key: 'ALL', label: 'All' },
            { key: '1', label: 'Active' },
            { key: '3', label: 'Pending' },
            { key: '0', label: 'Vacated' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setStatusFilter(tab.key as any)}
              style={[styles.filterTab, statusFilter === tab.key && styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, statusFilter === tab.key && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Students List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="school-outline" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>No students found</Text>
          <Text style={styles.emptySub}>Try searching with a different name or room number.</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.student_id)}
          renderItem={renderStudentCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
          ListFooterComponent={
            pagination.totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  disabled={page <= 1}
                  onPress={() => fetchStudents(page - 1)}
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                >
                  <Ionicons name="arrow-back" size={14} color={page <= 1 ? '#475569' : '#F8FAFC'} />
                  <Text style={[styles.pageBtnText, page <= 1 && { color: '#475569' }]}>Previous</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfo}>
                  Page <Text style={{ color: '#10B981', fontWeight: '800' }}>{page}</Text> of {pagination.totalPages}
                </Text>

                <TouchableOpacity
                  disabled={page >= pagination.totalPages}
                  onPress={() => fetchStudents(page + 1)}
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
    backgroundColor: '#10B981',
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
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  studentContact: {
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
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  locationTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  locPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  locPillText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
  },
  rentText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  rentVal: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  openStudentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  openStudentBtnText: {
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
