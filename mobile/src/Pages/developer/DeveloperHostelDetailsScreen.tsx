import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperHostelDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { enterSupportMode } = useDeveloper();

  const hostelId = route.params?.hostelId;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ROOMS' | 'STUDENTS' | 'FINANCE' | 'COMPLAINTS' | 'NOTICES' | 'STAFF' | 'SETTINGS'>('OVERVIEW');
  const [impersonating, setImpersonating] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!hostelId) return;
    try {
      setLoading(true);
      const res = await developerService.getHostelDetails(hostelId);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('Error fetching hostel details:', err);
      Alert.alert('Load Notice', err.message || 'Could not fetch full hostel details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hostelId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetails();
  };

  const handleOpenAsOwner = () => {
    if (!data?.owner?.user_id && !data?.hostel?.owner_id) {
      Alert.alert('No Owner Found', 'This hostel does not have an owner user account associated.');
      return;
    }

    const targetUserId = data?.owner?.user_id || data?.hostel?.owner_id;

    Alert.alert(
      'Enter Owner Support Mode (CEO)',
      `You are entering the owner dashboard for ${data.hostel?.hostel_name || 'this property'} in controlled support mode.\n\nA top support banner with a live countdown timer will be displayed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Account',
          onPress: async () => {
            try {
              setImpersonating(true);
              await enterSupportMode({
                target_user_id: targetUserId,
                target_role: 'OWNER',
                hostel_id: data.hostel?.hostel_id,
              });
            } catch (err: any) {
              Alert.alert('Support Mode Error', err.message || 'Failed to start support session.');
            } finally {
              setImpersonating(false);
            }
          },
        },
      ]
    );
  };

  const TABS = [
    { id: 'OVERVIEW', label: 'Overview', icon: 'grid-outline' as const },
    { id: 'ROOMS', label: `Rooms (${data?.rooms?.length || 0})`, icon: 'bed-outline' as const },
    { id: 'STUDENTS', label: `Students (${data?.students?.length || 0})`, icon: 'school-outline' as const },
    { id: 'FINANCE', label: 'Finance', icon: 'cash-outline' as const },
    { id: 'COMPLAINTS', label: `Complaints (${data?.complaints?.length || 0})`, icon: 'alert-circle-outline' as const },
    { id: 'NOTICES', label: `Notices (${data?.notices?.length || 0})`, icon: 'megaphone-outline' as const },
    { id: 'STAFF', label: `Staff (${data?.staff?.length || 0})`, icon: 'people-outline' as const },
  ];

  const hostel = data?.hostel || {};
  const owner = data?.owner || {};
  const financial = data?.financial || {};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#1C1917" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTag}>HOSTEL INSPECTOR (CEO)</Text>
          <Text style={styles.screenTitle} numberOfLines={1}>{hostel.hostel_name || 'Hostel Details'}</Text>
        </View>
        <TouchableOpacity
          onPress={handleOpenAsOwner}
          disabled={impersonating}
          style={styles.supportModeBtn}
          activeOpacity={0.8}
        >
          {impersonating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="shield-half-outline" size={13} color="#FFF" />
              <Text style={styles.supportModeBtnText}>Support Mode</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#C2410C" />
          <Text style={styles.loadingText}>Loading hostel data...</Text>
        </View>
      ) : (
        <>
          {/* Horizontal Sub-Tabs Bar */}
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
              {TABS.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setActiveTab(t.id as any)}
                  style={[styles.tabItem, activeTab === t.id && styles.tabItemActive]}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={t.icon}
                    size={14}
                    color={activeTab === t.id ? '#FFFFFF' : '#78716C'}
                  />
                  <Text style={[styles.tabItemText, activeTab === t.id && styles.tabItemTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Sub-Tab Content View */}
          <ScrollView
            style={styles.contentArea}
            contentContainerStyle={styles.contentPadding}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C2410C" />}
            showsVerticalScrollIndicator={false}
          >
            {/* OVERVIEW TAB */}
            {activeTab === 'OVERVIEW' && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardHeading}>HOSTEL SUMMARY</Text>
                  <Text style={styles.hostelNameLg}>{hostel.hostel_name}</Text>
                  <Text style={styles.hostelAddress}>📍 {hostel.address || 'Address not listed'}, {hostel.city || ''} {hostel.state || ''}</Text>
                  <View style={styles.miniMetaRow}>
                    <View style={styles.miniPill}>
                      <Text style={styles.miniPillText}>Code: {hostel.hostel_code || 'N/A'}</Text>
                    </View>
                    <View style={[styles.miniPill, hostel.is_active ? styles.miniPillGreen : styles.miniPillRed]}>
                      <Text style={[styles.miniPillText, { color: hostel.is_active ? '#059669' : '#DC2626' }]}>
                        {hostel.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Owner Information */}
                <View style={styles.card}>
                  <Text style={styles.cardHeading}>OWNER INFORMATION</Text>
                  <View style={styles.ownerRow}>
                    <View style={styles.ownerAvatar}>
                      <Ionicons name="person" size={18} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ownerNameText}>{owner.full_name || hostel.owner_name || 'No Owner Listed'}</Text>
                      <Text style={styles.ownerEmailText}>{owner.email || 'Email not listed'}</Text>
                      {owner.phone ? <Text style={styles.ownerPhoneText}>📞 {owner.phone}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={handleOpenAsOwner} style={styles.miniSupportBtn}>
                      <Text style={styles.miniSupportBtnText}>Open</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Capacity & Finances */}
                <View style={styles.card}>
                  <Text style={styles.cardHeading}>CAPACITY & STATS</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statVal}>{data?.rooms?.length || 0}</Text>
                      <Text style={styles.statLbl}>Rooms</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statVal}>{hostel.total_beds || 0}</Text>
                      <Text style={styles.statLbl}>Total Beds</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statVal}>{hostel.occupied_beds || 0}</Text>
                      <Text style={styles.statLbl}>Occupied</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statVal}>{data?.students?.length || 0}</Text>
                      <Text style={styles.statLbl}>Students</Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* ROOMS TAB */}
            {activeTab === 'ROOMS' && (
              <View>
                <View style={styles.tabActionHeader}>
                  <Text style={styles.sectionHeaderTitle}>Rooms & Beds Inventory</Text>
                  <TouchableOpacity
                    onPress={handleOpenAsOwner}
                    style={styles.addActionButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.addActionButtonText}>Add Room</Text>
                  </TouchableOpacity>
                </View>

                {(!data?.rooms || data.rooms.length === 0) ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="bed-outline" size={40} color="#C4B5A5" />
                    <Text style={styles.emptyTitle}>No Rooms Configured</Text>
                    <Text style={styles.emptySub}>No rooms have been added to this hostel property yet.</Text>
                    <TouchableOpacity onPress={handleOpenAsOwner} style={styles.emptyActionBtn}>
                      <Text style={styles.emptyActionBtnText}>+ Add First Room</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  data.rooms.map((r: any) => (
                    <View key={r.room_id} style={styles.roomItem}>
                      <View style={styles.roomLeft}>
                        <View style={styles.roomBadge}>
                          <Text style={styles.roomNumber}>R-{r.room_number}</Text>
                        </View>
                        <View>
                          <Text style={styles.roomFloor}>Floor {r.floor_number || 1} • {r.room_type || 'Standard'}</Text>
                          <Text style={styles.roomCapacity}>Beds: {r.occupied_beds || 0} / {r.capacity || r.total_beds || 1}</Text>
                        </View>
                      </View>
                      <Text style={styles.roomRent}>₹{Number(r.price_per_bed || r.monthly_rent || 0).toLocaleString('en-IN')}/mo</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* STUDENTS TAB */}
            {activeTab === 'STUDENTS' && (
              <View>
                <View style={styles.tabActionHeader}>
                  <Text style={styles.sectionHeaderTitle}>Registered Students</Text>
                  <TouchableOpacity
                    onPress={handleOpenAsOwner}
                    style={[styles.addActionButton, { backgroundColor: '#059669' }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.addActionButtonText}>Add Student</Text>
                  </TouchableOpacity>
                </View>

                {(!data?.students || data.students.length === 0) ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="school-outline" size={40} color="#C4B5A5" />
                    <Text style={styles.emptyTitle}>No Students in this Hostel</Text>
                    <Text style={styles.emptySub}>Currently there are no active students enrolled in this property.</Text>
                    <TouchableOpacity onPress={handleOpenAsOwner} style={[styles.emptyActionBtn, { backgroundColor: '#059669' }]}>
                      <Text style={styles.emptyActionBtnText}>+ Register Student</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  data.students.map((s: any) => (
                    <View key={s.student_id} style={styles.studentItem}>
                      <View style={styles.studentAvatar}>
                        <Ionicons name="school" size={16} color="#059669" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentNameText}>{s.first_name} {s.last_name || ''}</Text>
                        <Text style={styles.studentRoomText}>Room {s.room_number || 'N/A'} • Bed {s.bed_number || 'N/A'}</Text>
                        <Text style={styles.studentContactText}>📞 {s.phone || s.email || 'N/A'}</Text>
                      </View>
                      <View style={[styles.statusBadge, String(s.status).toLowerCase() === 'active' || s.status === 1 ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusBadgeText, { color: String(s.status).toLowerCase() === 'active' || s.status === 1 ? '#059669' : '#DC2626' }]}>
                          {String(s.status).toLowerCase() === 'active' || s.status === 1 ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* FINANCE TAB */}
            {activeTab === 'FINANCE' && (
              <View style={styles.card}>
                <Text style={styles.cardHeading}>FINANCIAL OVERVIEW</Text>
                <View style={styles.finBlock}>
                  <Text style={styles.finBlockLbl}>Total Revenue Collected</Text>
                  <Text style={styles.finBlockValGreen}>₹{Number(financial.total_collected || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.finBlock}>
                  <Text style={styles.finBlockLbl}>Total Pending Dues</Text>
                  <Text style={styles.finBlockValAmber}>₹{Number(financial.total_pending || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.finBlock}>
                  <Text style={styles.finBlockLbl}>Total Expenses Recorded</Text>
                  <Text style={styles.finBlockValMuted}>₹{Number(financial.total_expenses || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>
            )}

            {/* COMPLAINTS TAB */}
            {activeTab === 'COMPLAINTS' && (
              <View>
                {(!data?.complaints || data.complaints.length === 0) ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="checkmark-circle-outline" size={40} color="#059669" />
                    <Text style={styles.emptyTitle}>No Complaints Logged</Text>
                    <Text style={styles.emptySub}>All student complaints for this property have been resolved.</Text>
                  </View>
                ) : (
                  data.complaints.map((c: any) => (
                    <View key={c.complaint_id} style={styles.card}>
                      <Text style={styles.complaintTitle}>{c.title || c.category || 'Complaint'}</Text>
                      <Text style={styles.complaintDesc}>{c.description}</Text>
                      <View style={styles.complaintMeta}>
                        <Text style={styles.complaintStatus}>Status: {c.status}</Text>
                        <Text style={styles.complaintDate}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recent'}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* NOTICES TAB */}
            {activeTab === 'NOTICES' && (
              <View>
                <View style={styles.tabActionHeader}>
                  <Text style={styles.sectionHeaderTitle}>Hostel Notice Board</Text>
                  <TouchableOpacity
                    onPress={handleOpenAsOwner}
                    style={[styles.addActionButton, { backgroundColor: '#7C3AED' }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.addActionButtonText}>Post Notice</Text>
                  </TouchableOpacity>
                </View>

                {(!data?.notices || data.notices.length === 0) ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="megaphone-outline" size={40} color="#C4B5A5" />
                    <Text style={styles.emptyTitle}>No Notices Published</Text>
                    <Text style={styles.emptySub}>No announcements or notices have been posted on this board.</Text>
                    <TouchableOpacity onPress={handleOpenAsOwner} style={[styles.emptyActionBtn, { backgroundColor: '#7C3AED' }]}>
                      <Text style={styles.emptyActionBtnText}>+ Post Notice</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  data.notices.map((n: any) => (
                    <View key={n.notice_id} style={styles.card}>
                      <Text style={styles.noticeTitle}>{n.title}</Text>
                      <Text style={styles.noticeBody}>{n.message || n.description}</Text>
                      <Text style={styles.noticeDate}>{n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent'}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* STAFF TAB */}
            {activeTab === 'STAFF' && (
              <View>
                {(!data?.staff || data.staff.length === 0) ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="people-outline" size={40} color="#C4B5A5" />
                    <Text style={styles.emptyTitle}>No Staff Members Registered</Text>
                    <Text style={styles.emptySub}>No wardens, cooks, or cleaners have been assigned yet.</Text>
                  </View>
                ) : (
                  data.staff.map((st: any) => (
                    <View key={st.staff_id} style={styles.studentItem}>
                      <View style={styles.ownerAvatar}>
                        <Ionicons name="person" size={16} color="#7C3AED" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentNameText}>{st.name}</Text>
                        <Text style={styles.studentRoomText}>Role: {st.role || 'Staff'} • 📞 {st.phone || 'N/A'}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE7DC',
    backgroundColor: '#FAF6F0',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  topTag: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  screenTitle: {
    color: '#1C1917',
    fontSize: 17,
    fontWeight: '900',
  },
  supportModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  supportModeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  tabsContainer: {
    backgroundColor: '#FAF6F0',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE7DC',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  tabItemActive: {
    backgroundColor: '#C2410C',
    borderColor: '#C2410C',
  },
  tabItemText: {
    color: '#78716C',
    fontSize: 11.5,
    fontWeight: '700',
  },
  tabItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  contentArea: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
    paddingBottom: 40,
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
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeading: {
    color: '#A89687',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  hostelNameLg: {
    color: '#1C1917',
    fontSize: 18,
    fontWeight: '900',
  },
  hostelAddress: {
    color: '#78716C',
    fontSize: 12,
    marginTop: 4,
  },
  miniMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  miniPill: {
    backgroundColor: '#FAF6F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  miniPillGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  miniPillRed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  miniPillText: {
    color: '#44403C',
    fontSize: 11,
    fontWeight: '700',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ownerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerNameText: {
    color: '#1C1917',
    fontSize: 14,
    fontWeight: '800',
  },
  ownerEmailText: {
    color: '#78716C',
    fontSize: 11.5,
  },
  ownerPhoneText: {
    color: '#78716C',
    fontSize: 11,
    marginTop: 2,
  },
  miniSupportBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniSupportBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAF6F0',
    borderRadius: 12,
    padding: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    color: '#1C1917',
    fontSize: 15,
    fontWeight: '900',
  },
  statLbl: {
    color: '#78716C',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  tabActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    color: '#1C1917',
    fontSize: 15,
    fontWeight: '900',
  },
  addActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C2410C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addActionButtonText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  roomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roomBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  roomNumber: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '900',
  },
  roomFloor: {
    color: '#1C1917',
    fontSize: 12.5,
    fontWeight: '700',
  },
  roomCapacity: {
    color: '#78716C',
    fontSize: 11,
    marginTop: 2,
  },
  roomRent: {
    color: '#059669',
    fontSize: 12.5,
    fontWeight: '900',
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    gap: 10,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentNameText: {
    color: '#1C1917',
    fontSize: 13.5,
    fontWeight: '800',
  },
  studentRoomText: {
    color: '#78716C',
    fontSize: 11.5,
    marginTop: 1,
  },
  studentContactText: {
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
  finBlock: {
    marginBottom: 10,
  },
  finBlockLbl: {
    color: '#78716C',
    fontSize: 11,
    fontWeight: '600',
  },
  finBlockValGreen: {
    color: '#059669',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  finBlockValAmber: {
    color: '#D97706',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  finBlockValMuted: {
    color: '#1C1917',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  complaintTitle: {
    color: '#1C1917',
    fontSize: 13.5,
    fontWeight: '800',
  },
  complaintDesc: {
    color: '#78716C',
    fontSize: 12,
    marginTop: 4,
  },
  complaintMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5EFE6',
  },
  complaintStatus: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },
  complaintDate: {
    color: '#A89687',
    fontSize: 11,
  },
  noticeTitle: {
    color: '#1C1917',
    fontSize: 14,
    fontWeight: '800',
  },
  noticeBody: {
    color: '#78716C',
    fontSize: 12,
    marginTop: 4,
  },
  noticeDate: {
    color: '#A89687',
    fontSize: 10.5,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFE7DC',
    marginTop: 10,
  },
  emptyTitle: {
    color: '#1C1917',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySub: {
    color: '#78716C',
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyActionBtn: {
    backgroundColor: '#C2410C',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 14,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
