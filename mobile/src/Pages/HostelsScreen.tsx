import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Modal,
    TouchableWithoutFeedback
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Plus } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';

export const HostelsScreen = () => {
    const navigation = useNavigation<any>();
    const { user, updateTokenAndUser } = useAuth();
    const { theme, isDark, fontSize } = useTheme();

    const [hostels, setHostels] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [switchingId, setSwitchingId] = useState<number | null>(null);

    const [selectedHostelDetails, setSelectedHostelDetails] = useState<any>(null);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);

    const fetchHostels = async () => {
        try {
            setLoading(true);
            const res = await api.get('/hostels');
            if (res.data?.success) {
                setHostels(res.data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch hostels:', e);
            Alert.alert('Error', 'Failed to load hostels list.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const res = await api.get('/hostels');
            if (res.data?.success) {
                setHostels(res.data.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHostels();
    }, []);

    const handleSwitchHostel = async (hostelId: number) => {
        if (hostelId === user?.hostel_id) return;
        try {
            setSwitchingId(hostelId);
            const res = await api.put('/auth/active-hostel', { hostel_id: hostelId });
            if (res.data?.success) {
                const { token, hostel_name } = res.data.data;
                await updateTokenAndUser(token, { hostel_id: hostelId, hostel_name });
            } else {
                Alert.alert('Error', res.data?.error || 'Failed to switch active hostel');
            }
        } catch (err: any) {
            console.error('Switch active hostel error:', err);
            Alert.alert('Error', err.response?.data?.error || 'An error occurred while switching hostels.');
        } finally {
            setSwitchingId(null);
        }
    };

    const handleQuickAddRoom = async (hostelId: number, hostelName: string) => {
        try {
            if (hostelId !== user?.hostel_id) {
                setSwitchingId(hostelId);
                const res = await api.put('/auth/active-hostel', { hostel_id: hostelId });
                if (res.data?.success) {
                    const { token } = res.data.data;
                    await updateTokenAndUser(token, { hostel_id: hostelId, hostel_name: hostelName });
                } else {
                    Alert.alert('Error', res.data?.error || 'Failed to switch active hostel');
                    return;
                }
            }
            navigation.navigate('AddRoom');
        } catch (err: any) {
            console.error('Quick Add Room error:', err);
            Alert.alert('Error', err.response?.data?.error || 'Failed to switch hostel for adding room.');
        } finally {
            setSwitchingId(null);
        }
    };

    const handleQuickReports = async (hostelId: number, hostelName: string) => {
        try {
            if (hostelId !== user?.hostel_id) {
                setSwitchingId(hostelId);
                const res = await api.put('/auth/active-hostel', { hostel_id: hostelId });
                if (res.data?.success) {
                    const { token } = res.data.data;
                    await updateTokenAndUser(token, { hostel_id: hostelId, hostel_name: hostelName });
                } else {
                    Alert.alert('Error', res.data?.error || 'Failed to switch active hostel');
                    return;
                }
            }
            navigation.navigate('Reports');
        } catch (err: any) {
            console.error('Quick Reports error:', err);
            Alert.alert('Error', err.response?.data?.error || 'Failed to switch hostel for viewing reports.');
        } finally {
            setSwitchingId(null);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return 'H';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const handleViewDetails = (hostel: any) => {
        setSelectedHostelDetails(hostel);
        setDetailsModalVisible(true);
    };

    const handleSwitchFromDetails = async (hostelId: number) => {
        setDetailsModalVisible(false);
        await handleSwitchHostel(hostelId);
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
            <AppHeader title="My Hostels" showBack={true} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary]} />
                }
            >
                {loading && !refreshing ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : hostels.length === 0 ? (
                    <EmptyState
                        variant="noData"
                        title="No Hostels Yet"
                        subtitle="Add your first hostel to start managing tenants, rooms and finances."
                        actionLabel="Add Hostel"
                        onAction={() => navigation.navigate('AddHostel')}
                    />
                ) : (
                    hostels.map((h: any) => {
                        const isActive = h.hostel_id === user?.hostel_id;
                        const isSwitching = switchingId === h.hostel_id;

                        // Color theme based on hostel type
                        const isGirls = h.hostel_type?.toLowerCase().includes('girl');
                        const isBoys = h.hostel_type?.toLowerCase().includes('boy');
                        const statusColor = isGirls ? '#DB2777' : (isBoys ? '#2563EB' : '#0EA5E9');
                        
                        const avatarBg = statusColor + '20';
                        const avatarTextColor = statusColor;

                        return (
                            <TouchableOpacity
                                key={h.hostel_id}
                                style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                                onPress={() => handleViewDetails(h)}
                                activeOpacity={0.8}
                                disabled={isSwitching}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={[styles.avatarBox, { backgroundColor: avatarBg }]}>
                                        <Text style={[styles.avatarTextInitials, { color: avatarTextColor }]}>
                                            {getInitials(h.hostel_name)}
                                        </Text>
                                    </View>
                                    <View style={styles.infoContainer}>
                                        <Text style={[styles.nameText, { color: theme.textPrimary }]} numberOfLines={1}>
                                            {h.hostel_name}
                                        </Text>
                                        <Text style={[styles.subDetailText, { color: theme.textSecondary }]} numberOfLines={1}>
                                            {h.address}, {h.city} • {h.hostel_type || 'Co-Living'}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: isActive ? theme.success + '15' : 'rgba(148, 163, 184, 0.15)' }]}>
                                        <Text style={[styles.statusBadgeText, { color: isActive ? theme.success : theme.textSecondary }]}>
                                            {isActive ? 'Active' : 'Inactive'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

                                <View style={styles.cardActions}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                navigation.navigate('AddHostel', { hostel: h, isEdit: true });
                                            }}
                                            style={[styles.actionBtnIcon, { backgroundColor: isDark ? '#334155' : '#F8FAFC', borderColor: isDark ? '#475569' : '#E2E8F0' }]}
                                        >
                                            <Ionicons name="create-outline" size={14} color={theme.primary} />
                                            <Text style={[styles.actionBtnIconText, { color: theme.textSecondary }]}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleQuickReports(h.hostel_id, h.hostel_name);
                                            }}
                                            style={[styles.actionBtnIcon, { backgroundColor: isDark ? '#334155' : '#F8FAFC', borderColor: isDark ? '#475569' : '#E2E8F0' }]}
                                        >
                                            <Ionicons name="bar-chart" size={14} color="#2563EB" />
                                            <Text style={[styles.actionBtnIconText, { color: theme.textSecondary }]}>Reports</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {isSwitching ? (
                                        <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 10 }} />
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => handleViewDetails(h)}
                                            style={[
                                                styles.statusToggleBtnNew,
                                                {
                                                    backgroundColor: isActive ? theme.success + '15' : theme.primary + '15',
                                                    borderColor: isActive ? theme.success + '30' : theme.primary + '30',
                                                    borderWidth: 1
                                                }
                                            ]}
                                        >
                                            <Text style={[styles.statusToggleTextNew, { color: isActive ? theme.success : theme.primary }]}>
                                                View Details
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('AddHostel')}
                activeOpacity={0.85}
            >
                <Plus color="#FFF" size={24} strokeWidth={3} />
            </TouchableOpacity>

            {/* Hostel Details Bottom Sheet Drawer Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={detailsModalVisible}
                onRequestClose={() => setDetailsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    {/* Absolute Backdrop overlay */}
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => setDetailsModalVisible(false)}
                    />

                    {/* Sheet Content */}
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalSheet, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Hostel Information</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setDetailsModalVisible(false);
                                        navigation.navigate('AddHostel', { hostel: selectedHostelDetails, isEdit: true });
                                    }}
                                    activeOpacity={0.7}
                                    style={{ padding: 4 }}
                                >
                                    <Ionicons name="create-outline" size={22} color={theme.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalCloseBtn}
                                    onPress={() => setDetailsModalVisible(false)}
                                >
                                    <Ionicons name="close" size={24} color={theme.textPrimary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {selectedHostelDetails && (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                                
                                {/* Header Summary block */}
                                <View style={styles.modalSummaryBlock}>
                                    <View style={[styles.avatarBoxLarge, { backgroundColor: selectedHostelDetails.hostel_type?.toLowerCase().includes('girl') ? '#FCE7F3' : '#DBEAFE' }]}>
                                        <Text style={[styles.avatarTextInitialsLarge, { color: selectedHostelDetails.hostel_type?.toLowerCase().includes('girl') ? '#DB2777' : '#2563EB' }]}>
                                            {getInitials(selectedHostelDetails.hostel_name)}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 14 }}>
                                        <Text style={[styles.modalHostelName, { color: theme.textPrimary }]} numberOfLines={1}>
                                            {selectedHostelDetails.hostel_name}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                            <View style={[styles.typeBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                                                <Text style={[styles.typeBadgeText, { color: isDark ? theme.primary : '#475569' }]}>
                                                    {selectedHostelDetails.hostel_type || 'Co-Living'}
                                                </Text>
                                            </View>
                                            <View style={[styles.statusBadgeInline, { backgroundColor: (selectedHostelDetails.hostel_id === user?.hostel_id) ? theme.success + '15' : 'rgba(148, 163, 184, 0.15)' }]}>
                                                <Text style={[styles.statusBadgeTextInline, { color: (selectedHostelDetails.hostel_id === user?.hostel_id) ? theme.success : theme.textSecondary }]}>
                                                    {(selectedHostelDetails.hostel_id === user?.hostel_id) ? 'Active' : 'Inactive'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View style={[styles.modalDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

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
                                        <View style={[styles.premiumGridItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                            <Text style={styles.premiumLabel}>Hostel Address</Text>
                                            <Text style={[styles.premiumValue, { color: theme.textPrimary, lineHeight: 18 }]}>
                                                {selectedHostelDetails.address}, {selectedHostelDetails.city}, {selectedHostelDetails.state} - {selectedHostelDetails.pincode || 'N/A'}
                                            </Text>
                                        </View>
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
                                                backgroundColor: (selectedHostelDetails.hostel_id === user?.hostel_id) ? theme.success : theme.primary,
                                                opacity: (selectedHostelDetails.hostel_id === user?.hostel_id) ? 0.8 : 1
                                            }
                                        ]}
                                        disabled={selectedHostelDetails.hostel_id === user?.hostel_id}
                                        onPress={() => handleSwitchFromDetails(selectedHostelDetails.hostel_id)}
                                    >
                                        <Text style={styles.activateHostelBtnText}>
                                            {(selectedHostelDetails.hostel_id === user?.hostel_id) ? '✓ Current Active Hostel' : 'Switch & Activate Hostel'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 80,
    },
    center: {
        paddingVertical: 50,
        alignItems: 'center',
    },
    empty: {
        paddingVertical: 50,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
    },
    card: {
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarTextInitials: {
        fontSize: 13,
        fontWeight: '700',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
    },
    nameText: {
        fontSize: 14,
        fontWeight: '700',
    },
    subDetailText: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginVertical: 10,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionBtnIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    actionBtnIconText: {
        fontSize: 11,
        fontWeight: '600',
    },
    statusToggleBtnNew: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusToggleTextNew: {
        fontSize: 11,
        fontWeight: '700',
    },
    fab: {
        position: 'absolute',
        bottom: 75,
        right: 24,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 22,
        paddingTop: 24,
        maxHeight: '85%',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(148, 163, 184, 0.15)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalSummaryBlock: {
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
    avatarTextInitialsLarge: {
        fontSize: 18,
        fontWeight: '800',
    },
    modalHostelName: {
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
    modalDivider: {
        height: 1,
        marginVertical: 16,
    },
    sectionHeaderTitle: {
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 10,
        marginBottom: 8,
    },
    detailsGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    detailsGridItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    gridLabel: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    gridVal: {
        fontSize: 13,
        fontWeight: '700',
    },
    fullWidthItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 14,
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
        borderColor: '#F1F5F9',
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
        borderColor: '#F1F5F9',
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

export default HostelsScreen;
