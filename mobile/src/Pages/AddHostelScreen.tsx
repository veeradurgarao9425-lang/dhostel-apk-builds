import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Keyboard,
    Modal,
    FlatList,
    TextInput
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { AppHeader } from '../components/AppHeader';
import { InputField } from '../components/InputField';
import { Card } from '../components/Card';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATES_CITIES: Record<string, string[]> = {
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Kurnool', 'Rajahmundry', 'Kakinada', 'Anantapur', 'Eluru'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Davangere', 'Ballari', 'Tumakuru', 'Shivamogga', 'Kalaburagi'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi', 'Tirunelveli'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Pimpri-Chinchwad', 'Nashik', 'Kalyan-Dombivli', 'Vasai-Virar', 'Aurangabad', 'Navi Mumbai', 'Solapur', 'Kolhapur'],
    'Delhi': ['New Delhi', 'Delhi Cantonment', 'Dwarka', 'Rohini', 'Vasant Kunj'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Gandhidham', 'Anand'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Sikar', 'Bharatpur'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Meerut', 'Varanasi', 'Noida', 'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur'],
    'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'],
    'West Bengal': ['Kolkata', 'Howrah', 'Darjeeling', 'Siliguri', 'Asansol', 'Durgapur', 'Bardhaman', 'Malda', 'Kharagpur', 'Haldia'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur', 'Batala'],
    'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha', 'Palakkad', 'Kannur', 'Kottayam'],
};

