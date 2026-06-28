import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar,
    RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { useConfirmation } from '../../contexts/ConfirmationContext';

const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate = (d?: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
};

export default function StaffPaymentsScreen({ navigation, route }: any) {
    const { theme, isDark } = useTheme();
    const confirm = useConfirmation();
    const { showApiError, showSuccess, showError } = useToast();
    const staffId = route.params?.staffId;
    const staffName = route.params?.staffName || 'Staff';

    const [payments, setPayments] = useState<any[]>([]);
    const [summary, setSummary] = useState<{ count: number; totalPaid: number }>({ count: 0, totalPaid: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [amount, setAmount] = useState('');
    const [days, setDays] = useState('');
    const [note, setNote] = useState('');
    const [payDate, setPayDate] = useState(todayStr());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchPayments = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await api.get(`/staff/${staffId}/payments`);
            if (res.data?.success) {
                setPayments(res.data.data || []);
                setSummary(res.data.summary || { count: 0, totalPaid: 0 });
            }
        } catch (e) {
            console.error('Fetch staff payments error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [staffId]);

    useFocusEffect(useCallback(() => { fetchPayments(true); }, [fetchPayments]));

    const resetForm = () => { setAmount(''); setDays(''); setNote(''); setPayDate(todayStr()); };

    const handleSave = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            showError('Enter a valid payment amount.');
            return;
        }
        if (days && (isNaN(Number(days)) || Number(days) < 1)) {
            showError('Days worked must be a positive number.');
            return;
        }
        setSaving(true);
        try {
            const res = await api.post(`/staff/${staffId}/payments`, {
                amount: parseFloat(amount),
                payment_date: payDate,
                days_worked: days ? parseInt(days) : null,
                note: note.trim() || null,
            });
            if (res.data?.success) {
                showSuccess('Payment saved successfully!');
                setModalVisible(false);
                resetForm();
                fetchPayments(true);
            }
        } catch (error: any) {
            showApiError(error, 'Failed to record payment.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (p: any) => {
        confirm({
            title: 'Delete Payment',
            message: `Remove this ₹${Number(p.amount).toLocaleString('en-IN')} payment?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/staff/payments/${p.payment_id}`);
                    fetchPayments(true);
                } catch {
                    showError('Failed to delete payment.');
                }
            }
        });
    };

    const renderItem = ({ item }: any) => (
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
            <View style={[s.payIcon, { backgroundColor: isDark ? '#334155' : '#FEE2E2' }]}>
                <Ionicons name="cash-outline" size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[s.amount, { color: theme.textPrimary }]}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                <Text style={[s.meta, { color: theme.textSecondary }]}>
                    {fmtDate(item.payment_date)}{item.days_worked ? `  •  ${item.days_worked} day(s)` : ''}
                </Text>
                {!!item.note && <Text style={[s.note, { color: theme.textSecondary }]} numberOfLines={2}>{item.note}</Text>}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[s.root, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader title={`${staffName} — Payments`} showBack />

            <View style={[s.summaryStrip, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <View style={s.summaryItem}>
                    <Text style={[s.summaryVal, { color: theme.textPrimary }]}>{summary.count}</Text>
                    <Text style={[s.summaryLbl, { color: theme.textSecondary }]}>Payments</Text>
                </View>
                <View style={[s.summaryDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                <View style={s.summaryItem}>
                    <Text style={[s.summaryVal, { color: '#DC2626' }]}>₹{summary.totalPaid.toLocaleString('en-IN')}</Text>
                    <Text style={[s.summaryLbl, { color: theme.textSecondary }]}>Total Paid</Text>
                </View>
            </View>

            {loading ? (
                <SkeletonList count={4} />
            ) : (
                <FlatList
                    data={payments}
                    keyExtractor={(item) => String(item.payment_id)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPayments(true); }} tintColor={theme.primary} />}
                    ListEmptyComponent={
                        <EmptyState
                            icon="cash-outline"
                            title="No Payments Yet"
                            subtitle={`Record wage payments made to ${staffName}.`}
                            actionLabel="Record Payment"
                            onAction={() => setModalVisible(true)}
                        />
                    }
                />
            )}

            <TouchableOpacity style={[s.fab, { backgroundColor: theme.primary }]} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
                <Ionicons name="add" size={30} color="#FFF" />
            </TouchableOpacity>

            {/* Record Payment Modal */}
            <Modal visible={modalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
                    <View style={[s.sheet, { backgroundColor: theme.cardBg }]}>
                        <View style={s.sheetHandle} />
                        <View style={s.sheetHeader}>
                            <Text style={[s.sheetTitle, { color: theme.textPrimary }]}>Record Payment</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={22} color={theme.textPrimary} /></TouchableOpacity>
                        </View>

                        <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Amount (₹) *</Text>
                        <TextInput
                            style={[s.input, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: theme.textPrimary, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                            placeholder="e.g. 1000" placeholderTextColor="#94A3B8" keyboardType="numeric"
                            value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Date *</Text>
                                <TouchableOpacity
                                    style={[s.input, s.dateInput, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={{ color: theme.textPrimary, fontSize: 15 }}>{payDate}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Days Worked</Text>
                                <TextInput
                                    style={[s.input, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: theme.textPrimary, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                    placeholder="optional" placeholderTextColor="#94A3B8" keyboardType="numeric"
                                    value={days} onChangeText={(t) => setDays(t.replace(/[^0-9]/g, ''))}
                                />
                            </View>
                        </View>

                        <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Note</Text>
                        <TextInput
                            style={[s.input, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: theme.textPrimary, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                            placeholder="e.g. June wages" placeholderTextColor="#94A3B8"
                            value={note} onChangeText={setNote}
                        />

                        <TouchableOpacity style={[s.saveBtn, { backgroundColor: theme.primary }, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                            <Text style={s.saveText}>{saving ? 'Saving...' : 'Save Payment'}</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                onConfirm={(d) => { setPayDate(d.toISOString().split('T')[0]); setShowDatePicker(false); }}
                onCancel={() => setShowDatePicker(false)}
            />
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    summaryStrip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14, borderRadius: 16, borderWidth: 1, paddingVertical: 14 },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: 1, height: 28 },
    summaryVal: { fontSize: 18, fontWeight: '900' },
    summaryLbl: { fontSize: 11, fontWeight: '600', marginTop: 2 },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 },
    payIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    amount: { fontSize: 16, fontWeight: '800' },
    meta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    note: { fontSize: 12, marginTop: 4 },
    fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sheetTitle: { fontSize: 18, fontWeight: '800' },
    fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 12 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 48, fontSize: 15 },
    dateInput: { justifyContent: 'center' },
    saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
    saveText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
