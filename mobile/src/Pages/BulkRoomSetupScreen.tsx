import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Text,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    TextInput,
    Modal,
    FlatList,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { AppHeader } from '../components/AppHeader';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRefresh } from '../../contexts/RefreshContext';
import {
    Check,
    ChevronDown,
    Layers,
    DoorOpen,
    IndianRupee,
    Plus,
    Trash2,
    CheckCircle2,
} from 'lucide-react-native';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { extractCapacity } from './AddRoomScreen';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface PatternRow {
    id: string;
    room_type_id: string;
    rent_per_bed: string;
}

interface PreviewRoom {
    id: string;
    room_number: string;
    room_type_id: string;
    room_type_name: string;
    capacity: string;
    rent_per_bed: string;
}

export const BulkRoomSetupScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { triggerRefresh } = useRefresh();
    const insets = useSafeAreaInsets();
    const nextIdRef = useRef(0);
    const genId = () => `row-${nextIdRef.current++}`;

    const [roomTypes, setRoomTypes] = useState<any[]>([]);
    const [hostelFloorLimit, setHostelFloorLimit] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [floorNumber, setFloorNumber] = useState('');
    const [mainRoomCount, setMainRoomCount] = useState('');
    const [patternRows, setPatternRows] = useState<PatternRow[]>([{ id: genId(), room_type_id: '', rent_per_bed: '' }]);
    const [preview, setPreview] = useState<PreviewRoom[] | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [typeModalRowId, setTypeModalRowId] = useState<string | null>(null);
    const [lastFloorDone, setLastFloorDone] = useState<string | null>(null);

    useEffect(() => {
        fetchRoomTypes();
        fetchHostelDetails();
    }, []);

    const fetchHostelDetails = async () => {
        if (!user?.hostel_id) return;
        try {
            const response = await api.get(`/hostels/${user.hostel_id}`);
            const floorCount = Number(response?.data?.data?.total_floors);
            if (Number.isFinite(floorCount) && floorCount > 0) {
                setHostelFloorLimit(floorCount);
            }
        } catch (error) {
            console.error('Error fetching hostel details:', error);
        }
    };

    const fetchRoomTypes = async () => {
        try {
            const response = await api.get('/rooms/types');
            if (response.data.success) {
                setRoomTypes(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching room types:', error);
        }
    };

    const addPatternRow = () => {
        setPatternRows(prev => [...prev, { id: genId(), room_type_id: '', rent_per_bed: '' }]);
    };

    const removePatternRow = (id: string) => {
        setPatternRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
    };

    const updatePatternRow = (id: string, patch: Partial<PatternRow>) => {
        setPatternRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    };

    const roomTypeName = (id: string) => roomTypes.find(t => t.room_type_id.toString() === id)?.room_type_name || '';

    const generatePreview = () => {
        const newErrors: Record<string, string> = {};
        const floor = parseInt(floorNumber, 10);
        const mainRooms = parseInt(mainRoomCount, 10);

        if (!floorNumber || !Number.isInteger(floor) || floor < 1) {
            newErrors.floorNumber = 'Enter a valid floor number';
        } else if (hostelFloorLimit !== null && floor > hostelFloorLimit) {
            newErrors.floorNumber = `You only added ${hostelFloorLimit} floors when creating this PG. Please update your PG details first.`;
        }

        if (!mainRoomCount || !Number.isInteger(mainRooms) || mainRooms < 1) {
            newErrors.mainRoomCount = 'Enter how many rooms are on this floor';
        }

        const validRows = patternRows.filter(r => r.room_type_id && r.rent_per_bed);
        if (validRows.length === 0) {
            newErrors.pattern = 'Add at least one sub-room type with a rent amount';
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        const rows: PreviewRoom[] = [];
        for (let m = 1; m <= mainRooms; m++) {
            const mainStr = String(m).padStart(2, '0');
            validRows.forEach((row, idx) => {
                const suffix = validRows.length > 1 ? `-${LETTERS[idx]}` : '';
                rows.push({
                    id: genId(),
                    room_number: `${floor}${mainStr}${suffix}`,
                    room_type_id: row.room_type_id,
                    room_type_name: roomTypeName(row.room_type_id),
                    capacity: extractCapacity(roomTypeName(row.room_type_id)),
                    rent_per_bed: row.rent_per_bed,
                });
            });
        }
        setPreview(rows);
    };

    const updatePreviewRow = (id: string, patch: Partial<PreviewRoom>) => {
        setPreview(prev => prev ? prev.map(r => r.id === id ? { ...r, ...patch } : r) : prev);
    };

    const removePreviewRow = (id: string) => {
        setPreview(prev => prev ? prev.filter(r => r.id !== id) : prev);
    };

    const handleSubmit = async () => {
        if (!preview || preview.length === 0) return;

        const numbers = preview.map(p => p.room_number.trim());
        const dupes = Array.from(new Set(numbers.filter((n, i) => numbers.indexOf(n) !== i)));
        if (dupes.length > 0) {
            Toast.show({ type: 'error', text1: 'Duplicate room numbers', text2: dupes.join(', ') });
            return;
        }
        if (numbers.some(n => !n)) {
            Toast.show({ type: 'error', text1: 'Missing room number', text2: 'Every generated room needs a room number.' });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                hostel_id: user?.hostel_id,
                floor_number: parseInt(floorNumber, 10),
                rooms: preview.map(p => ({
                    room_number: p.room_number.trim(),
                    room_type_id: parseInt(p.room_type_id) || null,
                    capacity: parseInt(p.capacity) || 4,
                    rent_per_bed: parseFloat(p.rent_per_bed) || 0,
                })),
            };
            const response = await api.post('/rooms/bulk', payload);
            if (response.status === 201) {
                Toast.show({ type: 'success', text1: 'Rooms created', text2: response.data?.message || `${preview.length} rooms added.` });
                triggerRefresh();
                setLastFloorDone(floorNumber);
                setPreview(null);
                setFloorNumber('');
                setMainRoomCount('');
            }
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Could not create rooms',
                text2: error.response?.data?.error || 'Please check the room numbers and try again.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const selectedTypeForRow = typeModalRowId ? patternRows.find(r => r.id === typeModalRowId) : null;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: isDark ? theme.background : '#F4F6FF' }]}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppHeader title="Floor Template" subtitle="Set up a whole floor's rooms at once" />
            <FullScreenLoader visible={submitting} />

            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 16, paddingTop: 16 }}
                keyboardShouldPersistTaps="handled"
            >
                {lastFloorDone && (
                    <View style={[styles.doneBanner, { backgroundColor: isDark ? '#052E1A' : '#ECFDF5', borderColor: '#10B981' }]}>
                        <CheckCircle2 size={18} color="#10B981" />
                        <Text style={[styles.doneBannerText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                            Floor {lastFloorDone} created. Set up another floor below, or go back when you're done.
                        </Text>
                    </View>
                )}

                {/* Floor + main room count */}
                <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIconWrap, { backgroundColor: '#EDE9FE' }]}>
                            <Layers size={18} color="#7C3AED" />
                        </View>
                        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Floor Details</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>Floor Number <Text style={styles.required}>*</Text></Text>
                            <View style={[styles.inputBox, {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: errors.floorNumber ? '#EF4444' : (isDark ? '#334155' : '#E8EAF6'),
                            }]}>
                                <TextInput
                                    style={[styles.inputText, { color: theme.textPrimary }]}
                                    placeholder="e.g. 1"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                    value={floorNumber}
                                    onChangeText={setFloorNumber}
                                />
                            </View>
                            {errors.floorNumber && <Text style={styles.errorText}>{errors.floorNumber}</Text>}
                        </View>

                        <View style={styles.halfCol}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>Main Rooms on Floor <Text style={styles.required}>*</Text></Text>
                            <View style={[styles.inputBox, {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: errors.mainRoomCount ? '#EF4444' : (isDark ? '#334155' : '#E8EAF6'),
                            }]}>
                                <TextInput
                                    style={[styles.inputText, { color: theme.textPrimary }]}
                                    placeholder="e.g. 7"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                    value={mainRoomCount}
                                    onChangeText={setMainRoomCount}
                                />
                            </View>
                            {errors.mainRoomCount && <Text style={styles.errorText}>{errors.mainRoomCount}</Text>}
                        </View>
                    </View>
                </View>

                {/* Pattern rows */}
                <View style={[styles.card, { backgroundColor: theme.cardBg, marginTop: 16 }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIconWrap, { backgroundColor: '#FFF7ED' }]}>
                            <DoorOpen size={18} color="#F59E0B" />
                        </View>
                        <View>
                            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Sub-Room Pattern</Text>
                            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                                What each main room on this floor is split into
                            </Text>
                        </View>
                    </View>

                    {patternRows.map((row, idx) => (
                        <View key={row.id} style={styles.patternRow}>
                            <View style={[styles.patternLetter, { backgroundColor: isDark ? '#334155' : '#EDE9FE' }]}>
                                <Text style={{ color: '#7C3AED', fontWeight: '800', fontSize: 12 }}>
                                    {patternRows.length > 1 ? LETTERS[idx] : '—'}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.selectBox, {
                                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                    borderColor: isDark ? '#334155' : '#E8EAF6',
                                }]}
                                onPress={() => setTypeModalRowId(row.id)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[styles.inputText, { color: row.room_type_id ? theme.textPrimary : '#94A3B8', flex: 1 }]}
                                    numberOfLines={1}
                                >
                                    {row.room_type_id ? roomTypeName(row.room_type_id) : 'Room Type'}
                                </Text>
                                <ChevronDown size={16} color="#94A3B8" />
                            </TouchableOpacity>

                            <View style={[styles.rentBox, {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: isDark ? '#334155' : '#E8EAF6',
                            }]}>
                                <IndianRupee size={13} color="#94A3B8" />
                                <TextInput
                                    style={[styles.inputText, { color: theme.textPrimary, fontSize: 13 }]}
                                    placeholder="Rent"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                    value={row.rent_per_bed}
                                    onChangeText={text => updatePatternRow(row.id, { rent_per_bed: text })}
                                />
                            </View>

                            {patternRows.length > 1 && (
                                <TouchableOpacity onPress={() => removePatternRow(row.id)} style={styles.removeBtn}>
                                    <Trash2 size={16} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}

                    {errors.pattern && <Text style={styles.errorText}>{errors.pattern}</Text>}

                    <TouchableOpacity style={styles.addRowBtn} onPress={addPatternRow} activeOpacity={0.7}>
                        <Plus size={14} color="#7C3AED" />
                        <Text style={styles.addRowText}>Add Sub-Room Type</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.generateBtn, { backgroundColor: '#6C3ACD' }]}
                        onPress={generatePreview}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.generateBtnText}>Generate Preview</Text>
                    </TouchableOpacity>
                </View>

                {/* Preview */}
                {preview && preview.length > 0 && (
                    <View style={[styles.card, { backgroundColor: theme.cardBg, marginTop: 16 }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrap, { backgroundColor: '#EDE9FE' }]}>
                                <Layers size={18} color="#7C3AED" />
                            </View>
                            <View>
                                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                                    Preview — {preview.length} Rooms
                                </Text>
                                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                                    Tap a room number or rent to tweak it
                                </Text>
                            </View>
                        </View>

                        {preview.map(row => (
                            <View key={row.id} style={[styles.previewRow, { borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                <View style={[styles.inputBox, { flex: 1.2, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E8EAF6' }]}>
                                    <TextInput
                                        style={[styles.inputText, { color: theme.textPrimary }]}
                                        value={row.room_number}
                                        onChangeText={text => updatePreviewRow(row.id, { room_number: text })}
                                    />
                                </View>
                                <Text style={[styles.previewType, { color: theme.textSecondary }]} numberOfLines={1}>
                                    {row.room_type_name}
                                </Text>
                                <View style={[styles.rentBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E8EAF6' }]}>
                                    <IndianRupee size={12} color="#94A3B8" />
                                    <TextInput
                                        style={[styles.inputText, { color: theme.textPrimary, fontSize: 13 }]}
                                        keyboardType="numeric"
                                        value={row.rent_per_bed}
                                        onChangeText={text => updatePreviewRow(row.id, { rent_per_bed: text })}
                                    />
                                </View>
                                <TouchableOpacity onPress={() => removePreviewRow(row.id)} style={styles.removeBtn}>
                                    <Trash2 size={15} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 8 }} />
            </ScrollView>

            {/* Sticky footer */}
            {preview && preview.length > 0 && (
                <View style={[styles.footer, {
                    backgroundColor: theme.cardBg,
                    borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
                    paddingBottom: insets.bottom + 12,
                }]}>
                    <TouchableOpacity
                        style={[styles.createBtn, { backgroundColor: '#6C3ACD', opacity: submitting ? 0.7 : 1 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                        activeOpacity={0.85}
                    >
                        <CheckCircle2 size={18} color="#FFF" />
                        <Text style={styles.createBtnText}>Create {preview.length} Rooms</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Room Type Modal */}
            <Modal
                visible={!!typeModalRowId}
                transparent
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setTypeModalRowId(null)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypeModalRowId(null)}>
                    <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={e => e.stopPropagation()}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Room Type</Text>
                            <TouchableOpacity onPress={() => setTypeModalRowId(null)} style={styles.doneBtn} activeOpacity={0.7}>
                                <Text style={styles.doneBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={roomTypes}
                            keyExtractor={item => item.room_type_id.toString()}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const selected = selectedTypeForRow?.room_type_id === item.room_type_id.toString();
                                return (
                                    <TouchableOpacity
                                        style={[styles.modalOption, selected && { backgroundColor: '#F5F3FF' }]}
                                        onPress={() => {
                                            if (typeModalRowId) {
                                                updatePatternRow(typeModalRowId, { room_type_id: item.room_type_id.toString() });
                                            }
                                            setTypeModalRowId(null);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.modalOptionText, selected && { color: '#7C3AED', fontWeight: '700' }]}>
                                            {item.room_type_name}
                                        </Text>
                                        {selected && <Check size={18} color="#7C3AED" />}
                                    </TouchableOpacity>
                                );
                            }}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        />
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },

    doneBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 16,
    },
    doneBannerText: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },

    card: {
        borderRadius: 16,
        padding: 16,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    cardIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: { fontSize: 15, fontWeight: '700' },
    cardSubtitle: { fontSize: 11, fontWeight: '500', marginTop: 1 },

    row: { flexDirection: 'row', gap: 12 },
    halfCol: { flex: 1 },

    label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
    required: { color: '#EF4444' },

    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    inputText: { flex: 1, fontSize: 14, fontWeight: '500' },
    errorText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 6,
        marginLeft: 4,
    },

    patternRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    patternLetter: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectBox: {
        flex: 1.4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 46,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
    },
    rentBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 46,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 8,
        gap: 4,
    },
    removeBtn: { padding: 6 },

    addRowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#7C3AED',
        marginTop: 4,
        marginBottom: 14,
    },
    addRowText: { color: '#7C3AED', fontSize: 13, fontWeight: '700' },

    generateBtn: {
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    generateBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    previewType: { flex: 1, fontSize: 11, fontWeight: '600' },

    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 10,
    },
    createBtn: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    createBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        maxHeight: '70%',
    },
    modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
    doneBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#EDE9FE' },
    doneBtnText: { color: '#7C3AED', fontWeight: '700', fontSize: 13 },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    modalOptionText: { fontSize: 15, color: '#334155', fontWeight: '500' },
});

export default BulkRoomSetupScreen;
