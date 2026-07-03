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
import { QrCode, Home, BedDouble, Info, Share2, ChevronDown, Check, X, ShieldCheck, Download, Link, Smartphone, FileText, User, Wand2, Copy, Shield } from 'lucide-react-native';
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
type Mode = 'general' | 'room';

// ─── Smooth bottom-sheet modal ────────────────────────────────────────────────
const ModalSheet = ({ visible, onClose, maxHeight = '85%', children }: any) => {
    const { theme } = useTheme();
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
                    { backgroundColor: theme.cardBg, maxHeight, transform: [{ translateY }] }
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

    const grouped = useMemo(() => {
        const filtered = search ? rooms.filter((r: any) => r.room_number?.toString().includes(search)) : rooms;
        const map: Record<number, any[]> = {};
        filtered.forEach((r: any) => {
            const floor = r.floor_number ?? 0;
            if (!map[floor]) map[floor] = [];
            map[floor].push(r);
        });
        return Object.keys(map).sort((a, b) => Number(a) - Number(b)).map(floor => {
            const floorRooms = map[Number(floor)];
            floorRooms.sort((a: any, b: any) => {
                const aAvail = (a.available_beds ?? 0) > 0;
                const bAvail = (b.available_beds ?? 0) > 0;
                if (aAvail && !bAvail) return -1;
                if (!aAvail && bAvail) return 1;
                return (a.room_number ?? '').toString().localeCompare((b.room_number ?? '').toString(), undefined, { numeric: true });
            });
            return { floor: Number(floor), rooms: floorRooms };
        });
    }, [rooms, search]);

    const statusColor = (r: any) => r.status === 'MAINTENANCE' ? '#F97316' : (r.available_beds ?? 0) > 0 ? '#16A34A' : '#DC2626';
    const statusLabel = (r: any) => r.status === 'MAINTENANCE' ? 'MAINTENANCE' : (r.available_beds ?? 0) > 0 ? 'AVAILABLE' : 'FULL';

    return (
        <ModalSheet visible={visible} onClose={onClose} maxHeight="85%">
            <View style={s.sheetHandle} />
            <View style={[s.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[s.sheetTitle, { color: theme.textPrimary }]}>Select Room</Text>
                <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: isDark ? theme.primary + '20' : '#FFF1F1' }]}><Text style={[s.closeBtnText, { color: theme.primary }]}>Close</Text></TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, marginBottom: 10, marginTop: 10 }}>
                <View style={[s.searchBar, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <Text style={{ color: theme.textSecondary, marginRight: 8 }}>🔍</Text>
                    <TextInput style={{ flex: 1, fontSize: 15, color: theme.textPrimary }} placeholder="Search room number..." placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={search} onChangeText={setSearch} />
                </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}>
                {grouped.map(({ floor, rooms: fr }) => (
                    <View key={floor}>
                        <View style={[s.floorChip, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}><Text style={[s.floorChipText, { color: theme.textSecondary }]}>FLOOR {floor}</Text></View>
                        {fr.map((room: any) => {
                            const isSelected = selectedRoomId === room.room_id?.toString();
                            const avail = room.available_beds ?? 0;
                            return (
                                <TouchableOpacity
                                    key={room.room_id}
                                    style={[s.roomCard, { backgroundColor: isDark ? '#1E293B' : '#FFF9F9', borderColor: isDark ? '#334155' : '#FFD5D5' }, isSelected && { borderColor: theme.primary, backgroundColor: isDark ? theme.primary + '20' : '#FFF1F1' }, avail <= 0 && s.roomCardDim]}
                                    onPress={() => { onSelectRoom(room); onClose(); }}
                                    activeOpacity={0.75}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={[s.roomNum, { fontSize: fontSize + 4, color: theme.textPrimary }, isSelected && { color: theme.primary }]}>{room.room_number}</Text>
                                        {!isSelected && <Text style={[s.roomCap, { fontSize: fontSize - 1, color: theme.textSecondary }]}>Cap: {room.capacity ?? '—'}</Text>}
                                    </View>
                                    <Text style={[s.roomAvail, { fontSize: fontSize - 1, color: statusColor(room) }]}>Available: {avail}</Text>
                                    <Text style={[s.roomRent, { fontSize: fontSize - 1, color: theme.textSecondary }]}>Rent: ₹{room.rent_per_bed ?? room.base_rent ?? '—'}</Text>
                                    <Text style={[s.roomStatusTxt, { fontSize: fontSize - 2, color: statusColor(room) }]}>Status: {statusLabel(room)}</Text>
                                    {isSelected && (
                                        <View style={[s.selectedBadge, { backgroundColor: isDark ? theme.primary + '20' : '#FFF1F1' }]}>
                                            <Check size={12} color={theme.primary} />
                                            <Text style={[s.selectedBadgeText, { color: theme.primary }]}>Selected</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
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
        <ModalSheet visible={visible} onClose={onClose} maxHeight="70%">
            <View style={s.sheetHandle} />
            <View style={[s.sheetHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Text style={[s.sheetTitle, { color: theme.textPrimary }]}>Beds in Room {room?.room_number}</Text>
                <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: isDark ? theme.primary + '20' : '#FFF1F1' }]}><Text style={[s.closeBtnText, { color: theme.primary }]}>Close</Text></TouchableOpacity>
            </View>
            {room && <View style={{ paddingHorizontal: 16, marginBottom: 8, marginTop: 8 }}><View style={[s.floorChip, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}><Text style={[s.floorChipText, { color: theme.textSecondary }]}>ROOM {room.room_number}</Text></View></View>}
            {loading ? (
                <ActivityIndicator color={theme.primary} style={{ marginVertical: 30 }} />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {beds.map((bed: any) => {
                            const isAvail = !bed.student_id || bed.status === 'available';
                            const isSel = selectedBedId === bed.bed_id?.toString();
                            return (
                                <TouchableOpacity
                                    key={bed.bed_id}
                                    style={[
                                        s.bedCard,
                                        { backgroundColor: isDark ? '#1E293B' : '#FFF9F9', borderColor: isDark ? '#334155' : '#FFD5D5' },
                                        isSel && { borderColor: theme.primary, backgroundColor: isDark ? theme.primary + '20' : '#FFF1F1' },
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

    // General QR URL
    const generalUrl = useMemo(() =>
        `${baseURL}/public/qr-signup?hostelId=${encodeURIComponent(hostelId || '')}`,
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

    const activeUrl = mode === 'general' ? generalUrl : roomUrl;

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
                {/* Mode Tabs */}
                <View style={s.tabRow}>
                    <TouchableOpacity style={[s.tab, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }, mode === 'general' && [s.tabActive, { backgroundColor: isDark ? '#334155' : '#FFFFFF' }]]} onPress={() => setMode('general')} activeOpacity={0.8}>
                        <QrCode size={15} color={mode === 'general' ? theme.primary : theme.textSecondary} />
                        <Text style={[s.tabText, { fontSize: fontSize - 1, color: theme.textSecondary }, mode === 'general' && { color: theme.primary }]}>General QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.tab, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }, mode === 'room' && [s.tabActive, { backgroundColor: isDark ? '#334155' : '#FFFFFF' }]]} onPress={() => setMode('room')} activeOpacity={0.8}>
                        <Home size={15} color={mode === 'room' ? theme.primary : theme.textSecondary} />
                        <Text style={[s.tabText, { fontSize: fontSize - 1, color: theme.textSecondary }, mode === 'room' && { color: theme.primary }]}>Room QR</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Info Banner ── */}
                {mode === 'general' ? null : (
                    <View style={[s.infoBanner, { borderColor: '#7C3AED22', backgroundColor: isDark ? '#1E293B' : '#F5F3FF' }]}>
                        <Info size={18} color="#7C3AED" />
                        <Text style={[s.infoText, { color: theme.textSecondary }]}>
                            <Text style={{ fontWeight: '700', color: theme.textPrimary }}>Room QR flow: </Text>
                            Select a room (and optionally a bed). The QR pre-fills that allocation. Tenant only needs to enter their personal details.
                        </Text>
                    </View>
                )}

                {/* ── Room Selector (Room Mode only) ── */}
                {mode === 'room' && (
                    <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                        <Text style={[s.cardTitle, { fontSize: fontSize + 1, color: theme.textPrimary }]}>🏠 Pre-select Room & Bed</Text>
                        <Text style={[s.cardSubtitle, { fontSize: fontSize - 3, color: theme.textSecondary }]}>Tenant will see these as locked fields in the form</Text>

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

                {/* ── 1. Main QR Card ── */}
                <View style={[s.newQrCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <ShieldCheck size={20} color="#10B981" />
                            <Text style={{ fontSize: fontSize + 2, fontWeight: '700', color: theme.textPrimary, marginLeft: 8 }}>
                                Share this QR with new tenants
                            </Text>
                        </View>
                        <Text style={{ fontSize: fontSize - 1, color: theme.textSecondary }}>
                            They scan, fill details and appear as <Text style={{ color: '#F97316', fontWeight: '600' }}>Inactive</Text>
                        </Text>
                    </View>

                    {/* QR Code with viewfinder style */}
                    {mode === 'room' && !selectedRoom ? (
                        <View style={[s.qrPlaceholder, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <Home size={48} color={theme.textSecondary} />
                            <Text style={[s.qrPlaceholderText, { fontSize: fontSize - 1, color: theme.textSecondary }]}>Select a room above to generate a room-specific QR code</Text>
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
                                <LinearGradient 
                                    colors={isDark ? ['#1E293B', '#0F172A'] : [theme.primary, theme.primary + 'dd']} 
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={{ padding: 32, borderRadius: 24, alignItems: 'center', width: 280, shadowColor: theme.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 }}
                                >
                                    
                                    {/* Hostel Name */}
                                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 24, textAlign: 'center', letterSpacing: 0.5 }}>
                                        {user?.hostel_name || 'Hostel QR'}
                                    </Text>
                                    
                                    {/* QR Code Card */}
                                    <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8, marginBottom: 24 }}>
                                        <QRCode
                                            value={activeUrl}
                                            size={170}
                                            color="#0F172A"
                                            backgroundColor="#FFFFFF"
                                        />
                                    </View>
                                    
                                    {/* Subtitle */}
                                    <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600', textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 }}>
                                        {mode === 'general' ? 'Scan to self-register' : selectedRoom ? `Scan to register for Room ${selectedRoom.room_number}${selectedBed ? ` (Bed ${selectedBed.bed_name ?? ''})` : ''}` : ''}
                                    </Text>

                                    {/* Product Branding Pill */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}>
                                        <Image source={require('../../assets/icon.png')} style={{ width: 14, height: 14, borderRadius: 3, marginRight: 6 }} resizeMode="contain" />
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }}>
                                            POWERED BY DHOSTEL
                                        </Text>
                                    </View>

                                </LinearGradient>
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
    searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    floorChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10, marginTop: 8 },
    floorChipText: { fontSize: 12, fontWeight: '700' },
    roomCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1.5, position: 'relative' },
    roomCardSelected: {},
    roomCardDim: { opacity: 0.6 },
    roomNum: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    roomCap: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    roomAvail: { fontSize: 13, fontWeight: '700', marginTop: 2 },
    roomRent: { fontSize: 13, color: '#475569', marginTop: 2 },
    roomStatusTxt: { fontSize: 12, fontWeight: '700', marginTop: 2 },
    selectedBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    selectedBadgeText: { fontSize: 11, color: '#FF6B6B', fontWeight: '700' },
    bedCard: { backgroundColor: '#FFF9F9', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#FFD5D5', width: '47%' },
    bedCardSel: { borderColor: '#FF6B6B', backgroundColor: '#FFF1F1' },
    bedCardOcc: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', opacity: 0.7 },
    bedName: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
});

