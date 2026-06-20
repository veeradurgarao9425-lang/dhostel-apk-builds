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
    Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ArrowLeft, User, Phone, Home, Calendar,
    ChevronDown, Check, BedDouble, Plus,
} from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useAuth } from '../../contexts/AuthContext';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../theme/index';

// ─── Reusable custom components ──────────────────────────────────────────────
const FormInput = ({ label, icon: Icon, placeholder, value, onChangeText, keyboardType, error }: any) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={[styles.inputContainer, error && styles.inputError]}>
            <View style={styles.inputIcon}><Icon size={18} color={error ? '#EF4444' : '#F97316'} /></View>
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#BBBBBB"
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
            />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

const SelectField = ({ label, value, placeholder, icon: Icon, onPress, error }: any) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TouchableOpacity style={[styles.inputContainer, error && styles.inputError]} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.inputIcon}><Icon size={18} color={error ? '#EF4444' : '#F97316'} /></View>
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
                <TouchableOpacity key={opt} style={[styles.selectorItem, selected === opt && styles.selectorItemActive]} onPress={() => onSelect(opt)} activeOpacity={0.7}>
                    <Text style={[styles.selectorText, selected === opt && styles.selectorTextActive]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

// ─── Inline Room Picker Drawer ───────────────────────────────────────────────
import { AddStudentScreen } from './AddStudentScreen'; // We can reuse ModalSheet if we want, or define a simpler local one

import { View as RNView } from 'react-native';
import { Modal } from 'react-native';

const ModalSheet = ({ visible, onClose, maxHeight = '85%', children }: any) => {
    if (!visible) return null;
    return (
        <Modal transparent visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.sheet, { maxHeight }]}>
                    <View style={styles.sheetHandle} />
                    {children}
                </View>
            </View>
        </Modal>
    );
};

