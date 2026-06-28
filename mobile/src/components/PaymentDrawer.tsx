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
                            <Text style={S.drawerTitle}>Pay Due Amount</Text>
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
                            {/* Amount */}
                            <Text style={S.label}>Amount (₹) *</Text>
                            <TextInput
                                style={S.inputField}
                                keyboardType="numeric"
                                value={payAmount}
                                onChangeText={setPayAmount}
                                placeholder="Enter amount"
                                placeholderTextColor="#CBD5E1"
                            />

                            {/* Date row */}
                            <View style={S.row}>
                                <View style={{ flex: 1, marginRight: 6 }}>
                                    <Text style={S.label}>Payment Date *</Text>
                                    <TouchableOpacity
                                        style={S.dateField}
                                        onPress={() => setDatePickerVisibility(true)}
                                    >
                                        <Calendar size={14} color="#64748B" />
                                        <Text style={S.dateTextLabel}>{payDate}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1, marginLeft: 6 }}>
                                    <Text style={S.label}>Due Date *</Text>
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
                            <View style={{ height: 40 }} />
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
