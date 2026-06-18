import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { Header } from '../components/Header';
import { InputField } from '../components/InputField';
import { Card } from '../components/Card';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Calendar } from 'lucide-react-native';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';

const CAT_COLORS: Record<string, string> = {
    'Electricity': '#F59E0B',
    'Water': '#0EA5E9',
    'Maintenance': '#8B5CF6',
    'Salary': '#10B981',
    'Groceries': '#F97316',
    'Internet': '#06B6D4',
    'Cleaning': '#EC4899',
    'Other': '#64748B',
};

const getCatColor = (name: string) => CAT_COLORS[name] || '#64748B';

export const AddExpenseScreen = ({ route, navigation }: any) => {
    const { expense } = route.params || {};
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category_id: '',
        payment_mode_id: '1', // Default to Cash (usually 1)
        expense_date: new Date().toISOString().split('T')[0],
        description: '',
        vendor_name: '',
        bill_number: '',
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (expense) {
            setFormData({
                title: expense.description || '',
                amount: expense.amount.toString(),
                category_id: expense.category_id.toString(),
                payment_mode_id: expense.payment_mode_id?.toString() || '1',
                expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : new Date().toISOString().split('T')[0],
                description: expense.description || '',
                vendor_name: expense.vendor_name || '',
                bill_number: expense.bill_number || '',
            });
        }
    }, [expense]);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/expenses/categories');
            if (response.data.success) {
                setCategories(response.data.data);
                if (response.data.data.length > 0 && !expense) {
                    setFormData(prev => ({ ...prev, category_id: response.data.data[0].category_id.toString() }));
                }
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleConfirmDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        setFormData({ ...formData, expense_date: `${y}-${m}-${d}` });
        setDatePickerVisibility(false);
    };

    const handleSave = async () => {
        if (!formData.category_id || !formData.amount || !formData.expense_date) {
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
                category_id: parseInt(formData.category_id),
                expense_date: formData.expense_date,
                amount: parseFloat(formData.amount),
                payment_mode_id: parseInt(formData.payment_mode_id),
                vendor_name: formData.vendor_name,
                description: formData.description || formData.title || categories.find(c => c.category_id.toString() === formData.category_id)?.category_name || 'Expense',
                bill_number: formData.bill_number,
            };

            let response;
            if (expense) {
                response = await api.put(`/expenses/${expense.expense_id}`, payload);
            } else {
                response = await api.post('/expenses', payload);
            }

            if (response.data.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: expense ? 'Expense updated successfully!' : 'Expense recorded successfully!',
                });
                navigation?.goBack();
            }
        } catch (error: any) {
            console.error('Error saving expense:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.error || 'Failed to save expense',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Header title={expense ? "Edit Expense" : "Add Expense"} />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Card style={styles.formCard}>
                    <Text style={styles.label}>Category *</Text>
                    <View style={styles.categoryGrid}>
                        {categories.map((cat) => {
                            const isSelected = formData.category_id === cat.category_id.toString();
                            const color = getCatColor(cat.category_name);
                            return (
                                <TouchableOpacity
                                    key={cat.category_id}
                                    style={[
                                        styles.catButton,
                                        isSelected && { borderColor: color, backgroundColor: color + '15' }
                                    ]}
                                    onPress={() => setFormData({ ...formData, category_id: cat.category_id.toString() })}
                                >
                                    <Text style={[
                                        styles.catButtonText,
                                        isSelected && { color: color, fontWeight: '700' }
                                    ]}>{cat.category_name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <InputField
                        label="Amount (₹) *"
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={formData.amount}
                        onChangeText={(text) => setFormData({ ...formData, amount: text })}
                    />

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Expense Date *</Text>
                        <TouchableOpacity
                            style={styles.datePickerButton}
                            onPress={() => setDatePickerVisibility(true)}
                        >
                            <Calendar size={18} color="#64748B" style={{ marginRight: 8 }} />
                            <Text style={styles.dateText}>{formData.expense_date}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Payment Mode *</Text>
                    <View style={styles.categoryGrid}>
                        {[
                            { id: '1', name: 'Cash', color: '#10B981' },
                            { id: '2', name: 'Online', color: '#3B82F6' },
                            { id: '3', name: 'Bank Transfer', color: '#8B5CF6' }
                        ].map((mode) => {
                            const isSelected = formData.payment_mode_id === mode.id;
                            return (
                                <TouchableOpacity
                                    key={mode.id}
                                    style={[
                                        styles.catButton,
                                        isSelected && { borderColor: mode.color, backgroundColor: mode.color + '15' }
                                    ]}
                                    onPress={() => setFormData({ ...formData, payment_mode_id: mode.id })}
                                >
                                    <Text style={[
                                        styles.catButtonText,
                                        isSelected && { color: mode.color, fontWeight: '700' }
                                    ]}>{mode.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <InputField
                        label="Vendor Name (Optional)"
                        placeholder="e.g. Reliance Fresh"
                        value={formData.vendor_name}
                        onChangeText={(text) => setFormData({ ...formData, vendor_name: text })}
                    />

                    <InputField
                        label="Bill Number (Optional)"
                        placeholder="e.g. INV-001"
                        value={formData.bill_number}
                        onChangeText={(text) => setFormData({ ...formData, bill_number: text })}
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

                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={['#FF8585', '#FF6B6B']}
                        style={styles.buttonGradient}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.buttonText}>{expense ? "Update Expense" : "Save Expense"}</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
                <View style={styles.bottomSpacing} />
            </ScrollView>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={new Date(formData.expense_date)}
                maximumDate={new Date()}
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisibility(false)}
            />
        </View>
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
    catButtonText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    datePickerButton: {
        height: 50,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '500',
    },
    saveButton: {
        height: 54,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 40
    },
    disabledButton: { opacity: 0.7 },
    buttonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    bottomSpacing: { height: 40 },
});

export default AddExpenseScreen;
