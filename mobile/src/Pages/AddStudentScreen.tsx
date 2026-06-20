import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Modal,
    FlatList,
    Image,
    Alert,
    Animated,
    ActivityIndicator,
    Keyboard,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    User, Phone, Mail, Home, MapPin,
    CreditCard, Users, Fingerprint, Check,
    ChevronDown, Camera, X, BedDouble, Calendar,
} from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { COLORS, FONT, SPACING } from '../theme/index';
import { AppHeader } from '../components/AppHeader';
import { FullScreenLoader } from '../components/FullScreenLoader';

// ─── Smooth bottom-sheet modal ────────────────────────────────────────────────
const ModalSheet = ({ visible, onClose, maxHeight = '85%', children }: any) => {
    const [shouldRender, setShouldRender] = useState(visible);
    const translateY = useRef(new Animated.Value(600)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(translateY, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 600, duration: 180, useNativeDriver: true }),
            ]).start(({ finished }) => {
                if (finished) {
                    setShouldRender(false);
                }
            });
        }
    }, [visible]);

    if (!shouldRender) return null;
    return (
        <Modal transparent visible={visible || shouldRender} animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <View style={{ flex: 1 }}>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)', opacity }]}>
                    <Pressable style={{ flex: 1 }} onPress={onClose} />
                </Animated.View>
                <Animated.View style={[
                    styles.sheet,
                    { maxHeight, transform: [{ translateY }] }
                ]}>
                    {children}
                </Animated.View>
            </View>
        </Modal>
    );
};

