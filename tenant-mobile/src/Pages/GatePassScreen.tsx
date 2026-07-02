import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, Calendar, CheckCircle, Ticket, QrCode, X } from 'lucide-react-native';
import api from '../services/api';
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
const WARN      = '#F59E0B';
const WARN_BG   = '#FEF3C7';

// Mock Pass Status
// 'none' | 'pending' | 'approved'
type PassStatus = 'none' | 'pending' | 'approved';

export default function GatePassScreen({ navigation }: any) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PassStatus>('none');
  const [showForm, setShowForm] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [latestRequest, setLatestRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [reason, setReason] = useState('');
  const [returnTime, setReturnTime] = useState('');

  const fetchLeaveRequests = async () => {
    try {
      const res = await api.get('/requests/leave/tenant');
      const requests: any[] = res.data || [];
      setLeaveRequests(requests);

      if (requests.length === 0) {
        setStatus('none');
        setLatestRequest(null);
        return;
      }

      // Sort by created_at descending to get the most recent
      const sorted = [...requests].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latest = sorted[0];
      setLatestRequest(latest);

      if (latest.status === 'Approved') {
        setStatus('approved');
      } else if (latest.status === 'Pending') {
        setStatus('pending');
      } else {
        // Rejected or unknown — treat as no active pass
        setStatus('none');
      }
    } catch {
      setStatus('none');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const submitRequest = async () => {
    if (!reason.trim() || !returnTime.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/requests/leave/tenant', { reason: reason.trim(), return_time: returnTime.trim() });
      setShowForm(false);
      setReason('');
      setReturnTime('');
      await fetchLeaveRequests();
      setStatus('pending');
    } catch {
      // Keep form open on error
    } finally {
      setSubmitting(false);
    }
  };

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
              <Text style={s.headerGreeting}>Gate Pass</Text>
              <Text style={s.headerSub}>Outing & leave requests</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }}>

        {loading && (
          <View style={s.emptyState}>
            <ActivityIndicator size="large" color={BLUE} />
          </View>
        )}

        {!loading && status === 'none' && (
          <View style={s.emptyState}>
            <View style={s.iconWrap}><Ticket size={40} color={BLUE} /></View>
            <Text style={s.emptyTitle}>No Active Pass</Text>
            <Text style={s.emptySub}>Request a late pass or weekend leave if you plan to stay out past curfew.</Text>
            
            <TouchableOpacity style={s.primaryBtn} onPress={() => setShowForm(true)}>
              <Text style={s.primaryBtnTxt}>Request Gate Pass</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && status === 'pending' && (
          <View style={s.emptyState}>
            <View style={[s.iconWrap, { backgroundColor: WARN_BG }]}><Clock size={40} color={WARN} /></View>
            <Text style={s.emptyTitle}>Request Pending</Text>
            <Text style={s.emptySub}>Your request has been sent to the warden. You will be notified once it is approved.</Text>
          </View>
        )}

        {!loading && status === 'approved' && (
          <View style={s.ticketWrapper}>
            <View style={s.ticketTop}>
              <View style={s.ticketHeaderRow}>
                <Text style={s.ticketTitle}>LATE PASS</Text>
                <View style={s.approvedBadge}>
                  <CheckCircle size={14} color={SUCCESS} />
                  <Text style={s.approvedTxt}>APPROVED</Text>
                </View>
              </View>

              <Text style={s.ticketName}>{user?.name || ''}</Text>
              <Text style={s.ticketRoom}>{user?.room_number ? `Room ${user.room_number}` : ''}</Text>

              <View style={s.ticketDetailsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.ticketLbl}>OUTING REASON</Text>
                  <Text style={s.ticketVal}>{latestRequest?.reason || ''}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.ticketLbl}>EXPECTED RETURN</Text>
                  <Text style={s.ticketVal}>{latestRequest?.return_time || ''}</Text>
                </View>
              </View>
            </View>
            
            {/* Ticket Divider */}
            <View style={s.ticketDividerWrap}>
              <View style={s.notchLeft} />
              <View style={s.dashedLine} />
              <View style={s.notchRight} />
            </View>

            <View style={s.ticketBottom}>
              <View style={s.qrWrapper}>
                <QrCode size={120} color={TEXT_DARK} strokeWidth={1} />
              </View>
              <Text style={s.qrHelpTxt}>Show this QR code to the security guard at the main gate.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── REQUEST MODAL ── */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Request Pass</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} style={s.closeBtn}>
                <X size={20} color={TEXT_MID} />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLbl}>Reason for outing</Text>
            <TextInput 
              style={s.input} 
              placeholder="e.g. Birthday Party, Movie" 
              placeholderTextColor="#94A3B8" 
              value={reason} 
              onChangeText={setReason} 
            />

            <Text style={s.inputLbl}>Expected Return Time</Text>
            <TextInput 
              style={s.input} 
              placeholder="e.g. 11:30 PM" 
              placeholderTextColor="#94A3B8" 
              value={returnTime} 
              onChangeText={setReturnTime} 
            />

            <TouchableOpacity
              style={[s.primaryBtn, { marginTop: 32 }, submitting && { opacity: 0.7 }]}
              onPress={submitRequest}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color={WHITE} />
                : <Text style={s.primaryBtnTxt}>Submit Request</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  headerSection: { backgroundColor: BLUE, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  backBtnLight: { padding: 8, marginLeft: -8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  headerGreeting: { fontSize: 22, fontWeight: '800', color: WHITE },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: BLUE_SOFT, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: TEXT_DARK, marginBottom: 12 },
  emptySub: { fontSize: 15, color: TEXT_MID, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 40 },

  primaryBtn: { backgroundColor: BLUE, paddingVertical: 18, paddingHorizontal: 32, borderRadius: 20, alignItems: 'center', width: '100%', shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryBtnTxt: { color: WHITE, fontSize: 16, fontWeight: '800' },

  // Ticket UI
  ticketWrapper: { marginTop: 20, backgroundColor: WHITE, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
  ticketTop: { padding: 24, backgroundColor: WHITE },
  ticketHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  ticketTitle: { fontSize: 14, fontWeight: '800', color: TEXT_MID, letterSpacing: 2 },
  approvedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: SUCCESS_BG, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
  approvedTxt: { fontSize: 12, fontWeight: '800', color: SUCCESS },
  ticketName: { fontSize: 28, fontWeight: '800', color: TEXT_DARK, marginBottom: 4 },
  ticketRoom: { fontSize: 15, color: TEXT_MID, marginBottom: 24 },
  ticketDetailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ticketLbl: { fontSize: 11, fontWeight: '700', color: TEXT_MID, marginBottom: 4, letterSpacing: 1 },
  ticketVal: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  
  ticketDividerWrap: { height: 30, flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, position: 'relative' },
  notchLeft: { width: 30, height: 30, borderRadius: 15, backgroundColor: BG, position: 'absolute', left: -15 },
  notchRight: { width: 30, height: 30, borderRadius: 15, backgroundColor: BG, position: 'absolute', right: -15 },
  dashedLine: { flex: 1, height: 1, marginHorizontal: 20, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  
  ticketBottom: { padding: 32, backgroundColor: WHITE, alignItems: 'center' },
  qrWrapper: { padding: 16, backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 20 },
  qrHelpTxt: { fontSize: 14, color: TEXT_MID, textAlign: 'center', paddingHorizontal: 20 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.6)' },
  sheet: { backgroundColor: WHITE, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: TEXT_DARK },
  closeBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
  inputLbl: { fontSize: 13, fontWeight: '700', color: TEXT_MID, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F8FAFD', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontSize: 15, color: TEXT_DARK, fontWeight: '500' },
});
