import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar, Image, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User2, Lock, Bell, HelpCircle, MessageSquare, Info,
  LogOut, ChevronRight, CreditCard, Building2, BedDouble,
  Settings, ArrowLeft, ShieldCheck, Mail, Phone, Star,
} from 'lucide-react-native';

import { useAuth } from '../../../contexts/AuthContext';
import { ConfirmationDialog } from '../../components/tenant/UIComponents';
import VacateModal from '../../components/tenant/VacateModal';
import api from '../../services/api';

import { LinearGradient } from 'expo-linear-gradient';

const INDIGO     = '#4F46E5';
const INDIGO_SOFT= '#EEF2FF';
const PURPLE     = '#7C3AED';
const WHITE      = '#FFFFFF';
const TEXT_DARK  = '#1F2937';
const TEXT_MID   = '#6B7280';
const TEXT_LIGHT = '#9CA3AF';
const BG         = '#F9FAFB';
const BORDER     = '#E5E7EB';
const SUCCESS    = '#10B981';
const SUCCESS_BG = '#D1FAE5';

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut, updateTokenAndUser } = useAuth();

  const name = user?.name || 'Guest User';
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const roomNumber = user?.room_number ? `Room ${user.room_number}` : 'No Room Assigned';

  const [showLogout, setShowLogout] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [showVacateModal, setShowVacateModal] = useState(false);

  const confirmLogout = () => {
    setShowLogout(true);
  };

  const saveProfile = async () => {
    setEditSaving(true);
    try {
      const res = await api.put('/auth/tenant/profile', { name: editName, phone: editPhone });
      if (res.data?.success) {
        await updateTokenAndUser(undefined, { name: res.data.data.name, phone: res.data.data.phone });
        setShowEdit(false);
      }
    } catch (e) {
      console.error('Profile update failed:', e);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={INDIGO} />
      
      {/* ── HEADER ── */}
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.headerSection}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtnLight} activeOpacity={0.7}>
              <ArrowLeft size={22} color={WHITE} strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.headerGreeting}>Profile & Account</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* ── PROFILE CARD ── */}
        <View style={s.profileCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, width: '100%' }}>
            <View style={[s.avatarWrap, { marginBottom: 0, marginRight: 20 }]}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarInitials}>{initials}</Text>
              </View>
              <View style={s.verifiedBadge}>
                <ShieldCheck size={14} color={WHITE} strokeWidth={3} />
              </View>
            </View>
            
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text style={s.nameTxt} numberOfLines={1}>{name}</Text>
              <Text style={[s.roomTxt, { marginBottom: 0 }]}>{roomNumber}</Text>
              <TouchableOpacity
                style={{ marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: INDIGO, backgroundColor: INDIGO_SOFT }}
                onPress={() => { setShowEdit(true); setEditName(name); setEditPhone(user?.phone || ''); }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: INDIGO }}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={s.contactRow}>
            <View style={s.contactPill}>
              <Phone size={14} color={TEXT_MID} />
              <Text style={s.contactTxt}>{user?.phone || 'No Phone'}</Text>
            </View>
            <View style={s.contactPill}>
              <Mail size={14} color={TEXT_MID} />
              <Text style={s.contactTxt}>{user?.email || 'No Email'}</Text>
            </View>
          </View>
        </View>

        {/* ── MENU SECTIONS ── */}
        <Text style={s.sectionLbl}>ACCOUNT & STAY</Text>
        <View style={s.menuCard}>
          <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => navigation.navigate('RoomInfo')}>
            <View style={[s.menuIconWrap, { backgroundColor: INDIGO_SOFT }]}>
              <BedDouble size={20} color={INDIGO} />
            </View>
            <Text style={s.menuTxt}>Room & Stay Details</Text>
            <ChevronRight size={18} color={TEXT_LIGHT} />
          </TouchableOpacity>
          <View style={s.divider} />
          
          <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => navigation.navigate('Payments')}>
            <View style={[s.menuIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <CreditCard size={20} color="#D97706" />
            </View>
            <Text style={s.menuTxt}>Payment Methods</Text>
            <ChevronRight size={18} color={TEXT_LIGHT} />
          </TouchableOpacity>
          <View style={s.divider} />
          
          <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => navigation.navigate('Documents')}>
            <View style={[s.menuIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <Lock size={20} color="#9333EA" />
            </View>
            <Text style={s.menuTxt}>KYC & Documents</Text>
            <ChevronRight size={18} color={TEXT_LIGHT} />
          </TouchableOpacity>
          <View style={s.divider} />

          <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => navigation.navigate('Complaints')}>
            <View style={[s.menuIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <MessageSquare size={20} color="#D97706" />
            </View>
            <Text style={s.menuTxt}>Complaints</Text>
            <ChevronRight size={18} color={TEXT_LIGHT} />
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLbl}>PREFERENCES</Text>
        <View style={s.menuCard}>
          <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => navigation.navigate('Settings')}>
            <View style={[s.menuIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <Settings size={20} color={TEXT_MID} />
            </View>
            <Text style={s.menuTxt}>App Settings</Text>
            <ChevronRight size={18} color={TEXT_LIGHT} />
          </TouchableOpacity>
          <View style={s.divider} />

          <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => navigation.navigate('Notifications')}>
            <View style={[s.menuIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <Bell size={20} color={TEXT_MID} />
            </View>
            <Text style={s.menuTxt}>Notifications</Text>
            <ChevronRight size={18} color={TEXT_LIGHT} />
          </TouchableOpacity>
          <View style={s.divider} />

          <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => navigation.navigate('Messages')}>
            <View style={[s.menuIconWrap, { backgroundColor: '#EEF2FF' }]}>
              <MessageSquare size={20} color={INDIGO} />
            </View>
            <Text style={s.menuTxt}>Messages</Text>
            <ChevronRight size={18} color={TEXT_LIGHT} />
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLbl}>SUPPORT</Text>
        <View style={s.menuCard}>
          <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => navigation.navigate('Rating')}>
            <View style={[s.menuIconWrap, { backgroundColor: '#FFF7ED' }]}>
              <Star size={20} color="#F59E0B" />
            </View>
            <Text style={s.menuTxt}>Rate Your Stay</Text>
            <ChevronRight size={18} color={TEXT_LIGHT} />
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => navigation.navigate('HelpScreen')}>
            <View style={[s.menuIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <HelpCircle size={20} color="#0284C7" />
            </View>
            <Text style={s.menuTxt}>Help & Support</Text>
            <ChevronRight size={18} color={TEXT_LIGHT} />
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLbl}>STAY</Text>
        <View style={s.menuCard}>
          <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => setShowVacateModal(true)}>
            <View style={[s.menuIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <LogOut size={20} color="#EF4444" />
            </View>
            <Text style={[s.menuTxt, { color: '#EF4444' }]}>Vacate Room</Text>
            <ChevronRight size={18} color={TEXT_LIGHT} />
          </TouchableOpacity>
        </View>

        <VacateModal
          visible={showVacateModal}
          onClose={() => setShowVacateModal(false)}
          onSuccess={() => setShowVacateModal(false)}
        />

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={s.logoutBtn} activeOpacity={0.8} onPress={confirmLogout}>
          <LogOut size={20} color="#EF4444" strokeWidth={2.5} />
          <Text style={s.logoutTxt}>Log Out</Text>
        </TouchableOpacity>

        <Text style={s.versionTxt}>Stayvix Mobile v2.0.0</Text>
      </ScrollView>

      <ConfirmationDialog
        visible={showLogout}
        onClose={() => setShowLogout(false)}
        type="warning"
        title="Log Out"
        description="Are you sure you want to log out from your account?"
        primaryAction={{ label: 'Log Out', onPress: signOut }}
      />

      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT_DARK, marginBottom: 24 }}>Edit Profile</Text>

              <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_MID, marginBottom: 8 }}>Full Name</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, height: 52, fontSize: 15, color: TEXT_DARK, marginBottom: 16 }}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                placeholderTextColor={TEXT_LIGHT}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_MID, marginBottom: 8 }}>Phone Number</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, height: 52, fontSize: 15, color: TEXT_DARK, marginBottom: 28 }}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="10-digit mobile number"
                placeholderTextColor={TEXT_LIGHT}
                keyboardType="phone-pad"
                maxLength={10}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setShowEdit(false)}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT_MID }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, height: 52, borderRadius: 14, backgroundColor: INDIGO, justifyContent: 'center', alignItems: 'center', opacity: editSaving ? 0.6 : 1 }}
                  onPress={saveProfile}
                  disabled={editSaving}
                >
                  {editSaving ? <ActivityIndicator color={WHITE} /> : <Text style={{ fontSize: 15, fontWeight: '700', color: WHITE }}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  headerSection: { paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, shadowColor: INDIGO, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  backBtnLight: { padding: 8, marginLeft: -8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12 },
  headerGreeting: { fontSize: 20, fontWeight: '800', color: WHITE },
  
  scroll: { padding: 16, paddingBottom: 60 },

  profileCard: { backgroundColor: WHITE, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: BORDER, marginTop: 8 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: INDIGO_SOFT, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: WHITE, shadowColor: INDIGO, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  avatarInitials: { fontSize: 28, fontWeight: '900', color: INDIGO, letterSpacing: 1 },
  verifiedBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: SUCCESS, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: WHITE },
  
  nameTxt: { fontSize: 22, fontWeight: '900', color: TEXT_DARK, marginBottom: 4 },
  roomTxt: { fontSize: 13, fontWeight: '700', color: INDIGO, marginBottom: 12, backgroundColor: INDIGO_SOFT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  
  contactRow: { flexDirection: 'row', gap: 10 },
  contactPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BG, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  contactTxt: { fontSize: 12, fontWeight: '600', color: TEXT_MID },

  sectionLbl: { fontSize: 12, fontWeight: '800', color: TEXT_MID, letterSpacing: 1, marginBottom: 12, marginLeft: 4, marginTop: 8 },
  menuCard: { backgroundColor: WHITE, borderRadius: 24, paddingHorizontal: 16, marginBottom: 24, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  menuIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT_DARK },
  divider: { height: 1, backgroundColor: BORDER, marginLeft: 56 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', paddingVertical: 18, borderRadius: 24, marginTop: 12, borderWidth: 1, borderColor: '#FEE2E2' },
  logoutTxt: { fontSize: 16, fontWeight: '800', color: '#EF4444' },

  versionTxt: { textAlign: 'center', fontSize: 12, fontWeight: '600', color: TEXT_LIGHT, marginTop: 24 },
});
