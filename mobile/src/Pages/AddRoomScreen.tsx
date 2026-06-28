import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Keyboard,
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
    LayoutGrid,
    Building2,
    DoorOpen,
    Users,
    BedDouble,
    IndianRupee,
    Star,
    Wifi,
    Bath,
    Wind,
    BookOpen,
    Armchair,
    Eye,
    Plus,
    RotateCcw,
    CheckCircle2,
    Layers,
} from 'lucide-react-native';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../theme/index';

// ── Amenity icon map ────────────────────────────────────────────────────────
const AMENITY_ICONS: Record<string, any> = {
    'AC': Wind,
    'Attached Bathroom': Bath,
    'WiFi': Wifi,
    'Balcony': Building2,
    'Window': Eye,
    'Cupboard': Layers,
    'Study Table': BookOpen,
    'Chair': Armchair,
};
const getAmenityIcon = (name: string) => AMENITY_ICONS[name] || Star;

const extractCapacity = (name: string): string => {
    const clean = name.toLowerCase();
    const match = clean.match(/(\d+)/);
    if (match) return match[1];
    if (clean.includes('single') || clean.includes('one')) return '1';
    if (clean.includes('double') || clean.includes('two')) return '2';
    if (clean.includes('triple') || clean.includes('three')) return '3';
    if (clean.includes('four')) return '4';
    if (clean.includes('five')) return '5';
    if (clean.includes('six')) return '6';
    return '';
};

