import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User2, Lock, Bell, HelpCircle, MessageSquare, Info,
  LogOut, ChevronRight, CreditCard, Building2, BedDouble,
  Settings, ArrowLeft, ShieldCheck, Mail, Phone,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { ConfirmationDialog } from '../components/UIComponents';

const BLUE      = '#2245D4';
const BLUE_SOFT = '#EEF2FF';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID  = '#666666';
const TEXT_LIGHT= '#9CA3AF';
const BG        = '#F8FAFD';
const BORDER    = '#E2E8F0';
const SUCCESS   = '#22C55E';
const SUCCESS_BG= '#DCFCE7';

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut } = useAuth();

  const name = user?.name || 'Guest User';
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const roomNumber = user?.room_number ? `Room ${user.room_number}` : 'No Room Assigned';

  const [showLogout, setShowLogout] = useState(false);

  const confirmLogout = () => {
    setShowLogout(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      
      {/* ── HEADER ── */}
      <View style={s.headerSection}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtnLight} activeOpacity={0.7}>
              <ArrowLeft size={24} color={WHITE} strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={s.headerGreeting}>Profile</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

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
            <View style={[s.menuIconWrap, { backgroundColor: BLUE_SOFT }]}>
              <BedDouble size={20} color={BLUE} />
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
          
          <TouchableOpacity style={s.menuRow} activeOpacity={0.7}>
            <View style={[s.menuIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <Bell size={20} color={TEXT_MID} />
            </View>
            <Text style={s.menuTxt}>Notifications</Text>
            <ChevronRight size={18} color={TEXT_LIGHT} />
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLbl}>SUPPORT</Text>
        <View style={s.menuCard}>
          <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => navigation.navigate('HelpScreen')}>
            <View style={[s.menuIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <HelpCircle size={20} color="#0284C7" />
            </View>
            <Text style={s.menuTxt}>Help & Support</Text>
            <ChevronRight size={18} color={TEXT_LIGHT} />
          </TouchableOpacity>
        </View>

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
    </View>
  );
}

const s = StyleSheet.create({
  headerSection: { backgroundColor: BLUE, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  backBtnLight: { padding: 8, marginLeft: -8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  headerGreeting: { fontSize: 22, fontWeight: '800', color: WHITE },
  
  scroll: { padding: 20, paddingBottom: 60 },

  profileCard: { backgroundColor: WHITE, borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: BORDER, marginTop: 10 },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatarCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: BLUE_SOFT, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: WHITE, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  avatarInitials: { fontSize: 32, fontWeight: '900', color: BLUE, letterSpacing: 1 },
  verifiedBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: SUCCESS, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: WHITE },
  
  nameTxt: { fontSize: 24, fontWeight: '900', color: TEXT_DARK, marginBottom: 4 },
  roomTxt: { fontSize: 14, fontWeight: '600', color: BLUE, marginBottom: 16, backgroundColor: BLUE_SOFT, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  
  contactRow: { flexDirection: 'row', gap: 12 },
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
