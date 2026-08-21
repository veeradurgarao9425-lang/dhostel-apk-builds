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
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { AppHeader } from '../components/AppHeader';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { SPACING } from '../theme/index';
import { OptionsDrawer } from '../components/FormComponents';
import { ChevronDown, Camera, Upload, X, Check } from 'lucide-react-native';
import { getResolvedImageUrl, isLocalDeviceUri, appendImageFileToFormData } from '../utils/imageHelper';

const ROLES = ['Cook', 'Housekeeping', 'Security', 'Warden', 'Cleaner', 'Others'];

export default function AddStaffScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { isEdit, staffId } = route.params || {};
    
    const { theme } = useTheme();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const { showSuccess, showApiError, showError } = useToast();

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Saving staff member...');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const checkUniqueTimer = React.useRef<NodeJS.Timeout | null>(null);

    // Form fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('Cook');
    const [status, setStatus] = useState('ACTIVE');
    const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
    const [monthlySalary, setMonthlySalary] = useState('');
    const [notes, setNotes] = useState('');

    // ID Proof fields
    const [idProofTypes, setIdProofTypes] = useState<any[]>([]);
    const [idProofTypeId, setIdProofTypeId] = useState('');
    const [idProofNumber, setIdProofNumber] = useState('');

    // Verification Real Image State
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [aadhaarFrontUri, setAadhaarFrontUri] = useState<string | null>(null);
    const [aadhaarBackUri, setAadhaarBackUri] = useState<string | null>(null);

    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [proofModalVisible, setProofModalVisible] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const proofRes = await api.get('/id-proof-types');
                if (proofRes.data.success) {
                    setIdProofTypes(proofRes.data.data);
                }
            } catch (error) {
                console.error("Error fetching proof types:", error);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (isEdit && staffId) {
            fetchStaffDetails();
        }
    }, [isEdit, staffId]);

    const fetchStaffDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/staff/${staffId}`);
            if (res.data.success) {
                const s = res.data.data;
                setFullName(s.full_name || '');
                setPhone(s.phone ? String(s.phone).replace(/\D/g, '').slice(0, 10) : '');
                setEmail(s.email || '');
                setRole(s.role || 'Cook');
                setStatus(s.status || 'ACTIVE');
                if (s.join_date) {
                    try {
                        const d = new Date(s.join_date);
                        if (!isNaN(d.getTime())) setJoinDate(d.toISOString().split('T')[0]);
                    } catch {}
                }
                setMonthlySalary(s.monthly_salary ? s.monthly_salary.toString() : '');
                setIdProofTypeId(s.id_proof_type_id ? s.id_proof_type_id.toString() : (s.id_proof_type ? s.id_proof_type.toString() : ''));
                setIdProofNumber(s.id_proof_number || s.aadhaar_number || '');
                setNotes(s.notes || '');
                
                setPhotoUri(s.photo ? getResolvedImageUrl(s.photo) : null);
                setAadhaarFrontUri(s.aadhaar_front ? getResolvedImageUrl(s.aadhaar_front) : null);
                setAadhaarBackUri(s.aadhaar_back ? getResolvedImageUrl(s.aadhaar_back) : null);
            }
        } catch (e: any) {
            showApiError(e, 'Failed to fetch staff details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const selectedProofName = idProofTypes.find(t => t.id.toString() === idProofTypeId)?.name || '';
    const isAadhaar = selectedProofName.toLowerCase().includes('aadhar') || selectedProofName.toLowerCase().includes('aadhaar');
    const isPan = selectedProofName.toLowerCase().includes('pan');
    const isPhotoReq = isAadhaar || isPan;

    const openCamera = async (target: 'photo' | 'front' | 'back') => {
        try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
                Alert.alert('Permission Needed', 'Camera permission is required to take a photo.');
                return;
            }
            const res = await ImagePicker.launchCameraAsync({
                quality: 0.7,
                allowsEditing: target === 'photo',
                aspect: target === 'photo' ? [1, 1] : undefined,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
                const uri = res.assets[0].uri;
                if (target === 'photo') { setPhotoUri(uri); setErrors(p => ({ ...p, selfie: '' })); }
                else if (target === 'front') { setAadhaarFrontUri(uri); setErrors(p => ({ ...p, idFront: '' })); }
                else if (target === 'back') { setAadhaarBackUri(uri); setErrors(p => ({ ...p, idBack: '' })); }
            }
        } catch (e) {
            console.error('Camera error:', e);
        }
    };

    const openGallery = async (target: 'photo' | 'front' | 'back') => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert('Permission Needed', 'Media library access is required to pick a photo.');
                return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
                quality: 0.7,
                allowsEditing: target === 'photo',
                aspect: target === 'photo' ? [1, 1] : undefined,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
                const uri = res.assets[0].uri;
                if (target === 'photo') { setPhotoUri(uri); setErrors(p => ({ ...p, selfie: '' })); }
                else if (target === 'front') { setAadhaarFrontUri(uri); setErrors(p => ({ ...p, idFront: '' })); }
                else if (target === 'back') { setAadhaarBackUri(uri); setErrors(p => ({ ...p, idBack: '' })); }
            }
        } catch (e) {
            console.error('Gallery error:', e);
        }
    };

    const pickImage = (target: 'photo' | 'front' | 'back') => {
        Alert.alert('Upload Photo', 'Choose an option', [
            { text: '📷 Take Photo', onPress: () => openCamera(target) },
            { text: '🖼️ Choose from Gallery', onPress: () => openGallery(target) },
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

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
        
        if (!idProofTypeId) {
            errs.idProofTypeId = 'ID Proof Type is required';
        }
        if (!idProofNumber.trim()) {
            errs.idProofNumber = 'ID Proof Number is required';
        } else if (isAadhaar) {
            if (idProofNumber.length !== 12) errs.idProofNumber = 'Aadhaar must be exactly 12 digits';
            else if (!/^\d{12}$/.test(idProofNumber)) errs.idProofNumber = 'Aadhaar must be numeric';
        } else if (isPan) {
            if (idProofNumber.length !== 10) errs.idProofNumber = 'PAN must be exactly 10 characters';
            else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(idProofNumber)) errs.idProofNumber = 'Invalid PAN format';
        }

        setErrors(errs);
        return errs;
    };

    const checkUnique = (field: 'phone' | 'email' | 'idProofNumber', value: string) => {
        if (!value || !value.trim()) return;

        if (field === 'phone' && !/^\d{10}$/.test(value.trim())) return;
        if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return;
        if (field === 'idProofNumber') {
            if (isAadhaar && value.trim().length !== 12) return;
            if (isPan && value.trim().length !== 10) return;
        }

        if (checkUniqueTimer.current) {
            clearTimeout(checkUniqueTimer.current);
        }

        checkUniqueTimer.current = setTimeout(async () => {
            try {
                const res = await api.get('/staff/check-unique', {
                    params: {
                        ...(field === 'phone' ? { phone: value.trim() } : {}),
                        ...(field === 'email' ? { email: value.trim() } : {}),
                        ...(field === 'idProofNumber' ? { idProofNumber: value.trim() } : {}),
                        ...(isEdit ? { staffId } : {})
                    }
                });
                if (res.data?.success) {
                    if (field === 'phone' && res.data.phoneExists) {
                        setErrors(prev => ({ ...prev, phone: 'This phone number is already registered' }));
                    }
                    if (field === 'email' && res.data.emailExists) {
                        setErrors(prev => ({ ...prev, email: 'This email is already registered' }));
                    }
                    if (field === 'idProofNumber' && res.data.idProofExists) {
                        setErrors(prev => ({ ...prev, idProofNumber: 'This ID proof number is already registered' }));
                    }
                }
            } catch (e) {
                // Silently ignore background check errors
            }
        }, 350);
    };

    const handleSave = async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            const fieldLabels: Record<string, string> = {
                fullName: 'Full Name',
                phone: 'Phone Number',
                monthlySalary: 'Monthly Salary',
                idProofTypeId: 'ID Proof Type',
                idProofNumber: 'ID Proof Number',
                selfie: 'Profile Photo',
                idFront: 'ID Front Photo',
                idBack: 'ID Back Photo',
                email: 'Valid Email',
            };
            const missed = Object.keys(validationErrors)
                .map(k => fieldLabels[k] || validationErrors[k] || k)
                .join(', ');
            showError(`Please fill required fields: ${missed}`);
            return;
        }

        try {
            setLoading(true);
            setLoadingMessage(isEdit ? 'Updating staff profile...' : 'Registering staff member...');
            
            const payload: any = {
                hostel_id: user?.hostel_id,
                full_name: fullName.trim(),
                phone: phone.trim(),
                email: email.trim() || null,
                role,
                status,
                join_date: joinDate,
                monthly_salary: monthlySalary ? parseFloat(monthlySalary) : null,
                id_proof_type: idProofTypeId,
                id_proof_status: 1,
                aadhaar_number: idProofNumber.trim(),
                id_proof_type_id: idProofTypeId,
                id_proof_number: idProofNumber.trim(),
                notes: notes.trim() || null,
            };

            const hasNewPhoto = isLocalDeviceUri(photoUri);
            const hasNewFront = isLocalDeviceUri(aadhaarFrontUri);
            const hasNewBack = isLocalDeviceUri(aadhaarBackUri);
            const hasFiles = hasNewPhoto || hasNewFront || hasNewBack;

            let res;
            if (hasFiles) {
                const formData = new FormData();
                Object.keys(payload).forEach(key => {
                    const val = payload[key];
                    if (val !== null && val !== undefined && val !== '') {
                        formData.append(key, String(val));
                    }
                });

                if (hasNewPhoto && photoUri) {
                    appendImageFileToFormData(formData, 'photo', photoUri, 'staff_photo.jpg');
                }
                if (hasNewFront && aadhaarFrontUri) {
                    appendImageFileToFormData(formData, 'aadhaar_front', aadhaarFrontUri, 'aadhaar_front.jpg');
                }
                if (hasNewBack && aadhaarBackUri) {
                    appendImageFileToFormData(formData, 'aadhaar_back', aadhaarBackUri, 'aadhaar_back.jpg');
                }

                res = isEdit
                    ? await api.put(`/staff/${staffId}`, formData)
                    : await api.post('/staff', formData);
            } else {
                res = isEdit 
                    ? await api.put(`/staff/${staffId}`, payload)
                    : await api.post('/staff', payload);
            }
                
            if (res.data?.success) {
                showSuccess(`${fullName} ${isEdit ? 'updated' : 'registered'} successfully`);
                navigation.goBack();
            }
        } catch (e: any) {
            console.error('Save staff error:', e);
            const msg = e.response?.data?.error || '';
            if (msg.toLowerCase().includes('phone') || msg.toLowerCase().includes('mobile')) {
                setErrors(prev => ({ ...prev, phone: msg }));
            }
            if (msg.toLowerCase().includes('id proof') || msg.toLowerCase().includes('aadhaar') || msg.toLowerCase().includes('pan') || msg.toLowerCase().includes('id_proof')) {
                setErrors(prev => ({ ...prev, idProofNumber: msg }));
            }
            showApiError(e, 'Could not register staff member');
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
        setIdProofTypeId('');
        setIdProofNumber('');
        setNotes('');
        setPhotoUri(null);
        setAadhaarFrontUri(null);
        setAadhaarBackUri(null);
        setErrors({});
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppHeader 
                alignLeft={true}
                title={isEdit ? "Edit Staff" : "Add Staff"} 
                subtitle="Manage hostel employee records"
                onBack={() => navigation.goBack()} 
            />
            <FullScreenLoader visible={loading} message={loadingMessage} />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 280 + insets.bottom }]}
                keyboardShouldPersistTaps="handled"
            >
                {/* Profile Photo / Selfie */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>📸 Profile Photo</Text>
                    {photoUri ? (
                        <View style={styles.photoPreviewWrapper}>
                            <Image source={{ uri: photoUri }} style={styles.photoPreviewImage} />
                            <View style={styles.photoPreviewActions}>
                                <TouchableOpacity 
                                    style={[styles.miniActionBtn, { backgroundColor: theme.primary }]} 
                                    onPress={() => openCamera('photo')}
                                    activeOpacity={0.8}
                                >
                                    <Camera size={14} color="#FFF" />
                                    <Text style={styles.miniActionBtnText}>Camera</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.miniActionBtn, { backgroundColor: '#6366F1' }]} 
                                    onPress={() => openGallery('photo')}
                                    activeOpacity={0.8}
                                >
                                    <Upload size={14} color="#FFF" />
                                    <Text style={styles.miniActionBtnText}>Gallery</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.miniActionBtn, { backgroundColor: '#EF4444' }]} 
                                    onPress={() => setPhotoUri(null)}
                                    activeOpacity={0.8}
                                >
                                    <X size={14} color="#FFF" />
                                    <Text style={styles.miniActionBtnText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <View style={[styles.profileAvatarPlaceholder, errors.selfie && { borderColor: '#EF4444' }]}>
                                <Camera size={36} color={theme.primary} />
                            </View>
                            <Text style={styles.selfieLabel}>Take or Upload Employee Photo</Text>
                            <Text style={styles.selfieSub}>Clear face picture for staff identity</Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14, width: '100%' }}>
                                <TouchableOpacity 
                                    style={[styles.profileActionBtn, { backgroundColor: theme.primary }]}
                                    onPress={() => openCamera('photo')}
                                    activeOpacity={0.8}
                                >
                                    <Camera size={16} color="#FFF" />
                                    <Text style={styles.profileActionBtnText}>Camera</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.profileActionBtn, { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: theme.primary }]}
                                    onPress={() => openGallery('photo')}
                                    activeOpacity={0.8}
                                >
                                    <Upload size={16} color={theme.primary} />
                                    <Text style={[styles.profileActionBtnText, { color: theme.primary }]}>Gallery</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
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
                                placeholder="Ex: Durgarao Goriparthi"
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
                                placeholder="6303359425"
                                placeholderTextColor="#A0AEC0"
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={(text) => {
                                    setPhone(text);
                                    setErrors(prev => {
                                        const copy = { ...prev };
                                        delete copy.phone;
                                        return copy;
                                    });
                                }}
                                onBlur={() => checkUnique('phone', phone)}
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
                                onChangeText={(text) => {
                                    setEmail(text);
                                    setErrors(prev => {
                                        const copy = { ...prev };
                                        delete copy.email;
                                        return copy;
                                    });
                                }}
                                onBlur={() => checkUnique('email', email)}
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

                {/* Identity Verification */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>🪪 Verification Documents</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>ID Proof Type <Text style={{ color: '#EF4444' }}>*</Text></Text>
                        <TouchableOpacity 
                            style={[styles.inputContainer, errors.idProofTypeId && styles.inputError]} 
                            onPress={() => setProofModalVisible(true)} 
                            activeOpacity={0.7}
                        >
                            <Ionicons name="documents-outline" size={18} color={errors.idProofTypeId ? '#EF4444' : theme.primary} style={styles.inputIcon} />
                            <Text style={[styles.input, !idProofTypeId && { color: '#A0AEC0' }]}>
                                {selectedProofName || 'Select ID Proof'}
                            </Text>
                            <ChevronDown size={18} color="#64748B" />
                        </TouchableOpacity>
                        {errors.idProofTypeId && <Text style={styles.errorText}>{errors.idProofTypeId}</Text>}
                    </View>

                    {idProofTypeId ? (
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{selectedProofName || 'ID'} Number <Text style={{ color: '#EF4444' }}>*</Text></Text>
                            <View style={[styles.inputContainer, errors.idProofNumber && styles.inputError]}>
                                <Ionicons name="card-outline" size={18} color={errors.idProofNumber ? '#EF4444' : theme.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={`Enter ${selectedProofName || 'ID'} Number`}
                                    placeholderTextColor="#A0AEC0"
                                    keyboardType={isAadhaar ? 'number-pad' : 'default'}
                                    autoCapitalize={isPan ? 'characters' : 'none'}
                                    maxLength={isAadhaar ? 12 : isPan ? 10 : 20}
                                    value={idProofNumber}
                                    onChangeText={(t) => {
                                        let clean = t;
                                        if (isAadhaar) clean = t.replace(/\D/g, '').slice(0, 12);
                                        else if (isPan) clean = t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                                        setIdProofNumber(clean);
                                        setErrors(prev => {
                                            const copy = { ...prev };
                                            delete copy.idProofNumber;
                                            return copy;
                                        });
                                    }}
                                    onBlur={() => checkUnique('idProofNumber', idProofNumber)}
                                />
                            </View>
                            {errors.idProofNumber && <Text style={styles.errorText}>{errors.idProofNumber}</Text>}
                        </View>
                    ) : null}

                    {isPhotoReq && idProofTypeId ? (
                        <>
                            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>{selectedProofName || 'ID'} Documents (Front & Back)</Text>
                            <View style={styles.uploadContainer}>
                                <View style={{ flex: 1, marginRight: 6 }}>
                                    {aadhaarFrontUri ? (
                                        <View style={styles.docBoxFilled}>
                                            <Image source={{ uri: aadhaarFrontUri }} style={styles.docImgThumb} />
                                            <View style={styles.docActionsOverlay}>
                                                <TouchableOpacity style={styles.docMiniBtn} onPress={() => openCamera('front')}>
                                                    <Camera size={12} color="#FFF" />
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.docMiniBtn, { backgroundColor: '#6366F1' }]} onPress={() => openGallery('front')}>
                                                    <Upload size={12} color="#FFF" />
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.docMiniBtn, { backgroundColor: '#EF4444' }]} onPress={() => setAadhaarFrontUri(null)}>
                                                    <X size={12} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={styles.docThumbLabel}>Front Photo</Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.docUploadCard, errors.idFront && { borderColor: '#EF4444' }]}>
                                            <Text style={styles.docUploadCardTitle}>Front Side</Text>
                                            <View style={styles.docCardActionsRow}>
                                                <TouchableOpacity style={[styles.docQuickBtn, { backgroundColor: theme.primary }]} onPress={() => openCamera('front')}>
                                                    <Camera size={13} color="#FFF" />
                                                    <Text style={styles.docQuickBtnText}>Camera</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.docQuickBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }]} onPress={() => openGallery('front')}>
                                                    <Upload size={13} color="#475569" />
                                                    <Text style={[styles.docQuickBtnText, { color: '#475569' }]}>Gallery</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>
                                <View style={{ flex: 1, marginLeft: 6 }}>
                                    {aadhaarBackUri ? (
                                        <View style={styles.docBoxFilled}>
                                            <Image source={{ uri: aadhaarBackUri }} style={styles.docImgThumb} />
                                            <View style={styles.docActionsOverlay}>
                                                <TouchableOpacity style={styles.docMiniBtn} onPress={() => openCamera('back')}>
                                                    <Camera size={12} color="#FFF" />
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.docMiniBtn, { backgroundColor: '#6366F1' }]} onPress={() => openGallery('back')}>
                                                    <Upload size={12} color="#FFF" />
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.docMiniBtn, { backgroundColor: '#EF4444' }]} onPress={() => setAadhaarBackUri(null)}>
                                                    <X size={12} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={styles.docThumbLabel}>Back Photo</Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.docUploadCard, errors.idBack && { borderColor: '#EF4444' }]}>
                                            <Text style={styles.docUploadCardTitle}>Back Side</Text>
                                            <View style={styles.docCardActionsRow}>
                                                <TouchableOpacity style={[styles.docQuickBtn, { backgroundColor: theme.primary }]} onPress={() => openCamera('back')}>
                                                    <Camera size={13} color="#FFF" />
                                                    <Text style={styles.docQuickBtnText}>Camera</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.docQuickBtn, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }]} onPress={() => openGallery('back')}>
                                                    <Upload size={13} color="#475569" />
                                                    <Text style={[styles.docQuickBtnText, { color: '#475569' }]}>Gallery</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </>
                    ) : null}
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
                        <Text style={styles.submitButtonText}>{isEdit ? 'Update Staff Details' : 'Add Employee'}</Text>
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

            <OptionsDrawer 
                visible={proofModalVisible} 
                title="ID Proof Type" 
                data={idProofTypes} 
                selectedId={idProofTypeId} 
                keyExtractor={(i: any) => i.id.toString()} 
                labelExtractor={(i: any) => i.name} 
                onSelect={(i: any) => { 
                    setIdProofTypeId(i.id.toString());
                    setIdProofNumber(''); 
                }} 
                onClose={() => setProofModalVisible(false)} 
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

    photoPreviewWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    photoPreviewImage: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 3,
        borderColor: '#4F46E5',
    },
    photoPreviewActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    miniActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    miniActionBtnText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },

    profileAvatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EEF2FF',
        borderWidth: 2,
        borderColor: '#4F46E5',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    profileActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
    },
    profileActionBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },

    docUploadCard: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
    },
    docUploadCardTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8,
    },
    docCardActionsRow: {
        flexDirection: 'row',
        gap: 6,
        width: '100%',
    },
    docQuickBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        borderRadius: 8,
    },
    docQuickBtnText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },

    docBoxFilled: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        height: 100,
        backgroundColor: '#F8FAFC',
        position: 'relative',
    },
    docImgThumb: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    docActionsOverlay: {
        position: 'absolute',
        top: 6,
        right: 6,
        flexDirection: 'row',
        gap: 6,
    },
    docMiniBtn: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docThumbLabel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
        paddingVertical: 3,
    },

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
