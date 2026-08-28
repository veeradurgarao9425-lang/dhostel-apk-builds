import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    Pressable,
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    User, Phone, Mail, Home,
    CreditCard, Fingerprint, Check,
    ChevronDown, Camera, X, Calendar,
    Upload, AlertTriangle, FileText
} from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { COLORS } from '../theme/index';
import { AppHeader } from '../components/AppHeader';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { toLocalDateStr } from '../utils/dateUtils';
import { appendImageFileToFormData, isLocalDeviceUri } from '../utils/imageHelper';

const todayStr = () => toLocalDateStr(new Date());

const renderLabelWithAsterisk = (label: string, style: any) => {
    if (!label) return null;
    if (typeof label === 'string' && label.includes('*')) {
        const parts = label.split('*');
        return (
            <Text style={style}>
                {parts[0]}<Text style={{ color: '#EF4444', fontWeight: '800' }}>*</Text>{parts.slice(1).join('*')}
            </Text>
        );
    }
    return <Text style={style}>{label}</Text>;
};

// ─── Smooth bottom-sheet modal ────────────────────────────────────────────────
const ModalSheet = ({ visible, onClose, maxHeight = '85%', children }: any) => {
    const { theme } = useTheme();
    const anim = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (visible) {
            Animated.timing(anim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(anim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    const backdropOpacity = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
    });

    const sheetTranslateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [600, 0],
    });

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                </Animated.View>
                <Animated.View style={[
                    styles.sheet,
                    { maxHeight, backgroundColor: theme.cardBg || '#FFF', transform: [{ translateY: sheetTranslateY }], paddingBottom: insets.bottom > 0 ? insets.bottom : 24 }
                ]}>
                    {children}
                </Animated.View>
            </View>
        </Modal>
    );
};

// ─── Options Drawer ───────────────────────────────────────────────────────────
const OptionsDrawer = ({ visible, title, data, selectedId, onSelect, onClose, keyExtractor, labelExtractor, searchable }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const [search, setSearch] = useState('');
    const filtered = useMemo(() => {
        if (!searchable || !search) return data;
        return data.filter((item: any) => labelExtractor(item).toLowerCase().includes(search.toLowerCase()));
    }, [data, search, searchable, labelExtractor]);

    return (
        <ModalSheet visible={visible} onClose={() => { setSearch(''); onClose(); }} maxHeight="70%">
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary, fontSize: fontSize + 1 }]}>{title}</Text>
                <TouchableOpacity onPress={() => { setSearch(''); onClose(); }} style={[styles.doneBtn, { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight }]}>
                    <Text style={[styles.doneBtnText, { color: theme.primary, fontSize }]}>Done</Text>
                </TouchableOpacity>
            </View>
            {searchable && (
                <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                    <TextInput
                        style={[styles.searchInput, { backgroundColor: isDark ? '#334155' : '#F1F5F9', color: theme.textPrimary, fontSize }]}
                        placeholder="Search..."
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            )}
            <FlatList
                data={filtered}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const isSelected = selectedId === keyExtractor(item);
                    return (
                        <TouchableOpacity
                            style={[
                                styles.optionRow,
                                { borderBottomColor: isDark ? '#334155' : '#F8FAFC' },
                                isSelected && (isDark ? { backgroundColor: theme.primary + '20' } : styles.optionRowActive)
                            ]}
                            onPress={() => { onSelect(item); setSearch(''); onClose(); }}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.optionLabel,
                                { color: theme.textPrimary, fontSize },
                                isSelected && { color: theme.primary, fontWeight: '700' }
                            ]}>
                                {labelExtractor(item)}
                            </Text>
                            {isSelected && <Check size={18} color={theme.primary} />}
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={{ padding: 40, alignItems: 'center', minHeight: 200, justifyContent: 'center' }}>
                        <Text style={{ color: theme.textSecondary, fontSize }}>No options found</Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 40, minHeight: 200 }}
            />
        </ModalSheet>
    );
};

const SectionHeader = ({ number, title }: { number: number; title: string }) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <View style={[styles.sectionHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
            <View style={[styles.sectionBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.sectionBadgeText}>{number}</Text>
            </View>
            <Text style={[styles.sectionHeaderText, { color: theme.textPrimary, fontSize: fontSize + 1 }]}>{title}</Text>
        </View>
    );
};

const ImageSourceDrawer = ({ visible, onClose, onSelectCamera, onSelectGallery, title }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const insets = useSafeAreaInsets();
    return (
        <ModalSheet visible={visible} onClose={onClose} maxHeight="45%">
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary, fontSize: fontSize + 1 }]}>{title || 'Choose Source'}</Text>
                <TouchableOpacity onPress={onClose} style={[styles.doneBtn, { backgroundColor: isDark ? theme.primary + '20' : COLORS.primaryLight }]}>
                    <Text style={[styles.doneBtnText, { color: theme.primary, fontSize }]}>Cancel</Text>
                </TouchableOpacity>
            </View>
            <View style={{ padding: 24, paddingBottom: Math.max(insets.bottom, 24) + 20, gap: 16, flexDirection: 'row', justifyContent: 'space-around' }}>
                <TouchableOpacity
                    style={[styles.sourceOptionBtn, { backgroundColor: isDark ? '#1E293B' : '#F3EEFF', borderColor: theme.primary }]}
                    onPress={() => { onSelectCamera(); onClose(); }}
                    activeOpacity={0.75}
                >
                    <View style={[styles.sourceIconBg, { backgroundColor: theme.primary }]}>
                        <Camera size={24} color="#FFF" />
                    </View>
                    <Text style={[styles.sourceOptionText, { color: theme.textPrimary, fontSize }]}>Use Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.sourceOptionBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                    onPress={() => { onSelectGallery(); onClose(); }}
                    activeOpacity={0.75}
                >
                    <View style={[styles.sourceIconBg, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]}>
                        <Upload size={24} color={isDark ? '#FFF' : '#475569'} />
                    </View>
                    <Text style={[styles.sourceOptionText, { color: theme.textPrimary, fontSize }]}>Choose Gallery</Text>
                </TouchableOpacity>
            </View>
        </ModalSheet>
    );
};

