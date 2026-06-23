import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    StatusBar,
    Image,
    Linking,
    LayoutAnimation,
    Platform,
    UIManager,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Search, Users, Plus, Phone, MessageCircle, X, Calendar } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import api from '../services/api';
import { ProfileMenu } from '../components/ProfileMenu';
import { HeaderNotification } from '../components/HeaderNotification';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../components/ui/EmptyState';
import { AppHeader } from '../components/AppHeader';
import { LoadMoreFooter } from '../components/ui/LoadMoreFooter';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { COLORS } from '../theme/index';
import { toLocalDateStr } from '../utils/dateUtils';


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PAGE_SIZE = 10;
type TabType = 'Active' | 'Inactive' | 'PreBooked' | 'QRRegister' | 'All';

const TABS: { key: TabType; label: string }[] = [
    { key: 'Active', label: 'Active' },
    { key: 'PreBooked', label: 'Pre-Booked' },
    { key: 'QRRegister', label: 'QR Signups' },
    { key: 'Inactive', label: 'Inactive' },
    { key: 'All', label: 'Total' }
];

// ─── Memoized Student Card ────────────────────────────────────────────────────
interface StudentCardProps {
    student: any;
    onPress: (id: number) => void;
    onWhatsApp: (phone: string) => void;
    onCall: (phone: string) => void;
    onToggle: (student: any) => void;
    onAllocateRoom: (student: any) => void;
}

const StudentCard = React.memo(({ student, onPress, onWhatsApp, onCall, onToggle, onAllocateRoom }: StudentCardProps) => {
    const { theme, isDark } = useTheme();
    const { t } = useTranslation();
    const isActive = student.status === 1;
    const isPreBooked = student.status === 2;
    const isQRSignup = student.status === 3;

    const getInitials = (first: string, last: string) => {
        const f = first ? first.charAt(0).toUpperCase() : '';
        const l = last ? last.charAt(0).toUpperCase() : '';
        return (f + l).trim() || '?';
    };

    // Determine colors based on status dynamically from theme
    let statusColor = theme.error;
    let statusLabel = t('students.inactive');

    if (isActive) {
        statusColor = theme.success;
        statusLabel = t('students.active');
    } else if (isPreBooked) {
        statusColor = theme.warning;
        statusLabel = t('students.prebooked');
    } else if (isQRSignup) {
        statusColor = theme.primary;
        statusLabel = t('students.qrSignup');
    }


    const badgeBg = statusColor + '15';
    const badgeText = statusColor;
    const avatarBg = statusColor + '20';
    const avatarTextColor = statusColor;

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
            onPress={() => onPress(student.student_id)}
            activeOpacity={0.8}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.avatarBox, { backgroundColor: avatarBg }]}>
                    {student.photo ? (
                        <Image source={{ uri: student.photo }} style={styles.avatarImg} fadeDuration={0} />
                    ) : (
                        <Text style={[styles.avatarTextInitials, { color: avatarTextColor }]}>
                            {getInitials(student.first_name, student.last_name)}
                        </Text>
                    )}
                </View>
                <View style={styles.infoContainer}>
                    <Text style={[styles.nameText, { color: theme.textPrimary }]} numberOfLines={1}>
                        {student.first_name} {student.last_name || ''}
                    </Text>
                    <Text style={[styles.subDetailText, { color: theme.textSecondary }]}>
                        {t('students.room')} {student.room_number || 'N/A'} • {student.phone || t('students.noPhone')}
                    </Text>

                    {isActive && !student.room_id && (
                        <TouchableOpacity
                            style={styles.allocateChip}
                            onPress={() => onAllocateRoom(student)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.allocateChipText}>⚠ {t('students.allocateRoom', 'Allocate Room')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.statusBadgeText, { color: badgeText }]}>
                        {statusLabel}
                    </Text>
                </View>
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

            <View style={styles.cardActions}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => onWhatsApp(student.phone)}
                        style={[styles.actionBtnIcon, { backgroundColor: isDark ? '#334155' : '#F8FAFC', borderColor: isDark ? '#475569' : '#E2E8F0' }]}
                    >
                        <MessageCircle size={14} color="#25D366" />
                        <Text style={[styles.actionBtnIconText, { color: theme.textSecondary }]}>{t('students.whatsapp')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onCall(student.phone)}
                        style={[styles.actionBtnIcon, { backgroundColor: isDark ? '#334155' : '#F8FAFC', borderColor: isDark ? '#475569' : '#E2E8F0' }]}
                    >
                        <Phone size={14} color="#0EA5E9" />
                        <Text style={[styles.actionBtnIconText, { color: theme.textSecondary }]}>{t('students.call')}</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    onPress={() => onToggle(student)}
                    style={[
                        styles.statusToggleBtnNew,
                        {
                            backgroundColor: isQRSignup ? theme.primary + '15' : isPreBooked ? theme.warning + '15' : isActive ? theme.error + '15' : theme.success + '15',
                            borderColor: isQRSignup ? theme.primary + '30' : isPreBooked ? theme.warning + '30' : isActive ? theme.error + '30' : theme.success + '30',
                            borderWidth: 1
                        }
                    ]}
                >
                    {isQRSignup ? (
                        <Text style={[styles.statusToggleTextNew, { color: theme.primary }]}>{t('students.checkIn')}</Text>
                    ) : isPreBooked ? (
                        <Text style={[styles.statusToggleTextNew, { color: theme.warning }]}>{t('students.checkIn')}</Text>
                    ) : (
                        <Text style={[styles.statusToggleTextNew, { color: isActive ? theme.error : theme.success }]}>
                            {isActive ? t('students.deactivate') : t('students.activate')}
                        </Text>
                    )}

                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
});

