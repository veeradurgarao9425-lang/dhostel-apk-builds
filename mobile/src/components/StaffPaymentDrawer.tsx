/**
 * StaffPaymentDrawer.tsx — Shared payment collection bottom-sheet drawer for Staff.
 * Designed to exactly match the UI structure and styling of PaymentDrawer.tsx.
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

export interface StaffPaymentDrawerProps {
    visible: boolean;
    onClose: () => void;
    staffName: string;

    payAmount: string;
    setPayAmount: (v: string) => void;
    payDays: string;
    setPayDays: (v: string) => void;
    payNotes: string;
    setPayNotes: (v: string) => void;
    payTransactionId: string;
    setPayTransactionId: (v: string) => void;
    payReceiptNumber: string;
    setPayReceiptNumber: (v: string) => void;
    payDate: string;
    setPayDate: (v: string) => void;
    payMode: string;
    setPayMode: (v: string) => void;

    payLoading: boolean;
    onConfirm: () => void;
    themeColor?: string;
    errors?: Record<string, string>;
}

export function StaffPaymentDrawer({
    visible, onClose, staffName,
    payAmount, setPayAmount,
    payDays, setPayDays,
    payNotes, setPayNotes,
    payTransactionId, setPayTransactionId,
    payReceiptNumber, setPayReceiptNumber,
    payDate, setPayDate,
    payMode, setPayMode,
    payLoading, onConfirm,
    themeColor = '#7C3AED',
    errors = {},
}: StaffPaymentDrawerProps) {
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const { isDark } = useTheme();

    const handleConfirmDate = (d: Date) => {
        setPayDate(toLocalDateStr(d));
        setDatePickerVisibility(false);
    };

    const paymentModes = ['Cash', 'UPI', 'Bank'];

    return (
        <>
            {/* Full-screen loader rendered outside Modal */}
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
                            <Text style={S.drawerTitle}>Record Wage Payment</Text>
                            <TouchableOpacity
                                onPress={onClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X color="#64748B" size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Summary banner */}
                        <View style={[S.infoSummary, { backgroundColor: themeColor + '10' }]}>
                            <Text style={[S.summaryAmtLabel, { color: themeColor }]}>Paying to {staffName}</Text>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Amount */}
                            <Text style={S.label}>Amount (₹) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                            <TextInput
                                style={[S.inputField, errors.amount && { borderColor: '#EF4444', borderWidth: 1.5, backgroundColor: '#FEF2F2' }]}
                                keyboardType="numeric"
                                value={payAmount}
                                onChangeText={(t) => setPayAmount(t.replace(/[^0-9.]/g, ''))}
                                placeholder="Enter amount"
                                placeholderTextColor="#CBD5E1"
                            />
                            {errors.amount && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: -2, marginBottom: 8, fontWeight: '500' }}>{errors.amount}</Text>}

                            {/* Date and Days Row */}
                            <View style={S.row}>
                                <View style={{ flex: 1, marginRight: 6 }}>
                                    <Text style={S.label}>Payment Date <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TouchableOpacity
                                        style={[S.dateField, errors.date && { borderColor: '#EF4444', borderWidth: 1.5, backgroundColor: '#FEF2F2' }]}
                                        onPress={() => setDatePickerVisibility(true)}
                                    >
                                        <Calendar size={14} color="#64748B" />
                                        <Text style={S.dateTextLabel}>{payDate}</Text>
                                    </TouchableOpacity>
                                    {errors.date && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: -2, marginBottom: 8, fontWeight: '500' }}>{errors.date}</Text>}
                                </View>
                                <View style={{ flex: 1, marginLeft: 6 }}>
                                    <Text style={S.label}>Days Worked</Text>
                                    <TextInput
                                        style={S.inputField}
                                        keyboardType="numeric"
                                        value={payDays}
                                        onChangeText={(t) => setPayDays(t.replace(/[^0-9]/g, ''))}
                                        placeholder="Optional"
                                        placeholderTextColor="#CBD5E1"
                                    />
                                </View>
                            </View>

                            {/* Payment Mode */}
                            <Text style={S.label}>Payment Method</Text>
                            <View style={S.modeList}>
                                {paymentModes.map((mName: string, index: number) => {
                                    const active = payMode === mName;

                                    // Determine icon based on name
                                    let iconName = 'cash-outline';
                                    const nLower = mName.toLowerCase();
                                    if (nLower.includes('upi')) iconName = 'scan-outline';
                                    else if (nLower.includes('bank')) iconName = 'business-outline';

                                    return (
                                        <TouchableOpacity
                                            key={mName}
                                            style={[
                                                S.modeItem,
                                                index !== paymentModes.length - 1 && S.modeItemBorder
                                            ]}
                                            onPress={() => setPayMode(mName)}
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
                            <Text style={S.label}>Receipt Number (Optional)</Text>
                            <TextInput
                                style={S.inputField}
                                value={payReceiptNumber}
                                onChangeText={setPayReceiptNumber}
                                placeholder="e.g. REC-789"
                                placeholderTextColor="#CBD5E1"
                            />

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
                    date={payDate ? new Date(payDate) : new Date()}
                    maximumDate={new Date()}
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
        fontSize: 14,
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
