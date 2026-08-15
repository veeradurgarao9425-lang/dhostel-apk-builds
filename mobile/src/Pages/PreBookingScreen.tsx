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
    ActivityIndicator,
    Alert,
    Keyboard,
    Pressable,
    Animated,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import {
    User, Phone, Home, Calendar,
    ChevronDown, Check, BedDouble, Plus, Search,
    Mail, CreditCard
} from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useAuth } from '../../contexts/AuthContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS, FONT, SPACING } from '../theme/index';
import { AppHeader } from '../components/AppHeader';
import { FullScreenLoader } from '../components/FullScreenLoader';

// ─── Reusable custom components ──────────────────────────────────────────────
const FormInput = ({ label, icon: Icon, placeholder, value, onChangeText, keyboardType, error, onBlur }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const renderLabel = (text: string) => {
        if (text.includes('*')) {
            const parts = text.split('*');
            return (
                <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>
                    {parts[0]}<Text style={{ color: '#EF4444' }}>*</Text>{parts[1]}
                </Text>
            );
        }
        return <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>{text}</Text>;
    };

    return (
        <View style={styles.inputGroup}>
            {renderLabel(label)}
            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }, error && styles.inputError]}>
                <View style={styles.inputIcon}><Icon size={18} color={error ? '#EF4444' : theme.primary} /></View>
                <TextInput
                    style={[styles.input, { color: theme.textPrimary, fontSize }]}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? '#475569' : '#BBBBBB'}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    maxLength={keyboardType === 'phone-pad' ? 10 : undefined}
                    onBlur={onBlur}
                />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const SelectField = ({ label, value, placeholder, icon: Icon, onPress, error }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const renderLabel = (text: string) => {
        if (text.includes('*')) {
            const parts = text.split('*');
            return (
                <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>
                    {parts[0]}<Text style={{ color: '#EF4444' }}>*</Text>{parts[1]}
                </Text>
            );
        }
        return <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>{text}</Text>;
    };

    return (
        <View style={styles.inputGroup}>
            {renderLabel(label)}
            <TouchableOpacity 
                style={[styles.inputContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }, error && styles.inputError]} 
                onPress={onPress}
                activeOpacity={0.7}
            >
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
    const selectedIndex = options.indexOf(selected);
    const anim = useRef(new Animated.Value(selectedIndex >= 0 ? selectedIndex : 0)).current;

    useEffect(() => {
        if (selectedIndex >= 0) {
            Animated.spring(anim, {
                toValue: selectedIndex,
                useNativeDriver: false,
                tension: 80,
                friction: 12,
            }).start();
        }
    }, [selectedIndex]);

    const [containerWidth, setContainerWidth] = useState(0);
    const numOptions = options.length;
    const itemWidth = containerWidth ? (containerWidth - 8) / numOptions : 0;

    const translateX = anim.interpolate({
        inputRange: [0, numOptions - 1],
        outputRange: [0, (numOptions - 1) * itemWidth],
    });

    return (
        <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: fontSize - 1, color: theme.textSecondary }]}>{label}</Text>
            <View 
                style={[
                    styles.selectorContainer, 
                    { 
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9', 
                        borderColor: isDark ? '#334155' : '#E2E8F0' 
                    }
                ]}
                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
                {itemWidth > 0 && (
                    <Animated.View 
                        style={[
                            styles.selectorPill, 
                            { 
                                width: itemWidth, 
                                backgroundColor: theme.primary,
                                transform: [{ translateX }] 
                            }
                        ]}
                    />
                )}
                {options.map((opt: string) => {
                    const isAct = selected === opt;
                    return (
                        <TouchableOpacity
                            key={opt}
                            style={styles.selectorTab}
                            onPress={() => onSelect(opt)}
                            activeOpacity={0.8}
                        >
                            <Text 
                                style={[
                                    styles.selectorTabText, 
                                    { fontSize: fontSize, color: isAct ? '#FFF' : theme.textSecondary },
                                    isAct && { fontWeight: '800' }
                                ]}
                            >
                                {opt}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

// ─── Smooth bottom-sheet modal ────────────────────────────────────────────────
const ModalSheet = ({ visible, onClose, maxHeight = '85%', children }: any) => {
    const { theme } = useTheme();
    const anim = useRef(new Animated.Value(0)).current;

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
                <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'transparent', opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                </Animated.View>
                <Animated.View style={[
                    styles.sheet,
                    { maxHeight, backgroundColor: theme.cardBg || '#FFF', transform: [{ translateY: sheetTranslateY }] }
                ]}>
                    <View style={styles.sheetHandle} />
                    {children}
                </Animated.View>
            </View>
        </Modal>
    );
};

const RoomPickerDrawer = ({ visible, rooms, selectedRoomId, onSelectRoom, onClose }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const [search, setSearch] = useState('');
    const [selectedFloor, setSelectedFloor] = useState('All');

    const uniqueFloors = React.useMemo(() => {
        const floorsSet = new Set<number>();
        rooms.forEach((r: any) => {
            if (r.floor_number !== undefined && r.floor_number !== null) {
                floorsSet.add(r.floor_number);
            }
        });
        const sorted = Array.from(floorsSet).sort((a, b) => a - b);
        return ['All', ...sorted.map(f => f.toString())];
    }, [rooms]);

    useEffect(() => {
        if (!uniqueFloors.includes(selectedFloor)) {
            setSelectedFloor('All');
        }
    }, [rooms, uniqueFloors]);

    const grouped = React.useMemo(() => {
        let f = search ? rooms.filter((r: any) => r.room_number?.toString().includes(search)) : rooms;
        if (selectedFloor !== 'All') {
            f = f.filter((r: any) => (r.floor_number?.toString() || '0') === selectedFloor);
        }
        const map: Record<number, any[]> = {};
        f.forEach((r: any) => { const fl = r.floor_number ?? 0; if (!map[fl]) map[fl] = []; map[fl].push(r); });
        
        return Object.keys(map).sort((a, b) => {
            const floorA = map[Number(a)];
            const floorB = map[Number(b)];
            const aHasAvail = floorA.some((r: any) => (r.available_beds ?? 0) > 0);
            const bHasAvail = floorB.some((r: any) => (r.available_beds ?? 0) > 0);
            if (aHasAvail && !bHasAvail) return -1;
            if (!aHasAvail && bHasAvail) return 1;
            return Number(a) - Number(b);
        }).map(fl => {
            const floorRooms = map[Number(fl)];
            floorRooms.sort((a: any, b: any) => {
                const aAvail = (a.available_beds ?? 0) > 0;
                const bAvail = (b.available_beds ?? 0) > 0;
                if (aAvail && !bAvail) return -1;
                if (!aAvail && bAvail) return 1;
                return (a.room_number ?? '').toString().localeCompare((b.room_number ?? '').toString(), undefined, { numeric: true });
            });
            return { floor: Number(fl), rooms: floorRooms };
        });
    }, [rooms, search, selectedFloor]);

    const statusColor = (r: any) => r.status === 'MAINTENANCE' ? '#F97316' : (r.available_beds ?? 0) > 0 ? '#16A34A' : '#DC2626';

    return (
        <ModalSheet visible={visible} onClose={onClose} maxHeight="80%">
            <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Select Room</Text>
                <TouchableOpacity onPress={onClose} style={[styles.doneBtn, { backgroundColor: isDark ? theme.primary + '20' : '#FFEFE6' }]}><Text style={[styles.doneBtnText, { color: theme.primary }]}>Close</Text></TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, marginBottom: 8, marginTop: 8 }}>
                <View style={[styles.searchBarWrap, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <Search color={isDark ? '#94A3B8' : '#64748B'} size={18} style={{ marginRight: 8 }} />
                    <TextInput style={{ flex: 1, fontSize: 15, color: theme.textPrimary }} placeholder="Search room..." placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={search} onChangeText={setSearch} />
                </View>
            </View>
            {uniqueFloors.length > 1 && (
                <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {uniqueFloors.map((floor) => {
                            const isSel = selectedFloor === floor;
                            const label = floor === 'All' ? 'All Floors' : `Floor ${floor}`;
                            return (
                                <TouchableOpacity
                                    key={floor}
                                    onPress={() => setSelectedFloor(floor)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: isSel ? theme.primary : (isDark ? '#334155' : '#E2E8F0'),
                                        backgroundColor: isSel ? theme.primary : (isDark ? '#1E293B' : '#FFF'),
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '700',
                                        color: isSel ? '#FFF' : theme.textSecondary,
                                    }}>{label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 16 }}>
                {grouped.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: theme.textSecondary }}>No rooms found</Text></View>}
                {grouped.map(({ floor, rooms: fr }) => (
                    <View key={floor}>
                        <View style={[styles.floorChip, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}><Text style={[styles.floorChipText, { color: theme.textSecondary }]}>FLOOR {floor}</Text></View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                            {fr.map((room: any) => {
                                const isSel = selectedRoomId === room.room_id?.toString();
                                const avail = room.available_beds ?? 0;
                                return (
                                    <TouchableOpacity key={room.room_id}
                                        style={[
                                            styles.roomCard, 
                                            { 
                                                backgroundColor: isDark ? '#1E293B' : (isSel ? theme.primary + '10' : '#FFF'), 
                                                borderColor: isSel ? theme.primary : (isDark ? '#334155' : '#E2E8F0'),
                                                width: '48.5%',
                                                padding: 14,
                                                marginBottom: 10,
                                                borderWidth: 1.5,
                                                borderRadius: 14,
                                                elevation: 1,
                                                shadowColor: '#000',
                                                shadowOpacity: 0.02,
                                                shadowRadius: 3,
                                                shadowOffset: { width: 0, height: 1 },
                                            },
                                            avail <= 0 && { opacity: 0.55 }
                                        ]}
                                        onPress={() => { onSelectRoom(room); setSearch(''); onClose(); }} activeOpacity={0.75}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <Text style={{ fontSize: fontSize + 2, fontWeight: '800', color: isSel ? theme.primary : theme.textPrimary }}>Room {room.room_number}</Text>
                                            {isSel && <Check size={14} color={theme.primary} />}
                                        </View>
                                        <View style={{ gap: 4 }}>
                                            <Text style={{ fontSize: fontSize - 2, color: theme.textSecondary }} numberOfLines={1}>Type: {room.room_type_name ? room.room_type_name.replace(/share|sharing|sh/gi, '').trim() : 'Standard'}</Text>
                                            <Text style={{ fontSize: fontSize - 2, color: statusColor(room), fontWeight: '700' }}>Avail: {avail} / {room.capacity ?? '—'}</Text>
                                            <Text style={{ fontSize: fontSize - 2, color: theme.textPrimary, fontWeight: '700', marginTop: 2 }}>₹{room.rent_per_bed ?? room.base_rent ?? '—'}/bed</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </ModalSheet>
    );
};

// ─── Inline Bed Picker Drawer ────────────────────────────────────────────────
const BedPickerDrawer = ({ visible, room, beds, selectedBedId, onSelectBed, onClose, loading }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <ModalSheet visible={visible} onClose={onClose} maxHeight="65%">
            <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Beds in Room {room?.room_number}</Text>
                <TouchableOpacity onPress={onClose} style={[styles.doneBtn, { backgroundColor: isDark ? theme.primary + '20' : '#FFEFE6' }]}><Text style={[styles.doneBtnText, { color: theme.primary }]}>Close</Text></TouchableOpacity>
            </View>
            {room && <View style={{ paddingHorizontal: 16, marginBottom: 8 }}><View style={[styles.floorChip, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}><Text style={[styles.floorChipText, { color: theme.textSecondary }]}>ROOM {room.room_number}</Text></View></View>}
            {loading ? (
                <View style={{ minHeight: 250, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color={theme.primary} size="large" />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150 }}>
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PreBookingScreen({ navigation, route }: any) {
    const { user } = useAuth();
    const { theme, isDark, fontSize } = useTheme();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [rooms, setRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [bedsLoading, setBedsLoading] = useState(false);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        id_proof_type_id: '',
        id_proof_number: '',
        gender: 'Male',
        expected_join_date: new Date().toISOString().split('T')[0],
        room_id: '',
        bed_id: '',
        floor_number: '',
        monthly_rent: '',
    });

    const [roomModal, setRoomModal] = useState(false);
    const [bedModal, setBedModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [idProofTypes, setIdProofTypes] = useState<any[]>([]);
    const [proofModal, setProofModal] = useState(false);

    const selectedRoom = rooms.find(r => r.room_id?.toString() === formData.room_id);
    const selectedBed = beds.find(b => b.bed_id?.toString() === formData.bed_id);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [roomsRes, proofRes] = await Promise.all([
                api.get(`/rooms?hostelId=${user?.hostel_id}&limit=200`),
                api.get('/id-proof-types'),
            ]);
            if (roomsRes.data?.success) {
                setRooms(roomsRes.data.data || []);
            }
            if (proofRes.data?.success) {
                setIdProofTypes(proofRes.data.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, [user?.hostel_id]);

    const fetchBeds = useCallback(async (roomId: string) => {
        setBedsLoading(true);
        const room = rooms.find(r => r.room_id?.toString() === roomId);
        const cap = room?.total_capacity ?? room?.capacity ?? 4;
        const occupiedList = room?.occupied_beds_list || [];
        const bedLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        
        const bedsData = Array.from({ length: Number(cap) }, (_, i) => {
            const bedNumber = bedLetters[i] || `Bed ${i+1}`;
            const isOccupied = occupiedList.includes(bedNumber);
            return {
                bed_id: bedNumber,
                bed_name: `Bed ${bedNumber}`,
                status: isOccupied ? 'occupied' : 'available',
                student_id: isOccupied ? 1 : null,
            };
        });
        setBeds(bedsData);
        setBedsLoading(false);
    }, [rooms]);

    const up = (key: string, val: any) => setFormData(p => ({ ...p, [key]: val }));

    const validate = () => {
        const e: Record<string, string> = {};
        if (!formData.first_name) e.first_name = 'First name is required';
        if (!formData.phone) {
            e.phone = 'Phone is required';
        } else if (!/^\d{10}$/.test(formData.phone)) {
            e.phone = 'Must be exactly 10 digits';
        }
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            e.email = 'Invalid email format';
        }
        if (formData.id_proof_type_id) {
            if (!formData.id_proof_number.trim()) {
                e.id_proof_number = 'ID Proof number is required';
            } else {
                const proofTypeName = idProofTypes.find(t => t.id.toString() === formData.id_proof_type_id)?.name || '';
                if (proofTypeName.toLowerCase().includes('aadhar') || proofTypeName.toLowerCase().includes('aadhaar')) {
                    if (formData.id_proof_number.length !== 12) e.id_proof_number = 'Aadhaar must be exactly 12 digits';
                    else if (!/^\d{12}$/.test(formData.id_proof_number)) e.id_proof_number = 'Aadhaar must be numeric';
                } else if (proofTypeName.toLowerCase().includes('pan')) {
                    if (formData.id_proof_number.length !== 10) e.id_proof_number = 'PAN must be exactly 10 characters';
                    else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(formData.id_proof_number)) e.id_proof_number = 'Invalid PAN format. Must be like ABCDE1234F';
                }
            }
        }
        if (!formData.expected_join_date) e.expected_join_date = 'Expected join date is required';
        if (!formData.room_id) e.room_id = 'Room allocation is strictly mandatory';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const checkUnique = async (field: 'phone' | 'email' | 'id_proof_number', value: string) => {
        if (!value || !value.trim()) return;

        if (field === 'phone' && !/^\d{10}$/.test(value.trim())) return;
        if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return;
        if (field === 'id_proof_number' && formData.id_proof_type_id) {
            const typeName = idProofTypes.find(t => t.id.toString() === formData.id_proof_type_id)?.name || '';
            if ((typeName.toLowerCase().includes('aadhar') || typeName.toLowerCase().includes('aadhaar')) && value.trim().length !== 12) return;
            if (typeName.toLowerCase().includes('pan') && value.trim().length !== 10) return;
        }

        try {
            const res = await api.get('/students/check-unique', {
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
            console.log('Check unique prebooking error', e);
        }
    };

    const handleReset = () => {
        setFormData({
            first_name: '', last_name: '', phone: '', email: '', id_proof_type_id: '', id_proof_number: '', gender: 'Male', expected_join_date: new Date().toISOString().split('T')[0],
            room_id: '', bed_id: '', floor_number: '', monthly_rent: '',
        });
        setErrors({});
    };

    const handleSave = async () => {
        if (!validate()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please complete the highlighted fields.' });
            return;
        }
        setLoading(true);
        try {
            const payload = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                gender: formData.gender,
                phone: formData.phone.trim(),
                email: formData.email.trim() || null,
                id_proof_type: formData.id_proof_type_id || null,
                id_proof_number: formData.id_proof_number.trim() || null,
                hostel_id: user?.hostel_id,
                admission_date: formData.expected_join_date,
                room_id: parseInt(formData.room_id),
                bed_id: formData.bed_id || null,
                bed_number: formData.bed_id || null,
                status: 2,
                admission_fee: 0,
                admission_status: 0,
                id_proof_status: 1,
            };
            await api.post('/students', payload);
            Toast.show({ type: 'success', text1: 'Pre-Booking Saved', text2: 'The bed has been successfully reserved.' });
            navigation.goBack();
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to save pre-booking');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="dark-content" />
            <AppHeader title="Pre-Book Room" />
            <FullScreenLoader visible={loading} />

            <ScrollView 
                style={styles.content} 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={[styles.scrollContent, { paddingBottom: (isKeyboardVisible ? 280 : 150) + insets.bottom }]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={{ marginBottom: 20, paddingHorizontal: 5 }}>
                    <Text style={{ fontSize: fontSize + 8, fontWeight: '800', color: theme.textPrimary, marginBottom: 5 }}>
                        Pre-Booking
                    </Text>
                    <Text style={{ fontSize: fontSize - 1, color: theme.textSecondary }}>
                        Reserve a bed for an upcoming tenant. Room allocation is mandatory to proceed.
                    </Text>
                </View>

                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary }]}>👤 Tenant Information</Text>
                    <FormInput label="First Name *" icon={User} placeholder="e.g. Rahul" value={formData.first_name} error={errors.first_name} onChangeText={(t: string) => up('first_name', t)} />
                    <FormInput label="Last Name" icon={User} placeholder="e.g. Sharma" value={formData.last_name} onChangeText={(t: string) => up('last_name', t)} />
                    <Selector label="Gender" options={['Male', 'Female', 'Other']} selected={formData.gender} onSelect={(v: string) => up('gender', v)} />
                    <FormInput 
                        label="Phone *" 
                        icon={Phone} 
                        placeholder="9876543210" 
                        keyboardType="phone-pad" 
                        value={formData.phone} 
                        error={errors.phone} 
                        onChangeText={(t: string) => {
                            const numericText = t.replace(/\D/g, '').substring(0, 10);
                            up('phone', numericText);
                            setErrors(prev => { const newE = { ...prev }; delete newE.phone; return newE; });
                        }} 
                        onBlur={() => checkUnique('phone', formData.phone)}
                    />
                    <FormInput 
                        label="Email Address" 
                        icon={Mail} 
                        placeholder="e.g. tenant@example.com" 
                        keyboardType="email-address"
                        value={formData.email} 
                        error={errors.email} 
                        onChangeText={(t: string) => {
                            up('email', t);
                            setErrors(prev => { const newE = { ...prev }; delete newE.email; return newE; });
                        }} 
                        onBlur={() => checkUnique('email', formData.email)}
                    />
                    <SelectField 
                        label="ID Proof Type" 
                        icon={CreditCard} 
                        placeholder="Select ID Proof Type" 
                        value={idProofTypes.find(t => t.id.toString() === formData.id_proof_type_id)?.name || ''} 
                        error={errors.id_proof_type_id} 
                        onPress={() => setProofModal(true)} 
                    />
                    {formData.id_proof_type_id ? (
                        <FormInput 
                            label={`${idProofTypes.find(t => t.id.toString() === formData.id_proof_type_id)?.name || 'ID'} Number *`} 
                            icon={CreditCard} 
                            placeholder={`Enter ${idProofTypes.find(t => t.id.toString() === formData.id_proof_type_id)?.name || 'ID'} Number`} 
                            value={formData.id_proof_number} 
                            error={errors.id_proof_number} 
                            onChangeText={(t: string) => {
                                const proofTypeName = idProofTypes.find(p => p.id.toString() === formData.id_proof_type_id)?.name || '';
                                let clean = t;
                                if (proofTypeName.toLowerCase().includes('aadhar') || proofTypeName.toLowerCase().includes('aadhaar')) {
                                    clean = t.replace(/\D/g, '').slice(0, 12);
                                } else if (proofTypeName.toLowerCase().includes('pan')) {
                                    clean = t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                                }
                                up('id_proof_number', clean);
                                setErrors(prev => { const newE = { ...prev }; delete newE.id_proof_number; return newE; });
                            }} 
                            onBlur={() => checkUnique('id_proof_number', formData.id_proof_number)}
                        />
                    ) : null}
                </View>

                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary }]}>📅 Schedule Details</Text>
                    <SelectField label="Expected Join Date *" icon={Calendar} placeholder="Pick date" value={formData.expected_join_date} error={errors.expected_join_date} onPress={() => setShowDatePicker(true)} />
                </View>

                <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fontSize + 1, color: theme.textPrimary }]}>🏠 Room & Bed Allocation</Text>
                    <View style={[styles.row, { gap: 12 }]}>
                        <TouchableOpacity style={[styles.allocationBtn, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }, selectedRoom && { borderColor: theme.primary, backgroundColor: isDark ? theme.primary + '20' : '#FFF7ED' }]} onPress={() => setRoomModal(true)}>
                            <Home size={17} color={selectedRoom ? theme.primary : theme.textSecondary} />
                            <Text style={[styles.allocationBtnText, { color: theme.textSecondary }, selectedRoom && { color: theme.primary }]}>{selectedRoom ? `Room ${selectedRoom.room_number}` : 'Select Room'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.allocationBtn, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }, selectedBed && { borderColor: theme.primary, backgroundColor: isDark ? theme.primary + '20' : '#FFF7ED' }, !selectedRoom && styles.allocationBtnDisabled]} onPress={() => { if (selectedRoom) setBedModal(true); }}>
                            <BedDouble size={17} color={selectedBed ? theme.primary : !selectedRoom ? (isDark ? '#334155' : '#CBD5E1') : theme.textSecondary} />
                            <Text style={[styles.allocationBtnText, { color: theme.textSecondary }, selectedBed && { color: theme.primary }, !selectedRoom && { color: isDark ? '#334155' : '#CBD5E1' }]}>{selectedBed ? `Bed ${selectedBed.bed_name || ''}` : 'Select Bed'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.stickyFooter, { backgroundColor: theme.cardBg, borderTopColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: isKeyboardVisible ? 0 : Math.max(insets.bottom + 20, 48), paddingTop: 16, marginTop: 8, flexDirection: 'column' }]}>
                <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', marginBottom: 12, fontWeight: '500' }}>Please review pre-booking details carefully before saving.</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#CBD5E1' }]} onPress={handleReset}><Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Reset</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.primary }]} onPress={handleSave}><Text style={styles.submitButtonText}>Save Pre-Booking</Text></TouchableOpacity>
                </View>
            </View>

            <DateTimePickerModal isVisible={showDatePicker} mode="date" onConfirm={(date) => { up('expected_join_date', date.toISOString().split('T')[0]); setShowDatePicker(false); }} onCancel={() => setShowDatePicker(false)} />
            <RoomPickerDrawer visible={roomModal} rooms={rooms} selectedRoomId={formData.room_id} onSelectRoom={(room: any) => { up('room_id', room.room_id.toString()); fetchBeds(room.room_id.toString()); }} onClose={() => setRoomModal(false)} />
            <BedPickerDrawer visible={bedModal} room={selectedRoom} beds={beds} selectedBedId={formData.bed_id} loading={bedsLoading} onSelectBed={(bed: any) => up('bed_id', bed.bed_id.toString())} onClose={() => setBedModal(false)} />

            {/* ID Proof Type Modal */}
            <Modal
                visible={proofModal}
                transparent
                animationType="fade"
                onRequestClose={() => setProofModal(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setProofModal(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select ID Proof Type</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {idProofTypes.map((type) => (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.modalItem,
                                        formData.id_proof_type_id === type.id.toString() && { backgroundColor: theme.primary + '15' }
                                    ]}
                                    onPress={() => {
                                        up('id_proof_type_id', type.id.toString());
                                        setProofModal(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.modalItemText, 
                                        { color: theme.textPrimary },
                                        formData.id_proof_type_id === type.id.toString() && { color: theme.primary, fontWeight: '700' }
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
    content: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    formCard: { borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6 },
    sectionTitle: { fontWeight: '700', marginBottom: 14 },
    inputGroup: { marginBottom: 14 },
    inputLabel: { fontWeight: '600', marginBottom: 6 },
    inputContainer: { height: 48, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: '100%' },
    inputText: { flex: 1 },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 11, marginTop: 4, marginLeft: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    allocationBtn: { flex: 1, height: 48, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    allocationBtnDisabled: { opacity: 0.5 },
    allocationBtnText: { fontSize: 13, fontWeight: '700' },
    stickyFooter: { paddingHorizontal: 16, borderTopWidth: 1, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    cancelButton: { flex: 1, height: 48, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    cancelButtonText: { fontSize: 15, fontWeight: '700' },
    submitButton: { flex: 2, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    submitButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingVertical: 16, elevation: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16 },
    sheetHandle: { width: 40, height: 5, borderRadius: 2.5, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 12 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sheetTitle: { fontSize: 16, fontWeight: '800' },
    doneBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    doneBtnText: { fontSize: 12, fontWeight: '700' },
    searchBarWrap: { height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
    floorChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
    floorChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    roomCard: { zIndex: 1 },
    bedCard: { width: '48%', padding: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', gap: 6 },
    bedName: { fontWeight: '700', marginTop: 4 },
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
    selectorContainer: {
        height: 40,
        borderRadius: 10,
        flexDirection: 'row',
        padding: 4,
        alignItems: 'center',
        position: 'relative',
    },
    selectorPill: {
        height: 32,
        borderRadius: 8,
        position: 'absolute',
        left: 4,
    },
    selectorTab: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    selectorTabText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