const DocumentUploadBox = ({ label, uri, onCapture, onRemove, isFront, error }: { label: string; uri: string | null; onCapture: (uri: string) => void; onRemove: () => void; isFront: boolean; error?: string }) => {
    const { theme, isDark } = useTheme();
    const [pickerVisible, setPickerVisible] = useState(false);

    const onSelectCamera = async () => {
        try {
            const p = await ImagePicker.requestCameraPermissionsAsync();
            if (!p.granted) {
                Alert.alert('Permission Required', 'Camera permission is needed to upload documents.');
                return;
            }
            const r = await ImagePicker.launchCameraAsync({ quality: 0.75 });
            if (!r.canceled && r.assets && r.assets.length > 0) {
                onCapture(r.assets[0].uri);
            }
        } catch (err) {
            console.error('Document camera error:', err);
        }
    };

    const onSelectGallery = async () => {
        try {
            const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!p.granted) {
                Alert.alert('Permission Required', 'Media library permission is needed to upload documents.');
                return;
            }
            const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.75 });
            if (!r.canceled && r.assets && r.assets.length > 0) {
                onCapture(r.assets[0].uri);
            }
        } catch (err) {
            console.error('Document gallery error:', err);
        }
    };

    return (
        <>
            <View style={[styles.docUploadBox, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: error ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0'), borderStyle: 'dashed' }]}>
                {uri ? (
                    <View style={styles.docPreviewContainer}>
                        <Image source={{ uri }} style={styles.docPreviewImage} />
                        <TouchableOpacity style={styles.docRemoveBtn} onPress={onRemove}>
                            <X size={14} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.docRetakeRow, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={() => setPickerVisible(true)}>
                            <Camera size={12} color="#FFF" />
                            <Text style={{ fontSize: 10, color: '#FFF', fontWeight: '700', marginLeft: 4 }}>Retake</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ flex: 1, justifyContent: 'space-between' }}>
                        <View style={styles.docBoxTopRow}>
                            <View style={[styles.skeletonCard, { borderColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]}>
                                {isFront ? (
                                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', height: '100%' }}>
                                        <View style={[styles.skeletonAvatar, { backgroundColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]} />
                                        <View style={{ flex: 1, gap: 3 }}>
                                            <View style={[styles.skeletonLine, { width: '80%', backgroundColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]} />
                                            <View style={[styles.skeletonLine, { width: '60%', backgroundColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]} />
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ justifyContent: 'center', height: '100%', gap: 3 }}>
                                        <View style={[styles.skeletonLine, { width: '90%', backgroundColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]} />
                                        <View style={[styles.skeletonLine, { width: '80%', backgroundColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]} />
                                        <View style={[styles.skeletonLine, { width: '40%', backgroundColor: error ? '#EF4444' : (isDark ? '#475569' : '#CBD5E1') }]} />
                                    </View>
                                )}
                            </View>

                            <View style={[styles.uploadCircle, { backgroundColor: error ? '#FEE2E2' : (isDark ? '#2D1B6B' : '#F3EEFF') }]}>
                                <Upload size={14} color={error ? '#EF4444' : theme.primary} />
                            </View>
                        </View>

                        <View style={{ marginTop: 8 }}>
                            {renderLabelWithAsterisk(label, [styles.docBoxTitle, { color: error ? '#EF4444' : (isDark ? '#F1F5F9' : '#1E293B') }])}
                            <Text style={styles.docBoxSubtitle}>JPG, PNG or PDF{"\n"}Max. 5MB</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.docUploadBtn, { borderColor: error ? '#EF4444' : theme.primary }]}
                            onPress={() => setPickerVisible(true)}
                            activeOpacity={0.7}
                        >
                            <Upload size={12} color={error ? '#EF4444' : theme.primary} />
                            <Text style={[styles.docUploadBtnText, { color: error ? '#EF4444' : theme.primary }]}>Upload</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {error && <Text style={{ color: '#EF4444', fontSize: 9, marginTop: 4, fontWeight: '600', textAlign: 'center' }}>{error}</Text>}
            </View>

            <ImageSourceDrawer
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelectCamera={onSelectCamera}
                onSelectGallery={onSelectGallery}
                title={`Upload ${label}`}
            />
        </>
    );
};

const ProfilePhotoCapture = ({ uri, onCapture, onRemove, error }: any) => {
    const { theme, isDark, fontSize } = useTheme();

    const openCamera = async () => {
        try {
            const p = await ImagePicker.requestCameraPermissionsAsync();
            if (!p.granted) {
                Alert.alert('Permission Required', 'Camera permission is needed to take a profile photo.');
                return;
            }
            const r = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
            if (!r.canceled && r.assets && r.assets.length > 0) {
                onCapture(r.assets[0].uri);
            }
        } catch (err) {
            console.error('Camera error:', err);
        }
    };

    const openGallery = async () => {
        try {
            const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!p.granted) {
                Alert.alert('Permission Required', 'Gallery permission is needed to pick a photo.');
                return;
            }
            const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: false });
            if (!r.canceled && r.assets && r.assets.length > 0) {
                onCapture(r.assets[0].uri);
            }
        } catch (err) {
            console.error('Gallery error:', err);
        }
    };

    return (
        <View style={[styles.profilePhotoCard, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: error ? '#EF4444' : (isDark ? '#334155' : 'transparent'), borderWidth: (isDark || error) ? 1 : 0 }]}>
            <TouchableOpacity onPress={openCamera} activeOpacity={0.85} style={styles.profileAvatarContainer}>
                {uri ? (
                    <View style={styles.profileAvatarWrapper}>
                        <Image source={{ uri }} style={[styles.profileAvatar, { borderColor: error ? '#EF4444' : theme.primary }]} />
                        <View style={[styles.profileEditBadge, { backgroundColor: theme.primary }]}>
                            <Camera size={12} color="#FFF" />
                        </View>
                        <TouchableOpacity style={styles.profileRemoveBtn} onPress={onRemove}>
                            <X size={10} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.profileAvatarPlaceholder, { backgroundColor: isDark ? '#2D1B6B' : '#F3EEFF', borderColor: error ? '#EF4444' : theme.primary }]}>
                        <User size={32} color={error ? '#EF4444' : theme.primary} />
                        <View style={[styles.profileEditBadge, { backgroundColor: theme.primary }]}>
                            <Camera size={12} color="#FFF" />
                        </View>
                    </View>
                )}
            </TouchableOpacity>

            <View style={styles.profileDetailsContainer}>
                <Text style={[styles.profilePhotoTitle, { color: theme.textPrimary, fontSize: fontSize + 1 }]}>Guest Profile Photo</Text>
                <Text style={[styles.profilePhotoSubtitle, { color: theme.textSecondary }]}>Upload a clear face photo of the guest</Text>
                {error && <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '600', marginBottom: 8 }}>{error}</Text>}
                
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TouchableOpacity
                        style={[styles.profileUploadBtn, { borderColor: theme.primary, flex: 1 }]}
                        onPress={openCamera}
                        activeOpacity={0.7}
                    >
                        <Camera size={14} color={theme.primary} />
                        <Text style={[styles.profileUploadBtnText, { color: theme.primary }]}>Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.profileUploadBtn, { borderColor: isDark ? '#475569' : '#CBD5E1', flex: 1 }]}
                        onPress={openGallery}
                        activeOpacity={0.7}
                    >
                        <Upload size={14} color={theme.textSecondary} />
                        <Text style={[styles.profileUploadBtnText, { color: theme.textSecondary }]}>Gallery</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const FormInput = ({ label, icon: Icon, placeholder, value, onChangeText, keyboardType, multiline, error, onFocus, onBlur, autoCapitalize, maxLength, editable = true }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <View style={styles.inputGroup}>
            {renderLabelWithAsterisk(label, [styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }])}
            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#F1F5F9' }, multiline && styles.multilineContainer, error && styles.inputError, !editable && { opacity: 0.6 }]}>
                {Icon && <View style={styles.inputIcon}><Icon size={18} color={error ? '#EF4444' : theme.primary} /></View>}
                <TextInput
                    style={[styles.input, { color: theme.textPrimary, fontSize }, multiline && styles.multilineInput]}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? '#475569' : '#BBBBBB'}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    numberOfLines={multiline ? 3 : 1}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    autoCapitalize={autoCapitalize}
                    maxLength={maxLength}
                    editable={editable}
                />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

