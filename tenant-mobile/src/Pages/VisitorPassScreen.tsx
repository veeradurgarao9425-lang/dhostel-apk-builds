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

  // Form state
  const [visitorName, setVisitorName] = useState('');
  const [relation, setRelation] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [showRelationPicker, setShowRelationPicker] = useState(false);

  const RELATIONS = ['Family', 'Friend', 'Colleague', 'Other'];

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
    setVisitorName(''); setRelation(''); setVisitDate(''); setVisitTime('');
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
      <View style={{ backgroundColor: BLUE, paddingBottom: 20 }}>
        <SafeAreaView edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
              <ArrowLeft size={24} color={WHITE} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={{ flex: 1, fontSize: 22, fontWeight: '800', color: WHITE, marginLeft: 12 }}>Visitor Pass</Text>
          </View>
        </SafeAreaView>
      </View>

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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} colors={[BLUE]} />}
        >
          {(() => {
            const filtered = activeFilter === 'All' ? requests : requests.filter((r: any) => (r.status || 'Pending') === activeFilter);
            if (requests.length === 0) return (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <User size={56} color="#CBD5E1" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: TEXT_MID, marginTop: 16 }}>No visitor requests yet</Text>
                <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>Tap + to request a visitor pass</Text>
              </View>
            );
            if (filtered.length === 0) return (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Filter size={48} color="#CBD5E1" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: TEXT_MID, marginTop: 16 }}>No {activeFilter} requests</Text>
                <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>Try a different filter</Text>
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

      <TouchableOpacity
        style={{ position: 'absolute', bottom: 100, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: BLUE, justifyContent: 'center', alignItems: 'center', shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
        onPress={() => { resetForm(); setShowForm(true); }}
      >
        <Plus size={24} color={WHITE} strokeWidth={3} />
      </TouchableOpacity>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: Platform.OS === 'ios' ? 48 : 28 }}>
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

            <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_MID, marginBottom: 8 }}>Visit Date (YYYY-MM-DD)</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, height: 52, fontSize: 15, color: TEXT_DARK, marginBottom: 16 }}
              value={visitDate} onChangeText={setVisitDate} placeholder="e.g. 2026-07-15" placeholderTextColor="#9CA3AF"
            />

            <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_MID, marginBottom: 8 }}>Visit Time (HH:MM)</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, height: 52, fontSize: 15, color: TEXT_DARK, marginBottom: 24 }}
              value={visitTime} onChangeText={setVisitTime} placeholder="e.g. 14:30" placeholderTextColor="#9CA3AF"
            />

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
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }} activeOpacity={1} onPress={() => setShowRelationPicker(false)}>
          <View style={{ backgroundColor: WHITE, borderRadius: 20, padding: 20 }}>
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
    </View>
  );
}
