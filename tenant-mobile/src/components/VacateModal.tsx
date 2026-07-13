import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { BaseBottomSheet } from './UIComponents';
import { Calendar, X, Trash2, CalendarDays } from 'lucide-react-native';
import { colors, spacing, radius, text as typography } from '../theme';
import api from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

interface VacateModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VacateModal({ visible, onClose, onSuccess }: VacateModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [currentReason, setCurrentReason] = useState<string>('');

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (visible) {
      fetchVacateStatus();
    } else {
      setDatePickerVisible(false);
      setReason('');
    }
  }, [visible]);

  const fetchVacateStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/tenant/me');
      if (res.data?.data) {
        const d = res.data.data.vacate_notice_date;
        setCurrentDate(d || null);
        if (d) setSelectedDate(new Date(d));
        else setSelectedDate(new Date());

        const r = res.data.data.vacate_notice_reason;
        setCurrentReason(r || '');
        setReason(r || '');
      }
    } catch (e) {
      console.error('Failed to fetch vacate status', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate) return;
    try {
      setSaving(true);
      await api.post('/students/vacate', { 
        date: selectedDate.toISOString(), 
        reason: reason 
      });
      onSuccess();
      onClose();
    } catch (e) {
      console.error('Failed to submit vacate notice', e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      setSaving(true);
      await api.post('/students/vacate', { date: null, reason: null });
      onSuccess();
      onClose();
    } catch (e) {
      console.error('Failed to cancel vacate notice', e);
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || new Date();
    setDatePickerVisible(Platform.OS === 'ios');
    setSelectedDate(currentDate);
  };

  return (
    <BaseBottomSheet visible={visible} onClose={onClose}>
      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={s.content}>
          {currentDate ? (
            <View style={s.activeNotice}>
              <View style={s.iconWrap}><CalendarDays size={24} color={colors.primary} /></View>
              <Text style={s.activeTitle}>Notice Active</Text>
              <Text style={s.activeDesc}>You have scheduled to vacate on:</Text>
              <Text style={s.dateText}>{new Date(currentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>
          ) : (
            <Text style={s.desc}>Please select the date you plan to vacate the hostel and provide an optional reason.</Text>
          )}

          <Text style={s.label}>Select Date</Text>
          <TouchableOpacity style={s.dateInput} onPress={() => setDatePickerVisible(true)}>
            <Calendar size={20} color={colors.text} />
            <Text style={s.dateVal}>
              {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </TouchableOpacity>

          {datePickerVisible && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          <Text style={s.label}>Reason (Optional)</Text>
          <TextInput
            style={s.textInput}
            value={reason}
            onChangeText={setReason}
            placeholder="Why are you leaving?"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={s.footer}>
            <TouchableOpacity style={s.saveBtn} onPress={handleSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>{currentDate ? 'Update Notice' : 'Submit Notice'}</Text>}
            </TouchableOpacity>

            {currentDate && (
              <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} disabled={saving}>
                <Trash2 size={16} color={colors.danger} />
                <Text style={s.cancelTxt}>Cancel Notice</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </BaseBottomSheet>
  );
}

const s = StyleSheet.create({
  content: { padding: spacing.xl },
  desc: { fontSize: 14, color: colors.textMuted, marginBottom: 24, lineHeight: 20 },
  activeNotice: { backgroundColor: colors.primarySoft, padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
  iconWrap: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12 },
  activeTitle: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  activeDesc: { fontSize: 13, color: colors.textMuted, marginBottom: 8 },
  dateText: { fontSize: 18, fontWeight: '800', color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  dateInput: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, padding: 16, borderRadius: radius.xl, marginBottom: 24 },
  dateVal: { fontSize: 15, color: colors.text, fontWeight: '500' },
  textInput: { borderWidth: 1, borderColor: colors.border, padding: 16, borderRadius: radius.xl, fontSize: 15, color: colors.text, minHeight: 100, marginBottom: 32 },
  footer: { gap: 12 },
  saveBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: radius.xl, alignItems: 'center' },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: radius.xl, backgroundColor: '#FEE2E2' },
  cancelTxt: { color: colors.danger, fontSize: 16, fontWeight: '600' },
});
