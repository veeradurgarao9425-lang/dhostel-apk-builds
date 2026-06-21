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
import { AppHeader } from '../components/AppHeader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_WIDTH = (width - 32 - 24) / COLUMN_COUNT;

export default function RoomsScreen({ navigation, route }: any) {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { showApiError } = useToast();
    const [search, setSearch] = useState('');
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const isMountedRef = useRef(true);

    // ── Fetch rooms ──────────────────────────────────────────────────────────
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

        let statusColor = theme.warning;

        if (isFull) {
            statusColor = theme.error;
        } else if (isVacant) {
            statusColor = theme.success;
        }

        return (
            <TouchableOpacity
                key={room.room_id}
                style={[
                    styles.roomCard,
                    {
                        backgroundColor: theme.cardBg,
                        borderColor: statusColor + '55',
                    }
                ]}
                onPress={() => navigation.navigate('RoomDetails', { roomId: room.room_id })}
                activeOpacity={0.85}
            >
                <View style={[styles.statusTag, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusTagText}>
                        {isFull ? 'FULL' : `${room.available_beds} FREE`}
                    </Text>
                </View>
                <Text style={[styles.roomLabel, { color: theme.textSecondary }]}>RM</Text>
                <Text style={[styles.roomNum, { color: theme.textPrimary }]}>{room.room_number}</Text>
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
        <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F8FAFC' }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader
                title="Room Status"
                subtitle={`${rooms.length} Total Units`}
                showBack={navigation.canGoBack()}
                rightComponent={
                    <View style={styles.headerActions}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                }
            >
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
                            style={[
                                styles.tabItem,
                                activeTab === tab.key && { backgroundColor: theme.cardBg }
                            ]}
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
            </AppHeader>

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
                    renderSectionHeader={({ section }) => (
                        <View style={styles.floorHeaderRow}>
                            <View style={[styles.floorHeaderLine, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                            <Text style={[styles.floorHeader, { color: theme.textPrimary }]}>
                                {section.title} ({section.data[0]?.length || 0} Rooms)
                            </Text>
                            <View style={[styles.floorHeaderLine, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
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
                <Plus color="#FFF" size={22} strokeWidth={3.5} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
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
    tabLabelText: { fontSize: FONT.sm, fontWeight: FONT.bold },

    listContent: { padding: 16, paddingBottom: 120 },
    floorHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        marginTop: SPACING.sm,
        gap: SPACING.sm,
    },
    floorHeaderLine: { flex: 1, height: 1 },
    floorHeaderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 20,
    },
    floorHeader: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
    roomCard: {
        width: ITEM_WIDTH,
        height: 110,
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 12,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    statusTag: {
        position: 'absolute',
        top: -1, left: -1, right: -1,
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        paddingVertical: 3,
        alignItems: 'center',
    },
    statusTagText: { fontSize: 8, fontWeight: '900', color: '#FFF' },
    roomLabel: { fontSize: 10, fontWeight: '700', marginTop: 4 },
    roomNum: { fontSize: 20, fontWeight: '900' },
    capacityBar: {
        marginTop: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    capacityText: { fontSize: 10, fontWeight: '700' },
    fab: {
        position: 'absolute',
        bottom: 45,
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
});
