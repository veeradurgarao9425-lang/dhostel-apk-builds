/**
 * PaymentDrawer.tsx — Shared payment collection bottom-sheet drawer.
 *
 * BEFORE: The IDENTICAL CollectDrawer component was copy-pasted verbatim in:
 *   - FinanceScreen.tsx       (lines 231–352)
 *   - PendingPaymentsScreen.tsx (lines 131–252)
 *
 * This is exactly like Google Pay vs PhonePe — same logic, different screens.
 * Now it lives here once. Both screens just import it.
 *
 * Usage:
 *   import { PaymentDrawer } from '../components/PaymentDrawer';
 *   <PaymentDrawer visible={visible} onClose={onClose} ... />
 */

import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { X, Calendar } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { toLocalDateStr } from '../utils/dateUtils';
import { FullScreenLoader } from './FullScreenLoader';
import { CardWatermark } from './ui/CardWatermark';
import { useTheme } from '../../contexts/ThemeContext';

export interface PaymentDrawerProps {
    visible: boolean;
    onClose: () => void;
    selectedFee: any | null;
    paymentModes: any[];

    payAmount: string;
    setPayAmount: (v: string) => void;
    payNotes: string;
    setPayNotes: (v: string) => void;
    payTransactionId: string;
    setPayTransactionId: (v: string) => void;
    payDate: string;
    setPayDate: (v: string) => void;
    payDueDate: string;
    setPayDueDate: (v: string) => void;
    payModeId: string;
    setPayModeId: (v: string) => void;

    // Optional receipt number and reason fields for student details
    payReceiptNumber?: string;
    setPayReceiptNumber?: (v: string) => void;
    payReason?: string;
    setPayReason?: (v: string) => void;

    // Optional label shown under the title to clarify payment purpose
    // e.g. "Monthly Rent — June 2025" or "Admission Fee"
    paymentPurpose?: string;

    payLoading: boolean;
    onConfirm: () => void;
    themeColor?: string;
}

// Icon helper based on payment mode name
function getModeIcon(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('upi')) return 'scan-outline';
    if (n.includes('card')) return 'card-outline';
    if (n.includes('bank')) return 'business-outline';
    if (n.includes('wallet')) return 'wallet-outline';
    if (n.includes('cheque') || n.includes('check')) return 'document-text-outline';
    return 'cash-outline';
}

