import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar, TextInput, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, FileText, CheckCircle2, Wrench, Clock, Plus, Trash2, Home as HomeIcon, AlertCircle } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';

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

  const [room, setRoom] = useState<any>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, []),
  );

  useEffect(() => {
    if (!user?.room_id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [roomRes, feesRes] = await Promise.all([
          api.get('/rooms/' + user.room_id),
          api.get('/fees/my-fees'),
        ]);
        if (!cancelled) {
          setRoom(roomRes.data);
          setFees(Array.isArray(feesRes.data) ? feesRes.data : []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Failed to load room data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [user?.room_id]);

  const formatFeeMonth = (feeMonth: string) => {
    if (!feeMonth) return '—';
    // feeMonth may be "2026-04" or "April 2026" — normalise
    const d = new Date(feeMonth);
    if (isNaN(d.getTime())) return feeMonth;
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const feeStatusColor = (status: string) => {
    if (!status) return TEXT_MID;
    const s = status.toLowerCase();
    if (s === 'paid') return SUCCESS;
    if (s === 'overdue') return '#EF4444';
    return '#F59E0B';
  };

  const feeStatusIcon = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return <CheckCircle2 size={24} color={SUCCESS} />;
    if (s === 'overdue') return <AlertCircle size={24} color="#EF4444" />;
    return <Clock size={24} color="#F59E0B" />;
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes([{ id: Date.now().toString(), text: noteText, date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }, ...notes]);
    setNoteText('');
    setIsAddingNote(false);
  };

  // ── No room assigned ──────────────────────────────────────────────────────
  if (!loading && !user?.room_id) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="light-content" backgroundColor={BLUE} />
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <HomeIcon size={56} color={TEXT_LIGHT} strokeWidth={1.5} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT_DARK, marginTop: 20, textAlign: 'center' }}>No Room Assigned</Text>
          <Text style={{ fontSize: 14, color: TEXT_MID, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            You have not been assigned a room yet. Please contact the hostel office.
          </Text>
        </View>
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="light-content" backgroundColor={BLUE} />
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={{ color: TEXT_MID, marginTop: 12, fontSize: 14 }}>Loading room details…</Text>
        </View>
      </View>
    );
  }

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

      {/* ── ERROR BANNER ── */}
      {error && (
        <View style={{ backgroundColor: '#FEF2F2', borderBottomWidth: 1, borderBottomColor: '#FECACA', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
          <AlertCircle size={16} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', flex: 1 }}>{error}</Text>
        </View>
      )}

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
                <Text style={{ fontSize: 32, color: WHITE, fontWeight: '800', marginTop: 4 }}>{room?.room_number ?? user?.room_number ?? '—'}</Text>
              </View>
            </View>

            {/* Room Information */}
            <Text style={s.sectionLbl}>Room Information</Text>
            <View style={s.infoCard}>
              <View style={s.detailRow}><Text style={s.detailLbl}>Room Number</Text><Text style={s.detailVal}>{room?.room_number ?? '—'}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Room Type</Text><Text style={s.detailVal}>{room?.room_type ?? '—'}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Floor</Text><Text style={s.detailVal}>{room?.floor_number != null ? `${room.floor_number}` : '—'}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Capacity</Text><Text style={s.detailVal}>{room?.capacity != null ? `${room.capacity} person${room.capacity !== 1 ? 's' : ''}` : '—'}</Text></View>
              <View style={s.detailRow}><Text style={s.detailLbl}>Status</Text><Text style={[s.detailVal, { color: room?.status?.toLowerCase() === 'occupied' ? SUCCESS : TEXT_MID, textTransform: 'capitalize' }]}>{room?.status ?? '—'}</Text></View>
            </View>

            {/* Rent Information */}
            <Text style={s.sectionLbl}>Rent Information</Text>
            <View style={s.infoCard}>
              <View style={s.detailRow}><Text style={s.detailLbl}>Monthly Rent</Text><Text style={s.detailVal}>₹ {room?.monthly_rent ?? user?.monthly_rent ?? '—'}</Text></View>
            </View>

            {/* Amenities */}
            {Array.isArray(room?.amenities) && room.amenities.length > 0 && (
              <>
                <Text style={s.sectionLbl}>Amenities</Text>
                <View style={s.infoCard}>
                  {room.amenities.map((amenity: string, idx: number) => (
                    <View key={idx} style={s.detailRow}>
                      <Text style={s.detailLbl}>{amenity}</Text>
                      <CheckCircle2 size={16} color={SUCCESS} />
                    </View>
                  ))}
                </View>
              </>
            )}

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
            {fees.length === 0 ? (
              <View style={s.emptyState}>
                <FileText size={40} color={TEXT_LIGHT} strokeWidth={1.5} />
                <Text style={s.emptyTitle}>No Payment History</Text>
                <Text style={s.emptySub}>Your rent payment records will appear here.</Text>
              </View>
            ) : (
              fees.map((fee, idx) => (
                <View key={fee.fee_id ?? idx} style={s.historyCard}>
                  <View style={[s.historyIcon, { backgroundColor: (fee.fee_status || '').toLowerCase() === 'paid' ? '#DCFCE7' : (fee.fee_status || '').toLowerCase() === 'overdue' ? '#FEE2E2' : '#FEF9C3' }]}>
                    {feeStatusIcon(fee.fee_status)}
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={s.historyTitle}>{formatFeeMonth(fee.fee_month)}</Text>
                    <Text style={s.historySub}>Due {formatDueDate(fee.due_date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.historyAmount}>₹ {fee.monthly_rent ?? '—'}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: feeStatusColor(fee.fee_status), marginTop: 4, textTransform: 'capitalize' }}>{fee.fee_status ?? '—'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'Maintenance' && (
          <View style={{ paddingTop: 8 }}>
            <View style={s.emptyState}>
              <Wrench size={40} color={TEXT_LIGHT} strokeWidth={1.5} />
              <Text style={s.emptyTitle}>No Maintenance Records</Text>
              <Text style={s.emptySub}>Maintenance requests will be displayed here once available.</Text>
            </View>
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

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: TEXT_DARK, marginTop: 16, textAlign: 'center' },
  emptySub: { fontSize: 14, color: TEXT_MID, marginTop: 8, textAlign: 'center', lineHeight: 22 },

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
