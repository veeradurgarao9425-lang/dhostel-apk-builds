import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    Animated,
    Pressable,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { AppHeader } from '../components/AppHeader';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { useFocusEffect } from '@react-navigation/native';
import {
    Check,
    ChevronDown,
    ChevronLeft,
    Layers,
    DoorClosed,
    Shuffle,
    Home,
    IndianRupee,
    Plus,
    Trash2,
    CheckCircle2,
    Lock,
    Pencil,
    X,
    AlertTriangle,
} from 'lucide-react-native';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { extractCapacity } from './AddRoomScreen';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

type Mode = 'simple' | 'mixed' | 'nested';

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

const CustomAlertModal = ({ visible, title, message, onClose, primaryAction, secondaryAction, icon: Icon = AlertTriangle }: any) => {
    const { theme, isDark } = useTheme();
    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <View style={{ backgroundColor: isDark ? '#1E293B' : '#FFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        <Icon size={32} color="#EF4444" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: theme.textPrimary, marginBottom: 12, textAlign: 'center' }}>{title}</Text>
                    <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 22, fontWeight: '700' }}>{message}</Text>
                    
                    {primaryAction || secondaryAction ? (
                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            {secondaryAction && (
                                <TouchableOpacity onPress={secondaryAction.onPress} activeOpacity={0.8} style={{ flex: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
                                    <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: '700' }}>{secondaryAction.label}</Text>
                                </TouchableOpacity>
                            )}
                            {primaryAction && (
                                <TouchableOpacity onPress={primaryAction.onPress} activeOpacity={0.8} style={{ flex: 1, backgroundColor: theme.primary || '#6C3ACD', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
                                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{primaryAction.label}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={{ width: '100%', backgroundColor: theme.primary || '#6C3ACD', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}>
                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Okay, I understand</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
};

interface PatternRow {
    id: string;
    room_type_id: string;
    rent_per_bed: string;
}

interface MixedGroup {
    id: string;
    room_type_id: string;
    rent_per_bed: string;
    count: string;
}

interface PreviewRoom {
    id: string;
    room_number: string;
    room_type_id: string;
    room_type_name: string;
    capacity: string;
    rent_per_bed: string;
    main_group?: string;
}

interface FloorSummary {
    floor: number;
    count: number;
    typeNames: string[];
}

type TypeModalTarget = { kind: 'simple' } | { kind: 'mixed'; rowId: string } | { kind: 'nested'; rowId: string } | null;

const MODE_INFO: Record<Mode, { title: string; desc: string; example: string; Icon: any; wash: string; tint: string }> = {
    simple: {
        title: 'Simple — all the same',
        desc: 'Every room on this floor is the same type and rent.',
        example: 'e.g. 10 rooms, all Double Sharing @ ₹5,000',
        Icon: DoorClosed,
        wash: '#EDE9FE',
        tint: '#6C3ACD',
    },
    mixed: {
        title: 'Mixed room types',
        desc: 'Different rooms on this floor, each its own unit — nothing splits further.',
        example: 'e.g. 4 Double + 3 Triple + 2 Single = 9 rooms',
        Icon: Shuffle,
        wash: '#FFF7ED',
        tint: '#B45309',
    },
    nested: {
        title: 'Rooms with sub-rooms',
        desc: 'Each main room splits into smaller rooms priced separately.',
        example: 'e.g. 7 main rooms × 3 sub-rooms = 21 rooms (a 3BHK-style floor)',
        Icon: Home,
        wash: '#DCF3F0',
        tint: '#0E8478',
    },
};

export const BulkRoomSetupScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { triggerRefresh } = useRefresh();
    const insets = useSafeAreaInsets();
    const nextIdRef = useRef(0);
    const genId = () => `row-${nextIdRef.current++}`;

    const [roomTypes, setRoomTypes] = useState<any[]>([]);
    const [hostelFloorLimit, setHostelFloorLimit] = useState<number | null>(null);
    const [existingRooms, setExistingRooms] = useState<any[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [justLocked, setJustLocked] = useState<{ floor: number; count: number } | null>(null);

    // Which floor is currently being configured (null = showing the overview)
    const [activeFloor, setActiveFloor] = useState<number | null>(null);
    const [mode, setMode] = useState<Mode | null>(null);
    const [manualFloorInput, setManualFloorInput] = useState('');

    // Mode-specific inputs
    const [simpleCount, setSimpleCount] = useState('');
    const [simpleTypeId, setSimpleTypeId] = useState('');
    const [simpleRent, setSimpleRent] = useState('');

    const [mixedGroups, setMixedGroups] = useState<MixedGroup[]>([{ id: genId(), room_type_id: '', rent_per_bed: '', count: '' }]);

    const [mainCount, setMainCount] = useState('');
    const [patternRows, setPatternRows] = useState<PatternRow[]>([{ id: genId(), room_type_id: '', rent_per_bed: '' }]);

    const [preview, setPreview] = useState<PreviewRoom[] | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [typeModalTarget, setTypeModalTarget] = useState<TypeModalTarget>(null);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchRoomTypes();
            fetchHostelDetails();
            fetchExistingRooms();
        }, [])
    );

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

    const fetchExistingRooms = async () => {
        try {
            const response = await api.get('/rooms?limit=500');
            if (response.data.success) {
                setExistingRooms(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoadingRooms(false);
        }
    };

    // ── Floor summaries derived from real, already-created rooms ──────────────
    const floorSummaries: FloorSummary[] = useMemo(() => {
        const map = new Map<number, { count: number; types: Set<string> }>();
        existingRooms.forEach(r => {
            const f = Number(r.floor_number);
            if (!Number.isFinite(f)) return;
            if (!map.has(f)) map.set(f, { count: 0, types: new Set() });
            const entry = map.get(f)!;
            entry.count++;
            if (r.room_type_name) entry.types.add(r.room_type_name);
        });
        return Array.from(map.entries())
            .map(([floor, v]) => ({ floor, count: v.count, typeNames: Array.from(v.types) }))
            .sort((a, b) => a.floor - b.floor);
    }, [existingRooms]);

    const floorSummaryMap = useMemo(() => {
        const m = new Map<number, FloorSummary>();
        floorSummaries.forEach(f => m.set(f.floor, f));
        return m;
    }, [floorSummaries]);

    const floorList = useMemo(() => {
        if (hostelFloorLimit) {
            return Array.from({ length: hostelFloorLimit }, (_, i) => i + 1);
        }
        return floorSummaries.map(f => f.floor);
    }, [hostelFloorLimit, floorSummaries]);

    const roomTypeName = (id: string) => roomTypes.find(t => t.room_type_id.toString() === id)?.room_type_name || '';

    // ── Start / leave a floor's setup ──────────────────────────────────────────
    const startFloor = (floor: number) => {
        setActiveFloor(floor);
        setMode(null);
        setSimpleCount('');
        setSimpleTypeId('');
        setSimpleRent('');
        setMixedGroups([{ id: genId(), room_type_id: '', rent_per_bed: '', count: '' }]);
        setMainCount('');
        setPatternRows([{ id: genId(), room_type_id: '', rent_per_bed: '' }]);
        setPreview(null);
        setErrors({});
        setJustLocked(null);
    };

    const resetToOverview = () => {
        setActiveFloor(null);
        setMode(null);
        setPreview(null);
        setErrors({});
    };

    // ── Mixed group helpers ─────────────────────────────────────────────────────
    const addMixedGroup = () => setMixedGroups(prev => [...prev, { id: genId(), room_type_id: '', rent_per_bed: '', count: '' }]);
    const removeMixedGroup = (id: string) => setMixedGroups(prev => (prev.length > 1 ? prev.filter(g => g.id !== id) : prev));
    const updateMixedGroup = (id: string, patch: Partial<MixedGroup>) => setMixedGroups(prev => prev.map(g => (g.id === id ? { ...g, ...patch } : g)));
    const mixedTotal = mixedGroups.reduce((sum, g) => sum + (parseInt(g.count, 10) || 0), 0);

    // ── Pattern row helpers (nested mode) ───────────────────────────────────────
    const addPatternRow = () => setPatternRows(prev => [...prev, { id: genId(), room_type_id: '', rent_per_bed: '' }]);
    const removePatternRow = (id: string) => setPatternRows(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));
    const updatePatternRow = (id: string, patch: Partial<PatternRow>) => setPatternRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));

    // ── Preview generation, one per mode ────────────────────────────────────────
    const generateSimplePreview = () => {
        if (activeFloor === null) return;
        const newErrors: Record<string, string> = {};
        const cnt = parseInt(simpleCount, 10);
        if (!simpleCount || !Number.isInteger(cnt) || cnt < 1) newErrors.simpleCount = 'Enter how many rooms are on this floor';
        if (!simpleTypeId) newErrors.simpleType = 'Select a room type';
        if (!simpleRent) newErrors.simpleRent = 'Enter the monthly rent';
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        const rows: PreviewRoom[] = [];
        for (let i = 1; i <= cnt; i++) {
            rows.push({
                id: genId(),
                room_number: `${activeFloor}${String(i).padStart(2, '0')}`,
                room_type_id: simpleTypeId,
                room_type_name: roomTypeName(simpleTypeId),
                capacity: extractCapacity(roomTypeName(simpleTypeId)),
                rent_per_bed: simpleRent,
            });
        }
        setPreview(rows);
    };

    const generateMixedPreview = () => {
        if (activeFloor === null) return;
        const newErrors: Record<string, string> = {};
        const validGroups = mixedGroups.filter(g => g.room_type_id && g.rent_per_bed && g.count && parseInt(g.count, 10) > 0);
        if (validGroups.length === 0) newErrors.mixed = 'Add at least one room type with a count and rent';
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        const rows: PreviewRoom[] = [];
        let seq = 1;
        validGroups.forEach(g => {
            const cnt = parseInt(g.count, 10);
            for (let i = 0; i < cnt; i++) {
                rows.push({
                    id: genId(),
                    room_number: `${activeFloor}${String(seq).padStart(2, '0')}`,
                    room_type_id: g.room_type_id,
                    room_type_name: roomTypeName(g.room_type_id),
                    capacity: extractCapacity(roomTypeName(g.room_type_id)),
                    rent_per_bed: g.rent_per_bed,
                });
                seq++;
            }
        });
        setPreview(rows);
    };

    const generateNestedPreview = () => {
        if (activeFloor === null) return;
        const newErrors: Record<string, string> = {};
        const mainRooms = parseInt(mainCount, 10);
        if (!mainCount || !Number.isInteger(mainRooms) || mainRooms < 1) newErrors.mainCount = 'Enter how many main rooms are on this floor';
        const validRows = patternRows.filter(r => r.room_type_id && r.rent_per_bed);
        if (validRows.length === 0) newErrors.pattern = 'Add at least one sub-room type with a rent amount';
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        const rows: PreviewRoom[] = [];
        for (let m = 1; m <= mainRooms; m++) {
            const mainRoomNumber = `${activeFloor}${String(m).padStart(2, '0')}`;
            validRows.forEach((row, idx) => {
                const suffix = validRows.length > 1 ? `-${LETTERS[idx]}` : '';
                rows.push({
                    id: genId(),
                    room_number: `${mainRoomNumber}${suffix}`,
                    room_type_id: row.room_type_id,
                    room_type_name: roomTypeName(row.room_type_id),
                    capacity: extractCapacity(roomTypeName(row.room_type_id)),
                    rent_per_bed: row.rent_per_bed,
                    main_group: mainRoomNumber,
                });
            });
        }
        setPreview(rows);
    };

    const updatePreviewRow = (id: string, patch: Partial<PreviewRoom>) => {
        setPreview(prev => (prev ? prev.map(r => (r.id === id ? { ...r, ...patch } : r)) : prev));
    };

    const removePreviewRow = (id: string) => {
        setPreview(prev => (prev ? prev.filter(r => r.id !== id) : prev));
    };

    const groupedPreview = useMemo(() => {
        if (mode !== 'nested' || !preview) return null;
        const map = new Map<string, PreviewRoom[]>();
        preview.forEach(r => {
            const key = r.main_group || r.room_number;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(r);
        });
        return Array.from(map.values());
    }, [mode, preview]);

    // ── Submit (lock the floor) ──────────────────────────────────────────────────
    const initiateSubmit = () => {
        if (!preview || preview.length === 0 || activeFloor === null) return;
        setConfirmModalVisible(true);
    };

    const handleSubmit = async () => {
        setConfirmModalVisible(false);
        if (!preview || preview.length === 0 || activeFloor === null) return;

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
                floor_number: activeFloor,
                rooms: preview.map(p => ({
                    room_number: p.room_number.trim(),
                    room_type_id: parseInt(p.room_type_id) || null,
                    capacity: parseInt(p.capacity) || 4,
                    rent_per_bed: parseFloat(p.rent_per_bed) || 0,
                })),
            };
            const response = await api.post('/rooms/bulk', payload);
            if (response.status === 201) {
                Toast.show({ type: 'success', text1: 'Floor locked', text2: response.data?.message || `${preview.length} rooms created.` });
                triggerRefresh();
                setJustLocked({ floor: activeFloor, count: preview.length });
                await fetchExistingRooms();
                resetToOverview();
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

    const goToRoomsForFloor = (floor: number) => {
        navigation.navigate('Rooms', { floorFilter: floor });
    };

    const startManualFloor = () => {
        const f = parseInt(manualFloorInput, 10);
        if (!Number.isInteger(f) || f < 1) {
            Toast.show({ type: 'error', text1: 'Enter a valid floor number' });
            return;
        }
        setManualFloorInput('');
        startFloor(f);
    };

    // ── Render helpers ───────────────────────────────────────────────────────────
    const cardBg = theme.cardBg;
    const borderCol = isDark ? '#334155' : '#E8EAF6';
    const inputBg = isDark ? '#1E1B4B' : '#F5F3FF';

    const renderOverview = () => (
        <>
            {justLocked && (
                <View style={[styles.doneBanner, { backgroundColor: isDark ? '#052E1A' : '#ECFDF5', borderColor: '#10B981', flexDirection: 'column', alignItems: 'stretch' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <CheckCircle2 size={20} color="#10B981" />
                            <Text style={[styles.doneBannerText, { color: isDark ? '#A7F3D0' : '#065F46', flex: 1, fontWeight: '700' }]}>
                                Floor {justLocked.floor} saved! ({justLocked.count} rooms created)
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setJustLocked(null)} hitSlop={8} style={{ padding: 4 }}>
                            <X size={16} color={isDark ? '#A7F3D0' : '#065F46'} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ marginTop: 10 }}>
                        <TouchableOpacity
                            style={{
                                width: '100%',
                                backgroundColor: '#10B981',
                                paddingVertical: 10,
                                borderRadius: 10,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onPress={() => navigation.navigate('Rooms')}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                                View Rooms List ➔
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <Text style={[styles.overviewIntro, { color: theme.textSecondary }]}>
                Tap a floor to build its rooms. Once you lock a floor its rooms are created — tap it again anytime to view or edit them.
            </Text>

            {floorList.length === 0 && !loadingRooms && (
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                        No floor count set for this PG yet. Enter a floor number below to start.
                    </Text>
                </View>
            )}

            {floorList.map(floor => {
                const summary = floorSummaryMap.get(floor);
                const isLocked = !!summary && summary.count > 0;
                return (
                    <View
                        key={floor}
                        style={[
                            styles.floorCard,
                            { backgroundColor: cardBg, borderColor: isLocked ? '#10B981' : borderCol },
                            isLocked && { backgroundColor: isDark ? '#062A1C' : '#F3FCF8' },
                        ]}
                    >
                        <View style={[styles.floorBadge, isLocked && { backgroundColor: isDark ? '#0B4B31' : '#D6F5E7' }]}>
                            <Text style={[styles.floorBadgeText, isLocked && { color: '#0E9F6E' }]}>F{floor}</Text>
                        </View>
                        <View style={styles.floorInfo}>
                            <Text style={[styles.floorName, { color: theme.textPrimary }]}>Floor {floor}</Text>
                            {isLocked ? (
                                <Text style={[styles.floorMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                                    {summary!.count} rooms
                                    {summary!.typeNames.length > 0 ? ` · ${summary!.typeNames.slice(0, 2).join(', ')}` : ''}
                                </Text>
                            ) : (
                                <Text style={[styles.floorMeta, { color: theme.textSecondary }]}>Not set up yet</Text>
                            )}
                        </View>
                        {isLocked ? (
                            <TouchableOpacity style={styles.lockPill} onPress={() => goToRoomsForFloor(floor)} activeOpacity={0.75}>
                                <Lock size={11} color="#0E9F6E" />
                                <Text style={styles.lockPillText}>View</Text>
                                <Pencil size={11} color="#0E9F6E" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.addPill} onPress={() => startFloor(floor)} activeOpacity={0.75}>
                                <Plus size={12} color="#6C3ACD" />
                                <Text style={styles.addPillText}>Set Up</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })}

            {!hostelFloorLimit && (
                <View style={[styles.card, { backgroundColor: cardBg, marginTop: 4 }]}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Add a floor to set up</Text>
                    <View style={styles.manualRow}>
                        <View style={[styles.inputBox, { flex: 1, backgroundColor: inputBg, borderColor: borderCol, marginBottom: 0 }]}>
                            <TextInput
                                style={[styles.inputText, { color: theme.textPrimary }]}
                                placeholder="Floor number, e.g. 3"
                                placeholderTextColor="#94A3B8"
                                keyboardType="numeric"
                                value={manualFloorInput}
                                onChangeText={setManualFloorInput}
                            />
                        </View>
                        <TouchableOpacity style={styles.manualBtn} onPress={startManualFloor} activeOpacity={0.85}>
                            <Text style={styles.manualBtnText}>Start</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Bottom Actions: Easy exit to Rooms List or Dashboard */}
            <View style={{ marginTop: 18, marginBottom: 24, gap: 10 }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: '#7C3AED',
                        paddingVertical: 14,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 8,
                        shadowColor: '#7C3AED',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        elevation: 4,
                    }}
                    onPress={() => navigation.navigate('Rooms')}
                    activeOpacity={0.85}
                >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                        Done For Now ➔ Go to Rooms List
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderWidth: 1.5,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        paddingVertical: 12,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onPress={() => navigation.navigate('Main')}
                    activeOpacity={0.85}
                >
                    <Text style={{ color: isDark ? '#CBD5E1' : '#475569', fontWeight: '700', fontSize: 14 }}>
                        Back to Dashboard
                    </Text>
                </TouchableOpacity>
            </View>
        </>
    );

    const renderBackRow = (label: string, onPress: () => void) => (
        <TouchableOpacity style={styles.backRow} onPress={onPress} activeOpacity={0.7}>
            <ChevronLeft size={16} color="#6C3ACD" />
            <Text style={styles.backRowText}>{label}</Text>
        </TouchableOpacity>
    );

    const renderModeChoice = () => (
        <>
            {renderBackRow('All Floors', resetToOverview)}
            <Text style={[styles.stepHeading, { color: theme.textPrimary }]}>Floor {activeFloor} — how is it arranged?</Text>
            <Text style={[styles.stepSub, { color: theme.textSecondary }]}>This decides what we ask you next.</Text>

            {(Object.keys(MODE_INFO) as Mode[]).map(key => {
                const info = MODE_INFO[key];
                const Icon = info.Icon;
                return (
                    <TouchableOpacity
                        key={key}
                        style={[styles.choiceCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                        activeOpacity={0.8}
                        onPress={() => setMode(key)}
                    >
                        <View style={styles.choiceRow}>
                            <View style={[styles.choiceIcon, { backgroundColor: info.wash }]}>
                                <Icon size={16} color={info.tint} />
                            </View>
                            <Text style={[styles.choiceTitle, { color: theme.textPrimary }]}>{info.title}</Text>
                        </View>
                        <Text style={[styles.choiceDesc, { color: theme.textSecondary }]}>{info.desc}</Text>
                        <Text style={[styles.choiceExample, { color: info.tint }]}>{info.example}</Text>
                    </TouchableOpacity>
                );
            })}
        </>
    );

    const renderTypeSelect = (value: string, onPress: () => void) => (
        <TouchableOpacity style={[styles.selectBox, { backgroundColor: inputBg, borderColor: borderCol }]} onPress={onPress} activeOpacity={0.7}>
            <Text style={[styles.inputText, { color: value ? theme.textPrimary : '#94A3B8', flex: 1 }]} numberOfLines={1}>
                {value ? roomTypeName(value) : 'Room Type'}
            </Text>
            <ChevronDown size={16} color="#94A3B8" />
        </TouchableOpacity>
    );

    const renderSimpleForm = () => (
        <>
            {renderBackRow('Change Type', () => setMode(null))}
            <Text style={[styles.stepHeading, { color: theme.textPrimary }]}>Floor {activeFloor} — Simple Rooms</Text>

            <View style={[styles.card, { backgroundColor: cardBg }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>How many rooms on this floor?</Text>
                <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor: errors.simpleCount ? '#EF4444' : borderCol }]}>
                    <TextInput
                        style={[styles.inputText, { color: theme.textPrimary }]}
                        placeholder="e.g. 10"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={simpleCount}
                        onChangeText={setSimpleCount}
                    />
                </View>
                {errors.simpleCount && <Text style={styles.errorText}>{errors.simpleCount}</Text>}

                <Text style={[styles.label, { color: theme.textSecondary }]}>Room Type</Text>
                {renderTypeSelect(simpleTypeId, () => setTypeModalTarget({ kind: 'simple' }))}
                {errors.simpleType && <Text style={styles.errorText}>{errors.simpleType}</Text>}

                <Text style={[styles.label, { color: theme.textSecondary }]}>Monthly Rent (per bed)</Text>
                <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor: errors.simpleRent ? '#EF4444' : borderCol, marginBottom: 0 }]}>
                    <IndianRupee size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                    <TextInput
                        style={[styles.inputText, { color: theme.textPrimary }]}
                        placeholder="Enter amount"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={simpleRent}
                        onChangeText={setSimpleRent}
                    />
                </View>
                {errors.simpleRent && <Text style={styles.errorText}>{errors.simpleRent}</Text>}
            </View>

            <TouchableOpacity style={[styles.generateBtn, { backgroundColor: '#6C3ACD' }]} onPress={generateSimplePreview} activeOpacity={0.85}>
                <Text style={styles.generateBtnText}>Preview Rooms</Text>
            </TouchableOpacity>
        </>
    );

    const renderMixedForm = () => (
        <>
            {renderBackRow('Change Type', () => setMode(null))}
            <Text style={[styles.stepHeading, { color: theme.textPrimary }]}>Floor {activeFloor} — Mixed Room Types</Text>
            <Text style={[styles.stepSub, { color: theme.textSecondary }]}>Add each room type on this floor with how many there are.</Text>

            <View style={[styles.card, { backgroundColor: cardBg }]}>
                {mixedGroups.map((g, idx) => (
                    <View key={g.id} style={styles.mixedRow}>
                        <View style={[styles.patternLetter, { backgroundColor: isDark ? '#334155' : '#FFF1DE' }]}>
                            <Text style={{ color: '#B45309', fontWeight: '800', fontSize: 12 }}>{idx + 1}</Text>
                        </View>
                        {renderTypeSelect(g.room_type_id, () => setTypeModalTarget({ kind: 'mixed', rowId: g.id }))}
                        <View style={[styles.countBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
                            <TextInput
                                style={[styles.inputText, { color: theme.textPrimary, fontSize: 13, textAlign: 'center' }]}
                                placeholder="Qty"
                                placeholderTextColor="#94A3B8"
                                keyboardType="numeric"
                                value={g.count}
                                onChangeText={text => updateMixedGroup(g.id, { count: text })}
                            />
                        </View>
                        <View style={[styles.rentBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
                            <IndianRupee size={12} color="#94A3B8" />
                            <TextInput
                                style={[styles.inputText, { color: theme.textPrimary, fontSize: 12 }]}
                                placeholder="Rent"
                                placeholderTextColor="#94A3B8"
                                keyboardType="numeric"
                                value={g.rent_per_bed}
                                onChangeText={text => updateMixedGroup(g.id, { rent_per_bed: text })}
                            />
                        </View>
                        {mixedGroups.length > 1 && (
                            <TouchableOpacity onPress={() => removeMixedGroup(g.id)} style={styles.removeBtn}>
                                <Trash2 size={16} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                ))}

                {errors.mixed && <Text style={styles.errorText}>{errors.mixed}</Text>}

                <TouchableOpacity style={styles.addRowBtn} onPress={addMixedGroup} activeOpacity={0.7}>
                    <Plus size={14} color="#6C3ACD" />
                    <Text style={styles.addRowText}>Add Room Type</Text>
                </TouchableOpacity>

                {mixedTotal > 0 && (
                    <View style={styles.mathNote}>
                        <Text style={styles.mathNoteText}>= {mixedTotal} rooms total on Floor {activeFloor}</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity style={[styles.generateBtn, { backgroundColor: '#6C3ACD' }]} onPress={generateMixedPreview} activeOpacity={0.85}>
                <Text style={styles.generateBtnText}>Preview Rooms</Text>
            </TouchableOpacity>
        </>
    );

    const renderNestedForm = () => (
        <>
            {renderBackRow('Change Type', () => setMode(null))}
            <Text style={[styles.stepHeading, { color: theme.textPrimary }]}>Floor {activeFloor} — Rooms with Sub-Rooms</Text>
            <Text style={[styles.stepSub, { color: theme.textSecondary }]}>e.g. a 3BHK-style floor: main rooms that each split into bedrooms or shares.</Text>

            <View style={[styles.card, { backgroundColor: cardBg }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>How many main rooms on this floor?</Text>
                <View style={[styles.inputBox, { backgroundColor: inputBg, borderColor: errors.mainCount ? '#EF4444' : borderCol }]}>
                    <TextInput
                        style={[styles.inputText, { color: theme.textPrimary }]}
                        placeholder="e.g. 7"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={mainCount}
                        onChangeText={setMainCount}
                    />
                </View>
                {errors.mainCount && <Text style={styles.errorText}>{errors.mainCount}</Text>}

                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 2 }]}>What's inside each main room?</Text>
                {patternRows.map((row, idx) => (
                    <View key={row.id} style={styles.mixedRow}>
                        <View style={[styles.patternLetter, { backgroundColor: isDark ? '#334155' : '#EDE9FE' }]}>
                            <Text style={{ color: '#6C3ACD', fontWeight: '800', fontSize: 12 }}>
                                {patternRows.length > 1 ? LETTERS[idx] : '—'}
                            </Text>
                        </View>
                        {renderTypeSelect(row.room_type_id, () => setTypeModalTarget({ kind: 'nested', rowId: row.id }))}
                        <View style={[styles.rentBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
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
                    <Plus size={14} color="#6C3ACD" />
                    <Text style={styles.addRowText}>Add Sub-Room Type</Text>
                </TouchableOpacity>

                {mainCount && patternRows.some(r => r.room_type_id) && (
                    <View style={styles.mathNote}>
                        <Text style={styles.mathNoteText}>
                            {parseInt(mainCount, 10) || 0} main rooms × {patternRows.filter(r => r.room_type_id).length} sub-rooms = {(parseInt(mainCount, 10) || 0) * patternRows.filter(r => r.room_type_id).length} rooms total
                        </Text>
                    </View>
                )}
            </View>

            <TouchableOpacity style={[styles.generateBtn, { backgroundColor: '#6C3ACD' }]} onPress={generateNestedPreview} activeOpacity={0.85}>
                <Text style={styles.generateBtnText}>Preview Rooms</Text>
            </TouchableOpacity>
        </>
    );

    const previewSummary = useMemo(() => {
        if (!preview) return null;
        let totalRent = 0;
        const counts: Record<string, number> = {};
        preview.forEach(r => {
            const type = r.room_type_name;
            const beds = parseInt(r.capacity, 10) || 0;
            const rent = parseFloat(r.rent_per_bed) || 0;
            totalRent += (beds * rent);
            counts[type] = (counts[type] || 0) + 1;
        });
        return {
            totalRent,
            types: Object.entries(counts).map(([name, count]) => ({ name, count }))
        };
    }, [preview]);

    const renderPreview = () => (
        <>
            {renderBackRow('Edit Numbers', () => setPreview(null))}
            <View style={styles.previewHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#EDE9FE' }]}>
                    <Layers size={18} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                        Blueprint — Floor {activeFloor}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                        <Text style={{ fontWeight: '800', color: isDark ? '#C4B5FD' : '#6C3ACD' }}>
                            {preview?.length} Rooms
                        </Text>
                        {' · Tap to edit numbers or rent'}
                    </Text>
                </View>
            </View>

            {previewSummary && (
                <View style={styles.summaryScroll}>
                    {previewSummary.types.map(t => (
                        <View key={t.name} style={[styles.summaryPill, { backgroundColor: isDark ? '#1E293B' : '#EDE9FE' }]}>
                            <Text style={[styles.summaryPillText, { color: isDark ? '#C4B5FD' : '#6C3ACD' }]}>{t.count} × {t.name}</Text>
                        </View>
                    ))}
                    {previewSummary.totalRent > 0 && (
                        <View style={[styles.summaryPill, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
                            <Text style={[styles.summaryPillText, { color: isDark ? '#34D399' : '#065F46' }]}>
                                Total Expected Rent: ₹{previewSummary.totalRent.toLocaleString('en-IN')}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.blueprintGrid}>
                {mode === 'nested' && groupedPreview
                    ? groupedPreview.map(group => (
                        <View key={group[0].main_group} style={[styles.blueprintMainRoom, { borderColor: borderCol, backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
                            <Text style={[styles.blueprintMainRoomLabel, { color: theme.textSecondary }]}>
                                MAIN UNIT {group[0].main_group}
                            </Text>
                            <View style={styles.blueprintSubRoomsGrid}>
                                {group.map(row => (
                                    <View key={row.id} style={[styles.blueprintCard, { borderColor: borderCol, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                                        <View style={styles.blueprintCardHeader}>
                                            <View style={styles.blueprintRoomNumWrap}>
                                                <Text style={styles.blueprintRoomLabel}>ROOM NO.</Text>
                                                <View style={styles.blueprintEditableInput}>
                                                    <TextInput
                                                        style={[styles.blueprintRoomNum, { color: theme.textPrimary }]}
                                                        value={row.room_number}
                                                        onChangeText={text => updatePreviewRow(row.id, { room_number: text })}
                                                        keyboardType="default"
                                                    />
                                                </View>
                                            </View>
                                            <TouchableOpacity onPress={() => removePreviewRow(row.id)} style={styles.blueprintRemove}>
                                                <Trash2 size={14} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.blueprintCardBody}>
                                            <View style={styles.blueprintTypeWrap}>
                                                <Text style={styles.blueprintType} numberOfLines={1}>{row.room_type_name}</Text>
                                            </View>
                                            
                                            <View style={styles.blueprintRentSection}>
                                                <Text style={styles.blueprintRentLabel}>Monthly Rent / Bed</Text>
                                                <View style={styles.blueprintEditableInput}>
                                                    <IndianRupee size={12} color="#64748B" />
                                                    <TextInput
                                                        style={[styles.blueprintRent, { color: theme.textPrimary }]}
                                                        keyboardType="numeric"
                                                        value={row.rent_per_bed}
                                                        onChangeText={text => updatePreviewRow(row.id, { rent_per_bed: text })}
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))
                    : preview?.map(row => (
                        <View key={row.id} style={[styles.blueprintCard, { borderColor: borderCol, backgroundColor: cardBg }]}>
                            <View style={styles.blueprintCardHeader}>
                                <View style={styles.blueprintRoomNumWrap}>
                                    <Text style={styles.blueprintRoomLabel}>ROOM NO.</Text>
                                    <View style={styles.blueprintEditableInput}>
                                        <TextInput
                                            style={[styles.blueprintRoomNum, { color: theme.textPrimary }]}
                                            value={row.room_number}
                                            onChangeText={text => updatePreviewRow(row.id, { room_number: text })}
                                            keyboardType="default"
                                        />
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => removePreviewRow(row.id)} style={styles.blueprintRemove}>
                                    <Trash2 size={14} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.blueprintCardBody}>
                                <View style={styles.blueprintTypeWrap}>
                                    <Text style={styles.blueprintType} numberOfLines={1}>{row.room_type_name}</Text>
                                </View>
                                
                                <View style={styles.blueprintRentSection}>
                                    <Text style={styles.blueprintRentLabel}>Monthly Rent / Bed</Text>
                                    <View style={styles.blueprintEditableInput}>
                                        <IndianRupee size={12} color="#64748B" />
                                        <TextInput
                                            style={[styles.blueprintRent, { color: theme.textPrimary }]}
                                            keyboardType="numeric"
                                            value={row.rent_per_bed}
                                            onChangeText={text => updatePreviewRow(row.id, { rent_per_bed: text })}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
            </View>
        </>
    );

    const typeModalPickedId =
        typeModalTarget?.kind === 'simple'
            ? simpleTypeId
            : typeModalTarget?.kind === 'mixed'
                ? mixedGroups.find(g => g.id === typeModalTarget.rowId)?.room_type_id
                : typeModalTarget?.kind === 'nested'
                    ? patternRows.find(r => r.id === typeModalTarget.rowId)?.room_type_id
                    : undefined;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: isDark ? theme.background : '#F4F6FF' }]}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppHeader
                title="Set Up Rooms"
                subtitle={activeFloor === null ? 'One floor at a time' : `Floor ${activeFloor}`}
            />
            <FullScreenLoader visible={submitting} />

            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 16, paddingTop: 16 }}
                keyboardShouldPersistTaps="handled"
            >
                {activeFloor === null && renderOverview()}
                {activeFloor !== null && mode === null && renderModeChoice()}
                {activeFloor !== null && mode !== null && preview === null && mode === 'simple' && renderSimpleForm()}
                {activeFloor !== null && mode !== null && preview === null && mode === 'mixed' && renderMixedForm()}
                {activeFloor !== null && mode !== null && preview === null && mode === 'nested' && renderNestedForm()}
                {activeFloor !== null && preview && preview.length > 0 && renderPreview()}

                <View style={{ height: 8 }} />
            </ScrollView>

            {/* Sticky footer — only while reviewing a generated preview */}
            {activeFloor !== null && preview && preview.length > 0 && (
                <View style={[styles.footer, { backgroundColor: theme.cardBg, borderTopColor: isDark ? '#1E293B' : '#F1F5F9', paddingBottom: insets.bottom + 12 }]}>
                    <TouchableOpacity style={[styles.createBtn, { backgroundColor: '#0E9F6E', opacity: submitting ? 0.7 : 1 }]} onPress={initiateSubmit} disabled={submitting} activeOpacity={0.85}>
                        <Lock size={17} color="#FFF" />
                        <Text style={styles.createBtnText}>Confirm & Lock Floor {activeFloor}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Room Type Modal — shared by all three modes */}
            <ModalSheet
                visible={!!typeModalTarget}
                onClose={() => setTypeModalTarget(null)}
                maxHeight="60%"
            >
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Room Type</Text>
                    <TouchableOpacity onPress={() => setTypeModalTarget(null)} style={styles.doneBtn} activeOpacity={0.7}>
                        <Text style={styles.doneBtnText}>Done</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={roomTypes}
                    keyExtractor={item => item.room_type_id.toString()}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                        const selected = typeModalPickedId === item.room_type_id.toString();
                        return (
                            <TouchableOpacity
                                style={[styles.modalOption, selected && { backgroundColor: '#F5F3FF' }]}
                                onPress={() => {
                                    const id = item.room_type_id.toString();
                                    if (typeModalTarget?.kind === 'simple') setSimpleTypeId(id);
                                    else if (typeModalTarget?.kind === 'mixed') updateMixedGroup(typeModalTarget.rowId, { room_type_id: id });
                                    else if (typeModalTarget?.kind === 'nested') updatePatternRow(typeModalTarget.rowId, { room_type_id: id });
                                    setTypeModalTarget(null);
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
            </ModalSheet>

            <CustomAlertModal
                visible={confirmModalVisible}
                title="Lock Floor Configuration?"
                message={
                    <>
                        Are you sure you want to lock Floor {activeFloor} and create{' '}
                        <Text style={{ fontWeight: '900', color: isDark ? '#C4B5FD' : '#6C3ACD' }}>
                            {preview?.length || 0} rooms
                        </Text>
                        ? This action is not easily reversible.
                    </>
                }
                onClose={() => setConfirmModalVisible(false)}
                icon={Lock}
                primaryAction={{ label: 'Yes, Lock Floor', onPress: handleSubmit }}
                secondaryAction={{ label: 'Cancel', onPress: () => setConfirmModalVisible(false) }}
            />
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

    overviewIntro: { fontSize: 12.5, lineHeight: 18, marginBottom: 14 },

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

    // Floor overview cards
    floorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        borderRadius: 14,
        borderWidth: 1.3,
        padding: 12,
        marginBottom: 10,
    },
    floorBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#EDE9FE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    floorBadgeText: { fontWeight: '800', fontSize: 13, color: '#6C3ACD' },
    floorInfo: { flex: 1, minWidth: 0 },
    floorName: { fontWeight: '700', fontSize: 13.5 },
    floorMeta: { fontSize: 11, marginTop: 2, fontWeight: '500' },
    lockPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#DFF7EC',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 100,
    },
    lockPillText: { fontSize: 11, fontWeight: '800', color: '#0E9F6E' },
    addPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 100,
    },
    addPillText: { fontSize: 11.5, fontWeight: '800', color: '#6C3ACD' },

    manualRow: { flexDirection: 'row', gap: 10 },
    manualBtn: { height: 48, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#6C3ACD', alignItems: 'center', justifyContent: 'center' },
    manualBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

    // Back row / step heading
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 10, alignSelf: 'flex-start' },
    backRowText: { color: '#6C3ACD', fontWeight: '700', fontSize: 13 },
    stepHeading: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    stepSub: { fontSize: 12, marginBottom: 14, lineHeight: 17 },

    // Mode choice cards
    choiceCard: {
        borderWidth: 1.4,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    choiceIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    choiceTitle: { fontWeight: '800', fontSize: 13.5 },
    choiceDesc: { fontSize: 11.5, lineHeight: 16, marginLeft: 42 },
    choiceExample: { fontSize: 10.5, fontWeight: '700', marginTop: 5, marginLeft: 42 },

    row: { flexDirection: 'row', gap: 12 },
    halfCol: { flex: 1 },

    label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 2 },

    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        marginBottom: 14,
    },
    inputText: { flex: 1, fontSize: 14, fontWeight: '500' },
    errorText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '500',
        marginTop: -8,
        marginBottom: 10,
        marginLeft: 4,
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

    mixedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    patternLetter: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    countBox: { width: 46, height: 46, borderRadius: 10, borderWidth: 1, justifyContent: 'center' },
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
        marginBottom: 4,
    },
    addRowText: { color: '#7C3AED', fontSize: 13, fontWeight: '700' },

    mathNote: {
        marginTop: 10,
        backgroundColor: '#E3F5F2',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    mathNoteText: { color: '#0E8478', fontSize: 11.5, fontWeight: '700', textAlign: 'center' },

    generateBtn: {
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
    },
    generateBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

    // Blueprint Preview Styles
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    summaryScroll: {
        marginBottom: 18,
        paddingHorizontal: 4,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    summaryScrollContent: {
        gap: 8,
        alignItems: 'center',
    },
    summaryPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    summaryPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    blueprintGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 20,
        justifyContent: 'space-between',
    },
    blueprintCard: {
        width: '48%', 
        borderWidth: 1.5,
        borderRadius: 12,
        padding: 10,
        borderStyle: 'solid',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    blueprintCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(148, 163, 184, 0.2)',
        paddingBottom: 8,
        marginBottom: 8,
    },
    blueprintRoomNumWrap: {
        flex: 1,
    },
    blueprintRoomLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748B',
        marginBottom: 2,
    },
    blueprintEditableInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(124, 58, 237, 0.08)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: 'rgba(124, 58, 237, 0.2)',
        gap: 4,
        alignSelf: 'flex-start',
    },
    blueprintRoomNum: {
        width: 55,
        fontSize: 16,
        fontWeight: '800',
        padding: 0,
        margin: 0,
        includeFontPadding: false,
    },
    blueprintRemove: {
        padding: 6,
        backgroundColor: '#FEE2E2',
        borderRadius: 100,
        marginLeft: 4,
    },
    blueprintCardBody: {
        gap: 8,
    },
    blueprintTypeWrap: {
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    blueprintType: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        color: '#6C3ACD',
    },
    blueprintRentSection: {
        gap: 4,
    },
    blueprintRentLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#64748B',
    },
    blueprintRent: {
        width: 65,
        fontSize: 13,
        fontWeight: '700',
        padding: 0,
        margin: 0,
    },
    blueprintMainRoom: {
        width: '100%',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
    },
    blueprintMainRoomLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 10,
    },
    blueprintSubRoomsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
    },

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
    createBtnText: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },

    sheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        overflow: 'hidden',
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
