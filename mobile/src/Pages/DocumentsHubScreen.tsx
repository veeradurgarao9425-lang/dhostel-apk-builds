import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    ActivityIndicator,
    Modal,
    Dimensions,
    Linking,
    StatusBar,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
    Search,
    ShieldCheck,
    Phone,
    MessageCircle,
    Download,
    Eye,
    ChevronDown,
    Building2,
    Users,
    Briefcase,
    Bed,
    UserCheck,
    AlertTriangle,
    X,
    CheckCircle2,
    Share2,
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

interface DocEntityItem {
    id: number | string;
    full_name: string;
    phone: string;
    category: 'TENANT' | 'GUEST' | 'STAFF';
    category_label: string;
    role_or_room: string;
    room_number?: string;
    bed_number?: string;
    floor_number?: string | number;
    status?: string;
    id_proof_type?: string;
    id_proof_number?: string;
    profile_photo?: string | null;
    aadhaar_front?: string | null;
    aadhaar_back?: string | null;
    hostel_id?: number | string;
}

export default function DocumentsHubScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { user, hostels = [], cycleHostels } = useAuth();
    const { showError, showSuccess, showApiError } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [entities, setEntities] = useState<DocEntityItem[]>([]);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'tenants' | 'guests' | 'staff' | 'missing'>('all');
    const [selectedHostelId, setSelectedHostelId] = useState<any>(user?.hostel_id || null);

    // Image preview modal state
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [previewImage, setPreviewImage] = useState<{ url: string; title: string; subtitle: string } | null>(null);

    useEffect(() => {
        if (user?.hostel_id && !selectedHostelId) {
            setSelectedHostelId(user.hostel_id);
        }
    }, [user?.hostel_id]);

    const fetchAllDocuments = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const params: any = {};
            if (selectedHostelId) {
                params.hostelId = selectedHostelId;
            }

            const [studentsRes, guestsRes, staffRes] = await Promise.allSettled([
                api.get('/students', { params }),
                api.get('/guests', { params }),
                api.get('/staff', { params }),
            ]);

            const allList: DocEntityItem[] = [];

            // 1. Map Students / Residents
            if (studentsRes.status === 'fulfilled' && studentsRes.value.data?.success) {
                const list: any[] = studentsRes.value.data.data || [];
                list.forEach(item => {
                    const firstName = item.first_name || '';
                    const lastName = item.last_name || '';
                    const fullName = item.full_name || `${firstName} ${lastName}`.trim() || 'Resident';
                    allList.push({
                        id: `student_${item.student_id || item.id}`,
                        full_name: fullName,
                        phone: item.phone || '',
                        category: 'TENANT',
                        category_label: 'Resident',
                        role_or_room: item.room_number ? `Room ${item.room_number}${item.bed_number ? ` • Bed ${item.bed_number}` : ''}` : 'Resident',
                        room_number: item.room_number || item.room?.room_number || '',
                        bed_number: item.bed_number || item.bed?.bed_number || '',
                        floor_number: item.floor_number || item.room?.floor || '',
                        status: item.status || 'ACTIVE',
                        id_proof_type: item.id_proof_type || 'Aadhaar Card',
                        id_proof_number: item.id_proof_number || '',
                        profile_photo: item.profile_photo_url || item.photo || null,
                        aadhaar_front: item.id_proof_front_url || item.aadhaar_front || item.id_proof_document_url || item.id_proof || null,
                        aadhaar_back: item.id_proof_back_url || item.aadhaar_back || null,
                        hostel_id: item.hostel_id,
                    });
                });
            }

            // 2. Map Guests
            if (guestsRes.status === 'fulfilled' && guestsRes.value.data?.success) {
                const list: any[] = guestsRes.value.data.data || [];
                list.forEach(item => {
                    allList.push({
                        id: `guest_${item.guest_id || item.id}`,
                        full_name: item.full_name || 'Guest',
                        phone: item.phone || '',
                        category: 'GUEST',
                        category_label: 'Daily Guest',
                        role_or_room: item.room_number ? `Room ${item.room_number} (Guest)` : 'Short-Stay Guest',
                        room_number: item.room_number || '',
                        status: item.status || 'staying',
                        id_proof_type: item.id_proof_type || 'ID Proof',
                        id_proof_number: item.id_proof_number || '',
                        profile_photo: item.profile_photo_url || null,
                        aadhaar_front: item.id_proof_front_url || null,
                        aadhaar_back: item.id_proof_back_url || null,
                        hostel_id: item.hostel_id,
                    });
                });
            }

            // 3. Map Staff Members
            if (staffRes.status === 'fulfilled' && staffRes.value.data?.success) {
                const list: any[] = staffRes.value.data.data || [];
                list.forEach(item => {
                    allList.push({
                        id: `staff_${item.staff_id || item.id}`,
                        full_name: item.full_name || 'Staff Member',
                        phone: item.phone || '',
                        category: 'STAFF',
                        category_label: 'Staff Member',
                        role_or_room: item.role ? `${item.role}` : 'Staff',
                        status: item.status === 1 || item.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
                        id_proof_type: 'Aadhaar Card',
                        id_proof_number: item.aadhaar_number || '',
                        profile_photo: item.photo || null,
                        aadhaar_front: item.aadhaar_front || null,
                        aadhaar_back: item.aadhaar_back || null,
                        hostel_id: item.hostel_id,
                    });
                });
            }

            setEntities(allList);
        } catch (e: any) {
            showApiError(e, 'Failed to load documents');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllDocuments();
    }, [selectedHostelId]);

    // ── Calculate Counts ──
    const counts = useMemo(() => {
        const total = entities.length;
        const tenantsCount = entities.filter(t => t.category === 'TENANT').length;
        const guestsCount = entities.filter(t => t.category === 'GUEST').length;
        const staffCount = entities.filter(t => t.category === 'STAFF').length;
        const missingKyc = entities.filter(t => !t.aadhaar_front && !t.aadhaar_back).length;
        const totalDocsCount = entities.reduce((acc, t) => {
            let count = 0;
            if (t.profile_photo) count++;
            if (t.aadhaar_front) count++;
            if (t.aadhaar_back) count++;
            return acc + count;
        }, 0);

        return { total, tenants: tenantsCount, guests: guestsCount, staff: staffCount, missingKyc, totalDocsCount };
    }, [entities]);

    // ── Filtered List ──
    const filteredEntities = useMemo(() => {
        const q = search.toLowerCase().trim();
        return entities.filter(t => {
            const matchSearch = !q ||
                t.full_name.toLowerCase().includes(q) ||
                t.phone.includes(q) ||
                (t.room_number && t.room_number.toLowerCase().includes(q)) ||
                (t.role_or_room && t.role_or_room.toLowerCase().includes(q)) ||
                (t.floor_number !== undefined && String(t.floor_number).toLowerCase().includes(q));

            if (!matchSearch) return false;

            if (activeTab === 'tenants') return t.category === 'TENANT';
            if (activeTab === 'guests') return t.category === 'GUEST';
            if (activeTab === 'staff') return t.category === 'STAFF';
            if (activeTab === 'missing') return !t.aadhaar_front && !t.aadhaar_back;

            return true;
        });
    }, [entities, search, activeTab]);

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

    const handleDownload = async (rawUrl: string | null | undefined, docLabel: string, personName: string) => {
        const resolved = getResolvedImageUrl(rawUrl);
        if (!resolved) {
            showError('Document URL is invalid.');
            return;
        }
        const cleanName = personName.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${cleanName}_${docLabel.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
        await downloadAndSaveFile(resolved, filename, 'image/jpeg');
    };

    const handleShare = async (rawUrl: string | null | undefined, docLabel: string, personName: string) => {
        try {
            const resolved = getResolvedImageUrl(rawUrl);
            if (!resolved) {
                showError('Document URL is not accessible.');
                return;
            }
            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                showError('Sharing is not available on this device.');
                return;
            }

            const cleanPrefix = (personName || 'document').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
            const safeDocLabel = (docLabel || 'KYC').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
            const filename = `${cleanPrefix}_${safeDocLabel}_${Date.now()}.jpg`;
            const dest = `${FileSystem.cacheDirectory}${filename}`;
            const downloadRes = await FileSystem.downloadAsync(resolved, dest);

            if (downloadRes.status === 200) {
                await Sharing.shareAsync(downloadRes.uri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: `Share ${personName || ''} ${docLabel || 'Document'}`.trim(),
                    UTI: 'public.jpeg',
                });
            } else {
                showError('Could not prepare file for sharing.');
            }
        } catch (e: any) {
            console.error('Share error:', e);
            showError('Unable to share: ' + (e?.message || 'Please try again.'));
        }
    };

    const handleCall = (phone: string) => {
        if (!phone) return;
        Linking.openURL(`tel:${phone}`).catch(() => showError('Unable to launch phone dialer.'));
    };

    const handleWhatsApp = (phone: string, personName: string, missingType?: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        const message = missingType
            ? `Hello ${personName}, please upload your ${missingType} for your hostel registration. Thank you!`
            : `Hello ${personName}, reaching out regarding your hostel records and documents.`;
        Linking.openURL(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`).catch(() => {
            showError('WhatsApp is not installed.');
        });
    };

    const renderDocThumbnail = (
        url: string | null | undefined,
        label: string,
        entity: DocEntityItem,
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
                        onPress={() => handleWhatsApp(entity.phone, entity.full_name, label)}
                        activeOpacity={0.7}
                    >
                        <MessageCircle size={11} color="#0284C7" />
                        <Text style={styles.requestDocBtnText}>Request</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <TouchableOpacity
                style={styles.docThumbnailCard}
                onPress={() => handlePreview(url, `${entity.full_name}'s ${label}`, entity.role_or_room)}
                activeOpacity={0.85}
            >
                <View style={styles.thumbnailImgWrap}>
                    <Image source={{ uri: resolved }} style={styles.thumbnailImg} resizeMode="cover" />
                    <View style={[styles.docTypeBadge, { backgroundColor: badgeColor }]}>
                        <Text style={styles.docTypeBadgeText}>{label}</Text>
                    </View>
                    <View style={styles.viewZoomOverlay}>
                        <Eye size={13} color="#FFFFFF" />
                    </View>
                </View>

                {/* Bottom Clean Tap Bar */}
                <View style={styles.thumbnailActions}>
                    <Eye size={12} color="#4F46E5" />
                    <Text style={styles.actionIconBtnText} numberOfLines={1}>View Proof</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── App Header ── */}
            <AppHeader
                title="KYC & Documents Hub"
                subtitle="Resident, Guest & Staff identification proofs"
                showBack={true}
            />

            {/* ── Search & Filter Bar ── */}
            <View style={styles.filterSection}>
                {/* Search Input */}
                <View style={styles.searchBar}>
                    <Search size={16} color="#64748B" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, room, role, or phone..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                        clearButtonMode="while-editing"
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                            <X size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Filter Pills */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterPillsScroll}
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
                        style={[styles.filterPill, activeTab === 'tenants' && styles.filterPillActive]}
                        onPress={() => setActiveTab('tenants')}
                        activeOpacity={0.7}
                    >
                        <Users size={13} color={activeTab === 'tenants' ? '#FFFFFF' : '#4F46E5'} />
                        <Text style={[styles.filterPillText, activeTab === 'tenants' && styles.filterPillTextActive]}>
                            Residents ({counts.tenants})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterPill, activeTab === 'guests' && styles.filterPillActive]}
                        onPress={() => setActiveTab('guests')}
                        activeOpacity={0.7}
                    >
                        <Bed size={13} color={activeTab === 'guests' ? '#FFFFFF' : '#D97706'} />
                        <Text style={[styles.filterPillText, activeTab === 'guests' && styles.filterPillTextActive]}>
                            Guests ({counts.guests})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterPill, activeTab === 'staff' && styles.filterPillActive]}
                        onPress={() => setActiveTab('staff')}
                        activeOpacity={0.7}
                    >
                        <Briefcase size={13} color={activeTab === 'staff' ? '#FFFFFF' : '#059669'} />
                        <Text style={[styles.filterPillText, activeTab === 'staff' && styles.filterPillTextActive]}>
                            Staff ({counts.staff})
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
                    <Text style={styles.statLabel}>Total Profiles</Text>
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
                    <Text style={styles.statLabel}>Missing Proofs</Text>
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
                    style={styles.scrollArea}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {filteredEntities.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Users size={32} color="#94A3B8" />
                            </View>
                            <Text style={styles.emptyTitle}>No Profiles Found</Text>
                            <Text style={styles.emptySubtitle}>
                                {search.trim()
                                    ? `No profiles matching "${search.trim()}"`
                                    : activeTab === 'missing'
                                    ? 'Great job! All profiles have uploaded their KYC proofs.'
                                    : 'No documents uploaded for this category.'}
                            </Text>
                        </View>
                    ) : (
                        filteredEntities.map(entity => {
                            const hasDocs = entity.profile_photo || entity.aadhaar_front || entity.aadhaar_back;
                            const isTenant = entity.category === 'TENANT';
                            const isGuest = entity.category === 'GUEST';
                            const isStaff = entity.category === 'STAFF';

                            return (
                                <View key={entity.id} style={styles.tenantCard}>
                                    {/* Info Header */}
                                    <View style={styles.tenantHeaderRow}>
                                        <View style={styles.tenantAvatarBox}>
                                            {entity.profile_photo ? (
                                                <Image
                                                    source={{ uri: getResolvedImageUrl(entity.profile_photo)! }}
                                                    style={styles.tenantAvatarImg}
                                                />
                                            ) : (
                                                <Text style={styles.avatarInitials}>
                                                    {entity.full_name ? entity.full_name[0].toUpperCase() : 'U'}
                                                </Text>
                                            )}
                                        </View>

                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={styles.tenantName} numberOfLines={1}>
                                                    {entity.full_name}
                                                </Text>
                                                {hasDocs && (
                                                    <CheckCircle2 size={14} color="#059669" />
                                                )}
                                            </View>

                                            <View style={styles.badgesRow}>
                                                {/* Role / Category Badge */}
                                                <View style={[
                                                    styles.categoryBadge,
                                                    isTenant && { backgroundColor: '#EDE9FE' },
                                                    isGuest && { backgroundColor: '#FEF3C7' },
                                                    isStaff && { backgroundColor: '#E0F2FE' },
                                                ]}>
                                                    <Text style={[
                                                        styles.categoryBadgeText,
                                                        isTenant && { color: '#7C3AED' },
                                                        isGuest && { color: '#D97706' },
                                                        isStaff && { color: '#0284C7' },
                                                    ]}>
                                                        {entity.category_label}
                                                    </Text>
                                                </View>

                                                {/* Room / Role Sub-Pill */}
                                                <View style={styles.roomPill}>
                                                    <Text style={styles.roomPillText}>
                                                        {entity.role_or_room}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Quick Call & WhatsApp buttons */}
                                        <View style={styles.quickContactRow}>
                                            <TouchableOpacity
                                                style={[styles.contactBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                                                onPress={() => handleCall(entity.phone)}
                                                activeOpacity={0.7}
                                            >
                                                <Phone size={13} color="#2563EB" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.contactBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                                                onPress={() => handleWhatsApp(entity.phone, entity.full_name)}
                                                activeOpacity={0.7}
                                            >
                                                <MessageCircle size={13} color="#059669" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Document Cards Grid - Clean 3 Documents Layout */}
                                    <View style={styles.docsGridRow}>
                                        {renderDocThumbnail(
                                            entity.aadhaar_front,
                                            'ID Proof (Front)',
                                            entity,
                                            'shield-checkmark',
                                            '#4F46E5'
                                        )}
                                        {renderDocThumbnail(
                                            entity.aadhaar_back,
                                            'ID Proof (Back)',
                                            entity,
                                            'shield-checkmark',
                                            '#6366F1'
                                        )}
                                        {renderDocThumbnail(
                                            entity.profile_photo,
                                            'Photo',
                                            entity,
                                            'image',
                                            '#059669'
                                        )}
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
                                style={styles.fullPreviewImage}
                                resizeMode="contain"
                            />
                        ) : null}
                    </View>

                    {/* Bottom Action Footer: Save and Share Buttons */}
                    <View style={[styles.previewFooter, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
                        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                            <TouchableOpacity
                                style={[styles.previewFooterBtn, { backgroundColor: '#4F46E5', flex: 1 }]}
                                onPress={() => {
                                    if (previewImage?.url) {
                                        downloadAndSaveFile(previewImage.url, `${previewImage.title.replace(/\s+/g, '_')}.jpg`, 'image/jpeg');
                                    }
                                }}
                                activeOpacity={0.75}
                            >
                                <Download size={17} color="#FFFFFF" />
                                <Text style={styles.previewFooterBtnText}>Save</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.previewFooterBtn, { backgroundColor: '#059669', flex: 1 }]}
                                onPress={() => {
                                    if (previewImage?.url) {
                                        handleShare(previewImage.url, 'Document', previewImage.title);
                                    }
                                }}
                                activeOpacity={0.75}
                            >
                                <Share2 size={17} color="#FFFFFF" />
                                <Text style={styles.previewFooterBtnText}>Share</Text>
                            </TouchableOpacity>
                        </View>
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

    // Search and Filters
    filterSection: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        gap: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: '#0F172A',
        paddingVertical: 0,
    },
    filterPillsScroll: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 2,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterPillActive: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
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
        marginHorizontal: 14,
        marginTop: 10,
        marginBottom: 6,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
    },
    statCol: {
        alignItems: 'center',
    },
    statNum: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 1,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
    },

    // Scroll Area
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 14,
        paddingTop: 8,
        gap: 12,
    },

    // Tenant Card
    tenantCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 2,
        shadowColor: '#0F172A',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        gap: 12,
    },
    tenantHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tenantAvatarBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#E0E7FF',
    },
    tenantAvatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarInitials: {
        fontSize: 15,
        fontWeight: '800',
        color: '#4F46E5',
    },
    tenantName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
        flexShrink: 1,
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 3,
        flexWrap: 'wrap',
    },
    categoryBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    categoryBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    roomPill: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    roomPillText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#334155',
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
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 7,
        gap: 4,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    actionIconBtnText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#4F46E5',
    },

    // Missing Document Placeholder Box
    missingDocBox: {
        flex: 1,
        height: 118,
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
        gap: 2,
    },
    missingIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    missingDocTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#92400E',
        textAlign: 'center',
    },
    missingDocSub: {
        fontSize: 9,
        fontWeight: '600',
        color: '#D97706',
    },
    requestDocBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginTop: 4,
    },
    requestDocBtnText: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#0284C7',
    },

    // Loading & Empty States
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    loadingText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 10,
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    emptySubtitle: {
        fontSize: 12.5,
        color: '#64748B',
        textAlign: 'center',
        paddingHorizontal: 30,
        lineHeight: 18,
    },

    // Fullscreen Preview Modal
    previewModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'space-between',
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    previewTitleText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
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
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewImageContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
    fullPreviewImage: {
        width: width,
        height: height * 0.7,
    },
    previewFooter: {
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    previewFooterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#4F46E5',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
    },
    previewFooterBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
});
