import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    StatusBar,
    LayoutAnimation,
    Platform,
    UIManager,
    SectionList,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Search, X } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../services/api';
import { HeaderNotification } from '../components/HeaderNotification';
import { ProfileMenu } from '../components/ProfileMenu';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { COLORS, FONT, RADIUS, SPACING, SHADOW } from '../theme/index';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_WIDTH = (width - 48) / COLUMN_COUNT;

export default function RoomsScreen({ navigation, route }: any) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const { showApiError } = useToast();
    const [search, setSearch] = useState('');
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const isMountedRef = useRef(true);

    // ── Fetch rooms (isMounted-safe) ──────────────────────────────────────────
    const fetchRooms = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            const response = await api.get('/rooms?limit=200');
            if (isMountedRef.current && response.data.success) {
                setRooms(response.data.data);
            }
        } catch (error) {
            if (isMountedRef.current) {
                showApiError(error, 'Failed to load rooms');
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => fetchRooms());
        return unsubscribe;
    }, [navigation, fetchRooms]);

    // Update activeTab if passed via params
    useEffect(() => {
        if (route.params?.filter) {
            setActiveTab(route.params.filter);
            navigation.setParams({ filter: undefined });
        }
    }, [route.params]);

    // ── Grouping logic ────────────────────────────────────────────────────────
    const getGroupedData = () => {
        const filtered = rooms.filter(room => {
            const matchesSearch = room.room_number?.toString().includes(search) ||
                room.room_type_name?.toLowerCase().includes(search.toLowerCase());
            if (activeTab === 'Vacant') return matchesSearch && room.available_beds > 0;
            if (activeTab === 'Full') return matchesSearch && room.available_beds === 0;
            return matchesSearch;
        });

        const groups: any = {};
        filtered.forEach(room => {
            const floor = `Floor ${room.floor_number || 'N/A'}`;
            if (!groups[floor]) groups[floor] = [];
            groups[floor].push(room);
        });

        return Object.keys(groups).sort().map(floor => ({
            title: floor,
            data: [groups[floor]],
        }));
    };

    // ── Room cell ─────────────────────────────────────────────────────────────
    const renderRoomItem = (room: any) => {
        const isFull = room.available_beds === 0;
        const isVacant = room.occupied_beds === 0;

        let statusColor = COLORS.warning;
        if (isFull) statusColor = COLORS.error;
        if (isVacant) statusColor = COLORS.success;

        return (
            <TouchableOpacity
                key={room.room_id}
                style={[styles.roomBox, { borderColor: statusColor + '55' }]}
                onPress={() => navigation.navigate('RoomDetails', { roomId: room.room_id })}
                activeOpacity={0.85}
            >
                <View style={[styles.statusTag, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusTagText}>
                        {isFull ? 'FULL' : `${room.available_beds} FREE`}
                    </Text>
                </View>
                <Text style={styles.roomLabel}>RM</Text>
                <Text style={styles.roomNum}>{room.room_number}</Text>
                <View style={[styles.capacityBar, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[styles.capacityText, { color: statusColor }]}>
                        {room.occupied_beds}/{room.total_capacity}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const groupedData = getGroupedData();
    const showEmpty = !loading && groupedData.length === 0;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={styles.header}>
                <View style={styles.headerTop}>
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
                        <Text style={styles.headerTitle}>Room Status</Text>
                        <Text style={styles.headerSubtitle}>{rooms.length} Total Units</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <Search color="rgba(255,255,255,0.7)" size={18} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search room number..."
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X size={16} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.tabBar}>
                    {[
                        { key: 'All', count: rooms.length },
                        { key: 'Vacant', count: rooms.filter(r => r.available_beds > 0).length },
                        { key: 'Full', count: rooms.filter(r => r.available_beds === 0).length }
                    ].map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => {
                                LayoutAnimation.easeInEaseOut();
                                setActiveTab(tab.key);
                            }}
                            style={[styles.tabItem, activeTab === tab.key && styles.activeTab]}
                        >
                            <Text style={[
                                styles.tabLabelText,
                                activeTab === tab.key ? { color: COLORS.primary } : { color: '#FFF' }
                            ]}>
                                {tab.key} ({tab.count})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </LinearGradient>

            {loading ? (
                <SkeletonList count={6} />
            ) : showEmpty ? (
                <EmptyState
                    variant={search ? 'noResults' : 'noRooms'}
                    title={search ? 'No Results' : 'No Rooms Yet'}
                    subtitle={
                        search
                            ? `No rooms match "${search}"`
                            : 'Add your first room to start managing occupancy'
                    }
                    actionLabel={search ? undefined : 'Add Room'}
                    onAction={search ? undefined : () => navigation.navigate('AddRoom')}
                />
            ) : (
                <SectionList
                    sections={groupedData}
                    keyExtractor={(item, index) => index.toString()}
                    stickySectionHeadersEnabled={false}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchRooms(true);
                            }}
                            tintColor={COLORS.primary}
                        />
                    }
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.floorHeaderRow}>
                            <View style={styles.floorHeaderLine} />
                            <Text style={styles.floorHeader}>{title}</Text>
                            <View style={styles.floorHeaderLine} />
                        </View>
                    )}
                    renderItem={({ item }) => (
                        <View style={styles.gridRow}>
                            {item.map((room: any) => renderRoomItem(room))}
                        </View>
                    )}
                />
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: COLORS.primary }]}
                onPress={() => navigation.navigate('AddRoom')}
            >
                <Plus color="#FFF" size={28} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: SPACING.xl,
        borderBottomLeftRadius: RADIUS.xxl,
        borderBottomRightRadius: RADIUS.xxl,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center',
        marginRight: SPACING.md,
    },
    headerTitle: { fontSize: FONT.xl, fontWeight: FONT.black, color: '#FFF' },
    headerSubtitle: { fontSize: FONT.sm, color: 'rgba(255,255,255,0.8)', fontWeight: FONT.semiBold },
    headerActions: { flexDirection: 'row', gap: SPACING.md },
    searchContainer: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: RADIUS.lg,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        height: 46,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    searchInput: {
        flex: 1,
        marginLeft: SPACING.sm,
        fontWeight: FONT.semiBold,
        color: '#FFF',
        fontSize: FONT.base,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.12)',
        padding: 4,
        borderRadius: RADIUS.md,
    },
    tabItem: {
        flex: 1,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        borderRadius: RADIUS.sm + 2,
    },
    activeTab: { backgroundColor: COLORS.surface },
    tabLabelText: { fontSize: FONT.sm, fontWeight: FONT.bold },

    listContent: { padding: SPACING.lg, paddingBottom: 100 },
    floorHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        marginTop: SPACING.sm,
        gap: SPACING.sm,
    },
    floorHeaderLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
    floorHeader: {
        fontSize: FONT.sm,
        fontWeight: FONT.bold,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.md },
    roomBox: {
        width: ITEM_WIDTH,
        height: 110,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 12,
        ...SHADOW.card,
    },
    statusTag: {
        position: 'absolute',
        top: -1, left: -1, right: -1,
        borderTopLeftRadius: RADIUS.xl - 2,
        borderTopRightRadius: RADIUS.xl - 2,
        paddingVertical: 3,
        alignItems: 'center',
    },
    statusTagText: { fontSize: 8, fontWeight: FONT.black, color: '#FFF' },
    roomLabel: { fontSize: FONT.xs, fontWeight: FONT.bold, color: COLORS.textMuted, marginTop: 4 },
    roomNum: { fontSize: FONT.xl, fontWeight: FONT.black, color: COLORS.textPrimary },
    capacityBar: {
        marginTop: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },
    capacityText: { fontSize: 10, fontWeight: FONT.bold },
    fab: {
        position: 'absolute',
        bottom: 88,
        right: SPACING.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOW.strong,
    },
});
