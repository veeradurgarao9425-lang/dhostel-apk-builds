import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TouchableWithoutFeedback,
    Image,
    DeviceEventEmitter
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Plus } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { useToast } from '../context/ToastContext';
import * as Clipboard from 'expo-clipboard';

export const HostelsScreen = () => {
    const navigation = useNavigation<any>();
    const { user, updateTokenAndUser } = useAuth();
    const { theme, isDark, fontSize } = useTheme();
    const { showError, showApiError, showSuccess } = useToast();

    const [hostels, setHostels] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [switchingId, setSwitchingId] = useState<number | null>(null);
    const [copiedHostelId, setCopiedHostelId] = useState<number | null>(null);

    const handleCopyHostelCode = async (code: string, hostelId: number) => {
        try {
            await Clipboard.setStringAsync(code);
            setCopiedHostelId(hostelId);
            setTimeout(() => setCopiedHostelId(null), 2000);
        } catch (err) {
            console.error('Failed to copy hostel code:', err);
        }
    };

    // Hostel details are handled via navigated screen now

    const fetchHostels = async () => {
        try {
            setLoading(true);
            setError(false);
            const res = await api.get('/hostels?my_hostels=true');
            if (res.data?.success) {
                setHostels(res.data.data || []);
            }
        } catch (e: any) {
            console.error('Failed to fetch hostels:', e);
            showApiError(e, 'Failed to load hostels list.');
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const res = await api.get('/hostels?my_hostels=true');
            if (res.data?.success) {
                setHostels(res.data.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchHostels();
        }, [])
    );

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('HOSTEL_UPDATED', () => {
            fetchHostels();
        });
        const refreshSub = DeviceEventEmitter.addListener('REFRESH_DATA', () => {
            fetchHostels();
        });
        return () => {
            sub.remove();
            refreshSub.remove();
        };
    }, []);

    const handleSwitchHostel = async (hostelId: number) => {
        if (Number(hostelId) === Number(user?.hostel_id)) return;
        try {
            setSwitchingId(hostelId);
            const res = await api.put('/auth/active-hostel', { hostel_id: hostelId });
            if (res.data?.success) {
                const { token, hostel_name } = res.data.data;
                await updateTokenAndUser(token, { hostel_id: hostelId, hostel_name });
                showSuccess(`Switched active hostel to ${hostel_name}`);
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

    const handleQuickAddRoom = async (hostelId: number, hostelName: string) => {
        try {
            if (Number(hostelId) !== Number(user?.hostel_id)) {
                setSwitchingId(hostelId);
                const res = await api.put('/auth/active-hostel', { hostel_id: hostelId });
                if (res.data?.success) {
                    const { token } = res.data.data;
                    await updateTokenAndUser(token, { hostel_id: hostelId, hostel_name: hostelName });
                } else {
                    showError(res.data?.error || 'Failed to switch active hostel');
                    return;
                }
            }
            navigation.navigate('AddRoom');
        } catch (err: any) {
            console.error('Quick Add Room error:', err);
            showApiError(err, 'Failed to switch hostel for adding room.');
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
                    showError(res.data?.error || 'Failed to switch active hostel');
                    return;
                }
            }
            
            // Navigate directly to Reports after context is settled
            setTimeout(() => {
                navigation.navigate('Reports');
            }, 100);
        } catch (err: any) {
            console.error('Quick Reports error:', err);
            showApiError(err, 'Failed to switch hostel for viewing reports.');
        } finally {
            setSwitchingId(null);
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

    const handleViewDetails = (hostel: any) => {
        navigation.navigate('HostelDetails', { hostelId: hostel.hostel_id, hostel });
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
            <AppHeader 
                title="My Hostels" 
                alignLeft
                subtitle="Manage your hostel properties"
                showBack={true} 
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary]} />
                }
            >
                {loading && !refreshing ? (
                    <SkeletonList count={3} />
                ) : error && hostels.length === 0 ? (
                    <ErrorState onRetry={fetchHostels} />
                ) : hostels.length === 0 ? (
                    <EmptyState illustration="pg"
                        
                        title="No Hostels Yet"
                        subtitle="Add your first hostel to start managing tenants, rooms and finances."
                        actionLabel="Add Hostel"
                        onAction={() => navigation.navigate('AddHostel')}
                    />
                ) : (
                    hostels.map((h: any) => {
                        const isActive = Number(h.hostel_id) === Number(user?.hostel_id);
                        const isSwitching = switchingId === h.hostel_id;

                        // Color theme based on hostel type
                        const isGirls = h.hostel_type?.toLowerCase().includes('girl');
                        const isBoys = h.hostel_type?.toLowerCase().includes('boy');
                        const statusColor = isGirls ? '#DB2777' : (isBoys ? '#2563EB' : '#0EA5E9');
                        const statusBgColor = isGirls ? '#FDF2F8' : (isBoys ? '#EFF6FF' : '#F0F9FF');
                        const statusBorderColor = isGirls ? '#FBCFE8' : (isBoys ? '#BFDBFE' : '#BAE6FD');

                        const avatarBg = isGirls ? 'rgba(219, 39, 119, 0.15)' : (isBoys ? 'rgba(37, 99, 235, 0.15)' : 'rgba(14, 165, 233, 0.15)');
                        const avatarTextColor = statusColor;

                        return (
                            <TouchableOpacity
                                key={h.hostel_id}
                                style={[
                                    styles.premiumCard, 
                                    { 
                                        backgroundColor: theme.cardBg, 
                                        borderColor: isDark ? '#334155' : '#E2E8F0', 
                                        borderWidth: 1,
                                        elevation: 2,
                                        shadowColor: '#000',
                                        shadowOpacity: isDark ? 0.2 : 0.05,
                                        shadowRadius: 8,
                                        shadowOffset: { width: 0, height: 4 },
                                    }
                                ]}
                                onPress={() => isActive ? handleViewDetails(h) : handleSwitchHostel(h.hostel_id)}
                                activeOpacity={0.9}
                                disabled={isSwitching}
                            >
                                <View style={styles.cardInner}>
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.avatarBox, { backgroundColor: avatarBg }]}>
                                             {h.photo && typeof h.photo === 'string' && h.photo.trim() !== '' && h.photo.trim() !== 'null' && h.photo.startsWith('http') ? (
                                                 <Image source={{ uri: h.photo }} style={styles.avatarImg} />
                                             ) : (
                                                 <Text style={[styles.avatarTextInitials, { color: avatarTextColor }]}>
                                                     {getInitials(h.hostel_name)}
                                                 </Text>
                                             )}
                                        </View>
                                        <View style={styles.infoContainer}>
                                            <Text style={[styles.nameText, { color: theme.textPrimary }]} numberOfLines={1}>
                                                {h.hostel_name}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                                                <Ionicons name="location-outline" size={12} color={theme.textSecondary} style={{ marginRight: 3 }} />
                                                <Text style={[styles.subDetailText, { color: theme.textSecondary }]} numberOfLines={1}>
                                                    {(() => {
                                                        const addressParts = [h.address, h.city].filter(v => v && String(v).trim().length > 0 && String(v).trim() !== ',');
                                                        return addressParts.join(', ') || 'No address details';
                                                    })()}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                if (!isActive) handleSwitchHostel(h.hostel_id);
                                            }}
                                            style={[styles.statusBadge, { backgroundColor: isActive ? theme.success + '15' : 'rgba(148, 163, 184, 0.15)' }]}
                                            activeOpacity={isActive ? 1.0 : 0.7}
                                            disabled={isSwitching}
                                        >
                                            {isSwitching ? (
                                                <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 4, transform: [{ scale: 0.7 }] }} />
                                            ) : (
                                                <View style={[styles.statusDot, { backgroundColor: isActive ? theme.success : theme.textSecondary }]} />
                                            )}
                                            <Text style={[styles.statusBadgeText, { color: isActive ? theme.success : theme.textSecondary }]}>
                                                {isActive ? 'Active' : 'Switch Active'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                     {/* Hostel quick specs & contact row */}
                                     <View style={[styles.metaRow, { flexWrap: 'wrap', gap: 6 }]}>
                                         <View style={[styles.metaItem, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                             <Ionicons name="business-outline" size={13} color={theme.primary} />
                                             <Text style={[styles.metaText, { color: theme.textPrimary }]}>{h.hostel_type || 'Co-Living'}</Text>
                                         </View>
                                         <View style={[styles.metaItem, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                             <Ionicons name="layers-outline" size={13} color={theme.primary} />
                                             <Text style={[styles.metaText, { color: theme.textPrimary }]}>{h.total_floors || 1} Floors</Text>
                                         </View>
                                         {(h.contact_number || h.phone || user?.phone) ? (
                                             <View style={[styles.metaItem, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                                 <Ionicons name="call-outline" size={13} color={theme.primary} />
                                                 <Text style={[styles.metaText, { color: theme.textPrimary }]}>{h.contact_number || h.phone || user?.phone}</Text>
                                             </View>
                                         ) : null}
                                         <View style={[styles.metaItem, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                             <Ionicons name="wallet-outline" size={13} color="#10B981" />
                                             <Text style={[styles.metaText, { color: theme.textPrimary }]}>Fee: ₹{h.admission_fee || 0}</Text>
                                         </View>
                                         <View style={[styles.metaItem, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                             <Ionicons name="shield-checkmark-outline" size={13} color="#F59E0B" />
                                             <Text style={[styles.metaText, { color: theme.textPrimary }]}>Deposit: ₹{h.default_refundable_deposit || 0}</Text>
                                         </View>
                                         {h.hostel_code && (
                                             <TouchableOpacity 
                                                 onPress={(e) => {
                                                     e.stopPropagation();
                                                     handleCopyHostelCode(h.hostel_code, h.hostel_id);
                                                 }}
                                                 style={[styles.metaItem, { backgroundColor: copiedHostelId === h.hostel_id ? (isDark ? '#064E3B' : '#D1FAE5') : (isDark ? '#334155' : '#F1F5F9'), borderColor: copiedHostelId === h.hostel_id ? '#10B981' : 'transparent', borderWidth: 1 }]}
                                                 activeOpacity={0.7}
                                             >
                                                 <Ionicons name={copiedHostelId === h.hostel_id ? "checkmark-circle" : "key-outline"} size={13} color={copiedHostelId === h.hostel_id ? '#10B981' : theme.primary} />
                                                 <Text style={[styles.metaText, { color: copiedHostelId === h.hostel_id ? (isDark ? '#A7F3D0' : '#064E3B') : theme.textPrimary }]}>
                                                     {copiedHostelId === h.hostel_id ? 'Copied!' : h.hostel_code}
                                                 </Text>
                                             </TouchableOpacity>
                                         )}
                                     </View>

                                    <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

                                    <View style={styles.cardActions}>
                                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
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
                                                <Ionicons name="bar-chart-outline" size={14} color="#2563EB" />
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
                                                        backgroundColor: theme.primary + '15',
                                                        borderColor: theme.primary + '30',
                                                        borderWidth: 1
                                                    }
                                                ]}
                                            >
                                                <Text style={[styles.statusToggleTextNew, { color: theme.primary }]}>
                                                    View Details
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {hostels.length < 2 && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: theme.primary }]}
                    onPress={() => navigation.navigate('AddHostel')}
                    activeOpacity={0.85}
                >
                    <Plus color="#FFF" size={24} strokeWidth={3} />
                </TouchableOpacity>
            )}
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
    premiumCard: {
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardInner: {
        flex: 1,
        padding: 16,
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
    avatarImg: {
        width: 36,
        height: 36,
        borderRadius: 18,
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 14,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    metaText: {
        fontSize: 11,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        marginVertical: 14,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        rowGap: 8,
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
        bottom: 120,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        zIndex: 99999,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    modalOverlayFull: {
        flex: 1,
    },
    modalScrollContent: {
        padding: 20,
        paddingBottom: 40,
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
