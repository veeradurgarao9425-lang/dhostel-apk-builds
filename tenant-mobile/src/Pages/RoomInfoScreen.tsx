import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, StatusBar, TextInput, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, FileText, CheckCircle2, Wrench, Clock, Plus, Trash2, Home as HomeIcon, AlertCircle, Building2, UserCircle2, Phone, Mail, FileCheck } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AppHeader, EmptyState, SkeletonListRow } from '../components/ui';

const BLUE      = '#4F46E5';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MID  = '#475569';
const TEXT_LIGHT= '#94A3B8';
const BG        = '#F8FAFC';
const SUCCESS   = '#10B981';

export default function RoomInfoScreen({ route, navigation }: any) {
  const { user, refreshUser } = useAuth();
  const initialTab = route?.params?.tab || 'Details';
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabs = ['Details', 'Rent History', 'Maintenance', 'Notes'];

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
          setRoom(roomRes.data?.data || roomRes.data);
          const feesData = feesRes.data?.data || feesRes.data;
          setFees(Array.isArray(feesData) ? feesData : []);
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

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes([{ id: Date.now().toString(), text: noteText, date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }, ...notes]);
    setNoteText('');
    setIsAddingNote(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="dark-content" />
        <AppHeader title="Room Dashboard" subtitle="Your room info" showBack={navigation.canGoBack()} />
        <View style={{ padding: 20 }}>
          <SkeletonListRow />
          <SkeletonListRow />
          <SkeletonListRow />
        </View>
      </View>
    );
  }

  if (!loading && !user?.room_id) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="dark-content" />
        <AppHeader title="Room Dashboard" subtitle="Your room info" showBack={navigation.canGoBack()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <EmptyState
            icon={HomeIcon}
            title="No Room Assigned"
            message="You have not been assigned a room yet. Please contact the hostel office."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" />

      {/* Standard App Header */}
      <AppHeader title="Room Details" subtitle="Manage your room & rent" showBack={navigation.canGoBack()} />
        
      {/* Small Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {tabs.map(t => (
            <TouchableOpacity 
              key={t} 
              onPress={() => setActiveTab(t)}
              style={[styles.smallTab, activeTab === t && styles.smallTabActive]}
            >
              <Text style={[styles.smallTabTxt, activeTab === t && styles.smallTabTxtActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'Details' && (
          <>
            {/* Compact Room Card */}
            <View style={styles.compactCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.iconCircle}>
                    <Building2 size={20} color="#FFF" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Room No.</Text>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFF' }}>{room?.room_number ?? user?.room_number ?? '—'}</Text>
                  </View>
                </View>
                <View style={styles.roomTypeBadge}>
                  <Text style={styles.roomTypeTxt}>{room?.room_type_name || room?.room_type || 'Standard'}</Text>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Floor</Text>
                  <Text style={{ fontSize: 15, color: '#FFF', fontWeight: '700' }}>{room?.floor_number ?? '—'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Capacity</Text>
                  <Text style={{ fontSize: 15, color: '#FFF', fontWeight: '700' }}>{room?.capacity ? `${room.capacity} Pax` : '—'}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Rent</Text>
                  <Text style={{ fontSize: 15, color: '#FFF', fontWeight: '700' }}>₹{room?.monthly_rent ?? user?.monthly_rent ?? '—'}</Text>
                </View>
              </View>
            </View>

            {/* Profile Info */}
            <Text style={styles.sectionTitle}>Tenant Profile</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}><UserCircle2 size={18} color="#6366F1" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLbl}>Full Name</Text>
                  <Text style={styles.infoVal}>{user?.name}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}><Phone size={18} color="#10B981" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLbl}>Phone Number</Text>
                  <Text style={styles.infoVal}>{user?.phone}</Text>
                </View>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.infoIconWrap}><Mail size={18} color="#F59E0B" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLbl}>Email Address</Text>
                  <Text style={styles.infoVal}>{user?.email || 'Not provided'}</Text>
                </View>
              </View>
            </View>

            {/* Amenities Card */}
            {Array.isArray(room?.amenities) && room.amenities.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Amenities</Text>
                <View style={styles.infoCard}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {room.amenities.map((amenity: string, idx: number) => (
                      <View key={idx} style={styles.amenityChip}>
                        <CheckCircle2 size={14} color={SUCCESS} style={{ marginRight: 4 }} />
                        <Text style={styles.amenityTxt}>{amenity}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
            
            <View style={styles.disclaimerBox}>
              <AlertCircle size={16} color="#3B82F6" style={{ marginRight: 8 }} />
              <Text style={styles.disclaimerTxt}>For discrepancies, please contact the hostel admin.</Text>
            </View>
          </>
        )}

        {activeTab === 'Rent History' && (
          <View>
            {fees.length === 0 ? (
              <EmptyState icon={FileCheck} title="No Payment History" message="Your rent payment records will appear here." />
            ) : (
              fees.map((fee, idx) => {
                const isPaid = (fee.fee_status || '').toLowerCase() === 'paid';
                const isOverdue = (fee.fee_status || '').toLowerCase() === 'overdue';
                return (
                  <View key={fee.fee_id ?? idx} style={styles.historyCard}>
                    <View style={styles.historyTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.statusDot, isPaid ? { backgroundColor: '#10B981' } : isOverdue ? { backgroundColor: '#EF4444' } : { backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.historyMonth}>{formatFeeMonth(fee.fee_month)}</Text>
                      </View>
                      <View style={[styles.statusBadge, isPaid ? { backgroundColor: '#D1FAE5' } : isOverdue ? { backgroundColor: '#FEE2E2' } : { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.statusBadgeTxt, isPaid ? { color: '#059669' } : isOverdue ? { color: '#DC2626' } : { color: '#D97706' }]}>
                          {fee.fee_status ?? 'Pending'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.historyBottom}>
                      <View>
                        <Text style={styles.historyLbl}>Due Date</Text>
                        <Text style={styles.historyVal}>{formatDueDate(fee.due_date)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.historyLbl}>Amount</Text>
                        <Text style={styles.historyAmt}>₹{fee.total_amount || fee.monthly_rent ? fee.total_amount || fee.monthly_rent : '—'}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'Maintenance' && (
          <EmptyState icon={Wrench} title="No Maintenance Records" message="Maintenance requests will be displayed here once available." />
        )}

        {activeTab === 'Notes' && (
          <View>
            {!isAddingNote ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddingNote(true)} activeOpacity={0.8}>
                <Plus size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.addBtnTxt}>Add Note</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.noteForm}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="e.g. Wi-Fi password, shared groceries..."
                  placeholderTextColor={TEXT_LIGHT}
                  multiline
                  value={noteText}
                  onChangeText={setNoteText}
                  autoFocus
                />
                <View style={styles.noteFormActions}>
                  <TouchableOpacity onPress={() => { setIsAddingNote(false); setNoteText(''); }} style={{ padding: 8 }}>
                    <Text style={{ fontSize: 13, color: TEXT_MID, fontWeight: '700' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, !noteText.trim() && { opacity: 0.5 }]} onPress={addNote} disabled={!noteText.trim()}>
                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {notes.map((n) => (
              <View key={n.id} style={styles.noteCard}>
                <View style={styles.noteCardTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <FileText size={14} color={BLUE} style={{ marginRight: 6 }} />
                    <Text style={styles.noteCardDate}>{n.date}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setNotes(notes.filter(x => x.id !== n.id))}>
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.noteCardText}>{n.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 10 },
  smallTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F8FAFC', marginRight: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  smallTabActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  smallTabTxt: { fontSize: 13, fontWeight: '600', color: TEXT_MID },
  smallTabTxtActive: { color: '#4F46E5', fontWeight: '800' },

  scroll: { padding: 16, paddingBottom: 60 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: TEXT_DARK, marginBottom: 10, marginTop: 8 },

  // Compact Room Card
  compactCard: { backgroundColor: '#4F46E5', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  roomTypeBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roomTypeTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  // Info Card
  infoCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoLbl: { fontSize: 12, color: TEXT_MID, fontWeight: '600', marginBottom: 2 },
  infoVal: { fontSize: 15, color: TEXT_DARK, fontWeight: '700' },

  amenityChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  amenityTxt: { fontSize: 13, fontWeight: '600', color: TEXT_DARK },

  disclaimerBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#DBEAFE' },
  disclaimerTxt: { flex: 1, fontSize: 12, color: '#1D4ED8', fontWeight: '500', lineHeight: 18 },

  // History Card
  historyCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 12, marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  historyMonth: { fontSize: 15, fontWeight: '800', color: TEXT_DARK },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeTxt: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  historyBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  historyLbl: { fontSize: 12, color: TEXT_MID, fontWeight: '600', marginBottom: 2 },
  historyVal: { fontSize: 14, color: TEXT_DARK, fontWeight: '700' },
  historyAmt: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },

  // Notes
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 12, marginBottom: 20, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  addBtnTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  
  noteForm: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  noteInput: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, minHeight: 100, fontSize: 14, color: TEXT_DARK, textAlignVertical: 'top', fontWeight: '500' },
  noteFormActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12, gap: 8 },
  saveBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },

  noteCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9', borderLeftWidth: 4, borderLeftColor: '#4F46E5' },
  noteCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  noteCardDate: { fontSize: 12, fontWeight: '700', color: TEXT_MID },
  noteCardText: { fontSize: 14, color: TEXT_DARK, lineHeight: 22, fontWeight: '500' },
});
