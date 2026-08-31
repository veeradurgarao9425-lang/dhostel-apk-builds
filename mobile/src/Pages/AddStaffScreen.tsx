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
    Modal,
    Switch,
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
import { OptionsDrawer, ModalSheet } from '../components/FormComponents';
import {
    ChevronDown,
    Camera,
    Upload,
    X,
    Check,
    User,
    Shield,
    Lock,
    Eye,
    EyeOff,
    Building,
    Sparkles,
    CheckCircle2,
    Sliders,
    KeyRound,
    AlertCircle,
    RefreshCw,
    LayoutDashboard,
    Users,
    CreditCard,
    TrendingUp,
    Building2,
    BedDouble,
    Receipt,
    Wallet,
    ShieldCheck,
    BarChart3,
    Utensils,
    Megaphone,
    Info,
} from 'lucide-react-native';
import { getResolvedImageUrl, isLocalDeviceUri, appendImageFileToFormData } from '../utils/imageHelper';

// ── 1. The 4 Bottom Navigation Bar Tabs ──
const BOTTOM_TABS_CONFIG = [
    {
        key: 'dashboard',
        title: 'Dashboard (Home Tab)',
        subtitle: 'Key hostel metrics, vacancies & quick stats',
        icon: LayoutDashboard,
        color: '#0284C7',
        bg: '#E0F2FE',
        borderActive: '#BAE6FD',
    },
    {
        key: 'students',
        title: 'Students (Students Tab)',
        subtitle: 'Resident list, profiles, room check-in & allocations',
        icon: Users,
        color: '#7C3AED',
        bg: '#F5F3FF',
        borderActive: '#DDD6FE',
        required: true,
    },
    {
        key: 'dues',
        title: 'Money (Pending Dues Tab)',
        subtitle: 'Pending rent collection & overdue tracking',
        icon: CreditCard,
        color: '#16A34A',
        bg: '#DCFCE7',
        borderActive: '#BBF7D0',
    },
    {
        key: 'finance',
        title: 'Finance (Overview Tab)',
        subtitle: 'Property revenue, P&L & financial accounts',
        icon: TrendingUp,
        color: '#2563EB',
        bg: '#EFF6FF',
        borderActive: '#BFDBFE',
    },
];

// ── 2. More Screen & Hostel Operations Modules ──
const OPERATIONS_CONFIG = [
    {
        key: 'hostels',
        title: 'Hostel Management',
        subtitle: 'Hostel profile, amenities & property settings',
        icon: Building2,
        color: '#4F46E5',
        bg: '#EEF2FF',
        borderActive: '#C7D2FE',
    },
    {
        key: 'rooms',
        title: 'Rooms & Vacant Beds',
        subtitle: 'Room configuration, vacant bed counters & floor view',
        icon: BedDouble,
        color: '#8B5CF6',
        bg: '#F5F3FF',
        borderActive: '#DDD6FE',
    },
    {
        key: 'expenses',
        title: 'Hostel Expenses',
        subtitle: 'Record & track daily hostel maintenance expenses',
        icon: Receipt,
        color: '#EF4444',
        bg: '#FEE2E2',
        borderActive: '#FECACA',
    },
    {
        key: 'income',
        title: 'Hostel Income',
        subtitle: 'Record additional receipts & miscellaneous income',
        icon: Wallet,
        color: '#10B981',
        bg: '#D1FAE5',
        borderActive: '#A7F3D0',
    },
    {
        key: 'verify_rent',
        title: 'Verify Rent & Payments',
        subtitle: 'Review & verify online UPI payment proofs',
        icon: ShieldCheck,
        color: '#059669',
        bg: '#ECFDF5',
        borderActive: '#A7F3D0',
    },
    {
        key: 'reports',
        title: 'Analytics & Reports',
        subtitle: 'Download Excel/PDF spreadsheets & financial trends',
        icon: BarChart3,
        color: '#D97706',
        bg: '#FEF3C7',
        borderActive: '#FDE68A',
    },
    {
        key: 'mess',
        title: 'Mess & Food Menu',
        subtitle: 'Daily meal schedule, weekly menu & dining options',
        icon: Utensils,
        color: '#EA580C',
        bg: '#FFF7ED',
        borderActive: '#FED7AA',
    },
    {
        key: 'complaints',
        title: 'Complaints & Maintenance',
        subtitle: 'Track resident tickets & repair maintenance issues',
        icon: AlertCircle,
        color: '#E11D48',
        bg: '#FFE4E6',
        borderActive: '#FECDD3',
    },
    {
        key: 'notices',
        title: 'Notices & Announcements',
        subtitle: 'Post announcements & broadcast notices to residents',
        icon: Megaphone,
        color: '#9333EA',
        bg: '#F3E8FF',
        borderActive: '#E9D5FF',
    },
];