// ─── Reusable form components ─────────────────────────────────────────────────
const FormInput = ({ label, icon: Icon, placeholder, value, onChangeText, keyboardType, multiline, error }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>{label}</Text>
            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#F1F5F9' }, multiline && styles.multilineContainer, error && styles.inputError]}>
                <View style={styles.inputIcon}><Icon size={18} color={error ? '#EF4444' : theme.primary} /></View>
                <TextInput
                    style={[styles.input, { color: theme.textPrimary, fontSize }, multiline && styles.multilineInput]}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? '#475569' : '#BBBBBB'}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
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
            <TouchableOpacity style={[styles.inputContainer, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#F1F5F9' }, error && styles.inputError]} onPress={onPress} activeOpacity={0.7}>
                <View style={styles.inputIcon}><Icon size={18} color={error ? '#EF4444' : theme.primary} /></View>
                <Text style={[styles.inputText, { color: theme.textPrimary, fontSize }, !value && { color: isDark ? '#475569' : '#BBBBBB' }]}>{value || placeholder}</Text>
                <ChevronDown size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const Selector = ({ label, options, selected, onSelect }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>{label}</Text>
            <View style={styles.selectorRow}>
                {options.map((opt: string) => {
                    const isAct = selected === opt;
                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[
                                styles.selectorItem,
                                { borderColor: isDark ? '#334155' : '#E2E8F0', backgroundColor: isDark ? '#1E293B' : '#F8FAFC' },
                                isAct && { borderColor: theme.primary, backgroundColor: isDark ? theme.primary + '30' : theme.lightBg }
                            ]}
                            onPress={() => onSelect(opt)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.selectorText, { fontSize: fontSize }, isAct && { color: theme.primary, fontWeight: '700' }]}>{opt}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

// ─── Simple options drawer (gender, proof, relation) ─────────────────────────
const OptionsDrawer = ({ visible, title, data, selectedId, onSelect, onClose, keyExtractor, labelExtractor, searchable }: any) => {
    const [search, setSearch] = React.useState('');
    const filtered = React.useMemo(() => {
        if (!searchable || !search) return data;
        return data.filter((item: any) => labelExtractor(item).toLowerCase().includes(search.toLowerCase()));
    }, [data, search, searchable, labelExtractor]);

    return (
        <ModalSheet visible={visible} onClose={() => { setSearch(''); onClose(); }} maxHeight="70%">
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{title}</Text>
                <TouchableOpacity onPress={() => { setSearch(''); onClose(); }} style={styles.doneBtn}><Text style={styles.doneBtnText}>Done</Text></TouchableOpacity>
            </View>
            {searchable && (
                <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                    <TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} />
                </View>
            )}
            <FlatList
                data={filtered}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const isSelected = selectedId === keyExtractor(item);
                    return (
                        <TouchableOpacity style={[styles.optionRow, isSelected && styles.optionRowActive]} onPress={() => { onSelect(item); setSearch(''); onClose(); }} activeOpacity={0.7}>
                            <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{labelExtractor(item)}</Text>
                            {isSelected && <Check size={18} color="#FF6B6B" />}
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={<View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: '#94A3B8', fontSize: 14 }}>No options</Text></View>}
                contentContainerStyle={{ paddingBottom: 40 }}
            />
        </ModalSheet>
    );
};

// ─── Aadhaar photo capture ────────────────────────────────────────────────────
const AadhaarCapture = ({ label, uri, onCapture, onRemove }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const pick = () => {
        Alert.alert('Add Photo', label, [
            { text: '📷 Camera', onPress: async () => {
                const p = await ImagePicker.requestCameraPermissionsAsync();
                if (!p.granted) return;
                const r = await ImagePicker.launchCameraAsync({ quality: 0.7 });
                if (!r.canceled) onCapture(r.assets[0].uri);
            }},
            { text: '🖼️ Gallery', onPress: async () => {
                const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!p.granted) return;
                const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
                if (!r.canceled) onCapture(r.assets[0].uri);
            }},
            { text: 'Cancel', style: 'cancel' },
        ]);
    };
    return (
        <View style={{ flex: 1 }}>
            <Text style={[styles.photoLabel, { fontSize: fontSize - 2, color: theme.textSecondary }]}>{label}</Text>
            {uri ? (
                <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri }} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.photoRemoveBtn} onPress={onRemove}><X size={13} color="#FFF" /></TouchableOpacity>
                    <TouchableOpacity style={[styles.photoRetakeRow, { backgroundColor: isDark ? '#1E293BCC' : '#FFFFFFCC' }]} onPress={pick}>
                        <Camera size={13} color={theme.primary} /><Text style={{ fontSize: 10, color: theme.primary, fontWeight: '700', marginLeft: 3 }}>Retake</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={[styles.photoCaptureBtn, { backgroundColor: isDark ? '#1E293B' : theme.lightBg, borderColor: isDark ? '#334155' : COLORS.border, borderStyle: 'dashed', borderWidth: 1.5, borderRadius: 12, height: 110, alignItems: 'center', justifyContent: 'center' }]}
                    onPress={pick}
                    activeOpacity={0.75}
                >
                    <Camera size={26} color={theme.primary} />
                    <Text style={[styles.photoCaptureText, { color: theme.primary, fontSize: fontSize - 2, fontWeight: '600', marginTop: 4 }]}>Tap to add</Text>
                    <Text style={[styles.photoCaptureHint, { fontSize: fontSize - 4, color: theme.textSecondary }]}>Camera or Gallery</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

// ─── Profile avatar capture at top ───────────────────────────────────────────
const ProfilePhotoCapture = ({ uri, onCapture, onRemove }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const pick = () => {
        Alert.alert('Profile Photo', 'Choose source', [
            { text: '📷 Camera', onPress: async () => {
                const p = await ImagePicker.requestCameraPermissionsAsync();
                if (!p.granted) return;
                const r = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
                if (!r.canceled) onCapture(r.assets[0].uri);
            }},
            { text: '🖼️ Gallery', onPress: async () => {
                const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!p.granted) return;
                const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
                if (!r.canceled) onCapture(r.assets[0].uri);
            }},
            { text: 'Cancel', style: 'cancel' },
        ]);
    };
    return (
        <View style={styles.profilePhotoWrap}>
            <TouchableOpacity onPress={pick} activeOpacity={0.85}>
                {uri ? (
                    <View>
                        <Image source={{ uri }} style={[styles.profileAvatar, { borderColor: theme.primary }]} />
                        <View style={[styles.profileEditBadge, { backgroundColor: theme.primary }]}><Camera size={14} color="#FFF" /></View>
                        <TouchableOpacity style={styles.profileRemoveBtn} onPress={onRemove}><X size={12} color="#FFF" /></TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.profileAvatarPlaceholder, { backgroundColor: isDark ? '#1E293B' : theme.lightBg, borderColor: isDark ? '#334155' : COLORS.border }]}>
                        <User size={38} color={theme.primary} />
                        <View style={[styles.profileEditBadge, { backgroundColor: theme.primary }]}><Camera size={14} color="#FFF" /></View>
                    </View>
                )}
            </TouchableOpacity>
            <Text style={[styles.profilePhotoHint, { fontSize: fontSize - 2, color: theme.textSecondary }]}>{uri ? 'Tap to change photo' : 'Add profile photo'}</Text>
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const AddStudentScreen = ({ navigation, route }: any) => {
    const { user } = useAuth();
    const { theme, isDark, fontSize } = useTheme();
    const { student, isEdit } = route.params || {};
    const { showSuccess, showError, showApiError } = useToast();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
    const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        first_name: '', last_name: '', gender: 'Male', phone: '', email: '',
        date_of_birth: '', id_proof_number: '', id_proof_type_id: '',
        guardian_name: '', guardian_phone: '', guardian_relation_id: '',
        admission_date: new Date().toISOString().split('T')[0],
        admission_fee: '0', admission_status: 'Paid', permanent_address: '',
        room_id: '', bed_id: '', floor_number: '', monthly_rent: '',
    });

    const [idProofTypes, setIdProofTypes] = useState<any[]>([]);
    const [relations, setRelations] = useState<any[]>([]);
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [bedsLoading, setBedsLoading] = useState(false);

    const [roomModal, setRoomModal] = useState(false);
    const [bedModal, setBedModal] = useState(false);
    const [genderModal, setGenderModal] = useState(false);
    const [proofModal, setProofModal] = useState(false);
    const [relationModal, setRelationModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateMode, setDateMode] = useState<'dob' | 'admission'>('dob');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const selectedRoom = availableRooms.find(r => r.room_id?.toString() === formData.room_id);
    const selectedBed = beds.find(b => b.bed_id?.toString() === formData.bed_id);

    const selectedIdProofName = idProofTypes.find(t => t.id.toString() === formData.id_proof_type_id)?.name || '';
    const showIdPhotos = selectedIdProofName.toLowerCase().includes('aadhaar') || selectedIdProofName.toLowerCase().includes('pan');

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    useEffect(() => {
        fetchInitialData();
        if (isEdit && student) {
            setFormData({
                first_name: student.first_name || '',
                last_name: student.last_name || '',
                gender: student.gender || 'Male',
                phone: student.phone ? student.phone.replace(/\D/g, '').slice(0, 10) : '',
                email: student.email || '',
                date_of_birth: student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : '',
                id_proof_number: student.id_proof_number || '',
                id_proof_type_id: student.id_proof_type ? student.id_proof_type.toString() : '',
                guardian_name: student.guardian_name || '',
                guardian_phone: student.guardian_phone && student.guardian_phone !== '0000000000' ? student.guardian_phone.replace(/\D/g, '').slice(0, 10) : '',
                guardian_relation_id: student.guardian_relation ? student.guardian_relation.toString() : '',
                admission_date: student.admission_date ? new Date(student.admission_date).toISOString().split('T')[0] : '',
                admission_fee: student.admission_fee ? student.admission_fee.toString() : '0',
                admission_status: student.admission_status === 1 ? 'Paid' : 'Unpaid',
                permanent_address: student.permanent_address || '',
                room_id: student.room_id ? student.room_id.toString() : '',
                bed_id: student.bed_id ? student.bed_id.toString() : '',
                floor_number: student.floor_number ? student.floor_number.toString() : '',
                monthly_rent: student.monthly_rent ? student.monthly_rent.toString() : '',
            });
            if (student.photo) setProfilePhoto(student.photo);
        }
    }, [isEdit, student]);

    const fetchInitialData = async () => {
        try {
            const [proofRes, relRes, roomsRes] = await Promise.all([
                api.get('/id-proof-types'),
                api.get('/relations'),
                api.get(`/rooms?hostelId=${user?.hostel_id}&limit=200`),
            ]);
            if (proofRes.data.success) setIdProofTypes(proofRes.data.data);
            if (relRes.data.success) setRelations(relRes.data.data);
            if (roomsRes.data.success) setAvailableRooms(roomsRes.data.data);
        } catch (e) { console.error(e); }
    };

    const fetchBeds = useCallback(async (roomId: string) => {
        setBedsLoading(true);
        try {
            const res = await api.get(`/rooms/${roomId}/beds`);
            if (res.data.success) { setBeds(res.data.data); return; }
        } catch {}
        const room = availableRooms.find(r => r.room_id?.toString() === roomId);
        const cap = room?.capacity ?? 1;
        const fake = Array.from({ length: Number(cap) }, (_, i) => ({
            bed_id: `${roomId}_${i + 1}`,
            bed_name: `${room?.room_number}${String.fromCharCode(65 + i)}`,
            status: i < (room?.available_beds ?? cap) ? 'available' : 'occupied',
            student_id: i < (room?.available_beds ?? cap) ? null : 1,
        }));
        setBeds(fake);
        setBedsLoading(false);
    }, [availableRooms]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!formData.first_name) e.first_name = 'First name is required';
        if (!formData.phone) e.phone = 'Phone is required';
        else if (!/^\d{10}$/.test(formData.phone)) e.phone = 'Must be exactly 10 digits';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email format';
        if (formData.guardian_phone && !/^\d{10}$/.test(formData.guardian_phone)) e.guardian_phone = 'Must be exactly 10 digits';
        if (!formData.admission_date) e.admission_date = 'Admission date is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) { showError('Please fix the highlighted fields.'); return; }
        setLoading(true);
        try {
            const payload = {
                ...formData,
                hostel_id: user?.hostel_id,
                guardian_phone: formData.guardian_phone || '0000000000',
                guardian_name: formData.guardian_name || 'N/A',
                admission_fee: parseFloat(formData.admission_fee || '0'),
                admission_status: formData.admission_status === 'Paid' ? 1 : 0,
                status: isEdit ? student.status : 1,
                room_id: formData.room_id ? parseInt(formData.room_id) : null,
                bed_id: formData.bed_id || null,
                floor_number: formData.floor_number ? parseInt(formData.floor_number) : null,
                id_proof_type: formData.id_proof_type_id || null,
                guardian_relation: formData.guardian_relation_id || null,
                id_proof_status: 1,
                monthly_rent: parseFloat(formData.monthly_rent || '0'),
            };
            const res = isEdit ? await api.put(`/students/${student.student_id}`, payload) : await api.post('/students', payload);
            if (res.data.success) {
                showSuccess(`Tenant ${isEdit ? 'updated' : 'registered'} successfully!`);
                navigation.goBack();
            }
        } catch (error: any) {
            showApiError(error, 'Failed to save tenant');
        } finally { setLoading(false); }
    };

    const handleReset = () => {
        setFormData({ first_name: '', last_name: '', gender: 'Male', phone: '', email: '', date_of_birth: '', id_proof_number: '', id_proof_type_id: '', guardian_name: '', guardian_phone: '', guardian_relation_id: '', admission_date: new Date().toISOString().split('T')[0], admission_fee: '0', admission_status: 'Paid', permanent_address: '', room_id: '', bed_id: '', floor_number: '', monthly_rent: '' });
        setProfilePhoto(null); setAadhaarFront(null); setAadhaarBack(null); setErrors({});
    };

    const up = (key: string, val: any) => setFormData(p => ({ ...p, [key]: val }));

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: theme.background }]}
            keyboardVerticalOffset={0}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <AppHeader title={isEdit ? 'Edit Tenant' : 'Add Tenant'} />
            <FullScreenLoader visible={loading} />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
                keyboardShouldPersistTaps="handled"
            >

                {/* ── Profile Photo ── */}
                <ProfilePhotoCapture uri={profilePhoto} onCapture={setProfilePhoto} onRemove={() => setProfilePhoto(null)} />

                {/* ── Basic Info ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>👤 Basic Information</Text>
                    <FormInput label="First Name *" icon={User} placeholder="e.g. Ravi" value={formData.first_name} error={errors.first_name}
                        onChangeText={(t: string) => { up('first_name', t.replace(/[^a-zA-Z0-9\s]/g, '')); if (errors.first_name && t) setErrors(p => { const e = { ...p }; delete e.first_name; return e; }); }} />
                    <FormInput label="Last Name" icon={User} placeholder="e.g. Kumar" value={formData.last_name} onChangeText={(t: string) => up('last_name', t.replace(/[^a-zA-Z0-9\s]/g, ''))} />
                    <SelectField label="Gender *" value={formData.gender} placeholder="Gender" icon={Users} onPress={() => setGenderModal(true)} />
                    <SelectField label="Date of Birth" icon={Calendar} placeholder="Pick date" value={formData.date_of_birth} onPress={() => { setDateMode('dob'); setShowDatePicker(true); }} />
                    <FormInput label="Phone *" icon={Phone} placeholder="9876543210" keyboardType="phone-pad" value={formData.phone} error={errors.phone}
                        onChangeText={(t: string) => { const c = t.replace(/\D/g, '').slice(0, 10); up('phone', c); if (errors.phone && c.length === 10) setErrors(p => { const e = { ...p }; delete e.phone; return e; }); }} />
                    <FormInput label="Email" icon={Mail} placeholder="tenant@email.com" keyboardType="email-address" value={formData.email} error={errors.email}
                        onChangeText={(t: string) => up('email', t.trim())} />
                </View>

                {/* ── Identity & Aadhaar ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>🪪 Identity & Documents</Text>
                    <SelectField label="ID Proof Type" value={idProofTypes.find(t => t.id.toString() === formData.id_proof_type_id)?.name} placeholder="Select ID Type" icon={Fingerprint} onPress={() => setProofModal(true)} />
                    <FormInput label="Aadhaar / ID Number" icon={CreditCard} placeholder="Enter ID number" value={formData.id_proof_number}
                        onChangeText={(t: string) => up('id_proof_number', t)} />
                    
                    {showIdPhotos && (
                        <>
                            <Text style={[styles.photoSectionLabel, { fontSize: fontSize - 1, color: theme.textPrimary, marginTop: 10 }]}>📸 {selectedIdProofName} Photos <Text style={{ color: theme.textSecondary, fontWeight: '400', fontSize: fontSize - 3 }}>(stored locally)</Text></Text>
                            <View style={{ gap: 14, marginTop: 8 }}>
                                <AadhaarCapture label="Front Side" uri={aadhaarFront} onCapture={setAadhaarFront} onRemove={() => setAadhaarFront(null)} />
                                <AadhaarCapture label="Back Side" uri={aadhaarBack} onCapture={setAadhaarBack} onRemove={() => setAadhaarBack(null)} />
                            </View>
                        </>
                    )}
                </View>

                {/* ── Guardian (Optional) ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>👨‍👩‍👦 Guardian <Text style={{ fontWeight: '400', color: theme.textSecondary, fontSize: 12 }}>(Optional)</Text></Text>
                    <FormInput label="Guardian Name" icon={User} placeholder="Parent / Guardian" value={formData.guardian_name} onChangeText={(t: string) => up('guardian_name', t.replace(/[^a-zA-Z0-9\s]/g, ''))} />
                    <SelectField label="Relation" value={relations.find(r => r.relation_id.toString() === formData.guardian_relation_id)?.relation_name} placeholder="Relation" icon={Users} onPress={() => setRelationModal(true)} />
                    <FormInput label="Guardian Phone" icon={Phone} placeholder="9876543211" keyboardType="phone-pad" value={formData.guardian_phone} error={errors.guardian_phone}
                        onChangeText={(t: string) => { const c = t.replace(/\D/g, '').slice(0, 10); up('guardian_phone', c); }} />
                </View>

                {/* ── Admission ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>📋 Admission Details</Text>
                    <SelectField label="Admission Date *" icon={Calendar} placeholder="Pick date" value={formData.admission_date} error={errors.admission_date} onPress={() => { setDateMode('admission'); setShowDatePicker(true); }} />
                    <FormInput label="Admission Fee (₹)" icon={CreditCard} placeholder="0" keyboardType="numeric" value={formData.admission_fee} onChangeText={(t: string) => up('admission_fee', t.replace(/\D/g, ''))} />
                    <Selector label="Payment Status" options={['Paid', 'Unpaid']} selected={formData.admission_status} onSelect={(v: string) => up('admission_status', v)} />
                </View>

                {/* ── Room & Bed ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>🏠 Room & Bed Allocation</Text>
                    {selectedRoom && (
                        <View style={[styles.allocationSummary, { backgroundColor: isDark ? '#1E293B' : COLORS.primaryLight, borderColor: isDark ? '#334155' : COLORS.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.allocationLabel}>Room</Text>
                                <Text style={[styles.allocationValue, { color: theme.textPrimary }]}>Room {selectedRoom.room_number}</Text>
                                <Text style={[styles.allocationMeta, { color: theme.textSecondary }]}>Floor {selectedRoom.floor_number ?? '—'}  •  ₹{selectedRoom.rent_per_bed ?? '—'}/bed</Text>
                            </View>
                            <View style={[styles.allocationDivider, { backgroundColor: isDark ? '#334155' : COLORS.border }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.allocationLabel}>Bed</Text>
                                <Text style={[styles.allocationValue, { color: theme.textPrimary }, !selectedBed && { color: theme.textSecondary, fontSize: 14 }]}>
                                    {selectedBed ? (selectedBed.bed_name ?? `Bed`) : 'Not selected'}
                                </Text>
                                {selectedBed && <Text style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>● Available</Text>}
                            </View>
                        </View>
                    )}
                    <View style={{ gap: 12 }}>
                        <TouchableOpacity style={[styles.allocationBtn, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E2E8F0' }, selectedRoom && { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight, borderColor: theme.primary }]} onPress={() => setRoomModal(true)} activeOpacity={0.8}>
                            <Home size={17} color={selectedRoom ? theme.primary : theme.textSecondary} />
                            <Text style={[styles.allocationBtnText, { color: theme.textSecondary }, selectedRoom && { color: theme.primary }]} numberOfLines={1}>{selectedRoom ? `Room ${selectedRoom.room_number}` : 'Select Room'}</Text>
                            <ChevronDown size={15} color={selectedRoom ? theme.primary : theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.allocationBtn, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E2E8F0' }, selectedBed && { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight, borderColor: theme.primary }, !selectedRoom && styles.allocationBtnDisabled]}
                            onPress={() => { if (!selectedRoom) { Alert.alert('Select Room First', 'Please pick a room first.'); return; } setBedModal(true); }} activeOpacity={0.8}>
                            <BedDouble size={17} color={selectedBed ? theme.primary : !selectedRoom ? (isDark ? '#334155' : '#CBD5E1') : theme.textSecondary} />
                            <Text style={[styles.allocationBtnText, { color: theme.textSecondary }, selectedBed && { color: theme.primary }, !selectedRoom && { color: isDark ? '#334155' : '#CBD5E1' }]} numberOfLines={1}>{selectedBed ? (selectedBed.bed_name ?? 'Bed') : 'Select Bed'}</Text>
                            <ChevronDown size={15} color={selectedBed ? theme.primary : theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    {selectedRoom && (
                        <TouchableOpacity onPress={() => { up('room_id', ''); up('bed_id', ''); up('floor_number', ''); up('monthly_rent', ''); setBeds([]); }} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
                            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>✕ Clear allocation</Text>
                        </TouchableOpacity>
                    )}
                    <FormInput label="Monthly Rent (₹)" icon={CreditCard} placeholder="Auto-filled from room" keyboardType="numeric" value={formData.monthly_rent}
                        onChangeText={(t: string) => up('monthly_rent', t.replace(/\D/g, ''))} />
                </View>

                {/* ── Address ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>📍 Address</Text>
                    <FormInput label="Permanent Address" icon={MapPin} placeholder="Full home address..." multiline value={formData.permanent_address} onChangeText={(t: string) => up('permanent_address', t)} />
                </View>

                {/* ── Buttons (scroll content) ── */}
                <View style={{ height: 8 }} />
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
                    style={[styles.submitButton, loading && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={loading ? ['#BBB', '#999'] : [theme.gradientStart, theme.gradientEnd]}
                        style={styles.submitGradient}
                    >
                        {loading
                            ? <ActivityIndicator color="#FFF" size="small" />
                            : <Text style={styles.submitText}>{isEdit ? 'Update Tenant' : 'Add Tenant'}</Text>
                        }
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* ── Drawers ── */}
            <OptionsDrawer visible={genderModal} title="Select Gender" data={['Male', 'Female', 'Other']} selectedId={formData.gender} keyExtractor={(i: string) => i} labelExtractor={(i: string) => i} onSelect={(i: string) => up('gender', i)} onClose={() => setGenderModal(false)} />
            <OptionsDrawer visible={proofModal} title="ID Proof Type" data={idProofTypes} selectedId={formData.id_proof_type_id} keyExtractor={(i: any) => i.id.toString()} labelExtractor={(i: any) => i.name} onSelect={(i: any) => up('id_proof_type_id', i.id.toString())} onClose={() => setProofModal(false)} />
            <OptionsDrawer visible={relationModal} title="Relation" data={relations} selectedId={formData.guardian_relation_id} keyExtractor={(i: any) => i.relation_id.toString()} labelExtractor={(i: any) => i.relation_name} onSelect={(i: any) => up('guardian_relation_id', i.relation_id.toString())} onClose={() => setRelationModal(false)} />

            <RoomPickerDrawer visible={roomModal} rooms={availableRooms} selectedRoomId={formData.room_id}
                onSelectRoom={(room: any) => { up('room_id', room.room_id.toString()); up('floor_number', room.floor_number?.toString() || ''); up('monthly_rent', room.rent_per_bed?.toString() || room.base_rent?.toString() || formData.monthly_rent); up('bed_id', ''); setBeds([]); fetchBeds(room.room_id.toString()); }}
                onClose={() => setRoomModal(false)} />

            <BedPickerDrawer visible={bedModal} room={selectedRoom} beds={beds} selectedBedId={formData.bed_id} loading={bedsLoading}
                onSelectBed={(bed: any) => up('bed_id', bed.bed_id?.toString())} onClose={() => setBedModal(false)} />

            <DateTimePickerModal isVisible={showDatePicker} mode="date"
                date={(() => { try { const d = dateMode === 'dob' ? (formData.date_of_birth ? new Date(formData.date_of_birth) : new Date(2000, 0, 1)) : (formData.admission_date ? new Date(formData.admission_date) : new Date()); return isNaN(d.getTime()) ? new Date() : d; } catch { return new Date(); } })()}
                onConfirm={(d: Date) => { setShowDatePicker(false); const s = d.toISOString().split('T')[0]; dateMode === 'dob' ? up('date_of_birth', s) : up('admission_date', s); }}
                onCancel={() => setShowDatePicker(false)} />
        </KeyboardAvoidingView>
    );
};

