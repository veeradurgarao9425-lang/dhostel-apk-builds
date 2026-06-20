import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import Toast from 'react-native-toast-message';
import { AppHeader } from '../components/AppHeader';
import { InputField } from '../components/InputField';
import { Card } from '../components/Card';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export const AddHostelScreen = ({ navigation }: any) => {
    const { theme, isDark } = useTheme();
    const { user, updateTokenAndUser } = useAuth();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        hostel_name: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        total_floors: '',
    });
    const [hostelType, setHostelType] = useState('Boys');

    const handleSave = async () => {
        const { hostel_name, address, city, state, pincode, total_floors } = formData;
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
            // 1. Create the new hostel
            const response = await api.post('/hostels', {
                hostel_name,
                address,
                city,
                state,
                pincode,
                hostel_type: hostelType,
                total_floors: total_floors ? parseInt(total_floors) : 1,
            });

            if (response.data.success) {
                const newHostelId = response.data.data.hostel_id;
                
                // 2. Set this new hostel as the active hostel immediately
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
                
                navigation.goBack();
            }
        } catch (error: any) {
            console.error('Error creating hostel:', error);
            const errMsg = error.response?.data?.error || 'Failed to create hostel. Please try again.';
            Alert.alert('Creation Failed', errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <AppHeader title="Add Hostel" showBack={true} />

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
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
                        {['Boys', 'Girls', 'Co-living'].map((t) => (
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
                    />

                    <View style={styles.row}>
                        <InputField
                            label="City *"
                            placeholder="City"
                            value={formData.city}
                            containerStyle={{ flex: 1, marginRight: 8 }}
                            onChangeText={(text) => setFormData({ ...formData, city: text })}
                        />
                        <InputField
                            label="State *"
                            placeholder="State"
                            value={formData.state}
                            containerStyle={{ flex: 1, marginLeft: 8 }}
                            onChangeText={(text) => setFormData({ ...formData, state: text })}
                        />
                    </View>

                    <View style={styles.row}>
                        <InputField
                            label="Pincode *"
                            placeholder="6-digit ZIP code"
                            keyboardType="numeric"
                            value={formData.pincode}
                            containerStyle={{ flex: 1, marginRight: 8 }}
                            onChangeText={(text) => setFormData({ ...formData, pincode: text })}
                        />
                        <InputField
                            label="Total Floors"
                            placeholder="e.g. 3"
                            keyboardType="numeric"
                            value={formData.total_floors}
                            containerStyle={{ flex: 1, marginLeft: 8 }}
                            onChangeText={(text) => setFormData({ ...formData, total_floors: text })}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                        onPress={handleSave}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.saveText}>Create Hostel</Text>
                        )}
                    </TouchableOpacity>
                </Card>
            </ScrollView>
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
});

export default AddHostelScreen;
