import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Platform,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { developerService } from '../../services/developerService';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperHostelDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { enterSupportMode } = useDeveloper();

  const hostelId = route.params?.hostelId;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'STUDENTS' | 'ROOMS' | 'PAYMENTS' | 'EXPENSES' | 'COMPLAINTS' | 'OWNER'
  >('OVERVIEW');
  const [supportLoading, setSupportLoading] = useState(false);

  const fetchHostel = useCallback(async () => {
    if (!hostelId) return;
    try {
      setLoading(true);
      const res = await developerService.getHostelDetails(hostelId);
      if (res?.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Fetch hostel details error:', err);
    } finally {
      setLoading(false);
    }
  }, [hostelId]);

  useEffect(() => {
    fetchHostel();
  }, [fetchHostel]);

  const handleOpenAsOwner = () => {
    if (!data?.hostel?.owner_id) {
      Alert.alert('No Owner Assigned', 'This hostel has no owner account linked.');
      return;
    }

    Alert.alert(
      'Enter Support Impersonation',
      `You are about to view the app exactly as Owner: "${data.hostel.owner_name}".\n\nA secure 30-minute delegated session will be initiated and recorded in audit logs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Account',
          style: 'default',
          onPress: async () => {
            setSupportLoading(true);
            try {
              const res = await enterSupportMode({
                target_user_id: data.hostel.owner_id,
                target_role: 'OWNER',
                hostel_id: data.hostel.hostel_id,
                reason: `Inspecting hostel #${data.hostel.hostel_id} (${data.hostel.hostel_name})`,
              });
              if (!res.success) {
                Alert.alert('Support Mode Error', res.error || 'Failed to enter support mode');
              }
            } finally {
              setSupportLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenAsStudent = (student: any) => {
    Alert.alert(
      'Enter Student Support Mode',
      `View app as Student: "${student.first_name} ${student.last_name || ''}"?\n\nThis temporary session will be audit logged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open as Student',
          style: 'default',
          onPress: async () => {
            setSupportLoading(true);
            try {
              const res = await enterSupportMode({
                target_user_id: student.student_id,
                target_role: 'TENANT',
                hostel_id: data.hostel.hostel_id,
                reason: `Troubleshooting student account #${student.student_id}`,
              });
              if (!res.success) {
                Alert.alert('Support Mode Error', res.error || 'Failed to enter support mode');
              }
            } finally {
              setSupportLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async () => {
    const currentActive = !!data?.hostel?.is_active;
    const newStatus = !currentActive;

    Alert.alert(
      newStatus ? 'Activate Hostel' : 'Deactivate Hostel',
      `Are you sure you want to change status to ${newStatus ? 'ACTIVE' : 'INACTIVE'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await developerService.updateHostelStatus(hostelId, newStatus);
              fetchHostel();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Fetching complete hostel architecture...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { hostel, stats, students = [], rooms = [], payments = [], expenses = [], complaints = [] } = data || {};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#94A3B8" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{hostel?.hostel_name}</Text>
          <Text style={styles.headerSub}>Hostel ID: #{hostel?.hostel_id}</Text>
        </View>
        <TouchableOpacity onPress={handleToggleStatus} style={styles.statusToggleBtn}>
          <Text style={[styles.statusToggleText, { color: hostel?.is_active ? '#10B981' : '#EF4444' }]}>
            {hostel?.is_active ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Support Impersonation Action Banner */}
      <View style={styles.supportHeroBanner}>
        <View style={styles.supportHeroLeft}>
          <Text style={styles.supportHeroTitle}>Support Troubleshooting</Text>
          <Text style={styles.supportHeroSub}>
            Owner: <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>{hostel?.owner_name || 'Unassigned'}</Text>
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleOpenAsOwner}
          disabled={supportLoading}
          style={styles.openOwnerBtn}
        >
          {supportLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={15} color="#FFF" />
              <Text style={styles.openOwnerBtnText}>Open as Owner</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScrollView}
        contentContainerStyle={styles.tabsContainer}
      >
        {(
          [
            { key: 'OVERVIEW', label: 'Overview', icon: 'pie-chart-outline' },
            { key: 'STUDENTS', label: `Students (${students.length})`, icon: 'people-outline' },
            { key: 'ROOMS', label: `Rooms (${rooms.length})`, icon: 'bed-outline' },
            { key: 'PAYMENTS', label: `Payments (${payments.length})`, icon: 'card-outline' },
            { key: 'EXPENSES', label: `Expenses (${expenses.length})`, icon: 'cash-outline' },
            { key: 'COMPLAINTS', label: `Complaints (${complaints.length})`, icon: 'alert-circle-outline' },
            { key: 'OWNER', label: 'Owner Profile', icon: 'person-outline' },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
          >
            <Ionicons
              name={tab.icon as any}
              size={14}
              color={activeTab === tab.key ? '#FFFFFF' : '#94A3B8'}
            />
            <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
          <View>
            {/* Stat Cards */}
            <View style={styles.overviewGrid}>
              <View style={styles.overviewCard}>
                <Text style={styles.ovLabel}>Total Rooms</Text>
                <Text style={styles.ovVal}>{stats?.total_rooms || 0}</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={styles.ovLabel}>Total Beds</Text>
                <Text style={styles.ovVal}>{stats?.total_beds || 0}</Text>
              </View>
              <View style={[styles.overviewCard, { borderColor: '#10B981' }]}>
                <Text style={[styles.ovLabel, { color: '#10B981' }]}>Occupied</Text>
                <Text style={[styles.ovVal, { color: '#10B981' }]}>{stats?.occupied_beds || 0}</Text>
              </View>
              <View style={[styles.overviewCard, { borderColor: '#3B82F6' }]}>
                <Text style={[styles.ovLabel, { color: '#60A5FA' }]}>Available</Text>
                <Text style={[styles.ovVal, { color: '#60A5FA' }]}>{stats?.available_beds || 0}</Text>
              </View>
            </View>

            {/* Info Cards */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Hostel Profile & Details</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hostel Code</Text>
                <Text style={styles.infoValue}>{hostel?.hostel_code || 'None'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{hostel?.address || 'Not provided'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>City & State</Text>
                <Text style={styles.infoValue}>{hostel?.city || ''}{hostel?.state ? `, ${hostel.state}` : ''} ({hostel?.pincode || ''})</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contact Number</Text>
                <Text style={styles.infoValue}>{hostel?.contact_number || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Admission Fee</Text>
                <Text style={styles.infoValue}>₹{hostel?.admission_fee || 0}</Text>
              </View>
            </View>
          </View>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'STUDENTS' && (
          <View>
            {students.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>No students registered in this hostel.</Text>
              </View>
            ) : (
              students.map((st: any) => (
                <View key={st.student_id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View>
                      <Text style={styles.itemName}>{st.first_name} {st.last_name || ''}</Text>
                      <Text style={styles.itemSub}>Phone: {st.phone} • Room: {st.room_number || 'Unallocated'}</Text>
                    </View>
                    <View style={[styles.statusBadge, st.status === 1 ? styles.statusActive : styles.statusInactive]}>
                      <Text style={[styles.statusBadgeText, { color: st.status === 1 ? '#10B981' : '#94A3B8' }]}>
                        {st.status === 1 ? 'ACTIVE' : 'VACATED'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.itemActionRow}>
                    <Text style={styles.rentText}>Rent: ₹{st.monthly_rent || 0}/mo</Text>
                    <TouchableOpacity
                      onPress={() => handleOpenAsStudent(st)}
                      style={styles.openStudentBtn}
                    >
                      <Ionicons name="enter-outline" size={13} color="#10B981" />
                      <Text style={styles.openStudentBtnText}>Open as Student</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ROOMS TAB */}
        {activeTab === 'ROOMS' && (
          <View>
            {rooms.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>No rooms created for this hostel.</Text>
              </View>
            ) : (
              rooms.map((rm: any) => (
                <View key={rm.room_id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View>
                      <Text style={styles.itemName}>Room {rm.room_number}</Text>
                      <Text style={styles.itemSub}>Floor: {rm.floor || 1}</Text>
                    </View>
                    <View style={styles.capacityBadge}>
                      <Text style={styles.capacityText}>
                        {rm.occupied_beds || 0} / {rm.capacity || 1} Beds Occupied
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'PAYMENTS' && (
          <View>
            {payments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>No payments recorded.</Text>
              </View>
            ) : (
              payments.map((p: any) => (
                <View key={p.payment_id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View>
                      <Text style={styles.itemName}>{p.first_name} {p.last_name || ''}</Text>
                      <Text style={styles.itemSub}>Method: {p.payment_method || 'Online'} • {new Date(p.payment_date || p.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.paymentAmount}>₹{Number(p.amount || 0).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'EXPENSES' && (
          <View>
            {expenses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>No expenses logged.</Text>
              </View>
            ) : (
              expenses.map((ex: any) => (
                <View key={ex.expense_id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View>
                      <Text style={styles.itemName}>{ex.title || ex.category || 'Expense'}</Text>
                      <Text style={styles.itemSub}>{ex.category} • {new Date(ex.expense_date || ex.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.expenseAmount}>₹{Number(ex.amount || 0).toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* COMPLAINTS TAB */}
        {activeTab === 'COMPLAINTS' && (
          <View>
            {complaints.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>No complaints reported.</Text>
              </View>
            ) : (
              complaints.map((c: any) => (
                <View key={c.complaint_id} style={styles.itemCard}>
                  <Text style={styles.itemName}>{c.title || c.category || 'Complaint'}</Text>
                  <Text style={styles.itemSub}>By: {c.first_name} {c.last_name || ''} ({c.phone})</Text>
                  <Text style={styles.complaintDesc}>{c.description}</Text>
                  <View style={[styles.statusBadge, { alignSelf: 'flex-start', marginTop: 6 }]}>
                    <Text style={styles.statusBadgeText}>{c.status || 'PENDING'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* OWNER TAB */}
        {activeTab === 'OWNER' && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Owner Account Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{hostel?.owner_name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{hostel?.owner_email || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{hostel?.owner_phone || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Status</Text>
              <Text style={[styles.infoValue, { color: hostel?.owner_active ? '#10B981' : '#EF4444' }]}>
                {hostel?.owner_active ? 'Active' : 'Suspended'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Login</Text>
              <Text style={styles.infoValue}>{hostel?.owner_last_login ? new Date(hostel.owner_last_login).toLocaleString() : 'Never'}</Text>
            </View>

            <TouchableOpacity
              onPress={handleOpenAsOwner}
              style={[styles.openOwnerBtn, { marginTop: 16, width: '100%', justifyContent: 'center' }]}
            >
              <Ionicons name="shield-checkmark" size={16} color="#FFF" />
              <Text style={styles.openOwnerBtnText}>Open as Owner</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    color: '#64748B',
    fontSize: 11,
  },
  statusToggleBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusToggleText: {
    fontSize: 10,
    fontWeight: '800',
  },
  supportHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131D31',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  supportHeroLeft: {
    flex: 1,
    marginRight: 10,
  },
  supportHeroTitle: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  supportHeroSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  openOwnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openOwnerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  tabsScrollView: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  tabBtnActive: {
    backgroundColor: '#2563EB',
  },
  tabBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  contentScroll: {
    padding: 14,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 13,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  overviewCard: {
    width: '48%',
    backgroundColor: '#131D31',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  ovLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  ovVal: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },
  infoCard: {
    backgroundColor: '#131D31',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  infoCardTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  infoValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  itemCard: {
    backgroundColor: '#131D31',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  itemSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  itemActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  rentText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  openStudentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  openStudentBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  capacityBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  capacityText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  paymentAmount: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '800',
  },
  expenseAmount: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '800',
  },
  complaintDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131D31',
    borderRadius: 12,
  },
  emptyCardText: {
    color: '#64748B',
    fontSize: 13,
  },
});
