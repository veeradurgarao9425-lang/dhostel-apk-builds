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

    const paymentModes = [
        { id: 'Cash', label: 'Cash', icon: 'cash-outline', iconFamily: 'ionicons' },
        { id: 'UPI', label: 'UPI / QR', icon: 'scan-outline', iconFamily: 'ionicons' },
        { id: 'Bank', label: 'Bank Transfer', icon: 'business-outline', iconFamily: 'ionicons' },
        { id: 'Cheque', label: 'Cheque', icon: 'document-text-outline', iconFamily: 'ionicons' },
        { id: 'Card', label: 'Card', icon: 'card-outline', iconFamily: 'ionicons' },
    ];

    return (
        <>
            {/* Full-screen loader rendered outside Modal */}
            <FullScreenLoader visible={payLoading} />

            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <KeyboardAvoidingView
                    style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                    <View style={[S.drawerContent, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
                        {/* Header */}
                        <View style={S.drawerHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[S.drawerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Record Wage Payment</Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: themeColor, marginTop: 3 }}>
                                    👤 {staffName}
                                </Text>
                                <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                                    Staff Salary & Advance Payment
                                </Text>
                            </View>
                            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <X color="#64748B" size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Banner */}
                        <View style={[S.infoSummary, { backgroundColor: themeColor + '12' }]}>
                            <View>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: themeColor }}>Amount to Pay</Text>
                                <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B' }}>Enter amount given</Text>
                            </View>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: isDark ? '#F8FAFC' : '#0F172A' }}>
                                ₹{payAmount ? Number(payAmount).toLocaleString('en-IN') : '0'}
                            </Text>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: 350 }}
                        >
                            {/* Amount */}
                            <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Amount (₹) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                            <TextInput
                                style={[
                                    S.inputField,
                                    { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A' },
                                    errors.amount && { borderColor: '#EF4444', borderWidth: 1.5, backgroundColor: isDark ? '#3B1A1A' : '#FEF2F2' }
                                ]}
                                keyboardType="numeric"
                                value={payAmount}
                                onChangeText={(t) => setPayAmount(t.replace(/[^0-9.]/g, ''))}
                                placeholder="e.g. 5000"
                                placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
                            />
                            {errors.amount && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginBottom: 4, fontWeight: '600' }}>{errors.amount}</Text>}

                            {/* Payment Mode Scroll */}
                            <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Payment Method</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2, marginBottom: 8 }}
                                keyboardShouldPersistTaps="handled"
                            >
                                {paymentModes.map((item) => {
                                    const active = payMode === item.id;
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                S.modeChip,
                                                {
                                                    backgroundColor: active ? themeColor + '15' : (isDark ? '#1E293B' : '#F8FAFC'),
                                                    borderColor: active ? themeColor : (isDark ? '#334155' : '#E2E8F0'),
                                                    borderWidth: active ? 1.5 : 1,
                                                }
                                            ]}
                                            onPress={() => setPayMode(item.id)}
                                            activeOpacity={0.75}
                                        >
                                            <Ionicons
                                                name={item.icon as any}
                                                size={15}
                                                color={active ? themeColor : (isDark ? '#94A3B8' : '#64748B')}
                                            />
                                            <Text style={[
                                                S.modeChipText,
                                                {
                                                    color: active ? themeColor : (isDark ? '#CBD5E1' : '#475569'),
                                                    fontWeight: active ? '800' : '600'
                                                }
                                            ]}>
                                                {item.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* Date and Days Row */}
                            <View style={S.row}>
                                <View style={{ flex: 1, marginRight: 6 }}>
                                    <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Payment Date <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TouchableOpacity
                                        style={[
                                            S.dateField,
                                            { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                                            errors.date && { borderColor: '#EF4444', borderWidth: 1.5, backgroundColor: isDark ? '#3B1A1A' : '#FEF2F2' }
                                        ]}
                                        onPress={() => setDatePickerVisibility(true)}
                                    >
                                        <Calendar size={14} color="#64748B" />
                                        <Text style={[S.dateTextLabel, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{payDate}</Text>
                                    </TouchableOpacity>
                                    {errors.date && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginBottom: 4, fontWeight: '600' }}>{errors.date}</Text>}
                                </View>
                                <View style={{ flex: 1, marginLeft: 6 }}>
                                    <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Days Worked</Text>
                                    <TextInput
                                        style={[S.inputField, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                                        keyboardType="numeric"
                                        value={payDays}
                                        onChangeText={(t) => setPayDays(t.replace(/[^0-9]/g, ''))}
                                        placeholder="e.g. 30"
                                        placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
                                    />
                                </View>
                            </View>

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
                            <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Receipt Number (Optional)</Text>
                            <TextInput
                                style={[S.inputField, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                                value={payReceiptNumber}
                                onChangeText={setPayReceiptNumber}
                                placeholder="e.g. REC-789"
                                placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
                            />

                            {/* Notes */}
                            <Text style={[S.label, { color: isDark ? '#CBD5E1' : '#475569' }]}>Notes / Reason (Optional)</Text>
                            <TextInput
                                style={[S.inputField, { height: 75, textAlignVertical: 'top', backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#0F172A' }]}
                                value={payNotes}
                                onChangeText={setPayNotes}
                                multiline
                                placeholder="Any remarks or advance reason..."
                                placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
                            />

                            <View style={{ height: 16 }} />

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
                                    <Text style={S.submitBtnText}>Record Payment for {staffName}</Text>
                                )}
                            </TouchableOpacity>

                            <View style={{ height: 180 }} />
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
    modeScrollContainer: {
        gap: 8,
        paddingVertical: 4,
        paddingHorizontal: 2,
        marginBottom: 8,
    },
    modeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
    },
    modeChipText: {
        fontSize: 13,
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
