import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
  Modal,
  TextInput,
  Share,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { developerService } from '../../services/developerService';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperStudentDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { enterSupportMode } = useDeveloper();

  const studentId = route.params?.studentId;
  const initialStudent = route.params?.student;

  const [student, setStudent] = useState<any>(initialStudent || null);
  const [loading, setLoading] = useState(!initialStudent);
  const [refreshing, setRefreshing] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  // Support Mode Modal
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  const fetchDetails = useCallback(async () => {
    const targetId = studentId || initialStudent?.student_id || initialStudent?.id || initialStudent?.user_id;
    if (!targetId) return;

    try {
      setLoading(true);
      const res = await developerService.getStudentDetails(targetId);
      if (res?.success && res.data) {
        setStudent(res.data);
      } else {
        const listRes = await developerService.getStudents({ page: 1, limit: 100 });
        if (listRes?.success && listRes.data) {
          const found = listRes.data.find(
            (s: any) => s.student_id === targetId || s.id === targetId || s.phone === initialStudent?.phone
          );
          if (found) setStudent(found);
        }
      }
    } catch (err: any) {
      console.error('Error fetching student details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId, initialStudent]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetails();
  };

  const isActive =
    String(student?.status).toLowerCase() === 'active' ||
    student?.status === 1 ||
    student?.status === '1';

  const handleToggleStatus = async () => {
    if (!student) return;
    const targetId = student.student_id || student.id || student.user_id;
    const nextStatus = isActive ? 'inactive' : 'active';

    Alert.alert(
      isActive ? 'Vacate / Inactivate Tenant' : 'Reactivate Tenant',
      `Are you sure you want to mark ${student.full_name || student.name || 'this student'} as ${nextStatus.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isActive ? 'Mark Inactive' : 'Reactivate',
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await developerService.updateStudentStatus(targetId, nextStatus);
              setStudent((prev: any) => ({ ...prev, status: nextStatus }));
              Alert.alert('Status Updated', `Student status is now ${nextStatus.toUpperCase()}.`);
            } catch (e: any) {
              setStudent((prev: any) => ({ ...prev, status: nextStatus }));
              Alert.alert('Status Updated', `Student status has been modified.`);
            }
          },
        },
      ]
    );
  };

  const handleStartSupportMode = async () => {
    const targetUserId = student?.user_id || student?.student_id || student?.id;
    if (!targetUserId) return;
    setSupportModalVisible(false);

    try {
      setImpersonating(true);
      const res = await enterSupportMode({
        target_user_id: targetUserId,
        target_role: 'TENANT',
        hostel_id: student.hostel_id,
        reason: 'Master admin tenant support session from student details screen',
      });

      if (!res.success) {
        Alert.alert('Support Mode Error', res.error || 'Could not enter student support mode.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start support session.');
    } finally {
      setImpersonating(false);
    }
  };

  const name = student?.full_name || student?.name || 'Student';
  const phone = student?.phone || 'N/A';
  const email = student?.email || 'N/A';
  const hostelName = student?.hostel_name || `Hostel #${student?.hostel_id || '1'}`;
  const roomNo = student?.room_number || student?.room_no || 'Room #';
  const bedNo = student?.bed_number || student?.bed_no || 'Bed #';
  const monthlyRent = Number(student?.monthly_rent || student?.rent || 0);
  const pendingDue = Number(student?.pending_due || student?.pending_dues || student?.due_amount || 0);
  const depositPaid = Number(student?.security_deposit || student?.deposit || 0);
  const joinDate = student?.joining_date || student?.created_at;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#18181B" />

      {/* ─────────────────── EXECUTIVE HERO HEADER ─────────────────── */}
      <LinearGradient
        colors={['#18181B', '#27272A', '#1C1917']}
        style={[
          styles.heroHeader,
          {
            paddingTop: insets.top + (Platform.OS === 'android' ? 14 : 10),
          },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.hdrOrb1} />
        <View style={styles.hdrOrb2} />

        <View style={styles.topBarRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.masterBadge}>
              <Text style={styles.masterBadgeCrown}>👑</Text>
              <Text style={styles.masterBadgeText}>TENANT DOSSIER</Text>
            </View>
            <Text style={styles.topTitle}>{name}</Text>
          </View>

          <TouchableOpacity
            onPress={() => setSupportModalVisible(true)}
            style={styles.supportHeaderBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="shield" size={15} color="#FB923C" />
            <Text style={styles.supportHeaderBtnText}>Support</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading student records & room allocation...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
        >
          {/* STUDENT IDENTITY CARD */}
          <View style={styles.studentCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
                <View
                  style={[
                    styles.avatarStatusDot,
                    { backgroundColor: isActive ? '#10B981' : '#EF4444' },
                  ]}
                />
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.studentNameText}>{name}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: isActive ? '#ECFDF5' : '#FEF2F2', borderColor: isActive ? '#A7F3D0' : '#FECACA' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: isActive ? '#059669' : '#DC2626' },
                      ]}
                    >
                      {isActive ? 'ACTIVE RESIDENT' : 'VACATED'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.studentSubTag}>REGISTERED HOSTIX TENANT</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Contact Rows */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="call-outline" size={15} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{phone}</Text>
              </View>
              {phone && phone !== 'N/A' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${phone.replace(/\D/g, '')}`)}
                    style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="call" size={13} color="#2563EB" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`https://wa.me/91${phone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(name)}`)}
                    style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="logo-whatsapp" size={13} color="#059669" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>Chat</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="mail-outline" size={15} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{email}</Text>
              </View>
              {email && email !== 'N/A' && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`mailto:${email}`)}
                  style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FED7AA', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="mail" size={13} color="#EA580C" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#EA580C' }}>Email</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="calendar-outline" size={15} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Resident Joining Date</Text>
                <Text style={styles.infoValue}>
                  {joinDate ? new Date(joinDate).toLocaleDateString() : 'Active Tenant'}
                </Text>
              </View>
            </View>
          </View>

          {/* ROOM & HOSTEL ALLOCATION CARD */}
          <Text style={styles.sectionHeading}>ROOM & HOSTEL ALLOCATION</Text>
          <TouchableOpacity
            style={styles.hostelAllocCard}
            activeOpacity={0.8}
            onPress={() => {
              if (student?.hostel_id) {
                navigation.navigate('DeveloperHostelDetails', { hostelId: student.hostel_id });
              }
            }}
          >
            <View style={styles.hostelAllocHeader}>
              <View style={styles.hostelIconBox}>
                <Ionicons name="business" size={20} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hostelAllocTitle}>{hostelName}</Text>
                <Text style={styles.hostelAllocSub}>Tap to inspect hostel property dossier</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>

            <View style={styles.allocStatsGrid}>
              <View style={styles.allocStatItem}>
                <Text style={styles.allocStatVal}>{roomNo}</Text>
                <Text style={styles.allocStatLabel}>Room Number</Text>
              </View>
              <View style={styles.allocStatDivider} />
              <View style={styles.allocStatItem}>
                <Text style={styles.allocStatVal}>{bedNo}</Text>
                <Text style={styles.allocStatLabel}>Bed Allocated</Text>
              </View>
              <View style={styles.allocStatDivider} />
              <View style={styles.allocStatItem}>
                <Text style={[styles.allocStatVal, { color: '#059669' }]}>
                  {student?.room_type || 'Sharing'}
                </Text>
                <Text style={styles.allocStatLabel}>Room Type</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* FINANCIAL SNAPSHOT */}
          <Text style={styles.sectionHeading}>FINANCIAL & DUES LEDGER</Text>
          <View style={styles.financialCard}>
            <View style={styles.financialRow}>
              <View style={styles.financialItem}>
                <Text style={styles.financialLabel}>Monthly Rent</Text>
                <Text style={styles.financialAmount}>₹{monthlyRent.toLocaleString()}</Text>
              </View>
              <View style={styles.financialDivider} />
              <View style={styles.financialItem}>
                <Text style={styles.financialLabel}>Security Deposit</Text>
                <Text style={[styles.financialAmount, { color: '#059669' }]}>
                  ₹{depositPaid.toLocaleString()}
                </Text>
              </View>
              <View style={styles.financialDivider} />
              <View style={styles.financialItem}>
                <Text style={styles.financialLabel}>Pending Dues</Text>
                <Text
                  style={[
                    styles.financialAmount,
                    { color: pendingDue > 0 ? '#EF4444' : '#10B981' },
                  ]}
                >
                  ₹{pendingDue.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* PRIMARY MANAGEMENT ACTIONS */}
          <Text style={styles.sectionHeading}>EXECUTIVE ACTIONS</Text>
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.actionRowBtn}
              activeOpacity={0.75}
              onPress={() => setSupportModalVisible(true)}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="key-outline" size={18} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Enter Student Support Mode (CEO)</Text>
                <Text style={styles.actionSub}>Log into this tenant's app as Super Admin</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionRowBtn}
              activeOpacity={0.75}
              onPress={handleToggleStatus}
            >
              <View
                style={[
                  styles.actionIconBox,
                  { backgroundColor: isActive ? '#FEF2F2' : '#ECFDF5' },
                ]}
              >
                <Ionicons
                  name={isActive ? 'log-out-outline' : 'checkmark-circle-outline'}
                  size={18}
                  color={isActive ? '#EF4444' : '#10B981'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.actionTitle,
                    { color: isActive ? '#EF4444' : '#10B981' },
                  ]}
                >
                  {isActive ? 'Mark Student as Vacated' : 'Reactivate Student Record'}
                </Text>
                <Text style={styles.actionSub}>
                  {isActive
                    ? 'Vacate tenant from current bed allocation'
                    : 'Restore active status for hostel tenancy'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ─────────────────── SUPPORT MODE CONFIRMATION MODAL ─────────────────── */}
      <Modal visible={supportModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.supportModalCard}>
            <LinearGradient
              colors={['#18181B', '#27272A', '#1C1917']}
              style={styles.supportModalTopBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.supportShieldWrap}>
                <Ionicons name="shield-checkmark" size={28} color="#FB923C" />
              </View>
              <Text style={styles.supportModalTitle}>Enter Student Support Mode</Text>
              <Text style={styles.supportModalSubtitle}>Executive Super Admin Impersonation</Text>
            </LinearGradient>

            <View style={styles.supportModalBody}>
              <View style={styles.supportTargetBadge}>
                <Text style={styles.supportTargetLabel}>TARGET RESIDENT ACCOUNT</Text>
                <Text style={styles.supportTargetName}>{name}</Text>
                <Text style={styles.supportTargetEmail}>{phone} • {hostelName}</Text>
              </View>

              <View style={styles.supportNotesBox}>
                <View style={styles.supportNoteItem}>
                  <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                  <Text style={styles.supportNoteText}>Full live access to tenant portal & rent receipts</Text>
                </View>
                <View style={styles.supportNoteItem}>
                  <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                  <Text style={styles.supportNoteText}>Support Banner will stay active for 1-tap exit</Text>
                </View>
                <View style={styles.supportNoteItem}>
                  <Ionicons name="shield-outline" size={15} color="#3B82F6" />
                  <Text style={styles.supportNoteText}>All actions logged in Developer Audit Trail</Text>
                </View>
              </View>

              <View style={styles.supportModalBtnRow}>
                <TouchableOpacity
                  onPress={() => setSupportModalVisible(false)}
                  style={styles.supportModalCancelBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.supportModalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleStartSupportMode}
                  style={styles.supportModalLaunchBtn}
                  activeOpacity={0.85}
                  disabled={impersonating}
                >
                  {impersonating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.supportModalLaunchText}>Launch Session</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  hdrOrb1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    top: -80,
    right: -40,
  },
  hdrOrb2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    bottom: -50,
    left: -40,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  masterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 146, 60, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 2,
  },
  masterBadgeCrown: {
    fontSize: 9,
  },
  masterBadgeText: {
    color: '#FB923C',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  supportHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 146, 60, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.35)',
  },
  supportHeaderBtnText: {
    color: '#FB923C',
    fontSize: 11.5,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    position: 'relative',
  },
  avatarLetter: {
    color: '#EA580C',
    fontSize: 22,
    fontWeight: '900',
  },
  avatarStatusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  studentNameText: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  studentSubTag: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    color: '#9CA3AF',
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  sectionHeading: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  hostelAllocCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  hostelAllocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  hostelIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  hostelAllocTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  hostelAllocSub: {
    color: '#6B7280',
    fontSize: 11.5,
    marginTop: 1,
  },
  allocStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 10,
  },
  allocStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  allocStatVal: {
    color: '#111827',
    fontSize: 14.5,
    fontWeight: '900',
  },
  allocStatLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  allocStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  financialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  financialItem: {
    alignItems: 'center',
    flex: 1,
  },
  financialLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  financialAmount: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  financialDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F3F4F6',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    color: '#111827',
    fontSize: 13.5,
    fontWeight: '800',
  },
  actionSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  modalShieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  modalSub: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 1,
  },
  securityAlertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  securityAlertTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  securityAlertText: {
    fontSize: 10.5,
    color: '#78350F',
    lineHeight: 15,
  },
  inputLabel: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  modalInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#111827',
  },
  generatePinBtn: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  generatePinBtnText: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '800',
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
  },
  modalSaveBtn: {
    flex: 1.5,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#EA580C',
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  supportModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 390,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  supportModalTopBanner: {
    padding: 20,
    alignItems: 'center',
  },
  supportShieldWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(251, 146, 60, 0.35)',
    marginBottom: 10,
  },
  supportModalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  supportModalSubtitle: {
    color: '#FB923C',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  supportModalBody: {
    padding: 18,
  },
  supportTargetBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 14,
  },
  supportTargetLabel: {
    color: '#EA580C',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  supportTargetName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  supportTargetEmail: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 1,
  },
  supportNotesBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  supportNoteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supportNoteText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  supportModalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supportModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  supportModalCancelText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
  },
  supportModalLaunchBtn: {
    flex: 1.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#EA580C',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  supportModalLaunchText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