export function PaymentDrawer({
    visible, onClose, selectedFee, paymentModes,
    payAmount, setPayAmount,
    payNotes, setPayNotes,
    payTransactionId, setPayTransactionId,
    payDate, setPayDate,
    payDueDate, setPayDueDate,
    payModeId, setPayModeId,
    payReceiptNumber, setPayReceiptNumber,
    payReason, setPayReason,
    paymentPurpose,
    payLoading, onConfirm,
    themeColor = '#7C3AED',
}: PaymentDrawerProps) {
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [isDueDatePickerVisible, setDueDatePickerVisibility] = useState(false);
    const { isDark } = useTheme();

    const handleConfirmDate = (d: Date) => {
        setPayDate(toLocalDateStr(d));
        setDatePickerVisibility(false);
    };
    const handleConfirmDueDate = (d: Date) => {
        setPayDueDate(toLocalDateStr(d));
        setDueDatePickerVisibility(false);
    };

    // Resolve student/payer name
    const sName = selectedFee?.name ||
        (selectedFee?.first_name
            ? `${selectedFee.first_name} ${selectedFee.last_name || ''}`.trim()
            : '');
    const rNum = selectedFee?.room || selectedFee?.room_number || '';

    // Resolve due amount for breakdown
    const rawDueAmt = selectedFee?.dueAmount ?? selectedFee?.balance ?? selectedFee?.total_due ?? selectedFee?.due ?? 0;
    const maxDue = parseFloat(rawDueAmt.toString()) || 0;
    const amount = parseFloat(payAmount || '0');
    const remainingBal = Math.max(0, maxDue - amount);
    const isExceeding = maxDue > 0 && amount > maxDue;

    const carryForward = parseFloat(selectedFee?.carryForward || selectedFee?.effectiveCarryForward || selectedFee?.carry_forward || 0);
    const monthlyRent = parseFloat(selectedFee?.monthlyRent || selectedFee?.monthly_rent || selectedFee?.fee_monthly_rent || 0);
    const paidAmount = parseFloat(selectedFee?.paidAmount || selectedFee?.paid_amount || selectedFee?.amount_paid || 0);

    const prevOverdue = Math.max(0, carryForward);
    const netCurrRent = monthlyRent > 0 ? Math.max(0, monthlyRent - paidAmount) : Math.max(0, maxDue - prevOverdue);
    const prevAllocated = Math.min(amount, prevOverdue);
    const prevPending = Math.max(0, prevOverdue - prevAllocated);
    const remAfterPrev = Math.max(0, amount - prevAllocated);
    const currAllocated = Math.min(remAfterPrev, netCurrRent);
    const currPending = Math.max(0, netCurrRent - currAllocated);

    const allocationBg = isDark ? '#1E293B' : '#F8FAFC';
    const allocationBorder = isExceeding ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0');

    return (
        <>
            {/* Full-screen loader — rendered outside the drawer Modal so it truly covers everything */}
            <FullScreenLoader visible={payLoading} />

            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <KeyboardAvoidingView
                    style={S.modalRoot}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                    <View style={[S.drawerContent, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
                        {/* Beautiful building watermark background */}
                        <CardWatermark opacity={0.06} color={themeColor} />

                        {/* Header */}
                        <View style={S.drawerHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[S.drawerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Collect Payment</Text>
                                {/* Who is paying */}
                                {sName ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                        <Ionicons name="person-circle-outline" size={14} color={themeColor} />
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: themeColor }}>
                                            {sName}{rNum ? ` · Room ${rNum}` : ''}
                                        </Text>
                                    </View>
                                ) : null}
                                {/* Purpose label */}
                                {paymentPurpose ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                        <Ionicons name="information-circle-outline" size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B' }}>
                                            {paymentPurpose}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            <TouchableOpacity
                                onPress={onClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X color="#64748B" size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Summary banner */}
                        <View style={[S.infoSummary, { backgroundColor: themeColor + '12' }]}>
                            <View>
                                <Text style={[S.summaryAmtLabel, { color: themeColor }]}>Total Due</Text>
                                {paymentPurpose ? (
                                    <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', marginTop: 1 }}>
                                        {paymentPurpose}
                                    </Text>
                                ) : null}
                            </View>
                            <Text style={[S.summaryAmt, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                                ₹{(() => {
                                    if (selectedFee) {
                                        const rawDue = selectedFee.dueAmount ?? selectedFee.balance ?? selectedFee.total_due ?? selectedFee.due;
                                        if (rawDue !== undefined && rawDue !== null) {
                                            return parseFloat(rawDue.toString()).toLocaleString('en-IN');
                                        }
                                    }
                                    return payAmount || '0';
                                })()}
                            </Text>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Amount Input */}
                            <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                                Amount (₹) <Text style={{ color: '#EF4444' }}>*</Text>
                            </Text>
                            <TextInput
                                style={[
                                    S.inputField,
                                    { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A' },
                                    isExceeding ? { borderColor: '#EF4444', borderWidth: 1.5 } : {}
                                ]}
                                keyboardType="numeric"
                                value={payAmount}
                                onChangeText={(text) => {
                                    const val = parseFloat(text || '0');
                                    if (maxDue > 0 && val > maxDue) {
                                        setPayAmount(maxDue.toString());
                                    } else {
                                        setPayAmount(text);
                                    }
                                }}
                                placeholder="Enter amount"
                                placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
                            />

                            {/* Dynamic Payment Breakdown (ALWAYS VISIBLE) */}
                            <View style={{ backgroundColor: allocationBg, padding: 12, borderRadius: 10, marginTop: 8, marginBottom: 14, borderWidth: 1, borderColor: allocationBorder }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#F8FAFC' : '#1F2937', marginBottom: 8 }}>
                                    💳 Payment Breakdown
                                    {sName ? ` · ${sName}` : ''}
                                </Text>

                                {prevOverdue > 0 && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <Text style={{ fontSize: 12, color: prevPending > 0 ? '#EF4444' : '#10B981', fontWeight: '700' }}>
                                            • Previous Overdue:
                                        </Text>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: prevPending > 0 ? '#EF4444' : '#10B981' }}>
                                            - ₹{prevAllocated.toLocaleString('en-IN')} {prevPending > 0 ? `(₹${prevPending.toLocaleString('en-IN')} pending)` : '(Cleared)'}
                                        </Text>
                                    </View>
                                )}

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <Text style={{ fontSize: 12, color: currPending > 0 ? '#D97706' : '#10B981', fontWeight: '700' }}>
                                        • {paymentPurpose || 'This Month Rent'}:
                                    </Text>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: currPending > 0 ? '#D97706' : '#10B981' }}>
                                        - ₹{currAllocated.toLocaleString('en-IN')} {currPending > 0 ? `(₹${currPending.toLocaleString('en-IN')} pending)` : '(Cleared)'}
                                    </Text>
                                </View>

                                <View style={{ borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#E2E8F0', marginTop: 6, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: themeColor }}>
                                        {amount > 0 ? 'Remaining After Payment:' : 'Total Due:'}
                                    </Text>
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: amount > 0 ? (remainingBal === 0 ? '#10B981' : '#EF4444') : '#EF4444' }}>
                                        {amount === 0
                                            ? `₹${maxDue.toLocaleString('en-IN')}`
                                            : (remainingBal === 0
                                                ? '₹0 (Fully Cleared)'
                                                : `₹${remainingBal.toLocaleString('en-IN')} (Partial)`)}
                                    </Text>
                                </View>

                                {isExceeding && (
                                    <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, padding: 8, borderRadius: 6, marginTop: 8 }}>
                                        <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>
                                            ⚠️ Cannot exceed total due of ₹{maxDue.toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Date row */}
                            <View style={S.row}>
                                <View style={{ flex: 1, marginRight: 6 }}>
                                    <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                                        Payment Date <Text style={{ color: '#EF4444' }}>*</Text>
                                    </Text>
                                    <TouchableOpacity
                                        style={[S.dateField, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                        onPress={() => setDatePickerVisibility(true)}
                                    >
                                        <Calendar size={14} color="#64748B" />
                                        <Text style={[S.dateTextLabel, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{payDate}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1, marginLeft: 6 }}>
                                    <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                                        Due Date <Text style={{ color: '#EF4444' }}>*</Text>
                                    </Text>
                                    <TouchableOpacity
                                        style={[S.dateField, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                        onPress={() => setDueDatePickerVisibility(true)}
                                    >
                                        <Calendar size={14} color="#64748B" />
                                        <Text style={[S.dateTextLabel, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{payDueDate}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* ── Payment Mode — Compact Scrollable Chips ── */}
                            <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Payment Method</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2 }}
                                keyboardShouldPersistTaps="handled"
                            >
                                {paymentModes.map((m: any) => {
                                    const mId = (m.payment_mode_id || m.id)?.toString();
                                    const mName = m.payment_mode_name || m.name || 'Cash';
                                    const active = payModeId === mId;
                                    const iconName = getModeIcon(mName);

                                    return (
                                        <TouchableOpacity
                                            key={mId}
                                            onPress={() => setPayModeId(mId)}
                                            activeOpacity={0.75}
                                            style={[
                                                S.modeChip,
                                                {
                                                    backgroundColor: active ? themeColor + '15' : (isDark ? '#1E293B' : '#F8FAFC'),
                                                    borderColor: active ? themeColor : (isDark ? '#334155' : '#E2E8F0'),
                                                    borderWidth: active ? 1.5 : 1,
                                                }
                                            ]}
                                        >
                                            <Ionicons name={iconName as any} size={16} color={active ? themeColor : (isDark ? '#94A3B8' : '#64748B')} />
                                            <Text style={[
                                                S.modeChipText,
                                                { color: active ? themeColor : (isDark ? '#CBD5E1' : '#475569'), fontWeight: active ? '800' : '600' }
                                            ]}>
                                                {mName}
                                            </Text>
                                            {active && (
                                                <View style={[S.modeChipDot, { backgroundColor: themeColor }]} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* Transaction ID */}
                            <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Transaction ID (Optional)</Text>
                            <TextInput
                                style={[S.inputField, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                                value={payTransactionId}
                                onChangeText={setPayTransactionId}
                                placeholder="e.g. UPI-123456"
                                placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
                            />

                            {/* Receipt Number */}
                            {setPayReceiptNumber !== undefined && (
                                <>
                                    <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Receipt Number (Optional)</Text>
                                    <TextInput
                                        style={[S.inputField, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                                        value={payReceiptNumber}
                                        onChangeText={setPayReceiptNumber}
                                        placeholder="e.g. REC-789"
                                        placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
                                    />
                                </>
                            )}

                            {/* Reason */}
                            {setPayReason !== undefined && (
                                <>
                                    <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Reason (Optional)</Text>
                                    <TextInput
                                        style={[S.inputField, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                                        value={payReason}
                                        onChangeText={setPayReason}
                                        placeholder="e.g. Monthly Rent, Security Deposit"
                                        placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
                                    />
                                </>
                            )}

                            {/* Notes */}
                            <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Notes</Text>
                            <TextInput
                                style={[S.inputField, { height: 64, textAlignVertical: 'top', backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                                value={payNotes}
                                onChangeText={setPayNotes}
                                multiline
                                placeholder="Any remarks..."
                                placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
                            />

                            <View style={{ height: 14 }} />

                            {/* Submit */}
                            <TouchableOpacity
                                style={[
                                    S.submitBtn,
                                    { backgroundColor: themeColor },
                                    payLoading && { opacity: 0.6 },
                                ]}
                                onPress={onConfirm}
                                disabled={payLoading}
                            >
                                {payLoading ? (
                                    <View style={S.submitLoadingRow}>
                                        <ActivityIndicator color="#FFF" size="small" />
                                        <Text style={S.submitBtnText}>Processing...</Text>
                                    </View>
                                ) : (
                                    <Text style={S.submitBtnText}>
                                        {sName ? `Collect from ${sName.split(' ')[0]}` : 'Proceed to Pay'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                            <View style={{ height: 100 }} />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>

                <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    onConfirm={handleConfirmDate}
                    onCancel={() => setDatePickerVisibility(false)}
                    date={new Date(payDate)}
                    maximumDate={new Date()}
                />
                <DateTimePickerModal
                    isVisible={isDueDatePickerVisible}
                    mode="date"
                    onConfirm={handleConfirmDueDate}
                    onCancel={() => setDueDatePickerVisibility(false)}
                    date={new Date(payDueDate)}
                />
            </Modal>
        </>
    );
}

const S = StyleSheet.create({
    modalRoot: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    drawerContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        width: '100%',
        maxHeight: '92%',
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        overflow: 'hidden',
    },
    drawerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        marginBottom: 4,
    },
    drawerTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    infoSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 8,
    },
    summaryAmtLabel: {
        fontSize: 14,
        fontWeight: '800',
    },
    summaryAmt: {
        fontSize: 22,
        fontWeight: '900',
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 14,
        marginBottom: 6,
    },
    inputField: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
    },
    row: { flexDirection: 'row', marginTop: 4 },
    dateField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    dateTextLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    // ── Chip styles (replaces old modeList/modeItem) ──────────────────────
    modeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 50,
        minWidth: 80,
    },
    modeChipText: {
        fontSize: 13,
    },
    modeChipDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 2,
    },
    submitBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    submitLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    submitBtnText: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
});
