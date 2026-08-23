import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    Share,
    Alert,
    ActivityIndicator,
    TextInput,
    Animated,
    Pressable,
    Platform,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { QrCode, Home, BedDouble, Info, Share2, ChevronDown, Check, X, ShieldCheck, Download, Link, Smartphone, FileText, User, Wand2, Copy, Shield, Search, UserCheck } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '../context/ToastContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'general' | 'guest' | 'room';

// ─── Smooth bottom-sheet modal ────────────────────────────────────────────────
const ModalSheet = ({ visible, onClose, maxHeight = '85%', children }: any) => {
    const { theme, isDark } = useTheme();
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
                <Animated.View style={[s.modalOverlay, { opacity }]}>
                    <Pressable style={{ flex: 1 }} onPress={onClose} />
                </Animated.View>
                <Animated.View style={[
                    s.modalSheet,
                    { backgroundColor: theme.cardBg, maxHeight, transform: [{ translateY }], borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0', borderBottomWidth: 0 }
                ]}>
                    {children}
                </Animated.View>
            </View>
        </Modal>
    );
};

// ─── Room Picker Modal ────────────────────────────────────────────────────────
const RoomPickerModal = ({ visible, rooms, selectedRoomId, onSelectRoom, onClose }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    const [search, setSearch] = useState('');
    const [selectedFloor, setSelectedFloor] = useState<number | 'All'>('All');

    const floors = useMemo(() => {
        const set = new Set<number>();
        rooms.forEach((r: any) => set.add(Number(r.floor_number ?? 0)));
        return ['All', ...Array.from(set).sort((a, b) => a - b)];
    }, [rooms]);

    const grouped = useMemo(() => {
        let filtered = rooms;
        if (selectedFloor !== 'All') {
            filtered = filtered.filter((r: any) => Number(r.floor_number ?? 0) === Number(selectedFloor));
        }
        if (search) {
            filtered = filtered.filter((r: any) => r.room_number?.toString().includes(search));
        }
        
        const map: Record<number, any[]> = {};
        filtered.forEach((r: any) => {
            const floor = Number(r.floor_number ?? 0);
            if (!map[floor]) map[floor] = [];
            map[floor].push(r);
        });
        
        const groupedArray = Object.keys(map).map(floor => {
            const floorRooms = map[Number(floor)];
            floorRooms.sort((a: any, b: any) => {
                const aAvail = Number(a.available_beds ?? 0) > 0;
                const bAvail = Number(b.available_beds ?? 0) > 0;
                if (aAvail && !bAvail) return -1;
                if (!aAvail && bAvail) return 1;
                return (a.room_number ?? '').toString().localeCompare((b.room_number ?? '').toString(), undefined, { numeric: true });
            });
            const hasAvailable = floorRooms.some((r: any) => Number(r.available_beds ?? 0) > 0);
            return { floor: Number(floor), rooms: floorRooms, hasAvailable };
        });

        groupedArray.sort((a, b) => {
            if (a.hasAvailable && !b.hasAvailable) return -1;
            if (!a.hasAvailable && b.hasAvailable) return 1;
            return a.floor - b.floor;
        });

        return groupedArray;
    }, [rooms, search, selectedFloor]);

    const statusColor = (r: any) => r.status === 'MAINTENANCE' ? '#F97316' : (r.available_beds ?? 0) > 0 ? '#16A34A' : '#DC2626';
    const statusLabel = (r: any) => r.status === 'MAINTENANCE' ? 'MAINTENANCE' : (r.available_beds ?? 0) > 0 ? 'AVAILABLE' : 'FULL';

    return (
        <ModalSheet visible={visible} onClose={onClose} maxHeight="85%">
            <View style={s.sheetHandle} />
            <View style={[s.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[s.sheetTitle, { color: theme.textPrimary }]}>Select Room</Text>
                <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}><Text style={[s.closeBtnText, { color: theme.textSecondary }]}>Close</Text></TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, marginBottom: 10, marginTop: 10 }}>
                <View style={[s.searchBar, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <Search size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                    <TextInput style={{ flex: 1, fontSize: 13, color: theme.textPrimary, padding: 0 }} placeholder="Search room number..." placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={search} onChangeText={setSearch} />
                </View>
                
                {selectedRoomId && (
                    (() => {
                        const selRoom = rooms.find((r: any) => r.room_id?.toString() === selectedRoomId);
                        if (!selRoom) return null;
                        return (
                            <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 }}>
                                <Text style={{ fontWeight: '700', color: theme.primary }}>Selected:</Text> Room {selRoom.room_number} (Floor {selRoom.floor_number ?? '—'})
                            </Text>
                        );
                    })()
                )}
                
                {/* Floor Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                    {floors.map(floor => (
                        <TouchableOpacity 
                            key={floor.toString()} 
                            onPress={() => setSelectedFloor(floor as any)}
                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: selectedFloor === floor ? theme.primary : (isDark ? '#334155' : '#F1F5F9'), marginRight: 8 }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: selectedFloor === floor ? '#FFF' : theme.textSecondary }}>
                                {floor === 'All' ? 'All Floors' : `Floor ${floor}`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}>
                {grouped.map(({ floor, rooms: fr }) => (
                    <View key={floor}>
                        {selectedFloor === 'All' && (
                            <View style={[s.floorChip, { backgroundColor: isDark ? '#334155' : '#F1F5F9', alignSelf: 'flex-start', marginVertical: 12 }]}><Text style={[s.floorChipText, { color: theme.textSecondary }]}>FLOOR {floor}</Text></View>
                        )}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                            {fr.map((room: any) => {
                                const isSelected = selectedRoomId === room.room_id?.toString();
                                const avail = room.available_beds ?? 0;
                                return (
                                    <TouchableOpacity
                                        key={room.room_id}
                                        style={[
                                            s.roomCard, 
                                            { width: '48%', marginBottom: 8, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }, 
                                            isSelected && { borderColor: theme.primary, backgroundColor: isDark ? theme.primary + '20' : '#F5F3FF', borderWidth: 2, shadowColor: theme.primary, shadowOpacity: 0.15, elevation: 4 }, 
                                            avail <= 0 && { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', opacity: 0.6 }
                                        ]}
                                        onPress={() => { onSelectRoom(room); onClose(); }}
                                        activeOpacity={0.75}
                                    >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <Text style={[s.roomNum, { fontSize: fontSize + 2, color: theme.textPrimary }, isSelected && { color: theme.primary }]}>{room.room_number}</Text>
                                        </View>
                                        <Text style={[s.roomAvail, { fontSize: fontSize - 2, color: statusColor(room) }]}>{avail} Available</Text>
                                        <Text style={[s.roomRent, { fontSize: fontSize - 2, color: theme.textSecondary, marginTop: 4 }]}>₹{room.rent_per_bed ?? room.base_rent ?? '—'}</Text>
                                        
                                        {isSelected && (
                                            <View style={{ position: 'absolute', top: 8, right: 8 }}>
                                                <Check size={14} color={theme.primary} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                ))}
                {grouped.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: theme.textSecondary }}>No rooms found</Text></View>}
            </ScrollView>
        </ModalSheet>
    );
};

// ─── Bed Picker Modal ─────────────────────────────────────────────────────────
const BedPickerModal = ({ visible, room, beds, selectedBedId, onSelectBed, onClose, loading }: any) => {
    const { theme, isDark, fontSize } = useTheme();
    return (
        <ModalSheet visible={visible} onClose={onClose} maxHeight="85%">
            <View style={s.sheetHandle} />
            <View style={[s.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[s.sheetTitle, { color: theme.textPrimary }]}>Beds in Room {room?.room_number}</Text>
                <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}><Text style={[s.closeBtnText, { color: theme.textSecondary }]}>Close</Text></TouchableOpacity>
            </View>
            {room && (
                <View style={{ paddingHorizontal: 16, marginBottom: 8, marginTop: 8 }}>
                    <View style={[s.floorChip, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <Text style={[s.floorChipText, { color: theme.textSecondary }]}>ROOM {room.room_number}</Text>
                    </View>
                    
                    {selectedBedId && (
                        (() => {
                            const selBed = beds.find((b: any) => b.bed_id?.toString() === selectedBedId);
                            if (!selBed) return null;
                            return (
                                <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 }}>
                                    <Text style={{ fontWeight: '700', color: theme.primary }}>Selected:</Text> {selBed.bed_name ?? `Bed ${selBed.bed_number}`}
                                </Text>
                            );
                        })()
                    )}
                </View>
            )}
            {loading ? (
                <ActivityIndicator color={theme.primary} style={{ marginVertical: 30 }} />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {beds.map((bed: any) => {
                            const isAvail = !bed.student_id || bed.status === 'available';
                            const isSel = selectedBedId === bed.bed_id?.toString();
                            return (
                                <TouchableOpacity
                                    key={bed.bed_id}
                                    style={[
                                        s.bedCard,
                                        { width: '47%', padding: 12, borderRadius: 12, borderWidth: 1, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
                                        isSel && { borderColor: theme.primary, backgroundColor: isDark ? theme.primary + '20' : '#F5F3FF', borderWidth: 2, shadowColor: theme.primary, shadowOpacity: 0.15, elevation: 4 },
                                        !isAvail && { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#1E293B' : '#E2E8F0', opacity: 0.7 }
                                    ]}
                                    onPress={() => { if (!isAvail) return; onSelectBed(bed); onClose(); }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[s.bedName, { fontSize: fontSize + 2, color: theme.textPrimary }, isSel && { color: theme.primary }, !isAvail && { color: theme.textSecondary }]}>{bed.bed_name ?? `Bed ${bed.bed_number}`}</Text>
                                    <Text style={{ fontSize: fontSize - 3, fontWeight: '700', color: isAvail ? '#16A34A' : '#DC2626' }}>Status: {isAvail ? 'AVAILABLE' : 'OCCUPIED'}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {beds.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: theme.textSecondary }}>No beds available</Text></View>}
                </ScrollView>
            )}
        </ModalSheet>
    );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function QRSignupScreen({ navigation }: any) {
    const { user } = useAuth();
    const { theme, isDark, fontSize } = useTheme();
    const { showSuccess, showError, showWarning } = useToast();

    const [mode, setMode] = useState<Mode>('general');
    const [rooms, setRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [bedsLoading, setBedsLoading] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [selectedBed, setSelectedBed] = useState<any>(null);
    const [roomModalVisible, setRoomModalVisible] = useState(false);
    const [bedModalVisible, setBedModalVisible] = useState(false);
    const [roomsLoading, setRoomsLoading] = useState(false);

    const baseURL = useMemo(() => (api.defaults.baseURL || '').replace(/\/$/, ''), []);
    const hostelId = user?.hostel_id;

    // General Student QR URL
    const generalUrl = useMemo(() =>
        `${baseURL}/public/qr-signup?hostelId=${encodeURIComponent(hostelId || '')}`,
        [baseURL, hostelId]
    );

    // Short-Stay Guest Check-In QR URL
    const guestUrl = useMemo(() =>
        `${baseURL}/public/guest-signup?hostelId=${encodeURIComponent(hostelId || '')}`,
        [baseURL, hostelId]
    );

    // Room-specific QR URL
    const roomUrl = useMemo(() => {
        if (!selectedRoom) return generalUrl;
        let url = `${baseURL}/public/qr-signup?hostelId=${encodeURIComponent(hostelId || '')}&roomId=${selectedRoom.room_id}`;
        if (selectedBed) url += `&bedId=${encodeURIComponent(selectedBed.bed_id)}&bedName=${encodeURIComponent(selectedBed.bed_name ?? '')}`;
        return url;
    }, [baseURL, hostelId, selectedRoom, selectedBed, generalUrl]);

    const viewShotRef = useRef<ViewShot>(null);

    const handleDownload = async () => {
        if (viewShotRef.current && viewShotRef.current.capture) {
            try {
                const uri = await viewShotRef.current.capture();
                const { status } = await MediaLibrary.requestPermissionsAsync(true);
                if (status !== 'granted') {
                    showWarning("Please grant photo library access to save the QR code.");
                    return;
                }
                
                await MediaLibrary.saveToLibraryAsync(uri);
                showSuccess("QR Code saved to gallery!");
            } catch (e) {
                console.error("Error saving QR:", e);
                showError("Failed to save QR Code");
            }
        }
    };

    const activeUrl = mode === 'general' ? generalUrl : mode === 'guest' ? guestUrl : roomUrl;

    // Load rooms when switching to room mode
    useFocusEffect(useCallback(() => {
        if (hostelId) {
            setRoomsLoading(true);
            api.get(`/rooms?hostelId=${hostelId}&limit=200`)
                .then(res => { if (res.data.success) setRooms(res.data.data); })
                .catch(() => {})
                .finally(() => setRoomsLoading(false));
        }
    }, [hostelId]));

    const fetchBeds = async (roomId: string, room: any) => {
        setBedsLoading(true);
        try {
            const res = await api.get(`/rooms/${roomId}/beds`);
            if (res.data.success) {
                setBeds(res.data.data);
                setBedsLoading(false);
                return;
            }
        } catch {}
        // Fallback: generate beds
        const cap = room?.capacity ?? 1;
        const fakeBeds = Array.from({ length: Number(cap) }, (_, i) => ({
            bed_id: `${roomId}_${i + 1}`,
            bed_name: `${room?.room_number}${String.fromCharCode(65 + i)}`,
            status: i < (room?.available_beds ?? cap) ? 'available' : 'occupied',
            student_id: i < (room?.available_beds ?? cap) ? null : 1,
        }));
        setBeds(fakeBeds);
        setBedsLoading(false);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Scan this link to fill your hostel registration form:\n\n${activeUrl}`,
                url: activeUrl,
            });
        } catch (e) {}
    };

    return (
        <View style={[s.root, { backgroundColor: theme.background }]}>
            {/* ── Header ── */}
            <AppHeader 
                title="Tenant QR Signup" 
                subtitle="Scan to self-register"
                alignLeft={true}
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
                {/* Mode Scrollable Tabs */}
                <View style={{ marginBottom: 16 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
                        <TouchableOpacity 
                            style={[
                                s.tab, 
                                { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }, 
                                mode === 'general' && [s.tabActive, { backgroundColor: isDark ? '#334155' : '#FFFFFF', borderColor: theme.primary, borderWidth: 1.5 }]
                            ]} 
                            onPress={() => setMode('general')} 
                            activeOpacity={0.8}
                        >
                            <QrCode size={15} color={mode === 'general' ? theme.primary : theme.textSecondary} />
                            <Text style={[s.tabText, { fontSize: fontSize - 1, color: theme.textSecondary }, mode === 'general' && { color: theme.primary, fontWeight: '800' }]}>
                                Student Admission
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[
                                s.tab, 
                                { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }, 
                                mode === 'guest' && [s.tabActive, { backgroundColor: isDark ? '#334155' : '#FFFFFF', borderColor: '#7C3AED', borderWidth: 1.5 }]
                            ]} 
                            onPress={() => setMode('guest')} 
                            activeOpacity={0.8}
                        >
                            <UserCheck size={15} color={mode === 'guest' ? '#7C3AED' : theme.textSecondary} />
                            <Text style={[s.tabText, { fontSize: fontSize - 1, color: theme.textSecondary }, mode === 'guest' && { color: '#7C3AED', fontWeight: '800' }]}>
                                Guest Check-In
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[
                                s.tab, 
                                { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }, 
                                mode === 'room' && [s.tabActive, { backgroundColor: isDark ? '#334155' : '#FFFFFF', borderColor: theme.primary, borderWidth: 1.5 }]
                            ]} 
                            onPress={() => setMode('room')} 
                            activeOpacity={0.8}
                        >
                            <Home size={15} color={mode === 'room' ? theme.primary : theme.textSecondary} />
                            <Text style={[s.tabText, { fontSize: fontSize - 1, color: theme.textSecondary }, mode === 'room' && { color: theme.primary, fontWeight: '800' }]}>
                                Room Allocation
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* ── Info Banner ── */}
                {mode === 'guest' ? (
                    <View style={[s.infoBanner, { borderColor: '#7C3AED33', backgroundColor: isDark ? '#2E1065' : '#F5F3FF' }]}>
                        <UserCheck size={18} color="#7C3AED" />
                        <Text style={[s.infoText, { color: isDark ? '#E2E8F0' : '#334155', fontWeight: '500' }]}>
                            <Text style={{ fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' }}>Short-Stay Guest QR: </Text>
                            Guests scan at your reception or entrance to submit check-in details. You can review and allocate a room under the <Text style={{ fontWeight: '800', color: '#7C3AED' }}>Pending</Text> tab in Guests screen.
                        </Text>
                    </View>
                ) : mode === 'room' ? (
                    <View style={[s.infoBanner, { borderColor: '#7C3AED22', backgroundColor: isDark ? '#1E293B' : '#F5F3FF' }]}>
                        <Info size={18} color="#7C3AED" />
                        <Text style={[s.infoText, { color: isDark ? '#E2E8F0' : '#334155', fontWeight: '500' }]}>
                            <Text style={{ fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' }}>Room QR Flow: </Text>
                            Select a room (and optionally a bed). The QR pre-fills that allocation. Tenant only needs to enter their personal details.
                        </Text>
                    </View>
                ) : null}

                {/* ── Room Selector (Room Mode only) ── */}
                {mode === 'room' && (
                    <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                        <View style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>1</Text>
                                </View>
                                <Text style={{ fontSize: fontSize + 1, fontWeight: '700', color: theme.textPrimary }}>Pre-select Room & Bed</Text>
                            </View>
                            <Text style={{ fontSize: fontSize - 2, color: theme.textSecondary, marginLeft: 34 }}>These details will be locked in the signup form</Text>
                        </View>

                        {/* Room button */}
                        <TouchableOpacity
                            style={[s.selectorBtn, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E2E8F0' }, selectedRoom && { backgroundColor: isDark ? theme.primary + '20' : '#FFF9F9', borderColor: theme.primary }]}
                            onPress={() => setRoomModalVisible(true)}
                            activeOpacity={0.8}
                        >
                            <Home size={18} color={selectedRoom ? theme.primary : theme.textSecondary} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[s.selectorBtnLabel, { fontSize: fontSize, color: theme.textPrimary }, selectedRoom && { color: theme.primary }]}>
                                    {selectedRoom ? `Room ${selectedRoom.room_number}` : 'Select Room'}
                                </Text>
                                {selectedRoom && (
                                    <Text style={[s.selectorBtnMeta, { fontSize: fontSize - 3, color: theme.textSecondary }]}>
                                        Floor {selectedRoom.floor_number ?? '—'}  •  ₹{selectedRoom.rent_per_bed ?? selectedRoom.base_rent ?? '—'}/bed  •  {selectedRoom.available_beds ?? '?'} available
                                    </Text>
                                )}
                            </View>
                            <ChevronDown size={18} color={selectedRoom ? theme.primary : theme.textSecondary} />
                        </TouchableOpacity>

                        {/* Bed button */}
                        <TouchableOpacity
                            style={[s.selectorBtn, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB', borderColor: isDark ? '#334155' : '#E2E8F0' }, selectedBed && { backgroundColor: isDark ? theme.primary + '20' : '#FFF9F9', borderColor: theme.primary }, !selectedRoom && s.selectorBtnDimmed, { marginTop: 10 }]}
                            onPress={() => {
                                if (!selectedRoom) { Alert.alert('Select Room First', 'Choose a room before selecting a bed.'); return; }
                                setBedModalVisible(true);
                            }}
                            activeOpacity={0.8}
                        >
                            <BedDouble size={18} color={selectedBed ? theme.primary : !selectedRoom ? (isDark ? '#334155' : '#CBD5E1') : theme.textSecondary} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[s.selectorBtnLabel, { fontSize: fontSize }, selectedBed && { color: theme.primary }, !selectedRoom && { color: isDark ? '#334155' : '#CBD5E1' }]}>
                                    {selectedBed ? (selectedBed.bed_name ?? `Bed`) : 'Select Bed (Optional)'}
                                </Text>
                                {selectedBed && <Text style={[s.selectorBtnMeta, { fontSize: fontSize - 3, color: theme.textSecondary }]}>Status: Available</Text>}
                            </View>
                            {selectedBed ? (
                                <TouchableOpacity onPress={() => setSelectedBed(null)}>
                                    <X size={16} color="#DC2626" />
                                </TouchableOpacity>
                            ) : (
                                <ChevronDown size={18} color={theme.textSecondary} />
                            )}
                        </TouchableOpacity>

                        {selectedRoom && (
                            <TouchableOpacity onPress={() => { setSelectedRoom(null); setSelectedBed(null); setBeds([]); }} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
                                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>✕ Clear selection</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* ── Main QR Card ── */}
                <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0, paddingBottom: 24 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                        {mode === 'room' && (
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>2</Text>
                            </View>
                        )}
                        <Text style={{ fontSize: fontSize + 1, fontWeight: '700', color: theme.textPrimary }}>Your {mode === 'room' ? 'Room' : 'Hostel'} QR Code</Text>
                    </View>

                    {/* QR Code */}
                    {mode === 'room' && !selectedRoom ? (
                        <View style={{ alignItems: 'center', padding: 30, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0', flexDirection: 'row', justifyContent: 'center' }}>
                            <Info size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                            <Text style={{ fontSize: fontSize - 1, color: theme.textSecondary }}>Please select a room first</Text>
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
                                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', width: 300, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 }}>
                                    
                                    {/* Standee Header Banner */}
                                    <LinearGradient
                                        colors={mode === 'guest' ? ['#7C3AED', '#6D28D9'] : ['#6366F1', '#4F46E5']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={{ width: '100%', paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <Image source={require('../../assets/HostixNew.png')} style={{ width: 18, height: 18, borderRadius: 4 }} resizeMode="contain" />
                                            <Text style={{ fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                                                {mode === 'guest' ? 'Visitor Self Check-In QR' : mode === 'room' ? 'Room Allocation QR' : 'Self Registration QR'}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' }} numberOfLines={1}>
                                            {user?.hostel_name || 'Hostel Admission'}
                                        </Text>
                                        {mode === 'room' && selectedRoom && (
                                            <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginTop: 4 }}>
                                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                                                    Room {selectedRoom.room_number} {selectedBed ? `• Bed ${selectedBed.bed_name ?? ''}` : ''}
                                                </Text>
                                            </View>
                                        )}
                                    </LinearGradient>
                                    
                                    {/* QR Code Container */}
                                    <View style={{ padding: 20, alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                                        <View style={{ backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                                            <QRCode
                                                value={activeUrl}
                                                size={185}
                                                color="#0F172A"
                                                backgroundColor="#FFFFFF"
                                                logo={require('../../assets/HostixNew.png')}
                                                logoSize={38}
                                                logoMargin={3}
                                                logoBackgroundColor="#FFFFFF"
                                                logoBorderRadius={8}
                                            />
                                        </View>
                                        
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', textAlign: 'center', marginTop: 14 }}>
                                            📷 Scan with phone camera to register
                                        </Text>
                                        <Text style={{ fontSize: 10.5, color: '#64748B', textAlign: 'center', marginTop: 2 }}>
                                            No app download required • Instant profile submission
                                        </Text>
                                        
                                        {/* Product Branding Pill */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', width: '100%', justifyContent: 'center' }}>
                                            <Image source={require('../../assets/HostixNew.png')} style={{ width: 12, height: 12, borderRadius: 3, marginRight: 5 }} resizeMode="contain" />
                                            <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6 }}>POWERED BY HOSTIX</Text>
                                        </View>
                                    </View>
                                </View>
                            </ViewShot>
                        </View>
                    )}

                    {/* Action Buttons */}
                    {(mode === 'general' || selectedRoom) && (
                        <View style={s.qrActionsRow}>
                            <TouchableOpacity style={[s.qrActionBtn, { backgroundColor: isDark ? theme.primary + '20' : '#F3E8FF' }]} activeOpacity={0.7} onPress={handleDownload}>
                                <Download size={16} color={theme.primary} />
                                <Text style={[s.qrActionBtnText, { color: theme.primary }]}>Download</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.qrActionBtn, { backgroundColor: isDark ? theme.primary + '20' : '#F3E8FF' }]} onPress={handleShare} activeOpacity={0.7}>
                                <Share2 size={16} color={theme.primary} />
                                <Text style={[s.qrActionBtnText, { color: theme.primary }]}>Share</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ── 2. Link Card ── */}
                {(mode === 'general' || selectedRoom) && (
                    <View style={[s.linkCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                        <View style={[s.linkIconCircle, { backgroundColor: isDark ? theme.primary + '20' : '#F3E8FF' }]}>
                            <Link size={20} color={theme.primary} />
                        </View>
                        <View style={{ flex: 1, marginHorizontal: 12 }}>
                            <Text style={{ fontSize: fontSize - 3, color: theme.textSecondary, marginBottom: 4 }}>Or share this link</Text>
                            <Text style={{ fontSize: fontSize - 2, color: theme.textPrimary, fontWeight: '500' }} numberOfLines={2}>
                                {activeUrl}
                            </Text>
                        </View>
                        <TouchableOpacity 
                            style={[s.copyBtn, { backgroundColor: theme.primary }]}
                            onPress={async () => {
                                await Clipboard.setStringAsync(activeUrl);
                                showSuccess('Link copied to clipboard!');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: '#FFFFFF', fontSize: fontSize - 1, fontWeight: '600' }}>Copy</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── 3. How it works Card ── */}
                <View style={[s.howItWorksCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                        <Wand2 size={18} color={theme.primary} />
                        <Text style={{ fontSize: fontSize + 1, fontWeight: '700', color: theme.textPrimary, marginLeft: 8 }}>
                            How it works
                        </Text>
                    </View>
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16, paddingTop: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            {/* Step 1 */}
                            <View style={s.stepItem}>
                                <View style={[s.stepBadge, { backgroundColor: theme.primary }]}><Text style={s.stepBadgeText}>1</Text></View>
                                <View style={[s.stepCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}><Smartphone size={24} color={theme.textPrimary} /></View>
                                <Text style={[s.stepTitle, { color: theme.textPrimary }]}>Scan QR</Text>
                                <Text style={[s.stepDesc, { color: theme.textSecondary }]}>Tenant scans using phone camera</Text>
                            </View>

                            <View style={s.stepConnector}><Text style={{ color: theme.textSecondary }}>→</Text></View>

                            {/* Step 2 */}
                            <View style={s.stepItem}>
                                <View style={[s.stepBadge, { backgroundColor: theme.primary }]}><Text style={s.stepBadgeText}>2</Text></View>
                                <View style={[s.stepCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}><FileText size={24} color={theme.textPrimary} /></View>
                                <Text style={[s.stepTitle, { color: theme.textPrimary }]}>Fill Details</Text>
                                <Text style={[s.stepDesc, { color: theme.textSecondary }]}>Form opens in their browser</Text>
                            </View>

                            <View style={s.stepConnector}><Text style={{ color: theme.textSecondary }}>→</Text></View>

                            {/* Step 3 */}
                            <View style={s.stepItem}>
                                <View style={[s.stepBadge, { backgroundColor: theme.primary }]}><Text style={s.stepBadgeText}>3</Text></View>
                                <View style={[s.stepCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}><User size={24} color={theme.textPrimary} /></View>
                                <Text style={[s.stepTitle, { color: theme.textPrimary }]}>Added as <Text style={{ color: '#F97316' }}>Inactive</Text></Text>
                                <Text style={[s.stepDesc, { color: theme.textSecondary }]}>Record is saved in your tenant list</Text>
                            </View>

                            <View style={s.stepConnector}><Text style={{ color: theme.textSecondary }}>→</Text></View>

                            {/* Step 4 */}
                            <View style={s.stepItem}>
                                <View style={[s.stepBadge, { backgroundColor: theme.primary }]}><Text style={s.stepBadgeText}>4</Text></View>
                                <View style={[s.stepCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}><View style={{ backgroundColor: '#10B981', borderRadius: 12, padding: 4 }}><Check size={16} color="#FFF" /></View></View>
                                <Text style={[s.stepTitle, { color: theme.textPrimary }]}>Activate</Text>
                                <Text style={[s.stepDesc, { color: theme.textSecondary }]}>You review and mark as <Text style={{ color: '#10B981' }}>active</Text></Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Secure Footer */}
                    <View style={[s.secureFooter, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                        <Shield size={20} color={theme.primary} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ fontSize: fontSize - 1, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 }}>Secure & Verified</Text>
                            <Text style={{ fontSize: fontSize - 2, color: theme.textSecondary }}>All registrations are safe and require your approval before tenant becomes active.</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* ── Modals ── */}
            <RoomPickerModal
                visible={roomModalVisible}
                rooms={rooms}
                selectedRoomId={selectedRoom?.room_id?.toString()}
                onSelectRoom={(room: any) => {
                    setSelectedRoom(room);
                    setSelectedBed(null);
                    setBeds([]);
                    fetchBeds(room.room_id.toString(), room);
                }}
                onClose={() => setRoomModalVisible(false)}
            />

            <BedPickerModal
                visible={bedModalVisible}
                room={selectedRoom}
                beds={beds}
                selectedBedId={selectedBed?.bed_id?.toString()}
                loading={bedsLoading}
                onSelectBed={(bed: any) => setSelectedBed(bed)}
                onClose={() => setBedModalVisible(false)}
            />
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },

    // ── Tabs ──────────────────────────────────────────────────────────────────
    tabRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12 },
    tabActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    tabText: { fontWeight: '700' },

    // ── Body ──────────────────────────────────────────────────────────────────
    body: { padding: 16 },

    // ── Info banner ───────────────────────────────────────────────────────────
    infoBanner: { flexDirection: 'row', gap: 10, backgroundColor: '#FFF5F5', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FFD5D5', alignItems: 'flex-start' },
    infoText: { flex: 1, fontSize: 13, lineHeight: 19 },

    // ── Card ──────────────────────────────────────────────────────────────────
    card: { borderRadius: 18, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
    cardSubtitle: { fontSize: 12, marginBottom: 14 },

    // ── Selector buttons ─────────────────────────────────────────────────────
    selectorBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, borderWidth: 1 },
    selectorBtnActive: {},
    selectorBtnDimmed: { opacity: 0.5 },
    selectorBtnLabel: { fontSize: 15, fontWeight: '600' },
    selectorBtnMeta: { fontSize: 12, marginTop: 3 },

    // ── New UI Styles ─────────────────────────────────────────────────────────
    newQrCard: { borderRadius: 24, padding: 24, paddingBottom: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    viewfinder: { padding: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed' },
    qrPlaceholder: { width: 160, height: 160, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', gap: 12 },
    qrPlaceholderText: { textAlign: 'center', paddingHorizontal: 20 },
    qrActionsRow: { flexDirection: 'row', gap: 12 },
    qrActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
    qrActionBtnText: { fontWeight: '700' },
    
    linkCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    linkIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    copyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    
    howItWorksCard: { borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
    stepItem: { width: 100, alignItems: 'center', paddingHorizontal: 4 },
    stepBadge: { position: 'absolute', top: -5, right: 15, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    stepBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    stepCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    stepTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
    stepDesc: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
    stepConnector: { marginTop: 18, marginHorizontal: -5, opacity: 0.5 },
    secureFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 24, padding: 16, borderRadius: 12 },

    // ── Modal / Sheet ─────────────────────────────────────────────────────────
    modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, maxHeight: '70%' },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
    sheetTitle: { fontSize: 18, fontWeight: '700' },
    closeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    closeBtnText: { fontWeight: '700', fontSize: 14 },
    searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    floorChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10, marginTop: 8 },
    floorChipText: { fontSize: 12, fontWeight: '700' },
    roomCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    roomCardSelected: {},
    roomCardDim: { opacity: 0.6 },
    roomNum: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    roomCap: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    roomAvail: { fontSize: 13, fontWeight: '700', marginTop: 2 },
    roomRent: { fontSize: 13, color: '#475569', marginTop: 2 },
    roomStatusTxt: { fontSize: 12, fontWeight: '700', marginTop: 2 },
    selectedBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    selectedBadgeText: { fontSize: 11, color: '#FF6B6B', fontWeight: '700' },
    bedCard: { borderRadius: 16, padding: 16, borderWidth: 1, width: '47%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    bedCardSel: {},
    bedCardOcc: {},
    bedName: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
});