export const AddHostelScreen = ({ navigation, route }: any) => {
    const { theme, isDark } = useTheme();
    const { user, updateTokenAndUser } = useAuth();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const [stateModalVisible, setStateModalVisible] = useState(false);
    const [cityModalVisible, setCityModalVisible] = useState(false);
    const [stateSearch, setStateSearch] = useState('');
    const [citySearch, setCitySearch] = useState('');

    const isEdit = route.params?.isEdit || false;
    const editHostel = route.params?.hostel || null;

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    const [formData, setFormData] = useState({
        hostel_name: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        total_floors: '',
        admission_fee: '',
    });
    const [hostelType, setHostelType] = useState('Boys');

    useEffect(() => {
        if (isEdit && editHostel) {
            setFormData({
                hostel_name: editHostel.hostel_name || '',
                address: editHostel.address || '',
                city: editHostel.city || '',
                state: editHostel.state || '',
                pincode: editHostel.pincode ? String(editHostel.pincode) : '',
                total_floors: editHostel.total_floors ? String(editHostel.total_floors) : '',
                admission_fee: editHostel.admission_fee ? String(editHostel.admission_fee) : '',
            });
            setHostelType(editHostel.hostel_type || 'Boys');
        }
    }, [isEdit, editHostel]);

    const handleSave = async () => {
        const { hostel_name, address, city, state, pincode, total_floors, admission_fee } = formData;
        if (!hostel_name || !address || !city || !state || !pincode) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Please fill in all required fields.',
            });
            return;
        }

        setLoading(true);
        try {
            let response;
            if (isEdit && editHostel) {
                response = await api.put(`/hostels/${editHostel.hostel_id}`, {
                    hostel_name,
                    address,
                    city,
                    state,
                    pincode,
                    hostel_type: hostelType,
                    total_floors: total_floors ? parseInt(total_floors) : 1,
                    admission_fee: admission_fee ? parseFloat(admission_fee) : 0,
                    owner_id: editHostel.owner_id || user?.user_id,
                });
            } else {
                response = await api.post('/hostels', {
                    hostel_name,
                    address,
                    city,
                    state,
                    pincode,
                    hostel_type: hostelType,
                    total_floors: total_floors ? parseInt(total_floors) : 1,
                    admission_fee: admission_fee ? parseFloat(admission_fee) : 0,
                    owner_id: user?.user_id,
                });
            }

            if (response.data.success) {
                if (isEdit && editHostel) {
                    if (editHostel.hostel_id === user?.hostel_id) {
                        await updateTokenAndUser(user?.token, { hostel_id: editHostel.hostel_id, hostel_name });
                    }
                    Toast.show({
                        type: 'success',
                        text1: 'Success',
                        text2: 'Hostel details updated successfully!',
                    });
                } else {
                    const newHostelId = response.data.data.hostel_id;

                    // Set this new hostel as the active hostel immediately
                    const switchRes = await api.put('/auth/active-hostel', { hostel_id: newHostelId });
                    if (switchRes.data?.success) {
                        const { token, hostel_name: activeHostelName } = switchRes.data.data;
                        await updateTokenAndUser(token, { hostel_id: newHostelId, hostel_name: activeHostelName });
                    }

                    Toast.show({
                        type: 'success',
                        text1: 'Success',
                        text2: 'Hostel created and set as active!',
                    });
                }

                navigation.goBack();
            }
        } catch (error: any) {
            console.error('Error saving hostel:', error);
            const errMsg = error.response?.data?.error || 'Failed to save hostel. Please try again.';
            Alert.alert('Save Failed', errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            hostel_name: '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            total_floors: '',
            admission_fee: '',
        });
        setHostelType('Boys');
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            <AppHeader title={isEdit ? 'Edit Hostel' : 'Add Hostel'} showBack={true} />

            <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: isKeyboardVisible ? 300 : 40 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Card style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <View style={[styles.limitInfoContainer, isDark && { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.3)' }]}>
                        <Text style={styles.limitInfoText}>
                            ℹ️ Note: Every owner is limited to a maximum of 2 active hostels.
                        </Text>
                    </View>

                    <InputField
                        label="Hostel Name *"
                        placeholder="e.g. Royal Boys Hostel"
                        value={formData.hostel_name}
                        onChangeText={(text) => setFormData({ ...formData, hostel_name: text })}
                    />

                    <Text style={[styles.label, { color: theme.textPrimary }]}>Hostel Type *</Text>
                    <View style={styles.typeRow}>
                        {['Boys', 'Girls', 'Co-ed'].map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={[
                                    styles.typeButton,
                                    { borderColor: isDark ? '#475569' : '#CBD5E1' },
                                    hostelType === t && { borderColor: theme.primary, backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.08)' }
                                ]}
                                onPress={() => setHostelType(t)}
                                activeOpacity={0.8}
                            >
                                <Text style={[
                                    styles.typeButtonText,
                                    { color: theme.textSecondary },
                                    hostelType === t && { color: theme.primary, fontWeight: '700' }
                                ]}>
                                    {t}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <InputField
                        label="Address *"
                        placeholder="Street address"
                        value={formData.address}
                        onChangeText={(text) => setFormData({ ...formData, address: text })}
                        onFocus={() => {
                            setTimeout(() => {
                                scrollViewRef.current?.scrollToEnd({ animated: true });
                            }, 100);
                        }}
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8, marginBottom: 16 }}>
                            <Text style={[styles.label, { color: theme.textPrimary }]}>State *</Text>
                            <TouchableOpacity
                                style={[
                                    styles.selectContainer,
                                    {
                                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                        borderColor: isDark ? '#334155' : '#E2E8F0',
                                    }
                                ]}
                                onPress={() => setStateModalVisible(true)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    numberOfLines={1}
                                    style={formData.state ? [styles.selectText, { color: theme.textPrimary }] : styles.placeholderText}
                                >
                                    {formData.state || 'Select State'}
                                </Text>
                                <ChevronDown size={18} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8, marginBottom: 16 }}>
                            <Text style={[styles.label, { color: theme.textPrimary }]}>City *</Text>
                            <TouchableOpacity
                                style={[
                                    styles.selectContainer,
                                    {
                                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                        borderColor: isDark ? '#334155' : '#E2E8F0',
                                    }
                                ]}
                                onPress={() => {
                                    if (!formData.state) {
                                        Toast.show({
                                            type: 'info',
                                            text1: 'Info',
                                            text2: 'Please select a state first',
                                        });
                                        return;
                                    }
                                    setCityModalVisible(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text
                                    numberOfLines={1}
                                    style={formData.city ? [styles.selectText, { color: theme.textPrimary }] : styles.placeholderText}
                                >
                                    {formData.city || 'Select City'}
                                </Text>
                                <ChevronDown size={18} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <InputField
                            label="Pincode *"
                            placeholder="6-digit ZIP code"
                            keyboardType="numeric"
                            value={formData.pincode}
                            containerStyle={{ flex: 1, marginRight: 8 }}
                            onChangeText={(text) => setFormData({ ...formData, pincode: text })}
                            onFocus={() => {
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 100);
                            }}
                        />
                        <InputField
                            label="Total Floors"
                            placeholder="e.g. 3"
                            keyboardType="numeric"
                            value={formData.total_floors}
                            containerStyle={{ flex: 1, marginLeft: 8 }}
                            onChangeText={(text) => setFormData({ ...formData, total_floors: text })}
                            onFocus={() => {
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 100);
                            }}
                        />
                    </View>

                    <InputField
                        label="Admission Fee (₹)"
                        placeholder="e.g. 1000"
                        keyboardType="numeric"
                        value={formData.admission_fee}
                        onChangeText={(text) => setFormData({ ...formData, admission_fee: text })}
                        onFocus={() => {
                            setTimeout(() => {
                                scrollViewRef.current?.scrollToEnd({ animated: true });
                            }, 100);
                        }}
                    />

                    {/* ── Duplicate Footer inside Card (only shown when keyboard is open) ── */}
                    {isKeyboardVisible && (
                            <View style={[styles.scrollFooter, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
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
                                    <Text style={styles.saveButtonText}>{isEdit ? 'Save Changes' : 'Create'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                </Card>
            </ScrollView>

            {/* ─── Sticky Footer ───────────────────────────────────────────────────── */}
            {!isKeyboardVisible && (
                <View style={[styles.stickyFooter, { backgroundColor: theme.cardBg, borderTopColor: isDark ? '#334155' : '#F1F5F9', paddingBottom: insets.bottom + 16 }]}>
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
                        <Text style={styles.saveButtonText}>{isEdit ? 'Save Changes' : 'Create'}</Text>
                    </TouchableOpacity>
                </View>
            )}
            {/* State Picker Modal */}
            <Modal
                visible={stateModalVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setStateModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setStateModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select State</Text>
                            <TouchableOpacity
                                onPress={() => setStateModalVisible(false)}
                                style={styles.closeBtn}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.closeText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                            <TextInput
                                style={[
                                    styles.searchInput,
                                    {
                                        backgroundColor: isDark ? '#334155' : '#F1F5F9',
                                        color: theme.textPrimary
                                    }
                                ]}
                                placeholder="Search or type state..."
                                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                value={stateSearch}
                                onChangeText={setStateSearch}
                            />
                        </View>
                        <FlatList
                            data={[
                                ...(stateSearch && !Object.keys(STATES_CITIES).some(s => s.toLowerCase() === stateSearch.toLowerCase()) ? [stateSearch] : []),
                                ...Object.keys(STATES_CITIES).filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()))
                            ]}
                            keyExtractor={(item, index) => index.toString()}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const isCustom = stateSearch && !Object.keys(STATES_CITIES).some(s => s.toLowerCase() === stateSearch.toLowerCase()) && item === stateSearch;
                                const isSelected = formData.state === item;
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.modalOption,
                                            isSelected && styles.modalOptionSelected,
                                            { borderBottomColor: isDark ? '#334155' : '#F8FAFC' }
                                        ]}
                                        onPress={() => {
                                            setFormData(prev => ({ ...prev, state: item, city: prev.state !== item ? '' : prev.city }));
                                            setStateModalVisible(false);
                                            setStateSearch('');
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            { color: theme.textPrimary },
                                            isSelected && styles.optionTextSelected
                                        ]}>
                                            {isCustom ? `Use "${item}"` : item}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* City Picker Modal */}
            <Modal
                visible={cityModalVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setCityModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setCityModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select City</Text>
                            <TouchableOpacity
                                onPress={() => setCityModalVisible(false)}
                                style={styles.closeBtn}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.closeText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                            <TextInput
                                style={[
                                    styles.searchInput,
                                    {
                                        backgroundColor: isDark ? '#334155' : '#F1F5F9',
                                        color: theme.textPrimary
                                    }
                                ]}
                                placeholder="Search or type city..."
                                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                value={citySearch}
                                onChangeText={setCitySearch}
                            />
                        </View>
                        <FlatList
                            data={[
                                ...(citySearch && !(STATES_CITIES[formData.state] || []).some(c => c.toLowerCase() === citySearch.toLowerCase()) ? [citySearch] : []),
                                ...(STATES_CITIES[formData.state] || []).filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
                            ]}
                            keyExtractor={(item, index) => index.toString()}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const isCustom = citySearch && !(STATES_CITIES[formData.state] || []).some(c => c.toLowerCase() === citySearch.toLowerCase()) && item === citySearch;
                                const isSelected = formData.city === item;
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.modalOption,
                                            isSelected && styles.modalOptionSelected,
                                            { borderBottomColor: isDark ? '#334155' : '#F8FAFC' }
                                        ]}
                                        onPress={() => {
                                            setFormData(prev => ({ ...prev, city: item }));
                                            setCityModalVisible(false);
                                            setCitySearch('');
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            { color: theme.textPrimary },
                                            isSelected && styles.optionTextSelected
                                        ]}>
                                            {isCustom ? `Use "${item}"` : item}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    limitInfoContainer: {
        backgroundColor: 'rgba(249, 115, 22, 0.08)',
        borderColor: 'rgba(249, 115, 22, 0.2)',
        borderWidth: 1,
        padding: 14,
        borderRadius: 14,
        marginBottom: 20,
    },
    limitInfoText: {
        color: '#F97316',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    typeRow: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 10,
    },
    typeButton: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    typeButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
    },
    saveBtn: {
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        elevation: 2,
    },
    saveText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
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
    scrollFooter: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        marginTop: 16,
    },
    selectContainer: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectText: {
        fontSize: 16,
    },
    placeholderText: {
        fontSize: 16,
        color: '#94A3B8',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
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
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#FFF1F1',
    },
    closeText: {
        color: '#FF6B6B',
        fontWeight: '700',
        fontSize: 14,
    },
    searchInput: {
        height: 48,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 15,
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    modalOptionSelected: {
        backgroundColor: 'rgba(255, 107, 107, 0.08)',
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
    },
    optionTextSelected: {
        color: '#FF6B6B',
        fontWeight: '700',
    },
});

export default AddHostelScreen;