// ─── List Footer ──────────────────────────────────────────────────────────────
// Spinner while loading more. "All N students loaded" pill when done.
const ListFooter = React.memo(({ loading, hasMore, total }: {
    loading: boolean;
    hasMore: boolean;
    total: number;
}) => {
    const { t } = useTranslation();
    if (loading) {
        return <ActivityIndicator size="small" color="#94A3B8" style={{ marginVertical: 20 }} />;
    }
    if (!hasMore && total > 0) {
        return (
            <View style={footerStyles.container}>
                <View style={footerStyles.line} />
                <View style={footerStyles.pill}>
                    <Users size={12} color="#94A3B8" />
                    <Text style={footerStyles.text}>{t('students.allLoaded', { count: total })}</Text>
                </View>
                <View style={footerStyles.line} />
            </View>
        );
    }
    return null;
});


const footerStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        marginHorizontal: 12,
    },
    text: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StudentsScreen({ navigation, route }: any) {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { showApiError, showSuccess } = useToast();
    const { t } = useTranslation();


    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('Active');
    const [initialLoading, setInitialLoading] = useState(true);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [counts, setCounts] = useState({ active: 0, inactive: 0, prebooked: 0, qrRegister: 0, total: 0 });
    const [dateFilter, setDateFilter] = useState<Date | null>(null);
    const [startDateFilter, setStartDateFilter] = useState<string | null>(null);
    const [endDateFilter, setEndDateFilter] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [backgroundLoading, setBackgroundLoading] = useState(false);
    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        visible: boolean;
        student: any | null;
        targetStatus: number;
        title: string;
        message: string;
    }>({ visible: false, student: null, targetStatus: 1, title: '', message: '' });

    // Update activeTab if passed via params
    useEffect(() => {
        if (route?.params?.filter) {
            setActiveTab(route.params.filter);
            navigation.setParams({ filter: undefined });
        }
        if (route?.params?.startDate && route?.params?.endDate) {
            setStartDateFilter(route.params.startDate);
            setEndDateFilter(route.params.endDate);
            setDateFilter(null);
            setActiveTab('Active');
            navigation.setParams({ startDate: undefined, endDate: undefined });
        }
    }, [route?.params]);

    const abortRef = useRef<AbortController | null>(null);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // ── Debounce search ───────────────────────────────────────────────────
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 350);
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
    }, [search]);

    // ── Core fetch ────────────────────────────────────────────────────────
    const fetchPage = useCallback(async (pageNum: number, isSilent = false) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            if (pageNum === 1) {
                if (!isSilent) {
                    setInitialLoading(true);
                    setAllStudents([]);
                } else if (allStudents.length > 0) {
                    setBackgroundLoading(true);
                }
            } else {
                setLoadingMore(true);
            }

            const statusParam = activeTab === 'Active' ? 1 : activeTab === 'Inactive' ? 0 : activeTab === 'PreBooked' ? 2 : activeTab === 'QRRegister' ? 3 : undefined;
            const params: Record<string, any> = { page: pageNum, limit: PAGE_SIZE };
            if (debouncedSearch) params.search = debouncedSearch;
            if (statusParam !== undefined) params.status = statusParam;
            if (dateFilter) {
                params.date = toLocalDateStr(dateFilter);
            } else if (startDateFilter && endDateFilter) {
                params.startDate = startDateFilter;
                params.endDate = endDateFilter;
            }

            const response = await api.get('/students', { params, signal: controller.signal });
            if (controller.signal.aborted) return;

            if (response.data.success) {
                const newData: any[] = response.data.data || [];
                if (newData.length < PAGE_SIZE) setHasMore(false);

                setAllStudents(prev => {
                    if (pageNum === 1) return newData;
                    // Deduplicate to prevent duplicate key errors on re-fetch
                    const existingIds = new Set(prev.map(s => s.student_id));
                    const unique = newData.filter(s => !existingIds.has(s.student_id));
                    return [...prev, ...unique];
                });
            }
        } catch (error: any) {
            if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
            showApiError(error, 'Failed to fetch students');
        } finally {
            if (!controller.signal.aborted) {
                setInitialLoading(false);
                setLoadingMore(false);
                setBackgroundLoading(false);
            }
        }
    }, [activeTab, debouncedSearch, dateFilter, startDateFilter, endDateFilter]);

    // ── Reset when tab or search changes ─────────────────────────────────
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchPage(1, false);
        return () => { abortRef.current?.abort(); };
    }, [activeTab, debouncedSearch, dateFilter, startDateFilter, endDateFilter]);

    // ── Reload on focus, skip the very first mount ────────────────────────
    const isMounted = useRef(false);
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (!isMounted.current) { isMounted.current = true; return; }
            // Skip focus reload if we have incoming route parameters (they will trigger their own fetch)
            if (route?.params?.startDate || route?.params?.endDate || route?.params?.filter) {
                return;
            }
            setPage(1);
            setHasMore(true);
            fetchPage(1, true);
        });
        return unsubscribe;
    }, [navigation, fetchPage, route?.params]);

    // ── Fetch Counts ──────────────────────────────────────────────────────
    const fetchCounts = async () => {
        try {
            // Fetch all counts in parallel. Note: Backend ignores limit, so we get full array.
            const [resActive, resInactive, resPreBooked, resQRRegister, resTotal] = await Promise.all([
                api.get('/students', { params: { status: 1 } }),
                api.get('/students', { params: { status: 0 } }),
                api.get('/students', { params: { status: 2 } }),
                api.get('/students', { params: { status: 3 } }),
                api.get('/students')
            ]);

            if (resActive.data.success) {
                setCounts(p => ({ ...p, active: resActive.data.data?.length || 0 }));
            }
            if (resInactive.data.success) {
                setCounts(p => ({ ...p, inactive: resInactive.data.data?.length || 0 }));
            }
            if (resPreBooked.data.success) {
                setCounts(p => ({ ...p, prebooked: resPreBooked.data.data?.length || 0 }));
            }
            if (resQRRegister.data.success) {
                setCounts(p => ({ ...p, qrRegister: resQRRegister.data.data?.length || 0 }));
            }
            if (resTotal.data.success) {
                setCounts(p => ({ ...p, total: resTotal.data.data?.length || 0 }));
            }

        } catch (e) {
            console.log('Error fetching counts', e);
        }
    };

    useFocusEffect(useCallback(() => {
        fetchCounts();
    }, []));

    // ── Scroll to bottom → next page ──────────────────────────────────────
    const handleEndReached = useCallback(() => {
        if (loadingMore || !hasMore || initialLoading) return;
        setPage(prev => {
            const next = prev + 1;
            fetchPage(next);
            return next;
        });
    }, [loadingMore, hasMore, initialLoading, fetchPage]);

    // ── Stable card callbacks ─────────────────────────────────────────────
    const handleNavigate = useCallback((id: number) => {
        navigation.navigate('StudentDetails', { studentId: id });
    }, [navigation]);

    const handleWhatsApp = useCallback((phone: string) => {
        Linking.openURL(`whatsapp://send?phone=91${phone}`);
    }, []);

    const handleToggleStatus = useCallback((student: any) => {
        const isCurrentlyActive = student.status === 1;
        const isPreBooked = student.status === 2;
        const isQRSignup = student.status === 3;

        let title = '';
        let msg = '';
        let targetStatus = 1;

        if (isQRSignup) {
            title = t('students.confirmCheckIn');
            msg = t('students.confirmCheckInMsg', { name: student.first_name });
            targetStatus = 1;
        } else if (isPreBooked) {
            title = t('students.confirmCheckIn');
            msg = t('students.confirmCheckInMsg', { name: student.first_name });
            targetStatus = 1;
        } else if (isCurrentlyActive) {
            title = t('students.markInactive');
            msg = t('students.markInactiveMsg', { name: student.first_name });
            targetStatus = 0;
        } else {
            title = t('students.markActive');
            msg = t('students.markActiveMsg', { name: student.first_name });
            targetStatus = 1;
        }


        setConfirmDialog({ visible: true, student, targetStatus, title, message: msg });
    }, []);

    const handleCall = useCallback((phone: string) => {
        Linking.openURL(`tel:${phone}`);
    }, []);

    const handleAllocateRoom = useCallback((student: any) => {
        navigation.navigate('AddStudent', { student, isEdit: true });
    }, [navigation]);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <StudentCard
            student={item}
            onPress={handleNavigate}
            onWhatsApp={handleWhatsApp}
            onCall={handleCall}
            onToggle={handleToggleStatus}
            onAllocateRoom={handleAllocateRoom}
        />
    ), [handleNavigate, handleWhatsApp, handleCall, handleToggleStatus, handleAllocateRoom]);

    const keyExtractor = useCallback((item: any) => item.student_id.toString(), []);

    const subtitleText = useMemo(() => {
        const label = activeTab === 'All' ? t('students.total') : activeTab;
        return `${allStudents.length}${hasMore ? '+' : ''} ${label} ${t('students.residents')}`;
    }, [allStudents.length, hasMore, activeTab, t]);

    // Active tenants in the loaded list who have no room → not yet on the rent roll.
    const unallocatedCount = useMemo(
        () => allStudents.filter((s: any) => s.status === 1 && !s.room_id).length,
        [allStudents]
    );

    const listHeader = useMemo(() => {
        if (unallocatedCount === 0) return null;
        return (
            <TouchableOpacity
                style={styles.allocateBanner}
                activeOpacity={0.85}
                onPress={() => { if (activeTab !== 'Active') setActiveTab('Active'); }}
            >
                <Text style={styles.allocateBannerText}>
                    ⚠ {t('students.needRoom', { count: unallocatedCount, defaultValue: `${unallocatedCount} tenant(s) need a room` })}
                </Text>
                <Text style={styles.allocateBannerHint}>{t('students.allocateToBill', 'Allocate to start billing →')}</Text>
            </TouchableOpacity>
        );
    }, [unallocatedCount, activeTab, t]);


    return (
        <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
            <StatusBar barStyle="light-content" />

            <AppHeader
                title={t('students.directory')}
                subtitle={subtitleText}
                showBack={navigation.canGoBack()}
                rightComponent={

                    <View style={styles.headerActions}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                }
            >
                <View style={styles.searchBox}>
                    <Search color="rgba(255,255,255,0.7)" size={18} />
                    <TextInput
                        style={styles.input}
                        placeholder={t('students.searchPlaceholder')}
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        autoCorrect={false}
                        autoCapitalize="none"
                    />

                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X size={18} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    )}
                    <View style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 }} />
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                        <Calendar size={18} color={(dateFilter || startDateFilter) ? '#FFF' : 'rgba(255,255,255,0.6)'} />
                    </TouchableOpacity>
                    {(dateFilter || startDateFilter) && (
                        <TouchableOpacity onPress={() => {
                            setDateFilter(null);
                            setStartDateFilter(null);
                            setEndDateFilter(null);
                        }} style={{ marginLeft: 6 }}>
                            <X size={18} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </View>

                <DateTimePickerModal
                    isVisible={showDatePicker}
                    mode="date"
                    onConfirm={(date) => {
                        setDateFilter(date);
                        setStartDateFilter(null);
                        setEndDateFilter(null);
                        setShowDatePicker(false);
                    }}
                    onCancel={() => setShowDatePicker(false)}
                />

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabScroll}
                    contentContainerStyle={styles.tabScrollContent}
                >
                    {[
                        { key: 'Active', label: t('students.active'), count: counts.active },
                        { key: 'PreBooked', label: t('students.prebooked'), count: counts.prebooked },
                        { key: 'QRRegister', label: t('students.qrSignups'), count: counts.qrRegister },
                        { key: 'Inactive', label: t('students.inactive'), count: counts.inactive },
                        { key: 'All', label: t('students.total'), count: counts.total }
                    ].map((tab: any) => (

                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.pillBtn,
                                activeTab === tab.key ? styles.activePillBtn : styles.inactivePillBtn
                            ]}
                            onPress={() => {
                                if (activeTab === tab.key) return;
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setActiveTab(tab.key);
                            }}
                        >
                            <Text style={[
                                styles.pillLabel,
                                activeTab === tab.key ? { color: COLORS.primary } : { color: '#FFF' }
                            ]}>
                                {tab.label} ({tab.count})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </AppHeader>

            <View style={styles.body}>
                {initialLoading ? (
                    <SkeletonList count={6} />
                ) : (
                    <FlatList
                        data={allStudents}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        contentContainerStyle={[
                            styles.listPadding,
                            allStudents.length === 0 && { flex: 1 },
                        ]}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={listHeader}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => {
                                    setRefreshing(true);
                                    fetchPage(1, true).finally(() => setRefreshing(false));
                                }}
                                tintColor={COLORS.primary}
                            />
                        }
                        ListEmptyComponent={
                            <EmptyState
                                variant={debouncedSearch ? 'noResults' : 'noStudents'}
                                title={debouncedSearch ? t('students.noResults') : t('students.noStudents')}
                                subtitle={
                                    debouncedSearch
                                        ? t('students.noMatch', { query: debouncedSearch })
                                        : t('students.addFirst')
                                }
                                actionLabel={debouncedSearch ? undefined : t('students.addStudent')}
                                onAction={debouncedSearch ? undefined : () => navigation.navigate('AddStudent')}
                            />
                        }

                        onEndReached={handleEndReached}
                        onEndReachedThreshold={0.2}
                        ListFooterComponent={
                            <LoadMoreFooter
                                loading={loadingMore}
                                hasMore={hasMore}
                                total={allStudents.length}
                                noun="students"
                            />
                        }
                        windowSize={7}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        updateCellsBatchingPeriod={30}
                        removeClippedSubviews={Platform.OS === 'android'}
                    />
                )}
            </View>

            {/* FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: COLORS.primary }]}
                onPress={() => navigation.navigate('AddStudent')}
            >
                <Plus color="#FFF" size={22} strokeWidth={3.2} />
            </TouchableOpacity>

            {/* Confirm Dialog for status toggle */}
            <ConfirmDialog
                visible={confirmDialog.visible}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={t('students.yesProceed')}

                onConfirm={async () => {
                    const { student, targetStatus } = confirmDialog;
                    setConfirmDialog(p => ({ ...p, visible: false }));
                    if (!student) return;
                    try {
                        const res = await api.put(`/students/${student.student_id}`, { status: targetStatus });
                        if (res.data.success) {
                            setAllStudents(prev => prev.map(s =>
                                s.student_id === student.student_id ? { ...s, status: targetStatus } : s
                            ));
                            fetchCounts();
                            showSuccess('Student status updated.');
                        }
                    } catch (e) {
                        showApiError(e, 'Failed to update status');
                    }
                }}
                onCancel={() => setConfirmDialog(p => ({ ...p, visible: false }))}
                destructive={confirmDialog.targetStatus === 0}
            />
        </View>
    );
};

