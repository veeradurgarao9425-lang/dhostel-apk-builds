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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { QrCode, Home, BedDouble, Info, Share2, ChevronDown, Check, X } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'general' | 'room';

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
                <Animated.View style={[s.modalOverlay, { opacity }]}>
                    <Pressable style={{ flex: 1 }} onPress={onClose} />
                </Animated.View>
                <Animated.View style={[
                    s.modalSheet,
                    { maxHeight, transform: [{ translateY }] }
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
        return Object.keys(map).sort((a, b) => Number(a) - Number(b)).map(floor => ({ floor: Number(floor), rooms: map[Number(floor)] }));
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

    const activeUrl = mode === 'general' ? generalUrl : roomUrl;

    // Load rooms when switching to room mode
    useFocusEffect(useCallback(() => {
        if (rooms.length === 0) {
            setRoomsLoading(true);
            api.get(`/rooms?hostelId=${hostelId}&limit=200`)
                .then(res => { if (res.data.success) setRooms(res.data.data); })
                .catch(() => {})
                .finally(() => setRoomsLoading(false));
        }
    }, [hostelId, rooms.length]));

    const fetchBeds = async (roomId: string, room: any) => {
        setBedsLoading(true);
        try {
            const res = await api.get(`/rooms/${roomId}/beds`);
            if (res.data.success) { setBeds(res.data.data); return; }
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
            >
                {/* Mode Tabs */}
                <View style={s.tabRow}>
                    <TouchableOpacity style={[s.tab, { backgroundColor: isDark ? '#334155' : 'rgba(255,255,255,0.15)' }, mode === 'general' && s.tabActive, mode === 'general' && isDark && { backgroundColor: '#1E293B' }]} onPress={() => setMode('general')} activeOpacity={0.8}>
                        <QrCode size={15} color={mode === 'general' ? theme.primary : '#FFF'} />
                        <Text style={[s.tabText, { fontSize: fontSize - 1 }, mode === 'general' && { color: theme.primary }]}>General QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.tab, { backgroundColor: isDark ? '#334155' : 'rgba(255,255,255,0.15)' }, mode === 'room' && s.tabActive, mode === 'room' && isDark && { backgroundColor: '#1E293B' }]} onPress={() => setMode('room')} activeOpacity={0.8}>
                        <Home size={15} color={mode === 'room' ? theme.primary : '#FFF'} />
                        <Text style={[s.tabText, { fontSize: fontSize - 1 }, mode === 'room' && { color: theme.primary }]}>Room QR</Text>
                    </TouchableOpacity>
                </View>
            </AppHeader>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>

                {/* ── Info Banner ── */}
                {mode === 'general' ? (
                    <View style={[s.infoBanner, { backgroundColor: isDark ? '#1E293B' : '#FFF5F5', borderColor: isDark ? '#334155' : '#FFD5D5' }]}>
                        <Info size={18} color={theme.primary} />
                        <Text style={[s.infoText, { color: theme.textSecondary }]}>
                            <Text style={{ fontWeight: '700', color: theme.textPrimary }}>How it works: </Text>
                            Share this QR with new tenants. They scan → fill their details → appear as <Text style={{ fontWeight: '700' }}>Inactive</Text>. You review and activate them.
                        </Text>
                    </View>
                ) : (
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

                {/* ── QR Card ── */}
                <View style={[s.qrCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    {/* QR label */}
                    <View style={s.qrLabelRow}>
                        <View style={[s.qrDot, { backgroundColor: theme.primary }]} />
                        <Text style={[s.qrLabel, { fontSize: fontSize, color: theme.primary }]}>
                            {mode === 'general' ? 'General Hostel QR' : selectedRoom ? `Room ${selectedRoom.room_number}${selectedBed ? ` — Bed ${selectedBed.bed_name ?? ''}` : ''} QR` : 'Select a room to generate QR'}
                        </Text>
                    </View>

                    {/* QR Code */}
                    {mode === 'room' && !selectedRoom ? (
                        <View style={[s.qrPlaceholder, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <Home size={48} color={theme.textSecondary} />
                            <Text style={[s.qrPlaceholderText, { fontSize: fontSize - 1, color: theme.textSecondary }]}>Select a room above to generate a room-specific QR code</Text>
                        </View>
                    ) : (
                        <View style={[s.qrWrapper, { borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <QRCode
                                value={activeUrl}
                                size={220}
                                color={isDark ? "#0F172A" : "#1E293B"}
                                backgroundColor="#FFFFFF"
                            />
                        </View>
                    )}

                    {/* URL display */}
                    {(mode === 'general' || selectedRoom) && (
                        <View style={[s.urlBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                            <Text style={[s.urlText, { color: theme.textSecondary }]} numberOfLines={2}>{activeUrl}</Text>
                        </View>
                    )}

                    {/* Share button */}
                    {(mode === 'general' || selectedRoom) && (
                        <TouchableOpacity style={[s.shareBtn, { backgroundColor: theme.primary }]} onPress={handleShare} activeOpacity={0.85}>
                            <Share2 size={18} color="#FFF" />
                            <Text style={[s.shareBtnText, { fontSize: fontSize + 1 }]}>Share QR Link</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Flow Explanation ── */}
                <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <Text style={[s.cardTitle, { fontSize: fontSize + 1, color: theme.textPrimary }]}>📋 What Happens After Scanning?</Text>
                    <View style={s.stepRow}>
                        <View style={[s.stepDot, { backgroundColor: theme.primary }]}><Text style={s.stepNum}>1</Text></View>
                        <Text style={[s.stepText, { fontSize: fontSize, color: theme.textPrimary }]}>Tenant scans the QR with their phone camera</Text>
                    </View>
                    <View style={s.stepRow}>
                        <View style={[s.stepDot, { backgroundColor: theme.primary }]}><Text style={s.stepNum}>2</Text></View>
                        <Text style={[s.stepText, { fontSize: fontSize, color: theme.textPrimary }]}>A form opens in their browser — they fill in their details</Text>
                    </View>
                    <View style={s.stepRow}>
                        <View style={[s.stepDot, { backgroundColor: theme.primary }]}><Text style={s.stepNum}>3</Text></View>
                        <Text style={[s.stepText, { fontSize: fontSize, color: theme.textPrimary }]}>Their record is saved as <Text style={{ fontWeight: '700', color: '#DC2626' }}>Inactive</Text> in your tenant list</Text>
                    </View>
                    <View style={s.stepRow}>
                        <View style={[s.stepDot, { backgroundColor: '#10B981' }]}><Text style={s.stepNum}>4</Text></View>
                        <Text style={[s.stepText, { fontSize: fontSize, color: theme.textPrimary }]}>You open their profile and tap <Text style={{ fontWeight: '700', color: '#10B981' }}>Mark Active</Text> to approve them</Text>
                    </View>
                </View>

                <View style={{ height: 40 }} />
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
    tabRow: { flexDirection: 'row', gap: 10, paddingBottom: 20 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, borderRadius: 12 },
    tabActive: { backgroundColor: '#FFFFFF' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

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

    // ── QR Card ───────────────────────────────────────────────────────────────
    qrCard: { borderRadius: 24, padding: 24, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    qrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    qrDot: { width: 10, height: 10, borderRadius: 5 },
    qrLabel: { fontWeight: '700' },
    qrWrapper: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    qrPlaceholder: { width: 220, height: 220, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', gap: 12 },
    qrPlaceholderText: { textAlign: 'center', paddingHorizontal: 20 },
    urlBox: { marginTop: 16, borderRadius: 10, padding: 12, width: '100%' },
    urlText: { textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, width: '100%', paddingVertical: 14, borderRadius: 14 },
    shareBtnText: { color: '#FFF', fontWeight: '700' },

    // ── Steps ─────────────────────────────────────────────────────────────────
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    stepNum: { fontSize: 13, fontWeight: '700', color: '#FFF' },
    stepText: { flex: 1, lineHeight: 20, paddingTop: 3 },

    // ── Modal / Sheet ─────────────────────────────────────────────────────────
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
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

// Make Platform available
import { Platform } from 'react-native';