const RoomPickerDrawer = ({ visible, rooms, selectedRoomId, onSelectRoom, onClose }: any) => {
    const [search, setSearch] = useState('');
    const grouped = React.useMemo(() => {
        const f = search ? rooms.filter((r: any) => r.room_number?.toString().includes(search)) : rooms;
        const map: Record<number, any[]> = {};
        f.forEach((r: any) => { const fl = r.floor_number ?? 0; if (!map[fl]) map[fl] = []; map[fl].push(r); });
        return Object.keys(map).sort((a, b) => Number(a) - Number(b)).map(fl => ({ floor: Number(fl), rooms: map[Number(fl)] }));
    }, [rooms, search]);

    const statusColor = (r: any) => r.status === 'MAINTENANCE' ? '#F97316' : (r.available_beds ?? 0) > 0 ? '#16A34A' : '#DC2626';

    return (
        <ModalSheet visible={visible} onClose={onClose} maxHeight="80%">
            <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select Room</Text>
                <TouchableOpacity onPress={onClose} style={styles.doneBtn}><Text style={styles.doneBtnText}>Close</Text></TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                <View style={styles.searchBarWrap}>
                    <Text style={{ color: '#94A3B8', marginRight: 8, fontSize: 16 }}>🔍</Text>
                    <TextInput style={{ flex: 1, fontSize: 15, color: '#1E293B' }} placeholder="Search room..." placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} />
                </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}>
                {grouped.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: '#94A3B8' }}>No rooms found</Text></View>}
                {grouped.map(({ floor, rooms: fr }) => (
                    <View key={floor}>
                        <View style={styles.floorChip}><Text style={styles.floorChipText}>FLOOR {floor}</Text></View>
                        {fr.map((room: any) => {
                            const isSel = selectedRoomId === room.room_id?.toString();
                            const avail = room.available_beds ?? 0;
                            return (
                                <TouchableOpacity key={room.room_id}
                                    style={[styles.roomCard, isSel && styles.roomCardSel, avail <= 0 && { opacity: 0.55 }]}
                                    onPress={() => { onSelectRoom(room); setSearch(''); onClose(); }} activeOpacity={0.75}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={[styles.roomNum, isSel && { color: '#F97316' }]}>{room.room_number}</Text>
                                        <Text style={styles.roomCap}>Cap: {room.capacity ?? '—'}</Text>
                                    </View>
                                    <Text style={[styles.roomAvail, { color: statusColor(room) }]}>Available: {avail}</Text>
                                    <Text style={styles.roomRent}>Rent: ₹{room.rent_per_bed ?? room.base_rent ?? '—'}</Text>
                                    {isSel && <View style={styles.selectedBadge}><Check size={11} color="#F97316" /><Text style={styles.selectedBadgeText}>Selected</Text></View>}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </ScrollView>
        </ModalSheet>
    );
};

// ─── Inline Bed Picker Drawer ────────────────────────────────────────────────
const BedPickerDrawer = ({ visible, room, beds, selectedBedId, onSelectBed, onClose, loading }: any) => (
    <ModalSheet visible={visible} onClose={onClose} maxHeight="65%">
        <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Beds in Room {room?.room_number}</Text>
            <TouchableOpacity onPress={onClose} style={styles.doneBtn}><Text style={styles.doneBtnText}>Close</Text></TouchableOpacity>
        </View>
        {room && <View style={{ paddingHorizontal: 16, marginBottom: 8 }}><View style={styles.floorChip}><Text style={styles.floorChipText}>ROOM {room.room_number}</Text></View></View>}
        {loading ? (
            <ActivityIndicator color="#F97316" size="large" style={{ marginVertical: 40 }} />
        ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
                {beds.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: '#94A3B8' }}>No beds in this room</Text></View>}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {beds.map((bed: any) => {
                        const isAvail = !bed.student_id || bed.status === 'available';
                        const isSel = selectedBedId === bed.bed_id?.toString();
                        return (
                            <TouchableOpacity key={bed.bed_id}
                                style={[styles.bedCard, isSel && styles.bedCardSel, !isAvail && styles.bedCardOcc]}
                                onPress={() => { if (!isAvail) return; onSelectBed(bed); onClose(); }} activeOpacity={0.75}>
                                <BedDouble size={20} color={isSel ? '#F97316' : !isAvail ? '#CBD5E1' : '#64748B'} />
                                <Text style={[styles.bedName, isSel && { color: '#F97316' }, !isAvail && { color: '#94A3B8' }]}>{bed.bed_name ?? `Bed ${bed.bed_number}`}</Text>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: isAvail ? '#16A34A' : '#DC2626', marginTop: 2 }}>{isAvail ? '● AVAILABLE' : '● OCCUPIED'}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        )}
    </ModalSheet>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PreBookingScreen({ navigation, route }: any) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const { showSuccess, showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [rooms, setRooms] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [bedsLoading, setBedsLoading] = useState(false);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
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

    const selectedRoom = rooms.find(r => r.room_id?.toString() === formData.room_id);
    const selectedBed = beds.find(b => b.bed_id?.toString() === formData.bed_id);

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const res = await api.get(`/rooms?hostelId=${user?.hostel_id}&limit=200`);
            if (res.data.success) {
                setRooms(res.data.data || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchBeds = useCallback(async (roomId: string) => {
        setBedsLoading(true);
        try {
            const res = await api.get(`/rooms/${roomId}/beds`);
            if (res.data.success) {
                setBeds(res.data.data);
                return;
            }
        } catch {}
        const room = rooms.find(r => r.room_id?.toString() === roomId);
        const cap = room?.capacity ?? 1;
        const fake = Array.from({ length: Number(cap) }, (_, i) => ({
            bed_id: `${roomId}_${i + 1}`,
            bed_name: `${room?.room_number}${String.fromCharCode(65 + i)}`,
            status: i < (room?.available_beds ?? cap) ? 'available' : 'occupied',
            student_id: i < (room?.available_beds ?? cap) ? null : 1,
        }));
        setBeds(fake);
        setBedsLoading(false);
    }, [rooms]);

    const up = (key: string, val: any) => setFormData(p => ({ ...p, [key]: val }));

    const validate = () => {
        const e: Record<string, string> = {};
        if (!formData.first_name) e.first_name = 'First name is required';
        if (!formData.phone) e.phone = 'Phone is required';
        else if (!/^\d{10}$/.test(formData.phone)) e.phone = 'Must be exactly 10 digits';
        if (!formData.expected_join_date) e.expected_join_date = 'Expected join date is required';
        if (!formData.room_id) e.room_id = 'Please select a room';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            showError('Fix highlighted fields', 'Validation Error');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                ...formData,
                hostel_id: user?.hostel_id,
                guardian_phone: '0000000000',
                guardian_name: 'N/A',
                admission_fee: 0,
                admission_status: 0,
                status: 2, // 2 = Pre-Booked (TINYINT supported)
                admission_date: formData.expected_join_date,
                room_id: formData.room_id ? parseInt(formData.room_id) : null,
                bed_id: formData.bed_id || null,
                floor_number: formData.floor_number ? parseInt(formData.floor_number) : null,
                monthly_rent: parseFloat(formData.monthly_rent || '0'),
            };

            const res = await api.post('/students', payload);
            if (res.data.success) {
                showSuccess(`${formData.first_name} pre-booked successfully.`, 'Pre-Booked Success!');
                setTimeout(() => navigation.goBack(), 900);
            }
        } catch (error: any) {
            showError(error.response?.data?.error || 'Failed to save pre-booking', 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                        <ArrowLeft color="#FFF" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Pre-Book Room</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>👤 Tenant Information</Text>
                    <FormInput
                        label="First Name *"
                        icon={User}
                        placeholder="e.g. Rahul"
                        value={formData.first_name}
                        error={errors.first_name}
                        onChangeText={(t: string) => {
                            up('first_name', t.replace(/[^a-zA-Z0-9\s]/g, ''));
                            if (errors.first_name && t) setErrors(p => { const e = { ...p }; delete e.first_name; return e; });
                        }}
                    />
                    <FormInput
                        label="Last Name"
                        icon={User}
                        placeholder="e.g. Sharma"
                        value={formData.last_name}
                        onChangeText={(t: string) => up('last_name', t.replace(/[^a-zA-Z0-9\s]/g, ''))}
                    />
                    <Selector
                        label="Gender"
                        options={['Male', 'Female', 'Other']}
                        selected={formData.gender}
                        onSelect={(v: string) => up('gender', v)}
                    />
                    <FormInput
                        label="Phone *"
                        icon={Phone}
                        placeholder="9876543210"
                        keyboardType="phone-pad"
                        value={formData.phone}
                        error={errors.phone}
                        onChangeText={(t: string) => {
                            const c = t.replace(/\D/g, '').slice(0, 10);
                            up('phone', c);
                            if (errors.phone && c.length === 10) setErrors(p => { const e = { ...p }; delete e.phone; return e; });
                        }}
                    />
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>📅 Schedule Details</Text>
                    <SelectField
                        label="Expected Join Date *"
                        icon={Calendar}
                        placeholder="Pick date"
                        value={formData.expected_join_date}
                        error={errors.expected_join_date}
                        onPress={() => setShowDatePicker(true)}
                    />
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>🏠 Room & Bed Allocation</Text>
                    {selectedRoom && (
                        <View style={styles.allocationSummary}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.allocationLabel}>Selected Room</Text>
                                <Text style={styles.allocationValue}>Room {selectedRoom.room_number}</Text>
                                <Text style={styles.allocationMeta}>Floor {selectedRoom.floor_number ?? '—'} • ₹{selectedRoom.rent_per_bed ?? '—'}/bed</Text>
                            </View>
                            <View style={styles.allocationDivider} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.allocationLabel}>Selected Bed</Text>
                                <Text style={[styles.allocationValue, !selectedBed && { color: '#94A3B8', fontSize: 14 }]}>
                                    {selectedBed ? (selectedBed.bed_name ?? `Bed`) : 'Not selected'}
                                </Text>
                                {selectedBed && <Text style={styles.allocationMeta}>● Available</Text>}
                            </View>
                        </View>
                    )}
                    <View style={[styles.row, { gap: 12 }]}>
                        <TouchableOpacity style={[styles.allocationBtn, selectedRoom && styles.allocationBtnActive]} onPress={() => setRoomModal(true)} activeOpacity={0.8}>
                            <Home size={17} color={selectedRoom ? '#EA580C' : '#64748B'} />
                            <Text style={[styles.allocationBtnText, selectedRoom && { color: '#EA580C' }]} numberOfLines={1}>{selectedRoom ? `Room ${selectedRoom.room_number}` : 'Select Room'}</Text>
                            <ChevronDown size={15} color={selectedRoom ? '#EA580C' : '#94A3B8'} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.allocationBtn, selectedBed && styles.allocationBtnActive, !selectedRoom && styles.allocationBtnDisabled]}
                            onPress={() => { if (!selectedRoom) { Alert.alert('Select Room First', 'Please pick a room first.'); return; } setBedModal(true); }} activeOpacity={0.8}>
                            <BedDouble size={17} color={selectedBed ? '#EA580C' : !selectedRoom ? '#CBD5E1' : '#64748B'} />
                            <Text style={[styles.allocationBtnText, selectedBed && { color: '#EA580C' }, !selectedRoom && { color: '#CBD5E1' }]} numberOfLines={1}>{selectedBed ? (selectedBed.bed_name ?? 'Bed') : 'Select Bed'}</Text>
                            <ChevronDown size={15} color={selectedBed ? '#EA580C' : '#94A3B8'} />
                        </TouchableOpacity>
                    </View>
                    {selectedRoom && (
                        <TouchableOpacity onPress={() => { up('room_id', ''); up('bed_id', ''); up('floor_number', ''); up('monthly_rent', ''); setBeds([]); }} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
                            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>✕ Clear allocation</Text>
                        </TouchableOpacity>
                    )}
                    <FormInput
                        label="Monthly Rent (₹)"
                        icon={Phone} // Using phone icon for rent input since credit card isn't imported
                        placeholder="Auto-filled from room"
                        keyboardType="numeric"
                        value={formData.monthly_rent}
                        onChangeText={(t: string) => up('monthly_rent', t.replace(/\D/g, ''))}
                    />
                </View>

            </ScrollView>

            <View style={styles.stickyFooter}>
                <TouchableOpacity
                    style={[styles.saveBtn, loading && styles.disabledBtn]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={styles.saveGrad}>
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Pre-Booking</Text>}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                date={new Date(formData.expected_join_date)}
                minimumDate={new Date()}
                onConfirm={(date) => {
                    up('expected_join_date', date.toISOString().split('T')[0]);
                    setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
            />

            <RoomPickerDrawer
                visible={roomModal}
                rooms={rooms}
                selectedRoomId={formData.room_id}
                onSelectRoom={(room: any) => {
                    up('room_id', room.room_id.toString());
                    up('floor_number', room.floor_number?.toString() || '');
                    up('monthly_rent', room.rent_per_bed?.toString() || room.base_rent?.toString() || formData.monthly_rent);
                    up('bed_id', '');
                    setBeds([]);
                    fetchBeds(room.room_id.toString());
                }}
                onClose={() => setRoomModal(false)}
            />

            <BedPickerDrawer
                visible={bedModal}
                room={selectedRoom}
                beds={beds}
                selectedBedId={formData.bed_id}
                loading={bedsLoading}
                onSelectBed={(bed: any) => up('bed_id', bed.bed_id?.toString())}
                onClose={() => setBedModal(false)}
            />

        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    content: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 60 },
    formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 14 },
    inputGroup: { marginBottom: 14 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, height: 48, overflow: 'hidden' },
    inputIcon: { width: 44, alignItems: 'center', justifyContent: 'center' },
    input: { flex: 1, height: '100%', fontSize: 14, color: '#1E293B', fontWeight: '500', paddingRight: 12 },
    inputText: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '500' },
    inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
    errorText: { color: '#EF4444', fontSize: 11, fontWeight: '600', marginTop: 4, marginLeft: 4 },
    selectorRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    selectorItem: { flex: 1, height: 40, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
    selectorItemActive: { backgroundColor: '#FFEFE6', borderColor: '#F97316' },
    selectorText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    selectorTextActive: { color: '#F97316', fontWeight: '700' },

    // Allocation UI
    row: { flexDirection: 'row' },
    allocationSummary: { flexDirection: 'row', backgroundColor: '#FFF8F4', borderLeftWidth: 3, borderLeftColor: '#F97316', padding: 12, borderRadius: 8, marginBottom: 12 },
    allocationLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
    allocationValue: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginTop: 2 },
    allocationMeta: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 2 },
    allocationDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 12 },
    allocationBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 },
    allocationBtnActive: { backgroundColor: '#FFEFE6', borderColor: '#F97316' },
    allocationBtnDisabled: { opacity: 0.45 },
    allocationBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#64748B' },

    // Drawers
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
    doneBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#FFEFE6' },
    doneBtnText: { color: '#F97316', fontWeight: '700', fontSize: 14 },
    searchBarWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    floorChip: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10, marginTop: 8 },
    floorChipText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
    roomCard: { backgroundColor: '#FFF8F4', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#FFE4D6', position: 'relative' },
    roomCardSel: { borderColor: '#F97316', backgroundColor: '#FFEFE6' },
    roomNum: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    roomCap: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    roomAvail: { fontSize: 13, fontWeight: '700', marginTop: 4 },
    roomRent: { fontSize: 13, color: '#475569', marginTop: 3 },
    selectedBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEFE6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    selectedBadgeText: { fontSize: 11, color: '#F97316', fontWeight: '700' },

    // Bed Picker
    bedCard: { backgroundColor: '#FFF8F4', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#FFE4D6', width: '47%', alignItems: 'center', gap: 6 },
    bedCardSel: { borderColor: '#F97316', backgroundColor: '#FFEFE6' },
    bedCardOcc: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', opacity: 0.65 },
    bedName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },

    // Save Button
    stickyFooter: { paddingHorizontal: 16, paddingBottom: 30, paddingTop: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    saveBtn: { borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#EA580C', shadowOpacity: 0.15, shadowRadius: 8 },
    saveGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    disabledBtn: { opacity: 0.7 },
});
