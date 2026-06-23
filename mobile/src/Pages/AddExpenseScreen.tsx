import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Text,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    StatusBar,
    Pressable,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import {
    Calendar,
    ChevronDown,
    IndianRupee,
    CreditCard,
    User,
    FileText,
} from 'lucide-react-native';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { SPACING } from '../theme/index';
import { AppHeader } from '../components/AppHeader';
import { FullScreenLoader } from '../components/FullScreenLoader';

const CAT_COLORS: Record<string, string> = {
    'Electricity': '#F59E0B',
    'Electricity Bill': '#F59E0B',
    'Water': '#0EA5E9',
    'Water Bill': '#0EA5E9',
    'Lift Bill': '#6366F1',
    'Maintenance': '#8B5CF6',
    'Salary': '#10B981',
    'Groceries': '#F97316',
    'Internet': '#06B6D4',
    'Internet Bill': '#06B6D4',
    'Cleaning': '#EC4899',
    'Other': '#64748B',
    'Others': '#64748B',
    'Others Bill': '#64748B',
    'Miscellaneous': '#64748B',
};

const getCatColor = (name: string) => CAT_COLORS[name] || '#64748B';

// ─── Reusable custom components inside AddExpenseScreen ─────────────────────────
const FormInput = ({ label, icon: Icon, placeholder, value, onChangeText, keyboardType, multiline, error, onFocus }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>{label}</Text>
            <View style={[
                styles.inputContainer,
                { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                multiline && styles.multilineContainer,
                error && styles.inputError
            ]}>
                <View style={[styles.inputIcon, multiline && { paddingTop: 10 }]}>
                    <Icon size={18} color={error ? '#EF4444' : theme.primary} />
                </View>
                <TextInput
                    style={[
                        styles.input,
                        { color: theme.textPrimary, fontSize, outlineStyle: 'none' } as any,
                        multiline && styles.multilineInput
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? '#475569' : '#BBBBBB'}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    onFocus={onFocus}
                />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const SelectField = ({ label, value, placeholder, icon: Icon, onPress, error }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>{label}</Text>
            <TouchableOpacity style={[styles.inputContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }, error && styles.inputError]} onPress={onPress} activeOpacity={0.7}>
                <View style={styles.inputIcon}><Icon size={18} color={error ? '#EF4444' : theme.primary} /></View>
                <Text style={[styles.inputText, { color: theme.textPrimary, fontSize }, !value && { color: isDark ? '#475569' : '#BBBBBB' }]}>{value || placeholder}</Text>
                <ChevronDown size={18} color={theme.textSecondary} style={{ marginRight: 12 }} />
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

export const AddExpenseScreen = ({ route, navigation }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const { expense } = route.params || {};
    const { user } = useAuth();
    const { triggerRefresh } = useRefresh();
    const scrollRef = useRef<ScrollView>(null);
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

    const insets = useSafeAreaInsets();
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        fetchCategories();
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
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

    const handleReset = () => {
        setFormData({
            title: '',
            amount: '',
            category_id: categories.length > 0 ? categories[0].category_id.toString() : '',
            payment_mode_id: '1',
            expense_date: new Date().toISOString().split('T')[0],
            description: '',
            vendor_name: '',
            bill_number: '',
        });
    };

    const handleSave = async () => {
        if (!formData.category_id || !formData.expense_date) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please select category and date' });
            return;
        }
        if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Amount must be greater than 0' });
            return;
        }
        if (!formData.description || !formData.description.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Description is mandatory' });
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
                triggerRefresh();
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppHeader title={expense ? "Edit Expense" : "Add Expense"} />
            <FullScreenLoader visible={loading} />
            <ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.scrollContent, { paddingBottom: (isKeyboardVisible ? 250 : 120) + insets.bottom }]}
            >
                {/* ── Card 1: Expense details ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#EDE9FE', borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>🏷️ Expense Details</Text>
                    
                    <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>Category *</Text>
                    <View style={styles.categoryGrid}>
                        {categories.map((cat) => {
                            const isSelected = formData.category_id === cat.category_id.toString();
                            const color = getCatColor(cat.category_name);
                            return (
                                <TouchableOpacity
                                    key={cat.category_id}
                                    style={[
                                        styles.catButton,
                                        { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                                        isSelected && { borderColor: color, backgroundColor: color + '15' }
                                    ]}
                                    onPress={() => setFormData({ ...formData, category_id: cat.category_id.toString() })}
                                >
                                    <Text style={[
                                        styles.catButtonText,
                                        { fontSize: fontSize - 2 },
                                        isSelected && { color: color, fontWeight: '700' }
                                    ]}>{cat.category_name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <FormInput
                        label="Amount (₹) *"
                        icon={IndianRupee}
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={formData.amount}
                        onChangeText={(text: string) => setFormData({ ...formData, amount: text })}
                    />
                </View>

                {/* ── Card 2: Date & Payment info ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#EDE9FE', borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>📅 Payment Info</Text>
                    
                    <SelectField
                        label="Expense Date *"
                        icon={Calendar}
                        value={formData.expense_date}
                        placeholder="Select Date"
                        onPress={() => setDatePickerVisibility(true)}
                    />

                    <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary, marginTop: 12 }]}>Payment Mode *</Text>
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
                                        { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                                        isSelected && { borderColor: mode.color, backgroundColor: mode.color + '15' }
                                    ]}
                                    onPress={() => setFormData({ ...formData, payment_mode_id: mode.id })}
                                >
                                    <Text style={[
                                        styles.catButtonText,
                                        { fontSize: fontSize - 2 },
                                        isSelected && { color: mode.color, fontWeight: '700' }
                                    ]}>{mode.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Card 3: Vendor details & description ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#EDE9FE', borderWidth: 1 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>📄 Additional Info (Optional)</Text>
                    
                    <FormInput
                        label="Vendor Name"
                        icon={User}
                        placeholder="e.g. Reliance Fresh"
                        value={formData.vendor_name}
                        onChangeText={(text: string) => setFormData({ ...formData, vendor_name: text })}
                    />

                    <FormInput
                        label="Bill Number"
                        icon={FileText}
                        placeholder="e.g. INV-001"
                        value={formData.bill_number}
                        onChangeText={(text: string) => setFormData({ ...formData, bill_number: text })}
                    />

                    <FormInput
                        label="Description *"
                        icon={FileText}
                        placeholder="Add details about the expense..."
                        value={formData.description}
                        onChangeText={(text: string) => setFormData({ ...formData, description: text })}
                        multiline
                        onFocus={() => {
                            setTimeout(() => {
                                scrollRef.current?.scrollToEnd({ animated: true });
                            }, 200);
                        }}
                    />
                </View>
            </ScrollView>

            {/* ─── Sticky Footer ───────────────────────────────────────────────────── */}
            <View style={[styles.stickyFooter, { backgroundColor: theme.cardBg, borderTopColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: isKeyboardVisible ? SPACING.md : (insets.bottom + SPACING.md) }]}>
                <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#CBD5E1' }]}
                    onPress={handleReset}
                    disabled={loading}
                >
                    <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.primary }, loading && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <Text style={styles.submitButtonText}>{expense ? "Update Expense" : "Save Expense"}</Text>
                </TouchableOpacity>
            </View>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={new Date(formData.expense_date)}
                maximumDate={new Date()}
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisibility(false)}
            />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, flexGrow: 1 },
    formCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 6,
    },
    sectionTitle: {
        fontWeight: '700',
        marginBottom: 14,
        paddingBottom: 8,
        borderBottomWidth: 1,
    },
    inputGroup: { marginBottom: 14 },
    inputLabel: { fontWeight: '600', marginBottom: 6 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        height: 48,
        overflow: 'hidden',
        borderWidth: 1,
    },
    inputIcon: {
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        height: '100%',
        fontWeight: '500',
        paddingRight: 12,
    },
    inputText: {
        flex: 1,
        fontWeight: '500',
    },
    multilineContainer: {
        height: 100,
        alignItems: 'flex-start',
    },
    multilineInput: {
        paddingTop: 10,
        paddingBottom: 10,
        height: '100%',
    },
    inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
    errorText: { color: '#EF4444', fontSize: 11, fontWeight: '600', marginTop: 4, marginLeft: 4 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14, marginTop: 4 },
    catButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    catButtonText: { color: '#64748B', fontWeight: '500' },
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
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: { fontWeight: '600', fontSize: 15 },
    submitButton: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    disabledButton: { opacity: 0.7 }
});

export default AddExpenseScreen;
