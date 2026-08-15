import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';
import { AppHeader } from '../components/AppHeader';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { InputField } from '../components/InputField';
import { Card } from '../components/Card';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../theme/index';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';

export const AddIncomeScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [paymentModes, setPaymentModes] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        source: '',
        amount: '',
        payment_mode_id: '1',
        income_date: new Date().toISOString().split('T')[0],
        description: '',
        receipt_number: '',
    });

    const insets = useSafeAreaInsets();
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        fetchPaymentModes();
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const fetchPaymentModes = async () => {
        try {
            const response = await api.get('/monthly-fees/payment-modes');
            if (response.data.success) {
                setPaymentModes(response.data.data);
                if (response.data.data.length > 0) {
                    const firstModeId = response.data.data[0].payment_mode_id || response.data.data[0].id;
                    setFormData(prev => ({ ...prev, payment_mode_id: firstModeId.toString() }));
                }
            }
        } catch (error) {
            console.error('Error fetching payment modes:', error);
        }
    };

    const handleSave = async () => {
        if (!formData.source || !formData.amount || !formData.income_date) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please fill in required fields',
            });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                hostel_id: user?.hostel_id,
                source: formData.source,
                amount: parseFloat(formData.amount),
                payment_mode_id: parseInt(formData.payment_mode_id),
                income_date: formData.income_date,
                description: formData.description,
                receipt_number: formData.receipt_number,
            };

            const response = await api.post('/income', payload);

            if (response.data.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Income recorded successfully!',
                });
                navigation?.goBack();
            }
        } catch (error: any) {
            console.error('Error saving income:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.error || 'Failed to record income',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            source: '',
            amount: '',
            payment_mode_id: paymentModes.length > 0 ? (paymentModes[0].payment_mode_id || paymentModes[0].id).toString() : '1',
            income_date: new Date().toISOString().split('T')[0],
            description: '',
            receipt_number: '',
        });
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppHeader title="Add Income" />
            <FullScreenLoader visible={loading} />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Card style={styles.formCard}>
                    <InputField
                        label="Source *"
                        placeholder="e.g. Maintenance Fee, Parking Fee"
                        value={formData.source}
                        onChangeText={(text) => setFormData({ ...formData, source: text })}
                    />

                    <InputField
                        label="Amount (₹) *"
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={formData.amount}
                        onChangeText={(text) => setFormData({ ...formData, amount: text })}
                    />

                    <InputField
                        label="Income Date *"
                        placeholder="YYYY-MM-DD"
                        value={formData.income_date}
                        onChangeText={(text) => setFormData({ ...formData, income_date: text })}
                    />

                    <Text style={styles.label}>Payment Mode *</Text>
                    <View style={styles.categoryGrid}>
                        {paymentModes.map((mode) => {
                            const mId = mode.payment_mode_id || mode.id;
                            const mName = mode.payment_mode_name || mode.name || 'Unknown';
                            return (
                                <TouchableOpacity
                                    key={mId}
                                    style={[
                                        styles.catButton,
                                        formData.payment_mode_id === mId.toString() && styles.catButtonActive
                                    ]}
                                    onPress={() => setFormData({ ...formData, payment_mode_id: mId.toString() })}
                                >
                                    <Text style={[
                                        styles.catButtonText,
                                        formData.payment_mode_id === mId.toString() && styles.catButtonTextActive
                                    ]}>{mName}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <InputField
                        label="Receipt Number (Optional)"
                        placeholder="e.g. REC-001"
                        value={formData.receipt_number}
                        onChangeText={(text) => setFormData({ ...formData, receipt_number: text })}
                    />

                    <InputField
                        label="Description"
                        placeholder="Optional details..."
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        style={{ height: 80 }}
                    />
                </Card>
                <View style={{ height: 20 }} />
            </ScrollView>

            {/* ─── Sticky Footer ───────────────────────────────────────────────────── */}
            <View style={[styles.stickyFooter, { paddingBottom: isKeyboardVisible ? SPACING.md : (insets.bottom + SPACING.md) }]}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleReset}
                    disabled={loading}
                >
                    <Text style={styles.cancelButtonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.submitButton, loading && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <Text style={styles.submitButtonText}>Save Income</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { flex: 1, padding: 20 },
    formCard: { padding: 20, marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 12 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    catButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFF'
    },
    catButtonActive: {
        borderColor: '#FF6B6B',
        backgroundColor: '#FFF1F1'
    },
    catButtonText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    catButtonTextActive: { color: '#FF6B6B', fontWeight: '600' },
    stickyFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF'
    },
    cancelButtonText: { color: '#475569', fontWeight: '600', fontSize: 15 },
    submitButton: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FF6B6B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 }
});

export default AddIncomeScreen;
