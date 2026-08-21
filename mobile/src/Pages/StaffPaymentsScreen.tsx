import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar,
    RefreshControl, ScrollView, Modal, TextInput, ActivityIndicator,
    KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { toLocalDateStr } from '../utils/dateUtils';
import { X, Calendar, IndianRupee, TrendingDown, CheckCircle, Clock, ArrowRight } from 'lucide-react-native';
import { CardWatermark } from '../components/ui/CardWatermark';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

const fmtDate = (d?: string) => {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
};

const fmtMonth = (ym: string) => {
    if (!ym) return '—';
    try {
        const [y, m] = ym.split('-');
        const date = new Date(Number(y), Number(m) - 1, 1);
        return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } catch { return ym; }
};

const fmtAmount = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

// ─── Drawer: Give Advance / Pay Salary ────────────────────────────────────────
function PaymentDrawerModal({
    visible, onClose, mode, staffName, suggestedAmount,
    onConfirm, themeColor, loading
}: {
    visible: boolean;
    onClose: () => void;
    mode: 'advance' | 'salary';
    staffName: string;
    suggestedAmount: number;
    onConfirm: (data: { amount: string; date: string; note: string; payMode: string; transactionId: string }) => void;
    themeColor?: string;
    loading: boolean;
}) {
    const { isDark } = useTheme();
    const isAdvance = mode === 'advance';
    const accentColor = themeColor || (isAdvance ? '#D97706' : '#16A34A');
    const title = isAdvance ? 'Give Salary Advance' : 'Pay Staff Salary';
    const icon = isAdvance ? 'cash-outline' : 'checkmark-circle-outline';

    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(todayStr());
    const [note, setNote] = useState('');
    const [payMode, setPayMode] = useState('Cash');
    const [transactionId, setTransactionId] = useState('');
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [errors, setErrors] = useState<{ amount?: string }>({});

    // Reset fields whenever modal opens with clean fresh inputs
    React.useEffect(() => {
        if (visible) {
            setAmount(suggestedAmount > 0 ? String(suggestedAmount) : '');
            setDate(todayStr());
            setNote('');
            setPayMode('Cash');
            setTransactionId('');
            setErrors({});
        }
    }, [visible, suggestedAmount]);

    const handleSubmit = () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            setErrors({ amount: 'Enter a valid amount' });
            return;
        }
        setErrors({});
        onConfirm({ amount, date, note, payMode, transactionId });
    };

    const MODES = [
        { id: 'Cash', label: 'Cash', icon: 'cash-outline' },
        { id: 'UPI', label: 'UPI / QR', icon: 'scan-outline' },
        { id: 'Bank', label: 'Bank Transfer', icon: 'business-outline' },
        { id: 'Cheque', label: 'Cheque', icon: 'document-text-outline' },
        { id: 'Card', label: 'Card', icon: 'card-outline' },
    ];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={[S.drawerSheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
                    {/* Header */}
                    <View style={S.drawerHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={[S.drawerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{title}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: accentColor, marginTop: 3 }}>
                                👤 {staffName}
                            </Text>
                            <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                                {isAdvance ? 'Record salary advance given to staff' : 'Record full/partial salary payout'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <X color="#64748B" size={20} />
                        </TouchableOpacity>
                    </View>

                    {/* Suggested amount banner (salary mode) */}
                    {mode === 'salary' && suggestedAmount > 0 && (
                        <View style={[S.suggestedBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                            <CheckCircle size={16} color="#16A34A" />
                            <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '700', marginLeft: 8 }}>
                                Suggested: {fmtAmount(suggestedAmount)} (Balance after advances)
                            </Text>
                        </View>
                    )}

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 350 }}
                    >
                        {/* Amount */}
                        <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Amount (₹) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                        <View style={[
                            S.amountBox,
                            { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                            errors.amount ? { borderColor: '#EF4444' } : {}
                        ]}>
                            <IndianRupee size={18} color={accentColor} />
                            <TextInput
                                style={[S.amountInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={t => { setAmount(t.replace(/[^0-9.]/g, '')); setErrors({}); }}
                                placeholder="0"
                                placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
                            />
                        </View>
                        {errors.amount && <Text style={S.errText}>{errors.amount}</Text>}

                        {/* Payment Mode */}
                        <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Payment Method</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2, marginBottom: 8 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            {MODES.map(m => {
                                const active = payMode === m.id;
                                return (
                                    <TouchableOpacity
                                        key={m.id}
                                        style={[
                                            S.modeChip,
                                            {
                                                backgroundColor: active ? accentColor + '15' : (isDark ? '#1E293B' : '#F8FAFC'),
                                                borderColor: active ? accentColor : (isDark ? '#334155' : '#E2E8F0'),
                                                borderWidth: active ? 1.5 : 1,
                                            }
                                        ]}
                                        onPress={() => setPayMode(m.id)}
                                        activeOpacity={0.75}
                                    >
                                        <Ionicons
                                            name={m.icon as any}
                                            size={15}
                                            color={active ? accentColor : (isDark ? '#94A3B8' : '#64748B')}
                                        />
                                        <Text style={[
                                            S.modeChipText,
                                            {
                                                color: active ? accentColor : (isDark ? '#CBD5E1' : '#475569'),
                                                fontWeight: active ? '800' : '600'
                                            }
                                        ]}>
                                            {m.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Date */}
                        <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Payment Date <Text style={{ color: '#EF4444' }}>*</Text></Text>
                        <TouchableOpacity
                            style={[S.dateField, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                            onPress={() => setDatePickerVisible(true)}
                        >
                            <Calendar size={15} color="#64748B" />
                            <Text style={[S.dateText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{date}</Text>
                        </TouchableOpacity>

                        {/* Transaction ID (for UPI/Bank) */}
                        <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Transaction ID (Optional)</Text>
                        <TextInput
                            style={[S.inputField, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                            value={transactionId}
                            onChangeText={setTransactionId}
                            placeholder="e.g. UPI-123456789"
                            placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
                        />

                        {/* Note */}
                        <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Reason / Note (Optional)</Text>
                        <TextInput
                            style={[S.inputField, { height: 75, textAlignVertical: 'top', backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                            value={note}
                            onChangeText={setNote}
                            multiline
                            placeholder={isAdvance ? 'e.g. Medical emergency, urgent festival advance...' : 'e.g. Full month wage payout'}
                            placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
                        />

                        <View style={{ height: 16 }} />

                        {/* Submit */}
                        <TouchableOpacity
                            style={[S.submitBtn, { backgroundColor: accentColor }, loading && { opacity: 0.6 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={S.submitBtnText}>{isAdvance ? `Record Advance for ${staffName}` : `Pay Salary to ${staffName}`}</Text>
                            )}
                        </TouchableOpacity>

                        <View style={{ height: 180 }} />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            <DateTimePickerModal
                isVisible={datePickerVisible}
                mode="date"
                onConfirm={d => { setDate(toLocalDateStr(d)); setDatePickerVisible(false); }}
                onCancel={() => setDatePickerVisible(false)}
                date={date ? new Date(date) : new Date()}
                maximumDate={new Date()}
            />
        </Modal>
    );
}

// ─── Month Summary Card ───────────────────────────────────────────────────────
function MonthSummaryCard({ data, monthlySalary, onGiveAdvance, onPaySalary, theme }: any) {
    const { for_month, total_advances, salary_paid, balance_due, is_settled } = data;
    const totalGiven = total_advances + salary_paid;

    return (
        <View style={S.summaryCard}>
            <View style={S.summaryTop}>
                <View>
                    <Text style={S.summaryMonthLabel}>{fmtMonth(for_month)}</Text>
                    <Text style={S.summarySubLabel}>Current Salary Cycle</Text>
                </View>
                <View style={[S.settledBadge, { backgroundColor: is_settled ? '#DCFCE7' : '#FEF3C7' }]}>
                    {is_settled
                        ? <CheckCircle size={12} color="#16A34A" />
                        : <Clock size={12} color="#D97706" />
                    }
                    <Text style={[S.settledBadgeText, { color: is_settled ? '#16A34A' : '#D97706' }]}>
                        {is_settled ? ' Settled' : ' Ongoing'}
                    </Text>
                </View>
            </View>

            {/* Salary Breakdown */}
            <View style={S.breakdownGrid}>
                <View style={S.breakdownItem}>
                    <Text style={S.breakdownLabel}>Monthly Salary</Text>
                    <Text style={[S.breakdownValue, { color: '#1E293B' }]}>{fmtAmount(monthlySalary)}</Text>
                </View>
                <View style={S.breakdownDivider} />
                <View style={S.breakdownItem}>
                    <Text style={S.breakdownLabel}>Advances Given</Text>
                    <Text style={[S.breakdownValue, { color: '#F59E0B' }]}>− {fmtAmount(total_advances)}</Text>
                </View>
                <View style={S.breakdownDivider} />
                <View style={S.breakdownItem}>
                    <Text style={S.breakdownLabel}>Salary Paid</Text>
                    <Text style={[S.breakdownValue, { color: '#16A34A' }]}>− {fmtAmount(salary_paid)}</Text>
                </View>
            </View>

            {/* Balance */}
            <View style={S.balanceRow}>
                <Text style={S.balanceLabel}>Balance to Pay</Text>
                <Text style={[S.balanceValue, { color: balance_due > 0 ? '#DC2626' : '#16A34A' }]}>
                    {fmtAmount(balance_due)}
                </Text>
            </View>

            {/* Progress Bar */}
            <View style={S.progressBar}>
                <View style={[S.progressFill, {
                    width: `${Math.min(100, monthlySalary > 0 ? (totalGiven / monthlySalary) * 100 : 0)}%` as any,
                    backgroundColor: is_settled ? '#16A34A' : '#F59E0B'
                }]} />
            </View>
            <Text style={S.progressLabel}>
                {fmtAmount(totalGiven)} of {fmtAmount(monthlySalary)} disbursed
            </Text>

            {/* Actions */}
            {!is_settled && (
                <View style={S.actionRow}>
                    <TouchableOpacity style={S.advanceBtn} onPress={onGiveAdvance}>
                        <TrendingDown size={16} color="#F59E0B" />
                        <Text style={S.advanceBtnText}>Give Advance</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={S.salaryBtn} onPress={onPaySalary}>
                        <CheckCircle size={16} color="#16A34A" />
                        <Text style={S.salaryBtnText}>Pay Salary</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ─── Transaction Item ─────────────────────────────────────────────────────────
function PaymentItem({ item, onDelete, onReceipt, theme }: any) {
    const isAdvance = (item.payment_type || '').toLowerCase() !== 'salary';
    const accentColor = isAdvance ? '#F59E0B' : '#16A34A';
    const bgColor = isAdvance ? '#FFFBEB' : '#F0FDF4';
    const label = isAdvance ? 'Advance' : 'Salary';

    return (
        <View style={[S.payItem, { borderLeftColor: accentColor }]}>
            <View style={[S.payIconBox, { backgroundColor: bgColor }]}>
                <Ionicons
                    name={isAdvance ? 'trending-down-outline' : 'checkmark-circle-outline'}
                    size={18}
                    color={accentColor}
                />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[S.payAmount, { color: accentColor }]}>{fmtAmount(item.amount)}</Text>
                    <View style={[S.typeBadge, { backgroundColor: bgColor }]}>
                        <Text style={[S.typeBadgeText, { color: accentColor }]}>{label}</Text>
                    </View>
                </View>
                <Text style={S.payDate}>{fmtDate(item.payment_date)}{item.mode ? `  •  ${item.mode}` : ''}</Text>
                {!!item.note && <Text style={S.payNote} numberOfLines={1}>{item.note}</Text>}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity
                    style={S.receiptBtn}
                    onPress={() => onReceipt(item)}
                >
                    <Ionicons name="receipt-outline" size={14} color="#6366F1" />
                    <Text style={S.receiptBtnText}>Receipt</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Month Group Header ───────────────────────────────────────────────────────
function MonthGroupHeader({ monthData }: { monthData: any }) {
    const { for_month, total_advances, salary_paid, is_settled } = monthData;
    return (
        <View style={S.groupHeader}>
            <View style={{ flex: 1 }}>
                <Text style={S.groupMonthTitle}>{fmtMonth(for_month)}</Text>
                <Text style={S.groupMeta}>
                    Advances: {fmtAmount(total_advances)}  •  Paid: {fmtAmount(salary_paid)}
                </Text>
            </View>
            <View style={[S.groupBadge, { backgroundColor: is_settled ? '#DCFCE7' : '#FEF3C7' }]}>
                <Text style={[S.groupBadgeText, { color: is_settled ? '#16A34A' : '#D97706' }]}>
                    {is_settled ? '✓ Settled' : '⏳ Ongoing'}
                </Text>
            </View>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StaffPaymentsScreen({ navigation, route }: any) {
    const { theme, isDark } = useTheme();
    const confirm = useConfirmation();
    const { showApiError, showSuccess } = useToast();

    const staffId = route.params?.staffId;
    const staffName = route.params?.staffName || 'Staff';

    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Drawer state
    const [drawerMode, setDrawerMode] = useState<'advance' | 'salary'>('advance');
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchSummary = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await api.get(`/staff/${staffId}/salary-summary`);
            if (res.data?.success) {
                setSummary(res.data.data);
            }
        } catch (e) {
            console.error('Fetch staff salary summary error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [staffId]);

    useFocusEffect(useCallback(() => { fetchSummary(false); }, [fetchSummary]));

    const openDrawer = (mode: 'advance' | 'salary') => {
        setDrawerMode(mode);
        setDrawerVisible(true);
    };

    const handlePayment = async (data: {
        amount: string; date: string; note: string; payMode: string; transactionId: string;
    }) => {
        const currentMonth = summary?.current_month;
        const forMonth = currentMonth?.for_month;

        setSaving(true);
        try {
            const res = await api.post(`/staff/${staffId}/payments`, {
                amount: parseFloat(data.amount),
                payment_date: data.date,
                payment_type: drawerMode === 'advance' ? 'Advance' : 'Salary',
                note: data.note.trim() || null,
                for_month: forMonth,
                mode: data.payMode,
                transaction_id: data.transactionId || null,
            });
            if (res.data?.success) {
                showSuccess(drawerMode === 'advance' ? 'Advance recorded!' : 'Salary payment recorded!');
                setDrawerVisible(false);
                fetchSummary(true);
            }
        } catch (error: any) {
            showApiError(error, 'Failed to record payment.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (payment: any) => {
        confirm({
            title: 'Delete Payment',
            message: `Delete payment of ${fmtAmount(payment.amount)}?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/staff/payments/${payment.payment_id}`);
                    showSuccess('Payment deleted.');
                    fetchSummary(true);
                } catch (e: any) {
                    showApiError(e, 'Failed to delete payment.');
                }
            }
        });
    };

    const handleReceipt = (payment: any) => {
        navigation.navigate('Receipt', {
            feeData: { ...payment, first_name: staffName, isStaff: true }
        });
    };

    const currentMonth = summary?.current_month;
    const monthlySalary = summary?.monthly_salary || 0;
    const history = summary?.history || [];
    const balanceDue = currentMonth?.balance_due || 0;

    // Build flat list data: history sections with their payments
    const allSections = history.filter((m: any) => m.payments && m.payments.length > 0);

    return (
        <View style={[S.root, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader
                title={`${staffName}'s Salary`}
                subtitle={monthlySalary > 0 ? `₹${Number(monthlySalary).toLocaleString('en-IN')} / month` : 'No salary set'}
                showBack
            />

            {loading ? (
                <SkeletonList count={4} />
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSummary(true); }} tintColor={theme.primary} />
                    }
                    contentContainerStyle={{ paddingBottom: 120 }}
                >
                    {/* Current Month Summary Card */}
                    {currentMonth && monthlySalary > 0 && (
                        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                            <MonthSummaryCard
                                data={currentMonth}
                                monthlySalary={monthlySalary}
                                onGiveAdvance={() => openDrawer('advance')}
                                onPaySalary={() => openDrawer('salary')}
                                theme={theme}
                            />
                        </View>
                    )}

                    {/* If no salary set — show a message */}
                    {monthlySalary === 0 && (
                        <View style={S.noSalaryBanner}>
                            <Ionicons name="alert-circle-outline" size={22} color="#F59E0B" />
                            <Text style={S.noSalaryText}>No monthly salary set for this staff. Edit staff profile to add salary.</Text>
                        </View>
                    )}

                    {/* Quick Actions (when salary > 0 and is settled or no current card shown) */}
                    {monthlySalary > 0 && currentMonth?.is_settled && (
                        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                            <View style={S.actionRow}>
                                <TouchableOpacity style={S.advanceBtn} onPress={() => openDrawer('advance')}>
                                    <TrendingDown size={16} color="#F59E0B" />
                                    <Text style={S.advanceBtnText}>Give Advance</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={S.salaryBtn} onPress={() => openDrawer('salary')}>
                                    <CheckCircle size={16} color="#16A34A" />
                                    <Text style={S.salaryBtnText}>Pay Salary</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* History Title */}
                    {allSections.length > 0 && (
                        <Text style={S.sectionTitle}>Payment History</Text>
                    )}

                    {/* History grouped by month */}
                    {allSections.length === 0 && !loading && (
                        <EmptyState
                            illustration="pending"
                            title="No Payments Yet"
                            subtitle={`Start by giving an advance or paying ${staffName}'s salary.`}
                            actionLabel={monthlySalary > 0 ? 'Give Advance' : undefined}
                            onAction={monthlySalary > 0 ? () => openDrawer('advance') : undefined}
                        />
                    )}

                    {allSections.map((monthData: any) => (
                        <View key={monthData.for_month} style={{ marginBottom: 8 }}>
                            <MonthGroupHeader monthData={monthData} />
                            {monthData.payments.map((payment: any) => (
                                <View key={payment.payment_id} style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                                    <PaymentItem
                                        item={payment}
                                        onDelete={handleDelete}
                                        onReceipt={handleReceipt}
                                        theme={theme}
                                    />
                                </View>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Payment Drawer */}
            <PaymentDrawerModal
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                mode={drawerMode}
                staffName={staffName}
                suggestedAmount={balanceDue}
                onConfirm={handlePayment}
                themeColor={drawerMode === 'advance' ? '#F59E0B' : '#16A34A'}
                loading={saving}
            />
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
    root: { flex: 1 },

    // ── Month Summary Card ──
    summaryCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    summaryMonthLabel: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
    summarySubLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
    settledBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    settledBadgeText: { fontSize: 12, fontWeight: '800' },

    breakdownGrid: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        gap: 4,
    },
    breakdownItem: { flex: 1, alignItems: 'center' },
    breakdownLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    breakdownValue: { fontSize: 14, fontWeight: '800' },
    breakdownDivider: { width: 1, backgroundColor: '#E2E8F0' },

    balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    balanceLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
    balanceValue: { fontSize: 20, fontWeight: '900' },

    progressBar: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    progressLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 14, textAlign: 'right' },

    actionRow: { flexDirection: 'row', gap: 10 },
    advanceBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 12, borderRadius: 12,
        backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A',
    },
    advanceBtnText: { fontSize: 13, fontWeight: '800', color: '#D97706' },
    salaryBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 12, borderRadius: 12,
        backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#BBF7D0',
    },
    salaryBtnText: { fontSize: 13, fontWeight: '800', color: '#16A34A' },

    noSalaryBanner: {
        margin: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#FDE68A',
    },
    noSalaryText: { flex: 1, fontSize: 13, color: '#92400E', fontWeight: '600' },

    // ── Section title ──
    sectionTitle: {
        fontSize: 12, fontWeight: '800', color: '#94A3B8',
        textTransform: 'uppercase', letterSpacing: 0.8,
        paddingHorizontal: 16, marginBottom: 8, marginTop: 4,
    },

    // ── Month Group Header ──
    groupHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: '#F8FAFC', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1F5F9',
        marginBottom: 4,
    },
    groupMonthTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
    groupMeta: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
    groupBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    groupBadgeText: { fontSize: 11, fontWeight: '800' },

    // ── Payment Item ──
    payItem: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF', borderRadius: 14, padding: 14,
        borderLeftWidth: 4,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
    },
    payIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    payAmount: { fontSize: 15, fontWeight: '900' },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    typeBadgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
    payDate: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 3 },
    payNote: { fontSize: 11, color: '#64748B', marginTop: 2 },
    receiptBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    receiptBtnText: { fontSize: 11, fontWeight: '700', color: '#6366F1' },

    // ── Drawer ──
    modalRoot: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
    drawerSheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        width: '100%', maxHeight: '92%',
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
        overflow: 'hidden',
    },
    handleBar: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
    drawerHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 8 },
    drawerIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    drawerTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
    drawerSub: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 1 },

    suggestedBanner: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 12, padding: 12, marginBottom: 4,
        borderWidth: 1, borderColor: '#BBF7D0',
    },

    label: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 14, marginBottom: 6 },
    amountBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
        borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    },
    amountInput: { flex: 1, fontSize: 22, fontWeight: '900', color: '#0F172A' },
    errText: { color: '#EF4444', fontSize: 12, fontWeight: '600', marginTop: 4 },

    dateField: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    },
    dateText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },

    modeRow: { flexDirection: 'row', gap: 8 },
    modeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    modeChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

    inputField: {
        backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 14, color: '#0F172A', fontWeight: '500',
    },
    submitBtn: {
        borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
        marginTop: 8, elevation: 3,
        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6,
    },
    submitBtnText: { fontSize: 15, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
});
