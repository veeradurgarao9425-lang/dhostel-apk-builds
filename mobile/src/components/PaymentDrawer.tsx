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
    TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, ImageBackground
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

    payLoading: boolean;
    onConfirm: () => void;
    themeColor?: string;
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
                    <View style={S.drawerContent}>
                        {/* Beautiful building watermark background */}
                        <CardWatermark opacity={0.06} color={themeColor} />

                        {/* Header */}
                        <View style={S.drawerHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={S.drawerTitle}>Collect Payment</Text>
                                {(() => {
                                    const sName = selectedFee?.name || (selectedFee?.first_name ? `${selectedFee.first_name} ${selectedFee.last_name || ''}`.trim() : '');
                                    const rNum = selectedFee?.room || selectedFee?.room_number || '';
                                    if (!sName) return null;
                                    return (
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: themeColor, marginTop: 2 }}>
                                            👤 {sName} {rNum ? `(Room ${rNum})` : ''}
                                        </Text>
                                    );
                                })()}
                            </View>
                            <TouchableOpacity
                                onPress={onClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X color="#64748B" size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Summary banner */}
                        <View style={[S.infoSummary, { backgroundColor: themeColor + '10' }]}>
                            <Text style={[S.summaryAmtLabel, { color: themeColor }]}>Total Due</Text>
                            <Text style={S.summaryAmt}>
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
                            {/* Amount Input with restriction warning */}
                            <Text style={S.label}>Amount (₹) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                            <TextInput
                                style={[
                                    S.inputField,
                                    (() => {
                                        const rawDue = selectedFee?.dueAmount ?? selectedFee?.balance ?? selectedFee?.total_due ?? selectedFee?.due ?? 0;
                                        const maxDue = parseFloat(rawDue.toString()) || 0;
                                        const amt = parseFloat(payAmount || '0');
                                        return maxDue > 0 && amt > maxDue ? { borderColor: '#EF4444', borderWidth: 1.5 } : {};
                                    })()
                                ]}
                                keyboardType="numeric"
                                value={payAmount}
                                onChangeText={(text) => {
                                    const rawDue = selectedFee?.dueAmount ?? selectedFee?.balance ?? selectedFee?.total_due ?? selectedFee?.due ?? 0;
                                    const maxDue = parseFloat(rawDue.toString()) || 0;
                                    const val = parseFloat(text || '0');
                                    // If text exceeds maxDue, cap or allow with warning
                                    if (maxDue > 0 && val > maxDue) {
                                        setPayAmount(maxDue.toString());
                                    } else {
                                        setPayAmount(text);
                                    }
                                }}
                                placeholder="Enter amount"
                                placeholderTextColor="#CBD5E1"
                            />

                            {/* Dynamic Payment Breakdown & Allocation (ALWAYS VISIBLE!) */}
                            {(() => {
                                const rawDueAmt = selectedFee?.dueAmount ?? selectedFee?.balance ?? selectedFee?.total_due ?? selectedFee?.due ?? 0;
                                const maxDue = parseFloat(rawDueAmt.toString()) || 0;
                                const amount = parseFloat(payAmount || '0');

                                const carryForward = parseFloat(selectedFee?.carryForward || selectedFee?.effectiveCarryForward || selectedFee?.carry_forward || 0);
                                const monthlyRent = parseFloat(selectedFee?.monthlyRent || selectedFee?.monthly_rent || selectedFee?.fee_monthly_rent || 0);
                                const paidAmount = parseFloat(selectedFee?.paidAmount || selectedFee?.paid_amount || selectedFee?.amount_paid || 0);

                                const prevOverdue = Math.max(0, carryForward);
                                // Net current month rent remaining before this collection transaction:
                                const netCurrRent = monthlyRent > 0 ? Math.max(0, monthlyRent - paidAmount) : Math.max(0, maxDue - prevOverdue);

                                // Allocation calculation
                                const prevAllocated = Math.min(amount, prevOverdue);
                                const prevPending = Math.max(0, prevOverdue - prevAllocated);

                                const remAfterPrev = Math.max(0, amount - prevAllocated);
                                const currAllocated = Math.min(remAfterPrev, netCurrRent);
                                const currPending = Math.max(0, netCurrRent - currAllocated);

                                const remainingBal = Math.max(0, maxDue - amount);
                                const isExceeding = maxDue > 0 && amount > maxDue;

                                const allocationBg = isDark ? '#1E293B' : '#F8FAFC';
                                const allocationBorder = isExceeding ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0');

                                return (
                                    <View style={{ backgroundColor: allocationBg, padding: 12, borderRadius: 10, marginTop: 8, marginBottom: 14, borderWidth: 1, borderColor: allocationBorder }}>
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#F8FAFC' : '#1F2937', marginBottom: 8 }}>
                                            💳 Payment Breakdown & Allocation
                                        </Text>

                                        {prevOverdue > 0 && (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                                <Text style={{ fontSize: 12, color: prevPending > 0 ? '#EF4444' : '#10B981', fontWeight: '700' }}>
                                                    • Previous Overdue (Past Rent):
                                                </Text>
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: prevPending > 0 ? '#EF4444' : '#10B981' }}>
                                                    - ₹{prevAllocated.toLocaleString('en-IN')} {prevPending > 0 ? `(₹${prevPending.toLocaleString('en-IN')} pending)` : '(Cleared)'}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <Text style={{ fontSize: 12, color: currPending > 0 ? '#D97706' : '#10B981', fontWeight: '700' }}>
                                                • This Month Rent:
                                            </Text>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: currPending > 0 ? '#D97706' : '#10B981' }}>
                                                - ₹{currAllocated.toLocaleString('en-IN')} {currPending > 0 ? `(₹${currPending.toLocaleString('en-IN')} pending)` : '(Cleared)'}
                                            </Text>
                                        </View>

                                        <View style={{ borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#E2E8F0', marginTop: 6, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                                             <Text style={{ fontSize: 13, fontWeight: '800', color: themeColor }}>
                                                 {amount > 0 ? 'Remaining Balance After Payment:' : 'Total Amount Due:'}
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
                                                    ⚠️ Cannot enter more than total due of ₹{maxDue.toLocaleString('en-IN')}!
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })()}

                            {/* Date row */}

                            <View style={S.row}>
                                <View style={{ flex: 1, marginRight: 6 }}>
                                    <Text style={S.label}>Payment Date <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TouchableOpacity
                                        style={S.dateField}
                                        onPress={() => setDatePickerVisibility(true)}
                                    >
                                        <Calendar size={14} color="#64748B" />
                                        <Text style={S.dateTextLabel}>{payDate}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1, marginLeft: 6 }}>
                                    <Text style={S.label}>Due Date <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TouchableOpacity
                                        style={S.dateField}
                                        onPress={() => setDueDatePickerVisibility(true)}
                                    >
                                        <Calendar size={14} color="#64748B" />
                                        <Text style={S.dateTextLabel}>{payDueDate}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Payment Mode */}
                            <Text style={S.label}>Payment Method</Text>
                            <View style={S.modeList}>
                                {paymentModes.map((m: any, index: number) => {
                                    const mId = (m.payment_mode_id || m.id)?.toString();
                                    const mName = m.payment_mode_name || m.name || 'Cash';
                                    const active = payModeId === mId;

                                    // Determine icon based on name
                                    let iconName = 'cash-outline';
                                    const nLower = mName.toLowerCase();
                                    if (nLower.includes('upi')) iconName = 'scan-outline';
                                    else if (nLower.includes('card')) iconName = 'card-outline';
                                    else if (nLower.includes('bank')) iconName = 'business-outline';
                                    else if (nLower.includes('wallet')) iconName = 'wallet-outline';

                                    return (
                                        <TouchableOpacity
                                            key={mId}
                                            style={[
                                                S.modeItem,
                                                index !== paymentModes.length - 1 && S.modeItemBorder
                                            ]}
                                            onPress={() => setPayModeId(mId)}
                                        >
                                            <View style={S.modeLeft}>
                                                <Ionicons name={iconName as any} size={20} color="#64748B" />
                                                <Text style={S.modeItemText}>{mName}</Text>
                                            </View>
                                            <View style={[S.radioCircle, active && { borderColor: themeColor }]}>
                                                {active && <View style={[S.radioInner, { backgroundColor: themeColor }]} />}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Transaction ID */}
                            <Text style={S.label}>Transaction ID (Optional)</Text>
                            <TextInput
                                style={S.inputField}
                                value={payTransactionId}
                                onChangeText={setPayTransactionId}
                                placeholder="e.g. UPI-123456"
                                placeholderTextColor="#CBD5E1"
                            />

                            {/* Receipt Number */}
                            {setPayReceiptNumber !== undefined && (
                                <>
                                    <Text style={S.label}>Receipt Number (Optional)</Text>
                                    <TextInput
                                        style={S.inputField}
                                        value={payReceiptNumber}
                                        onChangeText={setPayReceiptNumber}
                                        placeholder="e.g. REC-789"
                                        placeholderTextColor="#CBD5E1"
                                    />
                                </>
                            )}

                            {/* Reason */}
                            {setPayReason !== undefined && (
                                <>
                                    <Text style={S.label}>Reason (Optional)</Text>
                                    <TextInput
                                        style={S.inputField}
                                        value={payReason}
                                        onChangeText={setPayReason}
                                        placeholder="e.g. Monthly Rent, Security Deposit"
                                        placeholderTextColor="#CBD5E1"
                                    />
                                </>
                            )}

                            {/* Notes */}
                            <Text style={S.label}>Notes</Text>
                            <TextInput
                                style={[S.inputField, { height: 64, textAlignVertical: 'top' }]}
                                value={payNotes}
                                onChangeText={setPayNotes}
                                multiline
                                placeholder="Any remarks..."
                                placeholderTextColor="#CBD5E1"
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
                                    <Text style={S.submitBtnText}>Proceed to Pay</Text>
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
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        width: '100%',
        maxHeight: '90%',
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
        color: '#0F172A',
    },
    infoSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 8,
    },
    summaryAmtLabel: {
        fontSize: 15,
        fontWeight: '800',
    },
    summaryAmt: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0F172A',
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        marginTop: 14,
        marginBottom: 6,
    },
    inputField: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#0F172A',
    },
    row: { flexDirection: 'row', marginTop: 4 },
    dateField: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    dateTextLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
    },
    modeList: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        overflow: 'hidden',
    },
    modeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    modeItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modeItemText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
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
