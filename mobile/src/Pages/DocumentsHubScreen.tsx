import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Image,
    Modal,
    ActivityIndicator,
    Linking,
    Dimensions,
    Platform,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
    Search,
    X,
    Phone,
    MessageCircle,
    Eye,
    Download,
    Share2,
    Building2,
    ChevronDown,
    Filter,
    FileText,
    ShieldCheck,
    AlertTriangle,
    Image as ImageIcon,
    RefreshCw,
    User,
    CheckCircle2,
    Layers,
} from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { getResolvedImageUrl } from '../utils/imageHelper';
import { downloadAndSaveFile } from '../utils/fileDownloader';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

const { width, height } = Dimensions.get('window');

interface TenantDocItem {
    student_id: number | string;
    full_name: string;
    phone: string;
    room_number?: string;
    bed_number?: string;
    floor_number?: string | number;
    status?: string;
    id_proof_type?: string;
    id_proof_number?: string;
    profile_photo?: string | null;
    aadhaar_front?: string | null;
    aadhaar_back?: string | null;
    id_proof_document?: string | null;
    hostel_id?: number | string;
}

export default function DocumentsHubScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { user, hostels = [], cycleHostels } = useAuth();
    const { showError, showSuccess, showApiError } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tenants, setTenants] = useState<TenantDocItem[]>([]);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'aadhaar' | 'id_proof' | 'photos' | 'missing'>('all');
    const [selectedHostelId, setSelectedHostelId] = useState<any>(user?.hostel_id || null);

    // Image preview modal state
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [previewImage, setPreviewImage] = useState<{ url: string; title: string; subtitle: string } | null>(null);

    useEffect(() => {
        if (user?.hostel_id && !selectedHostelId) {
            setSelectedHostelId(user.hostel_id);
        }
    }, [user?.hostel_id]);

    const fetchTenants = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const params: any = {};
            if (selectedHostelId) {
                params.hostelId = selectedHostelId;
            }

            const res = await api.get('/students', { params });
            if (res.data?.success) {
                const list: any[] = res.data.data || [];
                const formatted: TenantDocItem[] = list.map(item => {
                    const firstName = item.first_name || '';
                    const lastName = item.last_name || '';
                    const fullName = item.full_name || `${firstName} ${lastName}`.trim() || 'Resident';

                    return {
                        student_id: item.student_id || item.id,
                        full_name: fullName,
                        phone: item.phone || '',
                        room_number: item.room_number || item.room?.room_number || '',
                        bed_number: item.bed_number || item.bed?.bed_number || '',
                        floor_number: item.floor_number || item.room?.floor || '',
                        status: item.status || 'ACTIVE',
                        id_proof_type: item.id_proof_type || 'Aadhaar Card',
                        id_proof_number: item.id_proof_number || '',
                        profile_photo: item.profile_photo_url || item.photo || null,
                        aadhaar_front: item.id_proof_front_url || item.aadhaar_front || null,
                        aadhaar_back: item.id_proof_back_url || item.aadhaar_back || null,
                        id_proof_document: item.id_proof_document_url || item.id_proof || null,
                        hostel_id: item.hostel_id,
                    };
                });
                setTenants(formatted);
            }
        } catch (e: any) {
            showApiError(e, 'Failed to load documents');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, [selectedHostelId]);

    // ── Calculate Counts ──
    const counts = useMemo(() => {
        const total = tenants.length;
        const withAadhaar = tenants.filter(t => t.aadhaar_front || t.aadhaar_back).length;
        const withIdProof = tenants.filter(t => t.id_proof_document).length;
        const withPhotos = tenants.filter(t => t.profile_photo).length;
        const missingKyc = tenants.filter(t => !t.aadhaar_front && !t.aadhaar_back && !t.id_proof_document).length;
        const totalDocsCount = tenants.reduce((acc, t) => {
            let count = 0;
            if (t.profile_photo) count++;
            if (t.aadhaar_front) count++;
            if (t.aadhaar_back) count++;
            if (t.id_proof_document) count++;
            return acc + count;
        }, 0);

        return { total, withAadhaar, withIdProof, withPhotos, missingKyc, totalDocsCount };
    }, [tenants]);

    // ── Filtered List ──
    const filteredTenants = useMemo(() => {
        const q = search.toLowerCase().trim();
        return tenants.filter(t => {
            const matchSearch = !q ||
                t.full_name.toLowerCase().includes(q) ||
                t.phone.includes(q) ||
                (t.room_number && t.room_number.toLowerCase().includes(q)) ||
                (t.floor_number !== undefined && String(t.floor_number).toLowerCase().includes(q));

            if (!matchSearch) return false;

            if (activeTab === 'aadhaar') return Boolean(t.aadhaar_front || t.aadhaar_back);
            if (activeTab === 'id_proof') return Boolean(t.id_proof_document);
            if (activeTab === 'photos') return Boolean(t.profile_photo);
            if (activeTab === 'missing') return !t.aadhaar_front && !t.aadhaar_back && !t.id_proof_document;

            return true;
        });
    }, [tenants, search, activeTab]);

    // ── Action Handlers ──
    const handlePreview = (rawUrl: string | null | undefined, title: string, subtitle: string) => {
        const resolved = getResolvedImageUrl(rawUrl);
        if (!resolved) {
            showError('Document image is not available.');
            return;
        }
        setPreviewImage({ url: resolved, title, subtitle });
        setPreviewModalVisible(true);
    };

    const handleDownload = async (rawUrl: string | null | undefined, docLabel: string, tenantName: string) => {
        const resolved = getResolvedImageUrl(rawUrl);
        if (!resolved) {
            showError('Document URL is invalid.');
            return;
        }
        const cleanName = tenantName.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${cleanName}_${docLabel.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
        await downloadAndSaveFile(resolved, filename, 'image/jpeg');
    };

    const handleShare = async (rawUrl: string | null | undefined, docLabel: string, tenantName: string) => {
        const resolved = getResolvedImageUrl(rawUrl);
        if (!resolved) {
            showError('Document URL is invalid.');
            return;
        }
        try {
            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                showError('Sharing is not available on this device.');
                return;
            }

            const cleanName = tenantName.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${cleanName}_${docLabel.replace(/\s+/g, '_')}.jpg`;
            const destUri = `${FileSystem.cacheDirectory}${filename}`;

            const downloadResult = await FileSystem.downloadAsync(resolved, destUri);
            if (downloadResult.status === 200) {
                await Sharing.shareAsync(downloadResult.uri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: `Share ${tenantName}'s ${docLabel}`,
                });
            } else {
                showError('Failed to prepare document for sharing.');
            }
        } catch (e: any) {
            showError('Error sharing document.');
        }
    };

    const handleCall = (phone: string) => {
        if (!phone) return;
        Linking.openURL(`tel:${phone}`).catch(() => showError('Unable to launch phone dialer.'));
    };

    const handleWhatsApp = (phone: string, tenantName: string, missingType?: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        const message = missingType
            ? `Hello ${tenantName}, please upload your ${missingType} for your hostel KYC registration. Thank you!`
            : `Hello ${tenantName}, reaching out regarding your hostel residency documents.`;
        Linking.openURL(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`).catch(() => {
            showError('WhatsApp is not installed.');
        });
    };

    const renderDocThumbnail = (
        url: string | null | undefined,
        label: string,
        tenant: TenantDocItem,
        icon: string,
        badgeColor: string
    ) => {
        const resolved = getResolvedImageUrl(url);

        if (!resolved) {
            return (
                <View style={styles.missingDocBox}>
                    <View style={styles.missingIconWrap}>
                        <AlertTriangle size={16} color="#F59E0B" />
                    </View>
                    <Text style={styles.missingDocTitle}>{label}</Text>
                    <Text style={styles.missingDocSub}>Not Uploaded</Text>
                    <TouchableOpacity
                        style={styles.requestDocBtn}
                        onPress={() => handleWhatsApp(tenant.phone, tenant.full_name, label)}
                        activeOpacity={0.7}
                    >
                        <MessageCircle size={11} color="#0284C7" />
                        <Text style={styles.requestDocBtnText}>Request</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.docThumbnailCard}>
                <TouchableOpacity
                    style={styles.thumbnailImgWrap}
                    onPress={() => handlePreview(url, `${tenant.full_name}'s ${label}`, `Room ${tenant.room_number || 'N/A'}`)}
                    activeOpacity={0.88}
                >
                    <Image source={{ uri: resolved }} style={styles.thumbnailImg} resizeMode="cover" />
                    <View style={[styles.docTypeBadge, { backgroundColor: badgeColor }]}>
                        <Text style={styles.docTypeBadgeText}>{label}</Text>
                    </View>
                    <View style={styles.viewZoomOverlay}>
                        <Eye size={14} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>

                {/* Bottom Action Strip */}
                <View style={styles.thumbnailActions}>
                    <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handlePreview(url, `${tenant.full_name}'s ${label}`, `Room ${tenant.room_number || 'N/A'}`)}
                        activeOpacity={0.7}
                    >
                        <Eye size={13} color="#4F46E5" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleDownload(url, label, tenant.full_name)}
                        activeOpacity={0.7}
                    >
                        <Download size={13} color="#0284C7" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleShare(url, label, tenant.full_name)}
                        activeOpacity={0.7}
                    >
                        <Share2 size={13} color="#059669" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* ── App Header ── */}
            <AppHeader
                title="Documents & KYC Hub"
                subtitle="All tenant ID proofs & photos in one place"
                showBack={true}
            />

            {/* ── Search & Filter Tabs Section ── */}
            <View style={styles.topControlPanel}>
                {/* Search Bar */}
                <View style={styles.searchBarWrap}>
                    <Search size={16} color="#64748B" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by student, room, floor or phone..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
                            <X size={14} color="#64748B" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Horizontal Filter Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterTabsScroll}
                >
                    <TouchableOpacity
                        style={[styles.filterPill, activeTab === 'all' && styles.filterPillActive]}
                        onPress={() => setActiveTab('all')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.filterPillText, activeTab === 'all' && styles.filterPillTextActive]}>
                            All ({counts.total})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterPill, activeTab === 'aadhaar' && styles.filterPillActive]}
                        onPress={() => setActiveTab('aadhaar')}
                        activeOpacity={0.7}
                    >
                        <ShieldCheck size={13} color={activeTab === 'aadhaar' ? '#FFFFFF' : '#4F46E5'} />
                        <Text style={[styles.filterPillText, activeTab === 'aadhaar' && styles.filterPillTextActive]}>
                            Aadhaar ({counts.withAadhaar})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterPill, activeTab === 'id_proof' && styles.filterPillActive]}
                        onPress={() => setActiveTab('id_proof')}
                        activeOpacity={0.7}
                    >
                        <FileText size={13} color={activeTab === 'id_proof' ? '#FFFFFF' : '#0284C7'} />
                        <Text style={[styles.filterPillText, activeTab === 'id_proof' && styles.filterPillTextActive]}>
                            ID Proofs ({counts.withIdProof})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterPill, activeTab === 'photos' && styles.filterPillActive]}
                        onPress={() => setActiveTab('photos')}
                        activeOpacity={0.7}
                    >
                        <ImageIcon size={13} color={activeTab === 'photos' ? '#FFFFFF' : '#059669'} />
                        <Text style={[styles.filterPillText, activeTab === 'photos' && styles.filterPillTextActive]}>
                            Photos ({counts.withPhotos})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterPill,
                            activeTab === 'missing' && styles.filterPillActive,
                            counts.missingKyc > 0 && { borderColor: '#FECDD3' },
                        ]}
                        onPress={() => setActiveTab('missing')}
                        activeOpacity={0.7}
                    >
                        <AlertTriangle size={13} color={activeTab === 'missing' ? '#FFFFFF' : '#E11D48'} />
                        <Text
                            style={[
                                styles.filterPillText,
                                activeTab === 'missing' && styles.filterPillTextActive,
                                activeTab !== 'missing' && counts.missingKyc > 0 && { color: '#E11D48' },
                            ]}
                        >
                            Missing KYC ({counts.missingKyc})
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* ── Summary Stats Ribbon ── */}
            <View style={styles.statsRibbon}>
                <View style={styles.statCol}>
                    <Text style={styles.statNum}>{counts.total}</Text>
                    <Text style={styles.statLabel}>Tenants</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                    <Text style={[styles.statNum, { color: '#059669' }]}>{counts.totalDocsCount}</Text>
                    <Text style={styles.statLabel}>Total Files</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                    <Text style={[styles.statNum, { color: counts.missingKyc > 0 ? '#E11D48' : '#64748B' }]}>
                        {counts.missingKyc}
                    </Text>
                    <Text style={styles.statLabel}>Incomplete</Text>
                </View>
            </View>

            {/* ── Main Scroll View ── */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>Fetching documents & ID proofs...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.mainScroll}
                    contentContainerStyle={[
                        styles.mainScrollContent,
                        { paddingBottom: Math.max(insets.bottom + 24, 40) },
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => fetchTenants(true)} colors={['#4F46E5']} />
                    }
                >
                    {filteredTenants.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <View style={styles.emptyIconBox}>
                                <FileText size={36} color="#94A3B8" />
                            </View>
                            <Text style={styles.emptyStateTitle}>No Documents Found</Text>
                            <Text style={styles.emptyStateSubtitle}>
                                {search.trim()
                                    ? `No residents matching "${search.trim()}"`
                                    : activeTab === 'missing'
                                    ? 'Great job! All residents have uploaded their KYC proofs.'
                                    : 'No resident documents uploaded for this filter.'}
                            </Text>
                        </View>
                    ) : (
                        filteredTenants.map(tenant => {
                            const hasDocs = tenant.profile_photo || tenant.aadhaar_front || tenant.aadhaar_back || tenant.id_proof_document;

                            return (
                                <View key={tenant.student_id} style={styles.tenantCard}>
                                    {/* Tenant Info Header */}
                                    <View style={styles.tenantHeaderRow}>
                                        <View style={styles.tenantAvatarBox}>
                                            {tenant.profile_photo ? (
                                                <Image
                                                    source={{ uri: getResolvedImageUrl(tenant.profile_photo)! }}
                                                    style={styles.tenantAvatarImg}
                                                />
                                            ) : (
                                                <Text style={styles.avatarInitials}>
                                                    {tenant.full_name ? tenant.full_name[0].toUpperCase() : 'R'}
                                                </Text>
                                            )}
                                        </View>

                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={styles.tenantName} numberOfLines={1}>
                                                    {tenant.full_name}
                                                </Text>
                                                {hasDocs && (
                                                    <CheckCircle2 size={14} color="#059669" />
                                                )}
                                            </View>

                                            <View style={styles.badgesRow}>
                                                {tenant.room_number ? (
                                                    <View style={styles.roomPill}>
                                                        <Text style={styles.roomPillText}>
                                                            Room {tenant.room_number} {tenant.bed_number ? `• Bed ${tenant.bed_number}` : ''}
                                                        </Text>
                                                    </View>
                                                ) : null}

                                                {tenant.floor_number !== undefined && tenant.floor_number !== '' ? (
                                                    <View style={styles.floorPill}>
                                                        <Text style={styles.floorPillText}>Floor {tenant.floor_number}</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>

                                        {/* Quick Call & WhatsApp buttons */}
                                        <View style={styles.quickContactRow}>
                                            <TouchableOpacity
                                                style={[styles.contactBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                                                onPress={() => handleCall(tenant.phone)}
                                                activeOpacity={0.7}
                                            >
                                                <Phone size={13} color="#2563EB" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.contactBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                                                onPress={() => handleWhatsApp(tenant.phone, tenant.full_name)}
                                                activeOpacity={0.7}
                                            >
                                                <MessageCircle size={13} color="#059669" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Document Cards Grid - Clean 3 Documents Layout */}
                                    <View style={styles.docsGridRow}>
                                        {renderDocThumbnail(
                                            tenant.aadhaar_front,
                                            'ID Proof (Front)',
                                            tenant,
                                            'shield-checkmark',
                                            '#4F46E5'
                                        )}
                                        {renderDocThumbnail(
                                            tenant.aadhaar_back,
                                            'ID Proof (Back)',
                                            tenant,
                                            'shield-checkmark',
                                            '#6366F1'
                                        )}
                                    </View>

                                    <View style={[styles.docsGridRow, { marginTop: 8 }]}>
                                        {renderDocThumbnail(
                                            tenant.profile_photo,
                                            'Resident Photo',
                                            tenant,
                                            'image',
                                            '#059669'
                                        )}
                                        {tenant.id_proof_document ? (
                                            renderDocThumbnail(
                                                tenant.id_proof_document,
                                                'Other Document',
                                                tenant,
                                                'document-text',
                                                '#0284C7'
                                            )
                                        ) : null}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}

            {/* ── High-Resolution Image Preview Modal ── */}
            <Modal
                visible={previewModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPreviewModalVisible(false)}
            >
                <View style={styles.previewModalOverlay}>
                    {/* Header */}
                    <View style={[styles.previewHeader, { paddingTop: Math.max(insets.top + 10, 20) }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.previewTitleText} numberOfLines={1}>
                                {previewImage?.title || 'Document Preview'}
                            </Text>
                            <Text style={styles.previewSubText}>
                                {previewImage?.subtitle || 'KYC Document'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.previewCloseBtn}
                            onPress={() => setPreviewModalVisible(false)}
                            activeOpacity={0.7}
                        >
                            <X size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Image View */}
                    <View style={styles.previewImageContainer}>
                        {previewImage?.url ? (
                            <Image
                                source={{ uri: previewImage.url }}
                                style={styles.previewFullImg}
                                resizeMode="contain"
                            />
                        ) : (
                            <ActivityIndicator color="#FFFFFF" size="large" />
                        )}
                    </View>

                    {/* Bottom Action Bar */}
                    <View style={[styles.previewBottomBar, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
                        <TouchableOpacity
                            style={styles.previewActionBtn}
                            onPress={() => {
                                if (previewImage?.url) {
                                    downloadAndSaveFile(previewImage.url, `${previewImage.title.replace(/\s+/g, '_')}.jpg`, 'image/jpeg');
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <Download size={18} color="#FFFFFF" />
                            <Text style={styles.previewActionBtnText}>Save to Device</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.previewActionBtn, { backgroundColor: '#059669' }]}
                            onPress={async () => {
                                if (previewImage?.url) {
                                    try {
                                        const destUri = `${FileSystem.cacheDirectory}shared_doc.jpg`;
                                        await FileSystem.downloadAsync(previewImage.url, destUri);
                                        await Sharing.shareAsync(destUri, { mimeType: 'image/jpeg' });
                                    } catch (_) {
                                        showError('Could not share document.');
                                    }
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <Share2 size={18} color="#FFFFFF" />
                            <Text style={styles.previewActionBtnText}>Share Document</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },

    // Top Controls
    topControlPanel: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    searchBarWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        height: 42,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13.5,
        color: '#0F172A',
        fontWeight: '500',
    },
    clearSearchBtn: {
        padding: 4,
    },
    filterTabsScroll: {
        gap: 8,
        paddingTop: 10,
        paddingBottom: 2,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterPillActive: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    filterPillTextActive: {
        color: '#FFFFFF',
    },

    // Stats Ribbon
    statsRibbon: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    statCol: {
        alignItems: 'center',
    },
    statNum: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F172A',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 1,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
    },

    // Main List
    mainScroll: {
        flex: 1,
    },
    mainScrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 13.5,
        fontWeight: '600',
        color: '#64748B',
    },

    // Empty State
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    emptyIconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    emptyStateTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 4,
    },
    emptyStateSubtitle: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
    },

    // Tenant Card
    tenantCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    tenantHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    tenantAvatarBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    tenantAvatarImg: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarInitials: {
        fontSize: 17,
        fontWeight: '900',
        color: '#4F46E5',
    },
    tenantName: {
        fontSize: 14.5,
        fontWeight: '800',
        color: '#0F172A',
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 3,
    },
    roomPill: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    roomPillText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#2563EB',
    },
    floorPill: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    floorPillText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#475569',
    },
    quickContactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    contactBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },

    // Document Grid Cards
    docsGridRow: {
        flexDirection: 'row',
        gap: 8,
    },
    docThumbnailCard: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    thumbnailImgWrap: {
        height: 84,
        position: 'relative',
        backgroundColor: '#E2E8F0',
    },
    thumbnailImg: {
        width: '100%',
        height: '100%',
    },
    docTypeBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    docTypeBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    viewZoomOverlay: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbnailActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 6,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    actionIconBtn: {
        padding: 4,
    },

    // Missing Doc Box
    missingDocBox: {
        flex: 1,
        height: 116,
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
    },
    missingIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    missingDocTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#92400E',
        textAlign: 'center',
    },
    missingDocSub: {
        fontSize: 9.5,
        color: '#B45309',
        marginBottom: 6,
    },
    requestDocBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    requestDocBtnText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#0284C7',
    },

    // High-Resolution Preview Modal
    previewModalOverlay: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    previewTitleText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#F8FAFC',
    },
    previewSubText: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    previewCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewImageContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#020617',
    },
    previewFullImg: {
        width: width,
        height: height * 0.72,
    },
    previewBottomBar: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 14,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    previewActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#4F46E5',
        paddingVertical: 12,
        borderRadius: 12,
    },
    previewActionBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
});