const SelectField = ({ label, value, placeholder, icon: Icon, onPress, error }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <View style={styles.inputGroup}>
            {renderLabelWithAsterisk(label, [styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }])}
            <TouchableOpacity style={[styles.inputContainer, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#F1F5F9' }, error && styles.inputError]} onPress={onPress} activeOpacity={0.7}>
                {Icon && <View style={styles.inputIcon}><Icon size={18} color={error ? '#EF4444' : theme.primary} /></View>}
                <Text style={[styles.inputText, { color: theme.textPrimary, fontSize, flex: 1 }, !value && { color: isDark ? '#475569' : '#BBBBBB' }]}>{value || placeholder}</Text>
                <ChevronDown size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

const Selector = ({ label, options, selected, onSelect }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <View style={styles.inputGroup}>
            {renderLabelWithAsterisk(label, [styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }])}
            <View style={[styles.selectorContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                {options.map((opt: string) => {
                    const isAct = selected === opt;
                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.selectorTab, isAct && { backgroundColor: theme.primary }]}
                            onPress={() => onSelect(opt)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.selectorTabText, { fontSize, color: isAct ? '#FFF' : theme.textSecondary }, isAct && { fontWeight: '800' }]}>
                                {opt}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const ID_PROOF_TYPES = [
    { id: 'aadhaar', name: 'Aadhaar Card', maxLength: 12, example: '204095027990', keyboard: 'numeric' },
    { id: 'pan', name: 'PAN Card', maxLength: 10, example: 'ABCDE1234F', keyboard: 'default' },
    { id: 'driving_license', name: 'Driving License', maxLength: 16, example: 'DL-1420110012345', keyboard: 'default' },
    { id: 'voter_id', name: 'Voter ID', maxLength: 10, example: 'ABC1234567', keyboard: 'default' },
    { id: 'passport', name: 'Passport', maxLength: 8, example: 'A1234567', keyboard: 'default' },
];

const PURPOSE_TAGS = [
    'Work / Interview',
    'Exams',
    'Transit Stay',
    'Tourism',
    'Medical',
    'Personal',
];

export default function AddGuestScreen({ navigation, route }: any) {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { showSuccess, showError, showApiError } = useToast();
    const { guest, isEdit, isCheckinPending } = route.params || {};

    const [loading, setLoading] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [idProofFront, setIdProofFront] = useState<string | null>(null);
    const [idProofBack, setIdProofBack] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        gender: 'Male',
        phone: '',
        email: '',
        check_in_date: todayStr(),
        days: '1',
        per_day_amount: '500',
        amount_paid: '500',
        room_number: '',
        purpose: 'Work / Interview',
        id_proof_type: '',
        id_proof_number: '',
        remarks: '',
    });

    const [proofModal, setProofModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Room allocation mode & available rooms list
    const [roomMode, setRoomMode] = useState<'available' | 'manual'>('available');
    const [availableRoomsList, setAvailableRoomsList] = useState<any[]>([]);
    const [roomDrawerVisible, setRoomDrawerVisible] = useState(false);

    // Fetch available rooms
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await api.get('/rooms?limit=200');
                if (res.data?.success && Array.isArray(res.data.data)) {
                    const raw = res.data.data;
                    const mapped = raw
                        .map((r: any) => {
                            const cap = Number(r.capacity) || 1;
                            const occ = Number(r.occupied_count) || 0;
                            const avail = Math.max(0, cap - occ);
                            return {
                                room_id: r.room_id,
                                room_number: String(r.room_number),
                                floor_number: r.floor_number ?? '0',
                                capacity: cap,
                                occupied_count: occ,
                                available_beds: avail,
                                label: `Room ${r.room_number} (Floor ${r.floor_number ?? '0'}) — ${avail} ${avail === 1 ? 'bed' : 'beds'} free`,
                            };
                        })
                        .filter((r: any) => r.available_beds > 0);
                    setAvailableRoomsList(mapped);
                    if (mapped.length === 0 && !isEdit) {
                        setRoomMode('manual');
                    }
                }
            } catch (err) {
                console.error('Failed to fetch rooms for guest allocation:', err);
            }
        };
        fetchRooms();
    }, [isEdit]);

    // Populate on edit
    useEffect(() => {
        if (isEdit && guest) {
            setFormData({
                full_name: guest.full_name || '',
                gender: guest.gender || 'Male',
                phone: guest.phone || '',
                email: guest.email || '',
                check_in_date: guest.check_in_date ? toLocalDateStr(new Date(guest.check_in_date)) : todayStr(),
                days: guest.days ? String(guest.days) : '1',
                per_day_amount: guest.per_day_amount ? String(guest.per_day_amount) : '500',
                amount_paid: guest.amount_paid ? String(guest.amount_paid) : '500',
                room_number: guest.room_number || '',
                purpose: guest.purpose || 'Work / Interview',
                id_proof_type: guest.id_proof_type || 'aadhaar',
                id_proof_number: guest.id_proof_number || '',
                remarks: guest.remarks || '',
            });
            if (guest.profile_photo_url || guest.profile_photo) {
                setProfilePhoto(guest.profile_photo_url || guest.profile_photo);
            }
            if (guest.id_proof_front_url || guest.id_proof_front) {
                setIdProofFront(guest.id_proof_front_url || guest.id_proof_front);
            }
            if (guest.id_proof_back_url || guest.id_proof_back) {
                setIdProofBack(guest.id_proof_back_url || guest.id_proof_back);
            }
        }
    }, [isEdit, guest]);

    // Live Auto-calculate total amount
    const handleDaysChange = (daysVal: string) => {
        const cleanDays = daysVal.replace(/[^0-9]/g, '');
        const daysNum = parseInt(cleanDays, 10) || 0;
        const perDayNum = parseFloat(formData.per_day_amount) || 0;
        const total = daysNum * perDayNum;
        setFormData(p => ({
            ...p,
            days: cleanDays,
            amount_paid: total > 0 ? String(total) : p.amount_paid,
        }));
    };

    const handlePerDayChange = (perDayVal: string) => {
        const cleanPerDay = perDayVal.replace(/[^0-9.]/g, '');
        const perDayNum = parseFloat(cleanPerDay) || 0;
        const daysNum = parseInt(formData.days, 10) || 1;
        const total = daysNum * perDayNum;
        setFormData(p => ({
            ...p,
            per_day_amount: cleanPerDay,
            amount_paid: total > 0 ? String(total) : p.amount_paid,
        }));
    };

    const validateField = (name: string, value: any) => {
        let err = '';
        if (name === 'full_name') {
            if (!value || !value.trim()) {
                err = 'Full Name is required';
            } else if (value.trim().length < 2) {
                err = 'Name must be at least 2 characters';
            }
        } else if (name === 'phone') {
            const cleanPhone = String(value || '').replace(/\D/g, '');
            if (!cleanPhone) {
                err = 'Mobile number is required';
            } else if (!/^[6-9]/.test(cleanPhone)) {
                err = 'Mobile number must start with 6, 7, 8, or 9';
            } else if (cleanPhone.length !== 10) {
                err = 'Mobile number must be exactly 10 digits';
            }
        } else if (name === 'email') {
            if (value && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
                err = 'Invalid email format';
            }
        } else if (name === 'id_proof_type') {
            if (!value) {
                err = 'Please select an ID proof type';
            }
        } else if (name === 'id_proof_number') {
            if (!value || !value.trim()) {
                err = 'ID proof number is required';
            } else {
                const proofType = String(formData.id_proof_type || '').toLowerCase();
                const cleanVal = value.trim().replace(/\s+/g, '');
                if (proofType.includes('aadhaar')) {
                    if (cleanVal.length !== 12) err = 'Aadhaar must be exactly 12 digits';
                    else if (!/^\d{12}$/.test(cleanVal)) err = 'Aadhaar must be numeric';
                } else if (proofType.includes('pan')) {
                    if (cleanVal.length !== 10) err = 'PAN must be exactly 10 characters';
                }
            }
        }
        setErrors(prev => ({ ...prev, [name]: err }));
        return err;
    };

    const up = (key: string, val: any) => {
        setFormData(p => ({ ...p, [key]: val }));
        setTouched(p => ({ ...p, [key]: true }));
        validateField(key, val);
    };

    const validateAll = () => {
        const e: Record<string, string> = {};
        const nameErr = validateField('full_name', formData.full_name);
        if (nameErr) e.full_name = nameErr;

        const phoneErr = validateField('phone', formData.phone);
        if (phoneErr) e.phone = phoneErr;

        if (formData.email && formData.email.trim()) {
            const emailErr = validateField('email', formData.email);
            if (emailErr) e.email = emailErr;
        }

        if (!formData.id_proof_type) {
            e.id_proof_type = 'Please select an ID proof type';
        }

        if (!formData.id_proof_number || !formData.id_proof_number.trim()) {
            e.id_proof_number = 'ID proof number is required';
        } else {
            const idErr = validateField('id_proof_number', formData.id_proof_number);
            if (idErr) e.id_proof_number = idErr;
        }

        setErrors(e);
        return e;
    };

    const handleReset = () => {
        setFormData({
            full_name: '',
            gender: 'Male',
            phone: '',
            email: '',
            check_in_date: todayStr(),
            days: '1',
            per_day_amount: '500',
            amount_paid: '500',
            room_number: '',
            purpose: 'Work / Interview',
            id_proof_type: '',
            id_proof_number: '',
            remarks: '',
        });
        setProfilePhoto(null);
        setIdProofFront(null);
        setIdProofBack(null);
        setErrors({});
        setTouched({});
    };

    const handleSave = async () => {
        const validationErrors = validateAll();
        if (Object.keys(validationErrors).length > 0) {
            setTouched({
                full_name: true,
                phone: true,
                email: true,
                id_proof_type: true,
                id_proof_number: true,
            });
            showError('Please check and fill all mandatory fields (Full Name, Phone, ID Proof)');
            return;
        }

        setLoading(true);
        try {
            const hasLocalProfilePhoto = isLocalDeviceUri(profilePhoto);
            const hasLocalIdFront = isLocalDeviceUri(idProofFront);
            const hasLocalIdBack = isLocalDeviceUri(idProofBack);
            const hasFiles = hasLocalProfilePhoto || hasLocalIdFront || hasLocalIdBack;

            let res;
            if (hasFiles) {
                const bodyFormData = new FormData();
                bodyFormData.append('full_name', formData.full_name.trim());
                bodyFormData.append('gender', formData.gender);
                bodyFormData.append('phone', formData.phone.trim());
                if (formData.email.trim()) bodyFormData.append('email', formData.email.trim());
                bodyFormData.append('check_in_date', formData.check_in_date);
                bodyFormData.append('days', formData.days || '1');
                bodyFormData.append('per_day_amount', formData.per_day_amount || '0');
                bodyFormData.append('amount_paid', formData.amount_paid || '0');
                if (formData.room_number.trim()) bodyFormData.append('room_number', formData.room_number.trim());
                if (formData.purpose.trim()) bodyFormData.append('purpose', formData.purpose.trim());
                bodyFormData.append('id_proof_type', formData.id_proof_type);
                bodyFormData.append('id_proof_number', formData.id_proof_number.trim());
                if (formData.remarks.trim()) bodyFormData.append('remarks', formData.remarks.trim());

                if (hasLocalProfilePhoto && profilePhoto) {
                    appendImageFileToFormData(bodyFormData, 'profile_photo', profilePhoto, 'profile.jpg');
                }

                if (hasLocalIdFront && idProofFront) {
                    appendImageFileToFormData(bodyFormData, 'id_proof_front', idProofFront, 'id_front.jpg');
                }

                if (hasLocalIdBack && idProofBack) {
                    appendImageFileToFormData(bodyFormData, 'id_proof_back', idProofBack, 'id_back.jpg');
                }

                if (isCheckinPending) {
                    bodyFormData.append('status', 'staying');
                }

                res = isEdit
                    ? await api.put(`/guests/${guest.guest_id}`, bodyFormData)
                    : await api.post('/guests', bodyFormData);
            } else {
                const jsonPayload: any = {
                    full_name: formData.full_name.trim(),
                    gender: formData.gender,
                    phone: formData.phone.trim(),
                    email: formData.email.trim() || undefined,
                    check_in_date: formData.check_in_date,
                    days: Number(formData.days || 1),
                    per_day_amount: Number(formData.per_day_amount || 0),
                    amount_paid: Number(formData.amount_paid || 0),
                    room_number: formData.room_number.trim() || undefined,
                    purpose: formData.purpose.trim() || undefined,
                    id_proof_type: formData.id_proof_type,
                    id_proof_number: formData.id_proof_number.trim(),
                    remarks: formData.remarks.trim() || undefined,
                };

                if (isCheckinPending) {
                    jsonPayload.status = 'staying';
                }

                res = isEdit
                    ? await api.put(`/guests/${guest.guest_id}`, jsonPayload)
                    : await api.post('/guests', jsonPayload);
            }

            if (res.data?.success || res.status === 200 || res.status === 201) {
                showSuccess(isCheckinPending ? 'Guest checked in successfully!' : isEdit ? 'Guest updated successfully' : 'Guest checked in successfully');
                navigation.goBack();
            }
        } catch (err: any) {
            const rawMsg = err.response?.data?.error || err.message || '';
            if (rawMsg.includes('Required fields')) {
                showError('Please enter all mandatory fields: Full Name & Check-in Date');
            } else if (rawMsg) {
                showError(rawMsg);
            } else {
                showApiError(err, 'Failed to save guest');
            }
        } finally {
            setLoading(false);
        }
    };

    const selectedProofConfig = ID_PROOF_TYPES.find(t => t.id === formData.id_proof_type);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <FullScreenLoader visible={loading} message={isCheckinPending ? 'Completing guest check-in...' : isEdit ? 'Updating guest record...' : 'Checking in guest & uploading documents...'} />
            <AppHeader
                title={isCheckinPending ? 'Complete Guest Check-In' : isEdit ? 'Edit Guest' : 'Add Guest'}
                subtitle={isCheckinPending ? 'Assign room & confirm stay rate' : 'Record short-stay & daily visitor details'}
                alignLeft={true}
            />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 260 }]}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Profile Photo ── */}
                <ProfilePhotoCapture
                    uri={profilePhoto}
                    onCapture={(uri: string) => setProfilePhoto(uri)}
                    onRemove={() => setProfilePhoto(null)}
                    error={errors.profilePhoto}
                />

                {/* ── 1. Personal Details ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SectionHeader number={1} title="Personal Details" />
                    
                    <FormInput
                        label="Full Name *"
                        icon={User}
                        placeholder="Ex: Durgarao Goriparthi"
                        value={formData.full_name}
                        error={touched.full_name ? errors.full_name : undefined}
                        onChangeText={(t: string) => up('full_name', t)}
                    />

                    <Selector
                        label="Gender *"
                        options={['Male', 'Female', 'Other']}
                        selected={formData.gender}
                        onSelect={(v: string) => up('gender', v)}
                    />

                    <FormInput
                        label="Mobile Number *"
                        icon={Phone}
                        placeholder="6303359425"
                        keyboardType="numeric"
                        maxLength={10}
                        value={formData.phone}
                        error={touched.phone ? errors.phone : undefined}
                        onChangeText={(t: string) => {
                            const numeric = t.replace(/\D/g, '').slice(0, 10);
                            up('phone', numeric);
                        }}
                    />

                    <FormInput
                        label="Email (Optional)"
                        icon={Mail}
                        placeholder="durgarao@example.com"
                        keyboardType="email-address"
                        value={formData.email}
                        error={touched.email ? errors.email : undefined}
                        onChangeText={(t: string) => up('email', t)}
                    />
                </View>

                {/* ── 2. Stay & Pricing Details ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SectionHeader number={2} title="Stay & Pricing Details" />

                    <SelectField
                        label="Check-in Date *"
                        value={formData.check_in_date}
                        placeholder="Pick check-in date"
                        icon={Calendar}
                        onPress={() => setShowDatePicker(true)}
                    />

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Stay Days *"
                                icon={Calendar}
                                placeholder="1"
                                keyboardType="numeric"
                                value={formData.days}
                                onChangeText={handleDaysChange}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Rent Per Day (₹) *"
                                icon={CreditCard}
                                placeholder="500"
                                keyboardType="numeric"
                                value={formData.per_day_amount}
                                onChangeText={handlePerDayChange}
                            />
                        </View>
                    </View>

                    <FormInput
                        label="Total Amount Paid (₹) *"
                        icon={CreditCard}
                        placeholder="500"
                        keyboardType="numeric"
                        value={formData.amount_paid}
                        onChangeText={(t: string) => up('amount_paid', t.replace(/[^0-9.]/g, ''))}
                    />

                    {/* Room Allocation Mode Switch */}
                    <View style={[styles.roomModeContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Home size={15} color={theme.primary} />
                                <Text style={[styles.roomModeTitle, { color: theme.textPrimary }]}>Choose from Available Beds</Text>
                            </View>
                            <Text style={[styles.roomModeSub, { color: theme.textSecondary }]}>
                                {roomMode === 'available' ? 'Showing only vacant rooms & beds' : 'Switch ON to select from vacant beds'}
                            </Text>
                        </View>
                        <Switch
                            value={roomMode === 'available'}
                            onValueChange={(val) => setRoomMode(val ? 'available' : 'manual')}
                            trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: theme.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    {roomMode === 'available' ? (
                        <SelectField
                            label="Assigned Room / Bed (Available Beds Only)"
                            value={
                                formData.room_number
                                    ? (availableRoomsList.find(r => r.room_number === formData.room_number)?.label || `Room ${formData.room_number}`)
                                    : ''
                            }
                            placeholder={availableRoomsList.length > 0 ? "Select an available room" : "No vacant beds found (switch to manual)"}
                            icon={Home}
                            onPress={() => {
                                if (availableRoomsList.length === 0) {
                                    Alert.alert('No Available Rooms', 'All rooms are currently full. Would you like to enter room number manually?', [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Switch to Manual', onPress: () => setRoomMode('manual') }
                                    ]);
                                    return;
                                }
                                setRoomDrawerVisible(true);
                            }}
                        />
                    ) : (
                        <FormInput
                            label="Assigned Room No (Manual Entry)"
                            icon={Home}
                            placeholder="e.g. 101, 204B"
                            value={formData.room_number}
                            onChangeText={(t: string) => up('room_number', t)}
                        />
                    )}

                    {/* Purpose of Stay */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Purpose of Stay</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                            {PURPOSE_TAGS.map(tag => {
                                const isSel = formData.purpose === tag;
                                return (
                                    <TouchableOpacity
                                        key={tag}
                                        style={[
                                            styles.tagChip,
                                            {
                                                backgroundColor: isSel ? theme.primary : (isDark ? '#1E293B' : '#F1F5F9'),
                                                borderColor: isSel ? theme.primary : (isDark ? '#334155' : '#E2E8F0')
                                            }
                                        ]}
                                        onPress={() => up('purpose', tag)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.tagChipText, { color: isSel ? '#FFF' : theme.textSecondary }, isSel && { fontWeight: '700' }]}>
                                            {tag}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
                                    borderColor: isDark ? '#334155' : '#F1F5F9',
                                    borderWidth: 1,
                                    borderRadius: 12,
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    color: theme.textPrimary,
                                }
                            ]}
                            placeholder="Or type custom purpose..."
                            placeholderTextColor={isDark ? '#475569' : '#BBBBBB'}
                            value={formData.purpose}
                            onChangeText={(t) => up('purpose', t)}
                        />
                    </View>
                </View>

                {/* ── 3. Identity Proof & Documents ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SectionHeader number={3} title="Identity Proof & Documents" />

                    <SelectField
                        label="ID Proof Type *"
                        value={selectedProofConfig?.name}
                        placeholder="Select ID Proof Type"
                        icon={Fingerprint}
                        error={touched.id_proof_type ? errors.id_proof_type : undefined}
                        onPress={() => setProofModal(true)}
                    />

                    {formData.id_proof_type && selectedProofConfig ? (
                        <>
                            <FormInput
                                label={`${selectedProofConfig.name} Number *`}
                                icon={CreditCard}
                                placeholder={`Ex: ${selectedProofConfig.example}`}
                                keyboardType={selectedProofConfig.keyboard}
                                autoCapitalize={selectedProofConfig.id === 'pan' ? 'characters' : 'none'}
                                maxLength={selectedProofConfig.maxLength}
                                value={formData.id_proof_number}
                                error={touched.id_proof_number ? errors.id_proof_number : undefined}
                                onChangeText={(t: string) => {
                                    let clean = t;
                                    if (selectedProofConfig.id === 'aadhaar') {
                                        clean = t.replace(/\D/g, '').slice(0, 12);
                                    } else if (selectedProofConfig.id === 'pan') {
                                        clean = t.toUpperCase().slice(0, 10);
                                    }
                                    up('id_proof_number', clean);
                                }}
                            />

                            <View style={{ marginTop: 6 }}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary, marginBottom: 8 }]}>
                                    {selectedProofConfig.name} Photos (Front & Back)
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <DocumentUploadBox
                                        label="Front Side *"
                                        uri={idProofFront}
                                        onCapture={(uri: string) => setIdProofFront(uri)}
                                        onRemove={() => setIdProofFront(null)}
                                        isFront={true}
                                    />
                                    <DocumentUploadBox
                                        label="Back Side (Optional)"
                                        uri={idProofBack}
                                        onCapture={(uri: string) => setIdProofBack(uri)}
                                        onRemove={() => setIdProofBack(null)}
                                        isFront={false}
                                    />
                                </View>
                            </View>
                        </>
                    ) : null}
                </View>

                {/* ── 4. Remarks (Optional) ── */}
                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <SectionHeader number={4} title="Special Remarks (Optional)" />
                    <FormInput
                        label="Remarks / Luggage Notes"
                        icon={FileText}
                        placeholder="Any special remarks or luggage instructions..."
                        multiline={true}
                        value={formData.remarks}
                        onChangeText={(t: string) => up('remarks', t)}
                    />
                </View>

                {/* Extra bottom scroll clearance so last inputs and keyboard never obscure content */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ── Sticky Bottom Footer (Exact Student Screen Pattern) ── */}
            <View style={[styles.footerBar, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderTopColor: isDark ? '#1E293B' : '#F1F5F9', paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={[styles.resetBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                    onPress={handleReset}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.resetBtnText, { color: theme.textSecondary }]}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Text style={styles.saveBtnText}>{isCheckinPending ? 'Approve & Check In' : isEdit ? 'Update Guest' : 'Save & Check In'}</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Options Drawers */}
            <OptionsDrawer
                visible={proofModal}
                title="Select ID Proof Type"
                data={ID_PROOF_TYPES}
                selectedId={formData.id_proof_type}
                keyExtractor={(item: any) => item.id}
                labelExtractor={(item: any) => item.name}
                onSelect={(item: any) => up('id_proof_type', item.id)}
                onClose={() => setProofModal(false)}
            />

            <OptionsDrawer
                visible={roomDrawerVisible}
                title="Select Available Room / Bed"
                data={availableRoomsList}
                selectedId={formData.room_number}
                keyExtractor={(item: any) => item.room_number}
                labelExtractor={(item: any) => item.label}
                onSelect={(selectedRoom: any) => {
                    up('room_number', selectedRoom.room_number);
                }}
                onClose={() => setRoomDrawerVisible(false)}
                searchable={true}
            />

            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                date={formData.check_in_date ? new Date(formData.check_in_date) : new Date()}
                onConfirm={(d: Date) => {
                    up('check_in_date', toLocalDateStr(d));
                    setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
    scrollContent: { padding: 16, gap: 16 },

    profilePhotoCard: {
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    profileAvatarContainer: { position: 'relative' },
    profileAvatarWrapper: { position: 'relative' },
    profileAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2.5 },
    profileAvatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    profileEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    profileRemoveBtn: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileDetailsContainer: { flex: 1 },
    profilePhotoTitle: { fontSize: 16, fontWeight: '800' },
    profilePhotoSubtitle: { fontSize: 12, marginTop: 2, marginBottom: 8 },
    profileUploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
    },
    profileUploadBtnText: { fontSize: 12, fontWeight: '700' },

    formCard: {
        borderRadius: 20,
        padding: 18,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingBottom: 12,
        borderBottomWidth: 1,
        marginBottom: 4,
    },
    sectionBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
    sectionHeaderText: { fontSize: 16, fontWeight: '800' },

    inputGroup: { gap: 6 },
    inputLabel: { fontSize: 13, fontWeight: '700' },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        height: 48,
    },
    multilineContainer: { height: 90, alignItems: 'flex-start', paddingTop: 10 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontWeight: '600', height: '100%' },
    multilineInput: { height: '100%', textAlignVertical: 'top' },
    inputText: { flex: 1, fontWeight: '600' },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 11, fontWeight: '600', marginTop: 2 },

    selectorContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
    },
    selectorTab: {
        flex: 1,
        paddingVertical: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 9,
    },
    selectorTabText: { fontSize: 13, fontWeight: '600' },

    tagChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 18,
        borderWidth: 1,
    },
    tagChipText: { fontSize: 12, fontWeight: '600' },

    docUploadBox: {
        flex: 1,
        height: 140,
        borderRadius: 16,
        borderWidth: 1.5,
        padding: 12,
    },
    docPreviewContainer: { flex: 1, position: 'relative', borderRadius: 10, overflow: 'hidden' },
    docPreviewImage: { width: '100%', height: '100%', borderRadius: 10 },
    docRemoveBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    docRetakeRow: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        right: 6,
        paddingVertical: 4,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    docBoxTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    skeletonCard: { width: 48, height: 32, borderRadius: 6, borderWidth: 1, padding: 3 },
    skeletonAvatar: { width: 14, height: 14, borderRadius: 7 },
    skeletonLine: { height: 3, borderRadius: 1.5 },
    uploadCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    docBoxTitle: { fontSize: 12, fontWeight: '800' },
    docBoxSubtitle: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
    docUploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 5,
        marginTop: 6,
    },
    docUploadBtnText: { fontSize: 11, fontWeight: '700' },

    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 16,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#CBD5E1',
        alignSelf: 'center',
        marginBottom: 12,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 14,
        borderBottomWidth: 1,
        marginBottom: 10,
    },
    sheetTitle: { fontSize: 17, fontWeight: '800' },
    doneBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
    doneBtnText: { fontWeight: '700' },
    searchInput: {
        height: 42,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontWeight: '600',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderRadius: 10,
    },
    optionRowActive: { backgroundColor: '#F3EEFF' },
    optionLabel: { fontSize: 14, fontWeight: '600' },

    sourceOptionBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        borderRadius: 16,
        borderWidth: 1.5,
        gap: 10,
    },
    sourceIconBg: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sourceOptionText: { fontSize: 13, fontWeight: '700' },

    footerBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 8,
    },
    resetBtn: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetBtnText: { fontSize: 14, fontWeight: '700' },
    saveBtn: {
        flex: 2,
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    roomModeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 12,
        marginTop: 4,
    },
    roomModeTitle: {
        fontSize: 13,
        fontWeight: '800',
    },
    roomModeSub: {
        fontSize: 11,
        marginTop: 2,
    },
});
