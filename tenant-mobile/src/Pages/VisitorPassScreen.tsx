import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  TextInput, StatusBar, ActivityIndicator, Platform, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, User, Clock, Calendar, X, ChevronDown, Check, Filter } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { AppHeader, EmptyState, SkeletonListRow, LoaderOverlay } from '../components/ui';
import DateTimePickerModal from "react-native-modal-datetime-picker";

const BLUE = '#2245D4';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID = '#666666';
const BORDER = '#E2E8F0';
const BG = '#F8FAFD';

export default function VisitorPassScreen({ navigation }: any) {
  const { user } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  const [showDateFilter, setShowDateFilter] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  // Form state
  const [visitorName, setVisitorName] = useState('');
  const [relation, setRelation] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [showRelationPicker, setShowRelationPicker] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [isFilterDatePickerVisible, setFilterDatePickerVisible] = useState(false);

  const RELATIONS = ['Family', 'Friend', 'Colleague', 'Other'];

  const handleConfirmDate = (date: Date) => {
    // format to YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setVisitDate(`${yyyy}-${mm}-${dd}`);
    setDatePickerVisible(false);
  };
  
  const handleConfirmTime = (date: Date) => {
    // format to HH:MM
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    setVisitTime(`${hh}:${mm}`);
    setTimePickerVisible(false);
  };

  const handleConfirmFilterDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setFilterDate(`${yyyy}-${mm}-${dd}`);
    setFilterDatePickerVisible(false);
  };

  const fetchRequests = async () => {
    try {
      const res = await api.get('/requests/visitor/tenant');
      setRequests(res.data?.visitors || res.data?.data || res.data || []);
    } catch {
      showError('Could not load visitor requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRequests(); }, []));

  const resetForm = () => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);
    setVisitorName(''); setRelation(''); setVisitDate(currentDate); setVisitTime(currentTime);
  };

  const handleSubmit = async () => {
    if (!visitorName.trim() || !relation || !visitDate || !visitTime) {
      showWarning('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/requests/visitor/tenant', {
        hostel_id: user?.hostel_id,
        visitor_name: visitorName.trim(),
        relation,
        visit_date: visitDate,
        visit_time: visitTime,
      });
      setShowForm(false);
      resetForm();
      showSuccess('Visitor pass request submitted.');
      fetchRequests();
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'Approved') return { bg: '#DCFCE7', text: '#22C55E' };
    if (status === 'Rejected') return { bg: '#FEE2E2', text: '#EF4444' };
    return { bg: '#FEF3C7', text: '#D97706' };
  };

  const formatDate = (d: string) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      <AppHeader
        title="Visitor Pass"
        subtitle="Request and track visitor entry passes"
        showBack={navigation.canGoBack()}
        rightComponent={
          <TouchableOpacity onPress={() => setShowDateFilter(true)} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 }}>
            <Calendar size={20} color={WHITE} />
          </TouchableOpacity>
        }
      />

      {/* ── Filter chips ── */}
      {!loading && requests.length > 0 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, gap: 8 }}
          style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: BORDER }}
        >
          {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(f => {
            const active = activeFilter === f;
            const chipColor = f === 'Approved' ? '#22C55E' : f === 'Rejected' ? '#EF4444' : f === 'Pending' ? '#D97706' : BLUE;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: active ? chipColor : '#F1F5F9',
                  borderWidth: 1, borderColor: active ? chipColor : BORDER,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFF' : TEXT_MID }}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {loading ? (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <SkeletonListRow />
          <SkeletonListRow />
          <SkeletonListRow />
          <SkeletonListRow />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} colors={[BLUE]} />}
        >
          {(() => {
            let filtered = activeFilter === 'All' ? requests : requests.filter((r: any) => (r.status || 'Pending') === activeFilter);
            if (filterDate.trim() !== '') {
              filtered = filtered.filter((r: any) => r.created_at && r.created_at.startsWith(filterDate.trim()));
            }
            
            if (requests.length === 0) return (
              <View style={{ marginTop: 24 }}>
                <EmptyState
                  icon={User}
                  title="No visitor requests yet"
                  message="Tap + to request a visitor pass"
                  action={{ label: "Request Visitor Pass", onPress: () => { resetForm(); setShowForm(true); } }}
                />
              </View>
            );
            if (filtered.length === 0) return (
              <View style={{ marginTop: 24 }}>
                <EmptyState
                  icon={Filter}
                  title={`No ${activeFilter} requests`}
                  message="Try a different filter"
                />
              </View>
            );
            return filtered.map((r: any, i: number) => {
              const sc = statusColor(r.status || 'Pending');
              return (
                <View key={r.visitor_id || i} style={{ backgroundColor: WHITE, borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT_DARK, flex: 1 }}>{r.visitor_name}</Text>
                    <View style={{ backgroundColor: sc.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: sc.text, fontSize: 11, fontWeight: '800' }}>{r.status || 'Pending'}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Text style={{ fontSize: 13, color: TEXT_MID }}>{r.relation}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} color={TEXT_MID} />
                      <Text style={{ fontSize: 13, color: TEXT_MID }}>{formatDate(r.visit_date)}</Text>
                    </View>
                    {r.visit_time && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color={TEXT_MID} />
                        <Text style={{ fontSize: 13, color: TEXT_MID }}>{r.visit_time}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            });
          })()}
        </ScrollView>
      )}

      {!loading && !showForm && requests.length > 0 && (
        <TouchableOpacity
          style={{ position: 'absolute', bottom: 100, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
          onPress={() => { resetForm(); setShowForm(true); }}
        >
          <Plus size={24} color={WHITE} strokeWidth={3} />
        </TouchableOpacity>
      )}

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: Platform.OS === 'ios' ? 48 : 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT_DARK }}>Request Visitor Pass</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <X size={24} color={TEXT_MID} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_MID, marginBottom: 8 }}>Visitor Name</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, height: 52, fontSize: 15, color: TEXT_DARK, marginBottom: 16 }}
              value={visitorName} onChangeText={setVisitorName} placeholder="Visitor's full name" placeholderTextColor="#9CA3AF"
            />

            <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_MID, marginBottom: 8 }}>Relation</Text>
            <TouchableOpacity
              style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}
              onPress={() => setShowRelationPicker(true)}
            >
              <Text style={{ fontSize: 15, color: relation ? TEXT_DARK : '#9CA3AF' }}>{relation || 'Select relation'}</Text>
              <ChevronDown size={20} color={TEXT_MID} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_MID, marginBottom: 8 }}>Visit Date</Text>
                <TouchableOpacity
                  style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, height: 52, justifyContent: 'center' }}
                  onPress={() => setDatePickerVisible(true)}
                >
                  <Text style={{ fontSize: 15, color: visitDate ? TEXT_DARK : '#9CA3AF' }}>{visitDate || 'Select Date'}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_MID, marginBottom: 8 }}>Visit Time</Text>
                <TouchableOpacity
                  style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, height: 52, justifyContent: 'center' }}
                  onPress={() => setTimePickerVisible(true)}
                >
                  <Text style={{ fontSize: 15, color: visitTime ? TEXT_DARK : '#9CA3AF' }}>{visitTime || 'Select Time'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={{ height: 54, backgroundColor: BLUE, borderRadius: 16, justifyContent: 'center', alignItems: 'center', opacity: submitting ? 0.6 : 1 }}
              onPress={handleSubmit} disabled={submitting}
            >
              {submitting ? <ActivityIndicator color={WHITE} /> : <Text style={{ color: WHITE, fontSize: 16, fontWeight: '700' }}>Submit Request</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showRelationPicker} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', padding: 24 }} activeOpacity={1} onPress={() => setShowRelationPicker(false)}>
          <View style={{ backgroundColor: WHITE, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 24 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT_DARK, marginBottom: 16 }}>Select Relation</Text>
            {RELATIONS.map(r => (
              <TouchableOpacity key={r} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER }} onPress={() => { setRelation(r); setShowRelationPicker(false); }}>
                <Text style={{ fontSize: 15, color: TEXT_DARK }}>{r}</Text>
                {relation === r && <Check size={18} color={BLUE} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── DATE FILTER MODAL ── */}
      <Modal visible={showDateFilter} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: WHITE, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT_DARK }}>Filter by Date</Text>
              <TouchableOpacity onPress={() => setShowDateFilter(false)}>
                <X size={20} color={TEXT_MID} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_MID, marginBottom: 8 }}>Date</Text>
            <TouchableOpacity
              style={{ backgroundColor: '#F8FAFD', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginBottom: 24, justifyContent: 'center' }}
              onPress={() => setFilterDatePickerVisible(true)}
            >
              <Text style={{ fontSize: 15, color: filterDate ? TEXT_DARK : '#9CA3AF', fontWeight: '500' }}>{filterDate || 'Select Date'}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center' }} onPress={() => { setFilterDate(''); setShowDateFilter(false); }}>
                <Text style={{ color: TEXT_DARK, fontWeight: '700' }}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: BLUE, alignItems: 'center' }} onPress={() => setShowDateFilter(false)}>
                <Text style={{ color: WHITE, fontWeight: '700' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisible(false)}
      />
      
      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleConfirmTime}
        onCancel={() => setTimePickerVisible(false)}
      />
      <DateTimePickerModal
        isVisible={isFilterDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmFilterDate}
        onCancel={() => setFilterDatePickerVisible(false)}
      />
      <LoaderOverlay visible={submitting} label="Submitting Request..." />
    </View>
  );
}
