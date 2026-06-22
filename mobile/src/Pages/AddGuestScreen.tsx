import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    KeyboardAvoidingView, Platform, Alert, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { InputField } from '../components/InputField';
import { Card } from '../components/Card';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function AddGuestScreen({ navigation }: any) {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [form, setForm] = useState({
        full_name: '',
        phone: '',
        check_in_date: todayStr(),
        days: '1',
        amount_paid: '',
        room_number: '',
        purpose: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const up = (k: string, v: string) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(prev => { const e = { ...prev }; delete e[k]; return e; });
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.full_name.trim()) e.full_name = 'Guest name is required';
        if (!form.check_in_date) e.check_in_date = 'Check-in date is required';
        if (form.phone && !/^\d{10}$/.test(form.phone)) e.phone = 'Phone must be 10 digits';
        if (form.amount_paid && (isNaN(Number(form.amount_paid)) || Number(form.amount_paid) < 0)) e.amount_paid = 'Enter a valid amount';
        if (form.days && (isNaN(Number(form.days)) || Number(form.days) < 1)) e.days = 'Days must be at least 1';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fix the highlighted fields.' });
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/guests', {
                full_name: form.full_name.trim(),
                phone: form.phone.trim() || null,
                check_in_date: form.check_in_date,
                days: form.days ? parseInt(form.days) : 1,
                amount_paid: form.amount_paid ? parseFloat(form.amount_paid) : 0,
                room_number: form.room_number.trim() || null,
                purpose: form.purpose.trim() || null,
            });
            if (res.data?.success) {
                Toast.show({ type: 'success', text1: 'Saved', text2: 'Guest recorded successfully!' });
                navigation.goBack();
            }
        } catch (error: any) {
            Alert.alert('Save Failed', error.response?.data?.error || 'Failed to save guest. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <AppHeader title="Add Guest" showBack />

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={[styles.scroll, { paddingBottom: isKeyboardVisible ? 200 : 40 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Card style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <InputField
                        label="Guest Name *"
                        placeholder="e.g. Ramesh"
                        value={form.full_name}
                        error={errors.full_name}
                        onChangeText={(t) => up('full_name', t)}
                    />
                    <InputField
                        label="Phone"
                        placeholder="10-digit mobile"
                        keyboardType="numeric"
                        maxLength={10}
                        value={form.phone}
                        error={errors.phone}
                        onChangeText={(t) => up('phone', t.replace(/[^0-9]/g, ''))}
                    />

                    {/* Check-in date */}
                    <Text style={[styles.label, { color: theme.textPrimary }]}>Check-in Date *</Text>
                    <TouchableOpacity
                        style={[styles.dateBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: errors.check_in_date ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0') }]}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                        <Text style={[styles.dateText, { color: theme.textPrimary }]}>{form.check_in_date}</Text>
                    </TouchableOpacity>
                    {errors.check_in_date ? <Text style={styles.err}>{errors.check_in_date}</Text> : null}

                    <View style={styles.row}>
                        <InputField
                            label="Days"
                            placeholder="1"
                            keyboardType="numeric"
                            value={form.days}
                            error={errors.days}
                            containerStyle={{ flex: 1, marginRight: 8 }}
                            onChangeText={(t) => up('days', t.replace(/[^0-9]/g, ''))}
                        />
                        <InputField
                            label="Amount Paid (₹)"
                            placeholder="e.g. 500"
                            keyboardType="numeric"
                            value={form.amount_paid}
                            error={errors.amount_paid}
                            containerStyle={{ flex: 1, marginLeft: 8 }}
                            onChangeText={(t) => up('amount_paid', t.replace(/[^0-9.]/g, ''))}
                        />
                    </View>

                    <InputField
                        label="Room Number"
                        placeholder="e.g. 204 (optional)"
                        value={form.room_number}
                        onChangeText={(t) => up('room_number', t)}
                        onFocus={() => {
                            setTimeout(() => {
                                scrollViewRef.current?.scrollToEnd({ animated: true });
                            }, 200);
                        }}
                    />
                    <InputField
                        label="Purpose / Notes"
                        placeholder="e.g. Relative of tenant, 1 night stay"
                        value={form.purpose}
                        onChangeText={(t) => up('purpose', t)}
                        onFocus={() => {
                            setTimeout(() => {
                                scrollViewRef.current?.scrollToEnd({ animated: true });
                            }, 200);
                        }}
                    />

                    {/* Inline scroll footer (only shown when keyboard is open) */}
                    {isKeyboardVisible && (
                        <View style={[styles.scrollFooter, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: theme.primary, width: '100%' }, loading && { opacity: 0.7 }]}
                                onPress={handleSave}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save Guest'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Card>
            </ScrollView>

            {/* Sticky Footer (only shown when keyboard is hidden) */}
            {!isKeyboardVisible && (
                <View style={[styles.footer, { backgroundColor: theme.cardBg, borderTopColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save Guest'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                onConfirm={(d) => { up('check_in_date', d.toISOString().split('T')[0]); setShowDatePicker(false); }}
                onCancel={() => setShowDatePicker(false)}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 16, paddingBottom: 40 },
    card: { padding: 20, borderRadius: 24, borderWidth: 1 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    dateBtn: {
        height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4,
    },
    dateText: { fontSize: 16, fontWeight: '500' },
    err: { color: '#EF4444', fontSize: 11, marginBottom: 12, marginLeft: 4 },
    row: { flexDirection: 'row', marginTop: 16 },
    footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
    saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    saveText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
    scrollFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        marginTop: 16,
    },
});