const CARD_HEIGHT = 88;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 25,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    headerActions: { flexDirection: 'row', gap: 12 },
    searchBox: {
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 48,
        marginBottom: 15
    },
    input: { flex: 1, marginLeft: 10, fontWeight: '600', color: '#FFF' },
    tabScroll: {
        marginTop: 6,
        width: '100%',
    },
    tabScrollContent: {
        paddingHorizontal: 2,
        gap: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pillBtn: {
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activePillBtn: {
        backgroundColor: '#FFF',
    },
    inactivePillBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    pillLabel: {
        fontSize: 12,
        fontWeight: '800',
    },
    body: { flex: 1 },
    listPadding: { padding: 16, paddingBottom: 180 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
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
        color: '#1E293B',
    },
    subDetailText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 4,
    },
    allocateChip: {
        alignSelf: 'flex-start',
        marginTop: 6,
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    allocateChipText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },
    allocateBanner: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    allocateBannerText: { fontSize: 13, fontWeight: '800', color: '#DC2626', flexShrink: 1 },
    allocateBannerHint: { fontSize: 11, fontWeight: '700', color: '#B91C1C', marginLeft: 8 },
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
        backgroundColor: '#F1F5F9',
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
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    actionBtnIconText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
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
        position: 'absolute', bottom: 45, right: 24,
        width: 50, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center', elevation: 5
    },
});
