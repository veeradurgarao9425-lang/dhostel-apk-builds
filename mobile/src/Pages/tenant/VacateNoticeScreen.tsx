import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, StatusBar, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, AlertCircle, LogOut, CheckCircle2, Clock, ShieldCheck, ArrowRight } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirmation } from '../../../contexts/ConfirmationContext';
import { useToast } from '../../../contexts/ToastContext';
import { notifyVacateNoticeSubmitted } from '../../hooks/useTenantNotifications';
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
  const confirm = useConfirmation();
  const { showSuccess, showError } = useToast();

  const currentNoticeDate = (user as any)?.vacate_notice_date;
  const currentNoticeReason = (user as any)?.vacate_notice_reason;
  const depositAmount = Number((user as any)?.refundable_deposit || (user as any)?.security_deposit || 0);

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

  const getDaysLeft = (targetDateStr: string) => {
    try {
      const target = new Date(targetDateStr);
      const today = new Date();
      target.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  const formatDateDisplay = (d: string) => {
    if (!d) return '--';
    const dateObj = new Date(d);
    return isNaN(dateObj.getTime())
      ? d
      : dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleSubmit = async () => {
    if (!date) {
      showError('Please select your planned vacate date.');
      return;
    }

    confirm({
      title: 'Confirm Vacate Notice',
      message: `Are you sure you want to schedule room move-out on ${formatDateDisplay(date)}? Hostel management will be notified to inspect the room and prepare your deposit refund.`,
      confirmText: 'Yes, Submit Notice',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await api.post('/students/vacate', {
            date,
            reason: reason.trim() || undefined,
          });
          notifyVacateNoticeSubmitted(formatDateDisplay(date), depositAmount);
          showSuccess('Vacate notice submitted successfully!');
          await refreshUser();
          setDate('');
          setReason('');
        } catch (err: any) {
          showError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to submit vacate notice.');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const handleCancelNotice = () => {
    confirm({
      title: 'Cancel Vacate Notice',
      message: 'Are you sure you want to cancel your scheduled vacate notice? You will remain an active resident with full hostel access.',
      confirmText: 'Yes, Cancel Notice',
      cancelText: 'Keep Notice',
      variant: 'info',
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await api.post('/students/vacate', { date: null });
          showSuccess('Vacate notice cancelled.');
          await refreshUser();
        } catch (err: any) {
          showError(err?.response?.data?.error || 'Failed to cancel vacate notice.');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const daysRemaining = currentNoticeDate ? getDaysLeft(currentNoticeDate) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      <AppHeader
        title="Vacate Room & Refund"
        subtitle="Schedule checkout & security deposit settlement"
        showBack={navigation.canGoBack()}
      />

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 100 }}>
        {currentNoticeDate ? (
          // ── Notice Already Active: Rich Status Card & Settlement Breakdown ──
          <View style={{ gap: 16 }}>
            {/* Top Countdown Banner */}
            <View style={{ backgroundColor: WHITE, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#FDE68A', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={22} color="#D97706" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT_DARK }}>Vacate Scheduled</Text>
                    <Text style={{ fontSize: 12, color: TEXT_MID }}>Management notified</Text>
                  </View>
                </View>

                <View style={{ backgroundColor: daysRemaining <= 4 ? '#FEE2E2' : '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: daysRemaining <= 4 ? DANGER : BLUE }}>
                    {daysRemaining > 0 ? `⏳ ${daysRemaining} Days Left` : 'Today is Move-Out Day'}
                  </Text>
                </View>
              </View>

              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: TEXT_MID, textTransform: 'uppercase', letterSpacing: 0.5 }}>Move-Out Date</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: DANGER, marginTop: 4 }}>
                  {formatDateDisplay(currentNoticeDate)}
                </Text>
                {currentNoticeReason ? (
                  <Text style={{ fontSize: 13, color: TEXT_DARK, marginTop: 6 }}>
                    <Text style={{ fontWeight: '700' }}>Reason: </Text>{currentNoticeReason}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Refund Settlement Card */}
            <View style={{ backgroundColor: WHITE, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} color={SUCCESS} />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT_DARK }}>Security Deposit Refund</Text>
                  <Text style={{ fontSize: 12, color: TEXT_MID }}>Settled upon room inspection</Text>
                </View>
              </View>

              <View style={{ backgroundColor: '#F8FAFD', borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: BORDER }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: TEXT_MID }}>Deposit Paid</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK }}>
                    ₹{depositAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: TEXT_MID }}>Unpaid Rent Dues</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: SUCCESS }}>₹0 (Clear)</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: TEXT_MID }}>Damage Deductions</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK }}>₹0</Text>
                </View>

                <View style={{ height: 1, backgroundColor: BORDER, marginVertical: 4 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT_DARK }}>Estimated Net Refund</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: SUCCESS }}>
                    ₹{depositAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>

            {/* 4-Step Settlement Process Timeline */}
            <View style={{ backgroundColor: WHITE, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT_DARK, marginBottom: 14 }}>Settlement Progress</Text>
              
              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={16} color={SUCCESS} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK }}>1. Notice Submitted & Recorded</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={16} color={BLUE} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: TEXT_MID }}>2. Room & Bed Inspection</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8' }}>3</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: TEXT_MID }}>3. Final Dues & Deposit Settlement</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8' }}>4</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: TEXT_MID }}>4. Handover & Deposit Return via UPI</Text>
                </View>
              </View>
            </View>

            {/* Cancel Button */}
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
                marginTop: 6,
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
          <View style={{ gap: 16 }}>
            {/* Info Card */}
            <View style={{ backgroundColor: WHITE, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <LogOut size={18} color={DANGER} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT_DARK }}>Planning to move out?</Text>
                  <Text style={{ fontSize: 12, color: TEXT_MID }}>Schedule in advance for smooth deposit settlement</Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: TEXT_MID, lineHeight: 19 }}>
                Submitting advance notice alerts your hostel owner to verify dues, inspect the room, and prepare your refundable security deposit.
              </Text>
            </View>

            {/* Deposit Estimate Banner */}
            <View style={{ backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#BBF7D0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>Your Refundable Deposit</Text>
                <Text style={{ fontSize: 11, color: '#15803D' }}>Eligible for refund upon checkout</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#166534' }}>
                ₹{depositAmount.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Form Fields */}
            <View style={{ backgroundColor: WHITE, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
              {/* Date Input */}
              <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 }}>
                Planned Move-Out Date <Text style={{ color: DANGER }}>*</Text>
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
