import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    KeyboardAvoidingView, Platform, Alert, Keyboard, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { InputField } from '../components/InputField';
import { Card } from '../components/Card';
import { FullScreenLoader } from '../components/FullScreenLoader';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { toLocalDateStr } from '../utils/dateUtils';

const todayStr = () => toLocalDateStr(new Date());

export default function AddGuestScreen({ navigation }: any) {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [form, setForm] = useState({
        full_name: '',
        phone: '',
        email: '',
        id_proof_type_id: '',
        id_proof_number: '',
        check_in_date: todayStr(),
        days: '1',
        per_day_amount: '',
        amount_paid: '',
        room_number: '',
        purpose: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const [idProofTypes, setIdProofTypes] = useState<any[]>([]);
    const [proofModalVisible, setProofModalVisible] = useState(false);

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

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const res = await api.get('/id-proof-types');
                if (res.data.success) {
                    setIdProofTypes(res.data.data);
                }
            } catch (e) {
                console.error('Error fetching proof types:', e);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (isKeyboardVisible) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 150);
        }
    }, [isKeyboardVisible]);

    const up = (k: string, v: string) => {
        setForm(p => {
            const next = { ...p, [k]: v };
            // Auto-calculate amount_paid
            if (k === 'days' || k === 'per_day_amount') {
                const d = parseInt(next.days) || 0;
                const pda = parseFloat(next.per_day_amount) || 0;
                if (d > 0 && pda > 0) {
                    next.amount_paid = (d * pda).toString();
                } else if (k === 'per_day_amount' && !v) {
                    next.amount_paid = '';
                }
            }
            return next;
        });
        if (errors[k]) setErrors(prev => { const e = { ...prev }; delete e[k]; return e; });
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.full_name.trim()) e.full_name = 'Guest name is required';
        if (!form.check_in_date) e.check_in_date = 'Check-in date is required';
        if (!form.phone.trim()) {
            e.phone = 'Mobile number is required';
        } else if (!/^\d{10}$/.test(form.phone)) {
            e.phone = 'Phone must be exactly 10 digits';
        }
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            e.email = 'Invalid email format';
        }
        if (form.id_proof_type_id) {
            if (!form.id_proof_number.trim()) {
                e.id_proof_number = 'ID Proof number is required';
            } else {
                const typeName = idProofTypes.find(t => t.id.toString() === form.id_proof_type_id)?.name || '';
                if (typeName.toLowerCase().includes('aadhar') || typeName.toLowerCase().includes('aadhaar')) {
                    if (form.id_proof_number.length !== 12) e.id_proof_number = 'Aadhaar must be exactly 12 digits';
                    else if (!/^\d{12}$/.test(form.id_proof_number)) e.id_proof_number = 'Aadhaar must be numeric';
                } else if (typeName.toLowerCase().includes('pan')) {
                    if (form.id_proof_number.length !== 10) e.id_proof_number = 'PAN must be exactly 10 characters';
                    else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(form.id_proof_number)) e.id_proof_number = 'Invalid PAN format. Must be like ABCDE1234F';
                }
            }
        }
        if (!form.room_number.trim()) e.room_number = 'Room number is required';
        if (form.amount_paid && (isNaN(Number(form.amount_paid)) || Number(form.amount_paid) < 0)) e.amount_paid = 'Enter a valid amount';
        if (form.days && (isNaN(Number(form.days)) || Number(form.days) < 1)) e.days = 'Days must be at least 1';
        setErrors(e);
        return e;
    };

    const checkUnique = async (field: 'phone' | 'email' | 'id_proof_number', value: string) => {
        if (!value || !value.trim()) return;
        
        if (field === 'phone' && !/^\d{10}$/.test(value.trim())) return;
        if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return;
        if (field === 'id_proof_number' && form.id_proof_type_id) {
            const typeName = idProofTypes.find(t => t.id.toString() === form.id_proof_type_id)?.name || '';
            if ((typeName.toLowerCase().includes('aadhar') || typeName.toLowerCase().includes('aadhaar')) && value.trim().length !== 12) return;
            if (typeName.toLowerCase().includes('pan') && value.trim().length !== 10) return;
        }

        try {
            const res = await api.get('/guests/check-unique', {
                params: {
                    ...(field === 'phone' ? { phone: value.trim() } : {}),
                    ...(field === 'email' ? { email: value.trim() } : {}),
                    ...(field === 'id_proof_number' ? { id_proof_number: value.trim() } : {}),
                }
            });
            if (res.data?.success) {
                if (field === 'phone' && res.data.phoneExists) {
                    setErrors(prev => ({ ...prev, phone: 'This phone number is already registered' }));
                }
                if (field === 'email' && res.data.emailExists) {
                    setErrors(prev => ({ ...prev, email: 'This email is already registered' }));
                }
                if (field === 'id_proof_number' && res.data.idProofExists) {
                    setErrors(prev => ({ ...prev, id_proof_number: 'This ID proof number is already registered' }));
                }
            }
        } catch (e) {
            console.log('Guest check unique error', e);
        }
    };

    const handleSave = async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            const missing = Object.keys(validationErrors).map((key) => {
                const labels: Record<string, string> = {
                    full_name: 'Guest name',
                    check_in_date: 'Check-in date',
                    phone: 'Mobile number',
                    email: 'Email address',
                    id_proof_number: 'ID proof number',
                    room_number: 'Room number',
                    amount_paid: 'Amount paid',
                    days: 'Days',
                };
                return labels[key] || key;
            }).join(', ');
            Toast.show({ type: 'error', text1: 'Validation Error', text2: `Please complete: ${missing}` });
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/guests', {
                full_name: form.full_name.trim(),
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                id_proof_type_id: form.id_proof_type_id || null,
                id_proof_number: form.id_proof_number.trim() || null,
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

    const handleReset = () => {
        setForm({
            full_name: '',
            phone: '',
            email: '',
            id_proof_type_id: '',
            id_proof_number: '',
            check_in_date: todayStr(),
            days: '1',
            per_day_amount: '',
            amount_paid: '',
            room_number: '',
            purpose: '',
        });
        setErrors({});
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            <AppHeader title="Add Guest" showBack />
            <FullScreenLoader visible={loading} />

            <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={[styles.scroll, { paddingBottom: (isKeyboardVisible ? 220 : 100) + insets.bottom }]}
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
                        label="Phone *"
                        placeholder="10-digit mobile"
                        keyboardType="numeric"
                        maxLength={10}
                        value={form.phone}
                        error={errors.phone}
                        onChangeText={(t) => up('phone', t.replace(/[^0-9]/g, ''))}
                        onBlur={() => checkUnique('phone', form.phone)}
                    />
                    <InputField
                        label="Email Address"
                        placeholder="e.g. guest@example.com"
                        keyboardType="email-address"
                        value={form.email}
                        error={errors.email}
                        onChangeText={(t) => up('email', t)}
                        onBlur={() => checkUnique('email', form.email)}
                    />

                    {/* ID Proof Selector */}
                    <Text style={[styles.label, { color: theme.textPrimary }]}>ID Proof Type</Text>
                    <TouchableOpacity
                        style={[styles.dateBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: errors.id_proof_type_id ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0') }]}
                        onPress={() => setProofModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="card-outline" size={18} color={theme.primary} />
                        <Text style={[styles.dateText, { color: form.id_proof_type_id ? theme.textPrimary : '#94A3B8' }]}>
                            {idProofTypes.find(t => t.id.toString() === form.id_proof_type_id)?.name || 'Select ID Proof Type'}
                        </Text>
                        <Ionicons name="chevron-down-outline" size={16} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                    {errors.id_proof_type_id ? <Text style={styles.err}>{errors.id_proof_type_id}</Text> : null}

                    {/* ID Proof Number */}
                    {form.id_proof_type_id ? (
                        <InputField
                            label={`${idProofTypes.find(t => t.id.toString() === form.id_proof_type_id)?.name || 'ID'} Number *`}
                            placeholder={`Enter ${idProofTypes.find(t => t.id.toString() === form.id_proof_type_id)?.name || 'ID'} Number`}
                            value={form.id_proof_number}
                            error={errors.id_proof_number}
                            onChangeText={(t) => {
                                const proofTypeName = idProofTypes.find(p => p.id.toString() === form.id_proof_type_id)?.name || '';
                                let clean = t;
                                if (proofTypeName.toLowerCase().includes('aadhar') || proofTypeName.toLowerCase().includes('aadhaar')) {
                                    clean = t.replace(/\D/g, '').slice(0, 12);
                                } else if (proofTypeName.toLowerCase().includes('pan')) {
                                    clean = t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                                }
                                up('id_proof_number', clean);
                            }}
                            onBlur={() => checkUnique('id_proof_number', form.id_proof_number)}
                        />
                    ) : null}

                    {/* Check-in date */}
                    <Text style={[styles.label, { color: theme.textPrimary, marginTop: 12 }]}>Check-in Date *</Text>
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
                            label="Per Day (₹)"
                            placeholder="e.g. 250"
                            keyboardType="numeric"
                            value={form.per_day_amount}
                            containerStyle={{ flex: 1, marginLeft: 8 }}
                            onChangeText={(t) => up('per_day_amount', t.replace(/[^0-9.]/g, ''))}
                        />
                    </View>
                    <InputField
                        label="Total Amount (₹)"
                        placeholder="e.g. 500"
                        keyboardType="numeric"
                        value={form.amount_paid}
                        error={errors.amount_paid}
                        editable={false}
                        onChangeText={(t) => up('amount_paid', t.replace(/[^0-9.]/g, ''))}
                    />

                    <InputField
                        label="Room Number *"
                        placeholder="e.g. 204"
                        value={form.room_number}
                        error={errors.room_number}
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

                </Card>
            </ScrollView>

            {/* Sticky Footer (always shown) */}
            <View style={[styles.stickyFooter, { backgroundColor: theme.cardBg, borderTopColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.resetButton, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#CBD5E1' }]}
                    onPress={handleReset}
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    <Text style={[styles.resetButtonText, { color: theme.textSecondary }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.primary }, loading && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Guest'}</Text>
                </TouchableOpacity>
            </View>

            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                onConfirm={(d) => { up('check_in_date', toLocalDateStr(d)); setShowDatePicker(false); }}
                onCancel={() => setShowDatePicker(false)}
            />

            {/* ID Proof Type Modal */}
            <Modal
                visible={proofModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setProofModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setProofModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select ID Proof Type</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {idProofTypes.map((type) => (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.modalItem,
                                        form.id_proof_type_id === type.id.toString() && { backgroundColor: theme.primary + '15' }
                                    ]}
                                    onPress={() => {
                                        up('id_proof_type_id', type.id.toString());
                                        setProofModalVisible(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.modalItemText, 
                                        { color: theme.textPrimary },
                                        form.id_proof_type_id === type.id.toString() && { color: theme.primary, fontWeight: '700' }
                                    ]}>
                                        {type.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 16 },
    card: { padding: 20, borderRadius: 24, borderWidth: 1 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    dateBtn: {
        height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4,
    },
    dateText: { fontSize: 16, fontWeight: '500' },
    err: { color: '#EF4444', fontSize: 11, marginBottom: 12, marginLeft: 4 },
    row: { flexDirection: 'row', marginTop: 16 },
    scrollFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        marginTop: 16,
    },
    stickyFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    resetButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF'
    },
    resetButtonText: { fontWeight: '600', fontSize: 15 },
    saveButton: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    disabledButton: { opacity: 0.7 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '85%',
        borderRadius: 16,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalItem: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginVertical: 2,
    },
    modalItemText: {
        fontSize: 14,
    },
});
