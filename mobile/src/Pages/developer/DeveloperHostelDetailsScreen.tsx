import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [impersonating, setImpersonating] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!hostelId) return;
    try {
      setLoading(true);
      const res = await developerService.getHostelDetails(hostelId);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching hostel details:', err);
    } finally {
      setLoading(false);
    }
  }, [hostelId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleOpenAsOwner = () => {
    if (!data?.owner?.user_id) {
      Alert.alert('No Owner Found', 'This hostel does not have an owner user account associated.');
      return;
    }

    Alert.alert(
      'Enter Owner Support Mode',
      `You are entering the owner dashboard for ${data.hostel?.hostel_name || 'this hostel'} in controlled support mode.\n\nA top support banner with a live countdown timer will be displayed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enter Support Mode',
          onPress: async () => {
            try {
              setImpersonating(true);
              await enterSupportMode({
                target_user_id: data.owner.user_id,
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
    { id: 'SETTINGS', label: 'Rules & Info', icon: 'settings-outline' as const },
  ];

  const hostel = data?.hostel || {};
  const owner = data?.owner || {};
  const financial = data?.financial_summary || {};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1C1917" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTag}>HOSTEL INSPECTOR</Text>
          <Text style={styles.screenTitle} numberOfLines={1}>
            {hostel.hostel_name || 'Hostel Details'}
          </Text>
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
              <Text style={styles.supportModeBtnText}>Open as Owner</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#C2410C" />
          <Text style={styles.loadingText}>Loading hostel data...</Text>
        </View>
      ) : (
        <>
          {/* Horizontal Tabs */}
          <View style={styles.tabScrollWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.tabPill, activeTab === tab.id && styles.tabPillActive]}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={activeTab === tab.id ? '#FFFFFF' : '#8C7A6B'}
                  />
                  <Text style={[styles.tabPillText, activeTab === tab.id && styles.tabPillTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tab Content */}
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'OVERVIEW' && (
              <>
                {/* Header Summary Card */}
                <View style={styles.card}>
                  <View style={styles.hostelHeaderRow}>
                    <View style={styles.hostelIconBox}>
                      <Ionicons name="business" size={24} color="#C2410C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hostelBigName}>{hostel.hostel_name}</Text>
                      <Text style={styles.hostelAddress}>
                        {hostel.address ? `${hostel.address}, ` : ''}{hostel.city || ''}{hostel.state ? `, ${hostel.state}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Hostel ID</Text>
                      <Text style={styles.metaVal}>#{hostel.hostel_id}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Type</Text>
                      <Text style={styles.metaVal}>{hostel.hostel_type || 'Co-Living'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Occupancy</Text>
                      <Text style={[styles.metaVal, { color: '#C2410C' }]}>
                        {hostel.total_beds > 0
                          ? `${Math.round((Number(hostel.occupied_beds || 0) / Number(hostel.total_beds)) * 100)}%`
                          : '0%'}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Status</Text>
                      <Text style={[styles.metaVal, { color: hostel.is_active ? '#059669' : '#DC2626' }]}>
                        {hostel.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Owner Card */}
                <View style={styles.card}>
                  <Text style={styles.cardHeading}>OWNER INFORMATION</Text>
                  <View style={styles.ownerRow}>
                    <View style={styles.ownerAvatar}>
                      <Ionicons name="person" size={18} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ownerNameText}>{owner.full_name || 'No Owner Name'}</Text>
                      <Text style={styles.ownerEmailText}>{owner.email}</Text>
                      {owner.phone ? <Text style={styles.ownerPhoneText}>📞 {owner.phone}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={handleOpenAsOwner} style={styles.miniSupportBtn}>
                      <Text style={styles.miniSupportBtnText}>Open</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Capacity & Finances */}
                <View style={styles.card}>
                  <Text style={styles.cardHeading}>CAPACITY & FINANCIAL SNAPSHOT</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statVal}>{data?.rooms?.length || 0}</Text>
                      <Text style={styles.statLbl}>Total Rooms</Text>
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

                  <View style={styles.divider} />

                  <View style={styles.financialRow}>
                    <View>
                      <Text style={styles.finLabel}>Total Collected</Text>
                      <Text style={styles.finValGreen}>₹{Number(financial.total_collected || 0).toLocaleString('en-IN')}</Text>
                    </View>
                    <View>
                      <Text style={styles.finLabel}>Pending Dues</Text>
                      <Text style={styles.finValAmber}>₹{Number(financial.total_pending || 0).toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            {activeTab === 'ROOMS' && (
              <View>
                {(data?.rooms || []).map((r: any) => (
                  <View key={r.room_id} style={styles.roomItem}>
                    <View style={styles.roomLeft}>
                      <View style={styles.roomBadge}>
                        <Text style={styles.roomNumber}>R-{r.room_number}</Text>
                      </View>
                      <View>
                        <Text style={styles.roomFloor}>Floor: {r.floor_number || 1} • {r.room_type || 'Standard'}</Text>
                        <Text style={styles.roomCapacity}>Beds: {r.occupied_beds || 0} / {r.capacity || r.total_beds || 1}</Text>
                      </View>
                    </View>
                    <Text style={styles.roomRent}>₹{Number(r.price_per_bed || r.monthly_rent || 0).toLocaleString('en-IN')}/mo</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'STUDENTS' && (
              <View>
                {(data?.students || []).map((s: any) => (
                  <View key={s.student_id} style={styles.studentItem}>
                    <View style={styles.studentAvatar}>
                      <Ionicons name="school" size={16} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentNameText}>{s.first_name} {s.last_name || ''}</Text>
                      <Text style={styles.studentRoomText}>Room {s.room_number || 'N/A'} • Bed {s.bed_number || 'N/A'}</Text>
                      <Text style={styles.studentContactText}>📞 {s.phone || s.email || 'N/A'}</Text>
                    </View>
                    <View style={[styles.statusBadge, String(s.status).toLowerCase() === 'active' ? styles.statusActive : styles.statusInactive]}>
                      <Text style={[styles.statusBadgeText, { color: String(s.status).toLowerCase() === 'active' ? '#059669' : '#8C7A6B' }]}>
                        {String(s.status || 'ACTIVE').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'FINANCE' && (
              <View style={styles.card}>
                <Text style={styles.cardHeading}>FINANCIAL SUMMARY</Text>
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

            {activeTab === 'COMPLAINTS' && (
              <View>
                {(data?.complaints || []).length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="checkmark-circle-outline" size={36} color="#059669" />
                    <Text style={styles.emptyTitle}>No Complaints Logged</Text>
                  </View>
                ) : (
                  (data?.complaints || []).map((c: any) => (
                    <View key={c.complaint_id} style={styles.card}>
                      <Text style={styles.complaintTitle}>{c.title || c.category || 'Complaint'}</Text>
                      <Text style={styles.complaintDesc}>{c.description}</Text>
                      <View style={styles.complaintMeta}>
                        <Text style={styles.complaintStatus}>Status: {c.status}</Text>
                        <Text style={styles.complaintDate}>{new Date(c.created_at).toLocaleDateString()}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'NOTICES' && (
              <View>
                {(data?.notices || []).length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="megaphone-outline" size={36} color="#A89687" />
                    <Text style={styles.emptyTitle}>No Notices Published</Text>
                  </View>
                ) : (
                  (data?.notices || []).map((n: any) => (
                    <View key={n.notice_id} style={styles.card}>
                      <Text style={styles.noticeTitle}>{n.title}</Text>
                      <Text style={styles.noticeBody}>{n.message || n.description}</Text>
                      <Text style={styles.noticeDate}>{new Date(n.created_at).toLocaleDateString()}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'STAFF' && (
              <View>
                {(data?.staff || []).length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="people-outline" size={36} color="#A89687" />
                    <Text style={styles.emptyTitle}>No Staff Members Registered</Text>
                  </View>
                ) : (
                  (data?.staff || []).map((st: any) => (
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

            {activeTab === 'SETTINGS' && (
              <View style={styles.card}>
                <Text style={styles.cardHeading}>HOSTEL RULES & DETAILS</Text>
                <Text style={styles.settingText}>• Gate Closing Time: {hostel.gate_closing_time || '10:00 PM'}</Text>
                <Text style={styles.settingText}>• Wifi Password: {hostel.wifi_password || 'Not provided'}</Text>
                <Text style={styles.settingText}>• Notice Period: {hostel.notice_period_days || 30} days</Text>
                <Text style={styles.settingText}>• Food / Mess Included: {hostel.food_included ? 'Yes' : 'No'}</Text>
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
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE7DC',
    backgroundColor: '#FAF6F0',
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
    fontSize: 16,
    fontWeight: '900',
  },
  supportModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C2410C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#C2410C',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  supportModeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
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
  tabScrollWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFE7DC',
    backgroundColor: '#FAF6F0',
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE7DC',
  },
  tabPillActive: {
    backgroundColor: '#C2410C',
    borderColor: '#C2410C',
  },
  tabPillText: {
    color: '#78716C',
    fontSize: 11,
    fontWeight: '700',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFE7DC',
    shadowColor: '#8C3A00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  hostelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hostelIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  hostelBigName: {
    color: '#1C1917',
    fontSize: 16,
    fontWeight: '900',
  },
  hostelAddress: {
    color: '#78716C',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F5EFE6',
    marginVertical: 12,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    width: '46%',
  },
  metaLabel: {
    color: '#A89687',
    fontSize: 10,
    fontWeight: '700',
  },
  metaVal: {
    color: '#1C1917',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  cardHeading: {
    color: '#8C7A6B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ownerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    fontSize: 11,
  },
  ownerPhoneText: {
    color: '#78716C',
    fontSize: 11,
    marginTop: 2,
  },
  miniSupportBtn: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  miniSupportBtnText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    color: '#1C1917',
    fontSize: 15,
    fontWeight: '900',
  },
  statLbl: {
    color: '#A89687',
    fontSize: 10,
    marginTop: 1,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  finLabel: {
    color: '#78716C',
    fontSize: 11,
    fontWeight: '600',
  },
  finValGreen: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  finValAmber: {
    color: '#D97706',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  roomNumber: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '800',
  },
  roomFloor: {
    color: '#1C1917',
    fontSize: 12,
    fontWeight: '700',
  },
  roomCapacity: {
    color: '#78716C',
    fontSize: 11,
  },
  roomRent: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '800',
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFE7DC',
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
    fontSize: 13,
    fontWeight: '800',
  },
  studentRoomText: {
    color: '#78716C',
    fontSize: 11,
    marginTop: 1,
  },
  studentContactText: {
    color: '#A89687',
    fontSize: 10,
    marginTop: 1,
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
  finBlock: {
    marginBottom: 12,
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
    color: '#57534E',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
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
    marginTop: 10,
  },
  complaintTitle: {
    color: '#1C1917',
    fontSize: 14,
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
    color: '#C2410C',
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
    fontSize: 10,
    marginTop: 8,
  },
  settingText: {
    color: '#44403C',
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
});