const DEFAULT_MODULES: Record<string, boolean> = {
    dashboard: true,
    students: true,
    dues: true,
    finance: false,
    hostels: true,
    rooms: true,
    staff: false,
    expenses: false,
    income: false,
    verify_rent: false,
    reports: false,
    mess: true,
    complaints: true,
    notices: true,
};

const ROLES = ['Cook', 'Housekeeping', 'Security', 'Warden', 'Cleaner', 'Others'];

const ImageSourceDrawer = ({ visible, onClose, onSelectCamera, onSelectGallery, title }: any) => {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    return (
        <ModalSheet visible={visible} onClose={onClose} maxHeight="45%">
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>{title || 'Choose Source'}</Text>
                <TouchableOpacity onPress={onClose} style={[styles.doneBtn, { backgroundColor: isDark ? theme.primary + '20' : '#F3EEFF' }]}>
                    <Text style={[styles.doneBtnText, { color: theme.primary }]}>Cancel</Text>
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
                    <Text style={[styles.sourceOptionText, { color: theme.textPrimary }]}>Use Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.sourceOptionBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                    onPress={() => { onSelectGallery(); onClose(); }}
                    activeOpacity={0.75}
                >
                    <View style={[styles.sourceIconBg, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]}>
                        <Upload size={24} color={isDark ? '#FFF' : '#475569'} />
                    </View>
                    <Text style={[styles.sourceOptionText, { color: theme.textPrimary }]}>Choose Gallery</Text>
                </TouchableOpacity>
            </View>
        </ModalSheet>
    );
};

