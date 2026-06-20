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
    ActivityIndicator,
    LayoutAnimation,
    Platform,
    UIManager,
    Alert,
    ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Search, Users, Plus, Phone, MessageCircle, X, Calendar } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import api from '../services/api';
import { ProfileMenu } from '../components/ProfileMenu';
import { HeaderNotification } from '../components/HeaderNotification';
import { useTheme } from '../../contexts/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PAGE_SIZE = 10;
type TabType = 'Active' | 'Inactive' | 'PreBooked' | 'All';

const TABS: { key: TabType; label: string }[] = [
    { key: 'Active', label: 'Active' },
    { key: 'PreBooked', label: 'Pre-Booked' },
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
}

const StudentCard = React.memo(({ student, onPress, onWhatsApp, onCall, onToggle }: StudentCardProps) => {
    const isActive = student.status === 1;
    const isPreBooked = student.status === 2;
    const indicatorColor = isPreBooked ? '#EA580C' : isActive ? '#10B981' : '#EF4444';
    
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress(student.student_id)}
            activeOpacity={0.8}
        >
            <View style={[styles.statusIndicator, { backgroundColor: indicatorColor }]} />
            <View style={styles.cardMain}>
                <View style={styles.avatarBox}>
                    {student.photo ? (
                        <Image source={{ uri: student.photo }} style={styles.avatarImg} fadeDuration={0} />
                    ) : (
                        <Users color="#94A3B8" size={20} />
                    )}
                </View>
                <View style={styles.infoContainer}>
                    <Text style={styles.nameText} numberOfLines={1}>
                        {student.first_name} {student.last_name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        {isPreBooked ? (
                            <View style={[styles.roomBadge, { backgroundColor: '#FFEFE6', borderColor: '#FFE4D6', borderWidth: 1, marginTop: 0 }]}>
                                <Text style={[styles.roomText, { color: '#EA580C' }]}>PRE-BOOKED</Text>
                            </View>
                        ) : (
                            <View style={[styles.roomBadge, { marginTop: 0 }]}>
                                <Text style={styles.roomText}>ROOM {student.room_number || 'N/A'}</Text>
                            </View>
                        )}
                        {isPreBooked && student.room_number && (
                            <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '700' }}>
                                Room {student.room_number}
                            </Text>
                        )}
                    </View>
                </View>
                <View style={styles.actionColumn}>
                    <TouchableOpacity
                        onPress={() => onWhatsApp(student.phone)}
                        style={styles.iconCircle}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MessageCircle size={18} color="#25D366" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onCall(student.phone)}
                        style={styles.iconCircle}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Phone size={18} color="#0EA5E9" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onToggle(student)}
                        style={[
                            styles.statusToggleBtn, 
                            { 
                                backgroundColor: isPreBooked ? '#FFEFE6' : isActive ? '#FEE2E2' : '#DCFCE7' 
                            }
                        ]}
                    >
                        {isPreBooked ? (
                            <Ionicons name="checkmark-circle-outline" size={18} color="#EA580C" />
                        ) : (
                            <Text style={[styles.statusToggleText, { color: isActive ? '#EF4444' : '#10B981' }]}>
                                {isActive ? 'OFF' : 'ON'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
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
    if (loading) {
        return <ActivityIndicator size="small" color="#94A3B8" style={{ marginVertical: 20 }} />;
    }
    if (!hasMore && total > 0) {
        return (
            <View style={footerStyles.container}>
                <View style={footerStyles.line} />
                <View style={footerStyles.pill}>
                    <Users size={12} color="#94A3B8" />
                    <Text style={footerStyles.text}>All {total} students loaded</Text>
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
    const { theme } = useTheme();

    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('Active');
    const [initialLoading, setInitialLoading] = useState(true);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [counts, setCounts] = useState({ active: 0, inactive: 0, prebooked: 0, total: 0 });
    const [dateFilter, setDateFilter] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Update activeTab if passed via params
    useEffect(() => {
        if (route?.params?.filter) {
            setActiveTab(route.params.filter);
            navigation.setParams({ filter: undefined });
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
                }
            } else {
                setLoadingMore(true);
            }

            const statusParam = activeTab === 'Active' ? 1 : activeTab === 'Inactive' ? 0 : activeTab === 'PreBooked' ? 2 : undefined;
            const params: Record<string, any> = { page: pageNum, limit: PAGE_SIZE };
            if (debouncedSearch) params.search = debouncedSearch;
            if (statusParam !== undefined) params.status = statusParam;
            if (dateFilter) params.date = dateFilter.toISOString().split('T')[0];

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
            console.error('Error fetching students:', error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch students' });
        } finally {
            if (!controller.signal.aborted) {
                setInitialLoading(false);
                setLoadingMore(false);
            }
        }
    }, [activeTab, debouncedSearch]);

    // ── Reset when tab or search changes ─────────────────────────────────
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchPage(1, false);
        return () => { abortRef.current?.abort(); };
    }, [activeTab, debouncedSearch, dateFilter]);

    // ── Reload on focus, skip the very first mount ────────────────────────
    const isMounted = useRef(false);
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (!isMounted.current) { isMounted.current = true; return; }
            setPage(1);
            setHasMore(true);
            fetchPage(1, true);
        });
        return unsubscribe;
    }, [navigation, fetchPage]);

    // ── Fetch Counts ──────────────────────────────────────────────────────
    const fetchCounts = async () => {
        try {
            // Fetch all counts in parallel. Note: Backend ignores limit, so we get full array.
            const [resActive, resInactive, resPreBooked, resTotal] = await Promise.all([
                api.get('/students', { params: { status: 1 } }),
                api.get('/students', { params: { status: 0 } }),
                api.get('/students', { params: { status: 2 } }),
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
        
        let title = '';
        let msg = '';
        let targetStatus = 1;
        
        if (isPreBooked) {
            title = 'Confirm Check-In?';
            msg = `Do you want to confirm check-in for pre-booked tenant ${student.first_name}? This will activate their residency and set up their current month fee.`;
            targetStatus = 1;
        } else if (isCurrentlyActive) {
            title = 'Mark as Inactive?';
            msg = `Are you sure you want to mark ${student.first_name} as inactive?`;
            targetStatus = 0;
        } else {
            title = 'Mark as Active?';
            msg = `Are you sure you want to mark ${student.first_name} as active?`;
            targetStatus = 1;
        }

        Alert.alert(
            title,
            msg,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes',
                    onPress: async () => {
                        try {
                            const res = await api.put(`/students/${student.student_id}`, {
                                status: targetStatus
                            });
                            if (res.data.success) {
                                // Update local state for immediate feedback
                                setAllStudents(prev => prev.map(s =>
                                    s.student_id === student.student_id ? { ...s, status: targetStatus } : s
                                ));
                                fetchCounts(); // Update tab counts
                                Toast.show({ type: 'success', text1: 'Status Updated' });
                            }
                        } catch (e: any) {
                            Alert.alert('Error', e.response?.data?.error || 'Failed to update status');
                        }
                    }
                }
            ]
        );
    }, []);

    const handleCall = useCallback((phone: string) => {
        Linking.openURL(`tel:${phone}`);
    }, []);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <StudentCard
            student={item}
            onPress={handleNavigate}
            onWhatsApp={handleWhatsApp}
            onCall={handleCall}
            onToggle={handleToggleStatus}
        />
    ), [handleNavigate, handleWhatsApp, handleCall, handleToggleStatus]);

    const keyExtractor = useCallback((item: any) => item.student_id.toString(), []);

    const subtitleText = useMemo(() => {
        const label = activeTab === 'All' ? 'Total' : activeTab;
        return `${allStudents.length}${hasMore ? '+' : ''} ${label} Residents`;
    }, [allStudents.length, hasMore, activeTab]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={styles.header}>
                <View style={styles.headerRow}>
                    {navigation.canGoBack() && (
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="chevron-back" size={20} color="#FFF" />
                        </TouchableOpacity>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Student Directory</Text>
                        <Text style={styles.headerSubtitle}>{subtitleText}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                </View>

                <View style={styles.searchBox}>
                    <Search color="#94A3B8" size={18} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search name or room..."
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="#94A3B8"
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                    <View style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 }} />
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                        <Calendar size={18} color={dateFilter ? '#FFF' : 'rgba(255,255,255,0.6)'} />
                    </TouchableOpacity>
                    {dateFilter && (
                        <TouchableOpacity onPress={() => setDateFilter(null)} style={{ marginLeft: 6 }}>
                            <X size={18} color="#EF4444" />
                        </TouchableOpacity>
                    )}
                </View>

                <DateTimePickerModal
                    isVisible={showDatePicker}
                    mode="date"
                    onConfirm={(date) => {
                        setDateFilter(date);
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
                        { key: 'Active', label: 'Active', count: counts.active },
                        { key: 'PreBooked', label: 'Pre-Booked', count: counts.prebooked },
                        { key: 'Inactive', label: 'Inactive', count: counts.inactive },
                        { key: 'All', label: 'Total', count: counts.total }
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
                                activeTab === tab.key ? { color: theme.primary } : { color: '#FFF' }
                            ]}>
                                {tab.label} ({tab.count})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </LinearGradient>

            <View style={styles.body}>
                {initialLoading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={allStudents}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listPadding}
                        showsVerticalScrollIndicator={false}

                        onEndReached={handleEndReached}
                        onEndReachedThreshold={0.4}
                        ListFooterComponent={
                            <ListFooter
                                loading={loadingMore}
                                hasMore={hasMore}
                                total={allStudents.length}
                            />
                        }

                        windowSize={7}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        updateCellsBatchingPeriod={30}
                        removeClippedSubviews={Platform.OS === 'android'}
                        getItemLayout={(_data, index) => ({
                            length: CARD_HEIGHT,
                            offset: CARD_HEIGHT * index,
                            index,
                        })}
                    />
                )}
            </View>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('AddStudent')}
            >
                <Plus color="#FFF" size={30} />
            </TouchableOpacity>
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
        backgroundColor: '#FFF',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 48,
        marginBottom: 15
    },
    input: { flex: 1, marginLeft: 10, fontWeight: '600', color: '#1E293B' },
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
        borderRadius: 20,
        marginBottom: 12,
        flexDirection: 'row',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        height: CARD_HEIGHT,
    },
    statusIndicator: { width: 6 },
    cardMain: { flex: 1, padding: 15, flexDirection: 'row', alignItems: 'center' },
    avatarBox: {
        width: 45, height: 45, borderRadius: 15,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
    },
    avatarImg: { width: 45, height: 45 },
    infoContainer: { flex: 1, marginLeft: 15 },
    nameText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    roomBadge: {
        alignSelf: 'flex-start', backgroundColor: '#F1F5F9',
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4
    },
    roomText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
    actionColumn: { flexDirection: 'row', gap: 10 },
    iconCircle: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    statusToggleBtn: {
        width: 38, height: 38, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    statusToggleText: { fontSize: 10, fontWeight: '900' },
    fab: {
        position: 'absolute', bottom: 30, right: 20,
        width: 60, height: 60, borderRadius: 30,
        justifyContent: 'center', alignItems: 'center', elevation: 5
    },
});
