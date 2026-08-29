import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';

interface FloorInfo {
    floor_number: number;
    total_rooms: number;
    total_beds: number;
    occupied_beds: number;
    available_beds: number;
    fill_percentage: number;
}

interface OccupancyCardProps {
    data: {
        totalFloors?: number;
        floorBreakdown?: FloorInfo[];
        totalRooms?: number;
        availableRooms?: number;
    };
}

export const OccupancyCard = ({ data }: OccupancyCardProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();

    const { floorBreakdown = [] } = data;

    if (!floorBreakdown || floorBreakdown.length === 0) return null;

    const formatFloorName = (fn: number) => {
        if (fn === 0) return 'Ground Floor';
        if (fn === 1) return '1st Floor';
        if (fn === 2) return '2nd Floor';
        if (fn === 3) return '3rd Floor';
        return `${fn}th Floor`;
    };

    const getFloorTag = (fn: number) => {
        if (fn === 0) return 'G';
        return `${fn}F`;
    };

    const totalVacantBeds = floorBreakdown.reduce((acc, f) => acc + (f.available_beds || 0), 0);

    return (
        <View style={s.container}>
            {/* ── Header ── */}
            <View style={s.sectionHeader}>
                <View style={s.headerTitleGroup}>
                    <View style={[s.headerIconBadge, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
                        <Ionicons name="business" size={13} color="#4F46E5" />
                    </View>
                    <Text style={[s.sectionTitle, { color: theme.textSecondary }]}>
                        Floor Availability Map
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Rooms')}
                    activeOpacity={0.7}
                    style={s.headerLinkBtn}
                >
                    <Text style={[s.headerLinkText, { color: theme.primary }]}>
                        Manage Rooms
                    </Text>
                    <Ionicons name="chevron-forward" size={12} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {/* ── Main Clean Card ── */}
            <View
                style={[
                    s.mainCard,
                    {
                        backgroundColor: theme.cardBg,
                        borderColor: isDark ? '#334155' : '#F1F5F9',
                    }
                ]}
            >
                {/* Header Summary Subrow */}
                <View style={s.subHeaderRow}>
                    <Text style={[s.subHeaderLeft, { color: theme.textPrimary }]}>
                        Building Floor Map
                    </Text>
                    <View style={[s.vacantBadge, { backgroundColor: totalVacantBeds > 0 ? (isDark ? '#064E3B' : '#DCFCE7') : (isDark ? '#450A0A' : '#FEE2E2') }]}>
                        <View style={[s.statusDot, { backgroundColor: totalVacantBeds > 0 ? '#10B981' : '#EF4444' }]} />
                        <Text style={[s.vacantBadgeText, { color: totalVacantBeds > 0 ? '#059669' : '#DC2626' }]}>
                            {totalVacantBeds > 0 ? `${totalVacantBeds} Beds Vacant` : 'Fully Occupied'}
                        </Text>
                    </View>
                </View>

                {/* Horizontal Modern Floor Cards */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    contentContainerStyle={s.scrollContent}
                >
                    {floorBreakdown.map((floor, idx) => {
                        const isFull = floor.available_beds === 0;
                        const isLow = floor.available_beds <= 2 && floor.available_beds > 0;
                        const accentColor = isFull ? '#EF4444' : isLow ? '#D97706' : '#059669';
                        const accentBg = isFull
                            ? (isDark ? '#450A0A' : '#FEE2E2')
                            : isLow
                                ? (isDark ? '#451A03' : '#FEF3C7')
                                : (isDark ? '#064E3B' : '#DCFCE7');

                        return (
                            <TouchableOpacity
                                key={`floor-card-${floor.floor_number}-${idx}`}
                                style={[
                                    s.floorTile,
                                    {
                                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                        borderColor: isDark ? '#334155' : '#E2E8F0',
                                    }
                                ]}
                                onPress={() => navigation.navigate('Rooms')}
                                activeOpacity={0.75}
                            >
                                {/* Top Row: Floor Tag + Status Badge */}
                                <View style={s.tileTopRow}>
                                    <LinearGradient
                                        colors={isFull ? ['#64748B', '#475569'] : ['#6366F1', '#4F46E5']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={s.floorBadge}
                                    >
                                        <Text style={s.floorBadgeText}>{getFloorTag(floor.floor_number)}</Text>
                                    </LinearGradient>

                                    <View style={[s.pillBadge, { backgroundColor: accentBg }]}>
                                        <Text style={[s.pillText, { color: accentColor }]}>
                                            {isFull ? 'Full' : `${floor.available_beds} vacant`}
                                        </Text>
                                    </View>
                                </View>

                                {/* Middle: Floor Name & Room Info */}
                                <View style={s.tileMiddle}>
                                    <Text style={[s.floorTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                        {formatFloorName(floor.floor_number)}
                                    </Text>
                                    <Text style={[s.floorSub, { color: theme.textSecondary }]}>
                                        {floor.total_rooms} {floor.total_rooms === 1 ? 'room' : 'rooms'} · {floor.occupied_beds}/{floor.total_beds} beds
                                    </Text>
                                </View>

                                {/* Clean Bottom Pill (No ugly progress lines) */}
                                <View style={s.tileBottomRow}>
                                    <Text style={[s.occupancySubText, { color: isFull ? '#EF4444' : '#64748B' }]}>
                                        {floor.fill_percentage}% occupied
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
};

const s = StyleSheet.create({
    container: {
        marginVertical: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 2,
        marginBottom: 8,
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerIconBadge: {
        width: 22,
        height: 22,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    headerLinkText: {
        fontSize: 12,
        fontWeight: '700',
    },
    mainCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        elevation: 2,
        shadowColor: '#0F172A',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 1 },
        gap: 10,
    },
    subHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    subHeaderLeft: {
        fontSize: 13,
        fontWeight: '800',
    },
    vacantBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    vacantBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    scrollContent: {
        flexDirection: 'row',
        gap: 10,
        paddingVertical: 2,
    },
    floorTile: {
        width: 145,
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        gap: 8,
    },
    tileTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    floorBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floorBadgeText: {
        color: '#FFFFFF',
        fontSize: 11.5,
        fontWeight: '900',
    },
    pillBadge: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
    },
    pillText: {
        fontSize: 10.5,
        fontWeight: '800',
    },
    tileMiddle: {
        gap: 2,
    },
    floorTitle: {
        fontSize: 13,
        fontWeight: '800',
    },
    floorSub: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    tileBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    occupancySubText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
});
