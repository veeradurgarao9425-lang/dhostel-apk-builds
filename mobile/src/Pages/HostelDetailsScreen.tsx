import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { AppHeader } from '../components/AppHeader';
import { useToast } from '../context/ToastContext';
import * as Clipboard from 'expo-clipboard';

export const HostelDetailsScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user, updateTokenAndUser } = useAuth();
    const { theme, isDark } = useTheme();
    const { showError, showApiError } = useToast();

    const { hostel, hostelId } = route.params || {};
    const [selectedHostelDetails, setSelectedHostelDetails] = useState<any>(hostel);
    const [switchingId, setSwitchingId] = useState<number | null>(null);
    const [loadingHostel, setLoadingHostel] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyCode = async (code: string) => {
        try {
            await Clipboard.setStringAsync(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    const getInitials = (name: string) => {
        if (!name || typeof name !== 'string') return 'H';
        const cleanName = name.trim().replace(/\s+/g, ' ');
        const parts = cleanName.split(' ');
        if (parts.length > 1) {
            const first = parts[0]?.[0] || '';
            const second = parts[1]?.[0] || '';
            return (first + second).toUpperCase();
        }
        return cleanName.slice(0, 2).toUpperCase();
    };

    const handleSwitchHostel = async (hostelId: number) => {
        if (Number(hostelId) === Number(user?.hostel_id)) return;
        try {
            setSwitchingId(hostelId);
            const res = await api.put('/auth/active-hostel', { hostel_id: hostelId });
            if (res.data?.success) {
                const { token, hostel_name } = res.data.data;
                await updateTokenAndUser(token, { hostel_id: hostelId, hostel_name });
            } else {
                showError(res.data?.error || 'Failed to switch active hostel');
            }
        } catch (err: any) {
            console.error('Switch active hostel error:', err);
            showApiError(err, 'An error occurred while switching hostels.');
        } finally {
            setSwitchingId(null);
        }
    };

useEffect(() => {
        const fetchSelectedHostel = async () => {
            if (!hostelId) return;
            if (selectedHostelDetails?.hostel_code && selectedHostelDetails?.hostel_name) return;

            try {
                setLoadingHostel(true);
                const res = await api.get(`/hostels/${hostelId}`);
                if (res.data?.success && res.data.data) {
                    setSelectedHostelDetails((prev: any) => ({ ...prev, ...res.data.data }));
                }
            } catch (err: any) {
                console.error('Hostel details fetch error:', err);
            } finally {
                setLoadingHostel(false);
            }
        };

        fetchSelectedHostel();
    }, [hostelId, selectedHostelDetails]);

    if (!selectedHostelDetails || loadingHostel) {
        return (
            <View style={[styles.center, { backgroundColor: isDark ? theme.background : '#F5F6F8' }]}> 
                <AppHeader title="Hostel Details" showBack={true} />
                <View style={styles.emptyContainer}>
                    {loadingHostel ? (
                        <ActivityIndicator size="large" color={theme.primary} />
                    ) : (
                        <Text style={{ color: theme.textSecondary, fontSize: 16 }}>No hostel details found.</Text>
                    )}
                </View>
            </View>
        );
    }

    const isGirls = selectedHostelDetails.hostel_type?.toLowerCase().includes('girl');
    const isBoys = selectedHostelDetails.hostel_type?.toLowerCase().includes('boy');
    const statusColor = isGirls ? '#DB2777' : (isBoys ? '#2563EB' : '#0EA5E9');

    return (
        <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F5F6F8' }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader
                title="Hostel Details"
                showBack={true}
                rightComponent={
                    <TouchableOpacity
                        onPress={() => {
                            navigation.navigate('AddHostel', { hostel: selectedHostelDetails, isEdit: true });
                        }}
                        activeOpacity={0.7}
                        style={{ padding: 4 }}
                    >
                        <Ionicons name="create-outline" size={24} color="#FFF" />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header Summary block */}
                <View style={styles.summaryBlock}>
                    <View style={[styles.avatarBoxLarge, { backgroundColor: isGirls ? '#FCE7F3' : '#DBEAFE', overflow: 'hidden' }]}>
                        {selectedHostelDetails.photo && typeof selectedHostelDetails.photo === 'string' && selectedHostelDetails.photo.trim() !== '' && selectedHostelDetails.photo.trim() !== 'null' && selectedHostelDetails.photo.startsWith('http') ? (
                            <Image source={{ uri: selectedHostelDetails.photo }} style={styles.avatarImgLarge} />
                        ) : (
                            <Text style={[styles.avatarTextInitialsLarge, { color: isGirls ? '#DB2777' : '#2563EB' }]}>
                                {getInitials(selectedHostelDetails.hostel_name)}
                            </Text>
                        )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[styles.hostelName, { color: theme.textPrimary }]} numberOfLines={1}>
                            {selectedHostelDetails.hostel_name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                            <View style={[styles.typeBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                                <Text style={[styles.typeBadgeText, { color: isDark ? theme.primary : '#475569' }]}>
                                    {selectedHostelDetails.hostel_type || 'Co-Living'}
                                </Text>
                            </View>
                            <View style={[styles.statusBadgeInline, { backgroundColor: (Number(selectedHostelDetails.hostel_id) === Number(user?.hostel_id)) ? theme.success + '15' : 'rgba(148, 163, 184, 0.15)' }]}>
                                <Text style={[styles.statusBadgeTextInline, { color: (Number(selectedHostelDetails.hostel_id) === Number(user?.hostel_id)) ? theme.success : theme.textSecondary }]}>
                                    {(Number(selectedHostelDetails.hostel_id) === Number(user?.hostel_id)) ? 'Active' : 'Inactive'}
                                </Text>
                            </View>
                            {selectedHostelDetails.hostel_code && (
                                <TouchableOpacity 
                                    onPress={() => handleCopyCode(selectedHostelDetails.hostel_code)}
                                    style={[styles.typeBadge, { backgroundColor: copied ? (isDark ? '#064E3B' : '#D1FAE5') : (isDark ? '#1E293B' : '#F1F5F9'), borderColor: copied ? '#10B981' : 'transparent', borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={copied ? "checkmark-circle" : "key-outline"} size={11} color={copied ? '#10B981' : theme.primary} />
                                    <Text style={[styles.typeBadgeText, { color: copied ? (isDark ? '#A7F3D0' : '#064E3B') : (isDark ? '#FFF' : '#475569'), fontSize: 10 }]}>
                                        Code: {selectedHostelDetails.hostel_code}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

                {/* Premium Card: Hostel General & Location Info */}
                <View style={[styles.premiumCardContainer, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <View style={styles.premiumCardHeader}>
                        <Ionicons name="business" size={16} color={theme.primary} />
                        <Text style={[styles.premiumCardHeaderTitle, { color: theme.textPrimary }]}>Hostel Information</Text>
                    </View>
                    <View style={styles.premiumGrid}>
                        <View style={styles.premiumGridRow}>
                            <View style={[styles.premiumGridItem, { flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                <Text style={styles.premiumLabel}>Admission Fee</Text>
                                <Text style={[styles.premiumValue, { color: theme.textPrimary }]}>₹{selectedHostelDetails.admission_fee || '0'}</Text>
                            </View>
                            <View style={[styles.premiumGridItem, { flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                <Text style={styles.premiumLabel}>Total Floors</Text>
                                <Text style={[styles.premiumValue, { color: theme.textPrimary }]}>{selectedHostelDetails.total_floors || 'N/A'}</Text>
                            </View>
                        </View>
                        {selectedHostelDetails.hostel_code && (
                            <TouchableOpacity
                                style={[styles.premiumGridItem, { backgroundColor: copied ? (isDark ? '#064E3B' : '#D1FAE5') : (isDark ? '#0F172A' : '#F8FAFC'), borderColor: copied ? '#10B981' : (isDark ? '#334155' : '#F1F5F9'), borderWidth: 1 }]}
                                onPress={() => handleCopyCode(selectedHostelDetails.hostel_code)}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.premiumLabel}>Connection Code (Tap to Copy)</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                    <Text style={[styles.premiumValue, { color: copied ? '#10B981' : theme.primary, fontWeight: 'bold' }]}>
                                        {selectedHostelDetails.hostel_code}
                                    </Text>
                                    <Ionicons 
                                        name={copied ? "checkmark-circle" : "copy-outline"} 
                                        size={14} 
                                        color={copied ? '#10B981' : theme.primary} 
                                    />
                                </View>
                            </TouchableOpacity>
                        )}
                        {(() => {
                            const addressParts = [selectedHostelDetails.address, selectedHostelDetails.city, selectedHostelDetails.state].filter(Boolean);
                            const addressLabel = addressParts.join(', ');
                            const pincodeText = selectedHostelDetails.pincode ? ` - ${selectedHostelDetails.pincode}` : '';
                            if (!addressLabel && !selectedHostelDetails.pincode) return null;
                            return (
                                <View style={[styles.premiumGridItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#F1F5F9' }]}> 
                                    <Text style={styles.premiumLabel}>Hostel Address</Text>
                                    <Text style={[styles.premiumValue, { color: theme.textPrimary, lineHeight: 18 }]}> 
                                        {addressLabel || 'Not available'}{pincodeText}
                                    </Text>
                                </View>
                            );
                        })()}
                    </View>
                </View>

                {/* Premium Card: Owner & Contact Details */}
                <View style={[styles.premiumCardContainer, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <View style={styles.premiumCardHeader}>
                        <Ionicons name="person" size={16} color={theme.primary} />
                        <Text style={[styles.premiumCardHeaderTitle, { color: theme.textPrimary }]}>Owner & Contact Details</Text>
                    </View>
                    <View style={styles.premiumGrid}>
                        <View style={[styles.premiumGridItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <Text style={styles.premiumLabel}>Owner Name</Text>
                            <Text style={[styles.premiumValue, { color: theme.textPrimary }]}>{selectedHostelDetails.owner_name || 'N/A'}</Text>
                        </View>
                        <View style={styles.premiumGridRow}>
                            <View style={[styles.premiumGridItem, { flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                <Text style={styles.premiumLabel}>Phone Number</Text>
                                <Text style={[styles.premiumValue, { color: theme.textPrimary }]}>{selectedHostelDetails.contact_number || 'N/A'}</Text>
                            </View>
                            <View style={[styles.premiumGridItem, { flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                <Text style={styles.premiumLabel}>Email Address</Text>
                                <Text style={[styles.premiumValue, { color: theme.textPrimary }]} numberOfLines={1}>{selectedHostelDetails.email || 'N/A'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Premium Card: Amenities */}
                {selectedHostelDetails.amenities && selectedHostelDetails.amenities.length > 0 && (
                    <View style={[styles.premiumCardContainer, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <View style={styles.premiumCardHeader}>
                            <Ionicons name="checkmark-done-circle" size={16} color={theme.primary} />
                            <Text style={[styles.premiumCardHeaderTitle, { color: theme.textPrimary }]}>Facilities & Amenities</Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {selectedHostelDetails.amenities.map((am: string, index: number) => (
                                <View key={index} style={[styles.amenityBadge, { backgroundColor: isDark ? '#1E293B' : '#ECFDF5', borderColor: isDark ? '#334155' : '#A7F3D0', borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                                    <Text style={[styles.amenityBadgeText, { color: '#059669' }]}>{am}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={{ height: 24 }} />

                {switchingId === selectedHostelDetails.hostel_id ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                    <TouchableOpacity
                        style={[
                            styles.activateHostelBtn,
                            {
                                backgroundColor: (Number(selectedHostelDetails.hostel_id) === Number(user?.hostel_id)) ? theme.success : theme.primary,
                                opacity: (Number(selectedHostelDetails.hostel_id) === Number(user?.hostel_id)) ? 0.8 : 1
                            }
                        ]}
                        disabled={Number(selectedHostelDetails.hostel_id) === Number(user?.hostel_id)}
                        onPress={() => handleSwitchHostel(selectedHostelDetails.hostel_id)}
                    >
                        <Text style={styles.activateHostelBtnText}>
                            {(Number(selectedHostelDetails.hostel_id) === Number(user?.hostel_id)) ? '✓ Current Active Hostel' : 'Switch & Activate Hostel'}
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    summaryBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    avatarBoxLarge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImgLarge: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    avatarTextInitialsLarge: {
        fontSize: 18,
        fontWeight: '800',
    },
    hostelName: {
        fontSize: 18,
        fontWeight: '800',
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    statusBadgeInline: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusBadgeTextInline: {
        fontSize: 10,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    amenityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    amenityBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    activateHostelBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    activateHostelBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '800',
    },
    premiumCardContainer: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
    },
    premiumCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    premiumCardHeaderTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    premiumGrid: {
        flexDirection: 'column',
        gap: 10,
    },
    premiumGridRow: {
        flexDirection: 'row',
        gap: 12,
    },
    premiumGridItem: {
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
    },
    premiumLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    premiumValue: {
        fontSize: 13,
        fontWeight: '700',
    },
});

export default HostelDetailsScreen;
