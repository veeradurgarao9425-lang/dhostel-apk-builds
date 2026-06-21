import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';
import { Header } from '../components/Header';
import { InputField } from '../components/InputField';
import { Card } from '../components/Card';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Check, ChevronDown, Layers, LayoutGrid } from 'lucide-react-native';
import { Modal, FlatList, Keyboard } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../theme/index';

export const AddRoomScreen = ({ navigation, route }: any) => {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const isEdit = route?.params?.isEdit || false;
    const roomToEdit = route?.params?.room || null;
    const [loading, setLoading] = useState(false);
    const [roomTypes, setRoomTypes] = useState<any[]>([]);
    const [amenitiesList, setAmenitiesList] = useState<any[]>([]);
    const [hostelData, setHostelData] = useState<any>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});


    const [typeModalVisible, setTypeModalVisible] = useState(false);
    const insets = useSafeAreaInsets();
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const initialFormState = {
        room_number: roomToEdit?.room_number?.toString() || '',
        floor_number: roomToEdit?.floor_number?.toString() || '',
        room_type_id: roomToEdit?.room_type_id?.toString() || '',
        capacity: roomToEdit?.total_capacity?.toString() || '4',
        rent_per_bed: roomToEdit?.rent_per_bed?.toString() || '',
        occupied_beds: roomToEdit?.occupied_beds?.toString() || '',
        selectedAmenities: roomToEdit?.amenities || [] as string[],
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchRoomTypes();
        fetchAmenities();
        fetchHostelDetails();
    }, []);

    const fetchHostelDetails = async () => {
        if (!user?.hostel_id) return;
        try {
            const response = await api.get(`/hostels/${user.hostel_id}`);
            if (response.data.success) {
                setHostelData(response.data.data);
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

                    setFormData(prev => ({ 
                        ...prev, 
                        room_type_id: defaultTypeId,
                        capacity: prev.capacity || (fourShareType ? '4' : '4')
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching room types:', error);
        }
    };

    const fetchAmenities = async () => {
        try {
            const response = await api.get('/amenities/rooms');
            if (response.data.success) {
                setAmenitiesList(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching amenities:', error);
            setAmenitiesList([
                { amenity_name: 'WiFi' },
                { amenity_name: 'AC' },
                { amenity_name: 'Attached Bathroom' },
            ]);
        }
    };

    const toggleAmenity = (name: string) => {
        setFormData(prev => {
            const exists = prev.selectedAmenities.includes(name);
            if (exists) {
                return { ...prev, selectedAmenities: prev.selectedAmenities.filter((a: string) => a !== name) };
            } else {
                return { ...prev, selectedAmenities: [...prev.selectedAmenities, name] };
            }
        });
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.room_number) newErrors.room_number = 'Room number is required';
        if (!formData.floor_number) newErrors.floor_number = 'Floor number is required';
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
    };

    const handleSave = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const payload = {
                hostel_id: user?.hostel_id,
                room_number: formData.room_number,
                room_type_id: parseInt(formData.room_type_id),
                floor_number: parseInt(formData.floor_number),
                capacity: parseInt(formData.capacity),
                rent_per_bed: parseFloat(formData.rent_per_bed),
                occupied_beds: parseInt(formData.occupied_beds),
                amenities: formData.selectedAmenities,
            };

            const response = isEdit
                ? await api.put(`/rooms/${roomToEdit.room_id}`, payload)
                : await api.post('/rooms', payload);

            if (response.status === 201 || response.status === 200) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: `Room ${isEdit ? 'updated' : 'added'} successfully!`,
                });
                navigation.goBack();
            }
        } catch (error: any) {
            console.error('Error saving room:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.error || 'Failed to save room',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppHeader title={isEdit ? "Edit Room" : "Add New Room"} />
            <FullScreenLoader visible={loading} />
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
                keyboardShouldPersistTaps="handled"
            >
                <Card style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                    <InputField
                        label="Room Number *"
                        placeholder="e.g. 101"
                        value={formData.room_number}
                        error={errors.room_number}
                        onChangeText={(text) => {
                            const newFormData = { ...formData, room_number: text };
                            setFormData(newFormData);
                            if (errors.room_number) {
                                const newErrors = { ...errors };
                                delete newErrors.room_number;
                                setErrors(newErrors);
                            }
                        }}
                    />

                    <InputField
                        label="Floor Number *"
                        placeholder="Enter Floor Number"
                        keyboardType="numeric"
                        value={formData.floor_number}
                        error={errors.floor_number}
                        onChangeText={(text) => {
                            const newFormData = { ...formData, floor_number: text };
                            setFormData(newFormData);
                            if (errors.floor_number) {
                                const newErrors = { ...errors };
                                delete newErrors.floor_number;
                                setErrors(newErrors);
                            }
                        }}
                    />

                    <View style={{ height: 20 }} />

                    <InputField
                        label="Total Capacity *"
                        placeholder="Total Beds"
                        keyboardType="numeric"
                        value={formData.capacity}
                        error={errors.capacity}
                        onChangeText={(text) => {
                            const newFormData = { ...formData, capacity: text };
                            setFormData(newFormData);
                            if (errors.capacity) {
                                const newErrors = { ...errors };
                                delete newErrors.capacity;
                                setErrors(newErrors);
                            }
                        }}
                    />

                    <InputField
                        label="Occupied Beds"
                        placeholder="0"
                        keyboardType="numeric"
                        value={formData.occupied_beds}
                        onChangeText={(text) => {
                            setFormData({ ...formData, occupied_beds: text });
                        }}
                    />

                    <InputField
                        label="Monthly Rent (per bed) *"
                        placeholder="Amount in ₹"
                        keyboardType="numeric"
                        value={formData.rent_per_bed}
                        error={errors.rent_per_bed}
                        onChangeText={(text) => {
                            const newFormData = { ...formData, rent_per_bed: text };
                            setFormData(newFormData);
                            if (errors.rent_per_bed) {
                                const newErrors = { ...errors };
                                delete newErrors.rent_per_bed;
                                setErrors(newErrors);
                            }
                        }}
                    />

                    <Text style={[styles.label, { color: theme.textSecondary }]}>Room Type *</Text>
                    <TouchableOpacity
                        style={[styles.selectField, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB' }, errors.room_type_id && styles.selectFieldError]}
                        onPress={() => setTypeModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.selectLeft}>
                            <LayoutGrid size={18} color={errors.room_type_id ? "#EF4444" : theme.primary} style={{ marginRight: 10 }} />
                            <Text style={[styles.selectText, { color: theme.textPrimary }, !formData.room_type_id && { color: isDark ? '#475569' : '#94A3B8' }]}>
                                {formData.room_type_id
                                    ? roomTypes.find(t => t.room_type_id.toString() === formData.room_type_id)?.room_type_name
                                    : "Select Room Type"}
                            </Text>
                        </View>
                        <ChevronDown size={18} color="#94A3B8" />
                    </TouchableOpacity>
                    {errors.room_type_id && <Text style={styles.errorText}>{errors.room_type_id}</Text>}

                    <Text style={[styles.label, { marginTop: 16, color: theme.textSecondary }]}>Amenities</Text>
                    <View style={styles.amenitiesContainer}>
                        {amenitiesList.map((amenity, index) => {
                            const isActive = formData.selectedAmenities.includes(amenity.amenity_name);
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.amenityChip,
                                        { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' },
                                        isActive && { backgroundColor: theme.primary, borderColor: theme.primary }
                                    ]}
                                    onPress={() => toggleAmenity(amenity.amenity_name)}
                                    activeOpacity={0.7}
                                >
                                    {isActive && (
                                        <Check size={14} color="#FFF" style={{ marginRight: 4 }} />
                                    )}
                                    <Text style={[
                                        styles.amenityText,
                                        { color: theme.textSecondary },
                                        isActive && { color: '#FFF', fontWeight: '600' }
                                    ]}>{amenity.amenity_name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Card>
                <View style={{ height: 20 }} />
            </ScrollView>

            {/* ─── Sticky Footer ───────────────────────────────────────────────────── */}
            <View style={[styles.stickyFooter, { backgroundColor: theme.cardBg, borderTopColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: isKeyboardVisible ? SPACING.md : (insets.bottom + SPACING.md) }]}>
                <TouchableOpacity
                    style={[styles.resetButton, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#CBD5E1' }]}
                    onPress={handleReset}
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    <Text style={[styles.resetButtonText, { color: theme.textSecondary }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.primary }, loading && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <Text style={styles.saveButtonText}>{isEdit ? "Update" : "Create"}</Text>
                </TouchableOpacity>
            </View>



            {/* Room Type Modal - FIXED SINGLE SHADE */}
            <Modal
                visible={typeModalVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setTypeModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setTypeModalVisible(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={styles.modalContent}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Room Type</Text>
                            <TouchableOpacity
                                onPress={() => setTypeModalVisible(false)}
                                style={styles.closeBtn}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.closeText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={roomTypes}
                            keyExtractor={(item) => item.room_type_id.toString()}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.modalOption, formData.room_type_id === item.room_type_id.toString() && styles.modalOptionSelected]}
                                    onPress={() => {
                                        const newFormData = { ...formData, room_type_id: item.room_type_id.toString() };
                                        setFormData(newFormData);
                                        setTypeModalVisible(false);
                                        if (errors.room_type_id) {
                                            const newErrors = { ...errors };
                                            delete newErrors.room_type_id;
                                            setErrors(newErrors);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.optionText, formData.room_type_id === item.room_type_id.toString() && styles.optionTextSelected]}>
                                        {item.room_type_name}
                                    </Text>
                                    {formData.room_type_id === item.room_type_id.toString() && <Check size={20} color="#FF6B6B" />}
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        />
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { flex: 1, padding: 20 },
    formCard: { padding: 20, marginBottom: 20 },
    row: { flexDirection: 'row' },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 12,
        marginLeft: 4,
    },
    selectField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 50,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 12,
        // NO BORDER
    },
    selectFieldError: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1.5,
        borderColor: '#EF4444',
    },
    selectLeft: { flexDirection: 'row', alignItems: 'center' },
    selectText: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)', // SINGLE SHADE ONLY
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        maxHeight: '70%',
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    closeBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#FFF1F1',
    },
    closeText: { color: '#FF6B6B', fontWeight: '700', fontSize: 14 },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    modalOptionSelected: {
        backgroundColor: '#FFF9F9',
    },
    optionText: { fontSize: 15, color: '#334155', fontWeight: '500' },
    optionTextSelected: {
        color: '#FF6B6B',
        fontWeight: '700',
    },
    amenitiesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    amenityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    amenityChipActive: {
        backgroundColor: '#FF6B6B',
        borderColor: '#FF6B6B',
    },
    amenityText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
    amenityTextActive: { color: '#FFF', fontWeight: '600' },
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
    resetButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF'
    },
    resetButtonText: { color: '#475569', fontWeight: '600', fontSize: 15 },
    saveButton: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FF6B6B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    disabledButton: { opacity: 0.7 },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
        fontWeight: '500'
    },
});

export default AddRoomScreen;