import React, { useState, useEffect, useCallback } from 'react';
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
    Modal,
    FlatList,
    Image,
    Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ArrowLeft, User, Phone, Mail, Home, MapPin,
    ChevronRight, Calendar, CreditCard, Users,
    Fingerprint, Layers, Check, ChevronDown,
    Camera, X, Image as ImageIcon, BedDouble,
} from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import api from '../services/api';
import { showErrorToast, showSuccessToast } from '../hooks/Toastconfig';

// ─── Reusable Components ─────────────────────────────────────────────────────

const FormInput = ({ label, icon: Icon, placeholder, value, onChangeText, keyboardType, multiline, error }: any) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={[styles.inputContainer, multiline && styles.multilineContainer, error && styles.inputError]}>
            <View style={styles.inputIcon}>
                <Icon size={18} color={error ? '#EF4444' : '#FF6B6B'} />
            </View>
            <TextInput
                style={[styles.input, multiline && styles.multilineInput, Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}]}
                placeholder={placeholder}
                placeholderTextColor="#BBBBBB"
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                multiline={multiline}
                numberOfLines={multiline ? 4 : 1}
                underlineColorAndroid="transparent"
            />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

const SelectField = ({ label, value, placeholder, icon: Icon, onPress, error }: any) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TouchableOpacity style={[styles.inputContainer, error && styles.inputError]} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.inputIcon}>
                <Icon size={18} color={error ? '#EF4444' : '#FF6B6B'} />
            </View>
            <Text style={[styles.inputText, !value && { color: '#BBBBBB' }]}>{value || placeholder}</Text>
            <ChevronDown size={18} color="#94A3B8" />
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

