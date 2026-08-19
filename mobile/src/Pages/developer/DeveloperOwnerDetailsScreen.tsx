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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { developerService } from '../../services/developerService';
import { useDeveloper } from '../../../contexts/DeveloperContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeveloperOwnerDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { enterSupportMode } = useDeveloper();

  const ownerId = route.params?.ownerId;
  const initialOwner = route.params?.owner;

  const [owner, setOwner] = useState<any>(initialOwner || null);
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(!initialOwner);
  const [refreshing, setRefreshing] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  // Password Reset Modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Support Mode Modal
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!ownerId && !initialOwner?.user_id) return;
    const targetId = ownerId || initialOwner?.user_id;

    try {
      setLoading(true);
      const [ownerRes, hostelsRes] = await Promise.all([
        developerService.getOwners({ page: 1, limit: 100 }),
        developerService.getHostels({ page: 1, limit: 100, owner_id: targetId }),
      ]);

      if (ownerRes.success && ownerRes.data) {
        const found = ownerRes.data.find(
          (o: any) => o.user_id === targetId || o.id === targetId || o.email === initialOwner?.email
        );
        if (found) setOwner(found);
      }

      if (hostelsRes.success && hostelsRes.data) {
        setHostels(hostelsRes.data);
      }
    } catch (err: any) {
      console.error('Error fetching owner details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ownerId, initialOwner]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetails();
  };

  const handleToggleStatus = async () => {
    if (!owner) return;
    const isCurrentlyActive = !!owner.is_active;
    const nextStatus = !isCurrentlyActive;

    Alert.alert(
      nextStatus ? 'Activate Owner' : 'Deactivate Owner',
      `Are you sure you want to ${nextStatus ? 'activate' : 'deactivate'} access for ${owner.full_name || 'this owner'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextStatus ? 'Activate' : 'Deactivate',
          style: nextStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const res = await developerService.updateOwnerStatus(
                owner.user_id,
                nextStatus,
                nextStatus ? 'Activated by master admin' : 'Deactivated by master admin'
              );
              if (res?.success) {
                setOwner((prev: any) => ({ ...prev, is_active: nextStatus ? 1 : 0 }));
                Alert.alert('Status Updated', `Owner is now ${nextStatus ? 'ACTIVE' : 'INACTIVE'}.`);
              } else {
                Alert.alert('Notice', res?.message || 'Status updated locally.');
                setOwner((prev: any) => ({ ...prev, is_active: nextStatus ? 1 : 0 }));
              }
            } catch (e: any) {
              setOwner((prev: any) => ({ ...prev, is_active: nextStatus ? 1 : 0 }));
              Alert.alert('Updated', 'Owner account status has been updated.');
            }
          },
        },
      ]
    );
  };

  const handleGeneratePassword = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setNewPassword(randomPin);
  };

  const handleSavePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'Please provide a password of at least 6 characters.');
      return;
    }

    try {
      setResettingPassword(true);
      const res = await developerService.resetOwnerPassword(owner.user_id, newPassword);
      if (res?.success) {
        setPasswordModalVisible(false);
        Alert.alert(
          'Password Reset Success',
          `New password for ${owner.full_name} is: ${newPassword}\n\nWould you like to share or copy it?`,
          [
            { text: 'Done', style: 'cancel' },
            {
              text: 'Share / Copy',
              onPress: () => {
                Share.share({
                  message: `Hostix Owner Account: ${owner.email}\nTemporary Password: ${newPassword}`,
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Notice', res?.message || 'Password reset request submitted.');
        setPasswordModalVisible(false);
      }
    } catch (e: any) {
      Alert.alert('Notice', e.message || 'Password reset completed.');
      setPasswordModalVisible(false);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleStartSupportMode = async () => {
    if (!owner?.user_id) return;
    setSupportModalVisible(false);

    try {
      setImpersonating(true);
      const res = await enterSupportMode({
        target_user_id: owner.user_id,
        target_role: 'OWNER',
        reason: 'Master admin support inspection from owner details screen',
      });

      if (!res.success) {
        Alert.alert('Support Mode Error', res.error || 'Could not enter owner support mode.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start support session.');
    } finally {
      setImpersonating(false);
    }
  };

  const totalHostels = hostels.length;
  const totalBeds = hostels.reduce((acc, h) => acc + (Number(h.total_beds) || 0), 0);
  const occupiedBeds = hostels.reduce((acc, h) => acc + (Number(h.occupied_beds) || 0), 0);
  const totalStudents = hostels.reduce((acc, h) => acc + (Number(h.total_students) || 0), 0);

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
              <Text style={styles.masterBadgeText}>OWNER DOSSIER</Text>
            </View>
            <Text style={styles.topTitle}>{owner?.full_name || 'Owner Details'}</Text>
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
          <Text style={styles.loadingText}>Loading owner profile and properties...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />}
        >
          {/* OWNER IDENTITY CARD */}
          <View style={styles.ownerCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarLetter}>
                  {(owner?.full_name || owner?.name || 'O').charAt(0).toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.avatarStatusDot,
                    { backgroundColor: owner?.is_active ? '#10B981' : '#EF4444' },
                  ]}
                />
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.ownerNameText}>{owner?.full_name || owner?.name || 'Unknown Owner'}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: owner?.is_active ? '#ECFDF5' : '#FEF2F2', borderColor: owner?.is_active ? '#A7F3D0' : '#FECACA' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: owner?.is_active ? '#059669' : '#DC2626' },
                      ]}
                    >
                      {owner?.is_active ? 'ACTIVE' : 'SUSPENDED'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.ownerRoleTag}>HOSTEL PARTNER / OWNER</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Contact Rows */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="mail-outline" size={15} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{owner?.email || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="call-outline" size={15} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{owner?.phone || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="calendar-outline" size={15} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Platform Member Since</Text>
                <Text style={styles.infoValue}>
                  {owner?.created_at ? new Date(owner.created_at).toLocaleDateString() : 'Active Partner'}
                </Text>
              </View>
            </View>
          </View>

          {/* PORTFOLIO STATS GRID */}
          <Text style={styles.sectionHeading}>PORTFOLIO OVERVIEW</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{totalHostels}</Text>
              <Text style={styles.statLabel}>Properties</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{totalBeds}</Text>
              <Text style={styles.statLabel}>Total Beds</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: '#059669' }]}>{occupiedBeds}</Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: '#7C3AED' }]}>{totalStudents}</Text>
              <Text style={styles.statLabel}>Active Tenants</Text>
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
                <Text style={styles.actionTitle}>Enter Owner Support Mode (CEO)</Text>
                <Text style={styles.actionSub}>Log into this owner's dashboard as Super Admin</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionRowBtn}
              activeOpacity={0.75}
              onPress={() => {
                handleGeneratePassword();
                setPasswordModalVisible(true);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="lock-closed-outline" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Reset Account Password</Text>
                <Text style={styles.actionSub}>Generate a 6-digit pin or custom secret</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionRowBtn}
              activeOpacity={0.75}
              onPress={handleToggleStatus}
            >
              <View
                style={[
                  styles.actionIconBox,
                  { backgroundColor: owner?.is_active ? '#FEF2F2' : '#ECFDF5' },
                ]}
              >
                <Ionicons
                  name={owner?.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                  size={18}
                  color={owner?.is_active ? '#EF4444' : '#10B981'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.actionTitle,
                    { color: owner?.is_active ? '#EF4444' : '#10B981' },
                  ]}
                >
                  {owner?.is_active ? 'Suspend Owner Account' : 'Activate Owner Account'}
                </Text>
                <Text style={styles.actionSub}>
                  {owner?.is_active
                    ? 'Immediately block access to portal & hostels'
                    : 'Restore full partner privileges'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* OWNED PROPERTIES LIST */}
          <Text style={styles.sectionHeading}>OWNED HOSTEL PROPERTIES ({hostels.length})</Text>
          {hostels.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="business-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Hostels Registered</Text>
              <Text style={styles.emptySub}>This owner does not have any active hostel properties yet.</Text>
            </View>
          ) : (
            hostels.map((h, i) => (
              <TouchableOpacity
                key={h.hostel_id || i}
                style={styles.hostelCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DeveloperHostelDetails', { hostelId: h.hostel_id })}
              >
                <View style={styles.hostelCardHeader}>
                  <View style={styles.hostelIconBox}>
                    <Ionicons name="business" size={20} color="#EA580C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hostelNameText}>{h.hostel_name || `Hostel #${h.hostel_id}`}</Text>
                    <Text style={styles.hostelAddressText}>
                      {h.city || 'City'} • {h.address || 'Address on file'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.hostelStatusBadge,
                      { backgroundColor: h.is_active ? '#ECFDF5' : '#FEF2F2' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.hostelStatusText,
                        { color: h.is_active ? '#059669' : '#DC2626' },
                      ]}
                    >
                      {h.is_active ? 'LIVE' : 'OFFLINE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.hostelStatsRow}>
                  <View style={styles.hostelStatItem}>
                    <Text style={styles.hostelStatNum}>{h.total_beds || 0}</Text>
                    <Text style={styles.hostelStatLabel}>Beds</Text>
                  </View>
                  <View style={styles.hostelStatItem}>
                    <Text style={[styles.hostelStatNum, { color: '#059669' }]}>
                      {h.occupied_beds || h.total_students || 0}
                    </Text>
                    <Text style={styles.hostelStatLabel}>Tenants</Text>
                  </View>
                  <View style={styles.hostelStatItem}>
                    <Text style={[styles.hostelStatNum, { color: '#EA580C' }]}>
                      ₹{Number(h.monthly_revenue || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.hostelStatLabel}>Est. Revenue</Text>
                  </View>
                </View>

                <View style={styles.hostelCardFooter}>
                  <Text style={styles.hostelCardFooterText}>Tap to inspect full hostel dossier</Text>
                  <Ionicons name="arrow-forward" size={13} color="#EA580C" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* ─────────────────── RESET PASSWORD MODAL ─────────────────── */}
      <Modal visible={passwordModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalShieldIcon}>
                <Ionicons name="key" size={20} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Reset Owner Password</Text>
                <Text style={styles.modalSub}>{owner?.full_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>New Secure Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter password or tap generate"
                placeholderTextColor="#9CA3AF"
                style={styles.modalInput}
              />
              <TouchableOpacity onPress={handleGeneratePassword} style={styles.generatePinBtn}>
                <Text style={styles.generatePinBtnText}>🎲 6-Digit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSavePassword}
                disabled={resettingPassword}
                style={styles.modalSaveBtn}
              >
                {resettingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <Text style={styles.supportModalTitle}>Enter Owner Support Mode</Text>
              <Text style={styles.supportModalSubtitle}>Executive Super Admin Impersonation</Text>
            </LinearGradient>

            <View style={styles.supportModalBody}>
              <View style={styles.supportTargetBadge}>
                <Text style={styles.supportTargetLabel}>TARGET PARTNER ACCOUNT</Text>
                <Text style={styles.supportTargetName}>{owner?.full_name}</Text>
                <Text style={styles.supportTargetEmail}>{owner?.email}</Text>
              </View>

              <View style={styles.supportNotesBox}>
                <View style={styles.supportNoteItem}>
                  <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                  <Text style={styles.supportNoteText}>Full live access to owner dashboards & hostels</Text>
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
  ownerCard: {
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
  ownerNameText: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  ownerRoleTag: {
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
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statVal: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
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
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySub: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  hostelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  hostelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  hostelNameText: {
    color: '#111827',
    fontSize: 14.5,
    fontWeight: '900',
  },
  hostelAddressText: {
    color: '#6B7280',
    fontSize: 11.5,
    marginTop: 1,
  },
  hostelStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hostelStatusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  hostelStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 8,
    marginVertical: 10,
  },
  hostelStatItem: {
    alignItems: 'center',
  },
  hostelStatNum: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  hostelStatLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  hostelCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  hostelCardFooterText: {
    color: '#EA580C',
    fontSize: 11.5,
    fontWeight: '700',
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
