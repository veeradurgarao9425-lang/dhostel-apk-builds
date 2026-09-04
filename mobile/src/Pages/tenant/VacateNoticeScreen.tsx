import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, StatusBar, Alert, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, AlertCircle, LogOut, CheckCircle2, X, Clock, HelpCircle } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import api from '../../services/api';
import { AppHeader } from '../../components/tenant/ui';

const BLUE = '#2245D4';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#0F172A';
const TEXT_MID = '#64748B';
const BORDER = '#E2E8F0';
const BG = '#F8FAFD';
const DANGER = '#EF4444';
const SUCCESS = '#10B981';

export default function VacateNoticeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const currentNoticeDate = (user as any)?.vacate_notice_date;
  const currentNoticeReason = (user as any)?.vacate_notice_reason;

  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirmDate = (selectedDate: Date) => {
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
    setDatePickerVisible(false);
  };

  const handleSubmit = async () => {
    if (!date) {
      showError('Please select your planned vacate date.');
      return;
    }

    Alert.alert(
      'Confirm Vacate Notice',
      `Are you sure you want to submit notice to vacate your room on ${formatDateDisplay(date)}? Your hostel owner will be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Submit',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await api.post('/students/vacate', {
                date,
                reason: reason.trim() || undefined,
              });
              showSuccess('Vacate notice submitted successfully!');
              await refreshUser();
              navigation.goBack();
            } catch (err: any) {
              showError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to submit vacate notice.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelNotice = () => {
    Alert.alert(
      'Cancel Vacate Notice',
      'Are you sure you want to cancel your scheduled vacate notice? You will remain an active resident.',
      [
        { text: 'No, Keep It', style: 'cancel' },
        {
          text: 'Yes, Cancel Notice',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              await api.post('/students/vacate', { date: null });
              showSuccess('Vacate notice cancelled.');
              await refreshUser();
              navigation.goBack();
            } catch (err: any) {
              showError(err?.response?.data?.error || 'Failed to cancel vacate notice.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const formatDateDisplay = (d: string) => {
    if (!d) return '--';
    const dateObj = new Date(d);
    return isNaN(dateObj.getTime())
      ? d
      : dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      <AppHeader
        title="Vacate Notice"
        subtitle="Schedule room vacate & deposit settlement"
        showBack={navigation.canGoBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {currentNoticeDate ? (
          // ── Notice Already Active ──
          <View style={{ backgroundColor: WHITE, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#FDE68A', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Clock size={26} color="#D97706" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT_DARK, marginBottom: 6 }}>Vacate Notice Active</Text>
            <Text style={{ fontSize: 14, color: TEXT_MID, lineHeight: 20, marginBottom: 16 }}>
              You have informed the hostel management that you are planning to vacate on:
            </Text>

            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: TEXT_MID, textTransform: 'uppercase', letterSpacing: 0.6 }}>Scheduled Vacate Date</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: DANGER, marginTop: 4 }}>
                {formatDateDisplay(currentNoticeDate)}
              </Text>
              {currentNoticeReason ? (
                <Text style={{ fontSize: 13, color: TEXT_DARK, marginTop: 8 }}>
                  <Text style={{ fontWeight: '700' }}>Reason: </Text>{currentNoticeReason}
                </Text>
              ) : null}
            </View>

            <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start' }}>
              <AlertCircle size={18} color={BLUE} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={{ fontSize: 12, color: '#1E40AF', flex: 1, lineHeight: 18 }}>
                The owner will finalize dues and process your security deposit refund on or before this date.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCancelNotice}
              disabled={submitting}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#FEE2E2',
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator color={DANGER} />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: DANGER }}>Cancel Vacate Notice</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // ── Submit New Notice Form ──
          <View>
            {/* Info Card */}
            <View style={{ backgroundColor: WHITE, borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <LogOut size={18} color={DANGER} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT_DARK }}>Planning to move out?</Text>
                  <Text style={{ fontSize: 12, color: TEXT_MID }}>Inform owner in advance for deposit settlement</Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: TEXT_MID, lineHeight: 19 }}>
                Submitting a vacate notice alerts your hostel owner to inspect the room, settle pending dues, and prepare your refundable security deposit.
              </Text>
            </View>

            {/* Form Fields */}
            <View style={{ backgroundColor: WHITE, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
              {/* Date Input */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 }}>
                Planned Vacate Date <Text style={{ color: DANGER }}>*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setDatePickerVisible(true)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: '#F8FAFD',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: date ? BLUE : BORDER,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 18,
                }}
              >
                <Text style={{ fontSize: 15, color: date ? TEXT_DARK : '#94A3B8', fontWeight: date ? '700' : '500' }}>
                  {date ? formatDateDisplay(date) : 'Select planned move-out date'}
                </Text>
                <Calendar size={18} color={date ? BLUE : TEXT_MID} />
              </TouchableOpacity>

              {/* Reason Input */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 }}>
                Reason for Vacating (Optional)
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Job transfer, course completed, moving to new city"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: '#F8FAFD',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: BORDER,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: TEXT_DARK,
                  minHeight: 80,
                  textAlignVertical: 'top',
                  marginBottom: 24,
                }}
              />

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.8}
                style={{
                  backgroundColor: BLUE,
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: BLUE,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color={WHITE} />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '800', color: WHITE }}>
                    Submit Vacate Notice
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        minimumDate={new Date()}
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisible(false)}
      />
    </View>
  );
}
