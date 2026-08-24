import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Linking,
    Image,
    FlatList,
    Dimensions,
    StatusBar,
} from 'react-native';
import {
    BedDouble,
    Users,
    IndianRupee,
    CheckCircle2,
    Phone,
    Edit3,
    Building2,
    LayoutGrid,
    Star,
    Wind,
    Bath,
    Wifi,
    Eye,
    Layers,
    BookOpen,
    Armchair,
    TrendingUp,
    UserPlus,
    LogOut,
} from 'lucide-react-native';
import api from '../services/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { SkeletonDetails } from '../components/ui/SkeletonDetails';
import { useTheme } from '../../contexts/ThemeContext';
import { Badge } from '../components/Badge';

const { width } = Dimensions.get('window');

// ── Amenity icon map ────────────────────────────────────────────────────────
const AMENITY_ICONS: Record<string, any> = {
    'AC': Wind,
    'Attached Bathroom': Bath,
    'WiFi': Wifi,
    'Balcony': Building2,
    'Window': Eye,
    'Cupboard': Layers,
    'Study Table': BookOpen,
    'Chair': Armchair,
};
const getAmenityIcon = (name: string) => AMENITY_ICONS[name] || Star;

export const RoomDetailsScreen = ({ route }: any) => {
    const { roomId } = route.params;
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<any>(null);
    const [selectedBedIndex, setSelectedBedIndex] = useState<number | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            fetchRoomDetails();
        }, [roomId])
    );

    const fetchRoomDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/rooms/${roomId}`);
            if (response.data.success) setRoom(response.data.data);
        } catch (error) {
            console.error('Error fetching room details:', error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (first: string, last: string) => {
        const f = first ? first.charAt(0).toUpperCase() : '';
        const l = last ? last.charAt(0).toUpperCase() : '';
        return (f + l).trim() || '?';
    };

    // ── Occupant card ────────────────────────────────────────────────────────
    const OccupantCard = React.memo(({ item, onPress, onCall }: { item: any; onPress: () => void; onCall: () => void }) => {
        const [imageError, setImageError] = useState(false);
        useEffect(() => { setImageError(false); }, [item.photo]);

        return (
            <TouchableOpacity
                style={[styles.occupantCard, {
                    backgroundColor: theme.cardBg,
                    borderColor: isDark ? '#334155' : '#EDE9FE',
                }]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <View style={styles.occupantRow}>
                    {item.photo && !imageError ? (
                        <Image source={{ uri: item.photo }} style={styles.occupantAvatar} onError={() => setImageError(true)} />
                    ) : (
                        <View style={[styles.occupantAvatarPlaceholder, { backgroundColor: '#EDE9FE' }]}>
                            <Text style={[styles.avatarInitials, { color: '#7C3AED' }]}>
                                {getInitials(item.first_name, item.last_name)}
                            </Text>
                        </View>
                    )}
                    <View style={styles.occupantInfo}>
                        <Text style={[styles.occupantName, { color: theme.textPrimary }]}>
                            {item.first_name} {item.last_name || ''}
                        </Text>
                        <Text style={[styles.occupantPhone, { color: theme.textSecondary }]}>
                            {item.phone || 'No phone'}
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                    <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: '#ECFDF5', flex: 1 }]}
                        onPress={onCall}
                        activeOpacity={0.7}
                    >
                        <Phone size={13} color="#10B981" />
                        <Text style={[styles.callText, { color: '#10B981' }]}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, flex: 1 }]}
                        onPress={() => navigation.navigate('StudentDetails', { studentId: item.student_id })}
                        activeOpacity={0.7}
                    >
                        <LogOut size={13} color="#EF4444" />
                        <Text style={[styles.callText, { color: '#EF4444' }]}>Vacate Bed</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    });

    // ── Beds visualizer ──────────────────────────────────────────────────────
    const BedsVisualizer = () => {
        const capacity = room.total_capacity || 0;
        const occupied = room.occupied_beds || 0;
        const beds = [];

        for (let i = 0; i < capacity; i++) {
            const isOccupied = i < occupied;
            const isSelected = selectedBedIndex === i;
            beds.push(
                <TouchableOpacity
                    key={i}
                    style={[
                        styles.bedItem,
                        {
                            backgroundColor: isOccupied
                                ? (isDark ? '#1E293B' : '#FFF0F0')
                                : (isDark ? '#1E293B' : '#F0FDF4'),
                            borderColor: isSelected
                                ? '#7C3AED'
                                : isOccupied
                                    ? '#FCA5A5'
                                    : '#86EFAC',
                            borderWidth: isSelected ? 2 : 1.5,
                        }
                    ]}
                    onPress={() => {
                        if (!isOccupied) return;
                        setSelectedBedIndex(prev => prev === i ? null : i);
                    }}
                    activeOpacity={isOccupied ? 0.7 : 1}
                >
                    <BedDouble
                        size={22}
                        color={isOccupied ? '#EF4444' : '#22C55E'}
                    />
                    <Text style={[styles.bedLabel, { color: theme.textPrimary }]}>Bed {i + 1}</Text>
                    <View style={[
                        styles.bedDot,
                        { backgroundColor: isOccupied ? '#EF4444' : '#22C55E' }
                    ]} />
                </TouchableOpacity>
            );
        }

        return (
            <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconWrap, { backgroundColor: '#EDE9FE' }]}>
                        <BedDouble size={18} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Bed Layout & Allocation</Text>
                        <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                            Tap occupied bed to filter occupants
                        </Text>
                    </View>
                </View>

                {/* Legend */}
                <View style={styles.bedLegend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                        <Text style={[styles.legendText, { color: theme.textSecondary }]}>Occupied</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                        <Text style={[styles.legendText, { color: theme.textSecondary }]}>Vacant</Text>
                    </View>
                </View>

                <View style={styles.bedsGrid}>{beds}</View>

                {selectedBedIndex !== null && (
                    <Text style={styles.bedHint}>
                        Showing occupant of Bed {selectedBedIndex + 1} · Tap again to show all
                    </Text>
                )}
            </View>
        );
    };

    // ── Loading / Error states ───────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F4F6FF' }]}>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                <AppHeader
                    title="Room Details"
                    subtitle="Loading..."
                />
                <View style={{ padding: 16, flex: 1 }}>
                    <SkeletonDetails />
                </View>
            </View>
        );
    }

    if (!room) {
        return (
            <View style={[styles.center, { backgroundColor: isDark ? theme.background : '#F4F6FF' }]}>
                <Text style={{ color: theme.textPrimary }}>Room not found</Text>
            </View>
        );
    }

    const hasVacantBeds = room.available_beds > 0;
    const occupancyPct = room.total_capacity > 0
        ? Math.round((room.occupied_beds / room.total_capacity) * 100)
        : 0;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F4F6FF' }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppHeader
                title={`Room ${room.room_number}`}
                subtitle={room.room_type_name || 'Room Details'}
                rightComponent={
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => navigation.navigate('AddRoom', { room, isEdit: true })}
                        activeOpacity={0.7}
                    >
                        <Edit3 color="#FFF" size={20} />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 }}
                overScrollMode="never"
            >
                {/* ── Overview Stats Card ───────────────────────────── */}
                <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                    <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrap, { backgroundColor: hasVacantBeds ? '#ECFDF5' : '#FFF0F0' }]}>
                                <BedDouble size={18} color={hasVacantBeds ? '#10B981' : '#EF4444'} />
                            </View>
                            <View>
                                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                                    {room.room_type_name}
                                </Text>
                                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                                    Floor {room.floor_number || 0}
                                </Text>
                            </View>
                        </View>
                        <Badge
                            label={hasVacantBeds ? 'Available' : 'Full'}
                            variant={hasVacantBeds ? 'success' : 'error'}
                        />
                    </View>

                    {/* 4-stat row */}
                    <View style={[styles.statsRow, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <View style={styles.statItem}>
                            <IndianRupee size={16} color="#7C3AED" />
                            <Text style={[styles.statValue, { color: theme.textPrimary }]}>₹{room.rent_per_bed}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Monthly Rent</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                        <View style={styles.statItem}>
                            <BedDouble size={16} color="#7C3AED" />
                            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{room.total_capacity}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Beds</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                        <View style={styles.statItem}>
                            <Users size={16} color={hasVacantBeds ? '#10B981' : '#EF4444'} />
                            <Text style={[styles.statValue, { color: hasVacantBeds ? '#10B981' : '#EF4444' }]}>
                                {room.available_beds}/{room.total_capacity}
                            </Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Available</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                        <View style={styles.statItem}>
                            <TrendingUp size={16} color="#F59E0B" />
                            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{occupancyPct}%</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Occupancy</Text>
                        </View>
                    </View>

                    {/* Occupancy bar */}
                    <View style={styles.occupancyBarWrap}>
                        <View style={[styles.occupancyBar, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                            <View style={[
                                styles.occupancyFill,
                                {
                                    width: `${occupancyPct}%` as any,
                                    backgroundColor: occupancyPct >= 100 ? '#EF4444' : occupancyPct > 60 ? '#F59E0B' : '#10B981',
                                }
                            ]} />
                        </View>
                        <Text style={[styles.occupancyLabel, { color: theme.textSecondary }]}>
                            {room.occupied_beds} of {room.total_capacity} beds occupied
                        </Text>
                    </View>
                </View>

                {/* ── Beds Visualizer ──────────────────────────────── */}
                <View style={{ marginTop: 16 }}>
                    <BedsVisualizer />
                </View>

                {/* ── Amenities ────────────────────────────────────── */}
                {room.amenities && room.amenities.length > 0 && (
                    <View style={[styles.card, { backgroundColor: theme.cardBg, marginTop: 16 }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrap, { backgroundColor: '#FFF7ED' }]}>
                                <Star size={18} color="#F59E0B" />
                            </View>
                            <View>
                                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Room Amenities</Text>
                                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                                    {room.amenities.length} amenities available
                                </Text>
                            </View>
                        </View>
                        <View style={styles.amenitiesGrid}>
                            {room.amenities.map((item: string, index: number) => {
                                const Icon = getAmenityIcon(item);
                                return (
                                    <View
                                        key={index}
                                        style={[styles.amenityChip, {
                                            backgroundColor: isDark ? '#1E293B' : '#F5F3FF',
                                            borderColor: isDark ? '#334155' : '#DDD6FE',
                                        }]}
                                    >
                                        <Icon size={13} color="#7C3AED" />
                                        <Text style={[styles.amenityChipText, { color: isDark ? '#C4B5FD' : '#7C3AED' }]}>{item}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* ── Current Occupants ─────────────────────────────── */}
                <View style={[styles.card, { backgroundColor: theme.cardBg, marginTop: 16 }]}>
                    <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrap, { backgroundColor: '#EFF6FF' }]}>
                                <Users size={18} color="#3B82F6" />
                            </View>
                            <View>
                                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                                    {selectedBedIndex !== null
                                        ? `Bed ${selectedBedIndex + 1} Occupant`
                                        : `Current Occupants`}
                                </Text>
                                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                                    {room.occupied_beds} tenant{room.occupied_beds !== 1 ? 's' : ''} staying
                                </Text>
                            </View>
                        </View>
                        {/* Add Tenant button */}
                        {hasVacantBeds && (
                            <TouchableOpacity
                                style={styles.addTenantBtn}
                                onPress={() => navigation.navigate('AddStudent', { roomId: room.room_id })}
                                activeOpacity={0.7}
                            >
                                <UserPlus size={14} color="#FFF" />
                                <Text style={styles.addTenantText}>Add Tenant</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {!room.occupants || room.occupants.length === 0 ? (
                        <View style={[styles.emptyOccupants, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                            <Users size={32} color={isDark ? '#334155' : '#CBD5E1'} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Room is currently empty</Text>
                            {hasVacantBeds && (
                                <TouchableOpacity
                                    style={styles.addTenantBtnLarge}
                                    onPress={() => navigation.navigate('AddStudent', { roomId: room.room_id })}
                                    activeOpacity={0.7}
                                >
                                    <UserPlus size={15} color="#FFF" />
                                    <Text style={styles.addTenantText}>Add First Tenant</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <FlatList
                            data={
                                selectedBedIndex !== null && room.occupants[selectedBedIndex]
                                    ? [room.occupants[selectedBedIndex]]
                                    : room.occupants
                            }
                            renderItem={({ item }) => (
                                <OccupantCard
                                    item={item}
                                    onPress={() => navigation.navigate('StudentDetails', { studentId: item.student_id })}
                                    onCall={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
                                />
                            )}
                            keyExtractor={item => item.student_id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingRight: 4, paddingBottom: 4 }}
                            snapToInterval={width * 0.72 + 12}
                            decelerationRate="fast"
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { flex: 1 },
    editBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center',
    },

    // Card
    card: {
        borderRadius: 16,
        padding: 16,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    cardIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: { fontSize: 15, fontWeight: '700' },
    cardSubtitle: { fontSize: 11, fontWeight: '500', marginTop: 1 },

    // Stats
    statsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 14,
        marginBottom: 14,
        alignItems: 'center',
    },
    statItem: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 14, fontWeight: '800' },
    statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
    statDivider: { width: 1, height: 36, marginHorizontal: 4 },

    // Occupancy bar
    occupancyBarWrap: { gap: 6 },
    occupancyBar: {
        height: 6, borderRadius: 3, overflow: 'hidden',
    },
    occupancyFill: { height: '100%', borderRadius: 3 },
    occupancyLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

    // Beds
    bedLegend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, fontWeight: '600' },
    bedsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    bedItem: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        width: (width - 64 - 20) / 3,
        gap: 4,
        position: 'relative',
    },
    bedLabel: { fontSize: 11, fontWeight: '700' },
    bedDot: {
        position: 'absolute', top: 6, right: 6,
        width: 6, height: 6, borderRadius: 3,
    },
    bedHint: {
        fontSize: 11, color: '#7C3AED', fontWeight: '600',
        marginTop: 10, textAlign: 'center',
    },

    // Amenities
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    amenityChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1,
    },
    amenityChipText: { fontSize: 12, fontWeight: '600' },

    // Occupants
    emptyOccupants: {
        alignItems: 'center', justifyContent: 'center',
        padding: 28, borderRadius: 12, gap: 8,
    },
    emptyText: { fontSize: 13, fontWeight: '600' },
    occupantCard: {
        width: width * 0.72,
        borderRadius: 14,
        padding: 14,
        marginRight: 12,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 2,
    },
    occupantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    occupantAvatar: { width: 44, height: 44, borderRadius: 22 },
    occupantAvatarPlaceholder: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { fontSize: 14, fontWeight: '800' },
    occupantInfo: { marginLeft: 10, flex: 1 },
    occupantName: { fontSize: 14, fontWeight: '700' },
    occupantPhone: { fontSize: 11, marginTop: 2, fontWeight: '500' },
    callBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 8, borderRadius: 10, gap: 6,
    },
    callText: { fontSize: 12, fontWeight: '700' },

    // Add Tenant buttons
    addTenantBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7C3AED',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        gap: 5,
    },
    addTenantBtnLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7C3AED',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 12,
        gap: 6,
        marginTop: 10,
    },
    addTenantText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});

export default RoomDetailsScreen;