export const AddRoomScreen = ({ navigation, route }: any) => {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { triggerRefresh } = useRefresh();
    const isEdit = route?.params?.isEdit || false;
    const roomToEdit = route?.params?.room || null;

    const [loading, setLoading] = useState(false);
    const [savingAmenity, setSavingAmenity] = useState(false);
    const [roomTypes, setRoomTypes] = useState<any[]>([]);
    // amenitiesList holds objects fetched from DB: { amenity_id?, amenity_name }
    const [amenitiesList, setAmenitiesList] = useState<any[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [typeModalVisible, setTypeModalVisible] = useState(false);
    const [customAmenityInput, setCustomAmenityInput] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [hostelFloorLimit, setHostelFloorLimit] = useState<number | null>(null);
    const insets = useSafeAreaInsets();
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { show.remove(); hide.remove(); };
    }, []);

    const initialFormState = {
        room_number: roomToEdit?.room_number?.toString() || '',
        floor_number: roomToEdit?.floor_number?.toString() || '',
        room_type_id: roomToEdit?.room_type_id?.toString() || '',
        capacity: roomToEdit?.total_capacity?.toString() || '',
        rent_per_bed: roomToEdit?.rent_per_bed?.toString() || '',
        occupied_beds: roomToEdit?.occupied_beds?.toString() || '0',
        selectedAmenities: roomToEdit?.amenities || [] as string[],
    };

    const [formData, setFormData] = useState(initialFormState);

    useFocusEffect(
        useCallback(() => {
            fetchRoomTypes();
            fetchAmenities();
            fetchHostelDetails();
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
                if (!isEdit && response.data.data.length > 0 && !formData.room_type_id) {
                    const fourShareType = response.data.data.find((t: any) =>
                        t.room_type_name.toLowerCase().includes('four') ||
                        t.room_type_name.toLowerCase().includes('4')
                    );
                    const defaultTypeId = fourShareType
                        ? fourShareType.room_type_id.toString()
                        : response.data.data[0].room_type_id.toString();
                    setFormData(prev => ({ ...prev, room_type_id: defaultTypeId }));
                }
            }
        } catch (error) {
            console.error('Error fetching room types:', error);
        }
    };

    // Load amenities from DB — these are the real saved ones.
    // Fallback defaults shown only if API fails completely.
    // On edit, also merge any selected amenities that aren't in the master list.
    const fetchAmenities = async () => {
        try {
            const response = await api.get('/amenities/rooms');
            const fetchedList = (response.data.success && response.data.data.length > 0)
                ? response.data.data
                : DEFAULT_AMENITIES;

            // Merge in any selected amenities that aren't already in the fetched list
            // (handles custom amenities saved to rooms but not in room_amenities_master)
            const currentSelected: string[] = roomToEdit?.amenities || [];
            const existingNames = new Set(fetchedList.map((a: any) => a.amenity_name));
            const extras = currentSelected
                .filter((name: string) => !existingNames.has(name))
                .map((name: string) => ({ amenity_name: name }));

            setAmenitiesList([...fetchedList, ...extras]);
        } catch (error) {
            console.error('Error fetching amenities:', error);
            // Even on error, still show any selected amenities for edit mode
            const currentSelected: string[] = roomToEdit?.amenities || [];
            const extras = currentSelected.map((name: string) => ({ amenity_name: name }));
            const merged = [...DEFAULT_AMENITIES];
            const existingNames = new Set(merged.map((a: any) => a.amenity_name));
            extras.forEach(e => { if (!existingNames.has(e.amenity_name)) merged.push(e); });
            setAmenitiesList(merged);
        }
    };

    const toggleAmenity = (name: string) => {
        setFormData(prev => {
            const exists = prev.selectedAmenities.includes(name);
            return {
                ...prev,
                selectedAmenities: exists
                    ? prev.selectedAmenities.filter((a: string) => a !== name)
                    : [...prev.selectedAmenities, name],
            };
        });
    };

    // Save custom amenity to DB so it appears in future room creations
    const addCustomAmenity = async () => {
        const trimmed = customAmenityInput.trim();
        if (!trimmed) return;

        // Already exists in list
        const alreadyExists = amenitiesList.find(
            a => a.amenity_name.toLowerCase() === trimmed.toLowerCase()
        );
        if (alreadyExists) {
            // Just select it
            setFormData(prev => ({
                ...prev,
                selectedAmenities: prev.selectedAmenities.includes(alreadyExists.amenity_name)
                    ? prev.selectedAmenities
                    : [...prev.selectedAmenities, alreadyExists.amenity_name],
            }));
            setCustomAmenityInput('');
            setShowCustomInput(false);
            return;
        }

        setSavingAmenity(true);
        try {
            // POST to room_amenities_master table
            const response = await api.post('/amenities/rooms', { amenity_name: trimmed });
            const saved = response.data?.data || { amenity_name: trimmed };
            setAmenitiesList(prev => [...prev, saved]);
            setFormData(prev => ({
                ...prev,
                selectedAmenities: [...prev.selectedAmenities, saved.amenity_name],
            }));
            Toast.show({ type: 'success', text1: 'Amenity Saved', text2: `"${trimmed}" added to your amenities list.` });
        } catch (error) {
            // API doesn't support saving — add locally for this room only
            console.warn('Could not save amenity to DB, adding locally only');
            setAmenitiesList(prev => [...prev, { amenity_name: trimmed }]);
            setFormData(prev => ({
                ...prev,
                selectedAmenities: [...prev.selectedAmenities, trimmed],
            }));
            Toast.show({
                type: 'info',
                text1: 'Added for this room',
                text2: `"${trimmed}" added but not saved to the global list.`,
            });
        } finally {
            setSavingAmenity(false);
            setCustomAmenityInput('');
            setShowCustomInput(false);
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.room_number) newErrors.room_number = 'Room number is required';
        if (!formData.floor_number) {
            newErrors.floor_number = 'Floor number is required';
        } else {
            const floorNumber = Number(formData.floor_number);
            if (!Number.isInteger(floorNumber) || floorNumber < 1) {
                newErrors.floor_number = 'Floor number must be a positive whole number';
            } else if (hostelFloorLimit !== null && floorNumber > hostelFloorLimit) {
                newErrors.floor_number = `Floor number cannot be greater than ${hostelFloorLimit}`;
            }
        }
        if (!formData.capacity) newErrors.capacity = 'Capacity is required';
        if (!formData.rent_per_bed) newErrors.rent_per_bed = 'Rent is required';
        if (!formData.room_type_id) newErrors.room_type_id = 'Room type is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleReset = () => {
        setFormData({
            ...initialFormState,
            room_type_id: roomTypes.length > 0 ? roomTypes[0].room_type_id.toString() : '',
        });
        setErrors({});
        setShowCustomInput(false);
        setCustomAmenityInput('');
    };

    const handleSave = async () => {
        if (!validate()) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please complete the highlighted fields before saving.',
            });
            return;
        }
        setLoading(true);
        try {
            const payload = {
                hostel_id: user?.hostel_id,
                room_number: formData.room_number,
                room_type_id: parseInt(formData.room_type_id) || null,
                floor_number: parseInt(formData.floor_number) || null,
                capacity: parseInt(formData.capacity) || 4,
                rent_per_bed: parseFloat(formData.rent_per_bed) || 0,
                occupied_beds: formData.occupied_beds ? parseInt(formData.occupied_beds) : 0,
                amenities: formData.selectedAmenities,
            };
            const response = isEdit
                ? await api.put(`/rooms/${roomToEdit.room_id}`, payload)
                : await api.post('/rooms', payload);
            if (response.status === 201 || response.status === 200) {
                Toast.show({ type: 'success', text1: 'Success', text2: `Room ${isEdit ? 'updated' : 'added'} successfully!` });
                triggerRefresh();
                navigation.goBack();
            }
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.error || 'Failed to save room' });
        } finally {
            setLoading(false);
        }
    };

    const selectedRoomType = roomTypes.find(t => t.room_type_id.toString() === formData.room_type_id);

    // ── Summary values ───────────────────────────────────────────────────────
    const summaryType = selectedRoomType?.room_type_name || '—';
    const summaryBeds = formData.capacity || '—';
    const summaryRent = formData.rent_per_bed || '—';
    const summaryOccupied = formData.occupied_beds || '—';

    // ── Shared footer buttons ────────────────────────────────────────────────
    const FooterButtons = ({ pb = 12 }: { pb?: number }) => (
        <View style={[styles.footer, {
            backgroundColor: theme.cardBg,
            borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
            paddingBottom: pb,
        }]}>
            <TouchableOpacity
                style={[styles.resetBtn, { borderColor: isDark ? '#334155' : '#CBD5E1', backgroundColor: isDark ? theme.background : '#FFF' }]}
                onPress={handleReset}
                activeOpacity={0.7}
                disabled={loading}
            >
                <RotateCcw size={15} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text style={[styles.resetBtnText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: '#6C3ACD', opacity: loading ? 0.7 : 1 }]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.85}
            >
                <CheckCircle2 size={18} color="#FFF" />
                <Text style={styles.createBtnText}>{isEdit ? 'Update Room' : 'Create Room'}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: isDark ? theme.background : '#F4F6FF' }]}
            keyboardVerticalOffset={0}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppHeader
                title={isEdit ? 'Edit Room' : 'Add New Room'}
                subtitle="Add the room details and amenities"
            />
            <FullScreenLoader visible={loading} />

            <ScrollView
                ref={scrollViewRef}
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingBottom: isKeyboardVisible ? 220 : 120,
                    paddingHorizontal: 16,
                    paddingTop: 16,
                }}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Room Details Card ───────────────────────────────── */}
                <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIconWrap, { backgroundColor: '#EDE9FE' }]}>
                            <BedDouble size={18} color="#7C3AED" />
                        </View>
                        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Room Details</Text>
                    </View>

                    {/* Floor Number + Room Number (side by side) */}
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>
                                Floor Number <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={[styles.inputBox, {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: errors.floor_number ? '#EF4444' : (isDark ? '#334155' : '#E8EAF6'),
                            }]}>
                                <Layers size={16} color={errors.floor_number ? '#EF4444' : '#94A3B8'} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.inputText, { color: theme.textPrimary }]}
                                    placeholder="e.g. 1"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                    value={formData.floor_number}
                                    onChangeText={text => {
                                        setFormData(p => ({ ...p, floor_number: text }));
                                        if (errors.floor_number) setErrors(e => { const n = { ...e }; delete n.floor_number; return n; });
                                    }}
                                />
                            </View>
                            {errors.floor_number && <Text style={styles.errorText}>{errors.floor_number}</Text>}
                        </View>

                        <View style={styles.halfCol}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>
                                Room Number <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={[styles.inputBox, {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: errors.room_number ? '#EF4444' : (isDark ? '#334155' : '#E8EAF6'),
                            }]}>
                                <DoorOpen size={16} color={errors.room_number ? '#EF4444' : '#94A3B8'} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.inputText, { color: theme.textPrimary }]}
                                    placeholder="e.g. 101"
                                    placeholderTextColor="#94A3B8"
                                    value={formData.room_number}
                                    onChangeText={text => {
                                        setFormData(p => ({ ...p, room_number: text }));
                                        if (errors.room_number) setErrors(e => { const n = { ...e }; delete n.room_number; return n; });
                                    }}
                                />
                            </View>
                            {errors.room_number && <Text style={styles.errorText}>{errors.room_number}</Text>}
                        </View>
                    </View>

                    {/* Room Type */}
                    <Text style={[styles.label, { color: theme.textSecondary, marginTop: 2 }]}>
                        Room Type <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                        style={[styles.selectBox, {
                            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                            borderColor: errors.room_type_id ? '#EF4444' : (isDark ? '#334155' : '#E8EAF6'),
                        }]}
                        onPress={() => setTypeModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.selectLeft}>
                            <BedDouble size={16} color={errors.room_type_id ? '#EF4444' : '#7C3AED'} style={styles.inputIcon} />
                            <Text style={[styles.inputText, { color: selectedRoomType ? theme.textPrimary : '#94A3B8' }]}>
                                {selectedRoomType?.room_type_name || 'Select Room Type'}
                            </Text>
                        </View>
                        <ChevronDown size={18} color="#94A3B8" />
                    </TouchableOpacity>
                    {errors.room_type_id && <Text style={[styles.errorText, { marginBottom: 10 }]}>{errors.room_type_id}</Text>}

                    {/* Total Capacity + Occupied Beds (side by side) */}
                    <View style={[styles.row, { marginTop: 2 }]}>
                        <View style={styles.halfCol}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>
                                Total Capacity <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={[styles.inputBox, {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: errors.capacity ? '#EF4444' : (isDark ? '#334155' : '#E8EAF6'),
                            }]}>
                                <Users size={16} color={errors.capacity ? '#EF4444' : '#94A3B8'} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.inputText, { color: theme.textPrimary }]}
                                    placeholder="Total beds"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                    value={formData.capacity}
                                    onChangeText={text => {
                                        setFormData(p => ({ ...p, capacity: text }));
                                        if (errors.capacity) setErrors(e => { const n = { ...e }; delete n.capacity; return n; });
                                    }}
                                />
                            </View>
                            {errors.capacity && <Text style={styles.errorText}>{errors.capacity}</Text>}
                        </View>

                        <View style={styles.halfCol}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>Occupied Beds</Text>
                            <View style={[styles.inputBox, {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: isDark ? '#334155' : '#E8EAF6',
                            }]}>
                                <BedDouble size={16} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.inputText, { color: theme.textPrimary }]}
                                    placeholder="0"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                    value={formData.occupied_beds}
                                    onChangeText={text => setFormData(p => ({ ...p, occupied_beds: text }))}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Monthly Rent */}
                    <Text style={[styles.label, { color: theme.textSecondary, marginTop: 2 }]}>
                        Monthly Rent (per bed) <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={[styles.inputBox, {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: errors.rent_per_bed ? '#EF4444' : (isDark ? '#334155' : '#E8EAF6'),
                    }]}>
                        <IndianRupee size={16} color={errors.rent_per_bed ? '#EF4444' : '#94A3B8'} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.inputText, { color: theme.textPrimary }]}
                            placeholder="Enter amount in ₹"
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            value={formData.rent_per_bed}
                            onChangeText={text => {
                                setFormData(p => ({ ...p, rent_per_bed: text }));
                                if (errors.rent_per_bed) setErrors(e => { const n = { ...e }; delete n.rent_per_bed; return n; });
                            }}
                            onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200)}
                        />
                    </View>
                    {errors.rent_per_bed && <Text style={styles.errorText}>{errors.rent_per_bed}</Text>}
                </View>

                {/* ── Amenities Card ──────────────────────────────────── */}
                <View style={[styles.card, { backgroundColor: theme.cardBg, marginTop: 16 }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIconWrap, { backgroundColor: '#FFF7ED' }]}>
                            <Star size={18} color="#F59E0B" />
                        </View>
                        <View>
                            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Amenities</Text>
                            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Select all that apply</Text>
                        </View>
                    </View>

                    <View style={styles.amenitiesGrid}>
                        {amenitiesList.map((amenity, index) => {
                            const isActive = formData.selectedAmenities.includes(amenity.amenity_name);
                            const Icon = getAmenityIcon(amenity.amenity_name);
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.amenityItem,
                                        {
                                            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                            borderColor: isActive ? '#7C3AED' : (isDark ? '#334155' : '#E8EAF6'),
                                            borderWidth: isActive ? 1.5 : 1,
                                        }
                                    ]}
                                    onPress={() => toggleAmenity(amenity.amenity_name)}
                                    activeOpacity={0.7}
                                >
                                    <Icon size={15} color={isActive ? '#7C3AED' : (isDark ? '#64748B' : '#94A3B8')} />
                                    <Text
                                        style={[styles.amenityName, { color: isActive ? '#7C3AED' : theme.textSecondary }]}
                                        numberOfLines={1}
                                    >
                                        {amenity.amenity_name}
                                    </Text>
                                    <View style={[
                                        styles.checkbox,
                                        {
                                            backgroundColor: isActive ? '#7C3AED' : 'transparent',
                                            borderColor: isActive ? '#7C3AED' : (isDark ? '#475569' : '#CBD5E1'),
                                        }
                                    ]}>
                                        {isActive && <Check size={10} color="#FFF" strokeWidth={3} />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Add Custom button */}
                        {!showCustomInput && (
                            <TouchableOpacity
                                style={[styles.addCustomBtn, { borderColor: '#7C3AED' }]}
                                onPress={() => setShowCustomInput(true)}
                                activeOpacity={0.7}
                            >
                                <Plus size={14} color="#7C3AED" />
                                <Text style={styles.addCustomText}>Add Custom</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Custom amenity input */}
                    {showCustomInput && (
                        <View style={[styles.customInputRow, {
                            borderColor: isDark ? '#334155' : '#E8EAF6',
                            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        }]}>
                            <TextInput
                                style={[styles.customInput, { color: theme.textPrimary }]}
                                placeholder="Enter amenity name..."
                                placeholderTextColor="#94A3B8"
                                value={customAmenityInput}
                                onChangeText={setCustomAmenityInput}
                                autoFocus
                                onSubmitEditing={addCustomAmenity}
                                editable={!savingAmenity}
                            />
                            <TouchableOpacity
                                onPress={addCustomAmenity}
                                style={[styles.addCustomConfirm, { backgroundColor: '#7C3AED', opacity: savingAmenity ? 0.6 : 1 }]}
                                activeOpacity={0.8}
                                disabled={savingAmenity}
                            >
                                <Check size={14} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => { setShowCustomInput(false); setCustomAmenityInput(''); }}
                                activeOpacity={0.7}
                                style={{ marginLeft: 8 }}
                                disabled={savingAmenity}
                            >
                                <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ── Room Summary Card ───────────────────────────────── */}
                <View style={[styles.card, { backgroundColor: theme.cardBg, marginTop: 16 }]}>
                    <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrap, { backgroundColor: '#EDE9FE' }]}>
                                <LayoutGrid size={18} color="#7C3AED" />
                            </View>
                            <View>
                                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Room Summary</Text>
                                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Quick overview of the room</Text>
                            </View>
                        </View>
                        <Eye size={18} color={isDark ? '#64748B' : '#94A3B8'} />
                    </View>

                    <View style={[styles.summaryRow, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <View style={styles.summaryItem}>
                            <LayoutGrid size={14} color="#7C3AED" />
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Room Type</Text>
                            <Text style={[styles.summaryValue, { color: theme.textPrimary }]} numberOfLines={1}>{summaryType}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <BedDouble size={14} color="#7C3AED" />
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Beds</Text>
                            <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>{summaryBeds}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <IndianRupee size={14} color="#7C3AED" />
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Monthly Rent</Text>
                            <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>{summaryRent}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Users size={14} color="#7C3AED" />
                            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Occupied Beds</Text>
                            <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>{summaryOccupied}</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 8 }} />
            </ScrollView>

            {/* ── Sticky Footer ───────────────────────────────────────── */}
            <FooterButtons pb={insets.bottom + 12} />

            {/* ── Room Type Modal ─────────────────────────────────────── */}
            <Modal
                visible={typeModalVisible}
                transparent
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setTypeModalVisible(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypeModalVisible(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={e => e.stopPropagation()}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Room Type</Text>
                            <TouchableOpacity onPress={() => setTypeModalVisible(false)} style={styles.doneBtn} activeOpacity={0.7}>
                                <Text style={styles.doneBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={roomTypes}
                            keyExtractor={item => item.room_type_id.toString()}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const selected = formData.room_type_id === item.room_type_id.toString();
                                return (
                                    <TouchableOpacity
                                        style={[styles.modalOption, selected && { backgroundColor: '#F5F3FF' }]}
                                        onPress={() => {
                                            const autoCap = extractCapacity(item.room_type_name);
                                            setFormData(p => ({
                                                ...p,
                                                room_type_id: item.room_type_id.toString(),
                                                capacity: autoCap || p.capacity
                                            }));
                                            setTypeModalVisible(false);
                                            if (errors.room_type_id) setErrors(e => { const n = { ...e }; delete n.room_type_id; return n; });
                                            if (autoCap && errors.capacity) setErrors(e => { const n = { ...e }; delete n.capacity; return n; });
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

// ── Default fallback amenities (only used if API returns empty) ──────────────
const DEFAULT_AMENITIES = [
    { amenity_name: 'AC' },
    { amenity_name: 'Attached Bathroom' },
    { amenity_name: 'WiFi' },
    { amenity_name: 'Balcony' },
    { amenity_name: 'Window' },
    { amenity_name: 'Cupboard' },
    { amenity_name: 'Study Table' },
    { amenity_name: 'Chair' },
];

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },

    // Card
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

    // Row / Col
    row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
    halfCol: { flex: 1 },

    // Label
    label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
    required: { color: '#EF4444' },

    // Input Box
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        marginBottom: 14,
    },
    inputIcon: { marginRight: 8 },
    inputText: { flex: 1, fontSize: 14, fontWeight: '500' },
    errorText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '500',
        marginTop: -10,
        marginBottom: 10,
        marginLeft: 4,
    },

    // Select
    selectBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        marginBottom: 14,
    },
    selectLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },

    // Amenities
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    amenityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderRadius: 10,
        gap: 6,
        minWidth: '30%',
        flex: 1,
    },
    amenityName: { flex: 1, fontSize: 12, fontWeight: '600' },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addCustomBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        gap: 6,
        minWidth: '30%',
        flex: 1,
        justifyContent: 'center',
    },
    addCustomText: { color: '#7C3AED', fontSize: 12, fontWeight: '700' },
    customInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 46,
        marginTop: 10,
        gap: 8,
    },
    customInput: { flex: 1, fontSize: 14 },
    addCustomConfirm: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Summary
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        paddingTop: 14,
        marginTop: 4,
    },
    summaryItem: { alignItems: 'center', gap: 4, flex: 1 },
    summaryLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
    summaryValue: { fontSize: 12, fontWeight: '800', textAlign: 'center' },

    // Footer
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
    resetBtn: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    resetBtnText: { fontSize: 14, fontWeight: '700' },
    createBtn: {
        flex: 2.5,
        height: 50,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    createBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
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

export default AddRoomScreen;