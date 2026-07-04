import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Keyboard,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { AppHeader } from '../components/AppHeader';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { SPACING } from '../theme/index';

const ROLES = ['Cook', 'Housekeeping', 'Security', 'Warden', 'Cleaner', 'Others'];

export default function AddStaffScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    // Form fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('Cook');
    const [status, setStatus] = useState('ACTIVE');
    const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
    const [monthlySalary, setMonthlySalary] = useState('');
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [notes, setNotes] = useState('');

    // Verification Mock uploads state
    const [selfieCaptured, setSelfieCaptured] = useState(false);
    const [aadhaarFrontUploaded, setAadhaarFrontUploaded] = useState(false);
    const [aadhaarBackUploaded, setAadhaarBackUploaded] = useState(false);

    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!fullName.trim()) errs.fullName = 'Full Name is required';
        if (!phone.trim()) {
            errs.phone = 'Phone Number is required';
        } else if (!/^\d{10}$/.test(phone.trim())) {
            errs.phone = 'Phone must be exactly 10 digits';
        }
        if (!monthlySalary.trim()) {
            errs.monthlySalary = 'Salary is required';
        } else if (isNaN(Number(monthlySalary)) || Number(monthlySalary) < 0) {
            errs.monthlySalary = 'Salary must be a valid amount';
        }
        if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            errs.email = 'Invalid email address';
        }
        if (aadhaarNumber.trim() && !/^\d{12}$/.test(aadhaarNumber.trim())) {
            errs.aadhaarNumber = 'Aadhaar must be exactly 12 digits';
        }
        setErrors(errs);
        return errs;
    };

    const handleSave = async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            const missing = Object.keys(validationErrors).map((key) => {
                const labels: Record<string, string> = {
                    fullName: 'Full name',
                    phone: 'Phone number',
                    monthlySalary: 'Salary',
                    email: 'Email',
                    aadhaarNumber: 'Aadhaar number',
                };
                return labels[key] || key;
            }).join(', ');
            Toast.show({ type: 'error', text1: 'Validation Error', text2: `Please correct: ${missing}` });
            return;
        }

        try {
            setLoading(true);
            const payload = {
                hostel_id: user?.hostel_id,
                full_name: fullName.trim(),
                phone: phone.trim(),
                email: email.trim() || null,
                role,
                status,
                join_date: joinDate,
                monthly_salary: monthlySalary ? parseFloat(monthlySalary) : null,
                aadhaar_number: aadhaarNumber.trim() || null,
                notes: notes.trim() || null,
                photo: selfieCaptured ? 'https://via.placeholder.com/150' : null,
                aadhaar_front: aadhaarFrontUploaded ? 'uploaded' : null,
                aadhaar_back: aadhaarBackUploaded ? 'uploaded' : null
            };

            const res = await api.post('/staff', payload);
            if (res.data.success) {
                Toast.show({ type: 'success', text1: '✓ Staff Added!', text2: `${fullName} registered successfully` });
                navigation.goBack();
            }
        } catch (e: any) {
            console.error('Save staff error:', e);
            Alert.alert('Registration Failed', e.response?.data?.error || 'Could not register staff member');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFullName('');
        setPhone('');
        setEmail('');
        setRole('Cook');
        setStatus('ACTIVE');
        setJoinDate(new Date().toISOString().split('T')[0]);
        setMonthlySalary('');
        setAadhaarNumber('');
        setNotes('');
        setSelfieCaptured(false);
        setAadhaarFrontUploaded(false);
        setAadhaarBackUploaded(false);
        setErrors({});
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppHeader title="Add Staff" onBack={() => navigation.goBack()} />
            <FullScreenLoader visible={loading} />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
                keyboardShouldPersistTaps="handled"
            >
                {/* Selfie / Profile Photo */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>📸 Profile Verification</Text>
                    <TouchableOpacity 
                        style={[
                            styles.selfieBox, 
                            selfieCaptured && { borderColor: '#10B981', backgroundColor: '#ECFDF5' }
                        ]} 
                        onPress={() => { 
                            setSelfieCaptured(true); 
                            Toast.show({ type: 'success', text1: 'Selfie Captured ✓' }); 
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons 
                            name={selfieCaptured ? 'checkbox' : 'camera-outline'} 
                            size={32} 
                            color={selfieCaptured ? '#10B981' : theme.primary} 
                        />
                        <Text style={[styles.selfieLabel, selfieCaptured && { color: '#16A34A' }]}>
                            {selfieCaptured ? 'Selfie Captured' : 'Capture Selfie'}
                        </Text>
                        <Text style={styles.selfieSub}>Take a clear photo for verification</Text>
                    </TouchableOpacity>
                </View>

                {/* Personal Information */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>👤 Personal Details</Text>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Full Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
                        <View style={[styles.inputContainer, errors.fullName && styles.inputError]}>
                            <Ionicons name="person-outline" size={18} color={errors.fullName ? '#EF4444' : theme.primary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter full name"
                                placeholderTextColor="#A0AEC0"
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>
                        {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Phone Number <Text style={{ color: '#EF4444' }}>*</Text></Text>
                        <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
                            <Ionicons name="call-outline" size={18} color={errors.phone ? '#EF4444' : theme.primary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 10-digit phone number"
                                placeholderTextColor="#A0AEC0"
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={setPhone}
                            />
                        </View>
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                            <Ionicons name="mail-outline" size={18} color={errors.email ? '#EF4444' : theme.primary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter email address"
                                placeholderTextColor="#A0AEC0"
                                keyboardType="email-address"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>
                </View>

                {/* Role and Status selection */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>⚙️ Role & Status</Text>

                    <Text style={styles.fieldLabel}>Role <Text style={{ color: '#EF4444' }}>*</Text></Text>
                    <View style={styles.chipRow}>
                        {ROLES.map((r) => {
                            const isSelected = role === r;
                            return (
                                <TouchableOpacity 
                                    key={r} 
                                    style={[
                                        styles.chip, 
                                        isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                                    ]}
                                    onPress={() => setRole(r)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.chipText, isSelected && { color: '#FFF' }]}>{r}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Staff Status <Text style={{ color: '#EF4444' }}>*</Text></Text>
                    <View style={styles.statusRow}>
                        {['ACTIVE', 'INACTIVE'].map((st) => {
                            const isSelected = status === st;
                            return (
                                <TouchableOpacity 
                                    key={st} 
                                    style={[
                                        styles.statusChip, 
                                        isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                                    ]}
                                    onPress={() => setStatus(st)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.statusChipText, isSelected && { color: '#FFF' }]}>{st}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Job & Salary Info */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>💼 Employment Details</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Join Date <Text style={{ color: '#EF4444' }}>*</Text></Text>
                        <TouchableOpacity style={styles.dateField} onPress={() => setDatePickerVisible(true)} activeOpacity={0.7}>
                            <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                            <Text style={styles.dateText}>{joinDate}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Monthly Salary (₹)</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="cash-outline" size={18} color={theme.primary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter monthly salary"
                                placeholderTextColor="#A0AEC0"
                                keyboardType="numeric"
                                value={monthlySalary}
                                onChangeText={setMonthlySalary}
                            />
                        </View>
                    </View>
                </View>

                {/* Identity & Aadhaar Verification */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>🪪 Verification Documents</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Aadhaar Number</Text>
                        <View style={[styles.inputContainer, errors.aadhaarNumber && styles.inputError]}>
                            <Ionicons name="card-outline" size={18} color={errors.aadhaarNumber ? '#EF4444' : theme.primary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 12-digit Aadhaar Number"
                                placeholderTextColor="#A0AEC0"
                                keyboardType="numeric"
                                maxLength={12}
                                value={aadhaarNumber}
                                onChangeText={setAadhaarNumber}
                            />
                        </View>
                        {errors.aadhaarNumber && <Text style={styles.errorText}>{errors.aadhaarNumber}</Text>}
                    </View>

                    <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Aadhaar Photos</Text>
                    <View style={styles.uploadContainer}>
                        <View style={{ flex: 1, marginRight: 6 }}>
                            <TouchableOpacity 
                                style={[styles.uploadButton, aadhaarFrontUploaded && { backgroundColor: '#10B981' }]} 
                                onPress={() => { 
                                    setAadhaarFrontUploaded(true); 
                                    Toast.show({ type: 'success', text1: 'Front Uploaded ✓' }); 
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name={aadhaarFrontUploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={16} color="#FFF" />
                                <Text style={styles.uploadBtnText}>{aadhaarFrontUploaded ? 'Front Active' : 'Front Side'}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1, marginLeft: 6 }}>
                            <TouchableOpacity 
                                style={[styles.uploadButton, aadhaarBackUploaded && { backgroundColor: '#10B981' }]} 
                                onPress={() => { 
                                    setAadhaarBackUploaded(true); 
                                    Toast.show({ type: 'success', text1: 'Back Uploaded ✓' }); 
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name={aadhaarBackUploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={16} color="#FFF" />
                                <Text style={styles.uploadBtnText}>{aadhaarBackUploaded ? 'Back Active' : 'Back Side'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Additional Notes */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>📝 Additional Notes</Text>
                    <View style={[styles.inputContainer, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                        <Ionicons name="document-text-outline" size={18} color={theme.primary} style={[styles.inputIcon, { marginTop: 2 }]} />
                        <TextInput
                            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                            placeholder="Add any internal remarks..."
                            placeholderTextColor="#A0AEC0"
                            multiline
                            value={notes}
                            onChangeText={setNotes}
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Sticky Footer */}
            <View style={[styles.stickyFooter, { paddingBottom: isKeyboardVisible ? SPACING.md : (insets.bottom + SPACING.md) }]}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={resetForm}
                    disabled={loading}
                    activeOpacity={0.7}
                >
                    <Text style={styles.cancelButtonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Text style={styles.submitButtonText}>Add Employee</Text>
                    )}
                </TouchableOpacity>
            </View>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={joinDate ? new Date(joinDate) : new Date()}
                onConfirm={(d) => { 
                    setJoinDate(d.toISOString().split('T')[0]); 
                    setDatePickerVisible(false); 
                }}
                onCancel={() => setDatePickerVisible(false)}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

    formCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 20, 
        padding: 20, 
        marginBottom: 14, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 8, 
        elevation: 2 
    },
    sectionTitle: { 
        fontSize: 15, 
        fontWeight: '700', 
        color: '#1E293B', 
        marginBottom: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F1F5F9', 
        paddingBottom: 10 
    },

    // Form elements
    inputGroup: { marginBottom: 14 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6, marginLeft: 2 },
    inputContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F8FAFC', 
        borderRadius: 12, 
        paddingHorizontal: 12, 
        height: 48, 
        borderWidth: 1, 
        borderColor: '#E2E8F0' 
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '500' },
    inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '500', marginLeft: 4 },

    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8, marginLeft: 2 },

    // Selfie
    selfieBox: { 
        borderStyle: 'dashed', 
        borderWidth: 1.5, 
        borderColor: '#CBD5E1', 
        borderRadius: 16, 
        padding: 20, 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#F8FAFC' 
    },
    selfieLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginTop: 8 },
    selfieSub: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 2 },

    // Role selector
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { 
        paddingHorizontal: 14, 
        paddingVertical: 8, 
        borderRadius: 18, 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        backgroundColor: '#FFF' 
    },
    chipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

    // Status
    statusRow: { flexDirection: 'row', gap: 8 },
    statusChip: { 
        flex: 1, 
        paddingVertical: 8, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        backgroundColor: '#FFF', 
        alignItems: 'center' 
    },
    statusChipText: { fontSize: 12, fontWeight: '800', color: '#64748B' },

    // Date
    dateField: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F8FAFC', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 12, 
        padding: 12, 
        gap: 10 
    },
    dateText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },

    // Upload
    uploadContainer: { flexDirection: 'row' },
    uploadButton: { 
        height: 42, 
        backgroundColor: '#64748B', 
        borderRadius: 12, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 6 
    },
    uploadBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

    // Sticky Footer
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
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 }
});
