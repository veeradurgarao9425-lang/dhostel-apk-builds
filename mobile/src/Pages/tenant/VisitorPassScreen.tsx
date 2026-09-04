import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  TextInput, StatusBar, ActivityIndicator, Platform, RefreshControl,
  KeyboardAvoidingView, LayoutAnimation, UIManager
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, User, Clock, Calendar, X, ChevronDown, Check, Filter, Phone, FileText } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { notifyVisitorPassSubmitted } from '../../hooks/useTenantNotifications';
import api from '../../services/api';
import { AppHeader, EmptyState, SkeletonListRow, LoaderOverlay } from '../../components/tenant/ui';
import DateTimePickerModal from "react-native-modal-datetime-picker";

const BLUE = '#2245D4';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID = '#666666';
const BORDER = '#E2E8F0';
const BG = '#F8FAFD';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function VisitorPassScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
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
  const [visitorPhone, setVisitorPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [errors, setErrors] = useState<{ visitorName?: string; relation?: string; visitDate?: string; visitTime?: string }>({});
  const [showRelationPicker, setShowRelationPicker] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [isFilterDatePickerVisible, setFilterDatePickerVisible] = useState(false);

  const RELATIONS = ['Family', 'Parent', 'Friend', 'Relative', 'Colleague', 'Delivery / Service', 'Guest', 'Other'];

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
    setVisitorName('');
    setVisitorPhone('');
    setRelation('');
    setVisitDate(currentDate);
    setVisitTime(currentTime);
    setPurpose('');
    setErrors({});
  };

  const handleSubmit = async () => {
    const newErrors: { visitorName?: string; relation?: string; visitDate?: string; visitTime?: string } = {};
    if (!visitorName.trim()) newErrors.visitorName = 'Visitor name is required';
    if (!relation) newErrors.relation = 'Please select a relation';
    if (!visitDate) newErrors.visitDate = 'Visit date is required';
    if (!visitTime) newErrors.visitTime = 'Visit time is required';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showWarning('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const fullName = visitorPhone.trim() ? `${visitorName.trim()} (${visitorPhone.trim()})` : visitorName.trim();
      const fullRelation = purpose.trim() ? `${relation} - ${purpose.trim()}` : relation;
      await api.post('/requests/visitor/tenant', {
        hostel_id: user?.hostel_id,
        visitor_name: fullName,
        relation: fullRelation,
        visit_date: visitDate,
        visit_time: visitTime,
      });
      setShowForm(false);
      resetForm();
      showSuccess('Visitor pass request submitted.');
      notifyVisitorPassSubmitted(visitorName);
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

  const counts = {
    All: requests.length,
    Pending: requests.filter((r: any) => (r.status || 'Pending') === 'Pending').length,
    Approved: requests.filter((r: any) => r.status === 'Approved').length,
    Rejected: requests.filter((r: any) => r.status === 'Rejected').length,
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

      {/* ── Top Tabs Segmented Control ── */}
      <View style={{ backgroundColor: WHITE, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: BORDER }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 3 }}>
          {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(f => {
            const active = activeFilter === f;
            const count = counts[f] || 0;
            const activeTextColor =
              f === 'Approved' ? '#16A34A' :
              f === 'Rejected' ? '#DC2626' :
              f === 'Pending' ? '#D97706' : BLUE;
            const activeBadgeBg =
              f === 'Approved' ? '#DCFCE7' :
              f === 'Rejected' ? '#FEE2E2' :
              f === 'Pending' ? '#FEF3C7' : '#EEF2FF';

            return (
              <TouchableOpacity
                key={f}
                onPress={() => {
                  try {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  } catch (_) {}
                  setActiveFilter(f);
                }}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 9,
                  backgroundColor: active ? WHITE : 'transparent',
                  ...(active ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1.5 },
                    shadowOpacity: 0.08,
                    shadowRadius: 3,
                    elevation: 2,
                  } : {}),
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 12,
                      fontWeight: active ? '700' : '600',
                      color: active ? activeTextColor : '#64748B',
                    }}
                  >
                    {f}
                  </Text>
                  <View
                    style={{
                      minWidth: 17,
                      height: 17,
                      paddingHorizontal: 3,
                      borderRadius: 9,
                      backgroundColor: active ? activeBadgeBg : 'rgba(100, 116, 139, 0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: active ? activeTextColor : '#64748B',
                      }}
                    >
                      {count}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date Filter Active Chip */}
        {filterDate.trim() !== '' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 2 }}>
            <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' }}>
              <Calendar size={12} color={BLUE} style={{ marginRight: 5 }} />
              <Text style={{ fontSize: 12, color: BLUE, fontWeight: '600', marginRight: 8 }}>
                Date: {formatDate(filterDate)}
              </Text>
              <TouchableOpacity onPress={() => setFilterDate('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={13} color={BLUE} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowForm(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ maxHeight: '90%' }}>
            <View style={{ backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: Math.max(insets.bottom, 16), shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 24 }}>
              
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT_DARK }}>Request Visitor Pass</Text>
                  <Text style={{ fontSize: 12.5, color: TEXT_MID, marginTop: 2 }}>Enter visitor details to request approval</Text>
                </View>
                <TouchableOpacity onPress={() => setShowForm(false)} style={{ padding: 6, borderRadius: 20, backgroundColor: '#F1F5F9' }}>
                  <X size={20} color={TEXT_MID} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>
                
                {/* Visitor Name */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 6 }}>
                  Visitor Name <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: errors.visitorName ? '#EF4444' : BORDER, borderRadius: 14, paddingHorizontal: 14, height: 48, backgroundColor: '#FAFAFA' }}>
                  <User size={18} color={errors.visitorName ? '#EF4444' : TEXT_MID} style={{ marginRight: 10 }} />
                  <TextInput
                    style={{ flex: 1, fontSize: 14, color: TEXT_DARK }}
                    value={visitorName}
                    onChangeText={(t) => { setVisitorName(t); setErrors(e => ({ ...e, visitorName: undefined })); }}
                    placeholder="Visitor's full name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                {errors.visitorName && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{errors.visitorName}</Text>}

                {/* Visitor Phone */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 6, marginTop: 12 }}>
                  Phone Number <Text style={{ color: TEXT_MID, fontWeight: '400', fontSize: 12 }}>(Optional)</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, height: 48, backgroundColor: '#FAFAFA' }}>
                  <Phone size={18} color={TEXT_MID} style={{ marginRight: 10 }} />
                  <TextInput
                    style={{ flex: 1, fontSize: 14, color: TEXT_DARK }}
                    value={visitorPhone}
                    onChangeText={setVisitorPhone}
                    placeholder="Visitor's 10-digit mobile"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                </View>

                {/* Relation */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 6, marginTop: 12 }}>
                  Relation <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={{ borderWidth: 1, borderColor: errors.relation ? '#EF4444' : BORDER, borderRadius: 14, paddingHorizontal: 14, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA' }}
                  onPress={() => setShowRelationPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14, color: relation ? TEXT_DARK : '#9CA3AF' }}>{relation || 'Select relation'}</Text>
                  <ChevronDown size={18} color={TEXT_MID} />
                </TouchableOpacity>
                {errors.relation && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{errors.relation}</Text>}

                {/* Date & Time Row */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 6 }}>
                      Visit Date <Text style={{ color: '#EF4444' }}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={{ borderWidth: 1, borderColor: errors.visitDate ? '#EF4444' : BORDER, borderRadius: 14, paddingHorizontal: 14, height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FAFAFA' }}
                      onPress={() => setDatePickerVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Calendar size={18} color={TEXT_MID} />
                      <Text style={{ fontSize: 13.5, color: visitDate ? TEXT_DARK : '#9CA3AF' }}>{visitDate || 'Select Date'}</Text>
                    </TouchableOpacity>
                    {errors.visitDate && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{errors.visitDate}</Text>}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 6 }}>
                      Visit Time <Text style={{ color: '#EF4444' }}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={{ borderWidth: 1, borderColor: errors.visitTime ? '#EF4444' : BORDER, borderRadius: 14, paddingHorizontal: 14, height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FAFAFA' }}
                      onPress={() => setTimePickerVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Clock size={18} color={TEXT_MID} />
                      <Text style={{ fontSize: 13.5, color: visitTime ? TEXT_DARK : '#9CA3AF' }}>{visitTime || 'Select Time'}</Text>
                    </TouchableOpacity>
                    {errors.visitTime && <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{errors.visitTime}</Text>}
                  </View>
                </View>

                {/* Purpose of Visit */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 6, marginTop: 12 }}>
                  Purpose of Visit <Text style={{ color: TEXT_MID, fontWeight: '400', fontSize: 12 }}>(Optional)</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, height: 48, backgroundColor: '#FAFAFA' }}>
                  <FileText size={18} color={TEXT_MID} style={{ marginRight: 10 }} />
                  <TextInput
                    style={{ flex: 1, fontSize: 14, color: TEXT_DARK }}
                    value={purpose}
                    onChangeText={setPurpose}
                    placeholder="e.g. Personal visit, Dropping books"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </ScrollView>

              {/* Submit Button */}
              <TouchableOpacity
                style={{ height: 50, backgroundColor: BLUE, borderRadius: 14, justifyContent: 'center', alignItems: 'center', opacity: submitting ? 0.7 : 1, marginTop: 4 }}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? <ActivityIndicator color={WHITE} /> : <Text style={{ color: WHITE, fontSize: 16, fontWeight: '700' }}>Submit Request</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