const Selector = ({ label, options, selected, onSelect }: any) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.selectorRow}>
            {options.map((opt: string) => (
                <TouchableOpacity
                    key={opt}
                    style={[styles.selectorItem, selected === opt && styles.selectorItemActive]}
                    onPress={() => onSelect(opt)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.selectorText, selected === opt && styles.selectorTextActive]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

// ─── Simple bottom drawer (gender, proof, relation) ──────────────────────────
const BottomDrawer = ({ visible, title, data, selectedId, onSelect, onClose, keyExtractor, labelExtractor, emptyText, searchable }: any) => {
    const [search, setSearch] = React.useState('');
    const filtered = React.useMemo(() => {
        if (!searchable || !search) return data;
        return data.filter((item: any) => labelExtractor(item).toLowerCase().includes(search.toLowerCase()));
    }, [data, search, searchable, labelExtractor]);

    return (
        <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={styles.modalContent} onPress={e => e.stopPropagation()}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                            <Text style={styles.closeText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    {searchable && (
                        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                            <TextInput
                                style={{ backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, fontSize: 15, color: '#1E293B' }}
                                placeholder="Search..."
                                placeholderTextColor="#94A3B8"
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>
                    )}
                    <FlatList
                        data={filtered}
                        keyExtractor={keyExtractor}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Text style={{ color: '#94A3B8', fontSize: 14 }}>{emptyText || 'No options available'}</Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const isSelected = selectedId === keyExtractor(item);
                            return (
                                <TouchableOpacity
                                    style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                                    onPress={() => { onSelect(item); onClose(); }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{labelExtractor(item)}</Text>
                                    {isSelected && <Check size={20} color="#FF6B6B" />}
                                </TouchableOpacity>
                            );
                        }}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

// ─── Visual Room Picker ───────────────────────────────────────────────────────
const RoomPickerModal = ({ visible, rooms, selectedRoomId, onSelectRoom, onClose }: any) => {
    const [search, setSearch] = useState('');

    // Group rooms by floor
    const grouped = React.useMemo(() => {
        const filtered = search
            ? rooms.filter((r: any) => r.room_number?.toString().includes(search))
            : rooms;
        const map: Record<number, any[]> = {};
        filtered.forEach((r: any) => {
            const floor = r.floor_number ?? 0;
            if (!map[floor]) map[floor] = [];
            map[floor].push(r);
        });
        return Object.keys(map)
            .sort((a, b) => Number(a) - Number(b))
            .map(floor => ({ floor: Number(floor), rooms: map[Number(floor)] }));
    }, [rooms, search]);

    const statusColor = (r: any) => {
        const avail = r.available_beds ?? 0;
        if (r.status === 'MAINTENANCE') return '#F97316';
        return avail > 0 ? '#16A34A' : '#DC2626';
    };

    const statusLabel = (r: any) => {
        if (r.status === 'MAINTENANCE') return 'MAINTENANCE';
        return (r.available_beds ?? 0) > 0 ? 'AVAILABLE' : 'FULL';
    };

    return (
        <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Room</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
                    </View>
                    {/* Search */}
                    <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
                        <View style={styles.searchBar}>
                            <Text style={{ color: '#94A3B8', marginRight: 8 }}>🔍</Text>
                            <TextInput
                                style={{ flex: 1, fontSize: 15, color: '#1E293B' }}
                                placeholder="Search room number..."
                                placeholderTextColor="#94A3B8"
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}>
                        {grouped.length === 0 ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Text style={{ color: '#94A3B8' }}>No rooms found</Text>
                            </View>
                        ) : grouped.map(({ floor, rooms: floorRooms }) => (
                            <View key={floor}>
                                <View style={styles.floorLabel}>
                                    <Text style={styles.floorLabelText}>FLOOR {floor}</Text>
                                </View>
                                {floorRooms.map((room: any) => {
                                    const isSelected = selectedRoomId === room.room_id?.toString();
                                    const avail = room.available_beds ?? 0;
                                    const isDisabled = avail <= 0 && room.status !== 'AVAILABLE';
                                    return (
                                        <TouchableOpacity
                                            key={room.room_id}
                                            style={[styles.roomCard, isSelected && styles.roomCardSelected, isDisabled && styles.roomCardDisabled]}
                                            onPress={() => {
                                                if (isDisabled) return;
                                                onSelectRoom(room);
                                                onClose();
                                            }}
                                            activeOpacity={0.75}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Text style={[styles.roomNumber, isSelected && { color: '#FF6B6B' }]}>{room.room_number}</Text>
                                                <Text style={[styles.roomCap, isSelected && { color: '#FF6B6B' }]}>Cap: {room.capacity ?? room.room_type ?? '—'}</Text>
                                            </View>
                                            <Text style={[styles.roomAvailable, { color: statusColor(room) }]}>
                                                Available: {avail}
                                            </Text>
                                            <Text style={styles.roomRent}>Rent: ₹{room.rent_per_bed ?? room.base_rent ?? '—'}</Text>
                                            <Text style={[styles.roomStatus, { color: statusColor(room) }]}>
                                                Status: {statusLabel(room)}
                                            </Text>
                                            {isSelected && (
                                                <View style={styles.roomSelectedBadge}>
                                                    <Check size={12} color="#FF6B6B" />
                                                    <Text style={{ fontSize: 11, color: '#FF6B6B', fontWeight: '700', marginLeft: 3 }}>Selected</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// ─── Visual Bed Picker ────────────────────────────────────────────────────────
const BedPickerModal = ({ visible, room, beds, selectedBedId, onSelectBed, onClose, loading }: any) => (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '70%' }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Beds in Room {room?.room_number}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
                </View>
                {room && (
                    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                        <View style={styles.roomChip}>
                            <Text style={styles.roomChipText}>ROOM {room.room_number}</Text>
                        </View>
                    </View>
                )}
                {loading ? (
                    <ActivityIndicator color="#FF6B6B" style={{ marginVertical: 30 }} />
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}>
                        {beds.length === 0 ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Text style={{ color: '#94A3B8' }}>No beds available in this room</Text>
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                {beds.map((bed: any) => {
                                    const isAvailable = !bed.student_id || bed.status === 'available';
                                    const isSelected = selectedBedId === bed.bed_id?.toString();
                                    return (
                                        <TouchableOpacity
                                            key={bed.bed_id}
                                            style={[
                                                styles.bedCard,
                                                isSelected && styles.bedCardSelected,
                                                !isAvailable && styles.bedCardOccupied,
                                            ]}
                                            onPress={() => {
                                                if (!isAvailable) return;
                                                onSelectBed(bed);
                                                onClose();
                                            }}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[styles.bedName, isSelected && { color: '#FF6B6B' }, !isAvailable && { color: '#94A3B8' }]}>
                                                {bed.bed_name ?? `Bed ${bed.bed_number}`}
                                            </Text>
                                            <Text style={[styles.bedStatus, { color: isAvailable ? '#16A34A' : '#DC2626' }]}>
                                                Status: {isAvailable ? 'AVAILABLE' : 'OCCUPIED'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </View>
    </Modal>
);

// ─── Aadhaar Photo Capture ────────────────────────────────────────────────────
const AadhaarPhotoCapture = ({ label, imageUri, onCapture, onRemove }: any) => {
    const handlePress = () => {
        Alert.alert('Add Photo', `Choose source for ${label}`, [
            {
                text: '📷 Camera',
                onPress: async () => {
                    const perm = await ImagePicker.requestCameraPermissionsAsync();
                    if (!perm.granted) { Alert.alert('Permission needed', 'Camera permission is required.'); return; }
                    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
                    if (!result.canceled && result.assets[0]) onCapture(result.assets[0].uri);
                }
            },
            {
                text: '🖼️ Gallery',
                onPress: async () => {
                    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (!perm.granted) { Alert.alert('Permission needed', 'Gallery permission is required.'); return; }
                    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true });
                    if (!result.canceled && result.assets[0]) onCapture(result.assets[0].uri);
                }
            },
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

    return (
        <View style={styles.photoBox}>
            <Text style={styles.photoLabel}>{label}</Text>
            {imageUri ? (
                <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
                    <TouchableOpacity style={styles.photoRemoveBtn} onPress={onRemove} activeOpacity={0.8}>
                        <X size={14} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoRetakeBtn} onPress={handlePress} activeOpacity={0.8}>
                        <Camera size={14} color="#FF6B6B" />
                        <Text style={{ fontSize: 11, color: '#FF6B6B', fontWeight: '600', marginLeft: 4 }}>Retake</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity style={styles.photoCaptureBtn} onPress={handlePress} activeOpacity={0.7}>
                    <Camera size={28} color="#FF6B6B" />
                    <Text style={styles.photoCaptureText}>Tap to capture</Text>
                    <Text style={styles.photoCaptureHint}>Camera or Gallery</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const AddStudentScreen = ({ navigation, route }: any) => {
    const { user } = useAuth();
    const { student, isEdit } = route.params || {};
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        gender: 'Male',
        phone: '',
        email: '',
        date_of_birth: '',
        id_proof_number: '',
        id_proof_type_id: '',
        guardian_name: '',
        guardian_phone: '',
        guardian_relation_id: '',
        admission_date: new Date().toISOString().split('T')[0],
        admission_fee: '0',
        admission_status: 'Paid',
        permanent_address: '',
        room_id: '',
        bed_id: '',
        floor_number: '',
        monthly_rent: '',
    });

    const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
    const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);

    const [idProofTypes, setIdProofTypes] = useState<any[]>([]);
    const [relations, setRelations] = useState<any[]>([]);
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [bedsLoading, setBedsLoading] = useState(false);

    const [roomModalVisible, setRoomModalVisible] = useState(false);
    const [bedModalVisible, setBedModalVisible] = useState(false);
    const [genderModalVisible, setGenderModalVisible] = useState(false);
    const [proofModalVisible, setProofModalVisible] = useState(false);
    const [relationModalVisible, setRelationModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateMode, setDateMode] = useState<'dob' | 'admission'>('dob');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const selectedRoom = availableRooms.find(r => r.room_id?.toString() === formData.room_id);
    const selectedBed = beds.find(b => b.bed_id?.toString() === formData.bed_id);

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
                guardian_phone: student.guardian_phone && student.guardian_phone !== '0000000000'
                    ? student.guardian_phone.replace(/\D/g, '').slice(0, 10) : '',
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
        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    };

    const fetchBeds = useCallback(async (roomId: string) => {
        setBedsLoading(true);
        try {
            const res = await api.get(`/rooms/${roomId}/beds`);
            if (res.data.success) {
                setBeds(res.data.data);
            } else {
                // fallback: generate beds from room capacity
                const room = availableRooms.find(r => r.room_id?.toString() === roomId);
                const cap = room?.capacity ?? room?.room_type ?? 1;
                const fakeBeds = Array.from({ length: Number(cap) }, (_, i) => ({
                    bed_id: `${roomId}_${i + 1}`,
                    bed_name: `${room?.room_number}${String.fromCharCode(65 + i)}`,
                    status: i < (room?.available_beds ?? cap) ? 'available' : 'occupied',
                    student_id: i < (room?.available_beds ?? cap) ? null : 1,
                }));
                setBeds(fakeBeds);
            }
        } catch {
            const room = availableRooms.find(r => r.room_id?.toString() === roomId);
            const cap = room?.capacity ?? 1;
            const fakeBeds = Array.from({ length: Number(cap) }, (_, i) => ({
                bed_id: `${roomId}_${i + 1}`,
                bed_name: `${room?.room_number}${String.fromCharCode(65 + i)}`,
                status: i < (room?.available_beds ?? cap) ? 'available' : 'occupied',
                student_id: i < (room?.available_beds ?? cap) ? null : 1,
            }));
            setBeds(fakeBeds);
        } finally {
            setBedsLoading(false);
        }
    }, [availableRooms]);

    const handleReset = () => {
        setFormData({
            first_name: '', last_name: '', gender: 'Male', phone: '', email: '',
            date_of_birth: '', id_proof_number: '', id_proof_type_id: '',
            guardian_name: '', guardian_phone: '', guardian_relation_id: '',
            admission_date: new Date().toISOString().split('T')[0],
            admission_fee: '0', admission_status: 'Paid', permanent_address: '',
            room_id: '', bed_id: '', floor_number: '', monthly_rent: '',
        });
        setAadhaarFront(null);
        setAadhaarBack(null);
        setErrors({});
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        const nameRegex = /^[a-zA-Z0-9\s]+$/;
        const phoneRegex = /^\d{10}$/;

        if (!formData.first_name) newErrors.first_name = 'First name is required';
        else if (!nameRegex.test(formData.first_name)) newErrors.first_name = 'Symbols not allowed';

        if (!formData.phone) newErrors.phone = 'Phone number is required';
        else if (!phoneRegex.test(formData.phone)) newErrors.phone = 'Must be exactly 10 digits';

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
            newErrors.email = 'Invalid email format';

        if (formData.guardian_phone && !phoneRegex.test(formData.guardian_phone))
            newErrors.guardian_phone = 'Must be exactly 10 digits';

        if (!formData.admission_date) newErrors.admission_date = 'Admission date is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            showErrorToast('Validation Error', 'Please fix the highlighted fields');
            return;
        }
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
                bed_id: formData.bed_id ? formData.bed_id : null,
                floor_number: formData.floor_number ? parseInt(formData.floor_number) : null,
                id_proof_type: formData.id_proof_type_id || null,
                guardian_relation: formData.guardian_relation_id || null,
                id_proof_status: 1,
                monthly_rent: parseFloat(formData.monthly_rent || '0'),
            };

            let response;
            if (isEdit) {
                response = await api.put(`/students/${student.student_id}`, payload);
            } else {
                response = await api.post('/students', payload);
            }

            if (response.data.success) {
                showSuccessToast('Success!', `Tenant ${isEdit ? 'updated' : 'registered'} successfully`);
                setTimeout(() => navigation.goBack(), 1000);
            }
        } catch (error: any) {
            showErrorToast('Error', error.response?.data?.error || `Failed to ${isEdit ? 'update' : 'register'} tenant`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── Header ── */}
            <LinearGradient colors={['#FF8585', '#FF6B6B']} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                        <ArrowLeft color="#FFFFFF" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.greeting}>{isEdit ? 'Edit Tenant' : 'Add Tenant'}</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                {/* ── Basic Info ── */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>👤 Basic Information</Text>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <FormInput
                                label="First Name *"
                                icon={User}
                                placeholder="e.g. Ravi"
                                value={formData.first_name}
                                error={errors.first_name}
                                onChangeText={(text: string) => {
                                    const cleaned = text.replace(/[^a-zA-Z0-9\s]/g, '');
                                    setFormData(p => ({ ...p, first_name: cleaned }));
                                    if (errors.first_name && cleaned) setErrors(p => { const e = { ...p }; delete e.first_name; return e; });
                                }}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Last Name"
                                icon={User}
                                placeholder="e.g. Kumar"
                                value={formData.last_name}
                                onChangeText={(text: string) => setFormData(p => ({ ...p, last_name: text.replace(/[^a-zA-Z0-9\s]/g, '') }))}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <SelectField
                                label="Gender *"
                                value={formData.gender}
                                placeholder="Select Gender"
                                icon={Users}
                                onPress={() => setGenderModalVisible(true)}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <SelectField
                                label="Date of Birth"
                                icon={Calendar}
                                placeholder="Select DOB"
                                value={formData.date_of_birth}
                                onPress={() => { setDateMode('dob'); setShowDatePicker(true); }}
                            />
                        </View>
                    </View>

                    <FormInput
                        label="Phone Number *"
                        icon={Phone}
                        placeholder="9876543210"
                        keyboardType="phone-pad"
                        value={formData.phone}
                        error={errors.phone}
                        onChangeText={(text: string) => {
                            const cleaned = text.replace(/\D/g, '').slice(0, 10);
                            setFormData(p => ({ ...p, phone: cleaned }));
                            if (errors.phone && cleaned.length === 10) setErrors(p => { const e = { ...p }; delete e.phone; return e; });
                        }}
                    />

                    <FormInput
                        label="Email Address"
                        icon={Mail}
                        placeholder="tenant@example.com"
                        keyboardType="email-address"
                        value={formData.email}
                        error={errors.email}
                        onChangeText={(text: string) => setFormData(p => ({ ...p, email: text.trim() }))}
                    />
                </View>

                {/* ── Identity & Aadhaar ── */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>🪪 Identity & Documents</Text>

                    <SelectField
                        label="ID Proof Type"
                        value={idProofTypes.find(t => t.id.toString() === formData.id_proof_type_id)?.name}
                        placeholder="Select ID Type"
                        icon={Fingerprint}
                        onPress={() => setProofModalVisible(true)}
                    />
                    <FormInput
                        label="Aadhaar / ID Number"
                        icon={CreditCard}
                        placeholder="Enter ID Number"
                        value={formData.id_proof_number}
                        onChangeText={(text: string) => {
                            const isAadhaar = idProofTypes.find(t => t.id.toString() === formData.id_proof_type_id)?.name?.toLowerCase().includes('aadhar');
                            const cleaned = isAadhaar ? text.replace(/\D/g, '').slice(0, 12) : text;
                            setFormData(p => ({ ...p, id_proof_number: cleaned }));
                        }}
                    />

                    {/* Aadhaar Photo Capture */}
                    <Text style={styles.photoSectionLabel}>📸 Aadhaar Photos (Optional)</Text>
                    <Text style={styles.photoSectionHint}>Photos stored locally on your device</Text>
                    <View style={styles.photoRow}>
                        <AadhaarPhotoCapture
                            label="Front Side"
                            imageUri={aadhaarFront}
                            onCapture={(uri: string) => setAadhaarFront(uri)}
                            onRemove={() => setAadhaarFront(null)}
                        />
                        <View style={{ width: 12 }} />
                        <AadhaarPhotoCapture
                            label="Back Side"
                            imageUri={aadhaarBack}
                            onCapture={(uri: string) => setAadhaarBack(uri)}
                            onRemove={() => setAadhaarBack(null)}
                        />
                    </View>
                </View>

                {/* ── Guardian Info (Optional) ── */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>👨‍👩‍👦 Guardian Information <Text style={styles.optionalTag}>(Optional)</Text></Text>

                    <FormInput
                        label="Guardian Name"
                        icon={User}
                        placeholder="e.g. Suresh Kumar"
                        value={formData.guardian_name}
                        onChangeText={(text: string) => setFormData(p => ({ ...p, guardian_name: text.replace(/[^a-zA-Z0-9\s]/g, '') }))}
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <SelectField
                                label="Relation"
                                value={relations.find(r => r.relation_id.toString() === formData.guardian_relation_id)?.relation_name}
                                placeholder="Select Relation"
                                icon={Users}
                                onPress={() => setRelationModalVisible(true)}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Guardian Phone"
                                icon={Phone}
                                placeholder="9876543211"
                                keyboardType="phone-pad"
                                value={formData.guardian_phone}
                                error={errors.guardian_phone}
                                onChangeText={(text: string) => {
                                    const cleaned = text.replace(/\D/g, '').slice(0, 10);
                                    setFormData(p => ({ ...p, guardian_phone: cleaned }));
                                    if (errors.guardian_phone) setErrors(p => { const e = { ...p }; delete e.guardian_phone; return e; });
                                }}
                            />
                        </View>
                    </View>
                </View>

                {/* ── Admission Details ── */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>📋 Admission Details</Text>

                    <SelectField
                        label="Admission Date *"
                        icon={Calendar}
                        placeholder="Select Date"
                        value={formData.admission_date}
                        error={errors.admission_date}
                        onPress={() => { setDateMode('admission'); setShowDatePicker(true); }}
                    />
                    <FormInput
                        label="Admission Fee (₹)"
                        icon={CreditCard}
                        placeholder="0"
                        keyboardType="numeric"
                        value={formData.admission_fee}
                        onChangeText={(text: string) => setFormData(p => ({ ...p, admission_fee: text.replace(/\D/g, '') }))}
                    />
                    <Selector
                        label="Payment Status"
                        options={['Paid', 'Unpaid']}
                        selected={formData.admission_status}
                        onSelect={(val: string) => setFormData(p => ({ ...p, admission_status: val }))}
                    />
                </View>

                {/* ── Room & Bed Allocation ── */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>🏠 Room & Bed Allocation</Text>

                    {/* Selected summary card */}
                    {selectedRoom ? (
                        <View style={styles.allocationSummary}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.allocationLabel}>Room</Text>
                                <Text style={styles.allocationValue}>Room {selectedRoom.room_number}</Text>
                                <Text style={styles.allocationMeta}>Floor {selectedRoom.floor_number ?? '—'}  •  ₹{selectedRoom.rent_per_bed ?? selectedRoom.base_rent ?? '—'}/bed</Text>
                            </View>
                            <View style={styles.allocationDivider} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.allocationLabel}>Bed</Text>
                                <Text style={[styles.allocationValue, !selectedBed && { color: '#94A3B8' }]}>
                                    {selectedBed ? (selectedBed.bed_name ?? `Bed ${selectedBed.bed_number}`) : 'Not selected'}
                                </Text>
                                {selectedBed && <Text style={styles.allocationMeta}>Available</Text>}
                            </View>
                        </View>
                    ) : null}

                    <View style={[styles.row, { gap: 12 }]}>
                        {/* Select Room Button */}
                        <TouchableOpacity
                            style={[styles.allocationBtn, selectedRoom && styles.allocationBtnActive]}
                            onPress={() => setRoomModalVisible(true)}
                            activeOpacity={0.75}
                        >
                            <Home size={18} color={selectedRoom ? '#FF6B6B' : '#64748B'} />
                            <Text style={[styles.allocationBtnLabel, selectedRoom && { color: '#FF6B6B' }]}>
                                {selectedRoom ? `Room ${selectedRoom.room_number}` : 'Select Room'}
                            </Text>
                            <ChevronDown size={16} color={selectedRoom ? '#FF6B6B' : '#94A3B8'} />
                        </TouchableOpacity>

                        {/* Select Bed Button */}
                        <TouchableOpacity
                            style={[
                                styles.allocationBtn,
                                selectedBed && styles.allocationBtnActive,
                                !selectedRoom && styles.allocationBtnDisabled,
                            ]}
                            onPress={() => {
                                if (!selectedRoom) { Alert.alert('Select Room First', 'Please select a room before choosing a bed.'); return; }
                                setBedModalVisible(true);
                            }}
                            activeOpacity={0.75}
                        >
                            <BedDouble size={18} color={selectedBed ? '#FF6B6B' : !selectedRoom ? '#CBD5E1' : '#64748B'} />
                            <Text style={[styles.allocationBtnLabel, selectedBed && { color: '#FF6B6B' }, !selectedRoom && { color: '#CBD5E1' }]}>
                                {selectedBed ? (selectedBed.bed_name ?? `Bed`) : 'Select Bed'}
                            </Text>
                            <ChevronDown size={16} color={selectedBed ? '#FF6B6B' : '#94A3B8'} />
                        </TouchableOpacity>
                    </View>

                    {selectedRoom && (
                        <TouchableOpacity
                            onPress={() => { setFormData(p => ({ ...p, room_id: '', bed_id: '', floor_number: '', monthly_rent: '' })); setBeds([]); }}
                            style={{ alignSelf: 'flex-end', marginTop: 8 }}
                        >
                            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>✕ Clear allocation</Text>
                        </TouchableOpacity>
                    )}

                    <FormInput
                        label="Monthly Rent (₹)"
                        icon={CreditCard}
                        placeholder="Auto-filled from room"
                        keyboardType="numeric"
                        value={formData.monthly_rent}
                        onChangeText={(text: string) => setFormData(p => ({ ...p, monthly_rent: text.replace(/\D/g, '') }))}
                    />
                </View>

                {/* ── Address ── */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>📍 Address Details</Text>
                    <FormInput
                        label="Permanent Address"
                        icon={MapPin}
                        placeholder="Full home address..."
                        multiline
                        value={formData.permanent_address}
                        onChangeText={(text: string) => setFormData(p => ({ ...p, permanent_address: text }))}
                    />
                </View>

                {/* ── Buttons ── */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7} disabled={loading}>
                        <Text style={styles.resetButtonText}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.disabledButton]}
                        onPress={handleSave}
                        activeOpacity={0.8}
                        disabled={loading}
                    >
                        <LinearGradient colors={loading ? ['#CCCCCC', '#AAAAAA'] : ['#FF8585', '#FF6B6B']} style={styles.submitGradient}>
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.submitText}>{isEdit ? 'Update Tenant' : 'Add Tenant'}</Text>
                                    <ChevronRight color="#FFFFFF" size={18} />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomSpacing} />
            </ScrollView>

            {/* ── Modals ── */}
            <BottomDrawer
                visible={genderModalVisible}
                title="Select Gender"
                data={['Male', 'Female', 'Other']}
                selectedId={formData.gender}
                keyExtractor={(item: string) => item}
                labelExtractor={(item: string) => item}
                onSelect={(item: string) => setFormData(p => ({ ...p, gender: item }))}
                onClose={() => setGenderModalVisible(false)}
            />

            <BottomDrawer
                visible={proofModalVisible}
                title="Select ID Proof Type"
                data={idProofTypes}
                selectedId={formData.id_proof_type_id}
                keyExtractor={(item: any) => item.id.toString()}
                labelExtractor={(item: any) => item.name}
                onSelect={(item: any) => setFormData(p => ({ ...p, id_proof_type_id: item.id.toString() }))}
                onClose={() => setProofModalVisible(false)}
            />

            <BottomDrawer
                visible={relationModalVisible}
                title="Select Relation"
                data={relations}
                selectedId={formData.guardian_relation_id}
                keyExtractor={(item: any) => item.relation_id.toString()}
                labelExtractor={(item: any) => item.relation_name}
                onSelect={(item: any) => setFormData(p => ({ ...p, guardian_relation_id: item.relation_id.toString() }))}
                onClose={() => setRelationModalVisible(false)}
            />

            <RoomPickerModal
                visible={roomModalVisible}
                rooms={availableRooms}
                selectedRoomId={formData.room_id}
                onSelectRoom={(room: any) => {
                    setFormData(p => ({
                        ...p,
                        room_id: room.room_id.toString(),
                        floor_number: room.floor_number ? room.floor_number.toString() : '',
                        monthly_rent: room.rent_per_bed ? room.rent_per_bed.toString() : room.base_rent ? room.base_rent.toString() : p.monthly_rent,
                        bed_id: '',
                    }));
                    setBeds([]);
                    fetchBeds(room.room_id.toString());
                }}
                onClose={() => setRoomModalVisible(false)}
            />

            <BedPickerModal
                visible={bedModalVisible}
                room={selectedRoom}
                beds={beds}
                selectedBedId={formData.bed_id}
                loading={bedsLoading}
                onSelectBed={(bed: any) => {
                    setFormData(p => ({ ...p, bed_id: bed.bed_id?.toString() }));
                }}
                onClose={() => setBedModalVisible(false)}
            />

            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                date={(() => {
                    try {
                        const d = dateMode === 'dob'
                            ? (formData.date_of_birth ? new Date(formData.date_of_birth) : new Date(2000, 0, 1))
                            : (formData.admission_date ? new Date(formData.admission_date) : new Date());
                        return isNaN(d.getTime()) ? new Date() : d;
                    } catch { return new Date(); }
                })()}
                onConfirm={(selectedDate: Date) => {
                    setShowDatePicker(false);
                    const dateStr = selectedDate.toISOString().split('T')[0];
                    if (dateMode === 'dob') setFormData(p => ({ ...p, date_of_birth: dateStr }));
                    else setFormData(p => ({ ...p, admission_date: dateStr }));
                }}
                onCancel={() => setShowDatePicker(false)}
            />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { paddingTop: 50, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    greeting: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
    content: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

    formCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
    optionalTag: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#666666', marginBottom: 8, marginLeft: 2 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, height: 50, borderWidth: 1, borderColor: '#F1F5F9' },
    inputError: { backgroundColor: '#FEF2F2', borderColor: '#EF4444', borderWidth: 1.5 },
    multilineContainer: { height: 100, alignItems: 'flex-start', paddingTop: 12 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, color: '#1A1A1A' },
    inputText: { flex: 1, fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
    multilineInput: { textAlignVertical: 'top', height: 80 },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 2, fontWeight: '500' },

    selectorRow: { flexDirection: 'row', gap: 10 },
    selectorItem: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
    selectorItemActive: { borderColor: '#FF6B6B', backgroundColor: '#FFF1F1' },
    selectorText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    selectorTextActive: { color: '#FF6B6B', fontWeight: '700' },
    row: { flexDirection: 'row' },

    // ── Aadhaar photo ────────────────────────────────────────────────────────
    photoSectionLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 4 },
    photoSectionHint: { fontSize: 12, color: '#94A3B8', marginBottom: 14 },
    photoRow: { flexDirection: 'row' },
    photoBox: { flex: 1 },
    photoLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
    photoCaptureBtn: { backgroundColor: '#FFF9F9', borderWidth: 1.5, borderColor: '#FFD5D5', borderStyle: 'dashed', borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 6 },
    photoCaptureText: { fontSize: 13, color: '#FF6B6B', fontWeight: '600' },
    photoCaptureHint: { fontSize: 11, color: '#94A3B8' },
    photoPreviewWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden' },
    photoPreview: { width: '100%', height: 120, borderRadius: 14 },
    photoRemoveBtn: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.9)', alignItems: 'center', justifyContent: 'center' },
    photoRetakeBtn: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFFCC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },

    // ── Room allocation ──────────────────────────────────────────────────────
    allocationSummary: { flexDirection: 'row', backgroundColor: '#FFF9F9', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FFD5D5' },
    allocationLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginBottom: 4 },
    allocationValue: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    allocationMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
    allocationDivider: { width: 1, backgroundColor: '#FFD5D5', marginHorizontal: 14 },
    allocationBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
    allocationBtnActive: { backgroundColor: '#FFF9F9', borderColor: '#FF6B6B' },
    allocationBtnDisabled: { opacity: 0.5 },
    allocationBtnLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#64748B' },

    // ── Room picker ──────────────────────────────────────────────────────────
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    floorLabel: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10, marginTop: 8 },
    floorLabelText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    roomCard: { backgroundColor: '#FFF9F9', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#FFD5D5', position: 'relative' },
    roomCardSelected: { borderColor: '#FF6B6B', backgroundColor: '#FFF1F1' },
    roomCardDisabled: { opacity: 0.5 },
    roomNumber: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    roomCap: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    roomAvailable: { fontSize: 13, fontWeight: '700', marginTop: 2 },
    roomRent: { fontSize: 13, color: '#475569', marginTop: 2 },
    roomStatus: { fontSize: 12, fontWeight: '700', marginTop: 2 },
    roomSelectedBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    roomChip: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 12 },
    roomChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },

    // ── Bed picker ───────────────────────────────────────────────────────────
    bedCard: { backgroundColor: '#FFF9F9', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#FFD5D5', width: '47%' },
    bedCardSelected: { borderColor: '#FF6B6B', backgroundColor: '#FFF1F1' },
    bedCardOccupied: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', opacity: 0.7 },
    bedName: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    bedStatus: { fontSize: 12, fontWeight: '700' },

    // ── Buttons ──────────────────────────────────────────────────────────────
    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    resetButton: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
    resetButtonText: { color: '#475569', fontWeight: '600', fontSize: 15 },
    submitButton: { flex: 2, borderRadius: 12, overflow: 'hidden' },
    disabledButton: { opacity: 0.7 },
    submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6, minHeight: 50 },
    submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    bottomSpacing: { height: 60 },

    // ── Modal base ───────────────────────────────────────────────────────────
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, maxHeight: '70%' },
    modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    closeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFF1F1' },
    closeText: { color: '#FF6B6B', fontWeight: '700', fontSize: 14 },
    modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    modalOptionSelected: { backgroundColor: '#FFF9F9' },
    optionText: { fontSize: 15, color: '#334155', fontWeight: '500' },
    optionTextSelected: { color: '#FF6B6B', fontWeight: '700' },
});

export default AddStudentScreen;