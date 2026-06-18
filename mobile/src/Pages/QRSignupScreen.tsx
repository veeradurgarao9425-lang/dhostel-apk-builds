import React, { useState, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { ArrowLeft, QrCode, Home, BedDouble, Info, Share2, ChevronDown, Check, X } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'general' | 'room';

// ─── Room Picker Modal (same style as AddStudentScreen) ───────────────────────
const RoomPickerModal = ({ visible, rooms, selectedRoomId, onSelectRoom, onClose }: any) => {
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
        <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View style={s.modalOverlay}>
                <View style={[s.modalSheet, { maxHeight: '85%' }]}>
                    <View style={s.sheetHandle} />
                    <View style={s.sheetHeader}>
                        <Text style={s.sheetTitle}>Select Room</Text>
                        <TouchableOpacity onPress={onClose} style={s.closeBtn}><Text style={s.closeBtnText}>Close</Text></TouchableOpacity>
                    </View>
                    <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
                        <View style={s.searchBar}>
                            <Text style={{ color: '#94A3B8', marginRight: 8 }}>🔍</Text>
                            <TextInput style={{ flex: 1, fontSize: 15, color: '#1E293B' }} placeholder="Search room number..." placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} />
                        </View>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}>
                        {grouped.map(({ floor, rooms: fr }) => (
                            <View key={floor}>
                                <View style={s.floorChip}><Text style={s.floorChipText}>FLOOR {floor}</Text></View>
                                {fr.map((room: any) => {
                                    const isSelected = selectedRoomId === room.room_id?.toString();
                                    const avail = room.available_beds ?? 0;
                                    return (
                                        <TouchableOpacity
                                            key={room.room_id}
                                            style={[s.roomCard, isSelected && s.roomCardSelected, avail <= 0 && s.roomCardDim]}
                                            onPress={() => { onSelectRoom(room); onClose(); }}
                                            activeOpacity={0.75}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={[s.roomNum, isSelected && { color: '#FF6B6B' }]}>{room.room_number}</Text>
                                                <Text style={s.roomCap}>Cap: {room.capacity ?? '—'}</Text>
                                            </View>
                                            <Text style={[s.roomAvail, { color: statusColor(room) }]}>Available: {avail}</Text>
                                            <Text style={s.roomRent}>Rent: ₹{room.rent_per_bed ?? room.base_rent ?? '—'}</Text>
                                            <Text style={[s.roomStatusTxt, { color: statusColor(room) }]}>Status: {statusLabel(room)}</Text>
                                            {isSelected && <View style={s.selectedBadge}><Check size={12} color="#FF6B6B" /><Text style={s.selectedBadgeText}>Selected</Text></View>}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                        {grouped.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: '#94A3B8' }}>No rooms found</Text></View>}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// ─── Bed Picker Modal ─────────────────────────────────────────────────────────
const BedPickerModal = ({ visible, room, beds, selectedBedId, onSelectBed, onClose, loading }: any) => (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
        <View style={s.modalOverlay}>
            <View style={[s.modalSheet, { maxHeight: '70%' }]}>
                <View style={s.sheetHandle} />
                <View style={s.sheetHeader}>
                    <Text style={s.sheetTitle}>Beds in Room {room?.room_number}</Text>
                    <TouchableOpacity onPress={onClose} style={s.closeBtn}><Text style={s.closeBtnText}>Close</Text></TouchableOpacity>
                </View>
                {room && <View style={{ paddingHorizontal: 16, marginBottom: 8 }}><View style={s.floorChip}><Text style={s.floorChipText}>ROOM {room.room_number}</Text></View></View>}
                {loading ? (
                    <ActivityIndicator color="#FF6B6B" style={{ marginVertical: 30 }} />
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            {beds.map((bed: any) => {
                                const isAvail = !bed.student_id || bed.status === 'available';
                                const isSel = selectedBedId === bed.bed_id?.toString();
                                return (
                                    <TouchableOpacity
                                        key={bed.bed_id}
                                        style={[s.bedCard, isSel && s.bedCardSel, !isAvail && s.bedCardOcc]}
                                        onPress={() => { if (!isAvail) return; onSelectBed(bed); onClose(); }}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[s.bedName, isSel && { color: '#FF6B6B' }, !isAvail && { color: '#94A3B8' }]}>{bed.bed_name ?? `Bed ${bed.bed_number}`}</Text>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: isAvail ? '#16A34A' : '#DC2626' }}>Status: {isAvail ? 'AVAILABLE' : 'OCCUPIED'}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {beds.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: '#94A3B8' }}>No beds available</Text></View>}
                    </ScrollView>
                )}
            </View>
        </View>
    </Modal>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function QRSignupScreen({ navigation }: any) {
    const { user } = useAuth();
    const { theme } = useTheme();

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
        <View style={s.root}>
            {/* ── Header ── */}
            <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
                <View style={s.headerRow}>
                    <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                        <ArrowLeft size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={s.headerTitle}>Tenant QR Signup</Text>
                        <Text style={s.headerSub}>Scan to self-register</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Mode Tabs */}
                <View style={s.tabRow}>
                    <TouchableOpacity style={[s.tab, mode === 'general' && s.tabActive]} onPress={() => setMode('general')} activeOpacity={0.8}>
                        <QrCode size={15} color={mode === 'general' ? theme.primary : '#FFF'} />
                        <Text style={[s.tabText, mode === 'general' && { color: theme.primary }]}>General QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.tab, mode === 'room' && s.tabActive]} onPress={() => setMode('room')} activeOpacity={0.8}>
                        <Home size={15} color={mode === 'room' ? theme.primary : '#FFF'} />
                        <Text style={[s.tabText, mode === 'room' && { color: theme.primary }]}>Room-Specific QR</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>

                {/* ── Info Banner ── */}
                {mode === 'general' ? (
                    <View style={s.infoBanner}>
                        <Info size={18} color={theme.primary} />
                        <Text style={[s.infoText, { color: theme.primary }]}>
                            <Text style={{ fontWeight: '700' }}>How it works: </Text>
                            Share this QR with new tenants. They scan → fill their details → appear as <Text style={{ fontWeight: '700' }}>Inactive</Text>. You review and activate them.
                        </Text>
                    </View>
                ) : (
                    <View style={[s.infoBanner, { borderColor: '#7C3AED22', backgroundColor: '#F5F3FF' }]}>
                        <Info size={18} color="#7C3AED" />
                        <Text style={[s.infoText, { color: '#7C3AED' }]}>
                            <Text style={{ fontWeight: '700' }}>Room QR flow: </Text>
                            Select a room (and optionally a bed). The QR pre-fills that allocation. Tenant only needs to enter their personal details.
                        </Text>
                    </View>
                )}

                {/* ── Room Selector (Room Mode only) ── */}
                {mode === 'room' && (
                    <View style={s.card}>
                        <Text style={s.cardTitle}>🏠 Pre-select Room & Bed</Text>
                        <Text style={s.cardSubtitle}>Tenant will see these as locked fields in the form</Text>

                        {/* Room button */}
                        <TouchableOpacity
                            style={[s.selectorBtn, selectedRoom && s.selectorBtnActive]}
                            onPress={() => setRoomModalVisible(true)}
                            activeOpacity={0.8}
                        >
                            <Home size={18} color={selectedRoom ? theme.primary : '#64748B'} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[s.selectorBtnLabel, selectedRoom && { color: theme.primary }]}>
                                    {selectedRoom ? `Room ${selectedRoom.room_number}` : 'Select Room'}
                                </Text>
                                {selectedRoom && (
                                    <Text style={s.selectorBtnMeta}>
                                        Floor {selectedRoom.floor_number ?? '—'}  •  ₹{selectedRoom.rent_per_bed ?? selectedRoom.base_rent ?? '—'}/bed  •  {selectedRoom.available_beds ?? '?'} available
                                    </Text>
                                )}
                            </View>
                            <ChevronDown size={18} color={selectedRoom ? theme.primary : '#94A3B8'} />
                        </TouchableOpacity>

                        {/* Bed button */}
                        <TouchableOpacity
                            style={[s.selectorBtn, selectedBed && s.selectorBtnActive, !selectedRoom && s.selectorBtnDimmed, { marginTop: 10 }]}
                            onPress={() => {
                                if (!selectedRoom) { Alert.alert('Select Room First', 'Choose a room before selecting a bed.'); return; }
                                setBedModalVisible(true);
                            }}
                            activeOpacity={0.8}
                        >
                            <BedDouble size={18} color={selectedBed ? theme.primary : !selectedRoom ? '#CBD5E1' : '#64748B'} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[s.selectorBtnLabel, selectedBed && { color: theme.primary }, !selectedRoom && { color: '#CBD5E1' }]}>
                                    {selectedBed ? (selectedBed.bed_name ?? `Bed`) : 'Select Bed (Optional)'}
                                </Text>
                                {selectedBed && <Text style={s.selectorBtnMeta}>Status: Available</Text>}
                            </View>
                            {selectedBed ? (
                                <TouchableOpacity onPress={() => setSelectedBed(null)}>
                                    <X size={16} color="#DC2626" />
                                </TouchableOpacity>
                            ) : (
                                <ChevronDown size={18} color="#94A3B8" />
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
                <View style={s.qrCard}>
                    {/* QR label */}
                    <View style={s.qrLabelRow}>
                        <View style={[s.qrDot, { backgroundColor: mode === 'general' ? theme.primary : '#7C3AED' }]} />
                        <Text style={[s.qrLabel, { color: mode === 'general' ? theme.primary : '#7C3AED' }]}>
                            {mode === 'general' ? 'General Hostel QR' : selectedRoom ? `Room ${selectedRoom.room_number}${selectedBed ? ` — Bed ${selectedBed.bed_name ?? ''}` : ''} QR` : 'Select a room to generate QR'}
                        </Text>
                    </View>

                    {/* QR Code */}
                    {mode === 'room' && !selectedRoom ? (
                        <View style={s.qrPlaceholder}>
                            <Home size={48} color="#E2E8F0" />
                            <Text style={s.qrPlaceholderText}>Select a room above to generate a room-specific QR code</Text>
                        </View>
                    ) : (
                        <View style={s.qrWrapper}>
                            <QRCode
                                value={activeUrl}
                                size={220}
                                color="#1E293B"
                                backgroundColor="#FFFFFF"
                            />
                        </View>
                    )}

                    {/* URL display */}
                    {(mode === 'general' || selectedRoom) && (
                        <View style={s.urlBox}>
                            <Text style={s.urlText} numberOfLines={2}>{activeUrl}</Text>
                        </View>
                    )}

                    {/* Share button */}
                    {(mode === 'general' || selectedRoom) && (
                        <TouchableOpacity style={[s.shareBtn, { backgroundColor: theme.primary }]} onPress={handleShare} activeOpacity={0.85}>
                            <Share2 size={18} color="#FFF" />
                            <Text style={s.shareBtnText}>Share QR Link</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Flow Explanation ── */}
                <View style={s.card}>
                    <Text style={s.cardTitle}>📋 What Happens After Scanning?</Text>
                    <View style={s.stepRow}>
                        <View style={[s.stepDot, { backgroundColor: theme.primary }]}><Text style={s.stepNum}>1</Text></View>
                        <Text style={s.stepText}>Tenant scans the QR with their phone camera</Text>
                    </View>
                    <View style={s.stepRow}>
                        <View style={[s.stepDot, { backgroundColor: theme.primary }]}><Text style={s.stepNum}>2</Text></View>
                        <Text style={s.stepText}>A form opens in their browser — they fill in their details</Text>
                    </View>
                    <View style={s.stepRow}>
                        <View style={[s.stepDot, { backgroundColor: theme.primary }]}><Text style={s.stepNum}>3</Text></View>
                        <Text style={s.stepText}>Their record is saved as <Text style={{ fontWeight: '700', color: '#DC2626' }}>Inactive</Text> in your tenant list</Text>
                    </View>
                    <View style={s.stepRow}>
                        <View style={[s.stepDot, { backgroundColor: '#10B981' }]}><Text style={s.stepNum}>4</Text></View>
                        <Text style={s.stepText}>You open their profile and tap <Text style={{ fontWeight: '700', color: '#10B981' }}>Mark Active</Text> to approve them</Text>
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
    root: { flex: 1, backgroundColor: '#F5F7FA' },

    // ── Header ────────────────────────────────────────────────────────────────
    header: { paddingTop: 52, paddingBottom: 0, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

    // ── Tabs ──────────────────────────────────────────────────────────────────
    tabRow: { flexDirection: 'row', gap: 10, paddingBottom: 20 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
    tabActive: { backgroundColor: '#FFFFFF' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

    // ── Body ──────────────────────────────────────────────────────────────────
    body: { padding: 16 },

    // ── Info banner ───────────────────────────────────────────────────────────
    infoBanner: { flexDirection: 'row', gap: 10, backgroundColor: '#FFF5F5', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FFD5D5', alignItems: 'flex-start' },
    infoText: { flex: 1, fontSize: 13, lineHeight: 19 },

    // ── Card ──────────────────────────────────────────────────────────────────
    card: { backgroundColor: '#FFF', borderRadius: 18, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
    cardSubtitle: { fontSize: 12, color: '#94A3B8', marginBottom: 14 },

    // ── Selector buttons ─────────────────────────────────────────────────────
    selectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
    selectorBtnActive: { backgroundColor: '#FFF9F9', borderColor: '#FF6B6B' },
    selectorBtnDimmed: { opacity: 0.5 },
    selectorBtnLabel: { fontSize: 15, fontWeight: '600', color: '#64748B' },
    selectorBtnMeta: { fontSize: 12, color: '#94A3B8', marginTop: 3 },

    // ── QR Card ───────────────────────────────────────────────────────────────
    qrCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    qrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    qrDot: { width: 10, height: 10, borderRadius: 5 },
    qrLabel: { fontSize: 14, fontWeight: '700' },
    qrWrapper: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    qrPlaceholder: { width: 220, height: 220, backgroundColor: '#F8FAFC', borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', gap: 12 },
    qrPlaceholderText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 20 },
    urlBox: { marginTop: 16, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, width: '100%' },
    urlText: { fontSize: 11, color: '#64748B', textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, width: '100%', paddingVertical: 14, borderRadius: 14 },
    shareBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

    // ── Steps ─────────────────────────────────────────────────────────────────
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    stepNum: { fontSize: 13, fontWeight: '700', color: '#FFF' },
    stepText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 20, paddingTop: 3 },

    // ── Modal / Sheet ─────────────────────────────────────────────────────────
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, maxHeight: '70%' },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    closeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFF1F1' },
    closeBtnText: { color: '#FF6B6B', fontWeight: '700', fontSize: 14 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    floorChip: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10, marginTop: 8 },
    floorChipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    roomCard: { backgroundColor: '#FFF9F9', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#FFD5D5', position: 'relative' },
    roomCardSelected: { borderColor: '#FF6B6B', backgroundColor: '#FFF1F1' },
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
