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

import React, { useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    TextInput, ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { X, Calendar } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { toLocalDateStr } from '../utils/dateUtils';

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
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [isDueDatePickerVisible, setDueDatePickerVisibility] = useState(false);

    React.useEffect(() => {
        Animated.timing(backdropOpacity, {
            toValue: visible ? 1 : 0,
            duration: visible ? 220 : 160,
            delay: visible ? 80 : 0,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    const handleConfirmDate = (d: Date) => {
        setPayDate(toLocalDateStr(d));
        setDatePickerVisibility(false);
    };
    const handleConfirmDueDate = (d: Date) => {
        setPayDueDate(toLocalDateStr(d));
        setDueDatePickerVisibility(false);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={S.modalRoot}>
                <Animated.View style={[S.modalBackdrop, { opacity: backdropOpacity }]} />
                <View style={S.modalOverlay}>
                    <View style={S.drawerContent}>

                        {/* Header */}
                        <View style={S.drawerHeader}>
                            <Text style={S.drawerTitle}>Record Payment</Text>
                            <TouchableOpacity
                                onPress={onClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X color="#64748B" size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Summary banner */}
                        {selectedFee && (
                            <View style={S.infoSummary}>
                                <View>
                                    <Text style={S.summaryName}>
                                        {selectedFee.full_name || `${selectedFee.first_name || ''} ${selectedFee.last_name || ''}`.trim() || 'Tenant'}
                                    </Text>
                                    <Text style={S.summaryRoom}>Room {selectedFee.room_number || selectedFee.room || 'N/A'}</Text>
                                </View>
                                <View style={[S.summaryAmtBox, { backgroundColor: themeColor + '15' }]}>
                                    <Text style={S.summaryAmtLabel}>DUE</Text>
                                    <Text style={[S.summaryAmt, { color: themeColor }]}>
                                        ₹{(() => {
                                            const rawDue = selectedFee.dueAmount ?? selectedFee.balance ?? selectedFee.total_due ?? selectedFee.due;
                                            if (rawDue !== undefined && rawDue !== null) {
                                                return parseFloat(rawDue.toString()).toLocaleString('en-IN');
                                            }
                                            return payAmount || '0';
                                        })()}
                                    </Text>
                                </View>
                            </View>
                        )}

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
                            <Text style={S.label}>Payment Mode</Text>
                            <View style={S.modeRow}>
                                {paymentModes.map((m: any) => {
                                    const mId = (m.payment_mode_id || m.id)?.toString();
                                    const mName = m.payment_mode_name || m.name || 'Cash';
                                    const active = payModeId === mId;
                                    return (
                                        <TouchableOpacity
                                            key={mId}
                                            style={[
                                                S.modeChip,
                                                active && { backgroundColor: themeColor, borderColor: themeColor },
                                            ]}
                                            onPress={() => setPayModeId(mId)}
                                        >
                                            <Text style={[S.modeText, active && { color: '#FFF' }]}>
                                                {mName}
                                            </Text>
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
                                    <Text style={S.submitBtnText}>CONFIRM PAYMENT</Text>
                                )}
                            </TouchableOpacity>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </View>

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
    );
}

const S = StyleSheet.create({
    modalRoot: { flex: 1 },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    drawerContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        width: '100%',
        maxHeight: '85%',
        paddingHorizontal: 20,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
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
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
    },
    infoSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    summaryName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    summaryRoom: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    summaryAmtBox: {
        alignItems: 'flex-end',
        backgroundColor: '#F0F9FF',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    summaryAmtLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    summaryAmt: {
        fontSize: 18,
        fontWeight: '900',
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
    dateTextLabel: { fontSize: 13, color: '#334155', fontWeight: '600' },
    modeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    modeChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    modeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
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