const DocumentUploadBox = ({ label, uri, onCapture, onRemove, isFront, error }: { label: string; uri: string | null; onCapture: (uri: string) => void; onRemove: () => void; isFront: boolean; error?: string }) => {
    const { theme, isDark } = useTheme();
    const [pickerVisible, setPickerVisible] = useState(false);
    const [zoomVisible, setZoomVisible] = useState(false);

    const onSelectCamera = async () => {
        try {
            const p = await ImagePicker.requestCameraPermissionsAsync();
            if (!p.granted) {
                Alert.alert('Permission Required', 'Camera permission is needed to upload documents.');
                return;
            }
            const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
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
            const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
            if (!r.canceled && r.assets && r.assets.length > 0) {
                onCapture(r.assets[0].uri);
            }
        } catch (err) {
            console.error('Document gallery error:', err);
        }
    };

    return (
        <>
            <View style={[
                styles.docUploadBox, 
                { 
                    backgroundColor: isDark ? '#1E293B' : '#F9FAFB', 
                    borderColor: error ? '#EF4444' : uri ? '#10B981' : (isDark ? '#334155' : '#E2E8F0'), 
                    borderStyle: uri ? 'solid' : 'dashed',
                }
            ]}>
                {uri ? (
                    <View style={styles.docPreviewContainer}>
                        <TouchableOpacity 
                            style={{ flex: 1, width: '100%', height: '100%' }} 
                            onPress={() => setZoomVisible(true)} 
                            activeOpacity={0.85}
                        >
                            <Image source={{ uri }} style={styles.docPreviewImage} resizeMode="cover" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.docRemoveBtn} onPress={onRemove} activeOpacity={0.8}>
                            <X size={13} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.docRetakeRow, { backgroundColor: 'rgba(0,0,0,0.65)' }]} onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
                            <Camera size={11} color="#FFF" />
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

                        <View style={{ marginTop: 4 }}>
                            <Text style={[styles.docBoxTitle, { color: error ? '#EF4444' : (isDark ? '#F1F5F9' : '#1E293B') }]} numberOfLines={1}>{label}</Text>
                            <Text style={styles.docBoxSubtitle}>JPG, PNG · Max 5MB</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.docUploadBtn, { borderColor: error ? '#EF4444' : theme.primary }]}
                            onPress={() => setPickerVisible(true)}
                            activeOpacity={0.7}
                        >
                            <Upload size={11} color={error ? '#EF4444' : theme.primary} />
                            <Text style={[styles.docUploadBtnText, { color: error ? '#EF4444' : theme.primary }]}>Upload</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {error && <Text style={{ color: '#EF4444', fontSize: 9, marginTop: 4, fontWeight: '600', textAlign: 'center' }}>{error}</Text>}
            </View>

            {/* Zoom Modal */}
            <Modal visible={zoomVisible} transparent animationType="fade" onRequestClose={() => setZoomVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.25)', padding: 10, borderRadius: 25 }}
                        onPress={() => setZoomVisible(false)}
                    >
                        <X size={22} color="#FFF" />
                    </TouchableOpacity>
                    {uri && (
                        <Image source={{ uri }} style={{ width: '92%', height: '80%' }} resizeMode="contain" />
                    )}
                </View>
            </Modal>

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
    const { theme, isDark } = useTheme();
    const [pickerVisible, setPickerVisible] = useState(false);

    const openCamera = async () => {
        try {
            const p = await ImagePicker.requestCameraPermissionsAsync();
            if (!p.granted) {
                Alert.alert('Permission Required', 'Camera permission is needed to take a profile photo.');
                return;
            }
            const r = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: false });
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
            const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: false });
            if (!r.canceled && r.assets && r.assets.length > 0) {
                onCapture(r.assets[0].uri);
            }
        } catch (err) {
            console.error('Gallery error:', err);
        }
    };

    return (
        <View style={[styles.profilePhotoCard, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: error ? '#EF4444' : (isDark ? '#334155' : 'transparent'), borderWidth: (isDark || error) ? 1 : 0 }]}>
            <TouchableOpacity onPress={() => setPickerVisible(true)} activeOpacity={0.85} style={styles.profileAvatarContainer}>
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
                <Text style={[styles.profilePhotoTitle, { color: error ? '#EF4444' : (isDark ? '#FFF' : '#1E293B') }]}>
                    Staff Profile Photo
                </Text>
                <Text style={[styles.profilePhotoSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Clear face photo for staff identity & verification
                </Text>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity
                        style={[styles.profileSmallActionBtn, { backgroundColor: theme.primary }]}
                        onPress={() => setPickerVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Camera size={12} color="#FFF" />
                        <Text style={styles.profileSmallActionBtnText}>{uri ? 'Change Photo' : 'Add Photo'}</Text>
                    </TouchableOpacity>
                    {uri && (
                        <TouchableOpacity
                            style={[styles.profileSmallActionBtn, { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' }]}
                            onPress={onRemove}
                            activeOpacity={0.8}
                        >
                            <X size={12} color="#DC2626" />
                            <Text style={[styles.profileSmallActionBtnText, { color: '#DC2626' }]}>Remove</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ImageSourceDrawer
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelectCamera={openCamera}
                onSelectGallery={openGallery}
                title="Staff Profile Photo"
            />
        </View>
    );
};

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
    const scrollViewRef = React.useRef<ScrollView>(null);
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

    // Multi-Hostel assignment
    const [availableHostels, setAvailableHostels] = useState<any[]>([]);
    const [selectedHostelId, setSelectedHostelId] = useState<number | null>(user?.hostel_id || null);
    const [hostelModalVisible, setHostelModalVisible] = useState(false);

    // App Login Credentials & Permissions
    const [canLogin, setCanLogin] = useState(false);
    const [loginPassword, setLoginPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [modules, setModules] = useState<Record<string, boolean>>(DEFAULT_MODULES);

    // Verification Real Image State
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [aadhaarFrontUri, setAadhaarFrontUri] = useState<string | null>(null);
    const [aadhaarBackUri, setAadhaarBackUri] = useState<string | null>(null);

    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [proofModalVisible, setProofModalVisible] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const renderModuleCard = (item: any) => {
        const IconComponent = item.icon;
        const isRequired = Boolean(item.required);
        const isEnabled = isRequired ? true : Boolean(modules[item.key]);

        return (
            <View
                key={item.key}
                style={[
                    styles.moduleSmallCard,
                    isEnabled && {
                        borderColor: item.borderActive,
                        backgroundColor: '#FFFFFF',
                    },
                ]}
            >
                <View style={[styles.moduleIconBox, { backgroundColor: item.bg }]}>
                    <IconComponent size={20} color={item.color} />
                </View>

                <View style={styles.moduleTextContainer}>
                    <Text style={styles.moduleCardTitle}>{item.title}</Text>
                    <Text
                        style={[
                            styles.moduleCardSubtitle,
                            isEnabled && { color: item.color, fontWeight: '700' },
                        ]}
                    >
                        {isRequired ? 'Mandatory (Check-in & Residents)' : (isEnabled ? 'Full access' : 'No access')}
                    </Text>
                </View>

                <Switch
                    value={isEnabled}
                    disabled={isRequired}
                    onValueChange={val => {
                        if (!isRequired) {
                            setModules(m => ({ ...m, [item.key]: val }));
                        }
                    }}
                    trackColor={{ false: '#E2E8F0', true: item.color }}
                    thumbColor="#FFFFFF"
                />
            </View>
        );
    };

    const generateSecurePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = 'Staff@';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setLoginPassword(result);
        setPasswordVisible(true);
        if (errors.loginPassword) {
            setErrors(p => {
                const c = { ...p };
                delete c.loginPassword;
                return c;
            });
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                let fetchedProofs: any[] = [];
                const proofRes = await api.get('/id-proof-types');
                if (proofRes.data?.success) {
                    fetchedProofs = proofRes.data.data;
                    setIdProofTypes(fetchedProofs);
                }

                try {
                    const hostelsRes = await api.get('/hostels?my_hostels=true');
                    if (hostelsRes.data?.success && Array.isArray(hostelsRes.data.data)) {
                        setAvailableHostels(hostelsRes.data.data);
                        if (!selectedHostelId && hostelsRes.data.data.length > 0) {
                            setSelectedHostelId(hostelsRes.data.data[0].hostel_id);
                        }
                    }
                } catch (_) {}

                if (isEdit && staffId) {
                    await fetchStaffDetails(fetchedProofs);
                }
            } catch (error) {
                console.error("Error fetching staff init data:", error);
            }
        };
        init();
    }, [isEdit, staffId]);

    const fetchStaffDetails = async (proofsList?: any[]) => {
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

                if (s.hostel_id) {
                    setSelectedHostelId(Number(s.hostel_id));
                }
                if (s.can_login || s.user_id) {
                    setCanLogin(true);
                }
                if (s.permissions) {
                    try {
                        const parsed = typeof s.permissions === 'string' ? JSON.parse(s.permissions) : s.permissions;
                        setModules({
                            dashboard: parsed.dashboard ? parsed.dashboard !== 'none' : true,
                            students: parsed.students ? parsed.students !== 'none' : (parsed.tenants ? parsed.tenants !== 'none' : true),
                            dues: parsed.dues ? parsed.dues !== 'none' : (parsed.finance ? parsed.finance !== 'none' : true),
                            finance: parsed.finance ? parsed.finance !== 'none' : false,
                            hostels: parsed.hostels ? parsed.hostels !== 'none' : true,
                            rooms: parsed.rooms ? parsed.rooms !== 'none' : true,
                            staff: parsed.staff ? parsed.staff !== 'none' : false,
                            expenses: parsed.expenses ? parsed.expenses !== 'none' : false,
                            income: parsed.income ? parsed.income !== 'none' : false,
                            verify_rent: parsed.verify_rent ? parsed.verify_rent !== 'none' : false,
                            reports: parsed.reports ? parsed.reports !== 'none' : false,
                            mess: parsed.mess ? parsed.mess !== 'none' : true,
                            complaints: parsed.complaints ? parsed.complaints !== 'none' : true,
                            notices: parsed.notices ? parsed.notices !== 'none' : true,
                        });
                    } catch (_) {}
                }

                const currentProofs = (proofsList && proofsList.length > 0) ? proofsList : idProofTypes;
                const rawProofType = s.id_proof_type_id || s.id_proof_type;
                let matchedProofId = '';
                if (rawProofType) {
                    const found = currentProofs.find((p: any) => p.id?.toString() === rawProofType.toString() || p.name?.toLowerCase() === rawProofType.toString().toLowerCase());
                    if (found) matchedProofId = found.id.toString();
                }
                if (!matchedProofId) {
                    const aadhaarProof = currentProofs.find((p: any) => p.name?.toLowerCase().includes('aadhar') || p.name?.toLowerCase().includes('aadhaar'));
                    if (aadhaarProof) {
                        matchedProofId = aadhaarProof.id.toString();
                    } else if (currentProofs.length > 0) {
                        matchedProofId = currentProofs[0].id.toString();
                    }
                }
                setIdProofTypeId(matchedProofId);

                setIdProofNumber(s.id_proof_number || s.aadhaar_number || '');
                setNotes(s.notes || '');
                
                const photoVal = s.photo || s.photo_url || s.profile_photo || s.avatar;
                setPhotoUri(photoVal ? getResolvedImageUrl(photoVal) : null);

                const frontVal = s.aadhaar_front || s.aadhaar_front_url || s.id_proof_front || s.id_proof_front_url;
                setAadhaarFrontUri(frontVal ? getResolvedImageUrl(frontVal) : null);

                const backVal = s.aadhaar_back || s.aadhaar_back_url || s.id_proof_back || s.id_proof_back_url;
                setAadhaarBackUri(backVal ? getResolvedImageUrl(backVal) : null);
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
                quality: 0.5,
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
                quality: 0.5,
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
        if (email && email.trim()) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                errs.email = 'Invalid email address';
            }
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

        if (canLogin) {
            if (!isEdit && (!loginPassword || loginPassword.trim().length < 6)) {
                errs.loginPassword = 'Password must be at least 6 characters for app login';
            } else if (loginPassword && loginPassword.trim().length < 6) {
                errs.loginPassword = 'Password must be at least 6 characters';
            }
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
                loginPassword: 'Login Password',
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
            
            const permissionsPayload = {
                dashboard: modules.dashboard ? 'view' : 'none',
                students: modules.students ? 'manage' : 'none',
                tenants: modules.students ? 'manage' : 'none',
                dues: modules.dues ? 'manage' : 'none',
                finance: modules.finance ? 'manage' : 'none',
                hostels: modules.hostels ? 'manage' : 'none',
                rooms: modules.rooms ? 'manage' : 'none',
                staff: modules.staff ? 'manage' : 'none',
                expenses: modules.expenses ? 'manage' : 'none',
                income: modules.income ? 'manage' : 'none',
                verify_rent: modules.verify_rent ? 'manage' : 'none',
                reports: modules.reports ? 'view' : 'none',
                mess: modules.mess ? 'manage' : 'none',
                complaints: modules.complaints ? 'manage' : 'none',
                notices: modules.notices ? 'manage' : 'none',
            };

            const payload: any = {
                hostel_id: selectedHostelId || user?.hostel_id,
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
                can_login: canLogin ? 1 : 0,
                permissions: JSON.stringify(permissionsPayload),
                ...(canLogin && loginPassword ? { password: loginPassword.trim() } : {}),
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
        setCanLogin(false);
        setLoginPassword('');
        setModules(DEFAULT_MODULES);
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
                ref={scrollViewRef}
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: (isKeyboardVisible ? 320 : 180) + insets.bottom }]}
                keyboardShouldPersistTaps="handled"
            >
                {/* Profile Photo / Avatar Capture matching AddStudent */}
                <ProfilePhotoCapture 
                    uri={photoUri} 
                    onCapture={(u: string) => { setPhotoUri(u); setErrors(p => ({ ...p, selfie: '' })); }} 
                    onRemove={() => setPhotoUri(null)} 
                    error={errors.selfie} 
                />

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
                        <Text style={styles.inputLabel}>Email Address (Optional)</Text>
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
                        <Text style={styles.inputLabel}>Monthly Salary (₹) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                        <View style={[styles.inputContainer, errors.monthlySalary && styles.inputError]}>
                            <Ionicons name="cash-outline" size={18} color={errors.monthlySalary ? '#EF4444' : theme.primary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter monthly salary"
                                placeholderTextColor="#A0AEC0"
                                keyboardType="numeric"
                                value={monthlySalary}
                                onChangeText={(t) => {
                                    setMonthlySalary(t);
                                    setErrors(prev => {
                                        const copy = { ...prev };
                                        delete copy.monthlySalary;
                                        return copy;
                                    });
                                }}
                            />
                        </View>
                        {errors.monthlySalary && <Text style={styles.errorText}>{errors.monthlySalary}</Text>}
                    </View>
                </View>

                {/* Mobile App Login Credentials */}
                <View style={styles.formCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <KeyRound size={20} color={theme.primary} />
                            <Text style={styles.sectionTitle}>Hostix App Access</Text>
                        </View>
                        <Switch
                            value={canLogin}
                            onValueChange={setCanLogin}
                            trackColor={{ false: '#CBD5E1', true: theme.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <Text style={styles.fieldHint}>
                        Allow this staff member to log in to the Hostix mobile app with their mobile number or email.
                    </Text>

                    {canLogin && (
                        <View style={{ marginTop: 14, gap: 14 }}>
                            <View style={styles.inputGroup}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={styles.inputLabel}>
                                        {isEdit ? "Set New Password (optional)" : "Staff Login Password *"}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={generateSecurePassword}
                                        style={styles.generateBtn}
                                        activeOpacity={0.7}
                                    >
                                        <Sparkles size={13} color={theme.primary} />
                                        <Text style={[styles.generateBtnText, { color: theme.primary }]}>Auto-Generate</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={[styles.inputContainer, errors.loginPassword && styles.inputError]}>
                                    <Lock size={18} color={errors.loginPassword ? '#EF4444' : theme.primary} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { paddingRight: 40 }]}
                                        placeholder={isEdit ? "Leave blank to keep existing password" : "Enter minimum 6 characters"}
                                        placeholderTextColor="#A0AEC0"
                                        secureTextEntry={!passwordVisible}
                                        value={loginPassword}
                                        onChangeText={t => {
                                            setLoginPassword(t);
                                            if (errors.loginPassword) {
                                                setErrors(p => {
                                                    const c = { ...p };
                                                    delete c.loginPassword;
                                                    return c;
                                                });
                                            }
                                        }}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setPasswordVisible(!passwordVisible)}
                                        style={styles.eyeBtn}
                                        activeOpacity={0.7}
                                    >
                                        {passwordVisible ? <EyeOff size={18} color="#64748B" /> : <Eye size={18} color="#64748B" />}
                                    </TouchableOpacity>
                                </View>
                                {errors.loginPassword && <Text style={styles.errorText}>{errors.loginPassword}</Text>}
                            </View>

                            <View style={[styles.securityNoticeBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                                <Shield size={16} color="#16A34A" style={{ marginTop: 2 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.securityNoticeTitle, { color: '#166534' }]}>
                                        Hostel Isolation Guaranteed
                                    </Text>
                                    <Text style={[styles.securityNoticeText, { color: '#15803D' }]}>
                                        When this staff logs in, they will strictly only access {availableHostels.find(h => h.hostel_id === selectedHostelId)?.hostel_name || 'the selected hostel'}. They cannot view or manage your other hostels.
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* ── App Access Module Privileges ── */}
                {canLogin && (
                    <>
                        <View style={styles.formCard}>
                            <Text style={styles.sectionTitle}>📱 Bottom Navigation Tabs</Text>
                            <Text style={styles.fieldHint}>
                                Control tabs visible in this staff member's bottom navigation bar.
                            </Text>
                            <View style={styles.cardsGrid}>
                                {BOTTOM_TABS_CONFIG.map(renderModuleCard)}
                            </View>
                        </View>

                        <View style={styles.formCard}>
                            <Text style={styles.sectionTitle}>⚙️ Hostel Operations & Features</Text>
                            <Text style={styles.fieldHint}>
                                Modules and administrative operations accessible from the More screen.
                            </Text>
                            <View style={styles.cardsGrid}>
                                {OPERATIONS_CONFIG.map(renderModuleCard)}
                            </View>
                        </View>
                    </>
                )}

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
                            <View style={styles.idUploadBoxesRow}>
                                <DocumentUploadBox
                                    label="Front Side"
                                    uri={aadhaarFrontUri}
                                    onCapture={(u) => { setAadhaarFrontUri(u); setErrors(p => ({ ...p, idFront: '' })); }}
                                    onRemove={() => setAadhaarFrontUri(null)}
                                    isFront={true}
                                    error={errors.idFront}
                                />
                                <DocumentUploadBox
                                    label="Back Side"
                                    uri={aadhaarBackUri}
                                    onCapture={(u) => { setAadhaarBackUri(u); setErrors(p => ({ ...p, idBack: '' })); }}
                                    onRemove={() => setAadhaarBackUri(null)}
                                    isFront={false}
                                    error={errors.idBack}
                                />
                            </View>
                        </>
                    ) : null}
                </View>

                {/* Additional Notes */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>📝 Additional Notes</Text>
                    <View style={[styles.inputContainer, { height: 85, alignItems: 'flex-start', paddingTop: 10 }]}>
                        <Ionicons name="document-text-outline" size={18} color={theme.primary} style={[styles.inputIcon, { marginTop: 2 }]} />
                        <TextInput
                            style={[styles.input, { height: 65, textAlignVertical: 'top' }]}
                            placeholder="Add any internal remarks, address, emergency contact..."
                            placeholderTextColor="#A0AEC0"
                            multiline
                            value={notes}
                            onChangeText={setNotes}
                            onFocus={() => {
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 250);
                            }}
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

    // Profile Photo row redesign matching AddStudent
    profilePhotoCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        gap: 16,
        marginBottom: 14,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    profileAvatarContainer: {
        position: 'relative',
    },
    profileAvatarWrapper: {
        position: 'relative',
    },
    profileAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 2.5,
    },
    profileAvatarPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    profileEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    profileRemoveBtn: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFF',
    },
    profileDetailsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    profilePhotoTitle: {
        fontWeight: '700',
        fontSize: 15,
        marginBottom: 2,
    },
    profilePhotoSubtitle: {
        fontSize: 11,
        lineHeight: 15,
    },
    profileSmallActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    profileSmallActionBtnText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },

    // ID Proof Documents (Front & Back) matching AddStudent
    idUploadBoxesRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 6,
    },
    docUploadBox: {
        flex: 1,
        borderWidth: 1.5,
        borderRadius: 14,
        padding: 10,
        height: 145,
    },
    docPreviewContainer: {
        flex: 1,
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
    },
    docPreviewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    docRemoveBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.6)',
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
    docBoxTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skeletonCard: {
        width: 65,
        height: 40,
        borderRadius: 6,
        borderWidth: 1,
        padding: 4,
    },
    skeletonAvatar: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    skeletonLine: {
        height: 3,
        borderRadius: 1.5,
    },
    uploadCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docBoxTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    docBoxSubtitle: {
        fontSize: 9,
        color: '#94A3B8',
        lineHeight: 12,
    },
    docUploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: 6,
        paddingVertical: 6,
    },
    docUploadBtnText: {
        fontSize: 11,
        fontWeight: 'bold',
    },

    // Sheet Modal Drawer for Camera / Gallery matching AddStudent
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 12,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    sheetTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    doneBtn: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 8,
    },
    doneBtnText: {
        fontWeight: '700',
        fontSize: 14,
    },
    sourceOptionBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        borderWidth: 1.5,
        gap: 8,
    },
    sourceIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sourceOptionText: {
        fontWeight: '700',
        fontSize: 13,
    },
    // Assigned Hostel Styles
    hostelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    hostelBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    fieldHint: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 12,
        lineHeight: 16,
    },
    hostelPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        backgroundColor: '#FFF',
    },
    hostelIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hostelPickerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    hostelPickerSubtitle: {
        fontSize: 12,
        color: '#64748B',
    },
    singleHostelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    singleHostelName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    lockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    lockedBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },

    // App Login & Security Styles
    generateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: '#F3EEFF',
    },
    generateBtnText: {
        fontSize: 11,
        fontWeight: '700',
    },
    eyeBtn: {
        position: 'absolute',
        right: 12,
        height: '100%',
        justifyContent: 'center',
    },
    securityNoticeBox: {
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
    },
    securityNoticeTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 2,
    },
    securityNoticeText: {
        fontSize: 11,
        lineHeight: 15,
    },

    // Module Switch Cards Styles
    cardsGrid: {
        gap: 10,
        marginTop: 6,
    },
    moduleSmallCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    moduleIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    moduleTextContainer: {
        flex: 1,
        paddingRight: 8,
    },
    moduleCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    moduleCardSubtitle: {
        fontSize: 11.5,
        color: '#64748B',
        fontWeight: '500',
        lineHeight: 16,
    },

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
