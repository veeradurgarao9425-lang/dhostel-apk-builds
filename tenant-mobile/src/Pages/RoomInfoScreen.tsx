import React, { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BedDouble, Phone, MessageCircle, Building2, Wrench, Clock, ArrowLeft, ShieldCheck, MapPin } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';

const BLUE      = '#2245D4';
const BLUE_SOFT = '#EEF2FF';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID  = '#666666';
const BG        = '#F8FAFD';
const BORDER    = '#F1F5F9';
const SUCCESS   = '#22C55E';
const SUCCESS_BG= '#DCFCE7';

export default function RoomInfoScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, []),
  );

  const isAllocated = !!user?.is_allocated;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      
      {/* ── HEADER ── */}
      <View style={s.headerSection}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtnLight}>
              <ArrowLeft size={24} color={WHITE} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.headerGreeting}>Room Info</Text>
              <Text style={s.headerSub}>Your stay details</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {!isAllocated ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrap}>
              <Clock size={32} color={TEXT_MID} />
            </View>
            <Text style={s.emptyTitle}>No Room Allocated</Text>
            <Text style={s.emptySub}>Once your hostel owner allocates a room to you, all details will appear here.</Text>
          </View>
        ) : (
          <>
            {/* HERO CARD */}
            <View style={s.heroCard}>
              <View style={s.heroTopRow}>
                <View style={s.heroIconWrap}>
                  <BedDouble size={28} color={BLUE} />
                </View>
                <View style={s.activeBadge}>
                  <ShieldCheck size={14} color={SUCCESS} />
                  <Text style={s.activeBadgeTxt}>ACTIVE TENANT</Text>
                </View>
              </View>

              <Text style={s.heroRoomLbl}>ROOM NUMBER</Text>
              <Text style={s.heroRoom}>{user?.room_number || '—'}</Text>

              <View style={s.heroDivider} />

              <View style={s.heroBottomRow}>
                <View>
                  <Text style={s.heroDetailLbl}>MONTHLY RENT</Text>
                  <Text style={s.heroDetailVal}>₹{user?.monthly_rent || 0}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.heroDetailLbl}>BED TYPE</Text>
                  <Text style={s.heroDetailVal}>Standard</Text>
                </View>
              </View>
            </View>

            <Text style={s.sectionLbl}>TENANT DETAILS</Text>
            <View style={s.detailsCard}>
              <View style={s.detailRow}>
                <Text style={s.detailLbl}>Name</Text>
                <Text style={s.detailVal}>{user?.name}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.detailRow}>
                <Text style={s.detailLbl}>Phone</Text>
                <Text style={s.detailVal}>{user?.phone}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.detailRow}>
                <Text style={s.detailLbl}>Email</Text>
                <Text style={s.detailVal}>{user?.email || '—'}</Text>
              </View>
            </View>

            <Text style={s.sectionLbl}>HOSTEL CONTACT</Text>
            <View style={s.contactCard}>
              <View style={s.contactRow}>
                <View style={s.contactIconWrap}>
                  <Building2 size={24} color={BLUE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.contactTitle}>Front Desk / Owner</Text>
                  <Text style={s.contactSub}>For any stay-related issues</Text>
                </View>
              </View>

              <View style={s.actionRow}>
                <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL('tel:')} activeOpacity={0.8}>
                  <Phone size={18} color={BLUE} />
                  <Text style={s.actionBtnTxt}>Call</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('Complaints')} activeOpacity={0.8}>
                  <Wrench size={18} color={BLUE} />
                  <Text style={s.actionBtnTxt}>Raise Issue</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('GatePass')} activeOpacity={0.8}>
                  <MapPin size={18} color={BLUE} />
                  <Text style={s.actionBtnTxt}>Gate Pass</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  headerSection: { backgroundColor: BLUE, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  backBtnLight: { padding: 8, marginLeft: -8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  headerGreeting: { fontSize: 22, fontWeight: '800', color: WHITE },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  
  scroll: { padding: 20, paddingBottom: 60 },

  emptyCard: { backgroundColor: WHITE, borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', marginTop: 20 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
  emptySub: { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 20 },

  heroCard: { backgroundColor: WHITE, borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: BORDER, marginTop: 10 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  heroIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: BLUE_SOFT, justifyContent: 'center', alignItems: 'center' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: SUCCESS_BG, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
  activeBadgeTxt: { fontSize: 11, fontWeight: '800', color: SUCCESS, letterSpacing: 0.5 },
  
  heroRoomLbl: { fontSize: 12, fontWeight: '700', color: TEXT_MID, letterSpacing: 1, marginBottom: 4 },
  heroRoom: { fontSize: 48, fontWeight: '900', color: TEXT_DARK, letterSpacing: -2 },
  
  heroDivider: { height: 1, backgroundColor: BORDER, marginVertical: 20 },
  
  heroBottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroDetailLbl: { fontSize: 11, fontWeight: '700', color: TEXT_MID, letterSpacing: 1, marginBottom: 4 },
  heroDetailVal: { fontSize: 18, fontWeight: '800', color: BLUE },

  sectionLbl: { fontSize: 12, fontWeight: '800', color: TEXT_MID, letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  
  detailsCard: { backgroundColor: WHITE, borderRadius: 20, paddingHorizontal: 20, marginBottom: 24, borderWidth: 1, borderColor: BORDER },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  detailLbl: { fontSize: 15, color: TEXT_MID, fontWeight: '500' },
  detailVal: { fontSize: 15, color: TEXT_DARK, fontWeight: '700' },
  divider: { height: 1, backgroundColor: BORDER },

  contactCard: { backgroundColor: WHITE, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  contactIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: BLUE_SOFT, justifyContent: 'center', alignItems: 'center' },
  contactTitle: { fontSize: 16, fontWeight: '800', color: TEXT_DARK, marginBottom: 2 },
  contactSub: { fontSize: 13, color: TEXT_MID },
  
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: BLUE_SOFT, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  actionBtnTxt: { fontSize: 12, fontWeight: '700', color: BLUE },
});
