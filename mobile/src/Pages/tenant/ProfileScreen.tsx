import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../contexts/AuthContext';
import { ConfirmationDialog } from '../../components/tenant/UIComponents';
import VacateModal from '../../components/tenant/VacateModal';
import api from '../../services/api';

const BRAND = '#7C3AED';
const WHITE = '#FFFFFF';
const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const BORDER = '#E2E8F0';
const TEXT_DARK = '#0F172A';
const TEXT_MID = '#64748B';
const TEXT_MUTED = '#94A3B8';

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut, updateTokenAndUser } = useAuth();

  const name = user?.name || user?.full_name || 'Tenant';
  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const roomNumber = user?.room_number ? `Room ${user.room_number}` : 'No Room';
  const phone = user?.phone || (user as any)?.mobile || 'No phone added';
  const email = user?.email || 'No email added';
  const hostelName = (user as any)?.hostel_name || 'My Hostel';

  const [avatarUri, setAvatarUri] = useState<string | null>(
    (user as any)?.avatar_url || (user as any)?.profile_image || null
  );
  const [showLogout, setShowLogout] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [showVacateModal, setShowVacateModal] = useState(false);

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo gallery.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setAvatarUri(selectedUri);
        await AsyncStorage.setItem(`tenant_avatar_${user?.user_id || 'me'}`, selectedUri);
      }
    } catch (e) {
      console.error('Error picking avatar:', e);
    }
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return;
    }
    setEditSaving(true);
    try {
      const res = await api.put('/auth/tenant/profile', { name: editName, phone: editPhone });
      if (res.data?.success) {
        await updateTokenAndUser(undefined, { name: res.data.data.name, phone: res.data.data.phone });
        setShowEdit(false);
      }
    } catch (e) {
      console.error('Profile update failed:', e);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Top Header with '<' Back Button ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={TEXT_DARK} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Profile & Account</Text>
          <Text style={styles.headerSubtitle}>{hostelName}</Text>
        </View>

        <TouchableOpacity
          style={styles.editIconBtn}
          onPress={() => {
            setShowEdit(true);
            setEditName(name);
            setEditPhone(user?.phone || '');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={20} color={BRAND} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Compact Profile Summary Card ── */}
        <View style={styles.compactCard}>
          <TouchableOpacity
            style={styles.avatarWrap}
            activeOpacity={0.8}
            onPress={handlePickAvatar}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={10} color={WHITE} />
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName} numberOfLines={1}>
                {name}
              </Text>
              <View style={styles.roomBadge}>
                <Ionicons name="bed-outline" size={12} color={BRAND} />
                <Text style={styles.roomBadgeText}>{roomNumber}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="call-outline" size={13} color={TEXT_MUTED} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {phone}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="mail-outline" size={13} color={TEXT_MUTED} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {email}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── SECTION 1: Stay & Accommodation ── */}
        <Text style={styles.sectionTitle}>STAY DETAILS</Text>
        <View style={styles.menuBox}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('RoomInfo')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="business" size={18} color="#9333EA" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Room & Stay Info</Text>
              <Text style={styles.menuSub}>Bed allocation, fees & room rules</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Documents')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="document-text" size={18} color="#0284C7" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>KYC & Documents</Text>
              <Text style={styles.menuSub}>ID proofs & verification status</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setShowVacateModal(true)}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="exit-outline" size={18} color="#EF4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: '#EF4444' }]}>Vacate Room</Text>
              <Text style={styles.menuSub}>Submit room vacation request</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        {/* ── SECTION 2: Finance & Payments ── */}
        <Text style={styles.sectionTitle}>FINANCE & SUPPORT</Text>
        <View style={styles.menuBox}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Dues')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="wallet" size={18} color="#16A34A" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Hostel Fees & Dues</Text>
              <Text style={styles.menuSub}>View receipts and pay rent</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Complaints')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="chatbubbles" size={18} color="#D97706" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Complaints & Requests</Text>
              <Text style={styles.menuSub}>Track maintenance issues</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('HelpScreen')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="help-buoy" size={18} color="#7C3AED" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Help & Support</Text>
              <Text style={styles.menuSub}>FAQs and contact warden</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        {/* ── SECTION 3: App & Notifications ── */}
        <Text style={styles.sectionTitle}>APP PREFERENCES</Text>
        <View style={styles.menuBox}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="notifications" size={18} color={TEXT_MID} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSub}>Alerts, meal updates & notices</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="settings" size={18} color={TEXT_MID} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Settings</Text>
              <Text style={styles.menuSub}>Password, language & display</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        {/* ── Logout Button ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={() => setShowLogout(true)}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Stayvix App v2.4.0</Text>
      </ScrollView>

      {/* ── Vacate Modal ── */}
      <VacateModal
        visible={showVacateModal}
        onClose={() => setShowVacateModal(false)}
        onSuccess={() => setShowVacateModal(false)}
      />

      {/* ── Confirmation Logout Dialog ── */}
      <ConfirmationDialog
        visible={showLogout}
        onClose={() => setShowLogout(false)}
        type="warning"
        title="Log Out"
        description="Are you sure you want to log out from your account?"
        primaryAction={{ label: 'Log Out', onPress: signOut }}
      />

      {/* ── Edit Profile Modal ── */}
      <Modal visible={showEdit} transparent animationType="fade" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={TEXT_MID} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your full name"
              placeholderTextColor={TEXT_MUTED}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="10-digit phone number"
              placeholderTextColor={TEXT_MUTED}
              keyboardType="phone-pad"
              maxLength={10}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowEdit(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={saveProfile}
                disabled={editSaving}
                activeOpacity={0.8}
              >
                {editSaving ? (
                  <ActivityIndicator color={WHITE} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  headerSubtitle: {
    fontSize: 11,
    color: TEXT_MID,
    marginTop: 1,
  },
  editIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  // Compact Profile Card
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: WHITE,
  },
  cameraBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BRAND,
    position: 'absolute',
    bottom: -2,
    right: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: WHITE,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
    flex: 1,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roomBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND,
  },
  metaRow: {
    marginTop: 4,
    gap: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 11.5,
    color: TEXT_MID,
    fontWeight: '500',
  },

  // Sections & Menus
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT_MUTED,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 4,
  },
  menuBox: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  menuSub: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 48,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 16,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MID,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    color: TEXT_DARK,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_MID,
  },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
  },
});