// ── Floor-grouped room picker ────────────────────────────────────────────────
const RoomPickerDrawer = ({ visible, rooms, selectedRoomId, onSelectRoom, onClose }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const [search, setSearch] = useState('');
    const grouped = React.useMemo(() => {
        const f = search ? rooms.filter((r: any) => r.room_number?.toString().includes(search)) : rooms;
        const map: Record<number, any[]> = {};
        f.forEach((r: any) => { const fl = r.floor_number ?? 0; if (!map[fl]) map[fl] = []; map[fl].push(r); });
        return Object.keys(map).sort((a, b) => Number(a) - Number(b)).map(fl => ({ floor: Number(fl), rooms: map[Number(fl)] }));
    }, [rooms, search]);

    const statusColor = (r: any) => r.status === 'MAINTENANCE' ? '#F97316' : (r.available_beds ?? 0) > 0 ? '#16A34A' : '#DC2626';

    return (
        <ModalSheet visible={visible} onClose={() => { setSearch(''); onClose(); }} maxHeight="90%">
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Select Room</Text>
                <TouchableOpacity onPress={() => { setSearch(''); onClose(); }} style={[styles.doneBtn, { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight }]}><Text style={[styles.doneBtnText, { color: theme.primary }]}>Close</Text></TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, marginBottom: 8, marginTop: 8 }}>
                <View style={[styles.searchBarWrap, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <Text style={{ color: theme.textSecondary, marginRight: 8, fontSize: 16 }}>🔍</Text>
                    <TextInput style={{ flex: 1, fontSize: 15, color: theme.textPrimary }} placeholder="Search room..." placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={search} onChangeText={setSearch} />
                </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}>
                {grouped.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: theme.textSecondary }}>No rooms found</Text></View>}
                {grouped.map(({ floor, rooms: fr }) => (
                    <View key={floor}>
                        <View style={[styles.floorChip, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}><Text style={[styles.floorChipText, { color: theme.textSecondary }]}>FLOOR {floor}</Text></View>
                        {fr.map((room: any) => {
                            const isSel = selectedRoomId === room.room_id?.toString();
                            const avail = room.available_beds ?? 0;
                            return (
                                <TouchableOpacity key={room.room_id}
                                    style={[styles.roomCard, { backgroundColor: isDark ? '#1E293B' : COLORS.primaryLight, borderColor: isDark ? '#334155' : COLORS.border }, isSel && { borderColor: theme.primary }, avail <= 0 && { opacity: 0.55 }]}
                                    onPress={() => { onSelectRoom(room); setSearch(''); onClose(); }} activeOpacity={0.75}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={[styles.roomNum, { fontSize: fontSize + 4, color: theme.textPrimary }, isSel && { color: theme.primary }]}>{room.room_number}</Text>
                                        {!isSel && <Text style={[styles.roomCap, { fontSize: fontSize - 1, color: theme.textSecondary }]}>Cap: {room.capacity ?? '—'}</Text>}
                                    </View>
                                    <Text style={[styles.roomAvail, { fontSize: fontSize - 1, color: statusColor(room) }]}>Available: {avail}</Text>
                                    <Text style={[styles.roomRent, { fontSize: fontSize - 1, color: theme.textSecondary }]}>Rent: ₹{room.rent_per_bed ?? room.base_rent ?? '—'}</Text>
                                    {isSel && (
                                        <View style={[styles.selectedBadge, { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight }]}>
                                            <Check size={11} color={theme.primary} />
                                            <Text style={[styles.selectedBadgeText, { color: theme.primary }]}>Selected</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </ScrollView>
        </ModalSheet>
    );
};

// ─── Bed picker ───────────────────────────────────────────────────────────────
const BedPickerDrawer = ({ visible, room, beds, selectedBedId, onSelectBed, onClose, loading }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <ModalSheet visible={visible} onClose={onClose} maxHeight="65%">
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Beds in Room {room?.room_number}</Text>
                <TouchableOpacity onPress={onClose} style={[styles.doneBtn, { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight }]}><Text style={[styles.doneBtnText, { color: theme.primary }]}>Close</Text></TouchableOpacity>
            </View>
            {room && <View style={{ paddingHorizontal: 16, marginBottom: 8, marginTop: 8 }}><View style={[styles.floorChip, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}><Text style={[styles.floorChipText, { color: theme.textSecondary }]}>ROOM {room.room_number}</Text></View></View>}
            {loading ? (
                <ActivityIndicator color={theme.primary} size="large" style={{ marginVertical: 40 }} />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
                    {beds.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: theme.textSecondary }}>No beds in this room</Text></View>}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {beds.map((bed: any) => {
                            const isAvail = !bed.student_id || bed.status === 'available';
                            const isSel = selectedBedId === bed.bed_id?.toString();
                            return (
                                <TouchableOpacity key={bed.bed_id}
                                    style={[
                                        styles.bedCard,
                                        { backgroundColor: isDark ? '#1E293B' : COLORS.primaryLight, borderColor: isDark ? '#334155' : COLORS.border },
                                        isSel && { borderColor: theme.primary },
                                        !isAvail && { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#1E293B' : '#E2E8F0', opacity: 0.65 }
                                    ]}
                                    onPress={() => { if (!isAvail) return; onSelectBed(bed); onClose(); }} activeOpacity={0.75}>
                                    <BedDouble size={20} color={isSel ? theme.primary : !isAvail ? (isDark ? '#334155' : '#CBD5E1') : theme.textSecondary} />
                                    <Text style={[styles.bedName, { fontSize: fontSize + 2, color: theme.textPrimary }, isSel && { color: theme.primary }, !isAvail && { color: theme.textSecondary }]}>{bed.bed_name ?? `Bed ${bed.bed_number}`}</Text>
                                    <Text style={{ fontSize: fontSize - 3, fontWeight: '700', color: isAvail ? '#16A34A' : '#DC2626', marginTop: 2 }}>{isAvail ? '● AVAILABLE' : '● OCCUPIED'}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
        </ModalSheet>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

    // Profile photo
    profilePhotoWrap: { alignItems: 'center', marginVertical: 20 },
    profileAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3 },
    profileAvatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderStyle: 'dashed' },
    profileEditBadge: { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
    profileRemoveBtn: { position: 'absolute', top: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center' },
    profilePhotoHint: { marginTop: 8, fontWeight: '500' },

    formCard: { borderRadius: 18, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    sectionTitle: { fontWeight: '700', marginBottom: 16, borderBottomWidth: 1, paddingBottom: 10 },
    inputGroup: { marginBottom: 14 },
    inputLabel: { fontWeight: '600', marginBottom: 7, marginLeft: 2 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 50, borderWidth: 1 },
    inputError: { backgroundColor: '#FEF2F2', borderColor: '#EF4444', borderWidth: 1.5 },
    multilineContainer: { height: 100, alignItems: 'flex-start', paddingTop: 12 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1 },
    inputText: { flex: 1, fontWeight: '500' },
    multilineInput: { textAlignVertical: 'top', height: 80 },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '500' },
    selectorRow: { flexDirection: 'row', gap: 10 },
    selectorItem: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
    selectorText: { color: '#64748B', fontWeight: '500' },
    row: { flexDirection: 'row' },

    // Aadhaar photo
    photoSectionLabel: { fontWeight: '700' },
    photoLabel: { fontWeight: '600', marginBottom: 7 },
    photoCaptureBtn: { flex: 1 },
    photoCaptureText: { fontWeight: '600' },
    photoCaptureHint: { marginTop: 2 },
    photoPreviewWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
    photoPreview: { width: '100%', height: 110, borderRadius: 12 },
    photoRemoveBtn: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(239,68,68,0.9)', alignItems: 'center', justifyContent: 'center' },
    photoRetakeRow: { position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },

    allocationSummary: { flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1 },
    allocationLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 3 },
    allocationValue: { fontSize: 16, fontWeight: '700' },
    allocationMeta: { fontSize: 11, marginTop: 2 },
    allocationDivider: { width: 1, marginHorizontal: 14 },
    allocationBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13, borderWidth: 1, gap: 6 },
    allocationBtnDisabled: { opacity: 0.45 },
    allocationBtnText: { flex: 1, fontSize: 14, fontWeight: '600' },

    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
    sheetTitle: { fontSize: 17, fontWeight: '700' },
    doneBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8 },
    doneBtnText: { fontWeight: '700', fontSize: 14 },
    searchInput: { borderRadius: 10, padding: 12, fontSize: 15 },
    searchBarWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },

    optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1 },
    optionRowActive: { backgroundColor: COLORS.primaryLight },
    optionLabel: { color: '#334155', fontWeight: '500' },
    optionLabelActive: { fontWeight: '700' },

    floorChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10, marginTop: 8 },
    floorChipText: { fontSize: 11, fontWeight: '700' },
    roomCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1.5, position: 'relative' },
    roomCardSel: {},
    roomNum: { fontWeight: '700' },
    roomCap: { fontWeight: '600' },
    roomAvail: { fontWeight: '700', marginTop: 4 },
    roomRent: { marginTop: 3 },
    selectedBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    selectedBadgeText: { fontSize: 11, fontWeight: '700' },

    bedCard: { borderRadius: 12, padding: 14, borderWidth: 1.5, width: '47%', alignItems: 'center', gap: 6 },
    bedCardSel: {},
    bedCardOcc: { opacity: 0.65 },
    bedName: { fontWeight: '700' },

    // Buttons & sticky footer
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
    cancelButton: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
    cancelButtonText: { color: '#475569', fontWeight: '600', fontSize: 15 },
    submitButton: { flex: 2, height: 50, borderRadius: 12, overflow: 'hidden' },
    disabledButton: { opacity: 0.7 },
    submitGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    submitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

export default AddStudentScreen;