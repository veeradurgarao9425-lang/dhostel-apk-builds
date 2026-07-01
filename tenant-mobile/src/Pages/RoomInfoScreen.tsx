import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar, TextInput, FlatList, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, FileText, CheckCircle2, Wrench, Clock, Plus, Trash2, Home as HomeIcon } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';

const BLUE      = '#2245D4';
const BLUE_SOFT = '#EEF2FF';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID  = '#666666';
const TEXT_LIGHT= '#9CA3AF';
const BG        = '#FDFDFD';
const BORDER    = '#F1F5F9';
const SUCCESS   = '#22C55E';

export default function RoomInfoScreen({ route, navigation }: any) {
  const { user, refreshUser } = useAuth();
  const initialTab = route?.params?.tab || 'Details';
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabs = ['Details', 'Rent History', 'Maintenance', 'Notes'];
  
  const tabAnim = React.useRef(new Animated.Value(tabs.indexOf(initialTab) > -1 ? tabs.indexOf(initialTab) : 0)).current;
  const { width } = Dimensions.get('window');
  
  const handleTab = (t: string) => {
    Animated.spring(tabAnim, { toValue: tabs.indexOf(t), useNativeDriver: false, friction: 8 }).start();
    setActiveTab(t);
  };
  
  const tabW = width / 4;
  const indicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, tabW, tabW * 2, tabW * 3]
  });
  
  const [noteText, setNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [notes, setNotes] = useState([
    { id: '1', text: 'Checked the AC, it is working fine now.', date: '10 May 2026' },
    { id: '2', text: 'Need to get the room key duplicated next week.', date: '01 May 2026' }
  ]);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, []),
  );

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes([{ id: Date.now().toString(), text: noteText, date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }, ...notes]);
    setNoteText('');
    setIsAddingNote(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      
      {/* ── HEADER ── */}
      <View style={{ backgroundColor: BLUE }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={s.headerCenter}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtnMinimal}>
              <ChevronLeft size={28} color={WHITE} strokeWidth={3} />
            </TouchableOpacity>
            <Text style={s.headerTitleCenter}>Room Details</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      {/* ── TABS ── */}
      <View style={s.tabScroll}>
          <View style={s.tabContainer}>
            <Animated.View style={[s.tabIndicator, { left: indicatorLeft, width: tabW }]} />
            {tabs.map(t => (
              <TouchableOpacity key={t} style={s.tab} onPress={() => handleTab(t)}>
                <Text style={[s.tabTxt, activeTab === t && s.activeTabTxt]} numberOfLines={1}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'Details' && (
          <>
            {/* ── HERO ── */}
            <View style={{ backgroundColor: BLUE, padding: 24, borderRadius: 20, marginBottom: 20, flexDirection: 'row', alignItems: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 16, borderRadius: 32, marginRight: 20 }}>
                <HomeIcon size={40} color={WHITE} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Room Assigned</Text>
                <Text style={{ fontSize: 32, color: WHITE, fontWeight: '800', marginTop: 4 }}>{user?.room_number || '201'}</Text>
              </View>
            </View>
            {/* Room Information */}
            <Text style={s.sectionLbl}>Room Information</Text>
            <View style={s.infoCard}>
              <View style={s.detailRow}><Text style={s.detailLbl}>Room Number</Text><Text style={s.detailVal}>{user?.room_number || '201'}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Block</Text><Text style={s.detailVal}>Block A</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Room Type</Text><Text style={s.detailVal}>Single Sharing</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Floor</Text><Text style={s.detailVal}>2nd Floor</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Area</Text><Text style={s.detailVal}>120 Sq.ft</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Status</Text><Text style={[s.detailVal, { color: SUCCESS }]}>Occupied</Text></View>
            </View>

            {/* Rent Information */}
            <Text style={s.sectionLbl}>Rent Information</Text>
            <View style={s.infoCard}>
              <View style={s.detailRow}><Text style={s.detailLbl}>Monthly Rent</Text><Text style={s.detailVal}>₹ {user?.monthly_rent || '4,500'}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Security Deposit</Text><Text style={s.detailVal}>₹ 8,000</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Maintenance Charge</Text><Text style={s.detailVal}>₹ 500</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Total (Monthly)</Text><Text style={s.detailVal}>₹ 5,000</Text></View>
            </View>

            {/* Other Information */}
            <Text style={s.sectionLbl}>Other Information</Text>
            <View style={s.infoCard}>
              <View style={s.detailRow}><Text style={s.detailLbl}>Allotted Date</Text><Text style={s.detailVal}>01 Jan 2026</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Vacate Date</Text><Text style={s.detailVal}>-</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Next Review Date</Text><Text style={s.detailVal}>01 Jan 2027</Text></View>
            </View>

            {/* Tenant Information */}
            <Text style={s.sectionLbl}>Tenant Information</Text>
            <View style={s.infoCard}>
              <View style={s.detailRow}><Text style={s.detailLbl}>Name</Text><Text style={s.detailVal}>{user?.name}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Phone</Text><Text style={s.detailVal}>{user?.phone}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Email</Text><Text style={s.detailVal}>{user?.email || '—'}</Text></View>
            </View>
          </>
        )}

        {activeTab === 'Rent History' && (
          <View style={{ paddingTop: 8 }}>
            {[
              { month: 'April 2026', amount: '₹ 4,500', status: 'Paid', date: '02 Apr' },
              { month: 'March 2026', amount: '₹ 4,500', status: 'Paid', date: '01 Mar' },
              { month: 'February 2026', amount: '₹ 4,500', status: 'Paid', date: '03 Feb' }
            ].map((item, idx) => (
              <View key={idx} style={s.historyCard}>
                <View style={s.historyIcon}><CheckCircle2 size={24} color={SUCCESS} /></View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={s.historyTitle}>{item.month}</Text>
                  <Text style={s.historySub}>Paid on {item.date}</Text>
                </View>
                <Text style={s.historyAmount}>{item.amount}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'Maintenance' && (
          <View style={{ paddingTop: 8 }}>
            {[
              { title: 'Broken tap in bathroom', date: '10 May 2026', status: 'Resolved' },
              { title: 'Fan regulator not working', date: '15 Mar 2026', status: 'Resolved' }
            ].map((item, idx) => (
              <View key={idx} style={s.historyCard}>
                <View style={[s.historyIcon, { backgroundColor: '#F3F4F6' }]}><Wrench size={24} color={TEXT_MID} /></View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={s.historyTitle}>{item.title}</Text>
                  <Text style={s.historySub}>{item.date}</Text>
                </View>
                <View style={s.badgeResolved}><Text style={s.badgeResolvedTxt}>{item.status}</Text></View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'Notes' && (
          <View style={{ paddingTop: 8 }}>
            {!isAddingNote ? (
              <TouchableOpacity style={s.addNewBtn} onPress={() => setIsAddingNote(true)} activeOpacity={0.7}>
                <Plus size={20} color={BLUE} style={{ marginRight: 8 }} />
                <Text style={s.addNewTxt}>Add New Note</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.noteInputCard}>
                <TextInput 
                  style={s.noteInput} 
                  placeholder="Use notes to save Wi-Fi passwords, track shared grocery bills, or log room chores..." 
                  placeholderTextColor={TEXT_LIGHT}
                  multiline
                  value={noteText}
                  onChangeText={setNoteText}
                  autoFocus
                />
                <View style={s.noteActionRow}>
                  <TouchableOpacity onPress={() => { setIsAddingNote(false); setNoteText(''); }}>
                    <Text style={s.cancelTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.addNoteBtn, !noteText.trim() && { opacity: 0.5 }]} onPress={addNote} disabled={!noteText.trim()}>
                    <Plus size={16} color={WHITE} />
                    <Text style={s.addNoteTxt}>Save Note</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {notes.map((n) => (
              <View key={n.id} style={s.noteCard}>
                <View style={s.noteTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <FileText size={14} color={BLUE} style={{ marginRight: 6 }} />
                    <Text style={s.noteDate}>{n.date}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setNotes(notes.filter(x => x.id !== n.id))}>
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                <Text style={s.noteBody}>{n.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  headerCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtnMinimal: { padding: 8, marginLeft: -8 },
  headerTitleCenter: { fontSize: 18, fontWeight: '800', color: WHITE },
  
  tabScroll: { backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER },
  tabContainer: { flexDirection: 'row', width: '100%', position: 'relative' },
  tabIndicator: { position: 'absolute', bottom: 0, height: 3, backgroundColor: BLUE, borderRadius: 3, zIndex: 2 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabTxt: { fontSize: 13, fontWeight: '600', color: TEXT_MID },
  activeTabTxt: { color: BLUE, fontWeight: '800' },

  scroll: { padding: 20, paddingBottom: 40 },
  
  sectionLbl: { fontSize: 14, fontWeight: '800', color: TEXT_DARK, marginBottom: 12, marginLeft: 4 },
  
  infoCard: { backgroundColor: WHITE, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 24, borderWidth: 1, borderColor: BORDER },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  detailLbl: { fontSize: 14, color: TEXT_MID, fontWeight: '500' },
  detailVal: { fontSize: 14, color: TEXT_DARK, fontWeight: '600' },
  
  historyCard: { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  historyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  historyTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  historySub: { fontSize: 13, color: TEXT_MID },
  historyAmount: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
  
  badgeResolved: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7' },
  badgeResolvedTxt: { fontSize: 11, fontWeight: '700', color: SUCCESS },

  addNewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE_SOFT, borderRadius: 12, paddingVertical: 14, marginBottom: 24, borderWidth: 1, borderColor: BLUE, borderStyle: 'dashed' },
  addNewTxt: { color: BLUE, fontSize: 15, fontWeight: '700' },

  noteInputCard: { backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: BLUE, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  noteInput: { fontSize: 15, color: TEXT_DARK, minHeight: 80, textAlignVertical: 'top' },
  noteActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  cancelTxt: { fontSize: 14, color: TEXT_MID, fontWeight: '600' },
  addNoteBtn: { backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addNoteTxt: { color: WHITE, fontSize: 13, fontWeight: '700', marginLeft: 6 },
  
  noteCard: { backgroundColor: BLUE_SOFT, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0E7FF' },
  noteTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  noteDate: { fontSize: 12, fontWeight: '600', color: BLUE },
  noteBody: { fontSize: 14, color: TEXT_DARK, lineHeight: 20 },
});
